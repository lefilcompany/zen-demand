export async function downloadFileFromUrl(signedUrl: string, fileName: string) {
  try {
    const res = await fetch(signedUrl);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch (e) {
    console.error("Download failed:", e);
    window.open(signedUrl, "_blank");
  }
}
