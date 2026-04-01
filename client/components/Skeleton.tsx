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
});
