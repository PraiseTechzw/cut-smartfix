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

// ─── Design tokens ───────────────────────────────────────────
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

// ─── Animated field wrapper ───────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
  autoComplete?: "email" | "password" | "name";
  textContentType?: "emailAddress" | "password" | "name";
  secureTextEntry?: boolean;
  editable?: boolean;
  error?: string;
  returnKeyType?: "next" | "done" | "go";
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
  inputRef?: React.RefObject<TextInput | null>;
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
  const labelColor = error
    ? ERROR
    : focused
    ? BORDER_FOCUS
    : TEXT_MUTED;

  return (
    <View style={fieldStyles.wrapper}>
      <Animated.View
        style={[
          fieldStyles.container,
          { borderColor },
          focused && fieldStyles.containerFocused,
        ]}
      >
        {/* Floating label */}
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
          pointerEvents="none"
        >
          {label}
        </Animated.Text>

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
  floatingLabel: {
    position: "absolute",
    left: 14,
    paddingHorizontal: 4,
    fontWeight: "600",
    zIndex: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: TEXT_PRIMARY,
    padding: 0,
  },
  rightSlot: {
    paddingLeft: 8,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    marginLeft: 4,
    gap: 5,
  },
  errorDot: {
    color: ERROR,
    fontSize: 6,
  },
  errorText: {
    color: ERROR,
    fontSize: 12,
    fontWeight: "500",
  },
});

// ─── Eye toggle icon ──────────────────────────────────────────
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

// ─── Animated CTA button ──────────────────────────────────────
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

// ─── Loading dots animation ───────────────────────────────────
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
            opacity: dot.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 1],
            }),
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

// ─── Logo with pulse ring ─────────────────────────────────────
function AnimatedLogo() {
  const pulse = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1.08,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(ringOpacity, {
              toValue: 0.3,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(ringOpacity, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse, ringOpacity]);

  return (
    <View style={logoStyles.container}>
      {/* Pulse ring */}
      <Animated.View
        style={[
          logoStyles.ring,
          {
            opacity: ringOpacity,
            transform: [{ scale: pulse }],
          },
        ]}
      />
      {/* Logo */}
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <LinearGradient
          colors={[GREEN, GREEN_DARK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={logoStyles.circle}
        >
          <Text style={logoStyles.wrenchIcon}>🔧</Text>
          <Text style={logoStyles.cutText}>CUT</Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  container: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  ring: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: GREEN,
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  wrenchIcon: { fontSize: 22, lineHeight: 26 },
  cutText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 3,
  },
});

// ─── Staggered entrance animation wrapper ────────────────────
function FadeSlideIn({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay,
        easing: Easing.out(Easing.back(1.1)),
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

// ─── Main login screen ────────────────────────────────────────
export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  const passwordRef = useRef<TextInput>(null);

  function validate() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)");
    } catch (err) {
      setErrors({
        password:
          (err as Error).message ?? "Incorrect email or password. Try again.",
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
          {/* ── Hero ── */}
          <View style={styles.hero}>
            <FadeSlideIn delay={0}>
              <AnimatedLogo />
            </FadeSlideIn>

            <FadeSlideIn delay={100}>
              <Text style={styles.appName}>CUT SmartFix</Text>
            </FadeSlideIn>

            <FadeSlideIn delay={180}>
              <View style={styles.taglineRow}>
                <Text style={styles.taglineDot}>⬤</Text>
                <Text style={styles.tagline}>
                  Campus maintenance, simplified.
                </Text>
              </View>
            </FadeSlideIn>
          </View>

          {/* ── Form card ── */}
          <FadeSlideIn delay={260}>
            <View style={styles.card}>
              <Text style={styles.heading}>Welcome back</Text>
              <Text style={styles.subheading}>
                Sign in to your student account
              </Text>

              <View style={styles.formBody}>
                <AnimatedField
                  label="Email address"
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
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />

                <AnimatedField
                  label="Password"
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    if (errors.password)
                      setErrors((e) => ({ ...e, password: undefined }));
                  }}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  textContentType="password"
                  editable={!loading}
                  error={errors.password}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  inputRef={passwordRef}
                  rightElement={
                    <EyeToggle
                      visible={showPassword}
                      onPress={() => setShowPassword((v) => !v)}
                    />
                  }
                />

                <PrimaryButton
                  label="Sign In"
                  onPress={handleLogin}
                  loading={loading}
                />
              </View>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Register link */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  New to CUT SmartFix?{"  "}
                </Text>
                <Link href="/auth/register" asChild>
                  <Pressable>
                    <Text style={styles.footerLink}>Create account →</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </FadeSlideIn>

          {/* Bottom note */}
          <FadeSlideIn delay={360}>
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

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
    justifyContent: "center",
  },
  // Hero
  hero: {
    alignItems: "center",
    marginBottom: 32,
    gap: 6,
  },
  appName: {
    color: TEXT_PRIMARY,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  taglineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  taglineDot: {
    color: GREEN,
    fontSize: 6,
  },
  tagline: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    letterSpacing: 0.1,
  },
  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  heading: {
    color: TEXT_PRIMARY,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subheading: {
    color: TEXT_MUTED,
    fontSize: 14,
    marginBottom: 28,
  },
  formBody: {
    gap: 0,
  },
  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#edf1ef",
  },
  dividerText: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
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
  // Bottom note
  bottomNote: {
    marginTop: 24,
    alignItems: "center",
  },
  bottomNoteText: {
    color: TEXT_MUTED,
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
