import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useBoardMembers } from "@/hooks/useBoardMembers";
import { formatMentionForStorage, parseMentionsToArray } from "@/lib/mentionUtils";
import { cn } from "@/lib/utils";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  boardId: string;
  placeholder?: string;
  className?: string;
  onBlur?: () => void;
  allowedRoles?: ("admin" | "moderator" | "executor" | "requester")[];
}

interface MentionData {
  userId: string;
  name: string;
}

export function MentionInput({ value, onChange, boardId, placeholder = "Digite aqui...", className, onBlur, allowedRoles }: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEmpty, setIsEmpty] = useState(!value);
  const editorRef = useRef<HTMLDivElement>(null);
  const { data: members } = useBoardMembers(boardId);

  const filteredMembers = members?.filter((m) => {
    const matchesName = m.profile?.full_name?.toLowerCase().includes(mentionQuery.toLowerCase());
    const matchesRole = !allowedRoles || (m.teamRole && allowedRoles.includes(m.teamRole as any));
    return matchesName && matchesRole;
  }) || [];

  // Check if editor is empty
  const checkIsEmpty = useCallback(() => {
    if (!editorRef.current) return true;
    const text = editorRef.current.textContent || "";
    return text.trim() === "";
  }, []);

  // Cria elemento de tag de menção
  const createMentionElement = (userId: string, name: string): HTMLSpanElement => {
    const span = document.createElement("span");
    span.contentEditable = "false";
    span.className = "inline-flex items-center gap-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md px-1.5 py-0.5 text-xs font-medium mx-0.5 select-none align-baseline";
    span.setAttribute("data-mention-user-id", userId);
    span.setAttribute("data-mention-name", name);
    span.textContent = `@${name}`;
    return span;
  };

  // Converte conteúdo do editor para formato de armazenamento
  const getStorageValue = useCallback((): string => {
    if (!editorRef.current) return "";
    
    let result = "";
    const nodes = editorRef.current.childNodes;
    
    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent || "";
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const userId = element.getAttribute("data-mention-user-id");
        const name = element.getAttribute("data-mention-name");
        
        if (userId && name) {
          result += formatMentionForStorage(userId, name);
        } else if (element.tagName === "BR") {
          result += "\n";
        } else {
          result += element.textContent || "";
        }
      }
    });
    
    return result;
  }, []);

  // Renderiza valor inicial no editor
  const renderValueToEditor = useCallback((storageValue: string) => {
    if (!editorRef.current) return;
    
    editorRef.current.innerHTML = "";
    
    if (!storageValue) return;
    
    const parts = parseMentionsToArray(storageValue);
    
    parts.forEach((part) => {
      if (typeof part === "string") {
        // Divide por quebras de linha para manter formatação
        const lines = part.split("\n");
        lines.forEach((line, index) => {
          if (line) {
            editorRef.current!.appendChild(document.createTextNode(line));
          }
          if (index < lines.length - 1) {
            editorRef.current!.appendChild(document.createElement("br"));
          }
        });
      } else {
        const mentionEl = createMentionElement(part.userId, part.name);
        editorRef.current!.appendChild(mentionEl);
      }
    });
  }, []);

  // Sincroniza valor externo -> editor (apenas na inicialização ou quando valor muda externamente)
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = getStorageValue();
      if (value !== currentValue) {
        renderValueToEditor(value);
      }
      setIsEmpty(checkIsEmpty());
    }
  }, [value, getStorageValue, renderValueToEditor, checkIsEmpty]);

  // Fecha sugestões ao clicar fora
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!editorRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Detecta digitação de @
  const handleInput = () => {
    setIsEmpty(checkIsEmpty());
    
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const container = range.startContainer;
    
    // Só processa texto
    if (container.nodeType !== Node.TEXT_NODE) {
      setShowSuggestions(false);
      onChange(getStorageValue());
      return;
    }
    
    const text = container.textContent || "";
    const cursorPos = range.startOffset;
    const textBeforeCursor = text.slice(0, cursorPos);
    
    // Procura @ mais recente
    const atIndex = textBeforeCursor.lastIndexOf("@");
    
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // Verifica se não tem espaço e não é muito longo
      if (!textAfterAt.includes(" ") && textAfterAt.length <= 30) {
        setMentionQuery(textAfterAt);
        setMentionStartIndex(atIndex);
        setShowSuggestions(true);
        setSelectedIndex(0);
        onChange(getStorageValue());
        return;
      }
    }
    
    setShowSuggestions(false);
    onChange(getStorageValue());
  };

  // Insere menção no lugar do @query
  const insertMention = (userId: string, name: string) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editorRef.current) return;
    
    const range = selection.getRangeAt(0);
    const container = range.startContainer;
    
    if (container.nodeType !== Node.TEXT_NODE) return;
    
    const text = container.textContent || "";
    const cursorPos = range.startOffset;
    const textBeforeCursor = text.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    
    if (atIndex === -1) return;
    
    // Cria o elemento de menção
    const mentionEl = createMentionElement(userId, name);
    
    // Divide o texto
    const beforeAt = text.slice(0, atIndex);
    const afterCursor = text.slice(cursorPos);
    
    // Cria novos nós de texto
    const beforeNode = document.createTextNode(beforeAt);
    const afterNode = document.createTextNode(" " + afterCursor);
    
    // Substitui o nó de texto original
    const parent = container.parentNode;
    if (parent) {
      parent.insertBefore(beforeNode, container);
      parent.insertBefore(mentionEl, container);
      parent.insertBefore(afterNode, container);
      parent.removeChild(container);
      
      // Move cursor para depois da menção
      const newRange = document.createRange();
      newRange.setStart(afterNode, 1);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    
    setShowSuggestions(false);
    setMentionQuery("");
    setMentionStartIndex(null);
    onChange(getStorageValue());
    editorRef.current.focus();
  };

  // Detecta Backspace em tag para deletar atomicamente
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Navegação nas sugestões
    if (showSuggestions && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredMembers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const member = filteredMembers[selectedIndex];
        if (member?.user_id && member?.profile?.full_name) {
          insertMention(member.user_id, member.profile.full_name);
        }
        return;
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        return;
      }
    }

    // Deleção atômica de tags
    if (e.key === "Backspace") {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      
      // Se seleção não está colapsada, deixa comportamento padrão
      if (!range.collapsed) return;
      
      const container = range.startContainer;
      const offset = range.startOffset;
      
      // Se cursor está no início de um nó de texto
      if (container.nodeType === Node.TEXT_NODE && offset === 0) {
        const prevSibling = container.previousSibling;
        if (prevSibling && prevSibling.nodeType === Node.ELEMENT_NODE) {
          const element = prevSibling as HTMLElement;
          if (element.hasAttribute("data-mention-user-id")) {
            e.preventDefault();
            element.remove();
            onChange(getStorageValue());
            return;
          }
        }
      }
      
      // Se cursor está diretamente no editor e há um elemento antes
      if (container === editorRef.current) {
        const childNodes = Array.from(editorRef.current.childNodes);
        if (offset > 0 && childNodes[offset - 1]) {
          const prevNode = childNodes[offset - 1];
          if (prevNode.nodeType === Node.ELEMENT_NODE) {
            const element = prevNode as HTMLElement;
            if (element.hasAttribute("data-mention-user-id")) {
              e.preventDefault();
              element.remove();
              onChange(getStorageValue());
              return;
            }
          }
        }
      }
    }
  };

  // Previne Enter de criar divs
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !showSuggestions) {
      e.preventDefault();
      document.execCommand("insertLineBreak");
    }
  };

  return (
    <div className="relative">
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyPress={handleKeyPress}
        onBlur={() => {
          setIsEmpty(checkIsEmpty());
          // Delay para permitir clique nas sugestões
          setTimeout(() => {
            onBlur?.();
          }, 150);
        }}
        onFocus={() => setIsEmpty(checkIsEmpty())}
        className={cn(
          "min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "overflow-auto",
          className
        )}
      />
      
      {/* Placeholder overlay */}
      {isEmpty && (
        <div 
          className="absolute top-2 left-3 text-sm text-muted-foreground pointer-events-none"
          aria-hidden="true"
        >
          {placeholder}
        </div>
      )}
      
      {showSuggestions && filteredMembers.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filteredMembers.map((member, index) => (
            <button
              key={member.user_id}
              type="button"
              className={cn(
                "w-full flex items-center gap-2 p-2 text-left transition-colors",
                index === selectedIndex ? "bg-accent" : "hover:bg-muted"
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (member.user_id && member.profile?.full_name) {
                  insertMention(member.user_id, member.profile.full_name);
                }
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={member.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {member.profile?.full_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{member.profile?.full_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
