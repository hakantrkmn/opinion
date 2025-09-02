export interface UserStats {
  stats: {
    totalPins: number;
    totalComments: number;
    totalLikes: number;
    totalDislikes: number;
    totalVotesGiven?: number;
    lastActivityAt?: string;
  } | null;
  performanceInfo: {
    queryTime: number;
    method: string;
    improvement?: string;
  };
  error: string | null;
}
