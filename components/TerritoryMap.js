"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

const SAN_PEDRO = { lat: -22.9087, lng: -68.1997 };

function ApiBadge({ label, state }) {
  const mark = state === "ok" ? "✓" : state === "error" ? "!" : "…";
  return <span className={`apiBadge api-${state}`}><b>{mark}</b>{label}</span>;
}

export default function TerritoryMap({ businesses = [], selectedBusiness = null, onSelectBusiness, progressByBusiness = new Map(), onExplorePlace }) {
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
    for (const marker of linkedMarkersRef.current) { marker.__aura?.setMap?.(null); marker.setMap?.(null); }
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
          const progress = progressByBusiness.get(business.id);
          const level = progress?.level || 0;
          const scale = 10 + level * 2.2;
          const marker = new window.google.maps.Marker({
            map,
            position: place.location,
            title: `${business.name} · ${progress?.percent || 0}% desarrollo`,
            label: { text: String(Math.max(1, level)), color: "#111111", fontWeight: "800", fontSize: "10px" },
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: "#d8ff72",
              fillOpacity: 0.72 + level * 0.055,
              strokeColor: "#111111",
              strokeWeight: 2,
              scale
            },
            zIndex: 100 + level
          });
          const aura = new window.google.maps.Circle({
            map,
            center: place.location,
            radius: 70 + level * 45,
            strokeColor: "#d8ff72",
            strokeOpacity: 0.18 + level * 0.05,
            strokeWeight: 1,
            fillColor: "#d8ff72",
            fillOpacity: 0.008 + level * 0.006,
            clickable: false
          });
          marker.__aura = aura;
          marker.addListener("click", () => {
            onSelectBusiness?.(business.id);
            onExplorePlace?.({
              kind: "linked",
              businessId: business.id,
              placeId: business.google_place_id,
              displayName: place.displayName || business.name,
              formattedAddress: place.formattedAddress || "",
              googleMapsURI: place.googleMapsURI || ""
            });
            infoWindowRef.current?.setContent(
              `<div style="font-family:Arial,sans-serif;max-width:240px;padding:4px 2px"><b>${business.name}</b><br><small>${place.formattedAddress || business.city || ""}</small><br><span style="display:inline-block;margin-top:8px;font-size:11px">Nivel ${level} · ${progress?.percent || 0}% desarrollo LINK</span></div>`
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
  }, [businesses, clearLinkedMarkers, onSelectBusiness, onExplorePlace, progressByBusiness]);

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

    map.addListener("click", async event => {
      if (!event.placeId) return;
      event.stop?.();
      try {
        const { Place } = await window.google.maps.importLibrary("places");
        const place = new Place({ id: event.placeId, requestedLanguage: "es", requestedRegion: "CL" });
        await place.fetchFields({
          fields: ["id", "displayName", "location", "formattedAddress", "primaryTypeDisplayName", "websiteURI", "nationalPhoneNumber", "rating", "userRatingCount", "googleMapsURI"]
        });
        const linkedBusiness = businesses.find(business => business.google_place_id === event.placeId);
        if (linkedBusiness) {
          onSelectBusiness?.(linkedBusiness.id);
          onExplorePlace?.({
            kind: "linked",
            businessId: linkedBusiness.id,
            placeId: event.placeId,
            displayName: place.displayName || linkedBusiness.name,
            formattedAddress: place.formattedAddress || "",
            primaryTypeDisplayName: place.primaryTypeDisplayName || "",
            websiteURI: place.websiteURI || "",
            nationalPhoneNumber: place.nationalPhoneNumber || "",
            rating: place.rating ?? null,
            userRatingCount: place.userRatingCount ?? null,
            googleMapsURI: place.googleMapsURI || ""
          });
          return;
        }
        onExplorePlace?.({
          kind: "external",
          placeId: event.placeId,
          displayName: place.displayName || "Negocio sin identificar",
          formattedAddress: place.formattedAddress || "",
          primaryTypeDisplayName: place.primaryTypeDisplayName || "",
          websiteURI: place.websiteURI || "",
          nationalPhoneNumber: place.nationalPhoneNumber || "",
          rating: place.rating ?? null,
          userRatingCount: place.userRatingCount ?? null,
          googleMapsURI: place.googleMapsURI || "",
          location: place.location ? { lat: place.location.lat(), lng: place.location.lng() } : null,
          researched: false
        });
      } catch (error) {
        setDiagnostic(prev => prev || `Ficha Google: ${error?.message || "no disponible"}`);
      }
    });

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
  }, [businesses, onExplorePlace, onSelectBusiness, renderBusinesses, runApiChecks]);

  useEffect(() => {
    if (status === "ready" || status === "checking") void renderBusinesses();
  }, [businesses, renderBusinesses, status]);

  useEffect(() => {
    if (selectedBusiness && (status === "ready" || status === "checking")) void focusBusiness(selectedBusiness);
  }, [selectedBusiness, focusBusiness, status]);

  if (!apiKey) {
    return (
      <div className="mapError" role="region" aria-label="Territorio LINK sin mapa">
        <span>TERRITORIO LINK</span>
        <strong>Mapa geográfico pendiente de conexión</strong>
        <small>Falta configurar Google Maps en Cloudflare. Las células reales siguen disponibles para navegar.</small>
        <div style={{ display: "grid", gap: 8, width: "min(320px, 85vw)", margin: "16px auto 0" }}>
          {businesses.length ? businesses.map(business => (
            <button key={business.id} type="button" className="secondaryButton"
              onClick={() => onSelectBusiness?.(business.id)}
              aria-label={`Abrir célula ${business.name}`}>
              {business.name}{business.city ? ` · ${business.city}` : ""}
            </button>
          )) : <small>No hay células autorizadas para mostrar en este contexto.</small>}
        </div>
      </div>
    );
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

      <div className="mapCompactLabel">
        <span>San Pedro de Atacama</span>
        <b>{businesses.length} LINK</b>
      </div>

      {status !== "ready" ? (
        <div className="mapConnectionChip">
          <span className={`mapStatus ${status === "auth-error" ? "isError" : ""}`}>{statusLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
