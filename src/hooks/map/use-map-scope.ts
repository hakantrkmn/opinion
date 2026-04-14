"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export type MapScope = "all" | "following";

export function useMapScope() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const scope = useMemo<MapScope>(() => {
    const current = searchParams.get("scope");
    return current === "following" ? "following" : "all";
  }, [searchParams]);

  const setScope = useCallback(
    (nextScope: MapScope) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextScope === "all") params.delete("scope");
      else params.set("scope", nextScope);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  return { scope, setScope };
}
