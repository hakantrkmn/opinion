"use client";

import { PinIcon } from "@/components/icons/PinIcon";
import type { SortCriteria } from "@/lib/comment-sort-manager";
import { MessageCircle } from "lucide-react";
import CommentSortDropdown from "../CommentSortDropdown";
import PinActions from "@/components/pin/PinActions";

interface PinDetailHeaderProps {
  pinId: string;
  pinName: string;
  pinCoordinates?: { lat: number; lng: number };
  commentCount: number;
  sortBy: SortCriteria;
  onSortChange: (value: SortCriteria) => void;
  onRefresh?: () => void;
}

export function PinDetailHeader({
  pinId,
  pinName,
  pinCoordinates,
  commentCount,
  sortBy,
  onSortChange,
  onRefresh,
}: PinDetailHeaderProps) {
  const isHot = commentCount > 10;
  const isActive = commentCount > 0;

  const accentColor = isHot
    ? "bg-amber-500 shadow-[0_2px_8px_-2px_rgba(245,158,11,0.4)]"
    : isActive
      ? "bg-emerald-500 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.4)]"
      : "bg-zinc-400 dark:bg-zinc-600";

  return (
    <div className="border-b border-border/40 px-5 pb-4 pt-2 sm:px-7 sm:pb-6 sm:pt-6">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${accentColor}`}
        >
          <PinIcon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold leading-tight tracking-tight text-foreground">
            {pinName}
          </h2>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" />
            <span>
              {commentCount} {commentCount === 1 ? "comment" : "comments"}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:mt-5 lg:flex-row lg:items-center lg:justify-between">
        <PinActions
          pinCoordinates={pinCoordinates}
          pinId={pinId}
          pinName={pinName}
          onRefresh={onRefresh}
        />
        {commentCount > 1 ? (
          <CommentSortDropdown
            currentSort={sortBy}
            onSortChange={onSortChange}
            className="h-10 w-full sm:w-[180px]"
          />
        ) : null}
      </div>
    </div>
  );
}
