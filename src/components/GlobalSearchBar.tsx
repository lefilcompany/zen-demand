import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { cn } from "@/lib/utils";

export function GlobalSearchBar() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { currentBoard } = useSelectedBoard();

  const { data: results, isLoading } = useGlobalSearch(query, currentBoard?.id || null);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  const collapse = useCallback(() => {
    setExpanded(false);
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(-1);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        collapse();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [collapse]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      collapse();
      return;
    }

    if (!isOpen || !results || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex].link);
        }
        break;
    }
  };

  // Global Escape to collapse
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && expanded) {
        collapse();
      }
    };
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [expanded, collapse]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const items = resultsRef.current.querySelectorAll("[data-result-item]");
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const handleSelect = (link: string) => {
    navigate(link);
    collapse();
  };

  const toggleExpand = () => {
    if (expanded) {
      collapse();
    } else {
      setExpanded(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const getIcon = (result: { type: string; avatarUrl?: string; title?: string }) => {
    if (result.type === "member" || result.type === "user") {
      const initials = result.title
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?";
      return (
        <Avatar className="h-7 w-7">
          <AvatarImage src={result.avatarUrl} />
          <AvatarFallback className={`text-xs ${result.type === "member" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"}`}>
            {initials}
          </AvatarFallback>
        </Avatar>
      );
    }
    switch (result.type) {
      case "demand":
        return <FileText className="h-4 w-4 text-primary" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "demand":
        return "Demanda";
      case "member":
        return "Membro";
      case "user":
        return "Usuário";
      default:
        return type;
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* Collapsed: just the icon button */}
      {!expanded && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={toggleExpand}
          title="Pesquisar (⌘K)"
        >
          <Search className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Expanded: search input */}
      {expanded && (
        <div className="relative animate-in fade-in slide-in-from-right-2 duration-200">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Pesquisar..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className="pl-8 pr-8 h-7 w-[200px] sm:w-[240px] text-xs bg-muted/50 border-border focus:border-primary focus:bg-background transition-all"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5"
            onClick={collapse}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Results dropdown */}
      {expanded && isOpen && query.length >= 2 && (
        <div className="absolute top-full right-0 mt-2 w-[280px] sm:w-[320px] bg-popover border border-border rounded-lg shadow-xl z-[9999] overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : results && results.length > 0 ? (
            <div ref={resultsRef} className="max-h-[300px] overflow-y-auto">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  data-result-item
                  onClick={() => handleSelect(result.link)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left",
                    selectedIndex === index ? "bg-muted" : "hover:bg-muted/50"
                  )}
                >
                  <div className="shrink-0">{getIcon(result)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
                    {getTypeLabel(result.type)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado para "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
