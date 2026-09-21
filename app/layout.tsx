import type { Metadata, Viewport } from "next";

import { Caveat, Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "react-hot-toast";

import { AnalyticsCollector } from "@/components/AnalyticsCollector";
import { AuthGuard } from "@/components/AuthGuard";
import { DisableContextMenu } from "@/components/DisableContextMenu";
import { PwaServiceWorkerRegistrar } from "@/components/PwaServiceWorkerRegistrar";
import { QueryProvider } from "@/components/QueryProvider";
import { IssueTrackerProviderKindProvider } from "@/contexts/IssueTrackerProviderKindContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { getIssueTrackerProviderKind, getTrackerConfig } from "@/lib/env";
import { DEFAULT_LANGUAGE } from "@/lib/i18n/model";
import { translate } from "@/lib/i18n/translator";
import {
  issueTrackerTokenHelpUrl,
  issueTrackerWebBaseFromApiUrl,
} from "@/lib/issueTrackerProvider/issueTrackerUi";
import { PWA_START_HEADER, buildPwaManifestLinkHref } from "@/lib/pwa/pwaWebManifest";

import { ThemeProvider } from "./ThemeProvider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  preload: false,
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const caveat = Caveat({
  display: "swap",
  preload: false,
  subsets: ["latin", "cyrillic"],
  variable: "--font-caveat",
  weight: "700",
});

const excalifont = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/Excalifont-Regular.woff2",
  variable: "--font-excalifont-file",
  weight: "400",
});

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const start = headerList.get(PWA_START_HEADER) ?? "/";
  return {
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Beer Tracker",
    },
    description: translate(DEFAULT_LANGUAGE, "rootMeta.description"),
    icons: {
      apple: "/apple-touch-icon.png",
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      ],
    },
    manifest: buildPwaManifestLinkHref(start),
    title: "Beer Tracker",
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const issueTrackerProviderKind = getIssueTrackerProviderKind();
  const trackerApiUrl = getTrackerConfig().apiUrl;
  const issueTrackerTokenHelpHref = issueTrackerTokenHelpUrl(
    issueTrackerProviderKind,
    trackerApiUrl
  );
  const issueWebBaseUrl = issueTrackerWebBaseFromApiUrl(
    issueTrackerProviderKind,
    trackerApiUrl
  );
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // Скрипт предотвращает мерцание темы (FOUC) при первой загрузке
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('beer-tracker-theme');
                  if (theme) {
                    const parsed = JSON.parse(theme);
                    if (parsed === 'dark') {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
          suppressHydrationWarning
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} ${excalifont.variable} antialiased`}
      >
        <DisableContextMenu />
        <PwaServiceWorkerRegistrar />
        <QueryProvider>
          <NuqsAdapter>
            <ThemeProvider>
              <LanguageProvider>
                <IssueTrackerProviderKindProvider
                  issueWebBaseUrl={issueWebBaseUrl}
                  kind={issueTrackerProviderKind}
                  tokenHelpUrl={issueTrackerTokenHelpHref}
                >
                  <AuthGuard>
                    <AnalyticsCollector />
                    {children}
                    <Toaster
                      position="top-center"
                      toastOptions={{
                        duration: 4000,
                        style: {
                          background: 'var(--toast-bg)',
                          color: 'var(--toast-fg)',
                        },
                        success: {
                          duration: 3000,
                          iconTheme: {
                            primary: "#10b981",
                            secondary: "#fff",
                          },
                        },
                        error: {
                          duration: 5000,
                          iconTheme: {
                            primary: "#ef4444",
                            secondary: "#fff",
                          },
                        },
                      }}
                    />
                  </AuthGuard>
                </IssueTrackerProviderKindProvider>
              </LanguageProvider>
            </ThemeProvider>
          </NuqsAdapter>
        </QueryProvider>
      </body>
    </html>
  );
}
