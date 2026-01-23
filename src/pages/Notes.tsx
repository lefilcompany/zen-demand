import { useState } from "react";
import { useNotes, useCreateNote } from "@/hooks/useNotes";
import { NoteCard } from "@/components/notes/NoteCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, Loader2, LayoutGrid, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Notes() {
  const { data: notes, isLoading } = useNotes();
  const createNote = useCreateNote();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredNotes = notes?.filter(note => 
    note.title.toLowerCase().includes(search.toLowerCase()) ||
    note.content?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleCreateNote = async () => {
    const note = await createNote.mutateAsync({});
    if (note) {
      navigate(`/notes/${note.id}`);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6">
      <PageBreadcrumb 
        items={[
          { label: "Soma Notes", href: "/notes" }
        ]} 
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Soma Notes
          </h1>
          <p className="text-muted-foreground mt-1">
            Crie e organize suas anotações de forma simples
          </p>
        </div>
        
        <Button onClick={handleCreateNote} disabled={createNote.isPending}>
          {createNote.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Nova Nota
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar notas..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center border rounded-lg p-1">
          <Button 
            variant={viewMode === "grid" ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setViewMode("grid")}
            className="h-8 w-8 p-0"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === "list" ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setViewMode("list")}
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className={cn(
          viewMode === "grid" 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" 
            : "space-y-2"
        )}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className={viewMode === "grid" ? "h-48" : "h-20"} />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {search ? "Nenhuma nota encontrada" : "Nenhuma nota ainda"}
          </h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            {search 
              ? "Tente buscar por outros termos" 
              : "Crie sua primeira nota para começar a organizar suas ideias"
            }
          </p>
          {!search && (
            <Button onClick={handleCreateNote} disabled={createNote.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira nota
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <NoteCard 
              key={note.id} 
              note={note} 
              onClick={() => navigate(`/notes/${note.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => navigate(`/notes/${note.id}`)}
              className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <span className="text-2xl">{note.icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{note.title}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  Atualizado {new Date(note.updated_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
