import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource/pacifico/400.css";
import "@fontsource/dancing-script/700.css";
import "@fontsource/cinzel-decorative/700.css";
import "@fontsource/yatra-one/400.css";
import "@fontsource/righteous/400.css";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { VersionGuard } from "@/components/system/VersionGuard";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: SITE.title,
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ["Panchayat", "voice chat", "social gaming", "voice rooms", "Ludo online", "waitlist"],
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    url: "/",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#111114",
  colorScheme: "dark",
  viewportFit: "cover",
  // The on-screen keyboard shrinks the page (instead of sliding over it), so chat boxes stay above it
  interactiveWidget: "resizes-content",
};

/**
 * Marks the page before it draws: data-native inside the Android app, and data-lite on the app and on phones that struggle
 * (little memory or few cores). Lite pages skip the most expensive effects (see globals.css).
 */
const LITE_SCRIPT = `(function(){try{var d=document.documentElement,u=navigator.userAgent||"",n=/PanchayatApp[/]/.test(u),m=navigator.deviceMemory||8,c=navigator.hardwareConcurrency||8,p=/Android|iPhone|iPad|Mobile/i.test(u);if(n)d.setAttribute("data-native","1");if(n||(p&&(m<=4||c<=4)))d.setAttribute("data-lite","1")}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LITE_SCRIPT }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-cream focus:px-4 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
        <VersionGuard />
      </body>
    </html>
  );
}
