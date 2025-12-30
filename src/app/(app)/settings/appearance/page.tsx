"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme } from '@/app/providers';
import { useColorTheme } from '@/contexts/color-theme-context';
import { Icon } from '@/components/icons';

type ThemeOption = "light" | "dark" | "system";

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme, themes: colorThemes } = useColorTheme();

  const themeOptions: { value: ThemeOption; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Icon name="Sun" className="mr-2 h-5 w-5" /> },
    { value: "dark", label: "Dark", icon: <Icon name="Moon" className="mr-2 h-5 w-5" /> },
    { value: "system", label: "System", icon: <Icon name="Laptop" className="mr-2 h-5 w-5" /> },
  ];

  return (
    <>
      <PageHeader title="Appearance" description="Customize the look and feel of your application." />

      {/* Dark/Light Mode Theme */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Display Mode</CardTitle>
          <CardDescription>Choose between light, dark, or system theme.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={theme}
            onValueChange={(value: string) => setTheme(value as ThemeOption)}
            className="space-y-2"
          >
            {themeOptions.map((option) => (
              <Label
                key={option.value}
                htmlFor={`theme-${option.value}`}
                className="flex items-center space-x-3 rounded-lg border border-border/40 p-4 transition-all hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 cursor-pointer"
              >
                <RadioGroupItem value={option.value} id={`theme-${option.value}`} />
                {option.icon}
                <span className="font-medium">{option.label}</span>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Color Theme */}
      <Card>
        <CardHeader>
          <CardTitle>Color Theme</CardTitle>
          <CardDescription>Select your preferred color scheme for buttons, links, and accents.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {colorThemes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => setColorTheme(themeOption.value)}
                className={`
                  group relative flex flex-col rounded-xl border-2 p-5 transition-all duration-200 text-left
                  ${colorTheme === themeOption.value
                    ? 'border-primary bg-primary/5 shadow-soft-lg'
                    : 'border-border/60 bg-card hover:border-primary/40 hover:shadow-soft'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-base mb-1">{themeOption.name}</h3>
                    <p className="text-xs text-muted-foreground">{themeOption.description}</p>
                  </div>
                  {colorTheme === themeOption.value && (
                    <div className="bg-primary rounded-full p-1.5">
                      <Icon name="Check" className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* Color Preview */}
                <div className="mt-auto space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div
                        className="h-10 rounded-lg shadow-sm border border-black/10 transition-transform group-hover:scale-105"
                        style={{ backgroundColor: `hsl(${themeOption.colors.primary})` }}
                        title="Primary"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1 text-center">Primary</p>
                    </div>
                    <div className="flex-1">
                      <div
                        className="h-10 rounded-lg shadow-sm border border-black/10 transition-transform group-hover:scale-105"
                        style={{ backgroundColor: `hsl(${themeOption.colors.accent})` }}
                        title="Accent"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1 text-center">Accent</p>
                    </div>
                  </div>

                  {/* Background Preview */}
                  <div>
                    <div
                      className="h-6 rounded-lg shadow-inner border border-black/10"
                      style={{ backgroundColor: `hsl(${themeOption.colors.background})` }}
                      title="Background"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 text-center">Background</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
