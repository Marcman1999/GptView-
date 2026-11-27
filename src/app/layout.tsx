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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

// Applies the reader's saved theme before first paint, so dark mode does not flash.
const themeScript = `try{var t=localStorage.getItem("gpt-view-theme");if(t==="light"||t==="dark"){document.documentElement.classList.add(t)}}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
