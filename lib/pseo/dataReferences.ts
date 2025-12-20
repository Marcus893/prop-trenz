/**
 * Data Reference System for Guides
 *
 * Allows guides to reference actual data from the PropTrenz app, creating
 * interactive links to maps, charts, and specific data points.
 */

export type DataReferenceType =
  | "neighborhood"
  | "municipality"
  | "city"
  | "state"
  | "chart"
  | "map"
  | "price"
  | "growth"
  | "rent-neighborhood"
  | "rent-municipality"
  | "rent-city"
  | "rent-map";

export interface DataReference {
  type: DataReferenceType;
  location?: string; // neighborhood, municipality, city, or state name
  city?: string; // city name for context
  municipality?: string; // municipality name for context
  label?: string; // display label (defaults to location name)
  action?: "view" | "chart" | "explore"; // what action to take
}

/**
 * Parse data references from guide content
 * Format: {{data:type:location:label}} or {{data:type:location}}
 * Examples:
 * - {{data:neighborhood:Polanco:Polanco neighborhood}}
 * - {{data:municipality:Cuauhtémoc}}
 * - {{data:chart:neighborhood:Polanco:View Polanco price chart}}
 * - {{data:map:city:Ciudad de México:Explore Mexico City map}}
 */
export function parseDataReferences(text: string): Array<{
  match: string;
  reference: DataReference;
  startIndex: number;
  endIndex: number;
}> {
  const references: Array<{
    match: string;
    reference: DataReference;
    startIndex: number;
    endIndex: number;
  }> = [];

  // Match pattern: {{data:type:location:label}} or {{data:type:location}}
  // Also support: {{data:type:city:location:label}} for city-specific references
  // Supports formats like:
  // - {{data:municipality:San Pedro Garza García:Nuevo León:Explore San Pedro Garza García}}
  // - {{data:neighborhood:Polanco:Miguel Hidalgo:Ciudad de México:View Polanco prices}} (5 parts)
  // - {{data:neighborhood:Polanco:Cuauhtémoc:Ciudad de México:Explore Roma Norte}} (5 parts)
  // - {{data:neighborhood:Polanco:label}} (3 parts)
  // Use non-greedy matching and ensure we stop at the closing }}
  const regex =
    /\{\{data:([^:]+):([^:]+)(?::([^:}]+))?(?::([^:}]+))?(?::([^}]+))?\}\}/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const type = match[1] as DataReferenceType;
    const location = match[2];
    const optional1 = match[3]; // could be city, municipality, or label
    const optional2 = match[4]; // could be city, municipality, or label
    const optional3 = match[5]; // could be label

    let reference: DataReference = { type, location };

    // Determine structure based on type and number of parts
    // Handle both regular types and rent- prefixed types
    const isNeighborhoodType =
      type === "neighborhood" || type === "rent-neighborhood";
    const isMunicipalityType =
      type === "municipality" || type === "rent-municipality";
    const isCityType = type === "city" || type === "rent-city";

    if (isNeighborhoodType || isMunicipalityType) {
      // Format for municipality: {{data:municipality:San Pedro Garza García:Nuevo León:Explore San Pedro Garza García}}
      // Format for neighborhood: {{data:neighborhood:Polanco:Miguel Hidalgo:Ciudad de México:View Polanco prices}} (5 parts)
      // Format for neighborhood: {{data:neighborhood:Roma Norte:Cuauhtémoc:Ciudad de México:Explore Roma Norte}} (5 parts)
      // Or simpler: {{data:neighborhood:Polanco:label}} (3 parts)
      // Same patterns apply for rent-neighborhood and rent-municipality
      if (optional3) {
        // Has 5 parts: type:location:optional1:optional2:optional3
        // Format: {{data:neighborhood:Polanco:Miguel Hidalgo:Ciudad de México:View Polanco prices}}
        // location = neighborhood, optional1 = municipality, optional2 = city, optional3 = label
        reference.municipality = optional1;
        reference.city = optional2;
        reference.label = optional3;
      } else if (optional2) {
        // Has 4 parts: type:location:optional1:optional2
        if (isMunicipalityType) {
          // Format: {{data:municipality:San Pedro Garza García:Nuevo León:Explore...}}
          // location = municipality name, optional1 = city/state, optional2 = label
          reference.city = optional1;
          reference.label = optional2;
        } else {
          // For neighborhood with 4 parts, check if optional1 looks like municipality
          // Format could be: {{data:neighborhood:Polanco:Cuauhtémoc:label}}
          if (optional1.includes(" ") && optional1.match(/^[A-Z]/)) {
            reference.municipality = optional1;
            reference.label = optional2;
          } else {
            // neighborhood:city:label
            reference.city = optional1;
            reference.label = optional2;
          }
        }
      } else if (optional1) {
        // 3 parts: type:location:optional1
        // Could be municipality, city, or label
        // Check if it looks like a municipality name (has spaces, capital letters)
        if (optional1.includes(" ") || optional1.match(/^[A-Z]/)) {
          reference.municipality = optional1;
          reference.label = location;
        } else {
          reference.label = optional1;
        }
      }
    } else if (isCityType) {
      // Format: {{data:city:Ciudad de México:Explore CDMX}} or {{data:rent-city:Monterrey:View Monterrey rents}}
      // location = city name, optional1 = label
      reference.label = optional1 || location;
    } else if (type === "chart" || type === "map") {
      // Format: {{data:chart:neighborhood:Polanco:View chart}}
      // or: {{data:map:city:Ciudad de México:Explore map}}
      const subType = location as DataReferenceType;
      reference.type = subType;
      reference.location = optional1;
      reference.label = optional2 || optional1 || "View";
      if (subType === "neighborhood" && optional2) {
        reference.municipality = optional1;
        reference.location = optional2;
        reference.label = match[5] || "View";
      }
    } else {
      // Simple format: {{data:type:location:label}}
      reference.label = optional1 || location;
    }

    references.push({
      match: match[0],
      reference,
      startIndex: match.index!,
      endIndex: match.index! + match[0].length,
    });
  }

  return references;
}

