/**
 * Registration Wizard — 3 steps, each on its own full-screen page.
 *
 * Step 1 — Your Identity   (full name, email, student ID)
 *           Real-time uniqueness checks on email + student ID via
 *           POST /v1/auth/check (debounced 600 ms).
 * Step 2 — Secure Account  (password, confirm, strength meter)
 * Step 3 — Review & Create (summary card + submit)
 *
 * Navigation is animated: steps slide left/right via React Native's
 * built-in Animated API — no extra packages required.
 */
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../context/auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

// ─── Constants ────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get("window");
const TOTAL_STEPS = 3;

// ─── Design tokens ────────────────────────────────────────────
const GREEN = "#0b6b57";
const GREEN_DARK = "#094f40";
const GREEN_LIGHT = "#e8f5f0";
const TEXT_PRIMARY = "#0f1f1b";
const TEXT_SECONDARY = "#4a5e57";
const TEXT_MUTED = "#8ea89f";
const BORDER = "#d0ddd8";
const BORDER_FOCUS = "#0b6b57";
const ERROR = "#c0392b";
const BG = "#f5f8f6";

// ─────────────────────────────────────────────────────────────
// Uniqueness check
// ─────────────────────────────────────────────────────────────

type CheckStatus = "idle" | "checking" | "taken" | "available";

/**
 * Debounced uniqueness check against POST /v1/auth/check.
 * Fires after the user stops typing for 600 ms.
 */
