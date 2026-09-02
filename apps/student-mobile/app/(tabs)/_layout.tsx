import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

// Design tokens
const GREEN = "#0b6b57";
const MUTED = "#8ea89f";
const BG = "#fff";
const BORDER = "#e4ede7";

// ---------------------------------------------------------------------------
// Icon components — drawn with pure View/StyleSheet shapes, no external libs
// ---------------------------------------------------------------------------

function HomeIcon({ color, filled }: { color: string; filled: boolean }) {
  return (
    <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "flex-end" }}>
      {/* roof triangle */}
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 12,
          borderRightWidth: 12,
          borderBottomWidth: 10,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: color,
          marginBottom: -1,
        }}
      />
      {/* body */}
      <View
        style={{
          width: 18,
          height: 12,
          borderWidth: filled ? 0 : 1.8,
          borderColor: color,
          backgroundColor: filled ? color : "transparent",
          borderTopWidth: 0,
        }}
      >
        {/* door */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 5,
            width: 8,
            height: 8,
            backgroundColor: filled ? "rgba(255,255,255,0.5)" : "transparent",
            borderWidth: filled ? 0 : 1,
            borderColor: color,
          }}
        />
      </View>
    </View>
  );
}

function ReportsIcon({ color, filled }: { color: string; filled: boolean }) {
  return (
    <View
      style={{
        width: 22,
        height: 24,
        borderWidth: filled ? 0 : 1.8,
        borderColor: color,
        backgroundColor: filled ? color : "transparent",
        borderRadius: 3,
        justifyContent: "center",
        paddingHorizontal: 4,
        gap: 3,
      }}
    >
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            height: 2,
            backgroundColor: filled ? "rgba(255,255,255,0.9)" : color,
            borderRadius: 1,
            width: i === 2 ? "60%" : "100%",
          }}
        />
      ))}
    </View>
  );
}

function BellIcon({ color, filled }: { color: string; filled: boolean }) {
  return (
    <View style={{ width: 24, height: 24, alignItems: "center" }}>
      {/* bell dome */}
      <View
        style={{
          width: 18,
          height: 16,
          marginTop: 3,
          borderWidth: filled ? 0 : 1.8,
          borderColor: color,
          backgroundColor: filled ? color : "transparent",
          borderRadius: 9,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
      />
      {/* bell base bar */}
      <View
        style={{
          width: 8,
          height: 3,
          backgroundColor: color,
          borderBottomLeftRadius: 4,
          borderBottomRightRadius: 4,
          marginTop: -1,
        }}
      />
      {/* clapper */}
      <View
        style={{
          width: 6,
          height: 2,
          borderWidth: 1.5,
          borderColor: color,
          borderRadius: 3,
          marginTop: 0,
        }}
      />
    </View>
  );
}

function ProfileIcon({ color, filled }: { color: string; filled: boolean }) {
  return (
    <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "flex-end" }}>
      {/* head */}
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          borderWidth: filled ? 0 : 1.8,
          borderColor: color,
          backgroundColor: filled ? color : "transparent",
          marginBottom: 2,
        }}
      />
      {/* shoulders / body arc */}
      <View
        style={{
          width: 20,
          height: 8,
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          borderWidth: filled ? 0 : 1.8,
          borderBottomWidth: 0,
          borderColor: color,
          backgroundColor: filled ? color : "transparent",
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Active indicator pill shown above the icon
// ---------------------------------------------------------------------------

function ActivePill() {
  return (
    <View
      style={{
        width: 20,
        height: 3,
        borderRadius: 2,
        backgroundColor: GREEN,
        marginBottom: 4,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Wrapper that renders the optional pill + icon together
// ---------------------------------------------------------------------------

function TabIconWrapper({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={{ alignItems: "center" }}>
      {focused ? <ActivePill /> : <View style={{ height: 7 }} />}
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Type cast workaround: @types/react version mismatch between expo-router
// and workspace (same pattern used in the original _layout.tsx scaffold)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function TabsLayout() {
  return (
    <TabsNav
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: GREEN,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
      }}
    >
      <TabsNav.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color }) => (
            <TabIconWrapper focused={focused}>
              <HomeIcon color={color} filled={focused} />
            </TabIconWrapper>
          ),
        }}
      />
      <TabsNav.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ focused, color }) => (
            <TabIconWrapper focused={focused}>
              <ReportsIcon color={color} filled={focused} />
            </TabIconWrapper>
          ),
        }}
      />
      <TabsNav.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ focused, color }) => (
            <TabIconWrapper focused={focused}>
              <BellIcon color={color} filled={focused} />
            </TabIconWrapper>
          ),
        }}
      />
      <TabsNav.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, color }) => (
            <TabIconWrapper focused={focused}>
              <ProfileIcon color={color} filled={focused} />
            </TabIconWrapper>
          ),
        }}
      />
    </TabsNav>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: BG,
    borderTopColor: BORDER,
    borderTopWidth: 1,
    height: 68,
    paddingBottom: 10,
    paddingTop: 6,
    // Subtle shadow for iOS
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
});
