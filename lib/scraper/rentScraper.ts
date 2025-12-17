import { firefox } from "playwright";
import * as fs from "fs";
import * as path from "path";

// --- CONFIGURATION ---
// Base URL structure: https://propiedades.com/[MUNICIPALITY-SLUG]/residencial-renta
const BASE_PREFIX = "https://propiedades.com/";
const BASE_SUFFIX = "/residencial-renta";

// List of municipality URL slugs to scrape. Add or modify as needed.
const MUNICIPALITIES_TO_SCRAPE = [
  // CDMX
  // "cuauhtemoc-df",
  // "alvaro-obregon-df",
  // "benito-juarez-df",
  // "miguel-hidalgo",
  // "coyoacan",
  // "azcapotzalco",
  // "cuajimalpa-de-morelos",
  // "gustavo-a-madero",
  // "iztacalco",
  // "iztapalapa",
  // "la-magdalena-contreras",
  // "tlalpan",
  // "venustiano-carranza-df",

  // Monterrey
  // "san-pedro-garza-garcia",
  // "monterrey",
  // "guadalupe-nuevo-leon",
  // "apodaca",
  // "san-nicolas-de-los-garza",

  // Guadalajara
  // "guadalajara",
  // "san-pedro-tlaquepaque",
  // "tonala-jalisco",
  // "zapopan",

  // Puerto Vallarta
  "puerto-vallarta",
];

const MAX_PAGES = 20; // Change this to scrape more pages (e.g., 10 or 20)
const OUTPUT_FILENAME = "rent_listings.json";

