import type { Metadata, Viewport } from "next";
import "@fontsource/anton/400.css";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Gpt View", template: "%s · Gpt View" },
  description:
    "Read a public ChatGPT share link as a clean, distraction-free, black-and-white reader. No account needed.",
  applicationName: "Gpt View",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-white text-black antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
