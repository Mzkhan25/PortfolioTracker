import { Pressable } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";

export default function TabLayout() {
  const { logout } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: {
          backgroundColor: "#0f172a",
          borderTopColor: "#1e293b",
        },
        headerStyle: {
          backgroundColor: "#0f172a",
        },
        headerTintColor: "#ffffff",
        headerRight: () => (
          <Pressable onPress={logout} style={{ marginRight: 16 }}>
            <Ionicons name="log-out-outline" size={22} color="#94a3b8" />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pie-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="positions"
        options={{
          title: "Positions",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: "Market",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
