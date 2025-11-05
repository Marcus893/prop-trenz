# Banorte Tableau Scraper

This script extracts neighborhood-level real estate data from Banorte's Tableau Public dashboard.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers (first time only):
```bash
npx playwright install chromium
```

## Usage

Run the scraper:
```bash
npm run scrape:banorte
```

Or directly:
```bash
node scripts/scrape-banorte-tableau.js
```

## What It Does

1. Loads the Banorte dashboard at https://public.tableau.com/app/profile/dashboards.7967/viz/INBAPREVI3/Nacional2
2. Processes two worksheets:
   - **Ciudad de México** (CDMX boroughs/Alcaldías)
   - **Monterrey** (Municipalities/Municipios)
3. For each worksheet:
   - Iterates through all counties (Alcaldías/Municipios)
   - For each county, extracts neighborhood data from the map tooltips:
     - **Colonia** (neighborhood name)
     - **Precio** (average price per m²)
     - **Mes** (month/year, e.g., "September 2025")

## Output

The script saves data to `data/banorte-neighborhood-data.json` with the following structure:

```json
{
  "Ciudad de México": {
    "Álvaro Obregón": [
      {
        "colonia": "Roma Norte",
        "precio": "81154",
        "mes": "septiembre de 2025"
      },
      ...
    ],
    "Benito Juárez": [...],
    ...
  },
  "Monterrey": {
    "San Pedro Garza García": [...],
    ...
  }
}
```

## Notes

- The browser runs in **non-headless mode** so you can see the progress
- The script systematically scans the map by hovering over grid points to trigger tooltips
- Processing time depends on the number of counties (expect 5-10 minutes total)
- If the script misses counties, check the console output for errors
- You may need to adjust selectors if Tableau updates their UI structure

## Troubleshooting

- **No counties found**: The filter structure might have changed. Check the console output and adjust selectors in the script
- **No tooltips**: The map rendering might be delayed. Increase wait times in the script
- **Script hangs**: Tableau might be blocking automated access. Try running it at different times or add more delays


