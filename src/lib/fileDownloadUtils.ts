export async function downloadFileFromUrl(signedUrl: string, fileName: string) {
  try {
    const a = document.createElement("a");
    a.href = signedUrl;
    a.download = fileName;
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error("Download failed:", e);
    window.open(signedUrl, "_blank", "noopener,noreferrer");
  }
}
