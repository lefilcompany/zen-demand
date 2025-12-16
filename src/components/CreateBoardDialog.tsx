import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateBoard } from "@/hooks/useBoards";
import { useSelectedTeam } from "@/contexts/TeamContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  description: z
    .string()
    .trim()
    .max(500, "Descrição deve ter no máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
  monthly_demand_limit: z.coerce
    .number()
    .int("Deve ser um número inteiro")
    .min(0, "Deve ser zero ou maior")
    .default(0),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateBoardDialogProps {
  trigger?: React.ReactNode;
}

export function CreateBoardDialog({ trigger }: CreateBoardDialogProps) {
  const [open, setOpen] = useState(false);
  const { selectedTeamId } = useSelectedTeam();
  const createBoard = useCreateBoard();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      monthly_demand_limit: 0,
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!selectedTeamId) return;

    try {
      await createBoard.mutateAsync({
        team_id: selectedTeamId,
        name: values.name.trim(),
        description: values.description?.trim() || null,
        monthly_demand_limit: values.monthly_demand_limit || 0,
      });
      form.reset();
      setOpen(false);
    } catch (error) {
      // Error handling is done in the hook
      console.error("Erro ao criar quadro:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Quadro
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Quadro</DialogTitle>
          <DialogDescription>
            Crie um novo quadro para organizar suas demandas. Você poderá
            adicionar membros depois.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Quadro</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Marketing, Desenvolvimento..."
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o propósito deste quadro..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="monthly_demand_limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limite Mensal de Demandas</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0 = ilimitado"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Deixe 0 para demandas ilimitadas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createBoard.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createBoard.isPending}>
                {createBoard.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Criar Quadro
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
