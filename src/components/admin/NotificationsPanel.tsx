"use client";

import { useMemo, useState } from "react";
import { Bell, Loader2, Send, Users as UsersIcon, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useRecentNotifications } from "@/hooks/queries/use-admin";
import { useSendNotification } from "@/hooks/mutations/use-admin-mutations";
import type { AdminUser, ConfirmState } from "./types";
import { formatDate } from "./utils";

interface NotificationsPanelProps {
  users: AdminUser[];
  setConfirm: (c: ConfirmState | null) => void;
}

type Mode = "single" | "all";

export function NotificationsPanel({ users, setConfirm }: NotificationsPanelProps) {
  const [mode, setMode] = useState<Mode>("single");
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dataJson, setDataJson] = useState("");
  const [dataError, setDataError] = useState<string | null>(null);

  const { data: recent, isLoading: recentLoading } = useRecentNotifications();
  const sendMutation = useSendNotification();

  const filteredUsers = useMemo(() => {
    if (!userQuery.trim()) return users.slice(0, 8);
    const q = userQuery.toLowerCase();
    return users
      .filter((u) =>
        [u.email, u.displayName, u.name]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [users, userQuery]);

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
          setDataError("Data must be a JSON object");
          return;
        }
        parsedData = parsed as Record<string, unknown>;
      } catch {
        setDataError("Invalid JSON");
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
              : { type: "user", userId: selectedUser!.id },
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
        description: `This will deliver a push to every active device. Make sure the message is correct — there is no undo.`,
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
      <div className="space-y-5 rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Compose notification</h3>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Target
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                mode === "single"
                  ? "border-foreground bg-foreground/5"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              <UserIcon className="h-4 w-4" /> Single user
            </button>
            <button
              type="button"
              onClick={() => setMode("all")}
              className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                mode === "all"
                  ? "border-foreground bg-foreground/5"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              <UsersIcon className="h-4 w-4" /> Everyone
            </button>
          </div>
        </div>

        {mode === "single" && (
          <div className="space-y-2">
            <Label htmlFor="user-search" className="text-xs uppercase tracking-wide text-muted-foreground">
              User
            </Label>
            {selectedUser ? (
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {selectedUser.displayName || selectedUser.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{selectedUser.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                >
                  Change
                </Button>
              </div>
            ) : (
              <>
                <Input
                  id="user-search"
                  placeholder="Search by name or email…"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                />
                <div className="max-h-44 overflow-y-auto rounded-md border border-border">
                  {filteredUsers.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {filteredUsers.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedUser(u)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted/40"
                          >
                            <span className="block truncate font-medium">
                              {u.displayName || u.email}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {u.email}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="notif-title" className="text-xs uppercase tracking-wide text-muted-foreground">
            Title
          </Label>
          <Input
            id="notif-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="Hello!"
          />
          <p className="text-right text-[10px] text-muted-foreground">{title.length}/100</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notif-body" className="text-xs uppercase tracking-wide text-muted-foreground">
            Body
          </Label>
          <Textarea
            id="notif-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Your message…"
          />
          <p className="text-right text-[10px] text-muted-foreground">{body.length}/500</p>
        </div>

        <details className="rounded-md border border-border px-3 py-2">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Advanced: data payload (JSON)
          </summary>
          <Textarea
            value={dataJson}
            onChange={(e) => {
              setDataJson(e.target.value);
              setDataError(null);
            }}
            rows={3}
            className="mt-2 font-mono text-xs"
            placeholder='{"key": "value"}'
          />
          {dataError && <p className="mt-1 text-xs text-destructive">{dataError}</p>}
        </details>

        <Button
          onClick={handleSubmit}
          disabled={!canSend}
          className="w-full"
        >
          {sendMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {mode === "all" ? "Send to everyone" : "Send notification"}
        </Button>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent sends</h3>
          {recentLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        {!recentLoading && (recent?.data?.length ?? 0) === 0 && (
          <p className="text-xs text-muted-foreground">No notifications sent yet.</p>
        )}
        <ul className="space-y-3">
          {recent?.data?.map((row) => {
            const meta = row.metadata ?? {};
            return (
              <li key={row.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {meta.title || "(untitled)"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {meta.body}
                    </p>
                  </div>
                  <Badge variant="secondary" className="flex-none text-[10px]">
                    {row.targetType === "broadcast" ? "all" : "user"}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span>Sent {meta.sent ?? 0}</span>
                  <span>Failed {meta.failed ?? 0}</span>
                  {(meta.deactivated ?? 0) > 0 && (
                    <span>Cleaned {meta.deactivated}</span>
                  )}
                  <span>· {formatDate(row.createdAt)}</span>
                  {row.actorEmail && <span>· {row.actorEmail}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
