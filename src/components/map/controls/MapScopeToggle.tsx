"use client";

import { cn } from "@/lib/utils";
import type { MapScope } from "@/hooks/map/use-map-scope";
import { Button } from "@/components/ui/button";
import { Users, Globe2 } from "lucide-react";

interface MapScopeToggleProps {
  scope: MapScope;
  onScopeChange: (scope: MapScope) => void;
  disableFollowing?: boolean;
  className?: string;
}

export function MapScopeToggle({
  scope,
  onScopeChange,
  disableFollowing = false,
  className,
}: MapScopeToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-2xl border border-border/50 bg-background/90 p-1 shadow-lg backdrop-blur-md",
        className
      )}
    >
      <Button
        type="button"
        variant={scope === "all" ? "default" : "ghost"}
        size="sm"
        className="h-10 rounded-xl px-3"
        onClick={() => onScopeChange("all")}
      >
        <Globe2 className="h-4 w-4" />
        All
      </Button>
      <Button
        type="button"
        variant={scope === "following" ? "default" : "ghost"}
        size="sm"
        className="h-10 rounded-xl px-3"
        onClick={() => onScopeChange("following")}
        disabled={disableFollowing}
      >
        <Users className="h-4 w-4" />
        Following
      </Button>
    </div>
  );
}
