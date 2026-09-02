import { Link } from "expo-router";
import { SafeAreaView, StyleSheet, Text } from "react-native";

export default function ReportScreen() {
  return (
    <SafeAreaView style={styles.page}>
      <Text style={styles.title}>Report an issue</Text>
      <Text style={styles.body}>
        The guided report form will collect location, category, urgency,
        description, and photos.
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
