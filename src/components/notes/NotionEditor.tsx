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
  AtSign,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useDemandsList } from "@/hooks/useDemandsList";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

type CommandType = "block" | "mention-user" | "mention-demand";

interface SlashCommand {
  icon: React.ElementType;
  label: string;
  description?: string;
  action: () => void;
  type: CommandType;
}

export function NotionEditor({ content, onChange, placeholder = "Pressione '/' para comandos...", editable = true }: NotionEditorProps) {
  const { currentTeam } = useSelectedTeam();
  const { currentBoard } = useSelectedBoard();
  const { data: teamMembers = [] } = useTeamMembers(currentTeam?.id || null);
  const { data: demandsList = [] } = useDemandsList(currentBoard?.id || null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [slashFilter, setSlashFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menuMode, setMenuMode] = useState<"commands" | "users" | "demands">("commands");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Use refs to avoid stale closures in handleKeyDown
  const showSlashMenuRef = useRef(showSlashMenu);
  const slashFilterRef = useRef(slashFilter);
  const selectedIndexRef = useRef(selectedIndex);
  const menuModeRef = useRef(menuMode);
  
  useEffect(() => { showSlashMenuRef.current = showSlashMenu; }, [showSlashMenu]);
  useEffect(() => { slashFilterRef.current = slashFilter; }, [slashFilter]);
  useEffect(() => { selectedIndexRef.current = selectedIndex; }, [selectedIndex]);
  useEffect(() => { menuModeRef.current = menuMode; }, [menuMode]);

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
        const isMenuOpen = showSlashMenuRef.current;
        
        // Handle @ for user mentions
        if (event.key === "@" && !isMenuOpen) {
          const { from } = view.state.selection;
          const coords = view.coordsAtPos(from);
          setSlashMenuPosition({
            top: coords.bottom + 8,
            left: coords.left,
          });
          setShowSlashMenu(true);
          setMenuMode("users");
          setSlashFilter("");
          setSelectedIndex(0);
          return false;
        }
        
        // Handle # for demand mentions
        if (event.key === "#" && !isMenuOpen) {
          const { from } = view.state.selection;
          const coords = view.coordsAtPos(from);
          setSlashMenuPosition({
            top: coords.bottom + 8,
            left: coords.left,
          });
          setShowSlashMenu(true);
          setMenuMode("demands");
          setSlashFilter("");
          setSelectedIndex(0);
          return false;
        }
        
        // Handle / for commands
        if (event.key === "/" && !isMenuOpen) {
          const { from } = view.state.selection;
          const coords = view.coordsAtPos(from);
          setSlashMenuPosition({
            top: coords.bottom + 8,
            left: coords.left,
          });
          setShowSlashMenu(true);
          setMenuMode("commands");
          setSlashFilter("");
          setSelectedIndex(0);
          return false;
        }
        
        if (isMenuOpen) {
          if (event.key === "Escape") {
            setShowSlashMenu(false);
            return true;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setSelectedIndex(prev => prev + 1);
            return true;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setSelectedIndex(prev => Math.max(0, prev - 1));
            return true;
          }
          if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            // Trigger selection via a custom event
            window.dispatchEvent(new CustomEvent('notion-editor-select'));
            return true;
          }
          if (event.key === "Backspace" && slashFilterRef.current === "") {
            setShowSlashMenu(false);
            return false;
          }
        }
        return false;
      },
    },
  });

  // Handle text input for filtering
  useEffect(() => {
    if (!showSlashMenu || !editor) return;

    const handleInput = () => {
      const { from } = editor.state.selection;
      const text = editor.state.doc.textBetween(Math.max(0, from - 50), from, "");
      
      let trigger = "";
      if (menuMode === "commands") trigger = "/";
      else if (menuMode === "users") trigger = "@";
      else if (menuMode === "demands") trigger = "#";
      
      const lastTriggerIndex = text.lastIndexOf(trigger);
      if (lastTriggerIndex !== -1) {
        const filter = text.slice(lastTriggerIndex + 1);
        setSlashFilter(filter);
        setSelectedIndex(0);
      }
    };

    editor.on("update", handleInput);
    return () => {
      editor.off("update", handleInput);
    };
  }, [showSlashMenu, editor, menuMode]);

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

  const insertUserMention = useCallback((userId: string, userName: string) => {
    if (!editor) return;
    
    // Remove the @ and filter text
    const { from } = editor.state.selection;
    const text = editor.state.doc.textBetween(Math.max(0, from - 50), from, "");
    const lastAtIndex = text.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const deleteFrom = from - (text.length - lastAtIndex);
      editor.chain()
        .focus()
        .deleteRange({ from: deleteFrom, to: from })
        .insertContent(`<a href="/user/${userId}" data-mention="user" class="inline-flex items-center gap-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md px-1.5 py-0.5 text-xs font-medium mx-0.5 no-underline hover:bg-primary/20 transition-colors">@${userName}</a> `)
        .run();
    }
    setShowSlashMenu(false);
  }, [editor]);

  const insertDemandMention = useCallback((demandId: string, demandCode: string) => {
    if (!editor) return;
    
    // Remove the # and filter text
    const { from } = editor.state.selection;
    const text = editor.state.doc.textBetween(Math.max(0, from - 50), from, "");
    const lastHashIndex = text.lastIndexOf("#");
    if (lastHashIndex !== -1) {
      const deleteFrom = from - (text.length - lastHashIndex);
      editor.chain()
        .focus()
        .deleteRange({ from: deleteFrom, to: from })
        .insertContent(`<a href="/demands/${demandId}" data-mention="demand" class="inline-flex items-center gap-0.5 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20 rounded-md px-1.5 py-0.5 text-xs font-medium mx-0.5 no-underline hover:bg-cyan-500/20 transition-colors">#${demandCode}</a> `)
        .run();
    }
    setShowSlashMenu(false);
  }, [editor]);

  const slashCommands: SlashCommand[] = [
    { icon: Type, label: "Texto", description: "Texto simples", action: () => editor?.chain().focus().setParagraph().run(), type: "block" },
    { icon: Heading1, label: "Título 1", description: "Título grande", action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), type: "block" },
    { icon: Heading2, label: "Título 2", description: "Título médio", action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), type: "block" },
    { icon: Heading3, label: "Título 3", description: "Título pequeno", action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), type: "block" },
    { icon: List, label: "Lista", description: "Lista com marcadores", action: () => editor?.chain().focus().toggleBulletList().run(), type: "block" },
    { icon: ListOrdered, label: "Lista Numerada", description: "Lista numerada", action: () => editor?.chain().focus().toggleOrderedList().run(), type: "block" },
    { icon: CheckSquare, label: "Checklist", description: "Lista de tarefas", action: () => editor?.chain().focus().insertContent("☐ ").run(), type: "block" },
    { icon: Quote, label: "Citação", description: "Bloco de citação", action: () => editor?.chain().focus().toggleBlockquote().run(), type: "block" },
    { icon: Code, label: "Código", description: "Bloco de código", action: () => editor?.chain().focus().toggleCodeBlock().run(), type: "block" },
    { icon: Minus, label: "Divisor", description: "Linha divisória", action: () => editor?.chain().focus().setHorizontalRule().run(), type: "block" },
    { icon: ImageIcon, label: "Imagem", description: "Inserir imagem", action: () => { setShowSlashMenu(false); handleImageUpload(); }, type: "block" },
    { icon: Video, label: "Vídeo", description: "Inserir vídeo", action: () => { setShowSlashMenu(false); videoInputRef.current?.click(); }, type: "block" },
    { icon: FileText, label: "Documento", description: "Anexar arquivo", action: () => { setShowSlashMenu(false); docInputRef.current?.click(); }, type: "block" },
    { icon: AtSign, label: "Mencionar pessoa", description: "Mencionar usuário", action: () => { setMenuMode("users"); setSlashFilter(""); setSelectedIndex(0); }, type: "mention-user" },
    { icon: Hash, label: "Mencionar demanda", description: "Mencionar demanda", action: () => { setMenuMode("demands"); setSlashFilter(""); setSelectedIndex(0); }, type: "mention-demand" },
  ];

  const getFilteredItems = useCallback(() => {
    if (menuMode === "commands") {
      return slashCommands.filter(cmd => 
        cmd.label.toLowerCase().includes(slashFilter.toLowerCase()) ||
        cmd.description?.toLowerCase().includes(slashFilter.toLowerCase())
      );
    }
    if (menuMode === "users") {
      return teamMembers.filter(member =>
        member.profile.full_name.toLowerCase().includes(slashFilter.toLowerCase())
      );
    }
    if (menuMode === "demands") {
      return demandsList.filter(demand =>
        demand.title.toLowerCase().includes(slashFilter.toLowerCase()) ||
        demand.board_sequence_number.toString().includes(slashFilter)
      );
    }
    return [];
  }, [menuMode, slashFilter, slashCommands, teamMembers, demandsList]);

  const selectItem = useCallback((index: number) => {
    const items = getFilteredItems();
    if (index >= items.length) return;

    if (menuMode === "commands") {
      const cmd = items[index] as SlashCommand;
      cmd.action();
      if (cmd.type === "block") {
        // Remove the / and filter text
        if (editor) {
          const { from } = editor.state.selection;
          const text = editor.state.doc.textBetween(Math.max(0, from - 50), from, "");
          const lastSlashIndex = text.lastIndexOf("/");
          if (lastSlashIndex !== -1) {
            const deleteFrom = from - (text.length - lastSlashIndex);
            editor.commands.deleteRange({ from: deleteFrom, to: from });
          }
        }
        setShowSlashMenu(false);
      }
    } else if (menuMode === "users") {
      const member = items[index] as typeof teamMembers[0];
      insertUserMention(member.user_id, member.profile.full_name);
    } else if (menuMode === "demands") {
      const demand = items[index] as typeof demandsList[0];
      insertDemandMention(demand.id, demand.board_sequence_number.toString());
    }
  }, [menuMode, getFilteredItems, editor, insertUserMention, insertDemandMention]);

  // Scroll selected item into view and wrap around
  useEffect(() => {
    if (showSlashMenu && menuRef.current) {
      const items = getFilteredItems();
      const maxIndex = items.length - 1;
      
      // Wrap around the index
      if (selectedIndex > maxIndex && maxIndex >= 0) {
        setSelectedIndex(0);
        return;
      }
      if (selectedIndex < 0 && maxIndex >= 0) {
        setSelectedIndex(maxIndex);
        return;
      }
      
      const selectedElement = menuRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, showSlashMenu, getFilteredItems]);

  // Listen for selection event from keyboard
  useEffect(() => {
    const handleSelectEvent = () => {
      if (showSlashMenuRef.current) {
        selectItem(selectedIndexRef.current);
      }
    };
    
    window.addEventListener('notion-editor-select', handleSelectEvent);
    return () => window.removeEventListener('notion-editor-select', handleSelectEvent);
  }, [selectItem]);

  if (!editor) return null;

  const filteredItems = getFilteredItems();

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

      {/* Slash Command / Mention Menu */}
      {showSlashMenu && (
        <div 
          ref={menuRef}
          className="fixed z-50 bg-background border rounded-lg shadow-lg p-2 min-w-[280px] max-h-[320px] overflow-y-auto"
          style={{ top: slashMenuPosition.top, left: slashMenuPosition.left }}
        >
          <div className="text-xs text-muted-foreground px-2 pb-2 border-b mb-2 flex items-center justify-between">
            <span>
              {menuMode === "commands" && "Blocos e ações"}
              {menuMode === "users" && "Mencionar pessoa"}
              {menuMode === "demands" && "Mencionar demanda"}
            </span>
            <span className="text-[10px] opacity-60">↑↓ navegar · Enter selecionar</span>
          </div>
          
          {menuMode === "commands" && (
            <>
              {filteredItems.length > 0 ? (
                (filteredItems as SlashCommand[]).map((cmd, index) => (
                  <button
                    key={cmd.label}
                    data-index={index}
                    onClick={() => selectItem(index)}
                    className={cn(
                      "flex items-center gap-3 w-full px-2 py-2 rounded text-left text-sm transition-colors",
                      selectedIndex === index ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center",
                      selectedIndex === index ? "bg-primary/20" : "bg-muted"
                    )}>
                      <cmd.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{cmd.label}</div>
                      {cmd.description && (
                        <div className="text-xs text-muted-foreground truncate">{cmd.description}</div>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Nenhum comando encontrado
                </div>
              )}
            </>
          )}
          
          {menuMode === "users" && (
            <>
              {(filteredItems as typeof teamMembers).length > 0 ? (
                (filteredItems as typeof teamMembers).map((member, index) => (
                  <button
                    key={member.user_id}
                    data-index={index}
                    onClick={() => selectItem(index)}
                    className={cn(
                      "flex items-center gap-3 w-full px-2 py-2 rounded text-left text-sm transition-colors",
                      selectedIndex === index ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.profile.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.profile.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{member.profile.full_name}</div>
                      <div className="text-xs text-muted-foreground">{member.role}</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  {teamMembers.length === 0 ? "Nenhum membro no time" : "Nenhum usuário encontrado"}
                </div>
              )}
            </>
          )}
          
          {menuMode === "demands" && (
            <>
              {(filteredItems as typeof demandsList).length > 0 ? (
                (filteredItems as typeof demandsList).map((demand, index) => (
                  <button
                    key={demand.id}
                    data-index={index}
                    onClick={() => selectItem(index)}
                    className={cn(
                      "flex items-center gap-3 w-full px-2 py-2 rounded text-left text-sm transition-colors",
                      selectedIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center font-mono text-sm font-bold",
                      selectedIndex === index ? "bg-accent" : "bg-muted"
                    )}>
                      #{demand.board_sequence_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{demand.title}</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  {demandsList.length === 0 ? "Nenhuma demanda no quadro" : "Nenhuma demanda encontrada"}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Click outside to close menu */}
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
              {slashCommands.filter(cmd => cmd.type === "block").slice(0, 10).map((cmd) => (
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
        
        .ProseMirror a[data-mention] {
          text-decoration: none;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
