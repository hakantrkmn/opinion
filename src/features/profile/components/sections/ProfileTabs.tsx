"use client";

import { PinIcon } from "@/components/icons/PinIcon";
import { formatCount } from "@/features/profile/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle } from "lucide-react";
import type { ReactNode } from "react";

type Tab = "pins" | "comments";

const trigger =
  "h-full gap-2 rounded-lg text-sm data-[state=active]:shadow-xs [&>svg]:size-4";
const count =
  "rounded-full bg-muted px-1.5 py-px text-[11px] font-medium tabular-nums text-muted-foreground";

/** Pins / Comments tabs shared by own and public profiles. */
export function ProfileTabs({
  value,
  onValueChange,
  pinsCount,
  commentsCount,
  pins,
  comments,
}: {
  value: Tab;
  onValueChange: (value: Tab) => void;
  pinsCount?: number;
  commentsCount?: number;
  pins: ReactNode;
  comments: ReactNode;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as Tab)}>
      <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-muted/70 p-1">
        <TabsTrigger value="pins" className={trigger}>
          <PinIcon className="size-4" />
          Pins
          {typeof pinsCount === "number" ? <span className={count}>{formatCount(pinsCount)}</span> : null}
        </TabsTrigger>
        <TabsTrigger value="comments" className={trigger}>
          <MessageCircle aria-hidden />
          Comments
          {typeof commentsCount === "number" ? (
            <span className={count}>{formatCount(commentsCount)}</span>
          ) : null}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="pins" className="mt-4 focus-visible:ring-0 focus-visible:ring-offset-0">
        {pins}
      </TabsContent>
      <TabsContent value="comments" className="mt-4 focus-visible:ring-0 focus-visible:ring-offset-0">
        {comments}
      </TabsContent>
    </Tabs>
  );
}
