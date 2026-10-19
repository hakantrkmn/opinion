export type {
  AdminAnalytics,
  AdminComment,
  AdminPin,
  AdminReport,
  AdminUser,
} from "@/types/userTypes";

export type AdminTab =
  | "overview"
  | "users"
  | "pins"
  | "comments"
  | "reports"
  | "notifications";

export interface ConfirmState {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}
