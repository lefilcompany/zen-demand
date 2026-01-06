import { useState } from "react";
import { useCommentAttachments, getRequestAttachmentUrl } from "@/hooks/useRequestAttachments";
import { FileText, Image as ImageIcon, File, Download, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CommentAttachmentsProps {
  commentId: string;
  className?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return ImageIcon;
  if (fileType.includes("pdf") || fileType.includes("document")) return FileText;
  return File;
}

export function CommentAttachments({ commentId, className }: CommentAttachmentsProps) {
  const { data: attachments, isLoading } = useCommentAttachments(commentId);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loadingUrls, setLoadingUrls] = useState<Record<string, string>>({});

  const loadImageUrl = async (filePath: string, attachmentId: string) => {
    if (loadingUrls[attachmentId]) return loadingUrls[attachmentId];
    const url = await getRequestAttachmentUrl(filePath);
    if (url) {
      setLoadingUrls((prev) => ({ ...prev, [attachmentId]: url }));
    }
    return url;
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const url = await getRequestAttachmentUrl(filePath);
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleImageClick = async (filePath: string, attachmentId: string) => {
    const url = loadingUrls[attachmentId] || (await loadImageUrl(filePath, attachmentId));
    if (url) {
      setImagePreview(url);
    }
  };

  if (isLoading || !attachments || attachments.length === 0) return null;

  const images = attachments.filter((a) => a.file_type.startsWith("image/"));
  const files = attachments.filter((a) => !a.file_type.startsWith("image/"));

  return (
    <div className={cn("mt-2 space-y-2", className)}>
      {/* Image thumbnails */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((attachment) => (
            <ImageThumbnail
              key={attachment.id}
              attachment={attachment}
              onClick={() => handleImageClick(attachment.file_path, attachment.id)}
              cachedUrl={loadingUrls[attachment.id]}
              onLoadUrl={(url) => setLoadingUrls((prev) => ({ ...prev, [attachment.id]: url }))}
            />
          ))}
        </div>
      )}

      {/* Other files */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((attachment) => {
            const Icon = getFileIcon(attachment.file_type);
            return (
              <div
                key={attachment.id}
                className="flex items-center gap-2 bg-background border rounded-md px-2 py-1 text-xs"
              >
                <Icon className="h-3 w-3 text-muted-foreground" />
                <span className="truncate max-w-[100px]">{attachment.file_name}</span>
                <span className="text-muted-foreground">{formatSize(attachment.file_size)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleDownload(attachment.file_path, attachment.file_name)}
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Image preview modal */}
      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-background/80"
              onClick={() => setImagePreview(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ImageThumbnailProps {
  attachment: { id: string; file_path: string; file_name: string };
  onClick: () => void;
  cachedUrl?: string;
  onLoadUrl: (url: string) => void;
}

function ImageThumbnail({ attachment, onClick, cachedUrl, onLoadUrl }: ImageThumbnailProps) {
  const [url, setUrl] = useState<string | null>(cachedUrl || null);
  const [loading, setLoading] = useState(!cachedUrl);

  useState(() => {
    if (!cachedUrl) {
      getRequestAttachmentUrl(attachment.file_path).then((loadedUrl) => {
        if (loadedUrl) {
          setUrl(loadedUrl);
          onLoadUrl(loadedUrl);
        }
        setLoading(false);
      });
    }
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-12 h-12 rounded-md overflow-hidden border bg-muted flex items-center justify-center hover:ring-2 hover:ring-primary transition-all"
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      ) : url ? (
        <img src={url} alt={attachment.file_name} className="w-full h-full object-cover" />
      ) : (
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}
