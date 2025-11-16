const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DASHBOARD_URL = 'https://public.tableau.com/app/profile/dashboards.7967/viz/INBAPREVI3/Nacional2';

// Normalize date format to "September 2025"
function normalizeMes(mes) {
  if (!mes) return mes;
  
  // Trim and normalize whitespace
  mes = mes.trim().replace(/\s+/g, ' ');
  
  // Spanish month names mapping (case-insensitive)
  const spanishMonthMap = {
    'enero': 'January',
    'febrero': 'February',
    'marzo': 'March',
    'abril': 'April',
    'mayo': 'May',
    'junio': 'June',
    'julio': 'July',
    'agosto': 'August',
    'septiembre': 'September',
    'octubre': 'October',
    'noviembre': 'November',
    'diciembre': 'December'
  };
  
  // Spanish month abbreviations mapping (3-letter abbreviations)
  const spanishAbbrMap = {
    'ene': 'January',
    'feb': 'February',
    'mar': 'March',
    'abr': 'April',
    'may': 'May',
    'jun': 'June',
    'jul': 'July',
    'ago': 'August',
    'sep': 'September',
    'oct': 'October',
    'nov': 'November',
    'dic': 'December'
  };
  
  // Format: "enero de 2025", "enero 2025", "Enero de 2025" (Spanish month names)
  const spanishFormat = mes.match(/^([a-záéíóúñ]+)\s+(?:de\s+)?(\d{4})$/i);
  if (spanishFormat) {
    const monthName = spanishFormat[1].toLowerCase();
    const year = spanishFormat[2];
    
    const englishMonth = spanishMonthMap[monthName];
    if (englishMonth) {
      return `${englishMonth} ${year}`;
    }
  }
  
  // Format: "ene-25", "ene-2025", "ene 2025", "ene 25" (Spanish abbreviations)
  // Also handle cases with optional whitespace: "ene - 25", "ene- 25", etc.
  let shortFormat = mes.match(/^([a-záéíóúñ]{3})\s*-\s*(\d{2,4})$/i);
  if (shortFormat) {
    const monthAbbr = shortFormat[1].toLowerCase();
    let year = shortFormat[2];
    
    // Convert 2-digit year to 4-digit
    if (year.length === 2) {
      year = '20' + year;
    }
    
    // Check Spanish abbreviations
    const fullMonth = spanishAbbrMap[monthAbbr];
    if (fullMonth) {
      return `${fullMonth} ${year}`;
    }
    
    console.warn(`[normalizeMes] Unknown month abbreviation: ${monthAbbr}, original: ${mes}`);
    return mes;
  }
  
  // Format: "ene 2025", "ene 25", "jun 2025" (space-separated Spanish abbreviations)
  shortFormat = mes.match(/^([a-záéíóúñ]{3})\s+(\d{2,4})$/i);
  if (shortFormat) {
    const monthAbbr = shortFormat[1].toLowerCase();
    let year = shortFormat[2];
    
    // Convert 2-digit year to 4-digit
    if (year.length === 2) {
      year = '20' + year;
    }
    
    // Check Spanish abbreviations
    const fullMonth = spanishAbbrMap[monthAbbr];
    if (fullMonth) {
      return `${fullMonth} ${year}`;
    }
    
    console.warn(`[normalizeMes] Unknown month abbreviation: ${monthAbbr}, original: ${mes}`);
    return mes;
  }
  
  // Already in correct format: "September 2025" (full English month name with 4+ letters)
  // Only check this after checking for abbreviations to avoid false matches
  if (mes.match(/^[A-Za-z]{4,} \d{4}$/)) {
    // Capitalize first letter of month and return
    const parts = mes.split(' ');
    const month = parts[0];
    const year = parts[1];
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
    return `${capitalizedMonth} ${year}`;
  }
  
  // Return as-is if format is unrecognized
  return mes;
}

// Allow selecting specific worksheet via CLI arg: `node scripts/scrape-banorte-tableau.js cdmx|monterrey|jalisco|all`
const arg = (process.argv[2] || '').toLowerCase();
let WORKSHEETS = ['Ciudad de México', 'Monterrey', 'Jalisco'];
if (arg === 'cdmx' || arg === 'ciudad' || arg === 'ciudad-de-mexico' || arg === 'ciudad_de_mexico') {
  WORKSHEETS = ['Ciudad de México'];
}
if (arg === 'monterrey' || arg === 'mty') {
  WORKSHEETS = ['Monterrey'];
}
if (arg === 'jalisco' || arg === 'gdl' || arg === 'guadalajara') {
  WORKSHEETS = ['Jalisco'];
}

