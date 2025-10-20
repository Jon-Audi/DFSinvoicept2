
"use client";

import React, { createContext, useContext } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme?: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // This provider is a pass-through for now, as next-themes handles the main provider.
  // It's here for structure and potential future expansion.
  return <>{children}</>;
};

export const useTheme = (): ThemeContextType => {
  const { theme, setTheme, resolvedTheme } = useNextTheme();

  return {
    theme: (theme as Theme) || 'system',
    setTheme,
    resolvedTheme: resolvedTheme as "light" | "dark" | undefined,
  };
};
