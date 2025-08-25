"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { commentSortManager, type SortCriteria } from "@/lib/comment-sort-manager";
import {
    Clock,
    History,
    ThumbsUp,
    TrendingUp
} from "lucide-react";

interface CommentSortDropdownProps {
    currentSort: SortCriteria;
    onSortChange: (sortBy: SortCriteria) => void;
    className?: string;
}

const iconMap = {
    clock: Clock,
    history: History,
    "thumbs-up": ThumbsUp,
    "trending-up": TrendingUp,
};

export default function CommentSortDropdown({
    currentSort,
    onSortChange,
    className = "",
}: CommentSortDropdownProps) {
    const sortOptions = commentSortManager.getSortOptions();

    return (
        <Select value={currentSort} onValueChange={onSortChange}>
            <SelectTrigger className={`w-[140px] sm:w-[160px] h-8 text-xs sm:text-sm ${className}`}>
                <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
                {sortOptions.map((option) => {
                    const Icon = iconMap[option.icon as keyof typeof iconMap];

                    return (
                        <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center">
                                <Icon className="h-4 w-4 mr-2" />
                                <span>{option.label}</span>
                            </div>
                        </SelectItem>
                    );
                })}
            </SelectContent>
        </Select>
    );
}
