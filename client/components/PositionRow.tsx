import { View, Text, StyleSheet, Pressable } from "react-native";
import type { Position } from "@portfolio-tracker/shared";
import { TagChip } from "./TagChip";

interface PositionRowProps {
  position: Position;
  onPress?: () => void;
}

export function PositionRow({ position, onPress }: PositionRowProps) {
  const isPositive = position.unrealizedPnl >= 0;
  const currentValue = position.amount + position.unrealizedPnl;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.top}>
        <View style={styles.left}>
          <Text style={styles.ticker}>{position.ticker || `#${position.instrumentId}`}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {position.instrumentName || "Unknown instrument"}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.price}>
            ${currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </Text>
          <Text style={[styles.pnl, isPositive ? styles.positive : styles.negative]}>
            {isPositive ? "+" : ""}
            ${position.unrealizedPnl.toFixed(2)} ({isPositive ? "+" : ""}
            {position.unrealizedPnlPercent.toFixed(2)}%)
          </Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.meta}>
          {position.units.toFixed(2)} units @ ${position.openRate.toFixed(2)}
        </Text>
        <Text style={styles.allocation}>
          {position.allocationPercent.toFixed(1)}%
        </Text>
      </View>

      {position.tags && position.tags.length > 0 && (
        <View style={styles.tagRow}>
          {position.tags.map((tag) => (
            <TagChip key={tag.id} name={tag.name} color={tag.color} small />
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  left: {
    flex: 1,
    marginRight: 12,
  },
  ticker: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  name: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  right: {
    alignItems: "flex-end",
  },
  price: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  pnl: {
    fontSize: 12,
    marginTop: 2,
  },
  positive: {
    color: "#22c55e",
  },
  negative: {
    color: "#ef4444",
  },
  bottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  meta: {
    fontSize: 12,
    color: "#64748b",
  },
  allocation: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
});
