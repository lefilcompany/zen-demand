import { useParams, useNavigate } from "react-router-dom";
import { useNote, useUpdateNote, useDeleteNote } from "@/hooks/useNotes";
import { NotionEditor } from "@/components/notes/NotionEditor";
import { NoteIconPicker } from "@/components/notes/NoteIconPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  MoreHorizontal, 
  Trash2, 
  Share2, 
  Archive,
  Image,
  Copy,
  Check,
  Loader2
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useCallback, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { debounce } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export default function NoteDetail() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const { data: note, isLoading } = useNote(noteId || null);
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [icon, setIcon] = useState("📝");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || "");
      setIcon(note.icon);
    }
  }, [note]);

  // Debounced save
  const debouncedSave = useCallback(
    debounce((noteId: string, data: { title?: string; content?: string; icon?: string }) => {
      setIsSaving(true);
      updateNote.mutate(
        { noteId, ...data },
        {
          onSettled: () => setIsSaving(false),
        }
      );
    }, 1000),
    []
  );

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (noteId) {
      debouncedSave(noteId, { title: newTitle });
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (noteId) {
      debouncedSave(noteId, { content: newContent });
    }
  };

  const handleIconChange = (newIcon: string) => {
    setIcon(newIcon);
    if (noteId) {
      updateNote.mutate({ noteId, icon: newIcon });
    }
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir esta nota?")) {
      deleteNote.mutate(noteId!, {
        onSuccess: () => navigate("/notes"),
      });
    }
  };

  const handleArchive = () => {
    if (noteId) {
      updateNote.mutate(
        { noteId, archived: true },
        { onSuccess: () => navigate("/notes") }
      );
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/notes/${noteId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !noteId) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("inline-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("inline-images")
        .getPublicUrl(filePath);

      updateNote.mutate({ noteId, cover_url: publicUrl });
      toast.success("Capa atualizada!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload da capa");
    }
    e.target.value = "";
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <Skeleton className="h-10 w-32 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-6 text-center">
        <p className="text-muted-foreground">Nota não encontrada</p>
        <Button variant="link" onClick={() => navigate("/notes")}>
          Voltar para notas
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverUpload}
      />

      {/* Cover Image */}
      {note.cover_url && (
        <div className="h-48 w-full relative group">
          <img 
            src={note.cover_url} 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => coverInputRef.current?.click()}
            >
              Alterar capa
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/notes")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex items-center gap-2">
            {isSaving && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Salvando...
              </span>
            )}
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleCopyLink}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => coverInputRef.current?.click()}>
                  <Image className="h-4 w-4 mr-2" />
                  {note.cover_url ? "Alterar capa" : "Adicionar capa"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Copiar link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  Arquivar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-start gap-2 mb-4">
          <NoteIconPicker value={icon} onChange={handleIconChange} />
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Sem título"
            className="text-3xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0 bg-transparent"
          />
        </div>

        <NotionEditor 
          content={content}
          onChange={handleContentChange}
          placeholder="Comece a escrever ou pressione '/' para comandos..."
        />
      </div>
    </div>
  );
}
