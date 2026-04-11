"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, MessageSquare, PieChart, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAdminUsers,
  useAdminPins,
  useAdminComments,
  useAdminAnalytics,
} from "@/hooks/queries/use-admin";
import {
  useDeleteAdminUser,
  useDeleteAdminPin,
  useDeleteAdminComment,
  useRefreshStats,
} from "@/hooks/mutations/use-admin-mutations";
import { queryKeys } from "@/lib/api/query-keys";
import { AdminHeader } from "./admin/AdminHeader";
import { AdminStats } from "./admin/AdminStats";
import { AdminSearch } from "./admin/AdminSearch";
import { OverviewPanel } from "./admin/OverviewPanel";
import { UserList } from "./admin/UserList";
import { PinList } from "./admin/PinList";
import { CommentList } from "./admin/CommentList";
import { DeleteConfirmDialog } from "./admin/DeleteConfirmDialog";
import type {
  AdminAnalytics,
  AdminComment,
  AdminPin,
  AdminTab,
  AdminUser,
  ConfirmState,
} from "./admin/types";

export default function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const queryClient = useQueryClient();

  const { data: usersResp, isLoading: usersLoading } = useAdminUsers();
  const { data: pinsResp, isLoading: pinsLoading } = useAdminPins();
  const { data: commentsResp, isLoading: commentsLoading } = useAdminComments();
  const { data: analyticsResp, isLoading: analyticsLoading } =
    useAdminAnalytics();

  const delUser = useDeleteAdminUser();
  const delPin = useDeleteAdminPin();
  const delComment = useDeleteAdminComment();
  const refreshStats = useRefreshStats();

  const users = (usersResp?.data || []) as unknown as AdminUser[];
  const pins = (pinsResp?.data || []) as unknown as AdminPin[];
  const comments = (commentsResp?.data || []) as unknown as AdminComment[];
  const analytics = (analyticsResp as { data?: AdminAnalytics } | undefined)
    ?.data;

  const initialLoading =
    usersLoading && pinsLoading && commentsLoading && analyticsLoading;

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.analytics });
    queryClient.invalidateQueries({ queryKey: ["pins"] });
  };

  const filteredUsers = useMemo(() => {
    if (!query) return users;
    const q = query.toLowerCase();
    return users.filter((u) =>
      [u.email, u.displayName, u.name]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q))
    );
  }, [users, query]);

  const filteredPins = useMemo(() => {
    if (!query) return pins;
    const q = query.toLowerCase();
    return pins.filter((p) =>
      [p.name, p.location, p.profiles?.email]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q))
    );
  }, [pins, query]);

  const filteredComments = useMemo(() => {
    if (!query) return comments;
    const q = query.toLowerCase();
    return comments.filter((c) =>
      [c.text, c.profiles?.email, c.pins?.name]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q))
    );
  }, [comments, query]);

  const askDeleteUser = (u: AdminUser) =>
    setConfirm({
      title: "Delete this account?",
      description: `${u.displayName || u.email} will lose every pin, comment, vote, and uploaded photo. This action cannot be undone.`,
      confirmLabel: "Delete user",
      onConfirm: () => {
        delUser.mutate(u.id);
        setConfirm(null);
      },
    });

  const askDeletePin = (p: AdminPin) =>
    setConfirm({
      title: "Delete this pin?",
      description: `"${p.name}" and every comment under it will be removed from the map.`,
      confirmLabel: "Delete pin",
      onConfirm: () => {
        delPin.mutate(p.id);
        setConfirm(null);
      },
    });

  const askDeleteComment = (c: AdminComment) =>
    setConfirm({
      title: c.is_first_comment
        ? "Delete the origin comment?"
        : "Delete this comment?",
      description: c.is_first_comment
        ? `This is the first comment on "${c.pins?.name}". If no other comments remain, the pin itself will also be removed.`
        : `The comment by ${c.profiles?.email} on "${c.pins?.name}" will be removed. If it was the last comment, the pin is cleaned up automatically.`,
      confirmLabel: "Delete comment",
      onConfirm: () => {
        delComment.mutate(c.id);
        setConfirm(null);
      },
    });

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <AdminHeader
        onRefresh={handleRefreshAll}
        onRecomputeStats={() => refreshStats.mutate()}
        recomputing={refreshStats.isPending}
      />

      <div className="mt-8 space-y-6">
        <AdminStats analytics={analytics} loading={analyticsLoading} />

        <Tabs value={tab} onValueChange={(v) => { setTab(v as AdminTab); setQuery(""); }}>
          <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-flex">
            <TabsTrigger value="overview">
              <PieChart className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="pins">
              <MapPin className="mr-2 h-4 w-4" />
              Pins
            </TabsTrigger>
            <TabsTrigger value="comments">
              <MessageSquare className="mr-2 h-4 w-4" />
              Comments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OverviewPanel
              analytics={analytics}
              users={users}
              pins={pins}
              comments={comments}
            />
          </TabsContent>

          <TabsContent value="users" className="mt-6 space-y-4">
            <AdminSearch
              value={query}
              onChange={setQuery}
              placeholder="Search by name or email…"
            />
            <UserList
              items={filteredUsers}
              total={users.length}
              onDelete={askDeleteUser}
              pending={delUser.isPending}
            />
          </TabsContent>

          <TabsContent value="pins" className="mt-6 space-y-4">
            <AdminSearch
              value={query}
              onChange={setQuery}
              placeholder="Search by pin name, location, or owner…"
            />
            <PinList
              items={filteredPins}
              total={pins.length}
              onDelete={askDeletePin}
              pending={delPin.isPending}
            />
          </TabsContent>

          <TabsContent value="comments" className="mt-6 space-y-4">
            <AdminSearch
              value={query}
              onChange={setQuery}
              placeholder="Search by text, author, or pin…"
            />
            <CommentList
              items={filteredComments}
              total={comments.length}
              onDelete={askDeleteComment}
              pending={delComment.isPending}
            />
          </TabsContent>
        </Tabs>
      </div>

      <DeleteConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
