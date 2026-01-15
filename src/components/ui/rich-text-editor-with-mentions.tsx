import { useEditor, EditorContent, Editor, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle, useMemo } from "react";
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
  AtSign,
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
import { useBoardMembers } from "@/hooks/useBoardMembers";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import tippy, { Instance as TippyInstance } from "tippy.js";
import "tippy.js/dist/tippy.css";

interface RichTextEditorWithMentionsProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
  boardId?: string | null;
  teamId?: string | null;
}

const HIGHLIGHT_COLORS = [
  { name: "Amarelo", color: "#fef08a" },
  { name: "Verde", color: "#bbf7d0" },
  { name: "Azul", color: "#bfdbfe" },
  { name: "Rosa", color: "#fbcfe8" },
  { name: "Laranja", color: "#fed7aa" },
];

// Sanitize HTML to prevent XSS - extended to allow mention spans
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "span", "img", 
      "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "mark", "a"
    ],
    ALLOWED_ATTR: ["style", "src", "alt", "class", "data-color", "href", "target", "rel", "data-type", "data-id", "data-label"],
    ADD_ATTR: ["style", "data-color", "data-type", "data-id", "data-label"],
  });
}

interface EditorToolbarProps {
  editor: Editor | null;
  onImageUpload: () => void;
  isUploading: boolean;
}

function EditorToolbar({ editor, onImageUpload, isUploading }: EditorToolbarProps) {
  if (!editor) return null;

  const handleAlignment = (alignment: "left" | "center" | "right" | "justify") => {
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;

    if (hasSelection) {
      editor.chain().focus().setTextAlign(alignment).run();
    } else {
      const currentPos = from;
      editor
        .chain()
        .focus()
        .selectAll()
        .setTextAlign(alignment)
        .setTextSelection(currentPos)
        .run();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1 border-b border-border bg-muted/30">
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

      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "left" })}
        onPressedChange={() => handleAlignment("left")}
        aria-label="Alinhar à esquerda"
        title="Alinhar à esquerda"
      >
        <AlignLeft className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "center" })}
        onPressedChange={() => handleAlignment("center")}
        aria-label="Centralizar"
        title="Centralizar"
      >
        <AlignCenter className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "right" })}
        onPressedChange={() => handleAlignment("right")}
        aria-label="Alinhar à direita"
        title="Alinhar à direita"
      >
        <AlignRight className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "justify" })}
        onPressedChange={() => handleAlignment("justify")}
        aria-label="Justificar"
        title="Justificar"
      >
        <AlignJustify className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-6 bg-border mx-1" />

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

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().insertContent("@").run()}
        title="Mencionar (@)"
      >
        <AtSign className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

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

type MentionMember = {
  user_id: string;
  profile: {
    full_name: string;
    avatar_url: string | null;
  };
};

// Mention suggestion list component
interface MentionSuggestionListProps {
  items: MentionMember[];
  command: (item: { id: string; label: string }) => void;
}

interface MentionSuggestionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionSuggestionList = forwardRef<MentionSuggestionListRef, MentionSuggestionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item.user_id, label: item.profile.full_name || "Usuário" });
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    if (items.length === 0) {
      return (
        <div className="bg-popover border border-border rounded-md shadow-lg p-2 text-sm text-muted-foreground">
          Nenhum membro encontrado
        </div>
      );
    }

    return (
      <div className="bg-popover border border-border rounded-md shadow-lg overflow-hidden max-h-60 overflow-y-auto">
        {items.map((item, index) => (
          <button
            key={item.user_id}
            type="button"
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent",
              index === selectedIndex && "bg-accent"
            )}
            onClick={() => selectItem(index)}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={item.profile.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {(item.profile.full_name || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span>{item.profile.full_name || "Usuário"}</span>
          </button>
        ))}
      </div>
    );
  }
);

MentionSuggestionList.displayName = "MentionSuggestionList";

export function RichTextEditorWithMentions({
  value,
  onChange,
  placeholder = "Digite aqui... Use @ para mencionar",
  disabled = false,
  className,
  minHeight = "120px",
  boardId,
  teamId,
}: RichTextEditorWithMentionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploadingRef = useRef(false);
  const { data: boardMembers = [] } = useBoardMembers(boardId ?? null);
  const { data: teamMembers = [] } = useTeamMembers(teamId ?? null);

  const mentionMembers = useMemo<MentionMember[]>(() => {
    if (teamId) {
      return teamMembers.map((m) => ({ user_id: m.user_id, profile: m.profile }));
    }

    return boardMembers.map((m) => ({
      user_id: m.user_id,
      profile: {
        full_name: m.profile?.full_name || "Usuário",
        avatar_url: m.profile?.avatar_url || null,
      },
    }));
  }, [teamId, teamMembers, boardMembers]);

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

  // Store members in ref for use in suggestion plugin
  const membersRef = useRef<MentionMember[]>([]);
  useEffect(() => {
    membersRef.current = mentionMembers;
  }, [mentionMembers]);

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
      Mention.configure({
        HTMLAttributes: {
          class: 'mention-tag',
        },
        renderHTML({ node }) {
          return [
            'span',
            {
              'data-type': 'mention',
              'data-id': node.attrs.id,
              'data-label': node.attrs.label,
              class: 'mention-tag bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded-md',
            },
            `@${node.attrs.label}`,
          ];
        },
        suggestion: {
          char: '@',
          items: ({ query }) => {
            const members = membersRef.current;
            if (!query) return members.slice(0, 10);
            const lowerQuery = query.toLowerCase();
            return members
              .filter((m) => m.profile.full_name.toLowerCase().includes(lowerQuery))
              .slice(0, 10);
          },
          render: () => {
            let component: ReactRenderer<MentionSuggestionListRef> | null = null;
            let popup: TippyInstance[] | null = null;

            return {
              onStart: (props) => {
                component = new ReactRenderer(MentionSuggestionList, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) return;

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                  zIndex: 100000,
                });
              },
              onUpdate: (props) => {
                component?.updateProps(props);
                if (props.clientRect && popup?.[0]) {
                  popup[0].setProps({
                    getReferenceClientRect: props.clientRect as () => DOMRect,
                  });
                }
              },
              onKeyDown: (props) => {
                if (props.event.key === 'Escape') {
                  popup?.[0]?.hide();
                  return true;
                }
                return component?.ref?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                popup?.[0]?.destroy();
                component?.destroy();
              },
            };
          },
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
      <style>{`
        .mention-tag {
          background-color: hsl(var(--primary) / 0.1);
          color: hsl(var(--primary));
          font-weight: 500;
          padding: 0.125rem 0.375rem;
          border-radius: 0.375rem;
        }
      `}</style>
    </div>
  );
}

// Helper to extract mentioned user IDs from HTML content
export function extractMentionedUserIds(html: string): string[] {
  const regex = /data-id="([^"]+)"/g;
  const ids: string[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    ids.push(match[1]);
  }
  return [...new Set(ids)];
}
