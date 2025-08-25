"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, User } from "lucide-react";


interface PinPopupProps {
  pinName: string;
  displayName: string;
  commentCount: number;
  onPinClick: () => void;
}

export default function PinPopup({
  pinName,
  displayName,
  commentCount,
  onPinClick,
}: PinPopupProps) {
  return (
    <Card
      className="max-w-sm cursor-pointer hover:shadow-md transition-shadow border-0 shadow-lg"
      onClick={onPinClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg leading-tight">{pinName}</CardTitle>
        <CardDescription className="flex items-center gap-1">
          <User className="h-3 w-3" />
          Created by {displayName}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
          <MessageCircle className="h-3 w-3" />
          {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
        </Badge>
      </CardContent>
    </Card>
  );
}
