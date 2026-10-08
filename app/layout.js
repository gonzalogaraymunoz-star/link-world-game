import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import "./globals.css";
import "./concha.css";
import "./ledger.css";
import "./game-lab.css";

export const metadata = {
  title: "LINK WORLD GAME",
  description: "Laboratorio de estabilización de negocios de LINK"
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
