import { useState, useRef, useEffect } from "react";
import { Tag, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface NoteTagManagerProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function NoteTagManager({ tags, onTagsChange }: NoteTagManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleAddTag = () => {
    const trimmedTag = newTag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className={cn(
            "relative",
            tags.length > 0 && "text-primary"
          )}
        >
          <Tag className="h-4 w-4" />
          {tags.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-medium">
              {tags.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 bg-background border shadow-lg z-50" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Tags</h4>
            <span className="text-xs text-muted-foreground">{tags.length} tag(s)</span>
          </div>
          
          {/* Tag Input */}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nova tag..."
              className="h-8 text-sm"
              maxLength={30}
            />
            <Button 
              size="sm" 
              className="h-8 px-2"
              onClick={handleAddTag}
              disabled={!newTag.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Tags List */}
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="pl-2 pr-1 py-0.5 gap-1 text-xs font-normal group hover:bg-destructive/10"
                >
                  <span className="truncate max-w-[120px]">{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 transition-colors"
                  >
                    <X className="h-3 w-3 text-muted-foreground group-hover:text-destructive" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              Nenhuma tag adicionada
            </p>
          )}
          
          {/* Hint */}
          <p className="text-[10px] text-muted-foreground border-t pt-2">
            Pressione Enter para adicionar
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
