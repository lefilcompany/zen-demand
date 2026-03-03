import { supabase } from "@/integrations/supabase/client";

/**
 * Scans text content for base64 data URLs in <img> tags,
 * uploads them to storage, and replaces with real URLs.
 */
export async function uploadInlineImages(content: string): Promise<string> {
  const imgRegex = /<img\s+src="(data:[^"]+)"(?:\s+width="(\d+)")?\s*\/?>/g;
  const matches: { full: string; dataUrl: string; width?: string }[] = [];

  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    matches.push({ full: match[0], dataUrl: match[1], width: match[2] });
  }

  if (matches.length === 0) return content;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  let result = content;

  for (const m of matches) {
    try {
      const blob = dataUrlToBlob(m.dataUrl);
      const ext = blob.type.split("/")[1] === "jpeg" ? "jpg" : (blob.type.split("/")[1] || "png");
      const filePath = `inline/${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("demand-attachments")
        .upload(filePath, blob, { contentType: blob.type });

      if (uploadError) {
        console.error("Failed to upload inline image:", uploadError);
        continue;
      }

      // Get public or signed URL
      const { data: signedData } = await supabase.storage
        .from("demand-attachments")
        .createSignedUrl(filePath, 31536000); // 1 year

      const url = signedData?.signedUrl;
      if (!url) continue;

      const replacement = m.width
        ? `<img src="${url}" width="${m.width}" />`
        : `<img src="${url}" />`;

      result = result.replace(m.full, replacement);
    } catch (err) {
      console.error("Error uploading inline image:", err);
    }
  }

  return result;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64Data] = dataUrl.split(",");
  const mimeMatch = meta.match(/^data:(.*?);/);
  const mimeType = mimeMatch?.[1] || "image/png";

  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}
