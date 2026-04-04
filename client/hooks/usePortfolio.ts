import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import type { PortfolioOverview, Position, GroupedPosition } from "@portfolio-tracker/shared";

const STALE_TIME = 60_000; // 60s — matches server cache TTL

export interface PortfolioHistoryPoint {
  totalValue: number;
  unrealizedPnl: number;
  date: string;
}

export function usePortfolioOverview(tagId?: string) {
  return useQuery<PortfolioOverview>({
    queryKey: ["portfolio", "overview", tagId],
    queryFn: async () => {
      const params = tagId ? { tag: tagId } : undefined;
      const { data } = await api.get("/portfolio/overview", { params });
      return data.data;
    },
    staleTime: STALE_TIME,
  });
}

export function usePositions() {
  return useQuery<Position[]>({
    queryKey: ["portfolio", "positions"],
    queryFn: async () => {
      const { data } = await api.get("/portfolio/positions");
      return data.data;
    },
    staleTime: STALE_TIME,
  });
}

export function useGroupedPositions() {
  return useQuery<GroupedPosition[]>({
    queryKey: ["portfolio", "positions", "grouped"],
    queryFn: async () => {
      const { data } = await api.get("/portfolio/positions/grouped");
      return data.data;
    },
    staleTime: STALE_TIME,
  });
}

export function usePortfolioHistory(days = 30) {
  return useQuery<PortfolioHistoryPoint[]>({
    queryKey: ["portfolio", "history", days],
    queryFn: async () => {
      const { data } = await api.get("/portfolio/history", { params: { days } });
      return data.data;
    },
    staleTime: 300_000,
  });
}