/**
 * Normalize city name aliases (different names for the same city)
 */
function normalizeCityName(
  cityOrState: string | undefined
): string | undefined {
  if (!cityOrState) return cityOrState;

  // Only normalize different names for the SAME city, not state-to-city mappings
  const cityAliases: { [key: string]: string } = {
    // Ciudad de México has many aliases
    "ciudad de méxico": "Ciudad de México",
    "ciudad de mexico": "Ciudad de México",
    cdmx: "Ciudad de México",
    df: "Ciudad de México",
    "mexico city": "Ciudad de México",
  };

  const normalized = cityOrState.toLowerCase().trim();
  return cityAliases[normalized] || cityOrState;
}

/**
 * Infer city from municipality name (for neighborhoods that only have municipality)
 */
function inferCityFromMunicipality(
  municipality: string | undefined
): string | undefined {
  if (!municipality) return undefined;

  // Known municipalities and their cities
  const municipalityToCity: { [key: string]: string } = {
    "san pedro garza garcía": "Monterrey",
    "san pedro garza garcia": "Monterrey",
    monterrey: "Monterrey",
    apodaca: "Monterrey",
    "san nicolás de los garza": "Monterrey",
    "san nicolas de los garza": "Monterrey",
    guadalupe: "Monterrey",
    "santa catarina": "Monterrey",
    escobedo: "Monterrey",
    garcía: "Monterrey",
    "san nicolás": "Monterrey",
    "san nicolas": "Monterrey",
    // CDMX alcaldías (all 16)
    cuauhtémoc: "Ciudad de México",
    cuauhtemoc: "Ciudad de México",
    "miguel hidalgo": "Ciudad de México",
    "benito juárez": "Ciudad de México",
    "benito juarez": "Ciudad de México",
    coyoacán: "Ciudad de México",
    coyoacan: "Ciudad de México",
    "álvaro obregón": "Ciudad de México",
    "alvaro obregon": "Ciudad de México",
    azcapotzalco: "Ciudad de México",
    "cuajimalpa de morelos": "Ciudad de México",
    cuajimalpa: "Ciudad de México",
    "gustavo a. madero": "Ciudad de México",
    "gustavo a madero": "Ciudad de México",
    iztacalco: "Ciudad de México",
    iztapalapa: "Ciudad de México",
    "la magdalena contreras": "Ciudad de México",
    "magdalena contreras": "Ciudad de México",
    "milpa alta": "Ciudad de México",
    tláhuac: "Ciudad de México",
    tlahuac: "Ciudad de México",
    tlalpan: "Ciudad de México",
    "venustiano carranza": "Ciudad de México",
    xochimilco: "Ciudad de México",
    // Guadalajara (Jalisco) municipalities
    guadalajara: "Guadalajara",
    zapopan: "Guadalajara",
    tlaquepaque: "Guadalajara",
    tonalá: "Guadalajara",
    tonala: "Guadalajara",
    // Puerto Vallarta
    "puerto vallarta": "Puerto Vallarta",
    // Los Cabos
    "los cabos": "Los Cabos",
    // Tijuana
    tijuana: "Tijuana",

    // Mérida
    mérida: "Mérida",
    merida: "Mérida",

    // Cancún
    "benito juárez (cancún)": "Cancún",
    "benito juarez (cancún)": "Cancún",
    "benito juárez (cancun)": "Cancún",
    "benito juarez (cancun)": "Cancún",
    cancún: "Cancún",
    cancun: "Cancún",

    // Playa del Carmen
    solidaridad: "Playa del Carmen",

    // Tulum
    tulum: "Tulum",
  };

  const normalized = municipality.toLowerCase().trim();
  return municipalityToCity[normalized];
}

