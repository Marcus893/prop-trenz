import * as fs from "fs";
import * as path from "path";

interface RentListing {
  price: string;
  address: string;
  neighborhood: string;
  municipality: string;
  state: string;
  bedrooms: string;
  bathrooms: string;
  area_m2: string;
  url: string;
  property_type: string;
  scraped_at: string;
}

interface RentStatistics {
  room_avg_price?: number;
  studio_apt_avg_price?: number;
  one_bed_apt_avg_price?: number;
  two_bed_apt_avg_price?: number;
  more_than_two_bed_apt_avg_price?: number;
  house_avg_price?: number;
  room_avg_area?: number;
  studio_apt_avg_area?: number;
  one_bed_apt_avg_area?: number;
  two_bed_apt_avg_area?: number;
  more_than_two_bed_apt_avg_area?: number;
  house_avg_area?: number;
  room_count: number;
  studio_apt_count: number;
  one_bed_apt_count: number;
  two_bed_apt_count: number;
  more_than_two_bed_apt_count: number;
  house_count: number;
  // Price per m² for normalized neighborhood average (national avg size: 70m²)
  avg_price_per_m2?: number;
  neighborhood_avg_price?: number; // Normalized to 70m² standard
}

interface NeighborhoodRentData {
  [neighborhood: string]: RentStatistics;
}

interface MunicipalityRentData {
  [municipality: string]: NeighborhoodRentData;
}

function parsePrice(price: string): number {
  if (!price) return 0;
  return parseFloat(price.replace(/[^\d.]/g, ""));
}

function parseArea(area: string): number {
  if (!area) return 0;
  return parseFloat(area.replace(/[^\d.]/g, ""));
}