function useUniquenessCheck(
  field: "email" | "studentId",
  value: string,
  debounceMs = 600,
): CheckStatus {
  const [status, setStatus] = useState<CheckStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!value.trim()) {
      setStatus("idle");
      return;
    }
    // Don't fire email check until it looks like a real address
    if (field === "email" && !/\S+@\S+\.\S+/.test(value)) {
      setStatus("idle");
      return;
    }

    setStatus("checking");
    if (timerRef.current) clearTimeout(timerRef.current);

    const captured = value;
    timerRef.current = setTimeout(async () => {
      const body =
        field === "email"
          ? { email: captured.trim().toLowerCase() }
          : { studentId: captured.trim() };
      try {
        const res = await fetch(`${API_URL}/v1/auth/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          setStatus("idle");
          return;
        }
        const json = await res.json();
        const taken =
          field === "email"
            ? json.data?.emailTaken
            : json.data?.studentIdTaken;
        setStatus(taken ? "taken" : "available");
      } catch {
        setStatus("idle");
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, field, debounceMs]);

  return status;
}

// Live indicator badge shown below an input
function UniquenessIndicator({ status }: { status: CheckStatus }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (status === "idle") {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 10,
      }),
    ]).start();
  }, [status, opacity, scale]);

  if (status === "idle") return null;

  const config: Record<
    Exclude<CheckStatus, "idle">,
    { icon: string; text: string; color: string; bg: string }
  > = {
    checking:  { icon: "⏳", text: "Checking…",      color: TEXT_MUTED, bg: "#f0f4f1" },
    available: { icon: "✓",  text: "Available",       color: "#27ae60",  bg: "#eafaf1" },
    taken:     { icon: "✕",  text: "Already in use",  color: ERROR,      bg: "#fdf0f0" },
  };
  const c = config[status];

  return (
    <Animated.View
      style={[
        uniqueStyles.badge,
        { backgroundColor: c.bg, opacity, transform: [{ scale }] },
      ]}
    >
      <Text style={[uniqueStyles.icon, { color: c.color }]}>{c.icon}</Text>
      <Text style={[uniqueStyles.text, { color: c.color }]}>{c.text}</Text>
    </Animated.View>
  );
}

const uniqueStyles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    marginTop: -12,
    marginBottom: 14,
    marginLeft: 2,
  },
  icon: { fontSize: 11, fontWeight: "800" },
  text: { fontSize: 11, fontWeight: "700" },
});

// ─────────────────────────────────────────────────────────────
// Step Progress Bar
// ─────────────────────────────────────────────────────────────
function StepProgress({ step }: { step: number }) {
  const STEPS = [
    { icon: "👤", label: "Identity" },
    { icon: "🔒", label: "Security" },
    { icon: "✅", label: "Review" },
  ];

  return (
    <View style={progressStyles.container}>
      {STEPS.map((s, i) => {
        const done = i + 1 < step;
        const active = i + 1 === step;
        return (
          <View key={i} style={progressStyles.stepRow}>
            {/* Connector line before */}
            {i > 0 && (
              <View
                style={[
                  progressStyles.connector,
                  (done || active) && progressStyles.connectorActive,
                ]}
              />
            )}
            {/* Bubble */}
            <View style={progressStyles.bubbleCol}>
              <View
                style={[
                  progressStyles.bubble,
                  active && progressStyles.bubbleActive,
                  done && progressStyles.bubbleDone,
                ]}
              >
                {done ? (
                  <Text style={progressStyles.doneCheck}>✓</Text>
                ) : (
                  <Text
                    style={[
                      progressStyles.bubbleText,
                      active && progressStyles.bubbleTextActive,
                    ]}
                  >
                    {s.icon}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  progressStyles.stepLabel,
                  active && progressStyles.stepLabelActive,
                  done && progressStyles.stepLabelDone,
                ]}
              >
                {s.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const progressStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: BORDER,
    marginBottom: 20,
  },
  connectorActive: {
    backgroundColor: GREEN,
  },
  bubbleCol: {
    alignItems: "center",
    gap: 6,
  },
  bubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleActive: {
    borderColor: GREEN,
    backgroundColor: GREEN_LIGHT,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  bubbleDone: {
    borderColor: GREEN,
    backgroundColor: GREEN,
  },
  bubbleText: {
    fontSize: 18,
  },
  bubbleTextActive: {
    fontSize: 18,
  },
  doneCheck: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stepLabelActive: {
    color: GREEN,
  },
  stepLabelDone: {
    color: GREEN,
    opacity: 0.7,
  },
});

// ─────────────────────────────────────────────────────────────
// Animated floating-label field
// ─────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
  autoComplete?: "email" | "password" | "name" | "username";
  textContentType?: "emailAddress" | "password" | "newPassword" | "name" | "username";
  secureTextEntry?: boolean;
  editable?: boolean;
  error?: string;
  returnKeyType?: "next" | "done";
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
  inputRef?: React.RefObject<TextInput>;
  rightElement?: React.ReactNode;
}

function AnimatedField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "none",
  autoComplete,
  textContentType,
  secureTextEntry,
  editable = true,
  error,
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit,
  inputRef,
  rightElement,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
    Animated.timing(labelAnim, {
      toValue: focused || value.length > 0 ? 1 : 0,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [focused, value, borderAnim, labelAnim]);

  const borderColor = error
    ? ERROR
    : borderAnim.interpolate({ inputRange: [0, 1], outputRange: [BORDER, BORDER_FOCUS] });

  const labelTop = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [17, -8] });
  const labelSize = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 11] });
  const labelColor = error ? ERROR : focused ? BORDER_FOCUS : TEXT_MUTED;

  return (
    <View style={fieldStyles.wrapper}>
      <Animated.View
        style={[
          fieldStyles.container,
          { borderColor },
          focused && fieldStyles.containerFocused,
        ]}
      >
        <View pointerEvents="none" style={fieldStyles.floatingLabelWrapper}>
          <Animated.Text
            style={[
              fieldStyles.floatingLabel,
              { top: labelTop, fontSize: labelSize, color: labelColor, backgroundColor: BG },
            ]}
          >
            {label}
          </Animated.Text>
        </View>

        <TextInput
          ref={inputRef}
          style={fieldStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={focused ? placeholder : ""}
          placeholderTextColor={TEXT_MUTED}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          secureTextEntry={secureTextEntry}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />

        {rightElement && <View style={fieldStyles.rightSlot}>{rightElement}</View>}
      </Animated.View>

      {error && (
        <View style={fieldStyles.errorRow}>
          <Text style={fieldStyles.errorDot}>●</Text>
          <Text style={fieldStyles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: 20 },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  containerFocused: {
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  floatingLabelWrapper: {
    position: "absolute",
    left: 14,
    zIndex: 1,
    top: 0,
    bottom: 0,
    justifyContent: "flex-start",
  },
  floatingLabel: {
    paddingHorizontal: 4,
    fontWeight: "600",
  },
  input: { flex: 1, fontSize: 16, color: TEXT_PRIMARY, padding: 0 },
  rightSlot: { paddingLeft: 8 },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginLeft: 4,
    gap: 5,
  },
  errorDot: { color: ERROR, fontSize: 6 },
  errorText: { color: ERROR, fontSize: 12, fontWeight: "500" },
});

// ─────────────────────────────────────────────────────────────
// Eye toggle
// ─────────────────────────────────────────────────────────────
function EyeToggle({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={{ fontSize: 18, opacity: visible ? 1 : 0.4 }}>
        {visible ? "👁" : "🙈"}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
// Password strength
// ─────────────────────────────────────────────────────────────
function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const score = Math.min(s, 4);
  const map = [
    { label: "", color: "transparent" },
    { label: "Weak", color: "#e74c3c" },
    { label: "Fair", color: "#e67e22" },
    { label: "Good", color: "#f1c40f" },
    { label: "Strong", color: "#27ae60" },
  ];
  return { score, ...map[score] };
}

function StrengthBar({ password }: { password: string }) {
  const { score, label, color } = getStrength(password);
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: score / 4,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [score, widthAnim]);
  if (!password) return null;
  return (
    <View style={sbStyles.wrapper}>
      <View style={sbStyles.track}>
        <Animated.View
          style={[
            sbStyles.fill,
            {
              backgroundColor: color,
              width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
            },
          ]}
        />
      </View>
      <Text style={[sbStyles.label, { color }]}>{label}</Text>
    </View>
  );
}

const sbStyles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: -12,
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#e4ede7", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
  label: { fontSize: 11, fontWeight: "700", width: 44, textAlign: "right" },
});

// ─────────────────────────────────────────────────────────────
// Password rule row
// ─────────────────────────────────────────────────────────────
function PasswordRule({ met, text }: { met: boolean; text: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (met) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.3, duration: 110, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 110, useNativeDriver: true }),
      ]).start();
    }
  }, [met, scale]);
  return (
    <View style={ruleStyles.row}>
      <Animated.Text style={[ruleStyles.icon, { color: met ? "#27ae60" : TEXT_MUTED, transform: [{ scale }] }]}>
        {met ? "✓" : "○"}
      </Animated.Text>
      <Text style={[ruleStyles.text, met && ruleStyles.textMet]}>{text}</Text>
    </View>
  );
}

const ruleStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  icon: { fontSize: 13, fontWeight: "800", width: 16 },
  text: { color: TEXT_MUTED, fontSize: 12 },
  textMet: { color: "#27ae60", fontWeight: "600" },
});

// ─────────────────────────────────────────────────────────────
// Match indicator
// ─────────────────────────────────────────────────────────────
function MatchIndicator({ password, confirm }: { password: string; confirm: string }) {
  if (!confirm) return null;
  const match = password === confirm;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [opacity]);
  return (
    <Animated.View style={[miStyles.row, { opacity }]}>
      <Text style={[miStyles.icon, { color: match ? "#27ae60" : ERROR }]}>{match ? "✓" : "✕"}</Text>
      <Text style={[miStyles.text, { color: match ? "#27ae60" : ERROR }]}>
        {match ? "Passwords match" : "Passwords do not match"}
      </Text>
    </Animated.View>
  );
}

const miStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -12, marginBottom: 18, paddingHorizontal: 2 },
  icon: { fontSize: 12, fontWeight: "800" },
  text: { fontSize: 12, fontWeight: "600" },
});

// ─────────────────────────────────────────────────────────────
// CTA Button (gradient + spring + loading dots)
// ─────────────────────────────────────────────────────────────
function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  secondary,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  function pressIn() {
    Animated.spring(scale, { toValue: 0.965, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  }
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        disabled={disabled || loading}
        style={secondary ? secondaryBtnStyles.btn : undefined}
      >
        {secondary ? (
          <Text style={secondaryBtnStyles.label}>{label}</Text>
        ) : (
          <LinearGradient
            colors={[GREEN, GREEN_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[primaryBtnStyles.gradient, (disabled || loading) && primaryBtnStyles.disabled]}
          >
            {loading ? (
              <View style={primaryBtnStyles.loadingRow}>
                <LoadingDots />
              </View>
            ) : (
              <Text style={primaryBtnStyles.label}>{label}</Text>
            )}
          </LinearGradient>
        )}
      </Pressable>
    </Animated.View>
  );
}

const primaryBtnStyles = StyleSheet.create({
  gradient: {
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
  disabled: { opacity: 0.65 },
  label: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  loadingRow: { flexDirection: "row", gap: 6, alignItems: "center", height: 20 },
});

const secondaryBtnStyles = StyleSheet.create({
  btn: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: "#fff",
  },
  label: { color: TEXT_SECONDARY, fontSize: 16, fontWeight: "700" },
});

// ─────────────────────────────────────────────────────────────
// Loading dots
// ─────────────────────────────────────────────────────────────
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
    <>
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
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Review row (step 3 summary)
// ─────────────────────────────────────────────────────────────
function ReviewRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={reviewRowStyles.row}>
      <Text style={reviewRowStyles.icon}>{icon}</Text>
      <View style={reviewRowStyles.text}>
        <Text style={reviewRowStyles.label}>{label}</Text>
        <Text style={reviewRowStyles.value} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const reviewRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f4f1",
  },
  icon: { fontSize: 20, width: 28, textAlign: "center" },
  text: { flex: 1, gap: 2 },
  label: { color: TEXT_MUTED, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { color: TEXT_PRIMARY, fontSize: 15, fontWeight: "600" },
});

// ─────────────────────────────────────────────────────────────
// Slide container — manages slide-left / slide-right transitions
// ─────────────────────────────────────────────────────────────
function SlideContainer({
  step,
  children,
}: {
  step: number;
  children: React.ReactNode;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const prevStep = useRef(step);

  useEffect(() => {
    if (prevStep.current === step) return;
    const direction = step > prevStep.current ? 1 : -1;
    prevStep.current = step;

    // Start off-screen in the incoming direction
    translateX.setValue(direction * SCREEN_W * 0.35);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [step, translateX, opacity]);

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateX }], opacity }}>
      {children}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const { register } = useAuth();

  // Step
  const [step, setStep] = useState(1);

  // Step 1 data
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");

  // Step 2 data
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Refs
  const emailRef = useRef<TextInput>(null);
  const studentIdRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // ── Validation per step ──────────────────────────────────
  function validateStep1(): boolean {
    const e: typeof errors = {};
    if (!fullName.trim()) e.fullName = "Full name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: typeof errors = {};
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Min. 8 characters";
    if (!confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function goNext() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setErrors({});
    setStep((s) => s + 1);
  }

  function goBack() {
    setErrors({});
    setStep((s) => s - 1);
  }

  // ── Submit ───────────────────────────────────────────────
  async function handleSubmit() {
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
      // Go back to step 1 and show the API error on email
      setErrors({ email: (err as Error).message ?? "Registration failed. Please try again." });
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.page}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        {step > 1 ? (
          <Pressable onPress={goBack} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}

        <Text style={styles.topTitle}>Create Account</Text>

        {/* Right spacer / cancel on step 1 */}
        {step === 1 ? (
          <Link href="/auth/login" asChild>
            <Pressable hitSlop={12}>
              <Text style={styles.cancelText}>Sign in</Text>
            </Pressable>
          </Link>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* ── Progress ── */}
      <StepProgress step={step} />

      {/* ── Step content ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <SlideContainer step={step}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* ══════════ STEP 1: Identity ══════════ */}
            {step === 1 && (
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepEmoji}>👤</Text>
                  <Text style={styles.stepTitle}>Who are you?</Text>
                  <Text style={styles.stepSubtitle}>
                    Tell us a bit about yourself so we can personalise your experience.
                  </Text>
                </View>

                <View style={styles.card}>
                  <AnimatedField
                    label="Full Name"
                    value={fullName}
                    onChangeText={(v) => {
                      setFullName(v);
                      if (errors.fullName) setErrors((e) => ({ ...e, fullName: undefined }));
                    }}
                    placeholder="e.g. Tendai Moyo"
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    editable={!loading}
                    error={errors.fullName}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => emailRef.current?.focus()}
                  />

                  <AnimatedField
                    label="Email Address"
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                    }}
                    placeholder="your@student.cut.ac.zw"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    editable={!loading}
                    error={errors.email}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    inputRef={emailRef}
                    onSubmitEditing={() => studentIdRef.current?.focus()}
                  />

                  <AnimatedField
                    label="Student ID  (optional)"
                    value={studentId}
                    onChangeText={setStudentId}
                    placeholder="e.g. C123456789"
                    autoCapitalize="characters"
                    editable={!loading}
                    returnKeyType="done"
                    onSubmitEditing={goNext}
                    inputRef={studentIdRef}
                  />
                </View>

                <View style={styles.actions}>
                  <PrimaryButton label="Continue →" onPress={goNext} loading={false} />
                </View>
              </View>
            )}

            {/* ══════════ STEP 2: Password ══════════ */}
            {step === 2 && (
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepEmoji}>🔒</Text>
                  <Text style={styles.stepTitle}>Secure your account</Text>
                  <Text style={styles.stepSubtitle}>
                    Create a strong password to keep your account safe.
                  </Text>
                </View>

                <View style={styles.card}>
                  <AnimatedField
                    label="Password"
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                    }}
                    placeholder="Min. 8 characters"
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    textContentType="newPassword"
                    editable={!loading}
                    error={errors.password}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => confirmRef.current?.focus()}
                    rightElement={
                      <EyeToggle visible={showPassword} onPress={() => setShowPassword((v) => !v)} />
                    }
                  />

                  <StrengthBar password={password} />

                  <AnimatedField
                    label="Confirm Password"
                    value={confirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v);
                      if (errors.confirmPassword)
                        setErrors((e) => ({ ...e, confirmPassword: undefined }));
                    }}
                    placeholder="Re-enter password"
                    secureTextEntry={!showConfirm}
                    autoComplete="password"
                    textContentType="newPassword"
                    editable={!loading}
                    error={errors.confirmPassword}
                    returnKeyType="done"
                    onSubmitEditing={goNext}
                    inputRef={confirmRef}
                    rightElement={
                      <EyeToggle visible={showConfirm} onPress={() => setShowConfirm((v) => !v)} />
                    }
                  />

                  <MatchIndicator password={password} confirm={confirmPassword} />

                  {/* Password rules */}
                  <View style={styles.rulesBox}>
                    <Text style={styles.rulesTitle}>Password must have</Text>
                    <PasswordRule met={password.length >= 8} text="At least 8 characters" />
                    <PasswordRule
                      met={/[A-Z]/.test(password) && /[a-z]/.test(password)}
                      text="Upper & lowercase letters"
                    />
                    <PasswordRule met={/[0-9]/.test(password)} text="At least one number" />
                  </View>
                </View>

                <View style={styles.actions}>
                  <PrimaryButton label="Review →" onPress={goNext} loading={false} />
                </View>
              </View>
            )}

            {/* ══════════ STEP 3: Review & Submit ══════════ */}
            {step === 3 && (
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepEmoji}>✅</Text>
                  <Text style={styles.stepTitle}>Almost there!</Text>
                  <Text style={styles.stepSubtitle}>
                    Check your details and create your account.
                  </Text>
                </View>

                {/* Summary card */}
                <View style={styles.card}>
                  <Text style={styles.summaryTitle}>Your Details</Text>
                  <ReviewRow icon="👤" label="Full Name" value={fullName} />
                  <ReviewRow icon="✉️" label="Email" value={email} />
                  {studentId ? (
                    <ReviewRow icon="🎓" label="Student ID" value={studentId} />
                  ) : null}
                  <ReviewRow icon="🔒" label="Password" value={"•".repeat(Math.min(password.length, 12))} />
                </View>

                {/* Edit prompts */}
                <View style={styles.editRow}>
                  <Pressable onPress={() => setStep(1)} style={styles.editBtn}>
                    <Text style={styles.editBtnText}>✏️  Edit identity</Text>
                  </Pressable>
                  <Pressable onPress={() => setStep(2)} style={styles.editBtn}>
                    <Text style={styles.editBtnText}>✏️  Edit password</Text>
                  </Pressable>
                </View>

                {/* T&C note */}
                <View style={styles.termsBox}>
                  <Text style={styles.termsText}>
                    By creating an account you agree to CUT SmartFix's terms of service and privacy policy.
                  </Text>
                </View>

                <View style={styles.actions}>
                  <PrimaryButton
                    label="Create My Account"
                    onPress={handleSubmit}
                    loading={loading}
                  />
                </View>
              </View>
            )}

            {/* Sign-in link (all steps) */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?  </Text>
              <Link href="/auth/login" asChild>
                <Pressable>
                  <Text style={styles.footerLink}>Sign in →</Text>
                </Pressable>
              </Link>
            </View>

            <View style={styles.bottomNote}>
              <Text style={styles.bottomNoteText}>🔒  Your data is encrypted and secure</Text>
            </View>

          </ScrollView>
        </SlideContainer>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: { width: 60 },
  backBtnText: { color: GREEN, fontSize: 16, fontWeight: "600" },
  topTitle: { color: TEXT_PRIMARY, fontSize: 16, fontWeight: "700" },
  cancelText: { color: TEXT_MUTED, fontSize: 14, fontWeight: "600", width: 60, textAlign: "right" },

  // Scroll
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Step
  stepContent: { flex: 1 },
  stepHeader: {
    alignItems: "center",
    marginBottom: 28,
    gap: 8,
  },
  stepEmoji: { fontSize: 48, marginBottom: 4 },
  stepTitle: {
    color: TEXT_PRIMARY,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  stepSubtitle: {
    color: TEXT_MUTED,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 6,
    marginBottom: 20,
  },

  // Actions
  actions: { gap: 12 },

  // Password rules
  rulesBox: {
    backgroundColor: "#f8faf9",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e4ede7",
  },
  rulesTitle: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  // Review step
  summaryTitle: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  editRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  editBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  editBtnText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: "600",
  },
  termsBox: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  termsText: {
    color: TEXT_MUTED,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
    flexWrap: "wrap",
  },
  footerText: { color: TEXT_SECONDARY, fontSize: 14 },
  footerLink: { color: GREEN, fontSize: 14, fontWeight: "700" },
  bottomNote: { marginTop: 12, alignItems: "center" },
  bottomNoteText: { color: TEXT_MUTED, fontSize: 12, letterSpacing: 0.2 },
});
