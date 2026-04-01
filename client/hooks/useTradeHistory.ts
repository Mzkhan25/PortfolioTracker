import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import type { PaginatedResponse } from "@portfolio-tracker/shared";

export interface Trade {
  id: string;
  instrumentId: string;
  instrumentName: string;
  ticker: string;
  isBuy: boolean;
  openRate: number;
  closeRate: number;
  openDate: string;
  closeDate: string;
  investment: number;
  units: number;
  leverage: number;
  netProfit: number;
  fees: number;
}

export function useTradeHistory(page = 1, limit = 20, minDate?: string) {
  return useQuery<PaginatedResponse<Trade>>({
    queryKey: ["history", "trades", page, limit, minDate],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit };
      if (minDate) params.minDate = minDate;
      const { data } = await api.get("/history/trades", { params });
      return data.data;
    },
  });
}
