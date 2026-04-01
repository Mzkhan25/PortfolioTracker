import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import type { CandlePeriod } from "@portfolio-tracker/shared";
import { usePositions } from "../../hooks/usePortfolio";
import { useCandles, useRates } from "../../hooks/useMarketData";
import { PriceChart } from "../../components/PriceChart";

const PERIODS: CandlePeriod[] = ["1D", "1W", "1M", "3M", "1Y"];

export default function MarketScreen() {
  const { data: positions } = usePositions();
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null);
  const [period, setPeriod] = useState<CandlePeriod>("1M");

  // Unique instruments from portfolio
  const instruments = (positions || []).reduce<
    { id: string; ticker: string; name: string }[]
  >((acc, p) => {
    if (!acc.find((i) => i.id === p.instrumentId)) {
      acc.push({
        id: p.instrumentId,
        ticker: p.ticker || `#${p.instrumentId}`,
        name: p.instrumentName || "Unknown",
      });
    }
    return acc;
  }, []);

  const activeInstrument = selectedInstrument || instruments[0]?.id || "";
  const activeInfo = instruments.find((i) => i.id === activeInstrument);

  const { data: candles, isLoading: candlesLoading, refetch } = useCandles(activeInstrument, period);
  const { data: rates } = useRates(activeInstrument ? [activeInstrument] : []);

  const currentRate = rates?.[0];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={refetch} tintColor="#3b82f6" />
      }
    >
      {/* Instrument Picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pickerBar}
        contentContainerStyle={styles.pickerContent}
      >
        {instruments.map((inst) => (
          <Pressable
            key={inst.id}
            style={[
              styles.pickerItem,
              activeInstrument === inst.id && styles.pickerItemActive,
            ]}
            onPress={() => setSelectedInstrument(inst.id)}
          >
            <Text
              style={[
                styles.pickerText,
                activeInstrument === inst.id && styles.pickerTextActive,
              ]}
            >
              {inst.ticker}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Current Price */}
      {activeInfo && (
        <View style={styles.priceHeader}>
          <Text style={styles.instrumentName}>{activeInfo.name}</Text>
          <Text style={styles.currentPrice}>
            {currentRate
              ? `$${currentRate.lastPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : "--"}
          </Text>
          {currentRate && currentRate.dailyChangePercent !== 0 && (
            <Text
              style={[
                styles.dailyChange,
                currentRate.dailyChangePercent >= 0 ? styles.positive : styles.negative,
              ]}
            >
              {currentRate.dailyChangePercent >= 0 ? "+" : ""}
              {currentRate.dailyChangePercent.toFixed(2)}% today
            </Text>
          )}
        </View>
      )}

      {/* Chart */}
      <PriceChart candles={candles || []} isLoading={candlesLoading} />

      {/* Period Selector */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <Pressable
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Rate Details */}
      {currentRate && (
        <View style={styles.rateDetails}>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>Bid</Text>
            <Text style={styles.rateValue}>${currentRate.bid.toFixed(2)}</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>Ask</Text>
            <Text style={styles.rateValue}>${currentRate.ask.toFixed(2)}</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>Spread</Text>
            <Text style={styles.rateValue}>
              ${(currentRate.ask - currentRate.bid).toFixed(4)}
            </Text>
          </View>
        </View>
      )}

      {instruments.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Connect to eToro to see market data for your portfolio instruments
          </Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  pickerBar: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  pickerContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: "row" },
  pickerItem: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: "#1e293b" },
  pickerItemActive: { backgroundColor: "#3b82f6" },
  pickerText: { fontSize: 13, fontWeight: "600", color: "#94a3b8" },
  pickerTextActive: { color: "#ffffff" },
  priceHeader: { alignItems: "center", paddingVertical: 16 },
  instrumentName: { fontSize: 14, color: "#94a3b8" },
  currentPrice: { fontSize: 32, fontWeight: "bold", color: "#ffffff", marginTop: 4 },
  dailyChange: { fontSize: 14, marginTop: 4 },
  positive: { color: "#22c55e" },
  negative: { color: "#ef4444" },
  periodRow: { flexDirection: "row", justifyContent: "center", paddingVertical: 16, gap: 8 },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: "#1e293b" },
  periodBtnActive: { backgroundColor: "#3b82f6" },
  periodText: { fontSize: 13, fontWeight: "600", color: "#94a3b8" },
  periodTextActive: { color: "#ffffff" },
  rateDetails: { marginHorizontal: 16, backgroundColor: "#1e293b", borderRadius: 12, padding: 16 },
  rateRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  rateLabel: { fontSize: 14, color: "#94a3b8" },
  rateValue: { fontSize: 14, fontWeight: "600", color: "#ffffff" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: 32 },
  emptyText: { fontSize: 16, color: "#64748b", textAlign: "center" },
});
