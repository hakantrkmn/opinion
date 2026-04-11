"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Heart, MapPin, MessageSquare, Users } from "lucide-react";
import type { AdminAnalytics } from "./types";
import { formatNumber } from "./utils";

interface AdminStatsProps {
  analytics?: AdminAnalytics;
  loading: boolean;
}

export function AdminStats({ analytics, loading }: AdminStatsProps) {
  const items = [
    { label: "Members", value: analytics?.totalUsers, icon: Users },
    { label: "Pins", value: analytics?.totalPins, icon: MapPin },
    { label: "Comments", value: analytics?.totalComments, icon: MessageSquare },
    {
      label: "Reactions",
      value: (analytics?.totalLikes || 0) + (analytics?.totalDislikes || 0),
      icon: Heart,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {item.label}
              </span>
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
              {loading ? "—" : formatNumber(item.value)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
