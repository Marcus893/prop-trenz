"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2 } from "lucide-react";
import { useTranslation } from "next-i18next";

// Fix default icon paths for Next.js
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

// City center coordinates for fallback
const CITY_CENTER_COORDS: { [key: string]: [number, number] } = {
  "Ciudad de México": [19.4326, -99.1332],
  Guadalajara: [20.6597, -103.3496],
  Monterrey: [25.6866, -100.3161],
  "Puerto Vallarta": [20.6218, -105.2439],
  "Los Cabos": [22.8905, -109.9167],
  Tijuana: [32.5149, -117.0382],
  Mérida: [20.9674, -89.5926],
  "Benito Juárez(Cancún)": [21.1619, -86.8515],
  "Playa del Carmen": [20.6296, -87.0739],
  Tulum: [20.2114, -87.4654],
};

// Municipality center coordinates (same names expected in rent data keys)
const MUNICIPALITY_COORDS: { [key: string]: [number, number] } = {
  // CDMX (Ciudad de México) Alcaldías
  Cuauhtémoc: [19.4326, -99.1332],
  "Álvaro Obregón": [19.3647, -99.1944],
  "Benito Juárez": [19.3722, -99.1569],
  "Miguel Hidalgo": [19.4326, -99.2],
  Coyoacán: [19.345, -99.1619],
  Azcapotzalco: [19.4889, -99.1867],
  "Cuajimalpa de Morelos": [19.3575, -99.2903],
  "Gustavo A. Madero": [19.4897, -99.1108],
  Iztacalco: [19.3958, -99.0978],
  Iztapalapa: [19.3575, -99.0925],
  "La Magdalena Contreras": [19.3311, -99.2472],
  Tlalpan: [19.2833, -99.2333],
  "Venustiano Carranza": [19.4333, -99.1],

  // Monterrey Municipalities (Nuevo León)
  Monterrey: [25.6866, -100.3161],
  "San Pedro Garza García": [25.6714, -100.4025],
  "San Nicolás de los Garza": [25.7471, -100.3025],
  Apodaca: [25.7803, -100.1868],
  Guadalupe: [25.6774, -100.2605],

  // Guadalajara Municipalities (Guadalajara area)
  Guadalajara: [20.6597, -103.3496],
  "San Pedro Tlaquepaque": [20.6409, -103.2933],
  Tonalá: [20.6244, -103.2342],
  Zapopan: [20.7236, -103.3848],

  // Puerto Vallarta Municipality
  "Puerto Vallarta": [20.6218, -105.2439],

  // Los Cabos Municipalities (Baja California Sur)
  "Los Cabos": [22.8905, -109.9167],

  // Tijuana Municipality (Baja California)
  Tijuana: [32.5149, -117.0382],

  // Mérida Municipality (Yucatán)
  Mérida: [20.9674, -89.5926],

  // Riviera Maya / Quintana Roo Municipalities
  "Benito Juárez (Cancún)": [21.1619, -86.8515], // Cancún
  Solidaridad: [20.6296, -87.0739], // Playa del Carmen
  Tulum: [20.2114, -87.4654],
};

function moneyFormat(n: number | undefined | null) {
  if (n === 0 || n === undefined || n === null || isNaN(n)) return "—";
  return `$${Math.round(n).toLocaleString("es-MX")}`;
}

