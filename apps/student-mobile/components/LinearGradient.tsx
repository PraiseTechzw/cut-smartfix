/**
 * Re-exports LinearGradient from expo-linear-gradient, typed as a React.FC
 * so it is compatible with @types/react@^18.3 which requires class components
 * to have a `refs` property that expo-linear-gradient@14 doesn't declare.
 *
 * Import from this file instead of expo-linear-gradient directly:
 *   import { LinearGradient } from '../components/LinearGradient';
 */
import {
  LinearGradient as _LinearGradient,
  type LinearGradientProps,
} from "expo-linear-gradient";
import React from "react";

// Cast the class to React.FC to satisfy the @types/react 18.3 JSX checker.
export const LinearGradient = _LinearGradient as unknown as React.FC<LinearGradientProps>;
export type { LinearGradientProps };
