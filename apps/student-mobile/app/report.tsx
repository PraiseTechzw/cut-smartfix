import { Link, router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Urgency } from "@cut-smartfix/contracts";

export default function ReportScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [building, setBuilding] = useState("");
  const [room, setRoom] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!title.trim() || description.trim().length < 10 || !building.trim()) {
      Alert.alert(
        "More details needed",
        "Add a title, building, and at least 10 characters describing the issue.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000"}/v1/reports`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            urgency,
            location: { campus: "CUT Main Campus", building, room },
          }),
        },
      );
      if (!response.ok) throw new Error("Unable to submit report");
      Alert.alert("Report submitted", "Your maintenance ticket was created.", [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
    } catch {
      Alert.alert(
        "Could not submit",
        "Please sign in and check your connection before trying again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>NEW TICKET</Text>
        <Text style={styles.title}>Report an issue</Text>
        <Text style={styles.body}>
          Give maintenance enough detail to find and fix it quickly.
        </Text>
        <TextInput
          placeholder="What needs attention?"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />
        <TextInput
          placeholder="Building"
          value={building}
          onChangeText={setBuilding}
          style={styles.input}
        />
        <TextInput
          placeholder="Room or facility (optional)"
          value={room}
          onChangeText={setRoom}
          style={styles.input}
        />
        <TextInput
          placeholder="Describe the problem"
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.input, styles.description]}
        />
        <Text style={styles.label}>Urgency</Text>
        <View style={styles.urgencies}>
          {(["low", "normal", "high", "emergency"] as Urgency[]).map(
            (value) => (
              <Pressable
                key={value}
                onPress={() => setUrgency(value)}
                style={[styles.urgency, urgency === value && styles.selected]}
              >
                <Text
                  style={
                    urgency === value ? styles.selectedText : styles.urgencyText
                  }
                >
                  {value}
                </Text>
              </Pressable>
            ),
          )}
        </View>
        <Pressable disabled={submitting} onPress={submit} style={styles.action}>
          <Text style={styles.actionText}>
            {submitting ? "Submitting..." : "Submit report"}
          </Text>
        </Pressable>
        <Link href="/" style={styles.link}>
          Back to dashboard
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f4f7f2" },
  content: { padding: 28 },
  eyebrow: {
    color: "#0b6b57",
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 24,
  },
  title: { color: "#17231f", fontSize: 32, fontWeight: "800", marginTop: 12 },
  body: { color: "#52615b", fontSize: 17, lineHeight: 25, marginVertical: 16 },
  input: {
    backgroundColor: "#fff",
    borderColor: "#d7e0d9",
    borderRadius: 10,
    borderWidth: 1,
    color: "#17231f",
    fontSize: 16,
    marginBottom: 12,
    padding: 15,
  },
  description: { minHeight: 110, textAlignVertical: "top" },
  label: { color: "#52615b", fontWeight: "700", marginBottom: 8 },
  urgencies: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 22,
  },
  urgency: {
    borderColor: "#cbd8ce",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  selected: { backgroundColor: "#0b6b57", borderColor: "#0b6b57" },
  urgencyText: { color: "#52615b" },
  selectedText: { color: "#fff", fontWeight: "700" },
  action: { backgroundColor: "#0b6b57", borderRadius: 10, padding: 16 },
  actionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  link: { color: "#0b6b57", fontWeight: "700", marginTop: 18 },
});
