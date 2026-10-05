"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

const SAN_PEDRO = { lat: -22.9087, lng: -68.1997 };

export default function TerritoryMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    window.gm_authFailure = () => {
      setStatus("auth-error");
    };

    return () => {
      delete window.gm_authFailure;
    };
  }, []);

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps || mapInstanceRef.current) return;

    setStatus("checking");

    const map = new window.google.maps.Map(mapRef.current, {
      center: SAN_PEDRO,
      zoom: 14,
      mapTypeId: "roadmap",
      gestureHandling: "greedy",
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      clickableIcons: true,
      zoomControl: true,
      backgroundColor: "#101312"
    });

    mapInstanceRef.current = map;

    new window.google.maps.Marker({
      map,
      position: SAN_PEDRO,
      title: "San Pedro de Atacama · Laboratorio LINK"
    });

    new window.google.maps.Circle({
      map,
      center: SAN_PEDRO,
      radius: 900,
      strokeColor: "#d8ff72",
      strokeOpacity: 0.9,
      strokeWeight: 1,
      fillColor: "#d8ff72",
      fillOpacity: 0.04
    });

    window.google.maps.event.addListenerOnce(map, "tilesloaded", () => {
      setStatus("ready");
    });
  }, []);

  if (!apiKey) {
    return (
      <div className="mapError">
        <span>GOOGLE MAPS</span>
        <strong>Falta la variable de entorno</strong>
        <small>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</small>
      </div>
    );
  }

  const statusLabel =
    status === "ready"
      ? "Google Maps conectado"
      : status === "auth-error"
        ? "Google Maps · autorización pendiente"
        : status === "checking"
          ? "Verificando autorización…"
          : "Cargando territorio…";

  return (
    <div className="territoryMapShell">
      <Script
        id="google-maps-script"
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`}
        strategy="afterInteractive"
        onLoad={initMap}
        onReady={initMap}
        onError={() => setStatus("load-error")}
      />

      <div ref={mapRef} className="googleMapCanvas" />

      <div className="mapHud mapHudTopLeft">
        <span className="mapHudEyebrow">TERRITORIO 01</span>
        <strong>San Pedro de Atacama</strong>
        <small>Laboratorio de asociaciones LINK</small>
      </div>

      <div className="mapHud mapHudTopRight">
        <span><i className="dot activeDot" /> LINK activo</span>
        <span><i className="dot opportunityDot" /> oportunidad</span>
        <span><i className="dot lockedDot" /> bloqueado</span>
      </div>

      <div className="mapHud mapHudBottom">
        <div>
          <span className="mapHudEyebrow">CAPA ACTIVA</span>
          <strong>Mapa real + interfaz LINK</strong>
        </div>
        <span className={`mapStatus ${status === "ready" ? "isReady" : ""} ${status === "auth-error" ? "isError" : ""}`}>
          {statusLabel}
        </span>
      </div>
    </div>
  );
}
