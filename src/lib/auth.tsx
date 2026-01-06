import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token refresh interval (5 minutes before expiry)
const TOKEN_REFRESH_MARGIN = 5 * 60 * 1000; // 5 minutes in ms

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to schedule automatic token refresh
  const scheduleTokenRefresh = useCallback((currentSession: Session | null) => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    if (!currentSession?.expires_at) return;

    // Calculate time until token expires (expires_at is in seconds)
    const expiresAt = currentSession.expires_at * 1000; // Convert to ms
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    
    // Schedule refresh 5 minutes before expiry, or immediately if less than 5 minutes
    const refreshIn = Math.max(timeUntilExpiry - TOKEN_REFRESH_MARGIN, 0);

    if (refreshIn > 0 && refreshIn < 24 * 60 * 60 * 1000) { // Only schedule if within 24 hours
      console.log(`Token refresh scheduled in ${Math.round(refreshIn / 1000 / 60)} minutes`);
      
      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (error) {
            console.error("Auto token refresh failed:", error.message);
            // If refresh token is invalid/not found, clear local state gracefully
            if (error.message.includes("Refresh Token") || error.message.includes("refresh_token")) {
              console.log("Clearing invalid session data...");
              // Don't show error toast - just silently clear the invalid session
              // The onAuthStateChange SIGNED_OUT event will handle state cleanup
            }
          } else if (data.session) {
            console.log("Token refreshed successfully");
            // The onAuthStateChange listener will handle state updates
          }
        } catch (err) {
          console.error("Token refresh error:", err);
        }
      }, refreshIn);
    }
  }, []);

  // Manual refresh function exposed to context
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        scheduleTokenRefresh(data.session);
      }
    } catch (error: any) {
      console.error("Manual session refresh failed:", error.message);
      throw error;
    }
  }, [scheduleTokenRefresh]);

  useEffect(() => {
    // Check if user should be logged out (session only, no remember me)
    const shouldLogout = sessionStorage.getItem("sessionOnly") === null && 
                         localStorage.getItem("rememberMe") !== "true";
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, currentSession: Session | null) => {
        console.log("Auth event:", event, currentSession ? "Session exists" : "No session");
        
        // Update state synchronously
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        // Handle different auth events
        switch (event) {
          case "SIGNED_IN":
          case "TOKEN_REFRESHED":
            // Schedule next automatic refresh
            scheduleTokenRefresh(currentSession);
            break;
          case "PASSWORD_RECOVERY":
            // User clicked on password recovery link - session is established
            // Do NOT redirect or logout - let them reset their password
            console.log("Password recovery event - user can now reset password");
            scheduleTokenRefresh(currentSession);
            break;
          case "SIGNED_OUT":
            // Clear refresh timeout
            if (refreshTimeoutRef.current) {
              clearTimeout(refreshTimeoutRef.current);
              refreshTimeoutRef.current = null;
            }
            break;
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession }, error }) => {
      // Handle error from getSession (e.g., invalid refresh token)
      if (error) {
        console.log("getSession error (likely stale token):", error.message);
        // Clear any stale localStorage data
        localStorage.removeItem("rememberMe");
        sessionStorage.removeItem("sessionOnly");
        sessionStorage.setItem("sessionChecked", "true");
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // If there's a session but "remember me" was not checked and this is a new browser session
      // BUT skip this check if we're on the password reset page (to allow password recovery)
      const isPasswordResetPage = window.location.pathname === "/reset-password";
      
      if (existingSession && shouldLogout && !sessionStorage.getItem("sessionChecked") && !isPasswordResetPage) {
        sessionStorage.setItem("sessionChecked", "true");
        // User didn't check "remember me" and this is a fresh browser session - log them out
        supabase.auth.signOut().then(() => {
          setSession(null);
          setUser(null);
          setLoading(false);
        });
        return;
      }
      
      sessionStorage.setItem("sessionChecked", "true");
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);
      
      // Schedule token refresh for existing session
      if (existingSession) {
        scheduleTokenRefresh(existingSession);
      }
    }).catch((err) => {
      // Catch any unexpected errors
      console.error("Unexpected getSession error:", err);
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    // Cleanup on unmount
    return () => {
      subscription.unsubscribe();
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [scheduleTokenRefresh]);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;
      navigate("/");
    } catch (error: any) {
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      navigate("/");
    } catch (error: any) {
      throw error;
    }
  };

  const signOut = async () => {
    // Clear remember me preferences on logout
    localStorage.removeItem("rememberMe");
    sessionStorage.removeItem("sessionOnly");
    sessionStorage.removeItem("sessionChecked");
    
    // Clear local state first
    setSession(null);
    setUser(null);
    
    try {
      // Try to sign out from Supabase, but don't block on errors
      // (session might already be expired/missing)
      await supabase.auth.signOut();
    } catch (error: any) {
      // Ignore AuthSessionMissingError - session was already gone
      console.log("SignOut cleanup:", error?.name || error?.message);
    }
    
    toast.success("Logout realizado com sucesso!");
    navigate("/auth");
  };

  const resetPassword = async (email: string) => {
    try {
      // Use production URL when on production domain, otherwise use current origin
      const productionDomain = 'pla.soma.lefil.com.br';
      const isProduction = window.location.hostname === productionDomain;
      const baseUrl = isProduction ? `https://${productionDomain}` : window.location.origin;
      const redirectUrl = `${baseUrl}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;
    } catch (error: any) {
      throw error;
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    } catch (error: any) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signUp, signIn, signOut, resetPassword, updatePassword, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};