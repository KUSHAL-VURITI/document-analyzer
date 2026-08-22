"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div 
        className={`w-8 h-8 rounded-lg border border-[var(--border)] bg-card opacity-50 shrink-0 ${className}`} 
        aria-hidden="true" 
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border)] bg-card text-foreground hover:bg-[var(--muted)] active:scale-90 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--annotation)] cursor-pointer shrink-0 ${className}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-[var(--warning)] transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-[var(--annotation)] transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
