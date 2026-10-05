"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

const SAN_PEDRO = { lat: -22.9087, lng: -68.1997 };

function ApiBadge({ label, state }) {
  const mark = state === "ok" ? "✓" : state === "error" ? "!" : "…";
  return <span className={`apiBadge api-${state}`}><b>{mark}</b>{label}</span>;
}

export default function TerritoryMap({ businesses = [], selectedBusiness = null, onSelectBusiness }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const infoWindowRef = useRef(null);
  const linkedMarkersRef = useRef([]);
  const candidateMarkerRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [apiChecks, setApiChecks] = useState({
    maps: "pending",
    places: "pending",
    uiKit: "pending",
    geocoding: "pending"
  });
  const [diagnostic, setDiagnostic] = useState("");
  const [placeMode, setPlaceMode] = useState("");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const clearLinkedMarkers = useCallback(() => {
    for (const marker of linkedMarkersRef.current) marker.setMap?.(null);
    linkedMarkersRef.current = [];
  }, []);

  const clearCandidate = useCallback(() => {
    candidateMarkerRef.current?.setMap?.(null);
    candidateMarkerRef.current = null;
  }, []);

  useEffect(() => {
    window.gm_authFailure = () => {
      setStatus("auth-error");
      setApiChecks(v => ({ ...v, maps: "error" }));
      setDiagnostic("Google rechazó la autorización de la key o del dominio.");
    };
    return () => { delete window.gm_authFailure; };
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
      if (places?.length && places[0]?.id) setApiChecks(v => ({ ...v, places: "ok" }));
      else throw new Error("Places respondió sin resultados.");

      await new Promise(resolve => setTimeout(resolve, 100));
      const uiKitReady = !!customElements.get("gmp-place-details") || !!window.google?.maps?.places?.PlaceDetailsElement;
      setApiChecks(v => ({ ...v, uiKit: uiKitReady ? "ok" : "error" }));
    } catch (error) {
      setApiChecks(v => ({ ...v, places: "error", uiKit: "error" }));
      setDiagnostic(prev => prev || `Places: ${error?.message || "sin autorización"}`);
    }

    try {
      const geocoder = new window.google.maps.Geocoder();
      const { results } = await geocoder.geocode({ address: "San Pedro de Atacama, Antofagasta, Chile" });
      if (results?.length) setApiChecks(v => ({ ...v, geocoding: "ok" }));
      else throw new Error("Geocoding respondió sin resultados.");
    } catch (error) {
      setApiChecks(v => ({ ...v, geocoding: "error" }));
      setDiagnostic(prev => prev || `Geocoding: ${error?.message || "sin autorización"}`);
    }

    window.google.maps.event.addListenerOnce(map, "tilesloaded", () => setStatus("ready"));
  }, []);

  const renderBusinesses = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;
    clearLinkedMarkers();
    const linked = businesses.filter(row => row.google_place_id);
    if (!linked.length) return;

    try {
      const { Place } = await window.google.maps.importLibrary("places");
      for (const business of linked) {
        try {
          const place = new Place({ id: business.google_place_id, requestedLanguage: "es", requestedRegion: "CL" });
          await place.fetchFields({ fields: ["displayName", "location", "formattedAddress", "googleMapsURI"] });
          if (!place.location) continue;
          const marker = new window.google.maps.Marker({
            map,
            position: place.location,
            title: business.name,
            label: { text: "L", color: "#111111", fontWeight: "700" },
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: "#d8ff72",
              fillOpacity: 1,
              strokeColor: "#111111",
              strokeWeight: 2,
              scale: 12
            }
          });
          marker.addListener("click", () => {
            onSelectBusiness?.(business.id);
            infoWindowRef.current?.setContent(
              `<div style="font-family:Arial,sans-serif;max-width:220px;padding:4px 2px"><b>${business.name}</b><br><small>${place.formattedAddress || business.city || ""}</small><br><span style="display:inline-block;margin-top:8px;font-size:11px">Negocio LINK · ubicación Google vinculada</span></div>`
            );
            infoWindowRef.current?.open({ map, anchor: marker });
          });
          marker.__businessId = business.id;
          marker.__position = place.location;
          linkedMarkersRef.current.push(marker);
        } catch {
          // Mantener la ficha LINK aunque Google no resuelva un Place ID puntual.
        }
      }
    } catch {
      // El panel de privilegios ya expone el estado de Places.
    }
  }, [businesses, clearLinkedMarkers, onSelectBusiness]);

  const focusBusiness = useCallback(async business => {
    const map = mapInstanceRef.current;
    if (!map || !business || !window.google?.maps) return;
    clearCandidate();

    const linkedMarker = linkedMarkersRef.current.find(marker => marker.__businessId === business.id);
    if (linkedMarker?.__position) {
      map.panTo(linkedMarker.__position);
      map.setZoom(17);
      setPlaceMode("Place ID LINK");
      return;
    }

    try {
      const { Place } = await window.google.maps.importLibrary("places");
      const { places } = await Place.searchByText({
        textQuery: `${business.name}, ${business.city || "San Pedro de Atacama"}, ${business.country || "Chile"}`,
        fields: ["id", "displayName", "location", "formattedAddress", "googleMapsURI"],
        locationBias: SAN_PEDRO,
        maxResultCount: 1,
        language: "es",
        region: "cl"
      });
      const candidate = places?.[0];
      if (!candidate?.location) {
        setPlaceMode("Sin candidato Google");
        return;
      }
      const marker = new window.google.maps.Marker({
        map,
        position: candidate.location,
        title: `Candidato Google · ${candidate.displayName || business.name}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: "#ffffff",
          fillOpacity: 1,
          strokeColor: "#111111",
          strokeWeight: 2,
          scale: 10
        }
      });
      candidateMarkerRef.current = marker;
      map.panTo(candidate.location);
      map.setZoom(17);
      setPlaceMode("Candidato Google · no vinculado");
      infoWindowRef.current?.setContent(
        `<div style="font-family:Arial,sans-serif;max-width:240px;padding:4px 2px"><b>${candidate.displayName || business.name}</b><br><small>${candidate.formattedAddress || ""}</small><br><span style="display:inline-block;margin-top:8px;font-size:11px">Candidato temporal. LINK no lo guarda como Place ID hasta validarlo.</span></div>`
      );
      infoWindowRef.current?.open({ map, anchor: marker });
    } catch {
      setPlaceMode("Búsqueda Google no disponible");
    }
  }, [clearCandidate]);

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
    infoWindowRef.current = new window.google.maps.InfoWindow();

    new window.google.maps.Circle({
      map,
      center: SAN_PEDRO,
      radius: 1000,
      strokeColor: "#d8ff72",
      strokeOpacity: 0.65,
      strokeWeight: 1,
      fillColor: "#d8ff72",
      fillOpacity: 0.025
    });

    void runApiChecks(map).then(() => renderBusinesses());
  }, [renderBusinesses, runApiChecks]);

  useEffect(() => {
    if (status === "ready" || status === "checking") void renderBusinesses();
  }, [businesses, renderBusinesses, status]);

  useEffect(() => {
    if (selectedBusiness && (status === "ready" || status === "checking")) void focusBusiness(selectedBusiness);
  }, [selectedBusiness, focusBusiness, status]);

  if (!apiKey) {
    return <div className="mapError"><span>GOOGLE MAPS</span><strong>Falta la variable de entorno</strong><small>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</small></div>;
  }

  const statusLabel = status === "ready" ? "Google Maps conectado" : status === "auth-error" ? "Google Maps · autorización pendiente" : status === "checking" ? "Verificando APIs…" : "Cargando territorio…";

  return (
    <div className="territoryMapShell">
      <Script
        id="google-maps-script"
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`}
        strategy="afterInteractive"
        onLoad={initMap}
        onReady={initMap}
        onError={() => { setStatus("load-error"); setApiChecks(v => ({ ...v, maps: "error" })); }}
      />
      <div ref={mapRef} className="googleMapCanvas" />

      <div className="mapHud mapHudTopLeft">
        <span className="mapHudEyebrow">TERRITORIO 01</span>
        <strong>San Pedro de Atacama</strong>
        <small>{businesses.length} células LINK visibles · laboratorio de asociaciones</small>
      </div>

      <div className="apiDiagnostics compactDiagnostics">
        <span className="mapHudEyebrow">PRIVILEGIOS GOOGLE</span>
        <div className="apiBadgeRow">
          <ApiBadge label="Maps" state={apiChecks.maps} />
          <ApiBadge label="Places" state={apiChecks.places} />
          <ApiBadge label="UI Kit" state={apiChecks.uiKit} />
          <ApiBadge label="Geo" state={apiChecks.geocoding} />
        </div>
        {diagnostic ? <small>{diagnostic}</small> : null}
      </div>

      <div className="mapHud mapHudTopRight">
        <span><i className="dot activeDot" /> LINK vinculado</span>
        <span><i className="dot opportunityDot" /> candidato</span>
      </div>

      <div className="mapHud mapHudBottom">
        <div><span className="mapHudEyebrow">CAPA ACTIVA</span><strong>{selectedBusiness ? selectedBusiness.name : "Mapa real + interfaz LINK"}</strong></div>
        <span className={`mapStatus ${status === "ready" ? "isReady" : ""} ${status === "auth-error" ? "isError" : ""}`}>{placeMode || statusLabel}</span>
      </div>
    </div>
  );
}