async function scrapeTableauDashboard() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  const page = await context.newPage();
  
  // Intercept and capture data responses
  const capturedData = [];
  
  page.on('response', async (response) => {
    const url = response.url();
    // Tableau data endpoints
    if (url.includes('/summaryData') || url.includes('/dataValues') || url.includes('/bootstrapSession')) {
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('json') || contentType.includes('text')) {
          const text = await response.text();
          if (text && text.length > 0) {
            capturedData.push({
              url,
              timestamp: new Date().toISOString(),
              data: text.substring(0, 1000) // First 1000 chars for inspection
            });
          }
        }
      } catch (e) {
        // Skip binary responses
      }
    }
  });
  
  console.log('Loading dashboard...');
  
  // Load page with more lenient wait strategy
  await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  
  // Handle cookie consent popup - exclude style tags
  console.log('Checking for cookie consent popup...');
  try {
    // Wait a bit for popup to appear
    await page.waitForTimeout(2000);
    
    // Look for the actual banner (not style tags) - must be a visible div
    const cookieBanner = page.locator('div#onetrust-banner-sdk[role="dialog"]').or(page.locator('div#onetrust-consent-sdk[role="dialog"]'));
    
    try {
      await cookieBanner.waitFor({ state: 'visible', timeout: 8000 });
      console.log('Cookie banner found, looking for accept button...');
      
      // Use the exact button ID - make sure it's visible and clickable
      const acceptButton = page.locator('#onetrust-accept-btn-handler').filter({ hasNot: page.locator('style') });
      
      if (await acceptButton.isVisible({ timeout: 3000 })) {
        console.log('Found Accept All Cookies button, clicking...');
        await acceptButton.click({ force: true });
        await page.waitForTimeout(3000);
        console.log('Cookie popup dismissed');
      } else {
        // Try text-based selector
        const textButton = page.locator('button:has-text("Accept All Cookies")');
        if (await textButton.isVisible({ timeout: 2000 })) {
          await textButton.click({ force: true });
          await page.waitForTimeout(3000);
          console.log('Cookie popup dismissed (via text selector)');
        }
      }
    } catch (e) {
      console.log('Cookie banner not visible or already dismissed');
    }
  } catch (e) {
    console.log('Cookie handling error (continuing anyway):', e.message);
  }

  // Wait for dashboard to fully load
  console.log('Waiting for dashboard to load...');
  await page.waitForTimeout(5000);
  
  // Find and switch to the Tableau iframe
  console.log('\n=== Looking for Tableau iframe ===');
  let tableauFrame = null;
  
  // Try different iframe selectors
  const iframeSelectors = [
    'iframe[title*="Tableau"], iframe[title*="dashboard"]',
    'iframe[id*="viz"]',
    'iframe[src*="tableau"]',
    'iframe'
  ];
  
  let iframeSrc = null;
  
  for (const selector of iframeSelectors) {
    const iframes = await page.locator(selector).all();
    console.log(`  Found ${iframes.length} iframes with selector: ${selector}`);
    
    for (let i = 0; i < iframes.length; i++) {
      const iframe = iframes[i];
      const title = await iframe.getAttribute('title').catch(() => '') || '';
      const src = await iframe.getAttribute('src').catch(() => '') || '';
      console.log(`    Iframe ${i}: title="${title}", src="${src ? src.substring(0, 50) + '...' : '(no src)'}"`);
      
      // Check if this looks like the dashboard iframe
      if (src && (src.includes('tableau') || src.includes('viz') || title.toLowerCase().includes('tableau') || title.toLowerCase().includes('data visualization'))) {
        iframeSrc = src;
        console.log(`    ✓ Found Tableau iframe src: ${src}`);
        
        // Try to get the frame
        try {
          const frame = await iframe.contentFrame();
          if (frame && typeof frame.evaluate === 'function') {
            tableauFrame = frame;
            console.log(`  ✓ Successfully accessed iframe frame!`);
            break;
          } else {
            console.log(`    Frame object exists but may not be ready yet`);
          }
        } catch (e) {
          console.log(`    Could not access iframe frame: ${e.message}`);
        }
      }
    }
    
    if (tableauFrame) break;
  }
  
  // If we found the iframe src but couldn't access the frame, navigate directly to it
  if (!tableauFrame && iframeSrc) {
    console.log(`  Could not access iframe, navigating directly to: ${iframeSrc}`);
    await page.goto(iframeSrc, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(3000);
    
    // Handle cookies again on direct navigation
    try {
      const cookieBanner = page.locator('div#onetrust-banner-sdk[role="dialog"]').or(page.locator('div#onetrust-consent-sdk[role="dialog"]'));
      if (await cookieBanner.isVisible({ timeout: 3000 })) {
        const acceptButton = page.locator('#onetrust-accept-btn-handler');
        if (await acceptButton.isVisible({ timeout: 2000 })) {
          await acceptButton.click({ force: true });
          await page.waitForTimeout(2000);
        }
      }
    } catch (e) {
      // Ignore cookie errors on direct navigation
    }
    
    await page.waitForTimeout(5000);
    tableauFrame = page; // Use page directly since we navigated to the iframe URL
  }
  
  // If no iframe found, try to access the main page's embedded content
  if (!tableauFrame || typeof tableauFrame.evaluate !== 'function') {
    console.log('  No valid iframe found, using main page context');
    tableauFrame = page;
  }
  
  // Verify tableauFrame is usable
  if (!tableauFrame || typeof tableauFrame.evaluate !== 'function') {
    throw new Error('Could not access Tableau dashboard - no valid iframe or page context');
  }
  
  // Debug: List all visible text in the iframe/page
  console.log('\n=== Debugging: Finding available tabs ===');
  const allTexts = await tableauFrame.evaluate(() => {
    const texts = [];
    const buttons = Array.from(document.querySelectorAll('button, a, [role="tab"], [role="button"], div[class*="tab"], span[class*="tab"]'));
    buttons.forEach(btn => {
      const text = btn.textContent?.trim();
      if (text && text.length > 0 && text.length < 50 && !texts.includes(text)) {
        texts.push(text);
      }
    });
    return texts.slice(0, 30);
  });
  console.log('Available clickable texts:', allTexts);
  
  // Wait a bit more for any lazy-loaded content
  await page.waitForTimeout(3000);

  // Load existing data files to merge with new data
  const existingData = {};
  
  // Determine which files to load based on worksheets being processed
  const filesToLoad = new Set();
  
  if (WORKSHEETS.length === 1) {
    // Single worksheet - load specific file
    if (WORKSHEETS[0] === 'Ciudad de México') {
      filesToLoad.add('banorte-neighborhood-data-cdmx.json');
    } else if (WORKSHEETS[0] === 'Monterrey') {
      filesToLoad.add('banorte-neighborhood-data-monterrey.json');
    } else if (WORKSHEETS[0] === 'Jalisco') {
      filesToLoad.add('banorte-neighborhood-data-jalisco.json');
    }
  } else {
    // Multiple worksheets - load all relevant files
    filesToLoad.add('banorte-neighborhood-data.json');
    filesToLoad.add('banorte-neighborhood-data-cdmx.json');
    filesToLoad.add('banorte-neighborhood-data-monterrey.json');
    filesToLoad.add('banorte-neighborhood-data-jalisco.json');
  }
  
  // Load each file once
  for (const filename of filesToLoad) {
    const existingPath = path.join(__dirname, '../data', filename);
    if (fs.existsSync(existingPath)) {
      try {
        const existingContent = fs.readFileSync(existingPath, 'utf8');
        const existing = JSON.parse(existingContent);
        // Merge existing data into our structure
        Object.keys(existing).forEach(key => {
          if (!existingData[key]) {
            existingData[key] = {};
          }
          // Deep merge municipalities
          Object.keys(existing[key]).forEach(municipality => {
            existingData[key][municipality] = existing[key][municipality];
          });
        });
        console.log(`  Loaded existing data from ${filename}`);
      } catch (error) {
        console.log(`  Warning: Could not load existing data from ${filename}: ${error.message}`);
      }
    }
  }

  const allData = {};
  
  // Initialize allData with existing data
  for (const worksheetName of WORKSHEETS) {
    allData[worksheetName] = existingData[worksheetName] || {};
  }

  for (const worksheetName of WORKSHEETS) {
    console.log(`\n=== Processing worksheet: ${worksheetName} ===`);
    
    try {
      // Click worksheet tab - try multiple approaches
      console.log(`  Looking for worksheet tab: "${worksheetName}"`);
      
      let tabClicked = false;
      
      // Method 1: Exact text match (more flexible) - use tableauFrame
      try {
        const allTabs = tableauFrame.locator(`text=/.*${worksheetName}.*/i`);
        const count = await allTabs.count();
        console.log(`    Found ${count} elements matching "${worksheetName}"`);
        
        if (count > 0) {
          // Try to find the one that's clickable
          for (let i = 0; i < count; i++) {
            const tab = allTabs.nth(i);
            const tagName = await tab.evaluate(el => el.tagName);
            const isVisible = await tab.isVisible().catch(() => false);
            const text = await tab.textContent().catch(() => '');
            
            console.log(`      Element ${i}: ${tagName}, visible: ${isVisible}, text: "${text}"`);
            
            if (isVisible && (tagName === 'BUTTON' || tagName === 'A' || tagName === 'DIV')) {
              await tab.click({ force: true });
              tabClicked = true;
              console.log(`    ✓ Clicked tab via text match`);
              break;
            }
          }
        }
      } catch (e) {
        console.log(`    Text match failed:`, e.message);
      }
      
      // Method 2: Use tableauFrame.evaluate to find and click (more comprehensive)
      if (!tabClicked) {
        const clicked = await tableauFrame.evaluate((name) => {
          // Search all elements
          const all = Array.from(document.querySelectorAll('*'));
          
          for (const el of all) {
            const text = el.textContent?.trim();
            if (text && text.includes(name)) {
              // Check if it's clickable
              const isClickable = el.tagName === 'BUTTON' || 
                                el.tagName === 'A' || 
                                el.getAttribute('role') === 'tab' ||
                                el.getAttribute('role') === 'button' ||
                                window.getComputedStyle(el).cursor === 'pointer';
              
              if (isClickable && el.offsetParent !== null) { // Visible
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => el.click(), 100);
                return { success: true, tagName: el.tagName, text: text };
              }
            }
          }
          return { success: false };
        }, worksheetName);
        
        if (clicked.success) {
          tabClicked = true;
          console.log(`    ✓ Found and clicked tab: ${clicked.tagName} with text "${clicked.text}"`);
          await page.waitForTimeout(2000);
        }
      }
      
      if (!tabClicked) {
        console.log(`    ✗ Could not find worksheet tab: ${worksheetName}`);
        console.log(`    Available options: ${allTexts.join(', ')}`);
        throw new Error(`Could not find worksheet tab: ${worksheetName}`);
      }
      
      await page.waitForTimeout(6000); // Wait longer for worksheet to fully load

      const filterLabel = worksheetName === 'Ciudad de México' ? 'Alcaldías' : 'Municipios';
      
      console.log(`  Looking for filter section: "${filterLabel}"`);
      
      // Debug: List all text on the page to see what's available
      const allPageText = await tableauFrame.evaluate(() => {
        const texts = [];
        const all = Array.from(document.querySelectorAll('*'));
        all.forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length > 2 && text.length < 100 && texts.indexOf(text) === -1) {
            texts.push(text);
          }
        });
        return texts.slice(0, 50);
      });
      console.log(`  Sample page texts:`, allPageText.slice(0, 10));
      
      // Comprehensive search for counties using DOM
      const foundCounties = await tableauFrame.evaluate((label) => {
        const results = [];
        
        // Method 1: Find element containing the filter label
        const allElements = Array.from(document.querySelectorAll('*'));
        let filterContainer = null;
        
        for (const el of allElements) {
          const text = el.textContent || '';
          // Look for the label text (may include asterisks or other chars)
          if (text.includes(label) || text.includes('Alcaldías') || text.includes('Municipios')) {
            // Find a container that might hold the options
            let container = el;
            for (let i = 0; i < 5; i++) {
              container = container.parentElement;
              if (!container) break;
              const containerClass = container.className || '';
              if (containerClass.includes('filter') || 
                  containerClass.includes('selection') || 
                  containerClass.includes('radio') ||
                  container.querySelectorAll('input[type="radio"]').length > 0) {
                filterContainer = container;
                break;
              }
            }
            if (filterContainer) break;
          }
        }
        
        // Method 2: Search for all radio inputs and their labels
        if (filterContainer) {
          const inputs = filterContainer.querySelectorAll('input[type="radio"], input[type="checkbox"]');
          inputs.forEach(input => {
            let text = '';
            // Try to find label
            const id = input.id;
            if (id) {
              const label = document.querySelector(`label[for="${id}"]`);
              text = label?.textContent?.trim() || '';
            }
            if (!text) {
              // Try parent element
              const parent = input.parentElement;
              text = parent?.textContent?.trim() || '';
            }
            if (!text) {
              // Try sibling elements
              const sibling = input.nextElementSibling || input.previousElementSibling;
              text = sibling?.textContent?.trim() || '';
            }
            if (text && text.length > 2 && !text.includes(label) && !text.includes('Seleccione')) {
              results.push({ text: text.split('\n')[0].trim(), element: input });
            }
          });
        }
        
        // Method 3: Search for clickable divs/buttons that might be counties
        if (results.length === 0) {
          const clickables = filterContainer?.querySelectorAll('div[role="radio"], div[tabindex], button, [onclick]') || [];
          clickables.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 2 && text.length < 50 && 
                !text.includes(label) && !text.includes('Seleccione') &&
                el.offsetParent !== null) {
              results.push({ text: text.split('\n')[0].trim(), element: el });
            }
          });
        }
        
        return results;
      }, filterLabel);
      
      const countyNames = [...new Set(foundCounties.map(c => c.text))];
      console.log(`  Found ${countyNames.length} counties: ${countyNames.slice(0, 10).join(', ')}${countyNames.length > 10 ? '...' : ''}`);

      if (countyNames.length === 0) {
        console.log(`  ⚠ No counties found for ${worksheetName}, skipping...`);
        // Preserve existing data structure
        if (!allData[worksheetName]) {
          allData[worksheetName] = {};
        }
        continue;
      }

      // Preserve existing data structure (already initialized above)
      if (!allData[worksheetName]) {
        allData[worksheetName] = {};
      }
      const processedCounties = new Set(); // Track processed counties to avoid duplicates

      // Process each county
      for (let i = 0; i < countyNames.length; i++) {
        const countyName = countyNames[i];
        console.log(`  [${i + 1}/${countyNames.length}] ${countyName}`);
        
        // Skip if already processed
        if (processedCounties.has(countyName)) {
          console.log(`    ⚠ Skipping ${countyName} - already processed`);
          continue;
        }
        
        try {
          // Clear previous captured data
          capturedData.length = 0;
          
          // Click the county radio button - target radio inputs specifically
          const clickResult = await tableauFrame.evaluate((name) => {
            // First, find all radio inputs
            const radioInputs = Array.from(document.querySelectorAll('input[type="radio"]'));
            
            for (const radio of radioInputs) {
              // Check various ways to find the label text
              let labelText = '';
              
              // Method 1: Associated label via 'for' attribute
              if (radio.id) {
                const label = document.querySelector(`label[for="${radio.id}"]`);
                labelText = label?.textContent?.trim() || '';
              }
              
              // Method 2: Parent label
              if (!labelText) {
                const parentLabel = radio.closest('label');
                labelText = parentLabel?.textContent?.trim() || '';
              }
              
              // Method 3: Sibling text
              if (!labelText) {
                const nextSibling = radio.nextElementSibling;
                const prevSibling = radio.previousElementSibling;
                labelText = (nextSibling?.textContent?.trim() || prevSibling?.textContent?.trim() || '').split('\n')[0].trim();
              }
              
              // Method 4: Parent container text (but filter out other options)
              if (!labelText) {
                const parent = radio.parentElement;
                if (parent) {
                  const allText = parent.textContent?.trim() || '';
                  // Extract just the county name (first line, before any newlines or other text)
                  labelText = allText.split('\n')[0].trim();
                }
              }
              
              // Check if this radio matches our county name
              if (labelText && (labelText === name || labelText.includes(name) || name.includes(labelText))) {
                // Uncheck all radios first (to ensure only one is selected)
                radioInputs.forEach(r => r.checked = false);
                // Check and click this one
                radio.checked = true;
                radio.dispatchEvent(new Event('change', { bubbles: true }));
                radio.click();
                // Trigger change event
                radio.dispatchEvent(new Event('click', { bubbles: true }));
                return { success: true, labelText };
              }
            }
            
            return { success: false };
          }, countyName);
          
          let clickSuccessful = false;
          
          if (!clickResult.success) {
            console.log(`    ⚠ Could not find radio button for ${countyName}, trying alternative click...`);
            // Fallback: try clicking by text
            const textMatch = tableauFrame.locator(`text="${countyName}"`).first();
            if (await textMatch.count() > 0) {
              await textMatch.click();
              clickSuccessful = true; // Assume it worked if we found and clicked it
            }
          } else {
            console.log(`    ✓ Clicked radio button for: ${countyName}`);
            clickSuccessful = true;
          }
          
          // Wait for selection to take effect and map to update
          await page.waitForTimeout(2000);
          
          // Only verify selection if click was successful (skip verification if click failed)
          // Verification is just for confirmation, not critical if click already succeeded
          if (clickSuccessful) {
            // Silently verify - don't log warnings if verification fails since click succeeded
            // This verification is just to double-check, but we trust the click result
            const selectionStatus = await tableauFrame.evaluate((name) => {
              const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
              for (const radio of radios) {
                let labelText = '';
                if (radio.id) {
                  const label = document.querySelector(`label[for="${radio.id}"]`);
                  labelText = label?.textContent?.trim() || '';
                }
                if (!labelText) {
                  const parent = radio.closest('label');
                  labelText = parent?.textContent?.trim() || '';
                }
                if (!labelText) {
                  const sibling = radio.nextElementSibling || radio.previousElementSibling;
                  labelText = sibling?.textContent?.trim() || '';
                }
                
                if (labelText && (labelText === name || labelText.includes(name) || name.includes(labelText))) {
                  // Check multiple indicators of selection
                  const checked = radio.checked;
                  const ariaChecked = radio.getAttribute('aria-checked');
                  const parentLabel = radio.closest('label');
                  const parentClasses = parentLabel?.className || '';
                  const isVisuallySelected = parentClasses.includes('selected') || 
                                           parentClasses.includes('active') ||
                                           radio.getAttribute('aria-selected') === 'true';
                  
                  return {
                    checked: checked,
                    ariaChecked: ariaChecked,
                    visuallySelected: isVisuallySelected,
                    labelText: labelText
                  };
                }
              }
              return null;
            }, countyName);
            
            // Only retry if verification shows it's not selected AND we found the radio
            const isSelected = selectionStatus && (
              selectionStatus.checked || 
              selectionStatus.ariaChecked === 'true' || 
              selectionStatus.visuallySelected
            );
            
            if (!isSelected && selectionStatus) {
              // Only log if verification shows it's actually not selected
              console.log(`    ⚠ Radio button may not be selected, retrying...`);
              await tableauFrame.evaluate((name) => {
                const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
                for (const radio of radios) {
                  const parent = radio.closest('label') || radio.parentElement;
                  const text = parent?.textContent?.trim().split('\n')[0].trim() || '';
                  if (text === name || text.includes(name)) {
                    radios.forEach(r => {
                      r.checked = false;
                      r.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                    radio.checked = true;
                    radio.setAttribute('aria-checked', 'true');
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                    radio.click();
                    radio.dispatchEvent(new Event('click', { bubbles: true }));
                  }
                }
              }, countyName);
              await page.waitForTimeout(2000);
            }
            // Don't log warning if verification couldn't find it - click already succeeded, so trust that
          }
          
          // Wait for map to update - check if map title changes
          console.log(`    Waiting for map to update...`);
          await page.waitForTimeout(4000);

          // Verify the map actually changed to this county - search for the county name in map area
          const mapTitle = await tableauFrame.evaluate((expectedCountyName) => {
            // Method 1: Search for text that matches the county name (case-insensitive)
            const allElements = Array.from(document.querySelectorAll('*'));
            const countyNameLower = expectedCountyName.toLowerCase();
            
            // Look for exact or partial matches of the county name
            for (const el of allElements) {
              const text = el.textContent?.trim();
              if (!text || text.length > 50) continue; // Skip long texts
              
              const textLower = text.toLowerCase();
              // Check if this text matches the county name (exact or contains)
              if (textLower === countyNameLower || 
                  (textLower.includes(countyNameLower) && text.length <= expectedCountyName.length + 5)) {
                // Make sure it's not a radio button label (we want the map title)
                const isRadioLabel = el.closest('label[for]') || 
                                   el.closest('[role="radio"]') ||
                                   el.tagName === 'LABEL';
                if (!isRadioLabel) {
                  return text;
                }
              }
            }
            
            // Method 2: Look for text in SVG elements (maps often use SVG)
            const svgTexts = Array.from(document.querySelectorAll('svg text, svg tspan'));
            for (const svgText of svgTexts) {
              const text = svgText.textContent?.trim();
              if (text && text.length < 50) {
                const textLower = text.toLowerCase();
                if (textLower === countyNameLower || 
                    (textLower.includes(countyNameLower) && text.length <= expectedCountyName.length + 5)) {
                  return text;
                }
              }
            }
            
            // Method 3: Look for text in elements with map-related classes
            const mapContainers = Array.from(document.querySelectorAll('[class*="map"], [class*="viz"], [class*="dashboard"]'));
            for (const container of mapContainers) {
              const text = container.textContent?.trim();
              if (text && text.length < 100) {
                const textLower = text.toLowerCase();
                if (textLower === countyNameLower || 
                    (textLower.includes(countyNameLower) && text.length <= expectedCountyName.length + 10)) {
                  return text.split('\n')[0].trim();
                }
              }
            }
            
            return null;
          }, countyName);
          
          console.log(`    Map title: "${mapTitle || 'Not found'}"`);
          
          // Check if map title matches our county
          const titleMatches = mapTitle && (
            mapTitle.toLowerCase() === countyName.toLowerCase() ||
            mapTitle.toLowerCase().includes(countyName.toLowerCase()) ||
            countyName.toLowerCase().includes(mapTitle.toLowerCase())
          );
          
          if (!titleMatches) {
            console.log(`    ⚠ Map title "${mapTitle || 'Not found'}" doesn't match ${countyName}, waiting and rechecking...`);
            // Wait a bit more and check again
            await page.waitForTimeout(3000);
            
            const mapTitle2 = await tableauFrame.evaluate((expectedCountyName) => {
              const allElements = Array.from(document.querySelectorAll('*'));
              const countyNameLower = expectedCountyName.toLowerCase();
              
              for (const el of allElements) {
                const text = el.textContent?.trim();
                if (!text || text.length > 50) continue;
                const textLower = text.toLowerCase();
                if (textLower === countyNameLower || 
                    (textLower.includes(countyNameLower) && text.length <= expectedCountyName.length + 5)) {
                  const isRadioLabel = el.closest('label[for]') || el.closest('[role="radio"]');
                  if (!isRadioLabel) {
                    return text;
                  }
                }
              }
              return null;
            }, countyName);
            
            console.log(`    Map title (retry): "${mapTitle2 || 'Not found'}"`);
            
            const titleMatches2 = mapTitle2 && (
              mapTitle2.toLowerCase() === countyName.toLowerCase() ||
              mapTitle2.toLowerCase().includes(countyName.toLowerCase()) ||
              countyName.toLowerCase().includes(mapTitle2.toLowerCase())
            );
            
            if (!titleMatches2) {
              console.log(`    ✗ Map title still doesn't match ${countyName}, but continuing anyway (may be a false negative)`);
              // Don't skip - the click might have worked even if we can't find the title
            }
          }

          // Wait a bit more for network requests
          await page.waitForTimeout(2000);

          // Extract tooltip data by hovering over map elements
          console.log(`    Extracting neighborhoods from map...`);
          const neighborhoods = await extractMapTooltips(tableauFrame, countyName);
          
          // Also check if we captured any data from network requests
          if (capturedData.length > 0) {
            console.log(`    Captured ${capturedData.length} data requests`);
          }

          // Merge new neighborhoods with existing ones (only add neighborhoods that don't exist)
          // Use both colonia name AND month as unique identifier to allow same colonia with different months
          const existingNeighborhoods = allData[worksheetName][countyName] || [];
          const existingKeys = new Set(
            existingNeighborhoods.map(n => {
              const colonia = (n.colonia || '').toLowerCase().trim();
              const mes = (n.mes || '').toLowerCase().trim();
              return `${colonia}::${mes}`;
            })
          );
          
          const newNeighborhoods = neighborhoods.filter(n => {
            const colonia = (n.colonia || '').toLowerCase().trim();
            const mes = (n.mes || '').toLowerCase().trim();
            const key = `${colonia}::${mes}`;
            return !existingKeys.has(key);
          });
          
          if (newNeighborhoods.length > 0) {
            console.log(`    Adding ${newNeighborhoods.length} new neighborhoods (${existingNeighborhoods.length} already existed)`);
            allData[worksheetName][countyName] = [...existingNeighborhoods, ...newNeighborhoods];
          } else {
            console.log(`    No new neighborhoods to add (${existingNeighborhoods.length} already exist)`);
            // Keep existing neighborhoods
            allData[worksheetName][countyName] = existingNeighborhoods;
          }
          
          processedCounties.add(countyName); // Mark as processed only after successful extraction
          console.log(`    ✓ Processed ${countyName}: ${allData[worksheetName][countyName].length} total neighborhoods`);

        } catch (error) {
          console.error(`    Error with ${countyName}:`, error.message);
          // Preserve existing neighborhoods if there's an error
          if (!allData[worksheetName][countyName]) {
            allData[worksheetName][countyName] = [];
          }
        }
      }

    } catch (error) {
      console.error(`Error with worksheet ${worksheetName}:`, error.message);
      console.error(error.stack);
      // Preserve existing data structure on error
      if (!allData[worksheetName]) {
        allData[worksheetName] = {};
      }
    }
  }

  // Save results - use different file names based on which worksheets were scraped
  let filename = 'banorte-neighborhood-data.json';
  if (WORKSHEETS.length === 1) {
    if (WORKSHEETS[0] === 'Ciudad de México') {
      filename = 'banorte-neighborhood-data-cdmx.json';
    } else if (WORKSHEETS[0] === 'Monterrey') {
      filename = 'banorte-neighborhood-data-monterrey.json';
    } else if (WORKSHEETS[0] === 'Jalisco') {
      filename = 'banorte-neighborhood-data-jalisco.json';
    }
  }
  
  // Save to both data/ and public/data/ directories to keep them in sync
  const dataPath = path.join(__dirname, '../data', filename);
  const publicDataPath = path.join(__dirname, '../public/data', filename);
  
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.mkdirSync(path.dirname(publicDataPath), { recursive: true });
  
  const jsonData = JSON.stringify(allData, null, 2);
  fs.writeFileSync(dataPath, jsonData);
  fs.writeFileSync(publicDataPath, jsonData);

  console.log(`\n=== Complete! Data saved to: ${dataPath} ===`);
  console.log(`              Also saved to: ${publicDataPath} ===`);
  console.log(`Total counties: ${Object.values(allData).reduce((sum, ws) => sum + Object.keys(ws).length, 0)}`);
  console.log(`Total neighborhoods: ${JSON.stringify(allData).match(/colonia/gi)?.length || 0}`);

  await browser.close();
}

