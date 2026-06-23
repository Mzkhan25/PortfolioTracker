import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTradeHistory, Trade } from "../../hooks/useTradeHistory";
import { ErrorState } from "../../components/ErrorState";
import { SkeletonTradeRow, Skeleton } from "../../components/Skeleton";

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
            <Text style={[styles.directionText, trade.isBuy ? styles.buyText : styles.sellText]}>
              {trade.isBuy ? "Buy" : "Sell"}
            </Text>
          </View>
          <Text style={styles.tradeName} numberOfLines={1}>
            {trade.instrumentName || "Unknown"}
          </Text>
        </View>
        <View style={styles.tradeRight}>
          <Text style={[styles.tradeProfit, isPositive ? styles.positive : styles.negative]}>
            {isPositive ? "+" : ""}€{trade.netProfit.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.tradeBottom}>
        <Text style={styles.tradeMeta}>
          {formatDate(trade.openDate)} → {formatDate(trade.closeDate)}
        </Text>
        <Text style={styles.tradeMeta}>
          €{trade.openRate.toFixed(2)} → €{trade.closeRate.toFixed(2)}
        </Text>
      </View>

      <View style={styles.tradeDetails}>
        <Text style={styles.tradeDetail}>Invested: €{trade.investment.toFixed(2)}</Text>
        <Text style={styles.tradeDetail}>Units: {trade.units.toFixed(2)}</Text>
        {trade.fees > 0 && <Text style={styles.tradeDetail}>Fees: €{trade.fees.toFixed(2)}</Text>}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange>("3M");
  const [sortBy, setSortBy] = useState<SortKey>("date");

  const minDate = getMinDate(dateRange);
  const { data, isLoading, isError, refetch, isRefetching } = useTradeHistory(page, 20, minDate);

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
        {isLoading ? (
          <>
            <View>
              <Skeleton width={120} height={13} />
              <Skeleton width={60} height={12} style={{ marginTop: 6 }} />
            </View>
            <Skeleton width={120} height={22} />
          </>
        ) : (
          <>
            <View>
              <Text style={styles.summaryLabel}>Realized P&L ({dateRange})</Text>
              <Text style={styles.summaryCount}>{data?.total ?? 0} trades</Text>
            </View>
            <Text style={[styles.summaryValue, isPositiveTotal ? styles.positive : styles.negative]}>
              {isPositiveTotal ? "+" : ""}€{totalProfit.toFixed(2)}
            </Text>
          </>
        )}
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
          isLoading ? (
            <View>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonTradeRow key={i} />
              ))}
            </View>
          ) : isError ? (
            <ErrorState message="Failed to load trade history" onRetry={refetch} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color="#334155" />
              <Text style={styles.emptyText}>No trades in this period</Text>
              <Text style={styles.emptySubtext}>
                Try expanding the date range above
              </Text>
            </View>
          )
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
  summary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  summaryLabel: { fontSize: 12, color: "#64748b" },
  summaryValue: { fontSize: 22, fontWeight: "700", marginTop: 2 },
  summaryCount: { fontSize: 12, color: "#64748b" },
  positive: { color: "#22c55e" },
  negative: { color: "#ef4444" },
  filterRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#475569", backgroundColor: "transparent" },
  filterBtnActive: { borderColor: "#ffffff", backgroundColor: "transparent" },
  filterText: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  filterTextActive: { color: "#ffffff" },
  sortRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  sortLabel: { fontSize: 13, color: "#64748b" },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: "#475569", backgroundColor: "transparent" },
  sortBtnActive: { borderColor: "#ffffff", backgroundColor: "transparent" },
  sortText: { fontSize: 12, color: "#64748b", fontWeight: "500" },
  sortTextActive: { color: "#ffffff" },
  tradeRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  tradeTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  tradeLeft: { flex: 1, marginRight: 12 },
  tradeHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  tradeTicker: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
  directionText: { fontSize: 12, fontWeight: "600" },
  buyText: { color: "#22c55e" },
  sellText: { color: "#ef4444" },
  tradeName: { fontSize: 12, color: "#64748b", marginTop: 2 },
  tradeRight: { alignItems: "flex-end" },
  tradeProfit: { fontSize: 16, fontWeight: "700" },
  tradeBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  tradeMeta: { fontSize: 11, color: "#475569" },
  tradeDetails: { flexDirection: "row", gap: 12, marginTop: 4 },
  tradeDetail: { fontSize: 11, color: "#334155" },
  pagination: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 16, gap: 16 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#475569", backgroundColor: "transparent" },
  pageBtnDisabled: { opacity: 0.4 },
  pageText: { fontSize: 13, color: "#94a3b8", fontWeight: "500" },
  pageInfo: { fontSize: 13, color: "#64748b" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: 32 },
  emptyText: { fontSize: 16, color: "#64748b", marginTop: 12 },
  emptySubtext: { fontSize: 13, color: "#475569", marginTop: 4, textAlign: "center" },
  emptyList: { flexGrow: 1 },
});
