import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

interface BrandLogoProps {
  size: number;
  style?: StyleProp<ViewStyle>;
}

export function BrandLogo({ size, style }: BrandLogoProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, { width: size, height: size }, style]}
    >
      <Image
        source={require("../assets/brand-logo.png")}
        resizeMode="contain"
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 7,
    flexShrink: 0,
    justifyContent: "center",
    overflow: "hidden",
    padding: 2,
  },
  image: {
    height: "100%",
    width: "100%",
  },
});
