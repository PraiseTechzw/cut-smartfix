/**
 * expo-linear-gradient@14 ships a class-component declaration that is
 * incompatible with @types/react@^18.3 because React 18.3 made the `refs`
 * property required on Component subclasses.
 *
 * This module-augmentation shim re-declares LinearGradient as a function
 * component (which is what it effectively is at runtime) so TypeScript is
 * happy without requiring a downgrade of either package.
 */
import "expo-linear-gradient";
import type { LinearGradientProps } from "expo-linear-gradient";
import type React from "react";

declare module "expo-linear-gradient" {
  // Re-export LinearGradient as a React FC so it is valid as a JSX element
  // under @types/react 18.3+.
  export const LinearGradient: React.FC<LinearGradientProps>;
}
