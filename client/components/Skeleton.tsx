import { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle } from "react-native";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton width={80} height={12} />
      <Skeleton width={120} height={24} style={{ marginTop: 8 }} />
    </View>
  );
}

export function SkeletonPositionRow() {
  return (
    <View style={styles.positionRow}>
      <View style={{ flex: 1 }}>
        <Skeleton width={60} height={16} />
        <Skeleton width={120} height={12} style={{ marginTop: 6 }} />
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Skeleton width={80} height={16} />
        <Skeleton width={60} height={12} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

/** Skeleton for the dashboard header (value + PnL badge) */
export function SkeletonDashboardHeader() {
  return (
    <View style={styles.dashboardHeader}>
      <Skeleton width={120} height={14} />
      <Skeleton width={200} height={36} style={{ marginTop: 8 }} />
      <Skeleton width={140} height={28} borderRadius={14} style={{ marginTop: 8 }} />
    </View>
  );
}

/** Skeleton for the line/pie chart area */
export function SkeletonChart() {
  return (
    <View style={styles.chart}>
      <Skeleton width={100} height={14} style={{ marginBottom: 12 }} />
      <Skeleton width="100%" height={160} borderRadius={12} />
    </View>
  );
}

/** Skeleton for trade history rows */
export function SkeletonTradeRow() {
  return (
    <View style={styles.tradeRow}>
      <View style={styles.tradeRowTop}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Skeleton width={70} height={16} />
            <Skeleton width={36} height={18} borderRadius={4} />
          </View>
          <Skeleton width={100} height={12} style={{ marginTop: 6 }} />
        </View>
        <Skeleton width={80} height={20} />
      </View>
      <View style={styles.tradeRowBottom}>
        <Skeleton width={130} height={12} />
        <Skeleton width={100} height={12} />
      </View>
    </View>
  );
}

/** Skeleton for market screen price header */
export function SkeletonPriceHeader() {
  return (
    <View style={styles.priceHeader}>
      <Skeleton width={100} height={14} />
      <Skeleton width={140} height={32} style={{ marginTop: 4 }} />
      <Skeleton width={80} height={14} style={{ marginTop: 4 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#334155",
  },
  card: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
  },
  positionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  dashboardHeader: {
    alignItems: "center",
    padding: 24,
    gap: 0,
  },
  chart: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  tradeRow: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  tradeRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tradeRowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  priceHeader: {
    alignItems: "center",
    paddingVertical: 16,
  },
});
