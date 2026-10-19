"use client";

import { useState } from "react";
import { Bell, BellOff, Loader2, Send, Smartphone, Users as UsersIcon, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAdminUsers, useRecentNotifications } from "@/features/admin/hooks/use-admin";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSendNotification } from "@/features/admin/hooks/use-admin-mutations";
import type { AdminUser, ConfirmState } from "@/features/admin/components/types";
import { formatDate } from "@/features/admin/components/utils";
import { cn } from "@/lib/utils";

interface NotificationsPanelProps {
  setConfirm: (c: ConfirmState | null) => void;
}

type Mode = "single" | "all";

export function NotificationsPanel({ setConfirm }: NotificationsPanelProps) {
  const [mode, setMode] = useState<Mode>("single");
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dataJson, setDataJson] = useState("");
  const [dataError, setDataError] = useState<string | null>(null);

  const recentQuery = useRecentNotifications();
  const recent = recentQuery.items;
  const recentLoading = recentQuery.isLoading;
  const sendMutation = useSendNotification();

  const debouncedUserQuery = useDebouncedValue(userQuery, 300);
  const usersQuery = useAdminUsers(debouncedUserQuery, mode === "single" && !selectedUser);
  const filteredUsers = usersQuery.items.filter((u) => !u.deleted_at).slice(0, 8);

  const canSend =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (mode === "all" || selectedUser !== null) &&
    !sendMutation.isPending;

  const reset = () => {
    setTitle("");
    setBody("");
    setDataJson("");
    setDataError(null);
    setSelectedUser(null);
    setUserQuery("");
  };

  const handleSubmit = () => {
    let parsedData: Record<string, unknown> | undefined;
    if (dataJson.trim()) {
      try {
        const parsed = JSON.parse(dataJson);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          setDataError("The payload must be a JSON object, like {\"key\": \"value\"}.");
          return;
        }
        parsedData = parsed as Record<string, unknown>;
      } catch {
        setDataError("That isn't valid JSON.");
        return;
      }
    }
    setDataError(null);

    const doSend = () => {
      sendMutation.mutate(
        {
          target:
            mode === "all"
              ? { type: "all" }
              : { type: "user", user_id: selectedUser!.id },
          title: title.trim(),
          body: body.trim(),
          data: parsedData,
        },
        { onSuccess: () => reset() }
      );
    };

    if (mode === "all") {
      setConfirm({
        title: "Send to everyone?",
        description: `"${title.trim()}" goes to every active device right away. Check the text first: a sent push can't be recalled.`,
        confirmLabel: "Send broadcast",
        onConfirm: () => {
          setConfirm(null);
          doSend();
        },
      });
    } else {
      doSend();
    }
  };

  const segment = (active: boolean) =>
    cn(
      "flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:size-4",
      active ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
    );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <form
        className="flex flex-col gap-5 rounded-2xl border border-border/60 bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) handleSubmit();
        }}
      >
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Bell aria-hidden className="size-4 text-muted-foreground" />
          Compose push notification
        </h2>

        <div className="flex flex-col gap-2">
          <span id="notif-target" className="text-sm font-medium">
            Send to
          </span>
          <div role="radiogroup" aria-labelledby="notif-target" className="grid grid-cols-2 gap-1 rounded-xl bg-muted/70 p-1">
            <button type="button" role="radio" aria-checked={mode === "single"} onClick={() => setMode("single")} className={segment(mode === "single")}>
              <UserIcon aria-hidden /> One member
            </button>
            <button type="button" role="radio" aria-checked={mode === "all"} onClick={() => setMode("all")} className={segment(mode === "all")}>
              <UsersIcon aria-hidden /> Everyone
            </button>
          </div>
        </div>

        {mode === "single" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="notif-user-search">Member</Label>
            {selectedUser ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{selectedUser.display_name || selectedUser.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{selectedUser.email}</p>
                  {selectedUser.active_push_tokens === 0 ? (
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive">
                      <BellOff aria-hidden className="size-3" /> No active devices, so nothing will be delivered
                    </p>
                  ) : (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Smartphone aria-hidden className="size-3" /> {selectedUser.active_push_tokens}{" "}
                      {selectedUser.active_push_tokens === 1 ? "device" : "devices"}
                    </p>
                  )}
                </div>
                <Button type="button" variant="ghost" size="sm" className="rounded-lg" onClick={() => setSelectedUser(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <Input
                  id="notif-user-search"
                  type="search"
                  placeholder="Search by name or email…"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  autoComplete="off"
                  className="h-10 rounded-xl"
                />
                <div className="max-h-52 overflow-y-auto overscroll-contain rounded-xl border border-border/60">
                  {usersQuery.isLoading ? (
                    <p className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                      <Loader2 aria-hidden className="size-3 animate-spin" /> Searching…
                    </p>
                  ) : filteredUsers.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-muted-foreground">No members match.</p>
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {filteredUsers.map((u) => {
                        const hasToken = u.active_push_tokens > 0;
                        return (
                          <li key={u.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedUser(u)}
                              className="flex min-h-12 w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm outline-none transition-colors duration-150 hover:bg-muted/50 focus-visible:bg-muted/50"
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-medium">{u.display_name || u.email}</span>
                                <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                              </span>
                              {hasToken ? (
                                <span className="flex flex-none items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                  <Smartphone aria-hidden className="size-3" /> {u.active_push_tokens}
                                  <span className="sr-only"> devices</span>
                                </span>
                              ) : (
                                <span className="flex flex-none items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                  <BellOff aria-hidden className="size-3" /> None
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="notif-title">Title</Label>
            <span className="text-xs tabular-nums text-muted-foreground">{title.length}/100</span>
          </div>
          <Input
            id="notif-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="New pins near you"
            className="h-10 rounded-xl"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="notif-body">Message</Label>
            <span className="text-xs tabular-nums text-muted-foreground">{body.length}/500</span>
          </div>
          <Textarea
            id="notif-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="What should people know?"
            className="rounded-xl"
          />
        </div>

        <details className="group rounded-xl border border-border/60 px-3 py-2.5">
          <summary className="cursor-pointer select-none text-sm text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
            Advanced: data payload (JSON)
          </summary>
          <Label htmlFor="notif-data" className="sr-only">
            Data payload JSON
          </Label>
          <Textarea
            id="notif-data"
            value={dataJson}
            onChange={(e) => {
              setDataJson(e.target.value);
              setDataError(null);
            }}
            rows={3}
            spellCheck={false}
            aria-invalid={dataError ? true : undefined}
            aria-describedby={dataError ? "notif-data-error" : undefined}
            className="mt-2 rounded-xl font-mono text-xs"
            placeholder='{"pin_id": "…"}'
          />
          {dataError ? (
            <p id="notif-data-error" className="mt-1.5 text-xs font-medium text-destructive">
              {dataError}
            </p>
          ) : null}
        </details>

        <Button type="submit" disabled={!canSend} className="h-11 w-full rounded-xl">
          {sendMutation.isPending ? <Loader2 aria-hidden className="animate-spin" /> : <Send aria-hidden />}
          {sendMutation.isPending ? "Sending…" : mode === "all" ? "Send to everyone" : "Send notification"}
        </Button>
      </form>

      <section aria-labelledby="recent-sends" className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 id="recent-sends" className="text-base font-semibold">
            Recent sends
          </h2>
          {recentLoading ? <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" /> : null}
        </div>
        {!recentLoading && recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No notifications sent yet.</p>
        ) : null}
        <ul className="flex flex-col gap-2">
          {recent.map((row) => {
            const result = row.result;
            return (
              <li key={row.id} className="rounded-xl border border-border/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.title || "(untitled)"}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{row.body}</p>
                  </div>
                  <Badge variant="secondary" className="flex-none text-[11px] font-medium">
                    {row.target_type === "broadcast" ? "Everyone" : "One member"}
                  </Badge>
                </div>
                <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs tabular-nums text-muted-foreground">
                  <span>{result?.sent ?? 0} sent</span>
                  <span aria-hidden>·</span>
                  <span className={(result?.failed ?? 0) > 0 ? "text-destructive" : undefined}>
                    {result?.failed ?? 0} failed
                  </span>
                  {(result?.deactivated ?? 0) > 0 ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{result?.deactivated} stale removed</span>
                    </>
                  ) : null}
                  <span aria-hidden>·</span>
                  <span>{formatDate(row.created_at)}</span>
                  {row.actor_email ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="truncate">{row.actor_email}</span>
                    </>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ul>
        {recentQuery.hasNextPage ? (
          <Button
            variant="ghost"
            className="h-10 w-full rounded-xl text-muted-foreground"
            onClick={() => void recentQuery.fetchNextPage()}
            disabled={recentQuery.isFetchingNextPage}
          >
            {recentQuery.isFetchingNextPage ? <Loader2 aria-hidden className="animate-spin" /> : null}
            Load more
          </Button>
        ) : null}
      </section>
    </div>
  );
}
