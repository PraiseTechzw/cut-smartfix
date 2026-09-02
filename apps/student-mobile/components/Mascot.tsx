/**
 * Mascot — the CUT SmartFix peeking owl/character for auth screens.
 *
 * States:
 *  "idle"        – neutral, eyes open, slight bob
 *  "typing"      – tracks the field (tilts left/right), reading
 *  "peek"        – peeks up from behind the card (eyes visible over edge)
 *  "hide"        – covers eyes with paws (password field focused)
 *  "success"     – big happy eyes, bounces up
 *  "error"       – eyes narrow/worried, shakes head
 *
 * The character is built entirely with React Native primitives —
 * no SVG library required.
 */
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

export type MascotState = "idle" | "typing" | "peek" | "hide" | "success" | "error";

// ─────────────────────────────────────────────────────────────
// Colours
// ─────────────────────────────────────────────────────────────
const GREEN      = "#0b6b57";
const GREEN_DARK = "#094f40";
const GREEN_MID  = "#1a8c73";
const CREAM      = "#f0f9f5";
const DARK       = "#0f1f1b";
const WHITE      = "#ffffff";
const AMBER      = "#e3b23c";
const AMBER_DARK = "#b8891e";
const RED        = "#c0392b";

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

// One eye — size, pupil direction and hidden state
function Eye({
  size = 22,
  hidden = false,
  happy = false,
  worried = false,
  lookX = 0, // -1 left, 0 centre, 1 right
  lookY = 0, // -1 up, 0 centre, 1 down
}: {
  size?: number;
  hidden?: boolean;
  happy?: boolean;
  worried?: boolean;
  lookX?: number;
  lookY?: number;
}) {
  const pupilOffset = size * 0.18;

  if (hidden) {
    // Squiggly closed-eye line (two arcs via borders)
    return (
      <View style={[eyeStyles.socket, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={eyeStyles.closedLine} />
      </View>
    );
  }

  if (happy) {
    // ^_^ style curved up
    return (
      <View style={[eyeStyles.socket, { width: size, height: size, borderRadius: size / 2 }]}>
        <View
          style={[
            eyeStyles.happyArc,
            {
              width: size * 0.65,
              height: size * 0.4,
              borderRadius: size * 0.4,
              borderBottomWidth: 0,
            },
          ]}
        />
      </View>
    );
  }

  if (worried) {
    // Small angled pupils
    return (
      <View style={[eyeStyles.socket, { width: size, height: size, borderRadius: size / 2 }]}>
        <View
          style={[
            eyeStyles.pupil,
            {
              width: size * 0.45,
              height: size * 0.45,
              borderRadius: size * 0.225,
              transform: [
                { translateX: lookX * pupilOffset },
                { translateY: lookY * pupilOffset + size * 0.05 },
              ],
            },
          ]}
        />
      </View>
    );
  }

  return (
    <View style={[eyeStyles.socket, { width: size, height: size, borderRadius: size / 2 }]}>
      {/* Pupil */}
      <View
        style={[
          eyeStyles.pupil,
          {
            width: size * 0.48,
            height: size * 0.48,
            borderRadius: size * 0.24,
            transform: [
              { translateX: lookX * pupilOffset },
              { translateY: lookY * pupilOffset },
            ],
          },
        ]}
      />
      {/* Shine */}
      <View
        style={[
          eyeStyles.shine,
          {
            width: size * 0.2,
            height: size * 0.2,
            borderRadius: size * 0.1,
            top: size * 0.14 + lookY * pupilOffset * 0.5,
            left: size * 0.54 + lookX * pupilOffset * 0.5,
          },
        ]}
      />
    </View>
  );
}

const eyeStyles = StyleSheet.create({
  socket: {
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pupil: {
    backgroundColor: DARK,
    position: "absolute",
  },
  shine: {
    backgroundColor: WHITE,
    position: "absolute",
    opacity: 0.9,
  },
  closedLine: {
    width: "60%",
    height: 3,
    backgroundColor: DARK,
    borderRadius: 2,
  },
  happyArc: {
    borderWidth: 3,
    borderColor: DARK,
    borderTopWidth: 0,
    backgroundColor: "transparent",
  },
});

// Paw that covers an eye
function Paw({ side }: { side: "left" | "right" }) {
  const flip = side === "right" ? -1 : 1;
  return (
    <View
      style={[
        pawStyles.paw,
        {
          transform: [{ scaleX: flip }],
          backgroundColor: GREEN_MID,
        },
      ]}
    >
      {/* Three toes */}
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[pawStyles.toe, { left: 4 + i * 9 }]}
        />
      ))}
    </View>
  );
}

const pawStyles = StyleSheet.create({
  paw: {
    width: 34,
    height: 26,
    borderRadius: 14,
    position: "relative",
    marginTop: 2,
  },
  toe: {
    position: "absolute",
    top: -7,
    width: 10,
    height: 14,
    borderRadius: 6,
    backgroundColor: GREEN_MID,
  },
});

// ─────────────────────────────────────────────────────────────
// Main Mascot
// ─────────────────────────────────────────────────────────────
interface MascotProps {
  state: MascotState;
  /** -1 to 1 — used in "typing" state to track field text length */
  lookProgress?: number;
}

