import type { Metadata } from "next";
import { Noto_Sans_HK } from "next/font/google";
import "./globals.css";
import { AppProvider } from "./context";

const notoHK = Noto_Sans_HK({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto-hk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI 魔法默書助手 · 樂善堂梁黃蕙芳紀念學校",
  description: "拍照默書範圍，AI 自動生成趣味故事、記憶卡、廣東話朗讀，學生可即場互動默書。",
  applicationName: "AI 魔法默書助手",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "AI 魔法默書",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "AI 魔法默書助手",
    description: "拍照默書範圍，AI 自動生成趣味故事、廣東話朗讀。",
    locale: "zh_HK",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#a855f7",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-HK" className={notoHK.variable}>
      <body className="min-h-screen antialiased" style={{ fontFamily: "var(--font-noto-hk), system-ui, sans-serif" }}>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
