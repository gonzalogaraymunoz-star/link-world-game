"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

const SAN_PEDRO = { lat: -22.9087, lng: -68.1997 };

function ApiBadge({ label, state }) {
  const mark = state === "ok" ? "✓" : state === "error" ? "!" : "…";
  return <span className={`apiBadge api-${state}`}><b>{mark}</b>{label}</span>;
}

export default function TerritoryMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [apiChecks, setApiChecks] = useState({
    maps: "pending",
    places: "pending",
    uiKit: "pending",
    geocoding: "pending"
  });
  const [diagnostic, setDiagnostic] = useState("");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    window.gm_authFailure = () => {
      setStatus("auth-error");
      setApiChecks(v => ({ ...v, maps: "error" }));
      setDiagnostic("Google rechazó la autorización de la key o del dominio.");
    };

    return () => {
      delete window.gm_authFailure;
    };
  }, []);

  const runApiChecks = useCallback(async (map) => {
    setApiChecks(v => ({ ...v, maps: "ok" }));

    try {
      const { Place } = await window.google.maps.importLibrary("places");
      const { places } = await Place.searchByText({
        textQuery: "San Pedro de Atacama, Chile",
        fields: ["id", "location"],
        locationBias: SAN_PEDRO,
        maxResultCount: 1,
        language: "es",
        region: "cl"
      });

      if (places?.length && places[0]?.id) {
        setApiChecks(v => ({ ...v, places: "ok" }));
      } else {
        throw new Error("Places respondió sin resultados.");
      }

      // Places UI Kit se registra dentro de la biblioteca Places.
      // Esperamos un ciclo para que los custom elements terminen de registrarse.
      await new Promise(resolve => setTimeout(resolve, 100));
      const uiKitReady =
        !!customElements.get("gmp-place-details") ||
        !!window.google?.maps?.places?.PlaceDetailsElement;

      setApiChecks(v => ({ ...v, uiKit: uiKitReady ? "ok" : "error" }));
    } catch (error) {
      console.error("LINK WORLD · Places diagnostic", error);
      setApiChecks(v => ({ ...v, places: "error", uiKit: "error" }));
      setDiagnostic(prev => prev || `Places: ${error?.message || "sin autorización"}`);
    }

    try {
      const geocoder = new window.google.maps.Geocoder();
      const { results } = await geocoder.geocode({
        address: "San Pedro de Atacama, Antofagasta, Chile"
      });

      if (results?.length) {
        setApiChecks(v => ({ ...v, geocoding: "ok" }));
      } else {
        throw new Error("Geocoding respondió sin resultados.");
      }
    } catch (error) {
      console.error("LINK WORLD · Geocoding diagnostic", error);
      setApiChecks(v => ({ ...v, geocoding: "error" }));
      setDiagnostic(prev => prev || `Geocoding: ${error?.message || "sin autorización"}`);
    }

    window.google.maps.event.addListenerOnce(map, "tilesloaded", () => {
      setStatus("ready");
    });
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

    void runApiChecks(map);
  }, [runApiChecks]);

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
          ? "Verificando APIs…"
          : "Cargando territorio…";

  return (
    <div className="territoryMapShell">
      <Script
        id="google-maps-script"
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`}
        strategy="afterInteractive"
        onLoad={initMap}
        onReady={initMap}
        onError={() => {
          setStatus("load-error");
          setApiChecks(v => ({ ...v, maps: "error" }));
        }}
      />

      <div ref={mapRef} className="googleMapCanvas" />

      <div className="mapHud mapHudTopLeft">
        <span className="mapHudEyebrow">TERRITORIO 01</span>
        <strong>San Pedro de Atacama</strong>
        <small>Laboratorio de asociaciones LINK</small>
      </div>

      <div className="apiDiagnostics">
        <span className="mapHudEyebrow">PRIVILEGIOS GOOGLE</span>
        <div className="apiBadgeRow">
          <ApiBadge label="Maps JS" state={apiChecks.maps} />
          <ApiBadge label="Places New" state={apiChecks.places} />
          <ApiBadge label="Places UI Kit" state={apiChecks.uiKit} />
          <ApiBadge label="Geocoding" state={apiChecks.geocoding} />
        </div>
        {diagnostic ? <small>{diagnostic}</small> : null}
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
