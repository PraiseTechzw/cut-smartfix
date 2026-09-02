import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
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

// ─── Password strength ────────────────────────────────────────
interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

function getPasswordStrength(pw: string): StrengthResult {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const capped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const map: Record<1 | 2 | 3 | 4, { label: string; color: string }> = {
    1: { label: "Weak", color: "#e74c3c" },
    2: { label: "Fair", color: "#e67e22" },
    3: { label: "Good", color: "#f1c40f" },
    4: { label: "Strong", color: "#27ae60" },
  };
  if (capped === 0) return { score: 0, label: "", color: "transparent" };
  return { score: capped, ...map[capped] };
}

function StrengthBar({ password }: { password: string }) {
  const { score, label, color } = getPasswordStrength(password);
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: score / 4,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [score, width]);

  if (!password) return null;

  return (
    <View style={strengthStyles.wrapper}>
      <View style={strengthStyles.track}>
        <Animated.View
          style={[
            strengthStyles.fill,
            {
              backgroundColor: color,
              width: width.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
      <Text style={[strengthStyles.label, { color }]}>{label}</Text>
    </View>
  );
}

const strengthStyles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: -10,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e4ede7",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    width: 44,
    textAlign: "right",
  },
});

// ─── Match indicator ──────────────────────────────────────────
function MatchIndicator({
  password,
  confirm,
}: {
  password: string;
  confirm: string;
}) {
  if (!confirm) return null;
  const match = password === confirm;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <Animated.View style={[matchStyles.row, { opacity }]}>
      <Text style={matchStyles.icon}>{match ? "✓" : "✕"}</Text>
      <Text style={[matchStyles.text, { color: match ? "#27ae60" : ERROR }]}>
        {match ? "Passwords match" : "Passwords do not match"}
      </Text>
    </Animated.View>
  );
}

const matchStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -12,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  icon: { fontSize: 12, fontWeight: "800" },
  text: { fontSize: 12, fontWeight: "600" },
});

// ─── Animated field ───────────────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
  autoComplete?: "email" | "password" | "name" | "username";
  textContentType?:
    | "emailAddress"
    | "password"
    | "newPassword"
    | "name"
    | "username";
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
    : borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [BORDER, BORDER_FOCUS],
      });

  const labelTop = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [17, -8],
  });
  const labelSize = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 11],
  });
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
        {/* Floating label — wrapped in View so pointerEvents works */}
        <View
          pointerEvents="none"
          style={fieldStyles.floatingLabelWrapper}
        >
          <Animated.Text
            style={[
              fieldStyles.floatingLabel,
              {
                top: labelTop,
                fontSize: labelSize,
                color: labelColor,
                backgroundColor: BG,
              },
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

        {rightElement && (
          <View style={fieldStyles.rightSlot}>{rightElement}</View>
        )}
      </Animated.View>

      {error ? (
        <View style={fieldStyles.errorRow}>
          <Text style={fieldStyles.errorDot}>●</Text>
          <Text style={fieldStyles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: 18 },
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
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
  input: {
    flex: 1,
    fontSize: 16,
    color: TEXT_PRIMARY,
    padding: 0,
  },
  rightSlot: { paddingLeft: 8 },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    marginLeft: 4,
    gap: 5,
  },
  errorDot: { color: ERROR, fontSize: 6 },
  errorText: { color: ERROR, fontSize: 12, fontWeight: "500" },
});

// ─── Eye toggle ───────────────────────────────────────────────
function EyeToggle({
  visible,
  onPress,
}: {
  visible: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={{ fontSize: 18, opacity: visible ? 1 : 0.4 }}>
        {visible ? "👁" : "🙈"}
      </Text>
    </Pressable>
  );
}

// ─── Primary button ───────────────────────────────────────────
function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading: boolean;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scale, {
      toValue: 0.965,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }
  function pressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, { marginTop: 8 }]}>
      <Pressable
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        disabled={disabled || loading}
        style={[btnStyles.btn, (disabled || loading) && btnStyles.btnDisabled]}
      >
        <LinearGradient
          colors={[GREEN, GREEN_DARK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={btnStyles.gradient}
        >
          {loading ? (
            <View style={btnStyles.loadingRow}>
              <LoadingDots />
            </View>
          ) : (
            <Text style={btnStyles.label}>{label}</Text>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const btnStyles = StyleSheet.create({
  btn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.65,
    shadowOpacity: 0.1,
    elevation: 2,
  },
  gradient: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  loadingRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    height: 20,
  },
});

// ─── Loading dots ─────────────────────────────────────────────
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
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
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
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: "#fff",
            opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
            transform: [
              {
                translateY: dot.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -4],
                }),
              },
            ],
          }}
        />
      ))}
    </>
  );
}

