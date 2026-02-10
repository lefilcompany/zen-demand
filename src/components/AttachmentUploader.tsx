import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Download, FileText, Image, File, Trash2, Loader2, Maximize2 } from "lucide-react";
import { useAttachments, useUploadAttachment, useDeleteAttachment, getAttachmentUrl } from "@/hooks/useAttachments";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { buildPublicDemandUrl } from "@/lib/demandShareUtils";

interface AttachmentUploaderProps {
  demandId: string;
  readOnly?: boolean;
  demandTitle?: string;
  demandCreatedBy?: string;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface AttachmentItemProps {
  attachment: {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    created_at: string;
  };
  readOnly: boolean;
  onDelete: (id: string, filePath: string) => void;
}

function AttachmentItem({ attachment, readOnly, onDelete }: AttachmentItemProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    getAttachmentUrl(attachment.file_path).then((signedUrl) => {
      if (mounted) {
        setUrl(signedUrl);
        setLoading(false);
      }
    });
    
    return () => { mounted = false; };
  }, [attachment.file_path]);

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return Image;
    if (type.includes("pdf") || type.includes("document")) return FileText;
    return File;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const Icon = getFileIcon(attachment.file_type);
  const isImage = attachment.file_type.startsWith("image/");

  return (
    <>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group">
        {loading ? (
          <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isImage && url ? (
          <img
            src={url}
            alt={attachment.file_name}
            className="h-10 w-10 object-cover rounded flex-shrink-0"
          />
        ) : (
          <Icon className="h-10 w-10 p-2 bg-background rounded flex-shrink-0" />
        )}
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{attachment.file_name}</p>
          <p className="text-xs text-muted-foreground">
            {formatSize(attachment.file_size)} • {format(new Date(attachment.created_at), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {isImage && url && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          {url && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              asChild
            >
              <a href={url} download={attachment.file_name} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
              </a>
            </Button>
          )}
          
          {!readOnly && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100"
              onClick={() => onDelete(attachment.id, attachment.file_path)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {isImage && (
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
            {url && (
              <img
                src={url}
                alt={attachment.file_name}
                className="max-w-full max-h-[85vh] object-contain mx-auto"
              />
            )}
            <div className="flex items-center justify-between mt-2 px-2">
              <span className="text-sm text-muted-foreground truncate max-w-[70%]">
                {attachment.file_name}
              </span>
              <Button variant="outline" size="sm" asChild>
                <a href={url || "#"} download={attachment.file_name} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-1" />
                  Baixar
                </a>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function AttachmentUploader({ demandId, readOnly = false, demandTitle, demandCreatedBy }: AttachmentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { data: attachments, isLoading } = useAttachments(demandId);
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();
  const { user } = useAuth();

  const notifyCreator = useCallback(async (fileName: string) => {
    // Only notify if creator exists, is different from uploader, and we have demand info
    if (!demandCreatedBy || !demandTitle || demandCreatedBy === user?.id) return;

    try {
      // Get uploader name
      const { data: uploaderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id || "")
        .single();

      const uploaderName = uploaderProfile?.full_name || "Alguém";

      // Create in-app notification
      await supabase.from("notifications").insert({
        user_id: demandCreatedBy,
        title: "Novo arquivo anexado",
        message: `${uploaderName} anexou "${fileName}" na demanda "${demandTitle}"`,
        type: "info",
        link: `/demands/${demandId}`,
      });

      // Send email notification with public link
      const publicUrl = await buildPublicDemandUrl(demandId, user?.id || "");
      await supabase.functions.invoke("send-email", {
        body: {
          to: demandCreatedBy,
          subject: `📎 Novo arquivo anexado: ${demandTitle}`,
          template: "notification",
          templateData: {
            title: "Novo arquivo anexado à demanda",
            message: `${uploaderName} anexou o arquivo "${fileName}" na demanda "${demandTitle}".`,
            actionUrl: publicUrl,
            actionText: "Ver Demanda",
            type: "info" as const,
          },
        },
      });
    } catch (error) {
      console.error("Error notifying creator about attachment:", error);
    }
  }, [demandCreatedBy, demandTitle, demandId, user?.id]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    
    for (const file of Array.from(files)) {
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} excede o limite de 10MB`);
        continue;
      }
      
      try {
        await uploadAttachment.mutateAsync({ demandId, file });
        toast.success(`${file.name} enviado com sucesso`);
        
        // Notify demand creator
        await notifyCreator(file.name);
      } catch {
        toast.error(`Erro ao enviar ${file.name}`);
      }
    }
  }, [demandId, uploadAttachment, notifyCreator]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDelete = async (id: string, filePath: string) => {
    try {
      await deleteAttachment.mutateAsync({ id, filePath, demandId });
      toast.success("Anexo removido");
    } catch {
      toast.error("Erro ao remover anexo");
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando anexos...</div>;
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Paperclip className="h-4 w-4" />
        Anexos ({attachments?.length || 0})
      </h4>

      {!readOnly && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Paperclip className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Arraste arquivos ou <span className="text-primary">clique para selecionar</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Máximo 10MB por arquivo</p>
          </label>
        </div>
      )}

      {attachments && attachments.length > 0 && (
        <ScrollArea className="max-h-48">
          <div className="space-y-2 pr-2">
            {attachments.map((attachment) => (
              <AttachmentItem
                key={attachment.id}
                attachment={attachment}
                readOnly={readOnly}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