async function extractMapTooltips(frame, countyName) {
  const neighborhoods = [];
  const seen = new Set();

  try {
    // Find the map container - Tableau uses various selectors
    const mapSelectors = [
      'canvas',
      '[class*="map"]',
      '[id*="map"]',
      'svg',
      '[role="img"]',
      '[class*="mark"]'
    ];

    let mapElement = null;
    for (const selector of mapSelectors) {
      const elem = frame.locator(selector).first();
      if (await elem.count() > 0) {
        const bounds = await elem.boundingBox();
        if (bounds && bounds.width > 200 && bounds.height > 200) {
          mapElement = elem;
          break;
        }
      }
    }

    if (!mapElement) {
      console.log(`    No map found for ${countyName}`);
      return neighborhoods;
    }

    const bounds = await mapElement.boundingBox();
    if (!bounds) return neighborhoods;

    console.log(`    Scanning map (${bounds.width}x${bounds.height})...`);

    // Systematic scan of the map - use a denser grid to find more neighborhoods
    const gridSize = 20;
    const stepX = bounds.width / gridSize;
    const stepY = bounds.height / gridSize;

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const xPos = bounds.x + stepX * x + stepX / 2;
        const yPos = bounds.y + stepY * y + stepY / 2;

        await frame.mouse.move(xPos, yPos);
        await frame.waitForTimeout(150);

        // Check for tooltip
        const tooltipSelectors = [
          '[role="tooltip"]',
          '[class*="tooltip"]',
          '[id*="tooltip"]',
          '[class*="Tooltip"]',
          'div[style*="position"][style*="absolute"]'
        ];

        for (const selector of tooltipSelectors) {
          const tooltip = frame.locator(selector).first();
          if (await tooltip.isVisible({ timeout: 100 })) {
            const tooltipText = await tooltip.textContent();
            
            // Parse tooltip - handle cases where text might be concatenated (no newlines)
            // The tooltip might be structured like: "Colonia: NamePrecio: $XMes: Y" (all concatenated)
            // Or with newlines: "Colonia: Name\nPrecio: $X\nMes: Y"
            
            let colonia = null;
            let precio = null;
            let mes = null;
            
            // Extract colonia - try with "Colonia:" prefix first
            const coloniaWithPrefix = tooltipText?.match(/Colonia[:\s]+(.+?)(?=Precio|Mes|\n|$)/is);
            if (coloniaWithPrefix) {
              colonia = coloniaWithPrefix[1].trim();
            } else {
              // If no "Colonia:" prefix, the name might be first before "Precio:"
              const coloniaBeforePrecio = tooltipText?.match(/^(.+?)(?=Precio)/i);
              if (coloniaBeforePrecio) {
                colonia = coloniaBeforePrecio[1].trim();
              }
            }
            
            // Clean colonia name - remove any trailing labels that might have leaked
            if (colonia) {
              colonia = colonia.replace(/(Precio|Mes)[:\s].*$/i, '').trim();
              colonia = colonia.replace(/^Colonia[:\s]+/i, '').trim();
            }
            
            // Extract precio - match digits and currency symbols, stop at "Mes:" or non-numeric
            const precioMatch = tooltipText?.match(/Precio[:\s$]+([\d,.\s]*?)(?=Mes|\n|$)/i);
            if (precioMatch) {
              let precioText = precioMatch[1].trim();
              // Remove "Mes:" if it got included
              precioText = precioText.replace(/Mes[:\s].*$/i, '').trim();
              // Remove currency symbols, whitespace, and commas, keep only digits and dots
              precioText = precioText.replace(/[$,\s]/g, '').replace(/[^\d.]/g, '');
              
              // Parse and validate
              const precioValue = parseFloat(precioText);
              if (!isNaN(precioValue) && precioValue > 0) {
                precio = precioText; // Store the cleaned numeric string
              }
            }
            
            // Extract mes - stop at "Precio:" or newline
            const mesMatch = tooltipText?.match(/Mes[:\s]+(.+?)(?=Precio|\n|\r|$)/is);
            if (mesMatch) {
              mes = mesMatch[1].trim();
              // Clean up any trailing whitespace, punctuation, or currency symbols
              mes = mes.replace(/\s+$/, '').replace(/[$\s]+$/, '').trim();
              // Normalize date format
              mes = normalizeMes(mes);
            }

            // Only add if we have both colonia name and valid precio (price > 0)
            if (colonia && precio && !seen.has(colonia.toLowerCase())) {
              seen.add(colonia.toLowerCase());
              neighborhoods.push({ colonia, precio, mes });
              console.log(`      ✓ ${colonia}: ${precio.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} (${mes || 'N/A'})`);
            } else if (colonia && !precio) {
              // Log skipped neighborhoods for debugging
              console.log(`      ⊘ ${colonia}: skipped (no price)`);
            }
            break;
          }
        }
      }
    }

  } catch (error) {
    console.log(`    Error extracting tooltips: ${error.message}`);
  }

  return neighborhoods;
}

scrapeTableauDashboard().catch(console.error);
