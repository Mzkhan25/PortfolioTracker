import type { Position } from "@portfolio-tracker/shared";
import { EtoroService } from "./etoro.js";

/**
 * Enrich positions with instrument names, tickers, and current rates.
 * Logs warnings on failure instead of silently swallowing errors.
 */
export async function enrichPositions(
  positions: Position[],
  etoro: EtoroService
): Promise<void> {
  const instrumentIds = [...new Set(positions.map((p) => p.instrumentId))];
  if (instrumentIds.length === 0) return;

  // Enrich instrument names (cached for 24h)
  try {
    const instruments = await etoro.getInstruments();
    const instrumentMap = new Map(instruments.map((i) => [i.instrumentId, i]));

    for (const pos of positions) {
      const instrument = instrumentMap.get(pos.instrumentId);
      if (instrument) {
        pos.instrumentName = instrument.name;
        pos.ticker = instrument.ticker;
      }
    }
  } catch (err) {
    console.warn(
      "Failed to enrich instrument names:",
      err instanceof Error ? err.message : err
    );
  }

  // Enrich current rates
  try {
    const rates = await etoro.getRates(instrumentIds);
    for (const pos of positions) {
      const rate = rates.find((r) => r.instrumentId === pos.instrumentId);
      if (rate) {
        pos.currentRate = rate.lastPrice;
      }
    }
  } catch (err) {
    console.warn(
      "Failed to enrich rates:",
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Enrich trade objects with instrument names and tickers.
 * Trades use the same instrumentId field as positions.
 */
export async function enrichTrades(
  trades: Array<{ instrumentId: string; instrumentName: string; ticker: string }>,
  etoro: EtoroService
): Promise<void> {
  if (trades.length === 0) return;

  try {
    const instruments = await etoro.getInstruments();
    const instrumentMap = new Map(instruments.map((i) => [i.instrumentId, i]));

    for (const trade of trades) {
      const instrument = instrumentMap.get(trade.instrumentId);
      if (instrument) {
        trade.instrumentName = instrument.name;
        trade.ticker = instrument.ticker;
      }
    }
  } catch (err) {
    console.warn(
      "Failed to enrich trade instrument names:",
      err instanceof Error ? err.message : err
    );
  }
}