function createDotIcon(color: string, size: number = 18) {
  return L.divIcon({
    className: "rent-dot",
    html: `<div style="background:${color}; width:${size}px; height:${size}px; border-radius:50%; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function avgColor(avg: number) {
  if (avg < 8000) return "#22c55e";
  if (avg < 12000) return "#84cc16";
  if (avg < 18000) return "#eab308";
  if (avg < 26000) return "#f97316";
  return "#ef4444";
}

export default function NeighborhoodRentMap({
  rentData,
  selectedMunicipality,
  setSelectedMunicipality,
  selectedCity,
  initialNeighborhood,
  onNeighborhoodSelect,
}: {
  rentData: Record<string, Record<string, any>>;
  selectedMunicipality: string | null;
  setSelectedMunicipality: (m: string | null) => void;
  selectedCity?: string | null;
  initialNeighborhood?: string | null;
  onNeighborhoodSelect?: (neighborhood: string, municipality: string) => void;
}) {
  const { t } = useTranslation("common");
  const [coordsMap, setCoordsMap] = useState<Record<
    string,
    [number, number]
  > | null>(null);
  const [loadingCoords, setLoadingCoords] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"less" | "greater">("less");
  const [filterPrice, setFilterPrice] = useState("");
  const [mapInstance, setMapInstance] = useState<any>(null);
  const markerRefs = React.useRef(new Map<string, any>());
  const municipalityMarkerRefs = React.useRef(new Map<string, any>());

  // Helper: decide city for a municipality
  function municipalityCity(m: string) {
    const cdmx = [
      "Cuauhtémoc",
      "Álvaro Obregón",
      "Benito Juárez",
      "Miguel Hidalgo",
      "Coyoacán",
      "Azcapotzalco",
      "Cuajimalpa de Morelos",
      "Gustavo A. Madero",
      "Iztacalco",
      "Iztapalapa",
      "La Magdalena Contreras",
      "Tlalpan",
      "Venustiano Carranza",
    ];
    const guadalajara = [
      "Guadalajara",
      "San Pedro Tlaquepaque",
      "Tonalá",
      "Zapopan",
    ];
    const monterrey = [
      "Monterrey",
      "San Pedro Garza García",
      "San Nicolás de los Garza",
      "Apodaca",
      "Guadalupe",
    ];
    const puertoVallarta = ["Puerto Vallarta"];
    const losCabos = ["Los Cabos"];
    const tijuana = ["Tijuana"];
    const merida = ["Mérida"];
    const cancun = ["Benito Juárez (Cancún)"];
    const solidaridad = ["Solidaridad"];
    const tulum = ["Tulum"];
    if (cdmx.includes(m)) return "Ciudad de México";
    if (guadalajara.includes(m)) return "Guadalajara";
    if (monterrey.includes(m)) return "Monterrey";
    if (puertoVallarta.includes(m)) return "Puerto Vallarta";
    if (losCabos.includes(m)) return "Los Cabos";
    if (tijuana.includes(m)) return "Tijuana";
    if (merida.includes(m)) return "Mérida";
    if (cancun.includes(m)) return "Benito Juárez(Cancún)";
    if (solidaridad.includes(m)) return "Playa del Carmen";
    if (tulum.includes(m)) return "Tulum";
  }

  // Photon geocoding (lightweight reuse of existing logic)
  async function geocodeWithPhoton(
    query: string,
    neighborhoodName: string,
    city: string = "Monterrey"
  ): Promise<[number, number] | null> {
    try {
      const cleanQuery = query
        .replace(/[^\w\s,áéíóúÁÉÍÓÚñÑüÜ]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      const encodedQuery = encodeURIComponent(cleanQuery);
      const url = `https://photon.komoot.io/api/?q=${encodedQuery}&limit=1`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data?.features && data.features.length > 0) {
        const feature = data.features[0];
        const coords = feature.geometry?.coordinates;
        if (coords && Array.isArray(coords) && coords.length >= 2) {
          const [lon, lat] = coords;
          // basic bounds checks similar to original implementation
          if (city === "Ciudad de México") {
            if (lat >= 19.0 && lat <= 20.0 && lon >= -99.4 && lon <= -98.9)
              return [lat, lon];
          } else if (city === "Guadalajara") {
            if (lat >= 20.4 && lat <= 20.8 && lon >= -103.6 && lon <= -103.1)
              return [lat, lon];
          } else if (city === "Monterrey") {
            if (lat >= 25.0 && lat <= 26.0 && lon >= -100.8 && lon <= -99.5)
              return [lat, lon];
          } else if (city === "Puerto Vallarta") {
            if (lat >= 20.5 && lat <= 20.8 && lon >= -105.4 && lon <= -105.0)
              return [lat, lon];
          } else if (city === "Los Cabos") {
            if (lat >= 22.8 && lat <= 23.2 && lon >= -110.0 && lon <= -109.5)
              return [lat, lon];
          } else if (city === "Tijuana") {
            if (lat >= 32.3 && lat <= 32.7 && lon >= -117.2 && lon <= -116.8)
              return [lat, lon];
          } else if (city === "Mérida") {
            if (lat >= 20.8 && lat <= 21.1 && lon >= -89.8 && lon <= -89.4)
              return [lat, lon];
          } else if (city === "Benito Juárez(Cancún)") {
            if (lat >= 21.0 && lat <= 21.3 && lon >= -87.0 && lon <= -86.7)
              return [lat, lon];
          } else if (city === "Playa del Carmen") {
            if (lat >= 20.4 && lat <= 20.8 && lon >= -87.2 && lon <= -86.9)
              return [lat, lon];
          } else if (city === "Tulum") {
            if (lat >= 20.1 && lat <= 20.4 && lon >= -87.6 && lon <= -87.3)
              return [lat, lon];
          }
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  // Enhanced geocoding with multiple query variants (expanded abbreviations, bounds checking)
  async function geocodeNeighborhood(
    neighborhoodName: string,
    municipality: string,
    city: string = "Monterrey"
  ): Promise<[number, number] | null> {
    // Extract name from parentheses (e.g., "Villa Magna (Las Cruces)" -> "Las Cruces")
    const parenthesesMatch = neighborhoodName.match(/\(([^)]+)\)/);
    const parenthesesName = parenthesesMatch
      ? parenthesesMatch[1].trim()
      : null;

    // Expand common abbreviations
    const expandAbbreviations = (name: string): string[] => {
      const variants: string[] = [name];
      if (name.includes("Rdcial")) {
        variants.push(name.replace(/Rdcial/gi, "Residencial"));
      }
      if (name.match(/\bU\s+De\b/i)) {
        variants.push(name.replace(/\bU\s+De\b/gi, "Unidad De"));
        variants.push(name.replace(/\bU\s+De\b/gi, "Unidad De Colonos"));
      }
      if (name.includes("Hda")) {
        variants.push(name.replace(/Hda/gi, "Hacienda"));
      }
      if (name.match(/\bSec\b/i)) {
        variants.push(name.replace(/\bSec\b/gi, "Sector"));
      }
      return variants;
    };

    // Clean neighborhood name
    const cleanName = neighborhoodName
      .replace(/^Colonia\s+/i, "")
      .replace(/\s+\(.*?\)$/g, "")
      .trim();

    // Build query list
    const nameVariants: string[] = [cleanName, neighborhoodName];
    if (parenthesesName) {
      nameVariants.push(parenthesesName);
      nameVariants.push(`${cleanName} (${parenthesesName})`);
    }

    // Expand abbreviations
    const expandedVariants: string[] = [];
    for (const variant of nameVariants) {
      expandedVariants.push(variant);
      expandedVariants.push(...expandAbbreviations(variant));
    }

    // Determine city/state for queries
    const genericNames = [
      "Hidalgo",
      "Terminal",
      "Industrial",
      "Centro",
      "Norte",
      "Sur",
      "Este",
      "Oeste",
    ];
    let cityState: string;
    let cityName: string;
    if (city === "Ciudad de México") {
      cityState = "Ciudad de México";
      cityName = "Ciudad de México";
    } else if (city === "Guadalajara") {
      cityState = "Jalisco";
      cityName = "Guadalajara";
    } else if (city === "Puerto Vallarta") {
      cityState = "Jalisco";
      cityName = "Puerto Vallarta";
    } else if (city === "Monterrey") {
      cityState = "Nuevo León";
      cityName = "Monterrey";
    } else if (city === "Los Cabos") {
      cityState = "Baja California Sur";
      cityName = "Los Cabos";
    } else if (city === "Tijuana") {
      cityState = "Baja California";
      cityName = "Tijuana";
    } else if (city === "Mérida") {
      cityState = "Yucatán";
      cityName = "Mérida";
    } else if (city === "Benito Juárez(Cancún)") {
      cityState = "Quintana Roo";
      cityName = "Cancún";
    } else if (city === "Playa del Carmen") {
      cityState = "Quintana Roo";
      cityName = "Playa del Carmen";
    } else if (city === "Tulum") {
      cityState = "Quintana Roo";
      cityName = "Tulum";
    } else {
      cityState = "Ciudad de México";
      cityName = "Ciudad de México";
    }

    // Build queries
    const queries: string[] = [];
    for (const name of expandedVariants) {
      queries.push(`${name}, ${municipality}, ${cityState}`);
      queries.push(`${name}, ${municipality}`);
      queries.push(`${name}, ${municipality}, ${cityName}, ${cityState}`);
      queries.push(`${name}, ${cityName}, ${cityState}`);

      // For generic names, try more specific queries
      if (name.length <= 10 || genericNames.some((g) => name.includes(g))) {
        queries.push(`${municipality} ${name}, ${cityState}`);
        queries.push(`${name} colonia ${municipality}, ${cityState}`);
        queries.push(
          `${name} colonia ${municipality}, ${cityName}, ${cityState}`
        );
        if (name !== neighborhoodName) {
          queries.push(`${neighborhoodName}, ${municipality}, ${cityState}`);
          queries.push(
            `${neighborhoodName}, ${municipality}, ${cityName}, ${cityState}`
          );
        }
      }
    }

    // Remove duplicates
    const uniqueQueries = Array.from(new Set(queries));

    // Try all query variants
    for (const query of uniqueQueries) {
      const coords = await geocodeWithPhoton(query, neighborhoodName, city);
      if (coords) {
        return coords;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return null;
  }

  // Load coordinates from API for the currently selected municipality, or for selected city, or all
  useEffect(() => {
    let mounted = true;
    async function loadCoords() {
      setLoadingCoords(true);
      try {
        // If a municipality is selected, fetch only that municipality coordinates
        // If a city is selected (and no municipality), fetch coords for the whole city
        let params = "";
        if (selectedMunicipality) {
          params = `?municipality=${encodeURIComponent(selectedMunicipality)}`;
        } else if (selectedCity) {
          params = `?city=${encodeURIComponent(selectedCity)}`;
        }
        const resp = await fetch(`/api/neighborhood-coordinates${params}`);
        if (!resp.ok) throw new Error("Failed to fetch coordinates");
        const json = await resp.json();
        if (!mounted) return;
        // ensure object
        const baseMap: Record<string, [number, number]> = json || {};
        // For the selected municipality, ensure we have coords for all neighborhoods; geocode missing ones
        if (
          selectedMunicipality &&
          rentData &&
          rentData[selectedMunicipality]
        ) {
          const toGeocode: string[] = [];
          const needs: Record<string, string> = {};
          for (const neigh of Object.keys(rentData[selectedMunicipality])) {
            const key = `${selectedMunicipality}-${neigh}`;
            if (!baseMap[key]) {
              toGeocode.push(neigh);
              needs[key] = neigh;
            }
          }

          const found: Record<string, [number, number]> = {};
          if (toGeocode.length > 0) {
            const city = municipalityCity(selectedMunicipality);
            for (const neigh of toGeocode) {
              // Use enhanced geocoding with multiple query variants
              const coords = await geocodeNeighborhood(
                neigh,
                selectedMunicipality,
                city
              );
              if (coords) {
                const key = `${selectedMunicipality}-${neigh}`;
                found[key] = coords;
              }
              // small delay to be polite
              await new Promise((r) => setTimeout(r, 120));
            }
          }

          // If we found some, persist them to server
          if (Object.keys(found).length > 0) {
            try {
              await fetch("/api/save-coordinates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  coordinates: found,
                  city: municipalityCity(selectedMunicipality),
                }),
              });
            } catch (e) {
              console.warn("Failed to save coordinates", e);
            }
            // merge found into baseMap
            Object.assign(baseMap, found);
          }
        }

        if (!mounted) return;
        setCoordsMap(baseMap);
      } catch (e) {
        console.warn("Could not load neighborhood coordinates:", e);
        if (mounted) setCoordsMap({});
      } finally {
        if (mounted) setLoadingCoords(false);
      }
    }

    loadCoords();
    return () => {
      mounted = false;
    };
  }, [selectedMunicipality, selectedCity, rentData]);

  // Build municipality markers with average across available neighborhood averages
  const municipalityMarkers = useMemo(() => {
    if (!rentData) return [];

    const arr: Array<{
      municipality: string;
      position: [number, number];
      avg: number;
      neighborhoods: string[];
    }> = [];

    for (const [municipality, neighborhoods] of Object.entries(rentData)) {
      // filter by selected city if provided
      if (selectedCity) {
        const cityForMun = (function (m: string) {
          const cdmx = [
            "Cuauhtémoc",
            "Álvaro Obregón",
            "Benito Juárez",
            "Miguel Hidalgo",
            "Coyoacán",
            "Azcapotzalco",
            "Cuajimalpa de Morelos",
            "Gustavo A. Madero",
            "Iztacalco",
            "Iztapalapa",
            "La Magdalena Contreras",
            "Tlalpan",
            "Venustiano Carranza",
          ];
          const guadalajara = [
            "Guadalajara",
            "San Pedro Tlaquepaque",
            "Tonalá",
            "Zapopan",
          ];
          const monterrey = [
            "Monterrey",
            "San Pedro Garza García",
            "San Nicolás de los Garza",
            "Apodaca",
            "Guadalupe",
          ];
          const puertoVallarta = ["Puerto Vallarta"];
          const losCabos = ["Los Cabos"];
          const tijuana = ["Tijuana"];
          const merida = ["Mérida"];
          const cancun = ["Benito Juárez (Cancún)"];
          const solidaridad = ["Solidaridad"];
          const tulum = ["Tulum"];
          if (cdmx.includes(m)) return "Ciudad de México";
          if (guadalajara.includes(m)) return "Guadalajara";
          if (monterrey.includes(m)) return "Monterrey";
          if (puertoVallarta.includes(m)) return "Puerto Vallarta";
          if (losCabos.includes(m)) return "Los Cabos";
          if (tijuana.includes(m)) return "Tijuana";
          if (merida.includes(m)) return "Mérida";
          if (cancun.includes(m)) return "Benito Juárez(Cancún)";
          if (solidaridad.includes(m)) return "Playa del Carmen";
          if (tulum.includes(m)) return "Tulum";
          return null;
        })(municipality);
        if (cityForMun !== selectedCity) continue;
      }
      const coords = MUNICIPALITY_COORDS[municipality] || null;
      // compute municipality average by averaging the normalized neighborhood averages
      const neighborhoodValues: number[] = [];
      const neighborhoodKeys: string[] = [];
      for (const [neigh, stats] of Object.entries(neighborhoods)) {
        // Use the normalized neighborhood_avg_price
        if (stats.neighborhood_avg_price) {
          neighborhoodValues.push(stats.neighborhood_avg_price);
          neighborhoodKeys.push(neigh);
        }
      }

      if (neighborhoodValues.length > 0 && coords) {
        const avg =
          neighborhoodValues.reduce((s, v) => s + v, 0) /
          neighborhoodValues.length;
        arr.push({
          municipality,
          position: coords as [number, number],
          avg,
          neighborhoods: neighborhoodKeys,
        });
      }
    }

    return arr.sort((a, b) => b.avg - a.avg);
  }, [rentData, selectedCity]);

  // Build neighborhood markers for selected municipality
  const neighborhoodMarkers = useMemo(() => {
    if (!coordsMap || !rentData || !selectedMunicipality) return [];
    const neighborhoods = rentData[selectedMunicipality];
    if (!neighborhoods) return [];

    const result: Array<{
      key: string;
      name: string;
      coords: [number, number];
      stats: any;
    }> = [];
    for (const [neigh, stats] of Object.entries(neighborhoods)) {
      const key = `${selectedMunicipality}-${neigh}`;
      const coords = (coordsMap as any)[key];
      if (!coords) continue;
      // attach stats
      result.push({
        key,
        name: neigh,
        coords: coords as [number, number],
        stats,
      });
    }
    return result;
  }, [coordsMap, rentData, selectedMunicipality]);

  // default center
  const center: [number, number] = useMemo(() => {
    if (selectedMunicipality && MUNICIPALITY_COORDS[selectedMunicipality])
      return MUNICIPALITY_COORDS[selectedMunicipality];

    // If a city is selected, try to find a municipality within that city that has coords
    if (selectedCity && rentData) {
      for (const mun of Object.keys(rentData)) {
        // determine city for mun
        const cdmx = [
          "Cuauhtémoc",
          "Álvaro Obregón",
          "Benito Juárez",
          "Miguel Hidalgo",
          "Coyoacán",
          "Azcapotzalco",
          "Cuajimalpa de Morelos",
          "Gustavo A. Madero",
          "Iztacalco",
          "Iztapalapa",
          "La Magdalena Contreras",
          "Tlalpan",
          "Venustiano Carranza",
        ];
        const guadalajara = [
          "Guadalajara",
          "San Pedro Tlaquepaque",
          "Tonalá",
          "Zapopan",
        ];
        const monterrey = [
          "Monterrey",
          "San Pedro Garza García",
          "San Nicolás de los Garza",
          "Apodaca",
          "Guadalupe",
        ];
        const puertoVallarta = ["Puerto Vallarta"];
        const losCabos = ["Los Cabos"];
        const tijuana = ["Tijuana"];
        const merida = ["Mérida"];
        const cancun = ["Benito Juárez (Cancún)"];
        const solidaridad = ["Solidaridad"];
        const tulum = ["Tulum"];
        const cityForMun = cdmx.includes(mun)
          ? "Ciudad de México"
          : guadalajara.includes(mun)
          ? "Guadalajara"
          : monterrey.includes(mun)
          ? "Monterrey"
          : puertoVallarta.includes(mun)
          ? "Puerto Vallarta"
          : losCabos.includes(mun)
          ? "Los Cabos"
          : tijuana.includes(mun)
          ? "Tijuana"
          : merida.includes(mun)
          ? "Mérida"
          : cancun.includes(mun)
          ? "Benito Juárez(Cancún)"
          : solidaridad.includes(mun)
          ? "Playa del Carmen"
          : tulum.includes(mun)
          ? "Tulum"
          : null;
        if (cityForMun === selectedCity && MUNICIPALITY_COORDS[mun]) {
          return MUNICIPALITY_COORDS[mun];
        }
      }
      // If no municipality found for this city in rentData, use city fallback center
      if (CITY_CENTER_COORDS[selectedCity]) {
        return CITY_CENTER_COORDS[selectedCity];
      }
    }

    // fallback: first municipality or Mexico City
    const firstCoords = municipalityFirst();
    return firstCoords || CITY_CENTER_COORDS["Ciudad de México"];
  }, [selectedMunicipality, selectedCity, rentData]);

  function municipalityFirst(): [number, number] | null {
    const keys = Object.keys(rentData || {});
    for (const k of keys) {
      if (MUNICIPALITY_COORDS[k]) return MUNICIPALITY_COORDS[k];
    }
    return null;
  }

  // Get municipality details when a municipality is selected
  // Reuse the already-computed average from municipalityMarkers
  const selectedMunicipalityData = useMemo(() => {
    if (!selectedMunicipality || !rentData[selectedMunicipality]) return null;

    const neighborhoods = rentData[selectedMunicipality];
    const neighborhoodList = Object.entries(neighborhoods).map(
      ([name, stats]) => ({
        name,
        stats,
      })
    );

    // Find the precomputed average from municipalityMarkers
    const municipalityMarker = municipalityMarkers.find(
      (m) => m.municipality === selectedMunicipality
    );
    const avgPrice = municipalityMarker?.avg || 0;

    return {
      municipality: selectedMunicipality,
      avgPrice,
      neighborhoods: neighborhoodList,
    };
  }, [selectedMunicipality, rentData, municipalityMarkers]);

  // Pre-calculate neighborhood averages for filtering and sorting
  // Use the normalized neighborhood_avg_price (price/m² × 70m² standard size)
  const neighborhoodAverages = useMemo(() => {
    if (!selectedMunicipalityData) return new Map<string, number>();

    const map = new Map<string, number>();
    selectedMunicipalityData.neighborhoods.forEach(({ name, stats }) => {
      map.set(name, stats.neighborhood_avg_price || 0);
    });
    return map;
  }, [selectedMunicipalityData]);

  // Filter neighborhoods based on search and price filters
  const filteredNeighborhoods = useMemo(() => {
    if (!selectedMunicipalityData) return [];

    return selectedMunicipalityData.neighborhoods
      .filter(({ name }) => {
        // Text search filter
        return (
          searchQuery === "" ||
          name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
      .filter(({ name }) => {
        // Price filter
        if (!filterPrice || filterPrice.trim() === "") return true;

        const priceValue = parseFloat(filterPrice);
        if (isNaN(priceValue) || priceValue <= 0) return true;

        const neighborhoodAvg = neighborhoodAverages.get(name) || 0;
        if (filterType === "less") {
          return neighborhoodAvg < priceValue;
        } else {
          return neighborhoodAvg > priceValue;
        }
      })
      .sort((a, b) => {
        // Sort by average price descending
        const aAvg = neighborhoodAverages.get(a.name) || 0;
        const bAvg = neighborhoodAverages.get(b.name) || 0;
        return bAvg - aAvg;
      });
  }, [
    selectedMunicipalityData,
    searchQuery,
    filterType,
    filterPrice,
    neighborhoodAverages,
  ]);

  // Handle neighborhood card click to pan and zoom map
  const handleNeighborhoodClick = (neighborhoodName: string) => {
    if (!selectedMunicipality || !mapInstance || !coordsMap) return;

    const key = `${selectedMunicipality}-${neighborhoodName}`;
    const coords = coordsMap[key];

    // Notify parent about neighborhood selection for URL update
    if (onNeighborhoodSelect) {
      onNeighborhoodSelect(neighborhoodName, selectedMunicipality);
    }

    if (coords) {
      try {
        // Check if map is still valid
        if (!mapInstance.getContainer()) return;

        // Center the map on the neighborhood marker
        mapInstance.setView(coords, 15, { animate: true, duration: 0.3 });

        // Find and open the marker popup
        const marker = markerRefs.current.get(key);
        if (marker) {
          // Small delay to ensure map has panned
          setTimeout(() => {
            try {
              if (marker && mapInstance && mapInstance.getContainer()) {
                marker.openPopup();
              }
            } catch (e) {
              console.warn("Error opening marker popup:", e);
            }
          }, 350);
        }
      } catch (e) {
        console.warn("Error zooming to neighborhood:", e);
      }
    }
  };

  // Auto-zoom to initial neighborhood from URL
  const [hasProcessedInitialNeighborhood, setHasProcessedInitialNeighborhood] =
    useState(false);
  const [pendingNeighborhoodPopup, setPendingNeighborhoodPopup] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (
      !initialNeighborhood ||
      !mapInstance ||
      !coordsMap ||
      !rentData ||
      hasProcessedInitialNeighborhood
    )
      return;

    // Find which municipality contains this neighborhood
    // The neighborhood slug from URL is lowercase with dashes
    const neighborhoodSlug = initialNeighborhood
      .toLowerCase()
      .replace(/\s+/g, "-");

    for (const [municipality, neighborhoods] of Object.entries(rentData)) {
      // Check if this municipality is in the selected city
      const muniCity = municipalityCity(municipality);
      if (selectedCity && muniCity !== selectedCity) continue;

      for (const neighborhoodName of Object.keys(neighborhoods)) {
        const nameSlug = neighborhoodName.toLowerCase().replace(/\s+/g, "-");
        if (
          nameSlug === neighborhoodSlug ||
          decodeURIComponent(neighborhoodSlug) === nameSlug
        ) {
          // Mark as processed so we don't keep reopening
          setHasProcessedInitialNeighborhood(true);

          // Found the neighborhood! Select the municipality first
          setSelectedMunicipality(municipality);

          // Store the key for pending popup - will be opened after markers render
          const key = `${municipality}-${neighborhoodName}`;
          setPendingNeighborhoodPopup(key);

          // Zoom to the neighborhood
          const coords = coordsMap[key];
          if (coords && mapInstance && mapInstance.getContainer()) {
            try {
              mapInstance.setView(coords, 15, { animate: false });
            } catch (e) {
              console.warn("Error zooming to initial neighborhood:", e);
            }
          }
          return;
        }
      }
    }
  }, [
    initialNeighborhood,
    mapInstance,
    coordsMap,
    rentData,
    selectedCity,
    hasProcessedInitialNeighborhood,
  ]);

  // Handle opening the pending neighborhood popup after markers are rendered
  useEffect(() => {
    if (!pendingNeighborhoodPopup || !mapInstance) return;

    // Wait for the neighborhood markers to render after municipality is selected
    const tryOpenPopup = () => {
      const marker = markerRefs.current.get(pendingNeighborhoodPopup);
      if (marker) {
        try {
          if (mapInstance.getContainer()) {
            marker.openPopup();
          }
        } catch (e) {
          console.warn("Error opening neighborhood popup:", e);
        }
        setPendingNeighborhoodPopup(null);
        return true;
      }
      return false;
    };

    // Try immediately first
    if (tryOpenPopup()) return;

    // If not found, retry with delays to allow for render
    const timeouts = [100, 300, 500, 1000];
    const cleanups: NodeJS.Timeout[] = [];

    for (const delay of timeouts) {
      const timeout = setTimeout(() => {
        if (pendingNeighborhoodPopup) {
          tryOpenPopup();
        }
      }, delay);
      cleanups.push(timeout);
    }

    return () => {
      cleanups.forEach(clearTimeout);
    };
  }, [pendingNeighborhoodPopup, mapInstance, selectedMunicipality]);

  // Open municipality popup when municipality is selected (but not when opening from neighborhood URL)
  useEffect(() => {
    // Skip if we're opening from an initial neighborhood - let the neighborhood popup show instead
    if (initialNeighborhood && hasProcessedInitialNeighborhood) return;
    // Skip if there's a pending neighborhood popup
    if (pendingNeighborhoodPopup) return;
    if (!selectedMunicipality || !mapInstance) return;

    const marker = municipalityMarkerRefs.current.get(selectedMunicipality);
    if (marker) {
      // Delay to ensure marker is fully rendered
      setTimeout(() => {
        try {
          if (marker && mapInstance && mapInstance.getContainer()) {
            marker.openPopup();
          }
        } catch (e) {
          console.warn("Error opening municipality popup:", e);
        }
      }, 300);
    }
  }, [
    selectedMunicipality,
    mapInstance,
    initialNeighborhood,
    hasProcessedInitialNeighborhood,
    pendingNeighborhoodPopup,
  ]);

  // Zoom out when panel closes
  useEffect(() => {
    if (!mapInstance || !selectedCity) return;

    // When a municipality was selected but now is not, zoom out
    if (selectedMunicipality === null && mapInstance.getContainer()) {
      try {
        // Zoom back to city level
        const cityCenter =
          CITY_CENTER_COORDS[selectedCity] ||
          CITY_CENTER_COORDS["Ciudad de México"];
        mapInstance.setView(cityCenter, selectedCity ? 11 : 9, {
          animate: true,
          duration: 0.5,
        });
      } catch (e) {
        console.warn("Error zooming out:", e);
      }
    }
  }, [selectedMunicipality, mapInstance, selectedCity]);

  // Component to capture map instance
  function MapUpdater({
    setMapInstance,
  }: {
    setMapInstance: (map: any) => void;
  }) {
    const map = useMap();
    useEffect(() => {
      setMapInstance(map);
    }, [map, setMapInstance]);
    return null;
  }

  if (!rentData) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading rent data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col md:flex-row gap-4 z-0">
      {/* Left sidebar - neighborhoods panel */}
      {selectedMunicipalityData && (
        <div className="w-full max-h-[400px] md:max-h-[600px] md:w-60 md:flex-shrink-0 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col overflow-hidden rounded-lg md:rounded-l-lg md:rounded-r-none shadow-sm z-[1100]">
          {/* Header */}
          <div className="flex justify-between items-center p-1 md:p-2 border-b bg-white flex-shrink-0">
            <h3 className="font-bold text-base md:text-lg">
              {selectedMunicipalityData.municipality}
            </h3>
            <button
              onClick={() => {
                setSelectedMunicipality(null);
                setSearchQuery("");
                setFilterPrice("");
              }}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Summary */}
          <div className="px-3 md:px-4 py-2 md:py-3 border-b bg-white flex-shrink-0">
            <p className="text-sm text-gray-600">
              {t("rent_map.average_rent")}{" "}
              <span className="font-bold text-blue-600">
                {moneyFormat(selectedMunicipalityData.avgPrice)}/
                {t("rent_map.month")}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {selectedMunicipalityData.neighborhoods.length}{" "}
              {t("rent_map.neighborhoods_count")}
            </p>
          </div>

          {/* Search and filters */}
          <div className="px-3 md:px-4 pt-3 md:pt-2 pb-2 border-b bg-white flex-shrink-0">
            <h4 className="font-semibold text-xs mb-2">
              {t("rent_map.neighborhoods_label")}
            </h4>
            <div className="mb-2">
              <input
                type="text"
                placeholder={t("rent_map.search_neighborhoods")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as "less" | "greater")
                }
                className="px-2 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white flex-shrink-0"
              >
                <option value="less">{t("rent_map.less_than")}</option>
                <option value="greater">{t("rent_map.greater_than")}</option>
              </select>
              <input
                type="number"
                placeholder={t("rent_map.price_label")}
                value={filterPrice}
                onChange={(e) => setFilterPrice(e.target.value)}
                className="w-1/2 flex-1 px-2 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                step="1000"
              />
            </div>
          </div>

          {/* Neighborhood list */}
          <div className="flex-1 overflow-y-auto px-3 md:px-4 py-2 space-y-2">
            {filteredNeighborhoods.length > 0 ? (
              filteredNeighborhoods.map(({ name, stats }) => {
                const avgPrice = neighborhoodAverages.get(name) || 0;

                return (
                  <div
                    key={name}
                    onClick={() => handleNeighborhoodClick(name)}
                    className="p-2 rounded text-xs bg-gray-50 border-l-2 border-blue-500 hover:bg-gray-100 hover:border-green-600 transition-colors cursor-pointer"
                  >
                    <div className="font-medium mb-1">{name}</div>
                    <div className="text-gray-600 font-semibold">
                      {moneyFormat(avgPrice)}/{t("rent_map.month")}
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      1{t("rent_map.br")}:{" "}
                      {moneyFormat(stats.one_bed_apt_avg_price)} | 2
                      {t("rent_map.br")}:{" "}
                      {moneyFormat(stats.two_bed_apt_avg_price)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                {searchQuery || filterPrice
                  ? "No neighborhoods found"
                  : "Loading neighborhoods..."}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map container */}
      <div
        className={`w-full ${
          selectedMunicipalityData ? "md:flex-1" : ""
        } h-[400px] md:h-[600px] relative rounded-lg md:rounded-r-lg md:rounded-l-none overflow-hidden`}
        style={{ zIndex: 0 }}
      >
        <MapContainer
          center={center}
          zoom={selectedMunicipality ? 12 : selectedCity ? 11 : 9}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
          key={`map-${center[0].toFixed(4)}-${center[1].toFixed(4)}`}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {/* Capture map instance */}
          <MapUpdater setMapInstance={setMapInstance} />

          {/* Municipality markers */}
          {municipalityMarkers.map((m) => (
            <Marker
              key={m.municipality}
              position={m.position}
              icon={createDotIcon(avgColor(m.avg), 22)}
              ref={(marker) => {
                if (marker) {
                  municipalityMarkerRefs.current.set(m.municipality, marker);
                }
              }}
              eventHandlers={{
                click: () => {
                  setSelectedMunicipality(m.municipality);
                  // Center the map on the clicked marker
                  if (mapInstance) {
                    mapInstance.setView(m.position, mapInstance.getZoom(), {
                      animate: true,
                    });
                  }
                },
              }}
            >
              <Popup autoPan={true} autoPanPadding={[50, 50]} keepInView={true}>
                <div style={{ minWidth: 180, maxWidth: 250 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 14 }}>
                    {m.municipality}
                  </h3>
                  <div style={{ marginTop: 6 }}>
                    {moneyFormat(m.avg)}/{t("rent_map.month")} (
                    {t("rent_map.average")})
                  </div>
                  <div style={{ marginTop: 6, color: "#555" }}>
                    {m.neighborhoods.length} {t("rent_map.neighborhoods_count")}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Neighborhood markers (when municipality selected) */}
          {neighborhoodMarkers.map((n) => {
            // compute an overall avg for marker color
            let total = 0;
            let count = 0;
            if (n.stats.room_avg_price && n.stats.room_count) {
              total += n.stats.room_avg_price * n.stats.room_count;
              count += n.stats.room_count;
            }
            if (n.stats.studio_apt_avg_price && n.stats.studio_apt_count) {
              total += n.stats.studio_apt_avg_price * n.stats.studio_apt_count;
              count += n.stats.studio_apt_count;
            }
            if (n.stats.one_bed_apt_avg_price && n.stats.one_bed_apt_count) {
              total +=
                n.stats.one_bed_apt_avg_price * n.stats.one_bed_apt_count;
              count += n.stats.one_bed_apt_count;
            }
            if (n.stats.two_bed_apt_avg_price && n.stats.two_bed_apt_count) {
              total +=
                n.stats.two_bed_apt_avg_price * n.stats.two_bed_apt_count;
              count += n.stats.two_bed_apt_count;
            }
            if (
              n.stats.more_than_two_bed_apt_avg_price &&
              n.stats.more_than_two_bed_apt_count
            ) {
              total +=
                n.stats.more_than_two_bed_apt_avg_price *
                n.stats.more_than_two_bed_apt_count;
              count += n.stats.more_than_two_bed_apt_count;
            }
            if (n.stats.house_avg_price && n.stats.house_count) {
              total += n.stats.house_avg_price * n.stats.house_count;
              count += n.stats.house_count;
            }
            // Use normalized neighborhood average (price/m² × 70m² standard size)
            const overallAvg = n.stats.neighborhood_avg_price || 0;

            return (
              <Marker
                key={n.key}
                position={n.coords}
                icon={createDotIcon(avgColor(overallAvg), 14)}
                ref={(marker) => {
                  if (marker) {
                    markerRefs.current.set(n.key, marker);
                  }
                }}
                eventHandlers={{
                  click: () => {
                    // Update URL when marker is clicked
                    if (onNeighborhoodSelect && selectedMunicipality) {
                      onNeighborhoodSelect(n.name, selectedMunicipality);
                    }
                    // Center the map on the clicked marker
                    if (mapInstance) {
                      mapInstance.setView(
                        n.coords,
                        Math.max(mapInstance.getZoom(), 14),
                        { animate: true }
                      );
                    }
                  },
                }}
              >
                <Popup
                  autoPan={true}
                  autoPanPadding={[50, 50]}
                  keepInView={true}
                >
                  <div style={{ minWidth: 180, maxWidth: 280 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 14 }}>{n.name}</h3>
                    <div style={{ marginTop: 6 }}>
                      <div
                        style={{ fontSize: 13, color: "#111", marginBottom: 4 }}
                      >
                        {t("rent_map.average_rent")}{" "}
                        <strong>
                          {moneyFormat(n.stats.neighborhood_avg_price)}{" "}
                        </strong>
                        ({t("rent_map.normalized_to_70m2")})
                      </div>
                      <hr
                        style={{
                          margin: "6px 0",
                          border: "none",
                          borderTop: "1px solid #ddd",
                        }}
                      />
                      <div
                        style={{ fontSize: 13, color: "#111", marginBottom: 6 }}
                      >
                        {t("rent_map.averages_by_type")}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                        }}
                      >
                        <div>{t("rent_map.room")}</div>
                        <div
                          style={{
                            display: "flex",
                          }}
                        >
                          <div className="pr-1">
                            {moneyFormat(n.stats.room_avg_price)}{" "}
                            <span style={{ color: "#666" }}>
                              ({n.stats.room_count || 0})
                            </span>
                          </div>
                          {n.stats.room_avg_area && (
                            <div style={{ color: "#666" }}>
                              {Math.round(n.stats.room_avg_area)}m²
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                        }}
                      >
                        <div>{t("rent_map.studio_apt")}</div>
                        <div
                          style={{
                            display: "flex",
                          }}
                        >
                          <div className="pr-1">
                            {moneyFormat(n.stats.studio_apt_avg_price)}{" "}
                            <span style={{ color: "#666" }}>
                              ({n.stats.studio_apt_count || 0})
                            </span>
                          </div>
                          {n.stats.studio_apt_avg_area && (
                            <div style={{ color: "#666" }}>
                              {Math.round(n.stats.studio_apt_avg_area)}m²
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                        }}
                      >
                        <div>{t("rent_map.apt_1br")}</div>
                        <div
                          style={{
                            display: "flex",
                          }}
                        >
                          <div className="pr-1">
                            {moneyFormat(n.stats.one_bed_apt_avg_price)}{" "}
                            <span style={{ color: "#666" }}>
                              ({n.stats.one_bed_apt_count || 0})
                            </span>
                          </div>
                          {n.stats.one_bed_apt_avg_area && (
                            <div style={{ color: "#666" }}>
                              {Math.round(n.stats.one_bed_apt_avg_area)}m²
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                        }}
                      >
                        <div>{t("rent_map.apt_2br")}</div>
                        <div
                          style={{
                            display: "flex",
                          }}
                        >
                          <div className="pr-1">
                            {moneyFormat(n.stats.two_bed_apt_avg_price)}{" "}
                            <span style={{ color: "#666" }}>
                              ({n.stats.two_bed_apt_count || 0})
                            </span>
                          </div>
                          {n.stats.two_bed_apt_avg_area && (
                            <div style={{ color: "#666" }}>
                              {Math.round(n.stats.two_bed_apt_avg_area)}m²
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                        }}
                      >
                        <div>{t("rent_map.apt_2plus_br")}</div>
                        <div
                          style={{
                            display: "flex",
                          }}
                        >
                          <div className="pr-1">
                            {moneyFormat(
                              n.stats.more_than_two_bed_apt_avg_price
                            )}{" "}
                            <span style={{ color: "#666" }}>
                              ({n.stats.more_than_two_bed_apt_count || 0})
                            </span>
                          </div>
                          {n.stats.more_than_two_bed_apt_avg_area && (
                            <div style={{ color: "#666" }}>
                              {Math.round(
                                n.stats.more_than_two_bed_apt_avg_area
                              )}
                              m²
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                        }}
                      >
                        <div>{t("rent_map.house")}</div>
                        <div style={{ display: "flex" }}>
                          <div className="pr-1">
                            {moneyFormat(n.stats.house_avg_price)}{" "}
                            <span style={{ color: "#666" }}>
                              ({n.stats.house_count || 0})
                            </span>
                          </div>
                          {n.stats.house_avg_area && (
                            <div style={{ color: "#666" }}>
                              {Math.round(n.stats.house_avg_area)}m²
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Simple legend (positioned inside map wrapper) */}
        <div
          style={{ position: "absolute", right: 12, top: 12, zIndex: 1200 }}
          className="bg-white p-2 rounded shadow text-xs"
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            {t("rent_map.legend_title")}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                background: "#22c55e",
              }}
            ></div>
            <div style={{ fontSize: 12 }}>
              {t("rent_map.price_legend.under_8k")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                background: "#84cc16",
              }}
            ></div>
            <div style={{ fontSize: 12 }}>
              {t("rent_map.price_legend.8k_12k")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                background: "#eab308",
              }}
            ></div>
            <div style={{ fontSize: 12 }}>
              {t("rent_map.price_legend.12k_18k")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                background: "#f97316",
              }}
            ></div>
            <div style={{ fontSize: 12 }}>
              {t("rent_map.price_legend.18k_26k")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                background: "#ef4444",
              }}
            ></div>
            <div style={{ fontSize: 12 }}>
              {t("rent_map.price_legend.over_26k")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
