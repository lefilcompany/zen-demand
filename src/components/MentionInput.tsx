import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useBoardMembers } from "@/hooks/useBoardMembers";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  boardId: string;
  placeholder?: string;
  className?: string;
  onBlur?: () => void;
}

export function MentionInput({ value, onChange, boardId, placeholder, className, onBlur }: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { data: members } = useBoardMembers(boardId);

  const filteredMembers = members?.filter((m) =>
    m.profile?.full_name?.toLowerCase().includes(mentionQuery.toLowerCase())
  ) || [];

  useEffect(() => {
    const handleClick = () => setShowSuggestions(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart || 0;
    setCursorPosition(cursor);
    onChange(newValue);

    // Check for @ mention
    const textBeforeCursor = newValue.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      if (!textAfterAt.includes(" ") && textAfterAt.length <= 20) {
        setMentionQuery(textAfterAt);
        setShowSuggestions(true);
        return;
      }
    }
    
    setShowSuggestions(false);
  };

  const insertMention = (name: string) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    const beforeAt = value.slice(0, atIndex);
    const afterCursor = value.slice(cursorPosition);
    
    const newValue = `${beforeAt}@${name.replace(/\s+/g, "_")} ${afterCursor}`;
    onChange(newValue);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={className}
      />
      
      {showSuggestions && filteredMembers.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filteredMembers.map((member) => (
            <button
              key={member.user_id}
              type="button"
              className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left"
              onClick={(e) => {
                e.stopPropagation();
                insertMention(member.profile?.full_name || "");
              }}
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
