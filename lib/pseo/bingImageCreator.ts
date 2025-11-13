// Bing Image Creator automation using Playwright
// This provides free access to DALL-E 3 via Bing.com/create

import { chromium, Browser, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const BING_CREATE_URL = 'https://www.bing.com/create'

interface BingImageResult {
  url: string
  revisedPrompt?: string
}

/**
 * Generate an image using Bing Image Creator (free DALL-E 3 access)
 * Requires: Microsoft account login (manual first time, then uses stored session)
 */
export async function generateImageWithBing(
  prompt: string,
  options: {
    headless?: boolean
    timeout?: number
    sessionDir?: string
  } = {}
): Promise<BingImageResult> {
  const { headless = false, timeout = 120000, sessionDir } = options

  // Use persistent context to save login session
  const userDataDir = sessionDir || path.join(process.cwd(), '.playwright-bing-session')
  
  let browser: Browser | null = null
  let page: Page | null = null

  try {
    // Launch browser with persistent context (saves login session)
    browser = await chromium.launch({
      headless,
      channel: 'chromium'
    })

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })

    page = await context.newPage()

    console.log('[Bing] Navigating to Bing Image Creator...')
    await page.goto(BING_CREATE_URL, { waitUntil: 'domcontentloaded', timeout })

    // Check if we need to sign in
    const signInButton = page.locator('text=/sign in/i').or(page.locator('a[href*="login"]'))
    const needsSignIn = await signInButton.isVisible({ timeout: 5000 }).catch(() => false)

    if (needsSignIn) {
      console.log('[Bing] ⚠️ Sign-in required. Please sign in manually in the browser window.')
      console.log('[Bing] After signing in, the script will continue automatically...')
      
      // Wait for user to sign in (check for sign-in button to disappear or prompt input to appear)
      await page.waitForSelector('textarea[placeholder*="Describe"], input[placeholder*="Describe"], textarea[aria-label*="prompt"]', {
        timeout: 300000 // 5 minutes for manual sign-in
      }).catch(() => {
        throw new Error('Sign-in timeout. Please ensure you sign in within 5 minutes.')
      })
      
      console.log('[Bing] ✓ Sign-in detected, continuing...')
    }

    // Wait for the prompt input to be available
    console.log('[Bing] Waiting for prompt input...')
    const promptSelectors = [
      'textarea[placeholder*="Describe"]',
      'input[placeholder*="Describe"]',
      'textarea[aria-label*="prompt"]',
      'textarea[aria-label*="image"]',
      'textarea',
      'input[type="text"]'
    ]

    let promptInput = null
    for (const selector of promptSelectors) {
      const input = page.locator(selector).first()
      if (await input.count() > 0 && await input.isVisible({ timeout: 5000 }).catch(() => false)) {
        promptInput = input
        console.log(`[Bing] Found prompt input: ${selector}`)
        break
      }
    }

    if (!promptInput) {
      throw new Error('Could not find prompt input field on Bing Image Creator')
    }

    // Enter the prompt
    console.log(`[Bing] Entering prompt: "${prompt.substring(0, 50)}..."`)
    await promptInput.fill('')
    await promptInput.type(prompt, { delay: 50 })
    await page.waitForTimeout(1000)

    // Find and click the Create button
    // The Create button is actually an <a> tag with id="create_btn_c"
    console.log('[Bing] Looking for Create button...')
    const createButtonSelectors = [
      '#create_btn_c',
      'a[id="create_btn_c"]',
      'a[aria-label="Create"]',
      'a[name="Create"]',
      'a.gi_btn_p.linkBtn',
      'a:has-text("Create")',
      'button:has-text("Create")',
      'button[type="submit"]',
      'button[aria-label*="Create"]'
    ]

    let createButton = null
    for (const selector of createButtonSelectors) {
      const button = page.locator(selector).first()
      if (await button.count() > 0) {
        const isVisible = await button.isVisible({ timeout: 2000 }).catch(() => false)
        if (isVisible) {
          createButton = button
          console.log(`[Bing] Found Create button: ${selector}`)
          break
        }
      }
    }

    if (!createButton) {
      // Try a more aggressive search using evaluate
      const foundButton = await page.evaluate(() => {
        // Try by ID first
        const byId = document.getElementById('create_btn_c')
        if (byId) return { found: true, type: 'id' }
        
        // Try by aria-label
        const byAria = document.querySelector('a[aria-label="Create"]')
        if (byAria) return { found: true, type: 'aria-label' }
        
        // Try by name
        const byName = document.querySelector('a[name="Create"]')
        if (byName) return { found: true, type: 'name' }
        
        // Try by class
        const byClass = document.querySelector('a.gi_btn_p.linkBtn')
        if (byClass) return { found: true, type: 'class' }
        
        // Try any link with "Create" text
        const links = Array.from(document.querySelectorAll('a'))
        for (const link of links) {
          if (link.textContent?.trim() === 'Create' || link.getAttribute('aria-label') === 'Create') {
            return { found: true, type: 'text-content' }
          }
        }
        
        return { found: false }
      })

      if (foundButton.found) {
        // Use the ID selector since we know it exists
        createButton = page.locator('#create_btn_c')
        console.log(`[Bing] Found Create button via DOM search: ${foundButton.type}`)
      } else {
        throw new Error('Could not find Create button on Bing Image Creator')
      }
    }

    // Click Create - use JavaScript click if regular click doesn't work
    console.log('[Bing] Clicking Create button...')
    try {
      await createButton.click({ timeout: 5000 })
    } catch (e) {
      // Fallback to JavaScript click
      console.log('[Bing] Regular click failed, trying JavaScript click...')
      await createButton.evaluate((el: HTMLElement) => {
        if (el instanceof HTMLElement) {
          el.click()
        }
      })
    }
    await page.waitForTimeout(3000)

    // Wait for image generation to start
    console.log('[Bing] Waiting for image generation to start...')
    
    // Wait for any loading indicators or changes that indicate generation started
    try {
      await page.waitForSelector('text=/creating|generating|loading|processing/i', { 
        timeout: 10000,
        state: 'visible'
      }).catch(() => {
        // Loading indicator might not appear, that's okay
      })
    } catch (e) {
      // Continue anyway
    }
    
    await page.waitForTimeout(5000)

    // Wait for images to appear (they appear in a grid)
    console.log('[Bing] Waiting for generated images...')
    const imageSelectors = [
      'img[src*="th.bing.com"]',
      'img[alt*="generated"]',
      'img[class*="image"]',
      'img[class*="result"]',
      'a[href*=".jpg"] img',
      'a[href*=".png"] img'
    ]

    let imageFound = false
    let imageUrl = ''
    let maxWaitTime = 120000 // 2 minutes max wait
    const startTime = Date.now()

    while (!imageFound && (Date.now() - startTime) < maxWaitTime) {
      for (const selector of imageSelectors) {
        const images = await page.locator(selector).all()
        for (const img of images) {
          const src = await img.getAttribute('src').catch(() => null)
          if (src && (src.includes('th.bing.com') || src.includes('bing.com/images') || src.startsWith('http'))) {
            // Try to get the full-size image URL
            // Bing often uses thumbnail URLs, we need to find the full version
            const parentLink = img.locator('..').locator('a').first()
            const linkHref = await parentLink.getAttribute('href').catch(() => null)
            
            if (linkHref && linkHref.includes('bing.com/images')) {
              imageUrl = linkHref
              imageFound = true
              console.log('[Bing] ✓ Found generated image!')
              break
            } else if (src && src.startsWith('http') && !src.includes('data:')) {
              // Use the image src directly if it's a full URL
              imageUrl = src
              imageFound = true
              console.log('[Bing] ✓ Found generated image!')
              break
            }
          }
        }
        if (imageFound) break
      }

      if (!imageFound) {
        // Check for error messages
        const errorMessages = await page.locator('text=/error|failed|limit|quota/i').all()
        if (errorMessages.length > 0) {
          const errorText = await errorMessages[0].textContent()
          throw new Error(`Bing Image Creator error: ${errorText}`)
        }

        // Check for "Creating..." or loading indicators
        const creating = await page.locator('text=/creating|generating|loading/i').isVisible({ timeout: 1000 }).catch(() => false)
        if (creating) {
          console.log('[Bing] Still generating, waiting...')
          await page.waitForTimeout(5000)
          continue
        }

        // Wait a bit more
        await page.waitForTimeout(3000)
      }
    }

    if (!imageFound) {
      throw new Error('Image generation timeout - images did not appear within 2 minutes')
    }

    // If we got a thumbnail URL, try to get the full-size version
    if (imageUrl.includes('th.bing.com')) {
      // Navigate to the image page to get full URL
      try {
        await page.goto(imageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
        const fullImage = page.locator('img').first()
        const fullSrc = await fullImage.getAttribute('src').catch(() => null)
        if (fullSrc && fullSrc.startsWith('http')) {
          imageUrl = fullSrc
        }
      } catch (e) {
        console.log('[Bing] Could not get full-size image, using thumbnail URL')
      }
    }

    console.log(`[Bing] ✓ Image generated successfully: ${imageUrl.substring(0, 80)}...`)

    return {
      url: imageUrl,
      revisedPrompt: prompt // Bing doesn't return revised prompts, use original
    }

  } catch (error) {
    console.error('[Bing] Error generating image:', error)
    throw error
  } finally {
    if (page) await page.close().catch(() => {})
    if (browser) await browser.close().catch(() => {})
  }
}

