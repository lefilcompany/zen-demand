import { Button } from "@/components/ui/button";
import { MentionInput } from "@/components/MentionInput";
import { InlineFileUploader, PendingFile } from "@/components/InlineFileUploader";
import { Send, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

interface DemandChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onInputChange: () => void;
  onBlur: () => void;
  pendingFiles: PendingFile[];
  onFilesChange: (files: PendingFile[]) => void;
  isSending: boolean;
  boardId: string;
  channel: "general" | "internal";
  placeholder?: string;
}

export function DemandChatInput({
  value,
  onChange,
  onSend,
  onInputChange,
  onBlur,
  pendingFiles,
  onFilesChange,
  isSending,
  boardId,
  channel,
  placeholder,
}: DemandChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isSending) {
        onSend();
      }
    }
  };

  return (
    <div className={cn(
      "border-t bg-background/80 backdrop-blur-sm p-3 space-y-2",
      channel === "internal" && "border-t-blue-500/30"
    )}>
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0" onKeyDown={handleKeyDown}>
          <MentionInput
            placeholder={placeholder || (channel === "internal" 
              ? "Mensagem interna... (apenas agentes)" 
              : "Escreva uma mensagem...")}
            value={value}
            boardId={boardId}
            onChange={(val) => {
              onChange(val);
              onInputChange();
            }}
            onBlur={onBlur}
            className={cn(
              "text-sm min-h-[40px] max-h-[120px] resize-none rounded-lg",
              channel === "internal" && "border-blue-500/30 focus-within:border-blue-500/50"
            )}
          />
        </div>
        <Button
          size="icon"
          onClick={onSend}
          disabled={!value.trim() || isSending}
          className={cn(
            "h-10 w-10 shrink-0 rounded-lg",
            channel === "internal" && "bg-blue-600 hover:bg-blue-700"
          )}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <InlineFileUploader
        pendingFiles={pendingFiles}
        onFilesChange={onFilesChange}
        disabled={isSending}
        listenToGlobalPaste
      />
    </div>
  );
}
