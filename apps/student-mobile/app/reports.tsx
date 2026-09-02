import { Link } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { MaintenanceReport } from "@cut-smartfix/contracts";

export default function ReportsScreen() {
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(
      `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000"}/v1/reports`,
    )
      .then(async (response) => {
        if (response.ok) setReports((await response.json()).data ?? []);
      })
      .finally(() => setLoading(false));
  }, []);
  return (
    <SafeAreaView style={styles.page}>
      <Text style={styles.eyebrow}>STUDENT PORTAL</Text>
      <Text style={styles.title}>My reports</Text>
      {loading ? (
        <ActivityIndicator color="#0b6b57" />
      ) : reports.length === 0 ? (
        <View>
          <Text style={styles.body}>
            No reports yet. When you submit an issue, its progress will appear
            here.
          </Text>
          <Link href="/report" style={styles.action}>
            Report an issue
          </Link>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.ticket}>{item.ticketNumber}</Text>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.status}>{item.status.replace("_", " ")}</Text>
            </View>
          )}
        />
      )}
      <Link href="/" style={styles.link}>
        Back to dashboard
      </Link>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, padding: 28, backgroundColor: "#f4f7f2" },
  eyebrow: {
    color: "#0b6b57",
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 24,
  },
  title: {
    color: "#17231f",
    fontSize: 32,
    fontWeight: "800",
    marginVertical: 16,
  },
  body: { color: "#52615b", fontSize: 17, lineHeight: 25, marginBottom: 20 },
  item: {
    backgroundColor: "#fff",
    borderLeftColor: "#e3b23c",
    borderLeftWidth: 4,
    marginBottom: 12,
    padding: 16,
  },
  ticket: {
    color: "#0b6b57",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  itemTitle: {
    color: "#17231f",
    fontSize: 17,
    fontWeight: "700",
    marginVertical: 7,
  },
  status: { color: "#52615b", textTransform: "capitalize" },
  action: { color: "#0b6b57", fontWeight: "700" },
  link: { color: "#0b6b57", fontWeight: "700", marginTop: 18 },
});
