"use client";

import { useState } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { Bell, Flag, MapPin, MessageSquare, PieChart, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAdminAnalytics,
  useAdminComments,
  useAdminPins,
  useAdminReports,
  useAdminUsers,
  type AdminReport,
  type AdminReportFilter,
} from "@/features/admin/hooks/use-admin";
import {
  useDeleteAdminComment,
  useDeleteAdminPin,
  useDeleteAdminUser,
  useRefreshStats,
  useReportAction,
} from "@/features/admin/hooks/use-admin-mutations";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSession } from "@/features/auth/hooks/useSession";
import { queryKeys } from "@/lib/api/query-keys";
import { AdminHeader } from "@/features/admin/components/AdminHeader";
import { AdminStats } from "@/features/admin/components/AdminStats";
import { AdminSearch } from "@/features/admin/components/AdminSearch";
import { OverviewPanel } from "@/features/admin/components/OverviewPanel";
import { UserList } from "@/features/admin/components/UserList";
import { PinList } from "@/features/admin/components/PinList";
import { CommentList } from "@/features/admin/components/CommentList";
import { ReportList } from "@/features/admin/components/ReportList";
import { NotificationsPanel } from "@/features/admin/components/NotificationsPanel";
import { DeleteConfirmDialog } from "@/features/admin/components/DeleteConfirmDialog";
import type {
  AdminComment,
  AdminPin,
  AdminTab,
  AdminUser,
  ConfirmState,
} from "@/features/admin/components/types";

const TABS = [
  { value: "overview", label: "Overview", icon: PieChart },
  { value: "reports", label: "Reports", icon: Flag },
  { value: "users", label: "Members", icon: Users },
  { value: "pins", label: "Pins", icon: MapPin },
  { value: "comments", label: "Comments", icon: MessageSquare },
  { value: "notifications", label: "Notifications", icon: Bell },
] as const satisfies readonly { value: AdminTab; label: string; icon: unknown }[];

const REPORT_FILTERS = ["open", "resolved", "dismissed", "all"] as const;

export default function AdminDashboard() {
  const { user } = useSession();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [reportStatus, setReportStatus] = useState<AdminReportFilter>("open");
  const queryClient = useQueryClient();

  // Lists load lazily, only for the active tab; search runs server-side.
  const usersQuery = useAdminUsers(debouncedQuery, tab === "users");
  const pinsQuery = useAdminPins(debouncedQuery, tab === "pins");
  const commentsQuery = useAdminComments(debouncedQuery, tab === "comments");
  const reportsQuery = useAdminReports(reportStatus, tab === "reports");
  const { data: analytics, isLoading: analyticsLoading } = useAdminAnalytics();

  const delUser = useDeleteAdminUser();
  const delPin = useDeleteAdminPin();
  const delComment = useDeleteAdminComment();
  const refreshStats = useRefreshStats();
  const reportAction = useReportAction();

  const changeTab = (next: AdminTab) => {
    setTab(next);
    setQuery("");
  };

  const handleRefreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
  };

  const askDeleteUser = (u: AdminUser) =>
    setConfirm({
      title: "Delete this account?",
      description: `${u.display_name || u.email} will be signed out everywhere and their comments, votes and photos removed. Pins that other people commented on stay, shown as by a deleted user. This cannot be undone.`,
      confirmLabel: "Delete account",
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
      title: c.is_first_comment ? "Delete the origin comment?" : "Delete this comment?",
      description: `The comment on "${c.pin.name}" will be removed. If it was the pin's last comment, the pin is removed too.`,
      confirmLabel: "Delete comment",
      onConfirm: () => {
        delComment.mutate(c.id);
        setConfirm(null);
      },
    });

  const askDeleteReportTarget = (r: AdminReport) => {
    const targetLabel =
      r.target_type === "pin"
        ? `pin "${r.target.label || r.target_id}"`
        : r.target_type === "comment"
          ? "the reported comment"
          : `the account of ${r.target.label || r.target_id}`;
    setConfirm({
      title: r.target_type === "user" ? "Delete this account?" : `Remove this ${r.target_type}?`,
      description: `This permanently deletes ${targetLabel}. All open reports on it will be marked resolved.`,
      confirmLabel: r.target_type === "user" ? "Delete account" : `Remove ${r.target_type}`,
      onConfirm: () => {
        reportAction.mutate({ reportId: r.id, action: "delete_target" });
        setConfirm(null);
      },
    });
  };

  const reportPendingId = reportAction.isPending ? reportAction.variables?.reportId ?? null : null;
  const refreshing = useIsFetching({ queryKey: queryKeys.admin.all }) > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <AdminHeader
        onRefresh={handleRefreshAll}
        refreshing={refreshing}
        onRecomputeStats={() => refreshStats.mutate()}
        recomputing={refreshStats.isPending}
      />

      <AdminStats
        analytics={analytics}
        loading={analyticsLoading}
        onOpenReports={() => {
          setReportStatus("open");
          changeTab("reports");
        }}
      />

      <Tabs value={tab} onValueChange={(v) => changeTab(v as AdminTab)}>
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <TabsList className="inline-flex h-11 w-max gap-0.5 rounded-xl bg-muted/70 p-1">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="h-full gap-2 rounded-lg px-3 [&>svg]:size-4">
                <Icon aria-hidden />
                {label}
                {value === "reports" && analytics?.open_reports ? (
                  <span className="rounded-full bg-destructive px-1.5 text-[11px] font-semibold leading-[18px] tabular-nums text-white">
                    {analytics.open_reports}
                    <span className="sr-only"> open</span>
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6">
          <OverviewPanel analytics={analytics} loading={analyticsLoading} />
        </TabsContent>

        <TabsContent value="reports" className="mt-6 flex flex-col gap-4">
          <div role="radiogroup" aria-label="Report status" className="flex flex-wrap gap-2">
            {REPORT_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={reportStatus === s}
                onClick={() => setReportStatus(s)}
                className={cn(
                  "h-9 rounded-full px-4 text-sm font-medium capitalize outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  reportStatus === s
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <ReportList
            query={reportsQuery}
            onResolve={(r) => reportAction.mutate({ reportId: r.id, action: "resolve" })}
            onDismiss={(r) => reportAction.mutate({ reportId: r.id, action: "dismiss" })}
            onDeleteTarget={askDeleteReportTarget}
            pendingId={reportPendingId}
            emptyLabel={reportStatus === "open" ? "No open reports. All caught up." : `No ${reportStatus === "all" ? "" : `${reportStatus} `}reports.`}
          />
        </TabsContent>

        <TabsContent value="users" className="mt-6 flex flex-col gap-4">
          <AdminSearch value={query} onChange={setQuery} placeholder="Search by name or email" label="Search members" />
          <UserList query={usersQuery} currentUserId={user?.id} onDelete={askDeleteUser} pending={delUser.isPending} />
        </TabsContent>

        <TabsContent value="pins" className="mt-6 flex flex-col gap-4">
          <AdminSearch value={query} onChange={setQuery} placeholder="Search by pin name" label="Search pins" />
          <PinList query={pinsQuery} onDelete={askDeletePin} pending={delPin.isPending} />
        </TabsContent>

        <TabsContent value="comments" className="mt-6 flex flex-col gap-4">
          <AdminSearch value={query} onChange={setQuery} placeholder="Search comment text" label="Search comments" />
          <CommentList query={commentsQuery} onDelete={askDeleteComment} pending={delComment.isPending} />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationsPanel setConfirm={setConfirm} />
        </TabsContent>
      </Tabs>

      <DeleteConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
