/**
 * useMascot — derives MascotState from auth form field state.
 *
 * Rules:
 *  - Password focused          → "hide"
 *  - Email/name focused+typing → "typing"  (lookProgress tracks text length)
 *  - Error present             → "error"
 *  - Success                   → "success"
 *  - Nothing focused           → "idle"
 */
import { useMemo } from "react";
import type { MascotState } from "../components/Mascot";

interface UseMascotOptions {
  activeField: "none" | "name" | "email" | "studentId" | "password" | "confirmPassword";
  emailValue: string;
  hasError: boolean;
  isSuccess: boolean;
}

export function useMascot({
  activeField,
  emailValue,
  hasError,
  isSuccess,
}: UseMascotOptions): { state: MascotState; lookProgress: number } {
  return useMemo(() => {
    if (isSuccess) return { state: "success", lookProgress: 0 };

    if (activeField === "password" || activeField === "confirmPassword") {
      return { state: "hide", lookProgress: 0 };
    }

    if (hasError) return { state: "error", lookProgress: 0 };

    if (activeField === "email" || activeField === "name" || activeField === "studentId") {
      // lookProgress goes -1 → 1 based on text length (simulates eye tracking)
      const len = emailValue.length;
      const progress = Math.min(1, len / 24) * 2 - 1; // -1 at 0 chars, +1 at 24+
      return { state: "typing", lookProgress: progress };
    }

    return { state: "idle", lookProgress: 0 };
  }, [activeField, emailValue, hasError, isSuccess]);
}
