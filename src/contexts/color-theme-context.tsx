"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type ColorTheme = {
  name: string;
  value: string;
  colors: {
    primary: string;
    accent: string;
    background: string;
  };
};

const colorThemes: ColorTheme[] = [
  {
    name: "Default Green",
    value: "default",
    colors: {
      primary: "120 25% 65%",
      accent: "140 38% 73%",
      background: "210 20% 98%",
    },
  },
  {
    name: "Ocean Blue",
    value: "ocean",
    colors: {
      primary: "210 100% 50%",
      accent: "200 90% 60%",
      background: "210 30% 97%", // Light blue tint
    },
  },
  {
    name: "Sky Blue",
    value: "sky",
    colors: {
      primary: "200 98% 39%", // Sky blue
      accent: "199 89% 48%",
      background: "204 100% 97%", // Very light sky
    },
  },
  {
    name: "Purple Dream",
    value: "purple",
    colors: {
      primary: "270 50% 60%",
      accent: "280 60% 70%",
      background: "270 30% 97%", // Light purple tint
    },
  },
  {
    name: "Violet Night",
    value: "violet",
    colors: {
      primary: "262 83% 58%", // Violet
      accent: "263 70% 50%",
      background: "262 40% 97%", // Light violet
    },
  },
  {
    name: "Sunset Orange",
    value: "sunset",
    colors: {
      primary: "25 95% 53%", // Orange
      accent: "31 97% 72%",
      background: "33 100% 96%", // Warm cream
    },
  },
  {
    name: "Amber Glow",
    value: "amber",
    colors: {
      primary: "38 92% 50%", // Amber
      accent: "43 96% 56%",
      background: "48 100% 96%", // Light amber
    },
  },
  {
    name: "Rose Pink",
    value: "rose",
    colors: {
      primary: "350 80% 60%",
      accent: "340 90% 70%",
      background: "350 40% 97%", // Light rose
    },
  },
  {
    name: "Pink Blossom",
    value: "pink",
    colors: {
      primary: "330 81% 60%", // Pink
      accent: "335 78% 68%",
      background: "327 73% 97%", // Light pink
    },
  },
  {
    name: "Emerald Fresh",
    value: "emerald",
    colors: {
      primary: "160 84% 39%", // Emerald
      accent: "158 64% 52%",
      background: "152 60% 97%", // Light emerald
    },
  },
  {
    name: "Teal Wave",
    value: "teal",
    colors: {
      primary: "173 80% 40%", // Teal
      accent: "172 66% 50%",
      background: "180 70% 97%", // Light teal
    },
  },
  {
    name: "Slate Gray",
    value: "slate",
    colors: {
      primary: "215 20% 45%",
      accent: "215 15% 55%",
      background: "210 20% 98%", // Neutral slate
    },
  },
  {
    name: "Zinc Cool",
    value: "zinc",
    colors: {
      primary: "240 5% 34%", // Zinc
      accent: "240 5% 65%",
      background: "240 10% 97%", // Cool gray
    },
  },
  {
    name: "Stone Warm",
    value: "stone",
    colors: {
      primary: "25 5% 45%", // Stone
      accent: "33 5% 65%",
      background: "60 9% 97%", // Warm beige
    },
  },
  {
    name: "Red Alert",
    value: "red",
    colors: {
      primary: "0 84% 60%", // Red
      accent: "0 72% 51%",
      background: "0 40% 97%", // Light red tint
    },
  },
  {
    name: "Indigo Deep",
    value: "indigo",
    colors: {
      primary: "239 84% 67%", // Indigo
      accent: "243 75% 59%",
      background: "226 64% 97%", // Light indigo
    },
  },
  {
    name: "Midnight Blue",
    value: "midnight",
    colors: {
      primary: "220 90% 56%", // Deep blue
      accent: "200 100% 60%",
      background: "220 40% 96%", // Cool blue-gray
    },
  },
  {
    name: "Deep Purple",
    value: "deep-purple",
    colors: {
      primary: "265 85% 58%", // Rich purple
      accent: "280 75% 65%",
      background: "265 30% 96%", // Subtle purple
    },
  },
  {
    name: "Forest Green",
    value: "forest",
    colors: {
      primary: "150 65% 42%", // Deep forest green
      accent: "160 55% 50%",
      background: "150 25% 97%", // Light forest tint
    },
  },
  {
    name: "Crimson",
    value: "crimson",
    colors: {
      primary: "348 90% 50%", // Deep red
      accent: "355 85% 60%",
      background: "350 35% 97%", // Light crimson
    },
  },
  {
    name: "Navy",
    value: "navy",
    colors: {
      primary: "215 100% 45%", // Navy blue
      accent: "210 90% 55%",
      background: "215 30% 97%", // Light navy
    },
  },
  {
    name: "Plum",
    value: "plum",
    colors: {
      primary: "300 55% 48%", // Deep plum
      accent: "310 60% 58%",
      background: "300 25% 97%", // Light plum
    },
  },
  {
    name: "Bronze",
    value: "bronze",
    colors: {
      primary: "30 65% 45%", // Rich bronze
      accent: "35 70% 55%",
      background: "30 30% 96%", // Warm bronze tint
    },
  },
  {
    name: "Teal Deep",
    value: "teal-deep",
    colors: {
      primary: "175 90% 38%", // Deep teal
      accent: "180 80% 48%",
      background: "175 35% 97%", // Light teal
    },
  },
];

interface ColorThemeContextType {
  colorTheme: string;
  setColorTheme: (theme: string) => void;
  themes: ColorTheme[];
}

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined);

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState("default");

  const applyColorTheme = (themeValue: string) => {
    const selectedTheme = colorThemes.find(t => t.value === themeValue);
    if (selectedTheme) {
      const root = document.documentElement;
      const isDark = root.classList.contains('dark');

      // Parse HSL values and adjust for dark mode
      const parsedBg = selectedTheme.colors.background.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
      let background = selectedTheme.colors.background;

      if (isDark && parsedBg) {
        // In dark mode, use low lightness (20-25%) instead of high (96-98%)
        const hue = parsedBg[1];
        const saturation = parsedBg[2];
        background = `${hue} ${Math.min(15, parseInt(saturation))}% 20%`;
      }

      // Set CSS variables with !important to override dark mode
      const style = root.style;
      style.setProperty('--primary', selectedTheme.colors.primary, 'important');
      style.setProperty('--accent', selectedTheme.colors.accent, 'important');
      style.setProperty('--background', background, 'important');
      style.setProperty('--ring', selectedTheme.colors.primary, 'important');

      console.log('Applied theme:', themeValue, { original: selectedTheme.colors, applied: background, isDark });
    }
  };

  // Load and apply theme on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedTheme = localStorage.getItem('colorTheme') || 'default';
    setColorThemeState(savedTheme);
    applyColorTheme(savedTheme);
  }, []);

  // Watch for dark mode changes and reapply current theme
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new MutationObserver(() => {
      applyColorTheme(colorTheme);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, [colorTheme]);

  const setColorTheme = (theme: string) => {
    setColorThemeState(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('colorTheme', theme);
    }
    applyColorTheme(theme);

    // Force a repaint to ensure CSS changes take effect
    if (typeof window !== 'undefined' && document.body) {
      document.body.style.display = 'none';
      document.body.offsetHeight; // Trigger reflow
      document.body.style.display = '';
    }
  };

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme, themes: colorThemes }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme() {
  const context = useContext(ColorThemeContext);
  if (context === undefined) {
    throw new Error('useColorTheme must be used within a ColorThemeProvider');
  }
  return context;
}
