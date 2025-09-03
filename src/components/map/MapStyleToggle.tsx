import { Button } from "@/components/ui/button";

interface MapStyleToggleProps {
  currentStyle: string;
  onStyleChange: (style: string) => void;
  isMobile?: boolean;
}

export const MapStyleToggle = ({
  currentStyle,
  onStyleChange,
  isMobile = false,
}: MapStyleToggleProps) => {
  if (isMobile) {
    return (
      <div className="absolute bottom-10 right-4 z-50">
        <div className="bg-background rounded-lg shadow-lg border flex">
          <Button
            onClick={() => onStyleChange("light")}
            variant={currentStyle === "light" ? "default" : "ghost"}
            size="sm"
            title="Light Map Style"
            className="text-xs px-3 py-2 h-9 min-w-[40px] rounded-r-none border-r font-medium"
          >
            L
          </Button>

          <Button
            onClick={() => onStyleChange("dark")}
            variant={currentStyle === "dark" ? "default" : "ghost"}
            size="sm"
            title="Dark Map Style"
            className="text-xs px-3 py-2 h-9 min-w-[40px] rounded-none border-r font-medium"
          >
            D
          </Button>

          <Button
            onClick={() => onStyleChange("voyager")}
            variant={currentStyle === "voyager" ? "default" : "ghost"}
            size="sm"
            title="Voyager Map Style"
            className="text-xs px-3 py-2 h-9 min-w-[40px] rounded-l-none font-medium"
          >
            V
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 right-4 z-50">
      <div className="bg-background rounded-lg shadow-lg border flex">
        <Button
          onClick={() => onStyleChange("light")}
          variant={currentStyle === "light" ? "default" : "ghost"}
          size="sm"
          title="Light Map Style"
          className="text-xs px-2 py-1 h-8 rounded-r-none border-r"
        >
          Light
        </Button>

        <Button
          onClick={() => onStyleChange("dark")}
          variant={currentStyle === "dark" ? "default" : "ghost"}
          size="sm"
          title="Dark Map Style"
          className="text-xs px-2 py-1 h-8 rounded-none border-r"
        >
          Dark
        </Button>

        <Button
          onClick={() => onStyleChange("voyager")}
          variant={currentStyle === "voyager" ? "default" : "ghost"}
          size="sm"
          title="Voyager Map Style"
          className="text-xs px-2 py-1 h-8 rounded-l-none"
        >
          Voyager
        </Button>
      </div>
    </div>
  );
};
