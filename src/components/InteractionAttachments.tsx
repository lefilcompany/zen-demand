import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAttachmentUrl } from "@/hooks/useAttachments";
import { FileText, Download, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
}

interface InteractionAttachmentsProps {
  interactionId: string;
  className?: string;
}

export function useInteractionAttachments(interactionId: string | null) {
  return useQuery({
    queryKey: ["interaction-attachments", interactionId],
    queryFn: async () => {
      if (!interactionId) return [];
      const { data, error } = await supabase
        .from("demand_attachments")
        .select("id, file_name, file_path, file_type, file_size")
        .eq("interaction_id", interactionId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Attachment[];
    },
    enabled: !!interactionId,
  });
}

function AttachmentItem({ attachment }: { attachment: Attachment }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isImage = attachment.file_type.startsWith("image/");
  
  // Load signed URL for image
  useEffect(() => {
    if (isImage) {
      getAttachmentUrl(attachment.file_path).then((url) => {
        setImageUrl(url);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [isImage, attachment.file_path]);

  const handleDownload = async () => {
    const url = await getAttachmentUrl(attachment.file_path);
    if (url) {
      window.open(url, "_blank");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isImage) {
    return (
      <>
        <div 
          className="relative group cursor-pointer rounded-lg overflow-hidden border border-border bg-muted/30"
          onClick={() => setIsExpanded(true)}
        >
          {isLoading ? (
            <div className="w-full h-32 bg-muted animate-pulse" />
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={attachment.file_name}
              className="max-w-full max-h-48 object-contain"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-32 bg-muted flex items-center justify-center text-muted-foreground text-sm">
              Erro ao carregar imagem
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Maximize2 className="h-6 w-6 text-white drop-shadow-lg" />
          </div>
        </div>
        
        <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10"
              onClick={() => setIsExpanded(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            {imageUrl && (
              <img
                src={imageUrl}
                alt={attachment.file_name}
                className="max-w-full max-h-[85vh] object-contain mx-auto"
              />
            )}
            <div className="flex items-center justify-between mt-2 px-2">
              <span className="text-sm text-muted-foreground truncate max-w-[70%]">
                {attachment.file_name}
              </span>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Baixar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div 
      className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={handleDownload}
    >
      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attachment.file_name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.file_size)}</p>
      </div>
      <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </div>
  );
}

export function InteractionAttachments({ interactionId, className }: InteractionAttachmentsProps) {
  const { data: attachments, isLoading } = useInteractionAttachments(interactionId);

  if (isLoading || !attachments || attachments.length === 0) {
    return null;
  }

  const images = attachments.filter(a => a.file_type.startsWith("image/"));
  const files = attachments.filter(a => !a.file_type.startsWith("image/"));

  return (
    <div className={cn("mt-2 space-y-2", className)}>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((attachment) => (
            <AttachmentItem key={attachment.id} attachment={attachment} />
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((attachment) => (
            <AttachmentItem key={attachment.id} attachment={attachment} />
          ))}
        </div>
      )}
    </div>
  );
}
