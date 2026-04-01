import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || "An unexpected error occurred"}
          </Text>
          <Pressable style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});
