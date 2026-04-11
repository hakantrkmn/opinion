export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt?: string;
  created_at?: string;
}

export interface AdminPin {
  id: string;
  name: string;
  location?: string;
  created_at: string;
  profiles: { id: string; email: string };
}

export interface AdminComment {
  id: string;
  text: string;
  created_at: string;
  is_first_comment?: boolean;
  photo_url?: string | null;
  profiles: { id: string; email: string };
  pins: { id: string; name: string; location: string };
}

export interface AdminAnalytics {
  totalUsers: number;
  totalPins: number;
  totalComments: number;
  totalLikes?: number;
  totalDislikes?: number;
  totalVotes?: number;
  topUsers?: {
    user_id: string;
    total_pins: number;
    total_comments: number;
    total_likes_received: number;
    last_activity_at: string;
    users: { email: string };
  }[];
}

export type AdminTab = "overview" | "users" | "pins" | "comments";

export interface ConfirmState {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}
