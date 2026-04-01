import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Failed to load data",
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline" size={40} color="#475569" />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Pressable style={styles.button} onPress={onRetry}>
          <Ionicons name="refresh" size={16} color="#ffffff" />
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 12,
  },
  message: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
});