// ─── Staggered entrance ───────────────────────────────────────
function FadeSlideIn({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 480,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 480,
        delay,
        easing: Easing.out(Easing.back(1.05)),
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Step indicator ───────────────────────────────────────────
function StepBadge({
  number,
  label,
}: {
  number: number;
  label: string;
}) {
  return (
    <View style={stepStyles.row}>
      <View style={stepStyles.circle}>
        <Text style={stepStyles.number}>{number}</Text>
      </View>
      <Text style={stepStyles.label}>{label}</Text>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GREEN_LIGHT,
    borderWidth: 1.5,
    borderColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  number: {
    color: GREEN,
    fontSize: 13,
    fontWeight: "800",
  },
  label: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});

// ─── Main register screen ─────────────────────────────────────
export default function RegisterScreen() {
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const emailRef = useRef<TextInput>(null);
  const studentIdRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  function validate() {
    const e: typeof errors = {};
    if (!fullName.trim()) e.fullName = "Full name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Password must be at least 8 characters";
    if (!confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
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
      setErrors({
        email:
          (err as Error).message ?? "Registration failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <FadeSlideIn delay={0}>
            <View style={styles.header}>
              <LinearGradient
                colors={[GREEN, GREEN_DARK]}
                style={styles.headerIcon}
              >
                <Text style={styles.headerIconText}>🎓</Text>
              </LinearGradient>
              <View style={styles.headerText}>
                <Text style={styles.heading}>Create Account</Text>
                <Text style={styles.subheading}>
                  Join CUT SmartFix — report issues in minutes
                </Text>
              </View>
            </View>
          </FadeSlideIn>

          {/* ── Card: Personal info ── */}
          <FadeSlideIn delay={80}>
            <View style={styles.card}>
              <StepBadge number={1} label="Personal Information" />

              <AnimatedField
                label="Full Name"
                value={fullName}
                onChangeText={(v) => {
                  setFullName(v);
                  if (errors.fullName)
                    setErrors((e) => ({ ...e, fullName: undefined }));
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
                  if (errors.email)
                    setErrors((e) => ({ ...e, email: undefined }));
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
                returnKeyType="next"
                blurOnSubmit={false}
                inputRef={studentIdRef}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
          </FadeSlideIn>

          {/* ── Card: Security ── */}
          <FadeSlideIn delay={160}>
            <View style={[styles.card, { marginTop: 14 }]}>
              <StepBadge number={2} label="Set a Password" />

              <AnimatedField
                label="Password"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (errors.password)
                    setErrors((e) => ({ ...e, password: undefined }));
                }}
                placeholder="Min. 8 characters"
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="newPassword"
                editable={!loading}
                error={errors.password}
                returnKeyType="next"
                blurOnSubmit={false}
                inputRef={passwordRef}
                onSubmitEditing={() => confirmRef.current?.focus()}
                rightElement={
                  <EyeToggle
                    visible={showPassword}
                    onPress={() => setShowPassword((v) => !v)}
                  />
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
                onSubmitEditing={handleRegister}
                inputRef={confirmRef}
                rightElement={
                  <EyeToggle
                    visible={showConfirm}
                    onPress={() => setShowConfirm((v) => !v)}
                  />
                }
              />

              <MatchIndicator
                password={password}
                confirm={confirmPassword}
              />

              {/* Password rules hint */}
              <View style={styles.rulesBox}>
                <Text style={styles.rulesTitle}>Password requirements</Text>
                <PasswordRule met={password.length >= 8} text="At least 8 characters" />
                <PasswordRule
                  met={/[A-Z]/.test(password) && /[a-z]/.test(password)}
                  text="Upper & lowercase letters"
                />
                <PasswordRule met={/[0-9]/.test(password)} text="At least one number" />
              </View>

              <PrimaryButton
                label="Create Account"
                onPress={handleRegister}
                loading={loading}
              />
            </View>
          </FadeSlideIn>

          {/* ── Footer ── */}
          <FadeSlideIn delay={240}>
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?  </Text>
              <Link href="/auth/login" asChild>
                <Pressable>
                  <Text style={styles.footerLink}>Sign in →</Text>
                </Pressable>
              </Link>
            </View>

            <View style={styles.bottomNote}>
              <Text style={styles.bottomNoteText}>
                🔒  Your data is encrypted and secure
              </Text>
            </View>
          </FadeSlideIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordRule({ met, text }: { met: boolean; text: string }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (met) {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.25,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [met, scale]);

  return (
    <View style={ruleStyles.row}>
      <Animated.Text
        style={[
          ruleStyles.icon,
          {
            color: met ? "#27ae60" : TEXT_MUTED,
            transform: [{ scale }],
          },
        ]}
      >
        {met ? "✓" : "○"}
      </Animated.Text>
      <Text style={[ruleStyles.text, met && ruleStyles.textMet]}>{text}</Text>
    </View>
  );
}

const ruleStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
  },
  icon: {
    fontSize: 13,
    fontWeight: "800",
    width: 16,
  },
  text: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
  textMet: {
    color: "#27ae60",
    fontWeight: "600",
  },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  headerIconText: { fontSize: 26 },
  headerText: { flex: 1, gap: 3 },
  heading: {
    color: TEXT_PRIMARY,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subheading: {
    color: TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  // Cards
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 6,
  },
  // Password rules
  rulesBox: {
    backgroundColor: "#f8faf9",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
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
  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    flexWrap: "wrap",
  },
  footerText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
  },
  footerLink: {
    color: GREEN,
    fontSize: 14,
    fontWeight: "700",
  },
  bottomNote: {
    marginTop: 16,
    alignItems: "center",
  },
  bottomNoteText: {
    color: TEXT_MUTED,
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
