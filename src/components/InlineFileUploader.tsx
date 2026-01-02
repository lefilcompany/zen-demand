import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Image, FileText, File, Clipboard } from "lucide-react";
import { toast } from "sonner";

export interface PendingFile {
  id: string;
  file: File;
  preview?: string;
}

interface InlineFileUploaderProps {
  pendingFiles: PendingFile[];
  onFilesChange: (files: PendingFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  disabled?: boolean;
  listenToGlobalPaste?: boolean;
}

const MAX_DEFAULT_SIZE = 10 * 1024 * 1024; // 10MB

export function InlineFileUploader({
  pendingFiles,
  onFilesChange,
  maxFiles = 10,
  maxSizeMB = 10,
  accept = "image/*,.pdf,.doc,.docx,.txt",
  disabled = false,
  listenToGlobalPaste = false,
}: InlineFileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  
  const maxSize = maxSizeMB * 1024 * 1024;

  const handleFiles = useCallback((files: FileList | File[] | null) => {
    if (!files || disabled) return;
    
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    const newFiles: PendingFile[] = [];
    
    for (const file of fileArray) {
      if (pendingFiles.length + newFiles.length >= maxFiles) {
        toast.error(`Máximo de ${maxFiles} arquivos permitido`);
        break;
      }
      
      if (file.size > maxSize) {
        toast.error(`${file.name} excede o limite de ${maxSizeMB}MB`);
        continue;
      }
      
      const preview = file.type.startsWith("image/") 
        ? URL.createObjectURL(file) 
        : undefined;
        
      newFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview,
      });
    }
    
    if (newFiles.length > 0) {
      onFilesChange([...pendingFiles, ...newFiles]);
    }
  }, [pendingFiles, maxFiles, maxSize, maxSizeMB, disabled, onFilesChange]);

  // Handle paste events for clipboard images
  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (disabled) return;
    
    const clipboardItems = e.clipboardData?.items;
    if (!clipboardItems) return;
    
    const imageFiles: File[] = [];
    
    for (const item of Array.from(clipboardItems)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          // Create a more descriptive name for pasted images
          const extension = item.type.split("/")[1] || "png";
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          // Rename file by creating a new blob with the file data
          const renamedFile = Object.assign(file, {
            name: `imagem-colada-${timestamp}.${extension}`,
          }) as File;
          imageFiles.push(renamedFile);
        }
      }
    }
    
    if (imageFiles.length > 0) {
      e.preventDefault();
      handleFiles(imageFiles);
      toast.success(`${imageFiles.length} imagem(ns) colada(s) do clipboard`);
    }
  }, [handleFiles, disabled]);

  // Listen for global paste events if enabled
  useEffect(() => {
    if (!listenToGlobalPaste) return;
    
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [listenToGlobalPaste, handlePaste]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles, disabled]);

  const removeFile = useCallback((fileId: string) => {
    const file = pendingFiles.find(f => f.id === fileId);
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }
    onFilesChange(pendingFiles.filter(f => f.id !== fileId));
  }, [pendingFiles, onFilesChange]);

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

  return (
    <div className="space-y-3">
      {/* Upload button with drag area */}
      <div
        className={`relative border border-dashed rounded-lg p-3 transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="inline-file-upload"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />
        <label 
          htmlFor="inline-file-upload" 
          className={`flex items-center justify-center gap-2 cursor-pointer ${disabled ? "cursor-not-allowed" : ""}`}
        >
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Arraste, <span className="text-primary">clique</span> ou <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+V</kbd> para anexar
          </span>
        </label>
      </div>

      {/* File previews */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pendingFiles.map((pendingFile) => {
            const Icon = getFileIcon(pendingFile.file.type);
            const isImage = pendingFile.file.type.startsWith("image/");
            
            return (
              <div
                key={pendingFile.id}
                className="relative group flex items-center gap-2 bg-muted/50 rounded-lg p-2 pr-8 max-w-[200px]"
              >
                {isImage && pendingFile.preview ? (
                  <img
                    src={pendingFile.preview}
                    alt={pendingFile.file.name}
                    className="h-8 w-8 object-cover rounded"
                  />
                ) : (
                  <Icon className="h-8 w-8 p-1.5 bg-background rounded flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{pendingFile.file.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatSize(pendingFile.file.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeFile(pendingFile.id)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Helper function to upload pending files to a demand
export async function uploadPendingFiles(
  demandId: string,
  pendingFiles: PendingFile[],
  uploadMutation: { mutateAsync: (data: { demandId: string; file: File; interactionId?: string }) => Promise<any> },
  interactionId?: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  
  for (const pendingFile of pendingFiles) {
    try {
      await uploadMutation.mutateAsync({ demandId, file: pendingFile.file, interactionId });
      success++;
      // Cleanup preview URL
      if (pendingFile.preview) {
        URL.revokeObjectURL(pendingFile.preview);
      }
    } catch (error) {
      console.error(`Failed to upload ${pendingFile.file.name}:`, error);
      failed++;
    }
  }
  
  return { success, failed };
}
