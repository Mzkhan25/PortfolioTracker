import axios, { AxiosInstance } from "axios";
import { v4 as uuidv4 } from "uuid";
import type {
  PortfolioOverview,
  Position,
  Instrument,
  Rate,
  Candle,
  CandlePeriod,
} from "@portfolio-tracker/shared";
import { getCachedInstruments, setCachedInstruments } from "./cache.js";

const BASE_URL = process.env.ETORO_API_BASE_URL || "https://public-api.etoro.com/api/v1";

// Map CandlePeriod to eToro's interval format
const CANDLE_INTERVAL_MAP: Record<CandlePeriod, { interval: string; count: number }> = {
  "1D": { interval: "OneDay", count: 1 },
  "1W": { interval: "OneDay", count: 7 },
  "1M": { interval: "OneDay", count: 30 },
  "3M": { interval: "OneWeek", count: 13 },
  "1Y": { interval: "OneWeek", count: 52 },
};

export class EtoroService {
  private client: AxiosInstance;

  constructor() {
    const apiKey = process.env.ETORO_API_KEY;
    const userKey = process.env.ETORO_USER_KEY;
    if (!apiKey || !userKey) {
      throw new Error("ETORO_API_KEY and ETORO_USER_KEY environment variables are required");
    }

    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "x-user-key": userKey,
      },
    });

    // Inject unique x-request-id on every request
    this.client.interceptors.request.use((config) => {
      config.headers["x-request-id"] = uuidv4();
      return config;
    });
  }

  /**
   * Validate that the provided keys work by fetching user identity.
   * Returns the eToro GCID (global client ID).
   */
  async validateKeys(): Promise<{ gcid: number; username: string }> {
    const response = await this.client.get("/me");
    return response.data;
  }

  /**
   * Get user profile data.
   */
  async getUserProfile(username: string): Promise<{
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  }> {
    const response = await this.client.get(`/user-info/people/${username}`);
    const data = response.data;
    return {
      userId: String(data.cid ?? data.gcid ?? data.userId),
      username: data.username ?? username,
      displayName: data.displayName ?? data.username ?? username,
      avatarUrl: data.avatarUrl ?? data.mediaUrl ?? null,
    };
  }

  /**
   * Get portfolio PnL and positions from real account.
   */
  async getPortfolioPnl(): Promise<{
    overview: PortfolioOverview;
    positions: Position[];
    rawCredit: number;
  }> {
    const response = await this.client.get("/trading/info/real/pnl");
    const portfolio = response.data.clientPortfolio || response.data;

    // Convert USD → EUR using eToro's own forex rate
    const eurUsdRate = await this.getEurUsdRate();
    const toEur = (usd: number) => usd / eurUsdRate;

    const rawPositions = portfolio.positions || [];
    const totalInvested = rawPositions.reduce(
      (sum: number, p: any) => sum + toEur(p.amount || p.initialAmountInDollars || 0),
      0
    );
    const totalPnl = rawPositions.reduce(
      (sum: number, p: any) => sum + toEur(p.unrealizedPnL?.pnL || 0),
      0
    );
    const credit = toEur(portfolio.credit || 0);
    const totalValue = totalInvested + totalPnl + credit;

    const positions: Position[] = rawPositions.map((p: any) => {
      const invested = toEur(p.amount || p.initialAmountInDollars || 0);
      const pnl = toEur(p.unrealizedPnL?.pnL || 0);
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
      const currentValue = invested + pnl;
      const allocation = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;

      return {
        id: String(p.positionID),
        instrumentId: String(p.instrumentID),
        instrumentName: "",
        ticker: "",
        amount: invested,
        units: p.units || 0,
        openRate: p.openRate || 0,
        currentRate: p.unrealizedPnL?.closeRate || 0,
        unrealizedPnl: pnl,
        unrealizedPnlPercent: pnlPercent,
        allocationPercent: allocation,
        openDate: p.openDateTime || "",
        leverage: p.leverage || 1,
        isBuy: p.isBuy ?? true,
        tags: [],
      };
    });

    const overview: PortfolioOverview = {
      totalValue,
      equity: totalValue,
      availableCash: credit,
      unrealizedPnl: totalPnl,
      unrealizedPnlPercent: totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0,
      dailyChange: 0,
      dailyChangePercent: 0,
    };

    return { overview, positions, rawCredit: credit };
  }

  /**
   * Get trade history for real account.
   */
  async getTradeHistory(
    minDate: string,
    page = 1,
    pageSize = 20
  ): Promise<{
    trades: any[];
    total: number;
  }> {
    const response = await this.client.get("/trading/info/trade/history", {
      params: { minDate, page, pageSize },
    });

    const trades = Array.isArray(response.data) ? response.data : response.data.trades || [];

    // Convert USD → EUR
    const eurUsdRate = await this.getEurUsdRate();
    const toEur = (usd: number) => usd / eurUsdRate;

    return {
      trades: trades.map((t: any) => ({
        id: String(t.positionId || t.orderId),
        instrumentId: String(t.instrumentId),
        instrumentName: "",
        ticker: "",
        isBuy: t.isBuy ?? true,
        openRate: t.openRate || 0,
        closeRate: t.closeRate || 0,
        openDate: t.openTimestamp || "",
        closeDate: t.closeTimestamp || "",
        investment: toEur(t.investment || t.initialInvestment || 0),
        units: t.units || 0,
        leverage: t.leverage || 1,
        netProfit: toEur(t.netProfit || 0),
        fees: toEur(t.fees || 0),
        stopLossRate: t.stopLossRate || 0,
        takeProfitRate: t.takeProfitRate || 0,
      })),
      total: trades.length,
    };
  }

  /**
   * Search instruments.
   */
  async searchInstruments(query?: string): Promise<Instrument[]> {
    const params = query ? { internalSymbolFull: query } : {};
    const response = await this.client.get("/market-data/search", { params });

    const instruments = Array.isArray(response.data)
      ? response.data
      : response.data.instrumentDisplayDatas || response.data.instruments || [];

    return instruments.map((i: any) => ({
      instrumentId: String(i.instrumentID ?? i.instrumentId),
      name: i.instrumentDisplayName ?? i.name ?? "",
      ticker: i.symbolFull ?? i.ticker ?? "",
      type: i.instrumentTypeID ? String(i.instrumentTypeID) : (i.instrumentType ?? "Stocks"),
      exchangeId: String(i.exchangeID ?? i.exchangeId ?? ""),
      imageUrl: i.images?.[0]?.uri ?? i.imageUrl ?? null,
    }));
  }

  /**
   * Get instrument metadata (list of all instruments or filtered).
   * Results are cached for 24 hours since instrument names rarely change.
   */
  async getInstruments(): Promise<Instrument[]> {
    const cached = getCachedInstruments();
    if (cached) return cached;

    const response = await this.client.get("/market-data/instruments");

    const instruments = Array.isArray(response.data)
      ? response.data
      : response.data.instrumentDisplayDatas || response.data.instruments || [];

    const mapped: Instrument[] = instruments.map((i: any) => ({
      instrumentId: String(i.instrumentID ?? i.instrumentId),
      name: i.instrumentDisplayName ?? i.name ?? "",
      ticker: i.symbolFull ?? i.ticker ?? "",
      type: i.instrumentTypeID ? String(i.instrumentTypeID) : (i.instrumentType ?? "Stocks"),
      exchangeId: String(i.exchangeID ?? i.exchangeId ?? ""),
      imageUrl: i.images?.[0]?.uri ?? i.imageUrl ?? null,
    }));

    setCachedInstruments(mapped);
    return mapped;
  }

  /**
   * Get current market rates for given instruments.
   */
  async getRates(instrumentIds: string[]): Promise<Rate[]> {
    const response = await this.client.get("/market-data/instruments/rates", {
      params: { instrumentIds: instrumentIds.join(",") },
    });

    const rates = Array.isArray(response.data)
      ? response.data
      : response.data.rates || [];

    return rates.map((r: any) => ({
      instrumentId: String(r.instrumentID ?? r.instrumentId),
      bid: r.bid ?? r.Bid ?? 0,
      ask: r.ask ?? r.Ask ?? 0,
      lastPrice: r.lastExecution ?? r.lastPrice ?? ((r.bid ?? 0) + (r.ask ?? 0)) / 2,
      dailyChange: r.dailyChange ?? 0,
      dailyChangePercent: r.dailyChangePercent ?? 0,
      timestamp: r.date ?? r.timestamp ?? new Date().toISOString(),
    }));
  }

  /**
   * Get EUR/USD conversion rate using eToro's own forex rates.
   * EUR/USD is instrument ID 1. Returns the rate to divide USD values by.
   */
  async getEurUsdRate(): Promise<number> {
    const rates = await this.getRates(["1"]);
    const eurUsd = rates.find((r) => r.instrumentId === "1");
    return eurUsd?.lastPrice || 1;
  }

  /**
   * Get historical candle data (OHLCV).
   */
  async getCandles(instrumentId: string, period: CandlePeriod): Promise<Candle[]> {
    const config = CANDLE_INTERVAL_MAP[period] || CANDLE_INTERVAL_MAP["1M"];
    // eToro candle path: /market-data/instruments/{id}/history/candles/{direction}/{interval}/{count}
    const response = await this.client.get(
      `/market-data/instruments/${instrumentId}/history/candles/asc/${config.interval}/${config.count}`
    );

    // eToro nests candles: { candles: [{ instrumentId, candles: [...data...] }] }
    let candleData: any[] = [];
    if (Array.isArray(response.data)) {
      candleData = response.data;
    } else if (response.data.candles?.[0]?.candles) {
      candleData = response.data.candles[0].candles;
    } else if (response.data.candles) {
      candleData = response.data.candles;
    }

    return candleData.map((c: any) => ({
      timestamp: c.fromDate ?? c.dateTime ?? c.timestamp ?? "",
      open: c.open ?? 0,
      high: c.high ?? 0,
      low: c.low ?? 0,
      close: c.close ?? 0,
      volume: c.volume ?? 0,
    }));
  }
}

// Singleton instance — avoids re-validating env vars on every request
let _instance: EtoroService | null = null;
export function getEtoroService(): EtoroService {
  _instance ??= new EtoroService();
  return _instance;
}
