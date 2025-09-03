import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

interface ThemeToggleProps {
  isMobile?: boolean;
}

export const ThemeToggle = ({ isMobile = false }: ThemeToggleProps) => {
  const { theme, setTheme } = useTheme();

  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (isMobile) {
    return (
      <Button
        onClick={handleThemeToggle}
        variant="outline"
        size="icon"
        className="shadow-lg flex-shrink-0 !bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
        title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Theme`}
      >
        <span className="text-base">{theme === "dark" ? "☀️" : "🌙"}</span>
      </Button>
    );
  }

  return (
    <Button
      onClick={handleThemeToggle}
      variant="outline"
      size="icon"
      className="shadow-lg h-8 w-8 flex-shrink-0 !bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:scale-105"
      title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Theme`}
    >
      <span className="transition-transform duration-300">
        {theme === "dark" ? "☀️" : "🌙"}
      </span>
    </Button>
  );
};
