"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type ColorTheme = {
  name: string;
  value: string;
  description: string;
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
    description: "The default muted green theme",
    colors: {
      primary: "120 25% 65%",
      accent: "140 38% 73%",
      background: "210 20% 98%",
    },
  },
  {
    name: "Ocean Blue",
    value: "ocean",
    description: "Deep ocean blue tones",
    colors: {
      primary: "210 100% 50%",
      accent: "200 90% 60%",
      background: "210 30% 97%",
    },
  },
  {
    name: "Sky Blue",
    value: "sky",
    description: "Light and airy sky blue",
    colors: {
      primary: "200 98% 39%",
      accent: "199 89% 48%",
      background: "204 100% 97%",
    },
  },
  {
    name: "Purple Dream",
    value: "purple",
    description: "Soft, dreamy purple hues",
    colors: {
      primary: "270 50% 60%",
      accent: "280 60% 70%",
      background: "270 30% 97%",
    },
  },
  {
    name: "Violet Night",
    value: "violet",
    description: "Rich, bold violet accent",
    colors: {
      primary: "262 83% 58%",
      accent: "263 70% 50%",
      background: "262 40% 97%",
    },
  },
  {
    name: "Sunset Orange",
    value: "sunset",
    description: "Warm sunset orange and cream",
    colors: {
      primary: "25 95% 53%",
      accent: "31 97% 72%",
      background: "33 100% 96%",
    },
  },
  {
    name: "Amber Glow",
    value: "amber",
    description: "Golden amber warmth",
    colors: {
      primary: "38 92% 50%",
      accent: "43 96% 56%",
      background: "48 100% 96%",
    },
  },
  {
    name: "Rose Pink",
    value: "rose",
    description: "Elegant rose and blush tones",
    colors: {
      primary: "350 80% 60%",
      accent: "340 90% 70%",
      background: "350 40% 97%",
    },
  },
  {
    name: "Pink Blossom",
    value: "pink",
    description: "Soft pink cherry blossom",
    colors: {
      primary: "330 81% 60%",
      accent: "335 78% 68%",
      background: "327 73% 97%",
    },
  },
  {
    name: "Emerald Fresh",
    value: "emerald",
    description: "Vibrant fresh emerald green",
    colors: {
      primary: "160 84% 39%",
      accent: "158 64% 52%",
      background: "152 60% 97%",
    },
  },
  {
    name: "Teal Wave",
    value: "teal",
    description: "Refreshing teal and aqua",
    colors: {
      primary: "173 80% 40%",
      accent: "172 66% 50%",
      background: "180 70% 97%",
    },
  },
  {
    name: "Slate Gray",
    value: "slate",
    description: "Professional neutral slate",
    colors: {
      primary: "215 20% 45%",
      accent: "215 15% 55%",
      background: "210 20% 98%",
    },
  },
  {
    name: "Zinc Cool",
    value: "zinc",
    description: "Minimalist cool gray zinc",
    colors: {
      primary: "240 5% 34%",
      accent: "240 5% 65%",
      background: "240 10% 97%",
    },
  },
  {
    name: "Stone Warm",
    value: "stone",
    description: "Warm earthy stone and beige",
    colors: {
      primary: "25 5% 45%",
      accent: "33 5% 65%",
      background: "60 9% 97%",
    },
  },
  {
    name: "Red Alert",
    value: "red",
    description: "Bold, high-contrast red",
    colors: {
      primary: "0 84% 60%",
      accent: "0 72% 51%",
      background: "0 40% 97%",
    },
  },
  {
    name: "Indigo Deep",
    value: "indigo",
    description: "Classic deep indigo blue",
    colors: {
      primary: "239 84% 67%",
      accent: "243 75% 59%",
      background: "226 64% 97%",
    },
  },
  {
    name: "Midnight Blue",
    value: "midnight",
    description: "Sophisticated midnight blue",
    colors: {
      primary: "220 90% 56%",
      accent: "200 100% 60%",
      background: "220 40% 96%",
    },
  },
  {
    name: "Deep Purple",
    value: "deep-purple",
    description: "Rich, saturated deep purple",
    colors: {
      primary: "265 85% 58%",
      accent: "280 75% 65%",
      background: "265 30% 96%",
    },
  },
  {
    name: "Forest Green",
    value: "forest",
    description: "Deep, earthy forest green",
    colors: {
      primary: "150 65% 42%",
      accent: "160 55% 50%",
      background: "150 25% 97%",
    },
  },
  {
    name: "Crimson",
    value: "crimson",
    description: "Deep crimson and berry red",
    colors: {
      primary: "348 90% 50%",
      accent: "355 85% 60%",
      background: "350 35% 97%",
    },
  },
  {
    name: "Navy",
    value: "navy",
    description: "Classic nautical navy blue",
    colors: {
      primary: "215 100% 45%",
      accent: "210 90% 55%",
      background: "215 30% 97%",
    },
  },
  {
    name: "Plum",
    value: "plum",
    description: "Luxurious deep plum purple",
    colors: {
      primary: "300 55% 48%",
      accent: "310 60% 58%",
      background: "300 25% 97%",
    },
  },
  {
    name: "Bronze",
    value: "bronze",
    description: "Warm metallic bronze tones",
    colors: {
      primary: "30 65% 45%",
      accent: "35 70% 55%",
      background: "30 30% 96%",
    },
  },
  {
    name: "Teal Deep",
    value: "teal-deep",
    description: "Bold, deep teal and cyan",
    colors: {
      primary: "175 90% 38%",
      accent: "180 80% 48%",
      background: "175 35% 97%",
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
  const [isInitialized, setIsInitialized] = useState(false);

  // Load theme on mount only
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialized) return;

    const savedTheme = localStorage.getItem('colorTheme') || 'default';
    setColorThemeState(savedTheme);
    setIsInitialized(true);
  }, [isInitialized]);

  // Apply theme whenever colorTheme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialized) return;

    const selectedTheme = colorThemes.find(t => t.value === colorTheme);
    if (!selectedTheme) return;

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

    // Set CSS variables
    const style = root.style;
    style.setProperty('--primary', selectedTheme.colors.primary, 'important');
    style.setProperty('--accent', selectedTheme.colors.accent, 'important');
    style.setProperty('--background', background, 'important');
    style.setProperty('--ring', selectedTheme.colors.primary, 'important');
  }, [colorTheme, isInitialized]);

  // Watch for dark mode changes and trigger re-apply
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialized) return;

    const observer = new MutationObserver((mutations) => {
      const classChanged = mutations.some(
        mutation => mutation.attributeName === 'class'
      );

      if (classChanged) {
        // Force re-render by setting the same theme value
        setColorThemeState(prev => prev);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, [isInitialized]);

  const setColorTheme = (theme: string) => {
    setColorThemeState(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('colorTheme', theme);
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
