import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, Loader2, X, Hash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { cn } from "@/lib/utils";

const priorityColors: Record<string, string> = {
  alta: "text-destructive",
  urgente: "text-destructive",
  média: "text-amber-500",
  baixa: "text-muted-foreground",
};

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

  const getIcon = (result: { type: string; avatarUrl?: string; title?: string; statusColor?: string }) => {
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
    if (result.type === "demand") {
      return (
        <div
          className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
          style={{
            backgroundColor: result.statusColor ? `${result.statusColor}20` : undefined,
          }}
        >
          <FileText
            className="h-3.5 w-3.5"
            style={{ color: result.statusColor || undefined }}
          />
        </div>
      );
    }
    return <Search className="h-4 w-4" />;
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

  // Group results by type for a cleaner display
  const demandResults = results?.filter(r => r.type === "demand") || [];
  const peopleResults = results?.filter(r => r.type === "member" || r.type === "user") || [];

  const renderResultItem = (result: typeof results extends (infer T)[] | undefined ? T : never, globalIndex: number) => (
    <button
      key={`${result.type}-${result.id}`}
      data-result-item
      onClick={() => handleSelect(result.link)}
      onMouseEnter={() => setSelectedIndex(globalIndex)}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left",
        selectedIndex === globalIndex ? "bg-muted" : "hover:bg-muted/50"
      )}
    >
      <div className="shrink-0">{getIcon(result)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{result.title}</p>
        {result.subtitle && (
          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
        )}
        {result.extra && (
          <p className="text-[10px] text-muted-foreground/70 truncate">{result.extra}</p>
        )}
      </div>
      {result.priority && (
        <span className={cn("text-[10px] font-medium capitalize shrink-0", priorityColors[result.priority] || "text-muted-foreground")}>
          {result.priority}
        </span>
      )}
    </button>
  );

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* Collapsed: just the icon button */}
      {!expanded && (
        <Button
          variant="ghost"
          className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={toggleExpand}
          title="Pesquisar (⌘K)"
        >
          <Search className="h-3.5 w-3.5" />
          <kbd className="pointer-events-none inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
            Ctrl K
          </kbd>
        </Button>
      )}

      {/* Expanded: search input */}
      {expanded && (
        <div className="relative animate-in fade-in slide-in-from-right-2 duration-200">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Buscar demandas, membros..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className="pl-8 pr-8 h-7 w-[200px] sm:w-[260px] text-xs bg-muted/50 border-border focus:border-primary focus:bg-background transition-all"
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
        <div className="absolute top-full right-0 mt-2 w-[300px] sm:w-[360px] bg-popover border border-border rounded-lg shadow-xl z-[9999] overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : results && results.length > 0 ? (
            <div ref={resultsRef} className="max-h-[380px] overflow-y-auto">
              {/* Demands section */}
              {demandResults.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 border-b border-border/50 flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    Demandas ({demandResults.length})
                  </div>
                  {demandResults.map((result, i) => renderResultItem(result, i))}
                </>
              )}
              
              {/* People section */}
              {peopleResults.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 border-b border-border/50 border-t flex items-center gap-1.5">
                    <Search className="h-3 w-3" />
                    Pessoas ({peopleResults.length})
                  </div>
                  {peopleResults.map((result, i) => renderResultItem(result, demandResults.length + i))}
                </>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado para "{query}"
            </div>
          )}
          
          {/* Search tip */}
          <div className="px-3 py-1.5 border-t border-border/50 bg-muted/20">
            <p className="text-[10px] text-muted-foreground">
              <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">↑↓</kbd> navegar · <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Enter</kbd> abrir · <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Esc</kbd> fechar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
