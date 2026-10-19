"use client";

import { authErrorMessage } from "@/features/auth/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/hooks/useSession";
import { authClient } from "@/lib/auth-client";
import { queryKeys } from "@/lib/api/query-keys";
import { formatTimeAgo } from "@/lib/formatters";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Monitor, RotateCcw, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsSection, settingsButton } from "@/features/profile/components/settings/SettingsSection";

function describeAgent(ua: string | null | undefined): { label: string; mobile: boolean } {
  if (!ua) return { label: "Unknown device", mobile: false };
  const mobile = /iphone|android|mobile|expo|okhttp|cfnetwork/i.test(ua);
  const os = /iphone|ipad|ios/i.test(ua)
    ? "iOS"
    : /android/i.test(ua)
      ? "Android"
      : /mac os/i.test(ua)
        ? "macOS"
        : /windows/i.test(ua)
          ? "Windows"
          : /linux/i.test(ua)
            ? "Linux"
            : "";
  const browser = /edg\//i.test(ua)
    ? "Edge"
    : /chrome\//i.test(ua)
      ? "Chrome"
      : /firefox\//i.test(ua)
        ? "Firefox"
        : /safari\//i.test(ua)
          ? "Safari"
          : /expo|okhttp|cfnetwork/i.test(ua)
            ? "droPINion app"
            : "";
  return { label: [browser, os].filter(Boolean).join(" on ") || "Unknown device", mobile };
}

const COLLAPSED_COUNT = 4;

export function SessionsSection() {
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const { session: current } = useSession();

  const sessions = useQuery({
    queryKey: queryKeys.auth.sessions,
    queryFn: async () => {
      const result = await authClient.listSessions();
      if (result.error) throw new Error(authErrorMessage(result.error));
      return [...(result.data ?? [])].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    },
    staleTime: 30_000,
  });

  const revoke = useMutation({
    mutationFn: async (token: string | null) => {
      const result = token
        ? await authClient.revokeSession({ token })
        : await authClient.revokeOtherSessions();
      if (result.error) throw new Error(authErrorMessage(result.error));
    },
    onSuccess: (_d, token) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions });
      toast.success(token ? "Device signed out" : "Signed out of other devices");
    },
    onError: (error) => toast.error("Couldn't sign out that device", { description: error.message }),
  });

  // Current device first, then most recently active.
  const all = sessions.data ?? [];
  const ordered = [...all.filter((s) => s.id === current?.id), ...all.filter((s) => s.id !== current?.id)];
  const list = showAll ? ordered : ordered.slice(0, COLLAPSED_COUNT);
  const hidden = ordered.length - list.length;
  const others = all.filter((s) => s.id !== current?.id);

  return (
    <SettingsSection
      title="Signed-in devices"
      description="Sign out anywhere you don't recognise."
      aside={
        others.length > 1 ? (
          <Button
            variant="outline"
            className={settingsButton}
            onClick={() => revoke.mutate(null)}
            disabled={revoke.isPending}
          >
            {revoke.isPending && revoke.variables === null ? (
              <Loader2 aria-hidden className="animate-spin" />
            ) : null}
            Sign out all others
          </Button>
        ) : null
      }
    >
      {sessions.isLoading ? (
        <ul aria-busy className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <li key={i} className="h-[60px] animate-pulse rounded-xl border border-border/60 bg-muted/30" />
          ))}
        </ul>
      ) : sessions.error ? (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 px-3 py-2.5">
          <p className="text-sm text-destructive">{sessions.error.message}</p>
          <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => void sessions.refetch()}>
            <RotateCcw aria-hidden />
            Retry
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((s) => {
            const agent = describeAgent(s.userAgent);
            const isCurrent = s.id === current?.id;
            const Icon = agent.mobile ? Smartphone : Monitor;
            const pending = revoke.isPending && revoke.variables === s.token;
            return (
              <li
                key={s.id}
                className="flex min-h-[60px] items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon aria-hidden className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span className="truncate">{agent.label}</span>
                    {isCurrent ? (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        This device
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.ipAddress && !/^[0:.]+$/.test(s.ipAddress) ? `${s.ipAddress} · ` : ""}
                    {isCurrent ? "Active now" : `Active ${formatTimeAgo(new Date(s.updatedAt))}`}
                  </p>
                </div>
                {!isCurrent ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 shrink-0 rounded-lg"
                    onClick={() => revoke.mutate(s.token)}
                    disabled={revoke.isPending}
                    aria-label={`Sign out ${agent.label}`}
                  >
                    {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
                    Sign out
                  </Button>
                ) : null}
              </li>
            );
          })}
          {hidden > 0 || showAll ? (
            <li>
              <Button
                variant="ghost"
                className="h-10 w-full rounded-xl text-muted-foreground"
                onClick={() => setShowAll((v) => !v)}
                aria-expanded={showAll}
              >
                {showAll ? "Show fewer" : `Show ${hidden} more`}
              </Button>
            </li>
          ) : null}
        </ul>
      )}
    </SettingsSection>
  );
}
