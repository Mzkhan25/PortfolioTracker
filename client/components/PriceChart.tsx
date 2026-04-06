import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";
import type { Candle } from "@portfolio-tracker/shared";
import { Skeleton } from "./Skeleton";

interface PriceChartProps {
  candles: Candle[];
  isLoading?: boolean;
}

export function PriceChart({ candles, isLoading }: PriceChartProps) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonChart}>
          <Skeleton width="100%" height={180} borderRadius={8} />
        </View>
      </View>
    );
  }

  if (candles.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyChart}>
          <Ionicons name="bar-chart-outline" size={32} color="#334155" />
          <Text style={styles.placeholder}>No chart data available</Text>
        </View>
      </View>
    );
  }

  const prices = candles.map((c) => c.close);
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const isPositive = lastPrice >= firstPrice;

  // Show ~6 labels evenly spaced
  const step = Math.max(1, Math.floor(candles.length / 6));
  const labels = candles.map((c, i) => {
    if (i % step === 0 || i === candles.length - 1) {
      const d = new Date(c.timestamp);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }
    return "";
  });

  return (
    <View style={styles.container}>
      <LineChart
        data={{
          labels,
          datasets: [{ data: prices }],
        }}
        width={Dimensions.get("window").width - 32}
        height={200}
        withDots={false}
        withInnerLines={false}
        withOuterLines={false}
        chartConfig={{
          backgroundColor: "#1e293b",
          backgroundGradientFrom: "#1e293b",
          backgroundGradientTo: "#1e293b",
          decimalPlaces: 2,
          color: () => (isPositive ? "#22c55e" : "#ef4444"),
          labelColor: () => "#64748b",
          propsForLabels: { fontSize: 10 },
          style: { borderRadius: 12 },
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  chart: {
    borderRadius: 12,
    paddingRight: 0,
  },
  skeletonChart: {
    padding: 12,
  },
  emptyChart: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  placeholder: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
  },
});