export function Mascot({ state, lookProgress = 0 }: MascotProps) {
  // ── Animated values ────────────────────────────────────────
  const bodyY      = useRef(new Animated.Value(0)).current;
  const bodyRotate = useRef(new Animated.Value(0)).current;
  const bodyScale  = useRef(new Animated.Value(1)).current;
  const pawsY      = useRef(new Animated.Value(60)).current; // paws slide up to cover eyes
  const shakeX     = useRef(new Animated.Value(0)).current;

  // ── Bob loop (always running) ──────────────────────────────
  useEffect(() => {
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(bodyY, {
          toValue: -4,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bodyY, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    bob.start();
    return () => bob.stop();
  }, [bodyY]);

  // ── State transitions ──────────────────────────────────────
  useEffect(() => {
    // Reset rotation and scale
    Animated.parallel([
      Animated.spring(bodyRotate, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 8 }),
      Animated.spring(bodyScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
    ]).start();

    if (state === "hide") {
      // Slide paws UP to cover eyes
      Animated.spring(pawsY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 14,
        bounciness: 6,
      }).start();
    } else {
      // Slide paws back down
      Animated.spring(pawsY, {
        toValue: 60,
        useNativeDriver: true,
        speed: 18,
        bounciness: 4,
      }).start();
    }

    if (state === "typing") {
      // Tilt based on lookProgress
      Animated.spring(bodyRotate, {
        toValue: lookProgress * 8,
        useNativeDriver: true,
        speed: 14,
        bounciness: 5,
      }).start();
    }

    if (state === "success") {
      Animated.sequence([
        Animated.spring(bodyScale, { toValue: 1.18, useNativeDriver: true, speed: 30, bounciness: 12 }),
        Animated.spring(bodyScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
      ]).start();
    }

    if (state === "error") {
      // Shake side to side
      Animated.sequence([
        Animated.timing(shakeX, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -4, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [state, lookProgress, bodyRotate, bodyScale, pawsY, shakeX]);

  // ── Derived eye state ──────────────────────────────────────
  const eyeHidden  = state === "hide";
  const eyeHappy   = state === "success";
  const eyeWorried = state === "error";

  // Pupil tracking
  const lookX = state === "typing" ? Math.max(-0.7, Math.min(0.7, lookProgress)) : 0;
  const lookY = state === "peek" ? -0.5 : state === "typing" ? 0.3 : 0;

  return (
    <Animated.View
      style={[
        mascotStyles.root,
        {
          transform: [
            { translateY: bodyY },
            { translateX: shakeX },
            { rotate: bodyRotate.interpolate({ inputRange: [-15, 15], outputRange: ["-15deg", "15deg"] }) },
            { scale: bodyScale },
          ],
        },
      ]}
    >
      {/* ── Body ── */}
      <View style={mascotStyles.body}>
        {/* Belly patch */}
        <View style={mascotStyles.belly} />

        {/* Ear tufts */}
        <View style={[mascotStyles.ear, mascotStyles.earLeft]} />
        <View style={[mascotStyles.ear, mascotStyles.earRight]} />

        {/* Face */}
        <View style={mascotStyles.face}>
          {/* Eyes row */}
          <View style={mascotStyles.eyeRow}>
            <Eye
              size={22}
              hidden={eyeHidden}
              happy={eyeHappy}
              worried={eyeWorried}
              lookX={-lookX * 0.6}
              lookY={lookY}
            />
            <Eye
              size={22}
              hidden={eyeHidden}
              happy={eyeHappy}
              worried={eyeWorried}
              lookX={lookX * 0.6}
              lookY={lookY}
            />
          </View>

          {/* Beak / nose */}
          <View style={[
            mascotStyles.beak,
            eyeWorried && { borderTopColor: AMBER_DARK },
          ]} />

          {/* Blush dots (success) */}
          {eyeHappy && (
            <View style={mascotStyles.blushRow}>
              <View style={mascotStyles.blush} />
              <View style={mascotStyles.blush} />
            </View>
          )}
        </View>

        {/* Paws that slide up to cover eyes */}
        <Animated.View
          style={[
            mascotStyles.pawsContainer,
            { transform: [{ translateY: pawsY }] },
          ]}
          pointerEvents="none"
        >
          <Paw side="left" />
          <Paw side="right" />
        </Animated.View>
      </View>

      {/* Shadow */}
      <View style={mascotStyles.shadow} />
    </Animated.View>
  );
}

const mascotStyles = StyleSheet.create({
  root: {
    alignItems: "center",
  },
  body: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  belly: {
    position: "absolute",
    bottom: 8,
    width: 52,
    height: 44,
    borderRadius: 26,
    backgroundColor: CREAM,
    opacity: 0.6,
  },
  ear: {
    position: "absolute",
    top: 4,
    width: 18,
    height: 22,
    borderRadius: 9,
    backgroundColor: GREEN_DARK,
  },
  earLeft: { left: 10, transform: [{ rotate: "-15deg" }] },
  earRight: { right: 10, transform: [{ rotate: "15deg" }] },
  face: {
    alignItems: "center",
    gap: 4,
    marginTop: -4,
  },
  eyeRow: {
    flexDirection: "row",
    gap: 10,
  },
  beak: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: AMBER,
    marginTop: 1,
  },
  blushRow: {
    flexDirection: "row",
    gap: 22,
    marginTop: -2,
  },
  blush: {
    width: 10,
    height: 6,
    borderRadius: 5,
    backgroundColor: "#f4a0a0",
    opacity: 0.7,
  },
  pawsContainer: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    gap: 14,
    paddingBottom: 4,
  },
  shadow: {
    width: 60,
    height: 10,
    borderRadius: 30,
    backgroundColor: "rgba(11,107,87,0.18)",
    marginTop: 6,
  },
});
