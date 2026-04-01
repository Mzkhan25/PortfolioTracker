import { View, Text, StyleSheet } from "react-native";

interface PnLBadgeProps {
  value: number;
  percent: number;
  size?: "sm" | "lg";
}

export function PnLBadge({ value, percent, size = "sm" }: PnLBadgeProps) {
  const isPositive = value >= 0;
  const prefix = isPositive ? "+" : "";

  return (
    <View style={[styles.badge, isPositive ? styles.positive : styles.negative]}>
      <Text style={[styles.text, size === "lg" && styles.textLg]}>
        {prefix}${value.toFixed(2)} ({prefix}{percent.toFixed(2)}%)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  positive: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  negative: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
  },
  textLg: {
    fontSize: 16,
  },
});
