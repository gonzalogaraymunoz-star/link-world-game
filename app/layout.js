import "./globals.css";
import "./genesis/genesis.css";
import GenesisEntry from "../components/GenesisEntry";

export const metadata = {
  title: "LINK WORLD GAME",
  description: "Territorio jugable del ecosistema LINK"
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}<GenesisEntry /></body>
    </html>
  );
}
