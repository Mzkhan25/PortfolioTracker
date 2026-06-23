import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { Ionicons } from "@expo/vector-icons";
import { Skeleton } from "./Skeleton";

interface ChartDataPoint {
  value: number;
  label?: string;
  dataPointText?: string;
}

interface PortfolioChartProps {
  data: ChartDataPoint[];
  isLoading?: boolean;
  height?: number;
  color?: string;
  showYAxis?: boolean;
}

export function PortfolioChart({
  data,
  isLoading,
  height = 200,
  color,
  showYAxis = true,
}: PortfolioChartProps) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonChart}>
          <Skeleton width="100%" height={height} borderRadius={8} />
        </View>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.emptyChart, { height }]}>
          <Ionicons name="bar-chart-outline" size={32} color="#334155" />
          <Text style={styles.placeholder}>No chart data available</Text>
        </View>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const firstVal = values[0];
  const lastVal = values[values.length - 1];
  const isPositive = lastVal >= firstVal;
  const lineColor = color || (isPositive ? "#22c55e" : "#ef4444");

  const chartWidth = Dimensions.get("window").width - 64;

  return (
    <View style={styles.container}>
      <LineChart
        data={data}
        width={chartWidth}
        height={height}
        color={lineColor}
        thickness={2}
        hideDataPoints
        hideRules
        yAxisColor="transparent"
        xAxisColor="#334155"
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        noOfSections={4}
        yAxisSide={1}
        spacing={Math.max(2, chartWidth / data.length)}
        initialSpacing={0}
        endSpacing={0}
        adjustToWidth
        areaChart
        startFillColor={lineColor}
        endFillColor="transparent"
        startOpacity={0.15}
        endOpacity={0}
        pointerConfig={{
          pointerStripColor: "#475569",
          pointerStripWidth: 1,
          pointerColor: lineColor,
          radius: 4,
          pointerLabelWidth: 100,
          pointerLabelHeight: 24,
          pointerLabelComponent: (items: any[]) => {
            const val = items[0]?.value;
            return (
              <View style={styles.tooltipContainer}>
                <Text style={styles.tooltipText}>
                  {typeof val === "number"
                    ? `€${val.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                    : ""}
                </Text>
              </View>
            );
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  skeletonChart: {
    padding: 12,
  },
  emptyChart: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholder: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
  },
  axisText: {
    color: "#64748b",
    fontSize: 10,
  },
  tooltipContainer: {
    backgroundColor: "#1e293b",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#334155",
  },
  tooltipText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
});
