/**
 * Email Verification Screen — 6-digit OTP
 *
 * Shown after sign-up (or when trying to log in with an unconfirmed email).
 * • 6 individual digit boxes with auto-advance
 * • Paste support (full 6-digit paste fills all boxes at once)
 * • 60-second resend countdown that auto-resets
 * • Success animation before navigating to tabs
 * • Persists across app restarts via pendingEmail in auth context
 */
import { LinearGradient } from "../../components/LinearGradient";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../context/auth";

// ─── Design tokens ─────────────────────────────────────────────
const GREEN       = "#0b6b57";
const GREEN_DARK  = "#084f41";
const GREEN_LIGHT = "#e8f5f0";
const TEXT_PRIMARY   = "#0f1f1b";
const TEXT_SECONDARY = "#4a5e57";
const TEXT_MUTED     = "#8ea89f";
const BORDER         = "#d0ddd8";
const ERROR          = "#c0392b";
const BG             = "#f5f8f6";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

// ─── Success overlay ────────────────────────────────────────────
function SuccessOverlay({ visible }: { visible: boolean }) {
  const scale   = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 14,
        bounciness: 14,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, scale, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[successStyles.overlay, { opacity }]}>
      <Animated.View style={[successStyles.circle, { transform: [{ scale }] }]}>
        <Text style={successStyles.tick}>✓</Text>
      </Animated.View>
      <Text style={successStyles.label}>Email Verified!</Text>
      <Text style={successStyles.sub}>Taking you to your dashboard…</Text>
    </Animated.View>
  );
}

const successStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.97)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99,
    gap: 16,
  },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  tick: { color: "#fff", fontSize: 44, fontWeight: "800" },
  label: { color: TEXT_PRIMARY, fontSize: 24, fontWeight: "800", letterSpacing: -0.3 },
  sub: { color: TEXT_MUTED, fontSize: 15 },
});

// ─── Single OTP digit box ───────────────────────────────────────
function OtpBox({
  value,
  focused,
  error,
  shake,
}: {
  value: string;
  focused: boolean;
  error: boolean;
  shake: Animated.Value;
}) {
  const borderColor = error ? ERROR : focused ? GREEN : value ? GREEN : BORDER;
  const bgColor     = value ? "#fff" : focused ? "#fff" : "#fafcfb";

  return (
    <Animated.View
      style={[
        boxStyles.box,
        {
          borderColor,
          backgroundColor: bgColor,
          transform: [{ translateX: shake }],
        },
        focused && boxStyles.focused,
        error && boxStyles.error,
      ]}
    >
      <Text style={[boxStyles.digit, error && { color: ERROR }]}>{value}</Text>
      {focused && !value && <View style={boxStyles.cursor} />}
    </Animated.View>
  );
}

