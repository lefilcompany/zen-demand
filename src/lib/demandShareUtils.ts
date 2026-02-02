import { supabase } from "@/integrations/supabase/client";

// Generate a random token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Gets or creates a public share token for a demand.
 * This is used to generate public links for email notifications.
 * 
 * @param demandId - The ID of the demand
 * @param userId - The ID of the user creating/retrieving the token
 * @returns The share token string, or null if failed
 */
export async function getOrCreateShareToken(demandId: string, userId: string): Promise<string | null> {
  try {
    // First, try to get an existing active token
    const { data: existingToken, error: fetchError } = await supabase
      .from("demand_share_tokens" as any)
      .select("token")
      .eq("demand_id", demandId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching existing share token:", fetchError);
      return null;
    }

    const tokenData = existingToken as unknown as { token: string } | null;
    if (tokenData?.token) {
      return tokenData.token;
    }

    // No active token exists, create a new one
    const newToken = generateToken();
    const { error: insertError } = await supabase
      .from("demand_share_tokens" as any)
      .insert({
        demand_id: demandId,
        token: newToken,
        created_by: userId,
        expires_at: null, // No expiration for email notification tokens
      });

    if (insertError) {
      console.error("Error creating share token:", insertError);
      return null;
    }

    return newToken;
  } catch (error) {
    console.error("Error in getOrCreateShareToken:", error);
    return null;
  }
}

/**
 * Builds a public share URL for a demand.
 * Falls back to authenticated URL if token creation fails.
 * 
 * @param demandId - The ID of the demand
 * @param userId - The ID of the user (for token creation)
 * @param baseUrl - The base URL of the application (defaults to window.location.origin)
 * @returns A public share URL or fallback authenticated URL
 */
export async function buildPublicDemandUrl(
  demandId: string, 
  userId: string, 
  baseUrl?: string
): Promise<string> {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://pla.soma.lefil.com.br');
  
  try {
    const token = await getOrCreateShareToken(demandId, userId);
    if (token) {
      return `${origin}/shared/${token}`;
    }
  } catch (error) {
    console.error("Error building public demand URL:", error);
  }
  
  // Fallback to authenticated URL if token creation fails
  return `${origin}/demands/${demandId}`;
}
