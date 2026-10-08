"use client";

import { useEffect, useState } from "react";
import GameShell from "../components/GameShell";
import LivingMapGame from "../components/LivingMapGame";

// The Map and operational desks are two views of the same LINK WORLD.
// Both retain the existing canonical Supabase sources and business identity.
function readSurface() {
  if (typeof window === "undefined") return "loading";
  const params = new URLSearchParams(window.location.search);
  const dimension = String(params.get("dimension") || "concha").toLowerCase();
  return dimension === "concha" && params.get("surface") !== "mesa" ? "map" : "work";
}

export default function Home() {
  const [surface, setSurface] = useState("loading");

  useEffect(() => {
    const refresh = () => setSurface(readSurface());
    refresh();
    window.addEventListener("popstate", refresh);
    window.addEventListener("linkworld:route", refresh);
    return () => {
      window.removeEventListener("popstate", refresh);
      window.removeEventListener("linkworld:route", refresh);
    };
  }, []);

  if (surface === "loading") {
    return <main className="worldRouteLoading" role="status" aria-live="polite">
      <span>LINK WORLD</span>
      <strong>L I N K ·</strong>
      <small>PREPARANDO MAPA MAESTRO</small>
    </main>;
  }

  return surface === "map" ? <LivingMapGame /> : <GameShell />;
}