const boxStyles = StyleSheet.create({
  box: {
    width: 48,
    height: 58,
    borderWidth: 2,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  focused: {
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  error: {
    shadowColor: ERROR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  digit: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT_PRIMARY,
    letterSpacing: 0,
  },
  cursor: {
    position: "absolute",
    bottom: 10,
    width: 2,
    height: 20,
    backgroundColor: GREEN,
    borderRadius: 1,
    opacity: 0.8,
  },
});

// ─── Main screen ────────────────────────────────────────────────
export default function VerifyScreen() {
  const { pendingEmail, verifyOtp, resendOtp, logout } = useAuth();

  // Digits state
  const [digits, setDigits]         = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [focused, setFocused]       = useState<number>(0);
  const [inputFocused, setInputFocused] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);

  // Resend countdown
  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);
  const [resending, setResending]         = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Animations
  const shake          = useRef(new Animated.Value(0)).current;
  const hiddenInputRef = useRef<TextInput>(null);

  // ── Redirect if no pending email ──────────────────────────
  useEffect(() => {
    if (!pendingEmail) {
      router.replace("/auth/login");
    }
  }, [pendingEmail]);

  // ── Resend countdown ──────────────────────────────────────
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = setInterval(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [resendSeconds]);

  // ── Shake animation ───────────────────────────────────────
  const triggerShake = useCallback(() => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8,   duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8,  duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0,   duration: 40, useNativeDriver: true }),
    ]).start();
  }, [shake]);

  // ── Submit ────────────────────────────────────────────────
  const handleVerify = useCallback(async () => {
    const otp = digits.join("");
    if (otp.length < OTP_LENGTH) {
      setErrorMsg("Please enter all 6 digits");
      triggerShake();
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    setErrorMsg(null);

    try {
      await verifyOtp(otp);
      setSuccess(true);
      // Small pause so success animation plays before navigation
      setTimeout(() => router.replace("/(tabs)"), 1600);
    } catch (err) {
      setErrorMsg(
        (err as Error).message ?? "Invalid or expired code. Please try again.",
      );
      triggerShake();
      // Clear boxes so user can re-enter
      setDigits(Array(OTP_LENGTH).fill(""));
      setFocused(0);
      setTimeout(() => hiddenInputRef.current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }, [digits, verifyOtp, triggerShake]);

  // Auto-submit when last digit is filled
  useEffect(() => {
    if (digits.every((d) => d !== "") && !loading) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  // ── Resend ────────────────────────────────────────────────
  const handleResend = useCallback(async () => {
    if (resendSeconds > 0 || resending) return;
    setResending(true);
    setResendSuccess(false);
    setErrorMsg(null);
    try {
      await resendOtp();
      setResendSuccess(true);
      setResendSeconds(RESEND_SECONDS);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (err) {
      setErrorMsg((err as Error).message ?? "Could not resend code");
    } finally {
      setResending(false);
    }
  }, [resendSeconds, resending, resendOtp]);

  // ── Entrance animation ────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const otpFull = digits.every((d) => d !== "");

  // ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.page}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Success overlay */}
      <SuccessOverlay visible={success} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <Animated.ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>✉️</Text>
            </View>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit verification code to
            </Text>
            <View style={styles.emailPill}>
              <Text style={styles.emailText} numberOfLines={1}>
                {pendingEmail ?? "your email"}
              </Text>
            </View>
          </View>

          {/* ── OTP boxes + hidden input overlay ── */}
          {/* The TextInput sits on top of the boxes at opacity:0 so the OS
              treats it as a real on-screen input → keyboard appears.
              Tapping anywhere on the row focuses it. */}
          <View style={styles.boxRow}>
            {digits.map((digit, i) => (
              <OtpBox
                key={i}
                value={digit}
                focused={inputFocused && focused === i}
                error={Boolean(errorMsg)}
                shake={shake}
              />
            ))}

            {/* Invisible input stretched across the whole row */}
            <TextInput
              ref={hiddenInputRef}
              style={styles.hiddenInput}
              value={digits.join("")}
              onChangeText={(text) => {
                // Strip non-digits, clamp to OTP_LENGTH (handles paste too)
                const clean = text.replace(/\D/g, "").slice(0, OTP_LENGTH);
                const next = Array(OTP_LENGTH).fill("") as string[];
                clean.split("").forEach((d, i) => { next[i] = d; });
                setDigits(next);
                setFocused(Math.min(clean.length, OTP_LENGTH - 1));
                setErrorMsg(null);
              }}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === "Backspace") {
                  const filled = digits.join("").length;
                  if (filled === 0) return;
                  const next = [...digits];
                  next[filled - 1] = "";
                  setDigits(next);
                  setFocused(Math.max(0, filled - 1));
                }
              }}
              onFocus={() => {
                setInputFocused(true);
                const filled = digits.filter((d) => d !== "").length;
                setFocused(Math.min(filled, OTP_LENGTH - 1));
              }}
              onBlur={() => setInputFocused(false)}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              caretHidden
              autoFocus
            />
          </View>

          {/* ── Error / success message ── */}
          {errorMsg ? (
            <View style={styles.errorRow}>
              <Text style={styles.errorIcon}>⚠</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : resendSuccess ? (
            <View style={styles.successRow}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successText}>New code sent!</Text>
            </View>
          ) : null}

          {/* ── Verify button ── */}
          <Pressable
            onPress={handleVerify}
            disabled={loading || !otpFull}
            style={[styles.btnWrap, (!otpFull || loading) && { opacity: 0.6 }]}
          >
            <LinearGradient
              colors={[GREEN, GREEN_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btn}
            >
              {loading ? (
                <LoadingDots />
              ) : (
                <Text style={styles.btnLabel}>Verify Email</Text>
              )}
            </LinearGradient>
          </Pressable>

          {/* ── Resend ── */}
          <View style={styles.resendRow}>
            {resendSeconds > 0 ? (
              <Text style={styles.resendCountdown}>
                Resend code in{" "}
                <Text style={styles.resendTimer}>{resendSeconds}s</Text>
              </Text>
            ) : (
              <Pressable onPress={handleResend} disabled={resending}>
                <Text style={styles.resendBtn}>
                  {resending ? "Sending…" : "Didn't get a code? Resend →"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* ── Change email / cancel ── */}
          <Pressable
            onPress={async () => {
              await logout();
              router.replace("/auth/login");
            }}
            style={styles.changeEmail}
          >
            <Text style={styles.changeEmailText}>Use a different email</Text>
          </Pressable>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Loading dots ────────────────────────────────────────────────
function LoadingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center", height: 22 }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7, height: 7, borderRadius: 4, backgroundColor: "#fff",
            opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
            transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
          }}
        />
      ))}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 48,
    justifyContent: "center",
  },

  // Header
  header: { alignItems: "center", marginBottom: 36, gap: 10, width: "100%" },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  iconEmoji: { fontSize: 36 },
  title: {
    color: TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    color: TEXT_MUTED,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  emailPill: {
    backgroundColor: "#fff",
    borderRadius: 100,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: BORDER,
    maxWidth: "90%",
  },
  emailText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  // OTP boxes
  boxRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginBottom: 24,
    width: "100%",
    // Must have a defined height so the absolute input has a parent to fill
    height: 58,
  },
  hiddenInput: {
    // Stretched over the entire box row — on-screen so keyboard appears,
    // but fully transparent so users only see the visual boxes.
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    color: "transparent",
    backgroundColor: "transparent",
  },

  // Messages
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
    backgroundColor: "#fff0f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#ffd5d5",
    alignSelf: "stretch",
  },
  errorIcon: { color: ERROR, fontSize: 14, fontWeight: "800" },
  errorText: { color: ERROR, fontSize: 13, fontWeight: "600", flex: 1 },
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
    backgroundColor: "#eafaf1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#b7ecd4",
    alignSelf: "stretch",
  },
  successIcon: { color: "#27ae60", fontSize: 14, fontWeight: "800" },
  successText: { color: "#27ae60", fontSize: 13, fontWeight: "600" },

  // Button
  btnWrap: { width: "100%", marginBottom: 20 },
  btn: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  btnLabel: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },

  // Resend
  resendRow: { marginBottom: 16, alignItems: "center" },
  resendCountdown: { color: TEXT_MUTED, fontSize: 14 },
  resendTimer: { color: GREEN, fontWeight: "700" },
  resendBtn: { color: GREEN, fontSize: 14, fontWeight: "700" },

  // Change email
  changeEmail: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 16 },
  changeEmailText: { color: TEXT_MUTED, fontSize: 13, fontWeight: "500" },
});
