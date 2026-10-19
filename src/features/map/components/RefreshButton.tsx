"use client";

import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { mapControl } from "./control-styles";

export function RefreshButton({ fetching }: { fetching: boolean }) {
  const queryClient = useQueryClient();
  return (
    <button
      type="button"
      onClick={() =>
        void queryClient.invalidateQueries({ queryKey: queryKeys.pins.all })
      }
      disabled={fetching}
      className={mapControl}
      aria-label="Refresh pins"
      title="Refresh pins"
    >
      <RefreshCw className={cn("h-4 w-4", fetching && "animate-spin")} />
    </button>
  );
}