export function processRentData() {
  const dataPath = path.join(process.cwd(), "data", "rent_listings.json");
  const fileContent = fs.readFileSync(dataPath, "utf-8");
  const listings: RentListing[] = JSON.parse(fileContent);

  const rentData: MunicipalityRentData = {};
  const NATIONAL_AVG_PROPERTY_SIZE = 70; // Standard size for normalized average

  // Helper function to get unique municipality key
  // Handles case where "Benito Juárez" exists in both CDMX and Quintana Roo
  function getMunicipalityKey(municipality: string, state: string): string {
    if (municipality === "Benito Juárez" && state === "Quintana Roo") {
      return "Benito Juárez (Cancún)";
    }
    return municipality;
  }

  // First pass: collect data and track prices/areas for each neighborhood
  const neighborhoodPricesPerM2: {
    [municipality: string]: { [neighborhood: string]: number[] };
  } = {};

  for (const listing of listings) {
    if (!listing.municipality || !listing.neighborhood) {
      continue;
    }

    const municipalityKey = getMunicipalityKey(listing.municipality, listing.state);
    const price = parsePrice(listing.price);
    const area = parseArea(listing.area_m2);

    if (!neighborhoodPricesPerM2[municipalityKey]) {
      neighborhoodPricesPerM2[municipalityKey] = {};
    }
    if (!neighborhoodPricesPerM2[municipalityKey][listing.neighborhood]) {
      neighborhoodPricesPerM2[municipalityKey][listing.neighborhood] = [];
    }

    // Collect price per m² for all valid listings
    if (area > 0) {
      neighborhoodPricesPerM2[municipalityKey][listing.neighborhood].push(
        price / area
      );
    }

    if (!rentData[municipalityKey]) {
      rentData[municipalityKey] = {};
    }

    if (!rentData[municipalityKey][listing.neighborhood]) {
      rentData[municipalityKey][listing.neighborhood] = {
        room_avg_price: undefined,
        studio_apt_avg_price: undefined,
        one_bed_apt_avg_price: undefined,
        two_bed_apt_avg_price: undefined,
        more_than_two_bed_apt_avg_price: undefined,
        house_avg_price: undefined,
        room_avg_area: undefined,
        studio_apt_avg_area: undefined,
        one_bed_apt_avg_area: undefined,
        two_bed_apt_avg_area: undefined,
        more_than_two_bed_apt_avg_area: undefined,
        house_avg_area: undefined,
        room_count: 0,
        studio_apt_count: 0,
        one_bed_apt_count: 0,
        two_bed_apt_count: 0,
        more_than_two_bed_apt_count: 0,
        house_count: 0,
        avg_price_per_m2: undefined,
        neighborhood_avg_price: undefined,
      };
    }

    const neighborhoodStats =
      rentData[municipalityKey][listing.neighborhood];

    if (listing.property_type.toUpperCase() === "CUARTO") {
      neighborhoodStats.room_avg_price =
        ((neighborhoodStats.room_avg_price || 0) *
          neighborhoodStats.room_count +
          price) /
        (neighborhoodStats.room_count + 1);
      neighborhoodStats.room_avg_area =
        ((neighborhoodStats.room_avg_area || 0) * neighborhoodStats.room_count +
          area) /
        (neighborhoodStats.room_count + 1);
      neighborhoodStats.room_count++;
    } else if (listing.property_type.toUpperCase() === "DEPARTAMENTO") {
      if (listing.bedrooms === "" || listing.bedrooms === "0") {
        neighborhoodStats.studio_apt_avg_price =
          ((neighborhoodStats.studio_apt_avg_price || 0) *
            neighborhoodStats.studio_apt_count +
            price) /
          (neighborhoodStats.studio_apt_count + 1);
        neighborhoodStats.studio_apt_avg_area =
          ((neighborhoodStats.studio_apt_avg_area || 0) *
            neighborhoodStats.studio_apt_count +
            area) /
          (neighborhoodStats.studio_apt_count + 1);
        neighborhoodStats.studio_apt_count++;
      } else if (listing.bedrooms === "1") {
        neighborhoodStats.one_bed_apt_avg_price =
          ((neighborhoodStats.one_bed_apt_avg_price || 0) *
            neighborhoodStats.one_bed_apt_count +
            price) /
          (neighborhoodStats.one_bed_apt_count + 1);
        neighborhoodStats.one_bed_apt_avg_area =
          ((neighborhoodStats.one_bed_apt_avg_area || 0) *
            neighborhoodStats.one_bed_apt_count +
            area) /
          (neighborhoodStats.one_bed_apt_count + 1);
        neighborhoodStats.one_bed_apt_count++;
      } else if (listing.bedrooms === "2") {
        neighborhoodStats.two_bed_apt_avg_price =
          ((neighborhoodStats.two_bed_apt_avg_price || 0) *
            neighborhoodStats.two_bed_apt_count +
            price) /
          (neighborhoodStats.two_bed_apt_count + 1);
        neighborhoodStats.two_bed_apt_avg_area =
          ((neighborhoodStats.two_bed_apt_avg_area || 0) *
            neighborhoodStats.two_bed_apt_count +
            area) /
          (neighborhoodStats.two_bed_apt_count + 1);
        neighborhoodStats.two_bed_apt_count++;
      } else if (parseInt(listing.bedrooms) > 2) {
        neighborhoodStats.more_than_two_bed_apt_avg_price =
          ((neighborhoodStats.more_than_two_bed_apt_avg_price || 0) *
            neighborhoodStats.more_than_two_bed_apt_count +
            price) /
          (neighborhoodStats.more_than_two_bed_apt_count + 1);
        neighborhoodStats.more_than_two_bed_apt_avg_area =
          ((neighborhoodStats.more_than_two_bed_apt_avg_area || 0) *
            neighborhoodStats.more_than_two_bed_apt_count +
            area) /
          (neighborhoodStats.more_than_two_bed_apt_count + 1);
        neighborhoodStats.more_than_two_bed_apt_count++;
      }
    } else if (
      listing.property_type.toUpperCase() === "CASA" ||
      listing.property_type.toUpperCase() === "CASA EN CONDOMINIO"
    ) {
      neighborhoodStats.house_avg_price =
        ((neighborhoodStats.house_avg_price || 0) *
          neighborhoodStats.house_count +
          price) /
        (neighborhoodStats.house_count + 1);
      neighborhoodStats.house_avg_area =
        ((neighborhoodStats.house_avg_area || 0) *
          neighborhoodStats.house_count +
          area) /
        (neighborhoodStats.house_count + 1);
      neighborhoodStats.house_count++;
    }
  }

  // Second pass: calculate average price per m² and normalized neighborhood average
  for (const municipalityKey in rentData) {
    for (const neighborhoodKey in rentData[municipalityKey]) {
      const pricesPerM2 =
        neighborhoodPricesPerM2[municipalityKey]?.[neighborhoodKey] || [];

      if (pricesPerM2.length > 0) {
        const avgPricePerM2 =
          pricesPerM2.reduce((a, b) => a + b, 0) / pricesPerM2.length;
        const normalizedAvgPrice = avgPricePerM2 * NATIONAL_AVG_PROPERTY_SIZE;

        rentData[municipalityKey][neighborhoodKey].avg_price_per_m2 =
          Math.round(avgPricePerM2);
        rentData[municipalityKey][neighborhoodKey].neighborhood_avg_price =
          Math.round(normalizedAvgPrice);
      }
    }
  }

  return rentData;
}
