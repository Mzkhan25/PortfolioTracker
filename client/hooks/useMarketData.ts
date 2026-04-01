import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import type { Candle, CandlePeriod, Rate } from "@portfolio-tracker/shared";

export function useRates(instrumentIds: string[]) {
  return useQuery<Rate[]>({
    queryKey: ["market", "rates", instrumentIds],
    queryFn: async () => {
      const { data } = await api.get("/market/rates", {
        params: { instrumentIds: instrumentIds.join(",") },
      });
      return data.data;
    },
    enabled: instrumentIds.length > 0,
  });
}

export function useCandles(instrumentId: string, period: CandlePeriod) {
  return useQuery<Candle[]>({
    queryKey: ["market", "candles", instrumentId, period],
    queryFn: async () => {
      const { data } = await api.get(`/market/candles/${instrumentId}`, {
        params: { period },
      });
      return data.data;
    },
    enabled: !!instrumentId,
  });
}
