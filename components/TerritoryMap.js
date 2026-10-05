"use client";

import Script from "next/script";
import { useCallback, useRef, useState } from "react";

const SAN_PEDRO = { lat: -22.9087, lng: -68.1997 };

export default function TerritoryMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps || mapInstanceRef.current) return;

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
      backgroundColor: "#101312",
      styles: [
        { featureType: "poi.business", stylers: [{ visibility: "on" }] },
        { featureType: "transit", stylers: [{ visibility: "simplified" }] },
        { elementType: "labels.icon", stylers: [{ visibility: "on" }] }
      ]
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

    setStatus("ready");
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

  return (
    <div className="territoryMapShell">
      <Script
        id="google-maps-script"
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`}
        strategy="afterInteractive"
        onLoad={initMap}
        onReady={initMap}
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
        <span className={`mapStatus ${status === "ready" ? "isReady" : ""}`}>
          {status === "ready" ? "Google Maps conectado" : "Cargando territorio…"}
        </span>
      </div>
    </div>
  );
}
