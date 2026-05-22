import type { Metadata } from "next";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import {
  getDeploymentEnvironment,
  getDeploymentOrigin,
  isPreviewDeployment,
} from "@/lib/deployment";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const deploymentEnvironment = getDeploymentEnvironment();
const deploymentOrigin = getDeploymentOrigin();

export const metadata: Metadata = {
  title: "4U2Sing Request Companion",
  description: "Companion interface for karaoke song requests with memory.",
  metadataBase: deploymentOrigin,
  robots:
    deploymentEnvironment === "production"
      ? undefined
      : {
          index: false,
          follow: false,
        },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();
  const preview = isPreviewDeployment();

  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full`}
      >
        <body className="min-h-full flex flex-col">
          <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-white/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-strong)]">
                  4U2Sing
                </p>
                <p className="text-sm text-[color:var(--muted)]">Request companion</p>
              </div>
              <div className="flex items-center gap-3">
                {preview ? (
                  <span className="rounded-full border border-[color:var(--warning)] bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">
                    Preview
                  </span>
                ) : null}
                {userId ? (
                  <UserButton />
                ) : (
                  <>
                    <Link
                      href="/sign-in"
                      className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-medium"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/sign-up"
                      className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                    >
                      Create account
                    </Link>
                  </>
                )}
              </div>
            </div>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
