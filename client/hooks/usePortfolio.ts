import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import type { PortfolioOverview, Position } from "@portfolio-tracker/shared";

export function usePortfolioOverview(tagId?: string) {
  return useQuery<PortfolioOverview>({
    queryKey: ["portfolio", "overview", tagId],
    queryFn: async () => {
      const params = tagId ? { tag: tagId } : undefined;
      const { data } = await api.get("/portfolio/overview", { params });
      return data.data;
    },
  });
}

export function usePositions() {
  return useQuery<Position[]>({
    queryKey: ["portfolio", "positions"],
    queryFn: async () => {
      const { data } = await api.get("/portfolio/positions");
      return data.data;
    },
  });
}
