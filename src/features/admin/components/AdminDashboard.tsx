"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { Bell, Flag, HandHeart, MapPin, MessageSquare, PieChart, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAdminAnalytics,
  useAdminComments,
  useAdminNewcomers,
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
import { NewcomerList } from "@/features/admin/components/NewcomerList";
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

/** Labels live in admin.tabs.<value>. */
const TABS = [
  { value: "overview", icon: PieChart },
  { value: "newcomers", icon: HandHeart },
  { value: "reports", icon: Flag },
  { value: "users", icon: Users },
  { value: "pins", icon: MapPin },
  { value: "comments", icon: MessageSquare },
  { value: "notifications", icon: Bell },
] as const satisfies readonly { value: AdminTab; icon: unknown }[];

const REPORT_FILTERS = ["open", "resolved", "dismissed", "all"] as const;

export default function AdminDashboard() {
  const t = useTranslations("admin");
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
  const newcomersQuery = useAdminNewcomers();
  const waitingNewcomers = newcomersQuery.firstPage?.waiting ?? 0;
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
      title: t("confirm.deleteUser.title"),
      description: t("confirm.deleteUser.description", { name: u.display_name || u.email }),
      confirmLabel: t("confirm.deleteUser.confirm"),
      onConfirm: () => {
        delUser.mutate(u.id);
        setConfirm(null);
      },
    });

  const askDeletePin = (p: AdminPin) =>
    setConfirm({
      title: t("confirm.deletePin.title"),
      description: t("confirm.deletePin.description", { name: p.name }),
      confirmLabel: t("confirm.deletePin.confirm"),
      onConfirm: () => {
        delPin.mutate(p.id);
        setConfirm(null);
      },
    });

  const askDeleteComment = (c: AdminComment) =>
    setConfirm({
      title: c.is_first_comment ? t("confirm.deleteComment.titleOrigin") : t("confirm.deleteComment.title"),
      description: t("confirm.deleteComment.description", { pinName: c.pin.name }),
      confirmLabel: t("confirm.deleteComment.confirm"),
      onConfirm: () => {
        delComment.mutate(c.id);
        setConfirm(null);
      },
    });

  const askDeleteReportTarget = (r: AdminReport) => {
    const type = r.target_type;
    setConfirm({
      title: t(`confirm.reportTarget.${type}.title`),
      description: t(`confirm.reportTarget.${type}.description`, { label: r.target.label || r.target_id }),
      confirmLabel: t(`confirm.reportTarget.${type}.confirm`),
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
            {TABS.map(({ value, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="h-full gap-2 rounded-lg px-3 [&>svg]:size-4">
                <Icon aria-hidden />
                {t(`tabs.${value}`)}
                {value === "reports" && analytics?.open_reports ? (
                  <span className="rounded-full bg-destructive px-1.5 text-[11px] font-semibold leading-[18px] tabular-nums text-white">
                    {analytics.open_reports}
                    <span className="sr-only"> {t("tabs.openSr")}</span>
                  </span>
                ) : null}
                {value === "newcomers" && waitingNewcomers > 0 ? (
                  <span className="rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold leading-[18px] tabular-nums text-white">
                    {waitingNewcomers}
                    <span className="sr-only"> {t("tabs.waitingSr")}</span>
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6">
          <OverviewPanel analytics={analytics} loading={analyticsLoading} />
        </TabsContent>

        <TabsContent value="newcomers" className="mt-6">
          <NewcomerList query={newcomersQuery} />
        </TabsContent>

        <TabsContent value="reports" className="mt-6 flex flex-col gap-4">
          <div role="radiogroup" aria-label={t("reports.statusLabel")} className="flex flex-wrap gap-2">
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
                {t(`reports.status.${s}`)}
              </button>
            ))}
          </div>
          <ReportList
            query={reportsQuery}
            onResolve={(r) => reportAction.mutate({ reportId: r.id, action: "resolve" })}
            onDismiss={(r) => reportAction.mutate({ reportId: r.id, action: "dismiss" })}
            onDeleteTarget={askDeleteReportTarget}
            pendingId={reportPendingId}
            emptyLabel={t(`reports.empty.${reportStatus}`)}
          />
        </TabsContent>

        <TabsContent value="users" className="mt-6 flex flex-col gap-4">
          <AdminSearch value={query} onChange={setQuery} placeholder={t("search.usersPlaceholder")} label={t("search.usersLabel")} />
          <UserList query={usersQuery} currentUserId={user?.id} onDelete={askDeleteUser} pending={delUser.isPending} />
        </TabsContent>

        <TabsContent value="pins" className="mt-6 flex flex-col gap-4">
          <AdminSearch value={query} onChange={setQuery} placeholder={t("search.pinsPlaceholder")} label={t("search.pinsLabel")} />
          <PinList query={pinsQuery} onDelete={askDeletePin} pending={delPin.isPending} />
        </TabsContent>

        <TabsContent value="comments" className="mt-6 flex flex-col gap-4">
          <AdminSearch value={query} onChange={setQuery} placeholder={t("search.commentsPlaceholder")} label={t("search.commentsLabel")} />
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
