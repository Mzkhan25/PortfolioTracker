import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from "react-native";
import { useTradeHistory, Trade } from "../../hooks/useTradeHistory";

type DateRange = "1M" | "3M" | "6M" | "1Y" | "ALL";
type SortKey = "date" | "pnl";

function getMinDate(range: DateRange): string | undefined {
  if (range === "ALL") return undefined;
  const now = new Date();
  const months = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12 };
  now.setMonth(now.getMonth() - months[range]);
  return now.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}

function TradeRow({ trade }: { trade: Trade }) {
  const isPositive = trade.netProfit >= 0;

  return (
    <View style={styles.tradeRow}>
      <View style={styles.tradeTop}>
        <View style={styles.tradeLeft}>
          <View style={styles.tradeHeader}>
            <Text style={styles.tradeTicker}>
              {trade.ticker || `#${trade.instrumentId}`}
            </Text>
            <View style={[styles.directionBadge, trade.isBuy ? styles.buyBadge : styles.sellBadge]}>
              <Text style={styles.directionText}>{trade.isBuy ? "BUY" : "SELL"}</Text>
            </View>
          </View>
          <Text style={styles.tradeName} numberOfLines={1}>
            {trade.instrumentName || "Unknown"}
          </Text>
        </View>
        <View style={styles.tradeRight}>
          <Text style={[styles.tradeProfit, isPositive ? styles.positive : styles.negative]}>
            {isPositive ? "+" : ""}${trade.netProfit.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.tradeBottom}>
        <Text style={styles.tradeMeta}>
          {formatDate(trade.openDate)} → {formatDate(trade.closeDate)}
        </Text>
        <Text style={styles.tradeMeta}>
          ${trade.openRate.toFixed(2)} → ${trade.closeRate.toFixed(2)}
        </Text>
      </View>

      <View style={styles.tradeDetails}>
        <Text style={styles.tradeDetail}>Invested: ${trade.investment.toFixed(2)}</Text>
        <Text style={styles.tradeDetail}>Units: {trade.units.toFixed(2)}</Text>
        {trade.fees > 0 && <Text style={styles.tradeDetail}>Fees: ${trade.fees.toFixed(2)}</Text>}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange>("3M");
  const [sortBy, setSortBy] = useState<SortKey>("date");

  const minDate = getMinDate(dateRange);
  const { data, isLoading, refetch, isRefetching } = useTradeHistory(page, 20, minDate);

  const trades = data?.items || [];
  const sorted = [...trades].sort((a, b) => {
    if (sortBy === "pnl") return b.netProfit - a.netProfit;
    return new Date(b.closeDate).getTime() - new Date(a.closeDate).getTime();
  });

  const totalProfit = trades.reduce((sum, t) => sum + t.netProfit, 0);
  const isPositiveTotal = totalProfit >= 0;

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Realized P&L ({dateRange})</Text>
        <Text style={[styles.summaryValue, isPositiveTotal ? styles.positive : styles.negative]}>
          {isPositiveTotal ? "+" : ""}${totalProfit.toFixed(2)}
        </Text>
        <Text style={styles.summaryCount}>{data?.total ?? 0} trades</Text>
      </View>

      {/* Date Range Filter */}
      <View style={styles.filterRow}>
        {(["1M", "3M", "6M", "1Y", "ALL"] as DateRange[]).map((range) => (
          <Pressable
            key={range}
            style={[styles.filterBtn, dateRange === range && styles.filterBtnActive]}
            onPress={() => { setDateRange(range); setPage(1); }}
          >
            <Text style={[styles.filterText, dateRange === range && styles.filterTextActive]}>
              {range}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Sort */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort:</Text>
        <Pressable
          style={[styles.sortBtn, sortBy === "date" && styles.sortBtnActive]}
          onPress={() => setSortBy("date")}
        >
          <Text style={[styles.sortText, sortBy === "date" && styles.sortTextActive]}>Date</Text>
        </Pressable>
        <Pressable
          style={[styles.sortBtn, sortBy === "pnl" && styles.sortBtnActive]}
          onPress={() => setSortBy("pnl")}
        >
          <Text style={[styles.sortText, sortBy === "pnl" && styles.sortTextActive]}>P&L</Text>
        </Pressable>
      </View>

      {/* Trade List */}
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TradeRow trade={item} />}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isLoading ? "Loading trade history..." : "No trades in this period"}
            </Text>
          </View>
        }
        ListFooterComponent={
          data && data.totalPages > 1 ? (
            <View style={styles.pagination}>
              <Pressable
                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <Text style={styles.pageText}>← Prev</Text>
              </Pressable>
              <Text style={styles.pageInfo}>
                {page} / {data.totalPages}
              </Text>
              <Pressable
                style={[styles.pageBtn, page >= data.totalPages && styles.pageBtnDisabled]}
                onPress={() => setPage((p) => p + 1)}
                disabled={page >= data.totalPages}
              >
                <Text style={styles.pageText}>Next →</Text>
              </Pressable>
            </View>
          ) : null
        }
        contentContainerStyle={sorted.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  summary: { alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  summaryLabel: { fontSize: 13, color: "#94a3b8" },
  summaryValue: { fontSize: 28, fontWeight: "bold", marginTop: 4 },
  summaryCount: { fontSize: 12, color: "#64748b", marginTop: 4 },
  positive: { color: "#22c55e" },
  negative: { color: "#ef4444" },
  filterRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: "#1e293b" },
  filterBtnActive: { backgroundColor: "#3b82f6" },
  filterText: { fontSize: 13, color: "#94a3b8", fontWeight: "500" },
  filterTextActive: { color: "#ffffff" },
  sortRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  sortLabel: { fontSize: 13, color: "#64748b" },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: "#1e293b" },
  sortBtnActive: { backgroundColor: "#3b82f6" },
  sortText: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },
  sortTextActive: { color: "#ffffff" },
  tradeRow: { backgroundColor: "#1e293b", borderRadius: 12, padding: 14, marginHorizontal: 16, marginBottom: 8 },
  tradeTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  tradeLeft: { flex: 1, marginRight: 12 },
  tradeHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  tradeTicker: { fontSize: 16, fontWeight: "600", color: "#ffffff" },
  directionBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  buyBadge: { backgroundColor: "rgba(34, 197, 94, 0.2)" },
  sellBadge: { backgroundColor: "rgba(239, 68, 68, 0.2)" },
  directionText: { fontSize: 10, fontWeight: "700", color: "#94a3b8" },
  tradeName: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  tradeRight: { alignItems: "flex-end" },
  tradeProfit: { fontSize: 18, fontWeight: "700" },
  tradeBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#334155" },
  tradeMeta: { fontSize: 12, color: "#64748b" },
  tradeDetails: { flexDirection: "row", gap: 12, marginTop: 6 },
  tradeDetail: { fontSize: 11, color: "#475569" },
  pagination: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 16, gap: 16 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: "#1e293b" },
  pageBtnDisabled: { opacity: 0.4 },
  pageText: { fontSize: 13, color: "#94a3b8", fontWeight: "500" },
  pageInfo: { fontSize: 13, color: "#64748b" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  emptyText: { fontSize: 16, color: "#64748b" },
  emptyList: { flexGrow: 1 },
});
