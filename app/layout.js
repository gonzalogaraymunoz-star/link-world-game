import "./globals.css";
import "./concha.css";

export const metadata = {
  title: "LINK WORLD GAME",
  description: "Territorio jugable del ecosistema LINK"
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
