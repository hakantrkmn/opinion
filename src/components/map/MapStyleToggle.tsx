import { Layers, Map, Moon, Sun } from "lucide-react";
import { useState } from "react";

interface MapStyleToggleProps {
  currentStyle: string;
  onStyleChange: (style: string) => void;
  isMobile?: boolean;
}

const styles = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "voyager", label: "Voyager", icon: Map },
] as const;

export const MapStyleToggle = ({
  currentStyle,
  onStyleChange,
  isMobile = false,
}: MapStyleToggleProps) => {
  const [expanded, setExpanded] = useState(false);

  if (isMobile) {
    return (
      <div className="fixed bottom-16 right-4 z-[9999] pb-safe">
        <div className="relative">
          {/* Expanded options */}
          <div
            className={`absolute bottom-full right-0 mb-2 flex flex-col gap-1.5 transition-all duration-200 ${
              expanded
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 translate-y-2 pointer-events-none"
            }`}
          >
            {styles.map((style) => {
              const Icon = style.icon;
              const isActive = currentStyle === style.id;
              return (
                <button
                  key={style.id}
                  onClick={() => {
                    onStyleChange(style.id);
                    setExpanded(false);
                  }}
                  className={`h-10 px-3 rounded-xl backdrop-blur-md border shadow-lg flex items-center gap-2 cursor-pointer transition-all duration-200 active:scale-95 ${
                    isActive
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-background/90 border-border/50 text-foreground hover:border-border"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{style.label}</span>
                </button>
              );
            })}
          </div>

          {/* Toggle button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className={`h-10 w-10 rounded-xl backdrop-blur-md border shadow-lg flex items-center justify-center cursor-pointer transition-all duration-300 active:scale-95 ${
              expanded
                ? "bg-primary/10 border-primary/40 text-primary"
                : "bg-background/90 border-border/50 text-foreground hover:border-border hover:scale-105"
            }`}
            title="Change map style"
          >
            <Layers className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 right-4 z-50">
      <div className="flex rounded-xl overflow-hidden backdrop-blur-md border border-border/50 shadow-lg bg-background/90">
        {styles.map((style, index) => {
          const Icon = style.icon;
          const isActive = currentStyle === style.id;
          return (
            <button
              key={style.id}
              onClick={() => onStyleChange(style.id)}
              className={`flex items-center gap-1.5 px-3 h-8 text-xs font-medium cursor-pointer transition-all duration-200 ${
                index < styles.length - 1 ? "border-r border-border/30" : ""
              } ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
              title={`${style.label} Map Style`}
            >
              <Icon className="h-3 w-3" />
              <span>{style.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
