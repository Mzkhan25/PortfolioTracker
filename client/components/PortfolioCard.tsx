import { View, Text, StyleSheet } from "react-native";

interface PortfolioCardProps {
  label: string;
  value: string;
  change?: string;
  isPositive?: boolean;
}

export function PortfolioCard({ label, value, change, isPositive }: PortfolioCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {change && (
        <Text style={[styles.change, isPositive ? styles.positive : styles.negative]}>
          {change}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
  },
  change: {
    fontSize: 13,
    marginTop: 4,
  },
  positive: {
    color: "#22c55e",
  },
  negative: {
    color: "#ef4444",
  },
});
