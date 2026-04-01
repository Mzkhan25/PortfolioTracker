export interface Instrument {
  instrumentId: string;
  name: string;
  ticker: string;
  type: InstrumentType;
  exchangeId: string;
  imageUrl: string | null;
}

export type InstrumentType =
  | "Stocks"
  | "ETF"
  | "Crypto"
  | "Commodities"
  | "Currencies"
  | "Indices";

export interface Rate {
  instrumentId: string;
  bid: number;
  ask: number;
  lastPrice: number;
  dailyChange: number;
  dailyChangePercent: number;
  timestamp: string;
}

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type CandlePeriod = "1D" | "1W" | "1M" | "3M" | "1Y";
