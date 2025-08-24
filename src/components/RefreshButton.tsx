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
        fixed top-20 right-4 z-30
        p-3 bg-amber-50 border border-amber-200 rounded-full shadow-lg
        hover:bg-amber-100 hover:border-amber-300 transition-all duration-200
        ${
          isRefreshing
            ? "opacity-50 cursor-not-allowed"
            : "hover:shadow-xl hover:scale-105"
        }
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
