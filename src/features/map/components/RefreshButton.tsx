"use client";

import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { mapControl } from "./control-styles";

export function RefreshButton({ fetching }: { fetching: boolean }) {
  const t = useTranslations("map");
  const queryClient = useQueryClient();
  return (
    <button
      type="button"
      onClick={() =>
        void queryClient.invalidateQueries({ queryKey: queryKeys.pins.all })
      }
      disabled={fetching}
      className={mapControl}
      aria-label={t("refresh")}
      title={t("refresh")}
    >
      <RefreshCw className={cn("h-4 w-4", fetching && "animate-spin")} />
    </button>
  );
}
