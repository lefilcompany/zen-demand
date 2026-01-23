import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect, useCallback, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Plus,
  Type,
  CheckSquare,
  Minus,
  Video,
  FileText,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface NotionEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

const HIGHLIGHT_COLORS = [
  { name: "Amarelo", color: "#fef08a" },
  { name: "Verde", color: "#bbf7d0" },
  { name: "Azul", color: "#bfdbfe" },
  { name: "Rosa", color: "#fbcfe8" },
  { name: "Roxo", color: "#ddd6fe" },
  { name: "Laranja", color: "#fed7aa" },
];

export function NotionEditor({ content, onChange, placeholder = "Pressione '/' para comandos...", editable = true }: NotionEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [slashFilter, setSlashFilter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto my-4",
        },
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-2",
      },
      handleKeyDown: (view, event) => {
        if (event.key === "/" && !showSlashMenu) {
          const { from } = view.state.selection;
          const coords = view.coordsAtPos(from);
          setSlashMenuPosition({
            top: coords.bottom + 8,
            left: coords.left,
          });
          setShowSlashMenu(true);
          setSlashFilter("");
          return false;
        }
        if (showSlashMenu) {
          if (event.key === "Escape") {
            setShowSlashMenu(false);
            return true;
          }
          if (event.key === "Backspace" && slashFilter === "") {
            setShowSlashMenu(false);
            return false;
          }
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const uploadImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return null;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `notes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("inline-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("inline-images")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload da imagem");
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleImageUpload = useCallback(async () => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const url = await uploadImage(file);
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
    e.target.value = "";
  }, [editor, uploadImage]);

  const handleVideoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Apenas vídeos são permitidos");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `notes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("inline-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("inline-images")
        .getPublicUrl(filePath);

      editor.chain().focus().insertContent(`
        <div class="my-4">
          <video controls class="rounded-lg max-w-full" src="${publicUrl}">
            Seu navegador não suporta vídeos.
          </video>
        </div>
      `).run();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload do vídeo");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }, [editor]);

  const handleDocUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `notes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("inline-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("inline-images")
        .getPublicUrl(filePath);

      editor.chain().focus().insertContent(`
        <a href="${publicUrl}" target="_blank" class="inline-flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors my-2">
          📎 ${file.name}
        </a>
      `).run();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload do documento");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }, [editor]);

  const slashCommands = [
    { icon: Type, label: "Texto", action: () => editor?.chain().focus().setParagraph().run() },
    { icon: Heading1, label: "Título 1", action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run() },
    { icon: Heading2, label: "Título 2", action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: Heading3, label: "Título 3", action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
    { icon: List, label: "Lista", action: () => editor?.chain().focus().toggleBulletList().run() },
    { icon: ListOrdered, label: "Lista Numerada", action: () => editor?.chain().focus().toggleOrderedList().run() },
    { icon: CheckSquare, label: "Checklist", action: () => editor?.chain().focus().insertContent("☐ ").run() },
    { icon: Quote, label: "Citação", action: () => editor?.chain().focus().toggleBlockquote().run() },
    { icon: Code, label: "Código", action: () => editor?.chain().focus().toggleCodeBlock().run() },
    { icon: Minus, label: "Divisor", action: () => editor?.chain().focus().setHorizontalRule().run() },
    { icon: ImageIcon, label: "Imagem", action: () => { setShowSlashMenu(false); handleImageUpload(); } },
    { icon: Video, label: "Vídeo", action: () => { setShowSlashMenu(false); videoInputRef.current?.click(); } },
    { icon: FileText, label: "Documento", action: () => { setShowSlashMenu(false); docInputRef.current?.click(); } },
  ];

  const filteredCommands = slashCommands.filter(cmd => 
    cmd.label.toLowerCase().includes(slashFilter.toLowerCase())
  );

  if (!editor) return null;

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoUpload}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        className="hidden"
        onChange={handleDocUpload}
      />

      {/* Bubble Menu - appears when text is selected */}
      {editor && (
        <BubbleMenu 
          editor={editor} 
          tippyOptions={{ duration: 100 }}
          className="flex items-center gap-0.5 p-1 rounded-lg border bg-background shadow-lg"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("h-8 w-8 p-0", editor.isActive("bold") && "bg-muted")}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn("h-8 w-8 p-0", editor.isActive("italic") && "bg-muted")}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn("h-8 w-8 p-0", editor.isActive("underline") && "bg-muted")}
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn("h-8 w-8 p-0", editor.isActive("strike") && "bg-muted")}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={cn("h-8 w-8 p-0", editor.isActive("code") && "bg-muted")}
          >
            <Code className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0", editor.isActive("highlight") && "bg-muted")}
              >
                <Highlighter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="flex gap-1">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color.color}
                    onClick={() => editor.chain().focus().toggleHighlight({ color: color.color }).run()}
                    className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.color }}
                    title={color.name}
                  />
                ))}
                <button
                  onClick={() => editor.chain().focus().unsetHighlight().run()}
                  className="w-6 h-6 rounded border bg-background hover:bg-muted flex items-center justify-center text-xs"
                  title="Remover"
                >
                  ✕
                </button>
              </div>
            </PopoverContent>
          </Popover>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: "left" }) && "bg-muted")}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: "center" }) && "bg-muted")}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: "right" }) && "bg-muted")}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </BubbleMenu>
      )}

      {/* Slash Command Menu */}
      {showSlashMenu && (
        <div 
          className="fixed z-50 bg-background border rounded-lg shadow-lg p-2 min-w-[200px] max-h-[300px] overflow-y-auto"
          style={{ top: slashMenuPosition.top, left: slashMenuPosition.left }}
        >
          <div className="text-xs text-muted-foreground px-2 pb-2 border-b mb-2">
            Blocos básicos
          </div>
          {filteredCommands.map((cmd) => (
            <button
              key={cmd.label}
              onClick={() => {
                cmd.action();
                setShowSlashMenu(false);
                // Remove the slash character
                editor?.commands.deleteRange({ 
                  from: editor.state.selection.from - 1 - slashFilter.length, 
                  to: editor.state.selection.from 
                });
              }}
              className="flex items-center gap-3 w-full px-2 py-1.5 rounded hover:bg-muted text-left text-sm transition-colors"
            >
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                <cmd.icon className="h-4 w-4" />
              </div>
              <span>{cmd.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Click outside to close slash menu */}
      {showSlashMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSlashMenu(false)}
        />
      )}

      <EditorContent editor={editor} className={cn(isUploading && "opacity-50 pointer-events-none")} />

      {/* Floating add button */}
      {editable && (
        <div className="absolute left-0 top-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 hover:opacity-100 transition-opacity">
                <Plus className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="text-xs text-muted-foreground px-2 pb-2 border-b mb-2">
                Inserir bloco
              </div>
              {slashCommands.slice(0, 10).map((cmd) => (
                <button
                  key={cmd.label}
                  onClick={() => cmd.action()}
                  className="flex items-center gap-3 w-full px-2 py-1.5 rounded hover:bg-muted text-left text-sm transition-colors"
                >
                  <cmd.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{cmd.label}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      )}

      <style>{`
        .is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
        
        .ProseMirror {
          outline: none;
        }
        
        .ProseMirror h1 {
          font-size: 2em;
          font-weight: 700;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        
        .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin-top: 1.25em;
          margin-bottom: 0.5em;
        }
        
        .ProseMirror h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        
        .ProseMirror blockquote {
          border-left: 3px solid hsl(var(--border));
          padding-left: 1em;
          margin-left: 0;
          color: hsl(var(--muted-foreground));
        }
        
        .ProseMirror pre {
          background: hsl(var(--muted));
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
        }
        
        .ProseMirror code {
          background: hsl(var(--muted));
          padding: 0.2em 0.4em;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }
        
        .ProseMirror hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 2em 0;
        }
        
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5em;
        }
        
        .ProseMirror li {
          margin: 0.25em 0;
        }
      `}</style>
    </div>
  );
}
