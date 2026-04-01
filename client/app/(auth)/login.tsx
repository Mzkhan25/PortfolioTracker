import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";

export default function LoginScreen() {
  const [apiKey, setApiKey] = useState("");
  const [userKey, setUserKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!apiKey.trim() || !userKey.trim()) {
      setError("Both API Key and User Key are required");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await login(apiKey.trim(), userKey.trim());
      // Auth guard in _layout.tsx handles navigation to (tabs)
    } catch (err: any) {
      const message =
        err.response?.data?.error || "Failed to connect. Check your keys and try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>PortfolioTracker</Text>
        <Text style={styles.subtitle}>Connect your eToro account</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Go to eToro Settings → Trading → API Key Management to create your keys.
            Use "Read" permission for view-only access.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>API Key</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="Your eToro API Key"
            placeholderTextColor="#475569"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />

          <Text style={styles.label}>User Key</Text>
          <TextInput
            style={styles.input}
            value={userKey}
            onChangeText={setUserKey}
            placeholder="Your eToro User Key"
            placeholderTextColor="#475569"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Connect to eToro</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 32,
  },
  infoBox: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
  },
  infoText: {
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 20,
  },
  form: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: "#cbd5e1",
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#334155",
  },
  error: {
    color: "#ef4444",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  button: {
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
