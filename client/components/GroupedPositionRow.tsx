import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { GroupedPosition } from "@portfolio-tracker/shared";
import { TagChip } from "./TagChip";
import { PositionRow } from "./PositionRow";

interface GroupedPositionRowProps {
  group: GroupedPosition;
  onPositionPress?: (positionId: string) => void;
}

export function GroupedPositionRow({ group, onPositionPress }: GroupedPositionRowProps) {
  const [expanded, setExpanded] = useState(false);
  const isPositive = group.unrealizedPnl >= 0;
  const currentValue = group.totalAmount + group.unrealizedPnl;

  return (
    <View style={styles.container}>
      <Pressable style={styles.row} onPress={() => setExpanded(!expanded)}>
        <View style={styles.top}>
          <View style={styles.left}>
            <View style={styles.tickerRow}>
              <Text style={styles.ticker}>
                {group.ticker || group.instrumentName || `#${group.instrumentId}`}
              </Text>
              {group.positionCount > 1 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{group.positionCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {group.instrumentName || "Unknown instrument"}
            </Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.price}>
              ${currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Text>
            <Text style={[styles.pnl, isPositive ? styles.positive : styles.negative]}>
              {isPositive ? "+" : ""}
              ${group.unrealizedPnl.toFixed(2)} ({isPositive ? "+" : ""}
              {group.unrealizedPnlPercent.toFixed(2)}%)
            </Text>
          </View>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.meta}>
            {group.totalUnits.toFixed(2)} units · avg ${group.averageOpenRate.toFixed(2)}
          </Text>
          <View style={styles.expandHint}>
            <Text style={styles.allocation}>{group.allocationPercent.toFixed(1)}%</Text>
            {group.positionCount > 1 && (
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={14}
                color="#64748b"
              />
            )}
          </View>
        </View>

        {group.tags && group.tags.length > 0 && (
          <View style={styles.tagRow}>
            {group.tags.map((tag) => (
              <TagChip key={tag.id} name={tag.name} color={tag.color} small />
            ))}
          </View>
        )}
      </Pressable>

      {expanded && group.positionCount > 1 && (
        <View style={styles.subPositions}>
          {group.positions.map((pos) => (
            <PositionRow
              key={pos.id}
              position={pos}
              onPress={() => onPositionPress?.(pos.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  row: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
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
  tickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ticker: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  countBadge: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countText: {
    fontSize: 11,
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
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  meta: {
    fontSize: 12,
    color: "#64748b",
  },
  expandHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
  subPositions: {
    marginTop: 4,
    marginLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#334155",
    paddingLeft: 4,
  },
});
