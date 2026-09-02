import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "CUT SmartFix | Staff Portal",
  description: "Maintenance staff workspace",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
