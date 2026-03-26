import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, X } from "lucide-react";

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  fileType: string;
  fileSize?: number;
  getUrl: () => Promise<string | null>;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function isPreviewable(fileType: string) {
  return (
    fileType === "application/pdf" ||
    fileType.startsWith("image/") ||
    fileType === "text/plain"
  );
}

export { isPreviewable };

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  fileName,
  fileType,
  fileSize,
  getUrl,
}: DocumentPreviewDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && !url) {
      setLoading(true);
      getUrl().then((u) => {
        setUrl(u);
        setLoading(false);
      });
    }
    if (!open) {
      setUrl(null);
    }
  }, [open]);

  const handleDownload = () => {
    if (url) window.open(url, "_blank");
  };

  const isImage = fileType.startsWith("image/");
  const isPdf = fileType === "application/pdf";
  const isText = fileType === "text/plain";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-medium truncate">{fileName}</span>
            {fileSize != null && (
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatFileSize(fileSize)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!url}>
              <Download className="h-4 w-4 mr-1" />
              Baixar
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 flex items-center justify-center bg-muted/10">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Carregando documento...</span>
            </div>
          ) : !url ? (
            <span className="text-sm text-muted-foreground">Não foi possível carregar o arquivo.</span>
          ) : isPdf ? (
            <iframe
              src={url}
              title={fileName}
              className="w-full h-full border-0"
            />
          ) : isImage ? (
            <img
              src={url}
              alt={fileName}
              className="max-w-full max-h-full object-contain p-4"
            />
          ) : isText ? (
            <iframe
              src={url}
              title={fileName}
              className="w-full h-full border-0 bg-background p-4"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
