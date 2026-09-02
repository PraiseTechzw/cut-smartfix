import { Link, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../context/auth";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert("Missing details", "Please fill in all required fields.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Weak password", "Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "The passwords you entered do not match.");
      return;
    }
    setLoading(true);
    try {
      await register(
        fullName.trim(),
        email.trim().toLowerCase(),
        password,
        studentId.trim() || undefined,
      );
      router.replace("/(tabs)");
    } catch (err) {
      Alert.alert(
        "Registration failed",
        (err as Error).message ?? "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Branding */}
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>CUT</Text>
            </View>
            <Text style={styles.appName}>CUT SmartFix</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.heading}>Create Account</Text>
            <Text style={styles.subheading}>
              Register to report and track maintenance issues.
            </Text>

            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Tendai Moyo"
              placeholderTextColor="#9caea5"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              editable={!loading}
            />

            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="your@student.cut.ac.zw"
              placeholderTextColor="#9caea5"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              editable={!loading}
            />

            <Text style={styles.label}>Student ID</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. C123456789"
              placeholderTextColor="#9caea5"
              value={studentId}
              onChangeText={setStudentId}
              autoCapitalize="characters"
              editable={!loading}
            />

            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Min. 8 characters"
              placeholderTextColor="#9caea5"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!loading}
            />

            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor="#9caea5"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!loading}
            />

            <Pressable
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Create Account</Text>
              )}
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/auth/login" style={styles.link}>
                Sign in
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f4f7f2" },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: 28, paddingTop: 40, paddingBottom: 40 },
  brand: {
    alignItems: "center",
    marginBottom: 28,
    gap: 6,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#0b6b57",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  logoText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
  },
  appName: {
    color: "#17231f",
    fontSize: 20,
    fontWeight: "800",
  },
  form: {
    gap: 2,
  },
  heading: {
    color: "#17231f",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  subheading: {
    color: "#52615b",
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    color: "#52615b",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderColor: "#d7e0d9",
    borderWidth: 1,
    borderRadius: 10,
    color: "#17231f",
    fontSize: 16,
    padding: 15,
    marginBottom: 4,
  },
  btn: {
    backgroundColor: "#0b6b57",
    borderRadius: 12,
    padding: 17,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#0b6b57",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    color: "#52615b",
    fontSize: 14,
  },
  link: {
    color: "#0b6b57",
    fontSize: 14,
    fontWeight: "700",
  },
});
