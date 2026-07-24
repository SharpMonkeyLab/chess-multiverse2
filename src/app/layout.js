import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GlobalMatchmakingBar from "@/components/GlobalMatchmakingBar";
import AuthModalProvider from "@/components/AuthModalProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Chess Multiverse",
  description:
    "Create, share, and play custom chess-inspired universes with characters, terrain, and rules.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/favicon.png", type: "image/png" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AuthModalProvider>
          <GlobalMatchmakingBar />
          {children}
        </AuthModalProvider>
      </body>
    </html>
  );
}
