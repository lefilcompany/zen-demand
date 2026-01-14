import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
}

const HIGHLIGHT_COLORS = [
  { name: "Amarelo", color: "#fef08a" },
  { name: "Verde", color: "#bbf7d0" },
  { name: "Azul", color: "#bfdbfe" },
  { name: "Rosa", color: "#fbcfe8" },
  { name: "Laranja", color: "#fed7aa" },
];

// Sanitize HTML to prevent XSS
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "span", "img", 
      "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "mark"
    ],
    ALLOWED_ATTR: ["style", "src", "alt", "class", "data-color"],
    ADD_ATTR: ["style", "data-color"],
  });
}

// Extract plain text from HTML for preview purposes
export function extractPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

interface EditorToolbarProps {
  editor: Editor | null;
  onImageUpload: () => void;
  isUploading: boolean;
}

function EditorToolbar({ editor, onImageUpload, isUploading }: EditorToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1 border-b border-border bg-muted/30">
      {/* Text formatting */}
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Negrito"
        title="Negrito (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Itálico"
        title="Itálico (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("underline")}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Sublinhado"
        title="Sublinhado (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Riscado"
        title="Riscado"
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Text alignment */}
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "left" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("left").run()}
        aria-label="Alinhar à esquerda"
        title="Alinhar à esquerda"
      >
        <AlignLeft className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "center" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("center").run()}
        aria-label="Centralizar"
        title="Centralizar"
      >
        <AlignCenter className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "right" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("right").run()}
        aria-label="Alinhar à direita"
        title="Alinhar à direita"
      >
        <AlignRight className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "justify" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("justify").run()}
        aria-label="Justificar"
        title="Justificar"
      >
        <AlignJustify className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Highlight colors */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("highlight") && "bg-accent"
            )}
            title="Marca-texto"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground mb-1">Cor do destaque</p>
            <div className="flex gap-1">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.color}
                  type="button"
                  className={cn(
                    "w-6 h-6 rounded border border-border hover:scale-110 transition-transform",
                    editor.isActive("highlight", { color: c.color }) && "ring-2 ring-primary"
                  )}
                  style={{ backgroundColor: c.color }}
                  onClick={() => editor.chain().focus().toggleHighlight({ color: c.color }).run()}
                  title={c.name}
                />
              ))}
              <button
                type="button"
                className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform flex items-center justify-center text-xs"
                onClick={() => editor.chain().focus().unsetHighlight().run()}
                title="Remover destaque"
              >
                ✕
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Image upload */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onImageUpload}
        disabled={isUploading}
        title="Inserir imagem"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Digite aqui...",
  disabled = false,
  className,
  minHeight = "120px",
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploadingRef = useRef(false);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return null;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return null;
    }

    isUploadingRef.current = true;

    try {
      // Get current user for folder organization
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || "anonymous";
      
      const ext = file.name.split(".").pop() || "png";
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("inline-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("inline-images")
        .getPublicUrl(filePath);

      toast.success("Imagem inserida!");
      return urlData.publicUrl;
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      toast.error("Erro ao fazer upload da imagem");
      return null;
    } finally {
      isUploadingRef.current = false;
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ["paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'highlight-mark',
        },
      }),
      Underline,
      Image.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-md my-2",
        },
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(sanitizeHtml(html));
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none p-3",
          "min-h-[var(--min-height)]"
        ),
        style: `--min-height: ${minHeight}`,
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              uploadImage(file).then((url) => {
                if (url && editor) {
                  editor.chain().focus().setImage({ src: url }).run();
                }
              });
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        for (const file of files) {
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            uploadImage(file).then((url) => {
              if (url && editor) {
                editor.chain().focus().setImage({ src: url }).run();
              }
            });
            return true;
          }
        }
        return false;
      },
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [uploadImage, editor]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={cn(
      "border border-input rounded-md bg-background overflow-hidden transition-colors",
      "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
      disabled && "opacity-50 cursor-not-allowed",
      className
    )}>
      <EditorToolbar 
        editor={editor} 
        onImageUpload={triggerFileInput}
        isUploading={isUploadingRef.current}
      />
      <EditorContent editor={editor} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

// Component for displaying rich text content (read-only)
interface RichTextDisplayProps {
  content: string | null | undefined;
  className?: string;
}

export function RichTextDisplay({ content, className }: RichTextDisplayProps) {
  if (!content) return null;

  // Check if content looks like HTML
  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  
  if (!isHtml) {
    // Plain text - wrap in paragraph
    return (
      <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    );
  }

  return (
    <div 
      className={cn("prose prose-sm dark:prose-invert max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
    />
  );
}
