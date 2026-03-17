import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface CreateDemandContextType {
  isOpen: boolean;
  openCreateDemand: () => void;
  closeCreateDemand: () => void;
}

const CreateDemandContext = createContext<CreateDemandContextType>({
  isOpen: false,
  openCreateDemand: () => {},
  closeCreateDemand: () => {},
});

export function useCreateDemandModal() {
  return useContext(CreateDemandContext);
}

export function CreateDemandProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openCreateDemand = useCallback(() => setIsOpen(true), []);
  const closeCreateDemand = useCallback(() => setIsOpen(false), []);

  return (
    <CreateDemandContext.Provider value={{ isOpen, openCreateDemand, closeCreateDemand }}>
      {children}
    </CreateDemandContext.Provider>
  );
}
