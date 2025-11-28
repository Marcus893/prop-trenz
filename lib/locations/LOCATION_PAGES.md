# Location-Based Programmatic SEO Pages

This system generates SEO-optimized location pages similar to nomads.com, targeting Spanish keywords for Mexican real estate locations.

## Overview

The system automatically generates pages for neighborhoods, municipalities, cities, and states with:
- Price data and historical charts
- Location introductions
- Must-visit spots
- Price insights
- SEO-optimized content in Spanish

## Usage

### Generate a Single Location Page

```bash
npm run generate-location "Condesa"
npm run generate-location "Monterrey"
npm run generate-location "San Nicolás de los Garza"
```

**With City Filter** (optional):
When multiple locations share the same name across different cities, you can filter by city:

```bash
npm run generate-location "Providencia" jalisco
npm run generate-location "Del Valle" monterrey
npm run generate-location "Condesa" cdmx
```

Valid city filter options: `cdmx`, `monterrey`, `jalisco`, `gdl`, `guadalajara`

### Generate Multiple Location Pages (Batch)

Edit `scripts/generate-locations.ts` and add location names to the `LOCATIONS` array:

```typescript
const LOCATIONS: string[] = [
  "Monterrey",
  "Del Valle",
  "Coyoacán",
  // ... add more locations
]
```

Then run:
```bash
npm run generate-locations
```

**With City Filter** (optional):
To generate pages only from a specific city's dataset:

```bash
npm run generate-locations jalisco
npm run generate-locations cdmx
npm run generate-locations monterrey
```

Valid city filter options: `cdmx`, `monterrey`, `jalisco`, `gdl`, `guadalajara`

**Why use a city filter?**
When locations share the same name across cities (e.g., "Providencia" exists in both CDMX and Jalisco), the filter ensures you only generate pages from the specified city's dataset, avoiding ambiguous matches.

The batch script includes:
- Automatic retry logic with exponential backoff for rate limits
- Delays between requests to avoid API throttling
- Progress tracking and summary report

### URL Structure

Pages are generated with URLs at the root level:
- `/cuanto-cuesta-comprar-en-condesa`
- `/cuanto-cuesta-comprar-en-monterrey`
- `/cuanto-cuesta-comprar-en-san-nicolas-de-los-garza`

**Note**: When multiple locations share the same name (e.g., a neighborhood and municipality both named "Monterrey"), only the municipality page is generated to avoid duplicates.

## How It Works

1. **Data Lookup**: Searches existing neighborhood/municipality data from:
   - `public/data/banorte-neighborhood-data-cdmx.json` (Ciudad de México)
   - `public/data/banorte-neighborhood-data-monterrey.json` (Monterrey)
   - `public/data/banorte-neighborhood-data-jalisco.json` (Jalisco)
   
   The system uses **exact matching only** - no partial matches. 
   
   **City Filtering**: When a city filter is specified (e.g., `npm run generate-locations jalisco`), the system only searches in that city's dataset. This is useful when locations share the same name across cities (e.g., "Providencia" exists in both CDMX and Jalisco).
   
   If multiple locations share the same name within a city (e.g., neighborhood + municipality), only the municipality is selected for generation.

2. **Content Generation**: Uses Gemini 2.0 Flash to generate:
   - SEO-optimized title and meta description
   - Location introduction (first paragraph shown in hero, rest in main content)
   - Must-visit spots (3-5 places)
   - Price insights and analysis

3. **Page Creation**: Creates a static page with:
   - Hero section with title, first paragraph, and price summary
   - Price chart showing historical trends (with Spanish month names)
   - All generated content
   - Structured data (Schema.org)
   - SEO meta tags
   - Call-to-action buttons linking to maps and calculators

## File Structure

```
lib/locations/
  ├── dataLookup.ts          # Finds location data from JSON files (exact matches only)
  ├── contentGenerator.ts    # Generates Spanish content with Gemini
  ├── storage.ts              # Saves/loads location pages
  └── generateLocation.ts    # Main orchestration function

pages/
  └── [...slug].tsx          # Catch-all route for location pages at root level

content/locations/
  └── *.json                 # Generated location pages (git-ignored)

scripts/
  ├── generate-location.ts   # CLI command for single location
  └── generate-locations.ts  # Batch generation script with retry logic
```

## Error Handling

### Location Not Found

If a location is not found, the script will display:
```
No se encontraron datos para "[location name]". 
Asegúrate de que el nombre sea correcto y que existan datos para esta ubicación.
```

### Rate Limiting

The batch generation script includes automatic retry logic:
- Detects 429 (Too Many Requests) errors
- Retries with exponential backoff (20s, 40s, 80s)
- Adds delays between requests (7s regular, 20s after every 3rd)
- Shows progress and retry attempts in console

### JSON Parsing Errors

The system automatically cleans control characters from Gemini responses to prevent JSON parsing errors.

## Content Features

Each page includes:
- **Hero Section**: 
  - Page title: "¿Cuánto cuesta un inmueble en [location]?"
  - First paragraph of introduction
  - Price summary card with average price per m²
  - Signup CTA card
- **Price Chart**: Interactive line chart showing price trends over time (X-axis dates in Spanish)
- **Introduction**: Remaining paragraphs (first paragraph already shown in hero)
- **Must-Visit Spots**: 3-5 places with descriptions
- **Price Insights**: Analysis of pricing trends
- **CTAs**: Links to interactive map and calculators

## SEO Features

- Spanish content (less competition)
- Keyword-optimized URLs
- Meta titles and descriptions
- Open Graph tags
- Twitter Card tags
- Schema.org structured data (Article, BreadcrumbList)
- Canonical URLs

## Environment Variables

Required:
- `GEMINI_API_KEY`: Your Google Gemini API key
- `GEMINI_MODEL`: Model to use (default: `gemini-2.5-flash`)

## Example Output

After running:
```bash
npm run generate-location "Condesa"
```

You'll get:
- Page saved to: `content/locations/cuanto-cuesta-comprar-en-condesa.json`
- Accessible at: `https://proptrenz.com/cuanto-cuesta-comprar-en-condesa`

### Batch Generation Example

After running:
```bash
npm run generate-locations jalisco
```

You'll see:
- City filter confirmation: `📍 City filter enabled: Jalisco`
- Progress for each location: `[1/10] Processing: Guadalajara`
- Data lookup with city context: `[Location Page] Looking up data for: Providencia in Jalisco`
- Success/failure status for each page
- Summary report at the end with total successful/failed pages
- URLs for all generated pages

## Next Steps

1. Generate pages for all major neighborhoods and municipalities
2. Add to sitemap.xml
3. Monitor Google Search Console for indexing
4. Track performance and optimize content based on data

