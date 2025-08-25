import { Button } from "@/components/ui/button";
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
    <Button
      onClick={onRefresh}
      disabled={isRefreshing}
      variant="outline"
      size="icon"
      className="fixed top-20 right-4 z-30 rounded-full shadow-lg"
      title="Refresh pins"
    >
      <RefreshCcw
        className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
      />
    </Button>
  );
};
