import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./portals.css";
import "./dashboards.css";
import "./marketplace-pages.css";
import "./product-page.css";
import "./admin-products.css";
import "./finance.css";
import "./support.css";
import "./admin-support.css";
import "./announcements.css";
import "./auth.css";
import "./notifications.css";

export const metadata: Metadata = {
  title: "DigiMart | One Marketplace. Every Need.",
  description: "DigiMart — buy data, digital services, physical products and more.",
  applicationName: "DigiMart",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "DigiMart" },
};

export const viewport: Viewport = { themeColor: "#071c42" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
