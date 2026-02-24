import "./globals.css";

export const metadata = {
  title: "Ramanujan Retro Arcade",
  description: "Anonymous arcade with leaderboards"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
