import { RefreshCcw } from "lucide-react";

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const RefreshButton = ({
  onRefresh,
  isRefreshing,
}: RefreshButtonProps) => {
  return (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className={`
        fixed top-4 right-4 z-10
        p-3 bg-white rounded-full shadow-lg
        hover:bg-gray-50 transition-colors
        ${isRefreshing ? "opacity-50 cursor-not-allowed" : "hover:shadow-xl"}
      `}
      title="Pin'leri yenile"
    >
      <RefreshCcw
        className={`w-5 h-5 text-gray-700 ${
          isRefreshing ? "animate-spin" : ""
        }`}
      />
    </button>
  );
};
