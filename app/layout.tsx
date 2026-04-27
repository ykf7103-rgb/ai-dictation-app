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
  title: "AI 魔法默書助手",
  description: "讓默書變得好玩又有趣！AI 自動為你生成趣味故事、記憶卡、廣東話朗讀。",
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
