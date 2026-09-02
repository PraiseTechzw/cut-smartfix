import { Link } from "expo-router";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.page}>
      <View>
        <Text style={styles.eyebrow}>CUT SMARTFIX</Text>
        <Text style={styles.title}>Keep campus moving.</Text>
        <Text style={styles.body}>
          Report a maintenance issue and follow its progress from your phone.
        </Text>
        <Link href="/report" style={styles.action}>
          Report an issue
        </Link>
        <Link href="/reports" style={styles.secondary}>
          View my reports
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: "center",
    padding: 28,
    backgroundColor: "#f4f7f2",
  },
  eyebrow: {
    color: "#0b6b57",
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    color: "#17231f",
    fontSize: 38,
    fontWeight: "800",
    marginBottom: 12,
  },
  body: { color: "#52615b", fontSize: 17, lineHeight: 25, marginBottom: 28 },
  action: {
    backgroundColor: "#0b6b57",
    borderRadius: 10,
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    padding: 16,
    textAlign: "center",
  },
  secondary: {
    color: "#0b6b57",
    fontSize: 16,
    fontWeight: "700",
    padding: 16,
    textAlign: "center",
  },
});
