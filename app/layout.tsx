import type { Metadata } from "next";
import "./globals.css";
import { SiteProvider } from "@/components/site-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { PwaRegistrar } from "@/components/pwa-registrar";
import { AppToastProvider } from "@/components/app-toast-provider";
import "leaflet/dist/leaflet.css";
import { cairo, inter, spaceGrotesk } from "./fonts";

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "MT Club — Learn, create and grow together",
    template: "%s | MT Club",
  },
  description:
    "MT Club is a community of curious people who learn, create and grow side by side through OC, HR, PR, Tech, Logistics, Media and First Aid.",
  openGraph: {
    title: "MT Club — Learn, create and grow together",
    description:
      "A community of curious people who learn, create and grow side by side.",
    type: "website",
    siteName: "MT Club",
    images: [{ url: "/mt-logo.png", width: 652, height: 652, alt: "MT Club logo" }],
  },
  icons: {
    icon: "/mt-logo.png",
    apple: "/mt-logo.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${cairo.variable}`} suppressHydrationWarning>
      <body>
        <SiteProvider>
          <AuthSessionProvider>
            <AppToastProvider>
              <PwaRegistrar />
              <a className="skip-link" href="#main-content">Skip to main content</a>
              <Navbar />
              {children}
              <Footer />
            </AppToastProvider>
          </AuthSessionProvider>
        </SiteProvider>
      </body>
    </html>
  );
}