// Interface for the Property data structure
interface Property {
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

// --- HELPERS ---

/**
 * Validate if a rental price is realistic based on property type and area
 */
function isValidRentalPrice(
  price: number,
  propertyType: string,
  bedrooms: string,
  area: number
): boolean {
  // Reasonable monthly rent ranges in MXN for Mexico
  const priceRanges: { [key: string]: [number, number] } = {
    CUARTO: [2000, 30000], // Room: $2k - $30k
    DEPARTAMENTO_STUDIO: [2500, 80000], // Studio: $2.5k - $80k
    DEPARTAMENTO_1BR: [3000, 140000], // 1BR: $3k - $140k
    DEPARTAMENTO_2BR: [5000, 180000], // 2BR: $5k - $180k
    DEPARTAMENTO_3PLUS: [7000, 300000], // 3+BR: $7k - $300k
    CASA: [10000, 500000], // House: $10k - $500k
  };

  const upperType = propertyType.toUpperCase();

  // Determine range based on property type and bedrooms
  let range: [number, number] = [0, 1000000]; // Default very permissive

  if (upperType === "CUARTO") {
    range = priceRanges.CUARTO;
  } else if (upperType === "DEPARTAMENTO") {
    const bedCount = parseInt(bedrooms) || 0;
    if (bedCount === 0 || bedrooms === "") {
      range = priceRanges.DEPARTAMENTO_STUDIO;
    } else if (bedCount === 1) {
      range = priceRanges.DEPARTAMENTO_1BR;
    } else if (bedCount === 2) {
      range = priceRanges.DEPARTAMENTO_2BR;
    } else if (bedCount >= 3) {
      range = priceRanges.DEPARTAMENTO_3PLUS;
    }
  } else if (upperType.includes("CASA")) {
    range = priceRanges.CASA;
  }

  // Check if price is within reasonable range
  if (price < range[0] || price > range[1]) {
    return false;
  }

  // Additional check: price per m² should be reasonable (MXN)
  // Typical rent is $60-$1500 per m² per month in Mexico
  if (area > 0) {
    const pricePerM2 = price / area;
    if (pricePerM2 < 60 || pricePerM2 > 1500) {
      return false;
    }
  }

  return true;
}

/**
 * Extracts Neighborhood, Municipality, and State from the address string.
 * Pattern: "... Col. [Neighborhood], [Municipality], [State], ..."
 */
function parseAddress(address: string) {
  const result = {
    neighborhood: "",
    municipality: "",
    state: "",
  };

  if (!address) return result;

  // Regex Explanation:
  // \bCol\.     -> Finds "Col." (case insensitive)
  // \s* -> Skips spaces
  // ([^,]+)     -> Group 1: Captures text until the next comma (Neighborhood)
  // ,           -> Matches the literal comma separator
  // \s* -> Skips spaces
  // ([^,]+)     -> Group 2: Captures text until the next comma (Municipality)
  // ,           -> Matches the literal comma separator
  // \s* -> Skips spaces
  // ([^,]+)     -> Group 3: Captures text until the next comma (State)
  const match = address.match(/\bCol\.\s*([^,]+),\s*([^,]+),\s*([^,]+)/i);

  if (match) {
    result.neighborhood = match[1].trim();
    result.municipality = match[2].trim();
    result.state = match[3].trim();
  }

  return result;
}

/**
 * Reads existing data and merges new data, ensuring no duplicates based on 'address'.
 */
function mergeData(newData: Property[], filename: string): Property[] {
  const dataPath = path.join(__dirname, "../../data", filename);
  let existingData: Property[] = [];

  console.log(`\nAttempting to read existing data from: ${dataPath}`);

  // 1. Read existing data if the file exists
  if (fs.existsSync(dataPath)) {
    try {
      const fileContent = fs.readFileSync(dataPath, "utf-8");
      existingData = JSON.parse(fileContent);
      console.log(
        `✅ Successfully read ${existingData.length} existing properties.`
      );
    } catch (error) {
      console.error(
        `❌ ERROR: Could not read or parse existing file ${filename}. Starting fresh. Error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      existingData = [];
    }
  } else {
    console.log(`File ${filename} does not exist. Starting with an empty set.`);
  }

  // 2. Create a Map from existing data for quick lookups and to preserve original order
  const propertyMap = new Map<string, Property>();
  for (const prop of existingData) {
    if (prop.address) {
      propertyMap.set(prop.address, prop);
    }
  }

  // 3. Merge new data
  let newItemsAdded = 0;
  for (const prop of newData) {
    if (prop.address && !propertyMap.has(prop.address)) {
      // Only add properties that do NOT already exist
      propertyMap.set(prop.address, prop);
      newItemsAdded++;
    }
  }

  console.log(`Added ${newItemsAdded} new unique properties.`);

  // 4. Return the merged list (maintaining original structure: old items, then new items)
  return Array.from(propertyMap.values());
}

// Function to save the results to a JSON file
function saveToJson(data: Property[], filename: string) {
  try {
    const jsonContent = JSON.stringify(data, null, 2);
    const dataPath = path.join(__dirname, "../../data", filename);
    fs.writeFileSync(dataPath, jsonContent, "utf-8");
    console.log(
      `\n✅ Final results saved. Total properties in file: ${data.length}`
    );
  } catch (error) {
    console.error("Error saving to JSON file:", error);
  }
}

async function scrapeRents() {
  // Keeping headless: false for quick verification, but switch to true for production
  const browser = await firefox.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    extraHTTPHeaders: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "es-MX,es;q=0.8,en-US;q=0.5,en;q=0.3",
      "Upgrade-Insecure-Requests": "1",
    },
  });

  const page = await context.newPage();
  const allProperties: Property[] = []; // Store results from ALL pages here
  const scrapeTime = new Date().toISOString(); // Capture time of this run

  console.log(
    `Starting scraper for ${MUNICIPALITIES_TO_SCRAPE.length} municipalities, checking up to ${MAX_PAGES} pages each...`
  );

  try {
    // --- MUNICIPALITY LOOP (OUTER LOOP) ---
    for (const municipalitySlug of MUNICIPALITIES_TO_SCRAPE) {
      const BASE_URL = `${BASE_PREFIX}${municipalitySlug}${BASE_SUFFIX}`;

      // --- PAGE LOOP ---
      for (let currentPage = 1; currentPage <= MAX_PAGES; currentPage++) {
        // Construct URL for specific page (e.g., ?pagina=2)
        const url = `${BASE_URL}?pagina=${currentPage}`;
        console.log(
          `\n--- Scraping ${municipalitySlug} | Page ${currentPage} ---`
        );
        console.log(`Navigating to: ${url}`);

        try {
          await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });

          console.log(
            "Page loaded. Simulating manual scroll to load all data..."
          );
          // Scroll down multiple times to trigger lazy loading
          for (let i = 0; i < 6; i++) {
            await page.mouse.wheel(0, 800); // Scroll down 800 pixels
            await new Promise((r) => setTimeout(r, 1500)); // Wait 1.5s
          }

          console.log("Waiting for property cards...");
          await page.waitForSelector(
            '[data-testid="pcom-property-card-body"]',
            { timeout: 5000 }
          );

          // --- 4. Extract Data ---
          const properties = await page.evaluate(() => {
            // The main container for all data
            const cards = Array.from(
              document.querySelectorAll(
                '[data-testid="pcom-property-card-body"]'
              )
            );

            const results = cards.map((card) => {
              const result: Property = {
                price: "",
                address: "",
                neighborhood: "",
                municipality: "",
                state: "",
                bedrooms: "",
                bathrooms: "",
                area_m2: "",
                url: "",
                property_type: "",
                scraped_at: "",
              };

              // 1. URL and Address (Address Link)
              const urlLink = card.querySelector(
                'a[class*="street"], a[class*="ubicacion"]'
              ) as HTMLAnchorElement | null;
              result.url = urlLink?.href || "";
              // The address text is the text content of the link
              result.address =
                urlLink?.textContent?.trim().replace(/\s{2,}/g, " ") || "";

              // 2. Price (The element containing the currency symbol '$')
              // This should reliably grab just the price like "$31,000 MXN"
              const priceDiv = card.querySelector(
                'div[class*="sc-c1af3d6f-2"]'
              );
              if (priceDiv) {
                // Extract the first line of text which contains the price
                result.price =
                  priceDiv.textContent?.split("\n")[0].trim() || "";
              }

              // --- Property Type ---
              // Find the specific 'DEPARTAMENTO'/'CASA' text which is often in a highly visible span/div
              // Based on Screenshot 7.43.21 PM, the type is clearly visible in an element above the price
              const typeElement = Array.from(
                card.querySelectorAll("span, div")
              ).find((el) => {
                const text = el.textContent?.trim().toUpperCase();
                return (
                  text === "DEPARTAMENTO" ||
                  text === "CASA" ||
                  text === "CASA EN CONDOMINIO" ||
                  text === "CUARTO"
                );
              });
              result.property_type = typeElement?.textContent?.trim() || "";

              // 3. Amenities (Bedrooms, Bathrooms, Area)
              // Look for the specific list items marked with 'amenities'
              const amenities = Array.from(
                card.querySelectorAll('li[class*="amenities"]')
              );

              amenities.forEach((li) => {
                const text = li.textContent?.trim() || "";
                // The value is contained in an h3 or span child. We find the first one and extract only numbers.
                const valueElement = li.querySelector("h3, span");
                const value =
                  valueElement?.textContent?.replace(/[^\d.]/g, "") || "";

                if (text.includes("Recámara")) {
                  result.bedrooms = value;
                } else if (text.includes("Baño")) {
                  result.bathrooms = value;
                } else if (text.includes("m2")) {
                  // Looks for the 'm²' unit
                  result.area_m2 = value.slice(0, -1);
                }
              });

              return result;
            });

            // Remove any empty results before returning
            return results.filter((p) => p.price || p.address);
          }, [] as Property[]);

          console.log(`Successfully scraped ${properties.length} properties.`);
          const processedProperties: Property[] = properties.map((p) => {
            return {
              ...p,
              ...parseAddress(p.address),
              scraped_at: scrapeTime,
            };
          });

          const filteredProcessed = processedProperties.filter((p) => {
            if (/USD/.test(p.price)) return false;

            // Basic check (value exists and is not zero)
            if (!p.area_m2 || p.area_m2.length === 0 || p.area_m2 === "0") {
              return false;
            }

            if (!p.property_type) return false;

            // Discard if the area is less than 10 m² or too big
            const area = parseFloat(p.area_m2);
            if (area < 10 || area > 500) {
              return false;
            }

            // Validate price is realistic for the property type
            const price = parseFloat(p.price.replace(/[^\d.]/g, ""));
            if (!isValidRentalPrice(price, p.property_type, p.bedrooms, area)) {
              console.warn(
                `Filtering out invalid price: ${p.address} - ${p.price} (${p.property_type}, ${p.bedrooms}BR, ${area}m²)`
              );
              return false;
            }

            return true;
          });

          if (filteredProcessed.length === 0) {
            console.log(
              "Page was empty after processing. Moving to next municipality."
            );
            break;
          }

          if (filteredProcessed.length > 0) {
            console.log("Sample with Neighborhood:", filteredProcessed[0]);
          }

          allProperties.push(...filteredProcessed);

          // Waits 3 to 7 seconds before next page to behave like a human
          if (currentPage < MAX_PAGES) {
            const waitTime =
              Math.floor(Math.random() * (7000 - 3000 + 1)) + 3000;
            console.log(`Waiting ${waitTime / 1000}s before next page...`);
            await new Promise((r) => setTimeout(r, waitTime));
          }
        } catch (pageError) {
          console.error(
            `Error scraping ${municipalitySlug} page ${currentPage}:`,
            pageError
          );
          break; // Stop page loop for this municipality
        }
      }
    }
    // --- PHASE 3: MERGE AND SAVE ALL RESULTS ---
    const finalMergedData = mergeData(allProperties, OUTPUT_FILENAME);
    saveToJson(finalMergedData, OUTPUT_FILENAME);
  } catch (error) {
    console.error("Scraping fatal error:", error);
  }
  await browser.close();
}

scrapeRents();
