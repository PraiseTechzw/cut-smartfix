import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, Text } from "react-native";

const PRIMARY = "#0b6b57";
const MUTED = "#52615b";

// Type cast workaround: @types/react version mismatch between expo-router and workspace
// (same pattern used in the original _layout.tsx scaffold)
type TabsType = React.ComponentType<{
  screenOptions?: {
    headerShown?: boolean;
    tabBarActiveTintColor?: string;
    tabBarInactiveTintColor?: string;
    tabBarStyle?: object;
    tabBarLabelStyle?: object;
  };
  children?: React.ReactNode;
}> & {
  Screen: React.ComponentType<{
    name: string;
    options?: {
      title?: string;
      tabBarIcon?: (props: { focused: boolean; color: string }) => React.ReactNode;
    };
  }>;
};

const TabsNav = Tabs as unknown as TabsType;

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={[styles.icon, focused && styles.iconActive]}>{emoji}</Text>
  );
}

export default function TabsLayout() {
  return (
    <TabsNav
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
      }}
    >
      <TabsNav.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" focused={focused} />
          ),
        }}
      />
      <TabsNav.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📋" focused={focused} />
          ),
        }}
      />
      <TabsNav.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🔔" focused={focused} />
          ),
        }}
      />
      <TabsNav.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" focused={focused} />
          ),
        }}
      />
    </TabsNav>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#fff",
    borderTopColor: "#e4ede7",
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
  icon: {
    fontSize: 22,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
  },
});
