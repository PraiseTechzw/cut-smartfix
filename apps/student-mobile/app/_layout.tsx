import { Stack } from "expo-router";

const NavigationStack = Stack as unknown as (props: {
  screenOptions: { headerShown: boolean };
}) => JSX.Element;

export default function RootLayout() {
  return <NavigationStack screenOptions={{ headerShown: false }} />;
}
