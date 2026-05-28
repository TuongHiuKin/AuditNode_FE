import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";

interface HeaderContextType {
  title: string;
  subtitle: string;
  icon: ReactNode | null;
  setHeader: (title: string, subtitle: string, icon: ReactNode | null) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [headerState, setHeaderState] = useState<{
    title: string;
    subtitle: string;
    icon: ReactNode | null;
  }>({
    title: "",
    subtitle: "",
    icon: null,
  });

  const setHeader = useCallback((title: string, subtitle: string, icon: ReactNode | null) => {
    setHeaderState(prev => {
      // Prevent unnecessary state updates if values are the same
      if (prev.title === title && prev.subtitle === subtitle && prev.icon === icon) {
        return prev;
      }
      return { title, subtitle, icon };
    });
  }, []);

  const value = useMemo(() => ({
    ...headerState,
    setHeader
  }), [headerState, setHeader]);

  return (
    <HeaderContext.Provider value={value}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error("useHeader must be used within a HeaderProvider");
  }
  return context;
}

