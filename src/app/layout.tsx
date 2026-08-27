import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { siteUrl } from "@/lib/site-url";
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
  metadataBase: new URL(siteUrl()),
  title: { default: "DigiMart | One Marketplace. Every Need.", template: "%s | DigiMart Ghana" },
  description: "DigiMart Ghana — buy MTN, Telecel and AirtelTigo data bundles, airtime, streaming subscriptions, result checkers, electronics, groceries and services. Pay with Mobile Money. One Marketplace. Every Need.",
  keywords: ["data bundles Ghana", "buy MTN data", "Telecel data", "AirtelTigo data", "airtime Ghana", "Netflix Ghana", "result checker", "online shopping Ghana", "Mobile Money shopping", "DigiMart"],
  applicationName: "DigiMart",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "DigiMart" },
  openGraph: { title: "DigiMart | One Marketplace. Every Need.", description: "Data bundles, airtime, subscriptions, electronics, groceries and services — one Mobile Money checkout.", url: "/", siteName: "DigiMart", locale: "en_GH", type: "website" },
  twitter: { card: "summary_large_image", title: "DigiMart Ghana", description: "One Marketplace. Every Need. Pay with Mobile Money." },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#071c42" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}
    <footer className="globalFooter">
      <div className="gfCredit">Powered by <b>Destech Solutions</b> — <a href="tel:0544216532">0544216532</a></div>
      <nav className="gfLinks"><Link href="/legal/terms">Terms</Link><span>·</span><Link href="/legal/privacy">Privacy</Link><span>·</span><Link href="/legal/refunds">Refunds</Link><span>·</span><Link href="/support">Support</Link><span>·</span><Link href="/">DigiMart</Link></nav>
      <small>One Marketplace. Every Need. © {new Date().getFullYear()} DigiMart Ghana.</small>
    </footer>
  </body></html>;
}
