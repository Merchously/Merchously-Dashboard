import type { Metadata } from "next";
import { Montserrat, Roboto_Slab } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  variable: "--font-roboto-slab",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Merchously Dashboard",
  description: "Human-in-the-loop dashboard for Merchously agent system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${montserrat.variable} ${robotoSlab.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