/**
 * Generate URL for a data reference
 */
export function getDataReferenceUrl(
  reference: DataReference,
  baseUrl: string = ""
): string {
  const { type, location, city, municipality, action = "view" } = reference;

  // Normalize city name (map states to cities)
  const normalizedCity = normalizeCityName(city);

  switch (type) {
    case "neighborhood":
      // For neighborhoods, we need both municipality and city
      // If we only have one, try to infer the other
      let finalCity = normalizedCity;
      let finalMunicipality = municipality;

      if (!finalCity && finalMunicipality) {
        // We have municipality but no city - infer city from municipality
        finalCity = inferCityFromMunicipality(finalMunicipality);
      }

      // Note: We cannot infer municipality from city since a city has many municipalities
      // The municipality must be provided in the data reference

      if (finalMunicipality && finalCity && location) {
        // Encode names for URL using the cityToSlug logic from map.tsx
        const citySlug = finalCity
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[áéíóúñü]/g, (char) => {
            const map: { [key: string]: string } = {
              á: "a",
              é: "e",
              í: "i",
              ó: "o",
              ú: "u",
              ñ: "n",
              ü: "u",
            };
            return map[char] || char;
          });
        const municipalitySlug = encodeURIComponent(
          finalMunicipality.toLowerCase().replace(/\s+/g, "-")
        );
        const neighborhoodSlug = encodeURIComponent(
          location.toLowerCase().replace(/\s+/g, "-")
        );

        if (action === "chart") {
          return `${baseUrl}/map?city=${citySlug}&municipality=${municipalitySlug}&neighborhood=${neighborhoodSlug}&chart=true`;
        }
        return `${baseUrl}/map?city=${citySlug}&municipality=${municipalitySlug}&neighborhood=${neighborhoodSlug}`;
      }
      // Fallback to map page
      return `${baseUrl}/map`;

    case "municipality":
      if (normalizedCity && location) {
        const citySlug = normalizedCity
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[áéíóúñü]/g, (char) => {
            const map: { [key: string]: string } = {
              á: "a",
              é: "e",
              í: "i",
              ó: "o",
              ú: "u",
              ñ: "n",
              ü: "u",
            };
            return map[char] || char;
          });
        const municipalitySlug = encodeURIComponent(
          location.toLowerCase().replace(/\s+/g, "-")
        );

        if (action === "chart") {
          return `${baseUrl}/map?city=${citySlug}&municipality=${municipalitySlug}&municipalityChart=true`;
        }
        return `${baseUrl}/map?city=${citySlug}&municipality=${municipalitySlug}`;
      }
      return `${baseUrl}/map`;

    case "city":
      if (!location) {
        return `${baseUrl}/map`;
      }
      const normalizedCityName = normalizeCityName(location);
      if (!normalizedCityName) {
        return `${baseUrl}/map`;
      }
      const citySlug = normalizedCityName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[áéíóúñü]/g, (char) => {
          const map: { [key: string]: string } = {
            á: "a",
            é: "e",
            í: "i",
            ó: "o",
            ú: "u",
            ñ: "n",
            ü: "u",
          };
          return map[char] || char;
        });
      return `${baseUrl}/map?city=${citySlug}`;

    case "chart":
      // Chart references are handled by their sub-type
      return getDataReferenceUrl(
        { ...reference, type: reference.location as DataReferenceType },
        baseUrl
      );

    case "map":
      // Map references point to the map page, possibly with filters
      if (location) {
        return getDataReferenceUrl(
          { ...reference, type: location as DataReferenceType },
          baseUrl
        );
      }
      return `${baseUrl}/map`;

    case "rent-neighborhood":
      // For rent neighborhoods, we need municipality and city to build URL
      let rentFinalCity = normalizedCity;
      let rentFinalMunicipality = municipality;

      if (!rentFinalCity && rentFinalMunicipality) {
        rentFinalCity = inferCityFromMunicipality(rentFinalMunicipality);
      }

      // Note: We cannot infer municipality from city since a city has many municipalities
      // The municipality must be provided in the data reference

      if (rentFinalCity && location) {
        const rentCitySlug = rentFinalCity
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[áéíóúñü]/g, (char) => {
            const charMap: { [key: string]: string } = {
              á: "a",
              é: "e",
              í: "i",
              ó: "o",
              ú: "u",
              ñ: "n",
              ü: "u",
            };
            return charMap[char] || char;
          });
        const neighborhoodSlug = encodeURIComponent(
          location.toLowerCase().replace(/\s+/g, "-")
        );
        return `${baseUrl}/rent-map?city=${rentCitySlug}&neighborhood=${neighborhoodSlug}`;
      }
      return `${baseUrl}/rent-map`;

    case "rent-municipality":
      if (normalizedCity && location) {
        const rentMuniCitySlug = normalizedCity
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[áéíóúñü]/g, (char) => {
            const charMap: { [key: string]: string } = {
              á: "a",
              é: "e",
              í: "i",
              ó: "o",
              ú: "u",
              ñ: "n",
              ü: "u",
            };
            return charMap[char] || char;
          });
        const rentMunicipalitySlug = encodeURIComponent(
          location.toLowerCase().replace(/\s+/g, "-")
        );
        return `${baseUrl}/rent-map?city=${rentMuniCitySlug}&municipality=${rentMunicipalitySlug}`;
      }
      return `${baseUrl}/rent-map`;

    case "rent-city":
      if (!location) {
        return `${baseUrl}/rent-map`;
      }
      const rentNormalizedCityName = normalizeCityName(location);
      if (!rentNormalizedCityName) {
        return `${baseUrl}/rent-map`;
      }
      const rentCityPageSlug = rentNormalizedCityName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[áéíóúñü]/g, (char) => {
          const charMap: { [key: string]: string } = {
            á: "a",
            é: "e",
            í: "i",
            ó: "o",
            ú: "u",
            ñ: "n",
            ü: "u",
          };
          return charMap[char] || char;
        });
      return `${baseUrl}/rent-map?city=${rentCityPageSlug}`;

    case "rent-map":
      // Rent-map references point to the rent-map page
      if (location) {
        return getDataReferenceUrl(
          { ...reference, type: `rent-${location}` as DataReferenceType },
          baseUrl
        );
      }
      return `${baseUrl}/rent-map`;

    default:
      return `${baseUrl}/map`;
  }
}

/**
 * Get display text for a data reference
 */
export function getDataReferenceLabel(reference: DataReference): string {
  return reference.label || reference.location || "View data";
}
