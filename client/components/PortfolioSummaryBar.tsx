import { View, Text, StyleSheet } from "react-native";

interface PortfolioSummaryBarProps {
  availableCash: number;
  totalInvested: number;
  profitLoss: number;
  totalValue: number;
}

function formatValue(value: number): string {
  return `€${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PortfolioSummaryBar({
  availableCash,
  totalInvested,
  profitLoss,
  totalValue,
}: PortfolioSummaryBarProps) {
  const isPositive = profitLoss >= 0;

  return (
    <View style={styles.bar}>
      <View style={styles.item}>
        <Text style={styles.value}>{formatValue(availableCash)}</Text>
        <Text style={styles.label}>Available Cash</Text>
      </View>
      <Text style={styles.operator}>+</Text>
      <View style={styles.item}>
        <Text style={styles.value}>{formatValue(totalInvested)}</Text>
        <Text style={styles.label}>Total Invested</Text>
      </View>
      <Text style={styles.operator}>+</Text>
      <View style={styles.item}>
        <Text style={[styles.value, isPositive ? styles.positive : styles.negative]}>
          {formatValue(profitLoss)}
        </Text>
        <Text style={styles.label}>Profit/Loss</Text>
      </View>
      <Text style={styles.operator}>=</Text>
      <View style={styles.item}>
        <Text style={styles.value}>{formatValue(totalValue)}</Text>
        <Text style={styles.label}>Total Value</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#0f172a",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  item: {
    alignItems: "center",
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  label: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  operator: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },
  positive: {
    color: "#22c55e",
  },
  negative: {
    color: "#ef4444",
  },
});
