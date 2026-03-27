import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  isMobile?: boolean;
}

export const ThemeToggle = ({ isMobile = false }: ThemeToggleProps) => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const handleThemeToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const size = isMobile ? "h-10 w-10" : "h-9 w-9";

  return (
    <button
      onClick={handleThemeToggle}
      className={`${size} rounded-xl bg-background/90 backdrop-blur-md border border-border/50 shadow-lg flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-border active:scale-95`}
      title={`Switch to ${isDark ? "Light" : "Dark"} Theme`}
    >
      <div className="relative w-4 h-4">
        <Sun
          className={`absolute inset-0 h-4 w-4 text-amber-500 transition-all duration-300 ${
            isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
          }`}
        />
        <Moon
          className={`absolute inset-0 h-4 w-4 text-indigo-400 transition-all duration-300 ${
            isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
          }`}
        />
      </div>
    </button>
  );
};
