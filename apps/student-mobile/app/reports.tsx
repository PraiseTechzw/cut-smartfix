import { Link } from "expo-router";
import { SafeAreaView, StyleSheet, Text } from "react-native";

export default function ReportsScreen() {
  return (
    <SafeAreaView style={styles.page}>
      <Text style={styles.title}>My reports</Text>
      <Text style={styles.body}>
        Your submitted maintenance tickets will appear here.
      </Text>
      <Link href="/" style={styles.link}>
        Back to dashboard
      </Link>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, padding: 28, backgroundColor: "#f4f7f2" },
  title: { color: "#17231f", fontSize: 32, fontWeight: "800", marginTop: 40 },
  body: { color: "#52615b", fontSize: 17, lineHeight: 25, marginVertical: 16 },
  link: { color: "#0b6b57", fontWeight: "700" },
});
