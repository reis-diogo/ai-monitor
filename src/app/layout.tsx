import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "getnow",
  description: "Monitor de repositórios",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col select-none">
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
