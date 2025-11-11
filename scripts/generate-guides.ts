// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local first, then fallback to .env
const rootDir = process.cwd()
config({ path: resolve(rootDir, '.env.local') })
config({ path: resolve(rootDir, '.env') })

import { generateGuide } from '../lib/pseo/generateGuide'
import type { GuideAccessLevel } from '../lib/pseo/types'

function parseArg(key: string, fallback?: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`--${key}=`))
  if (!match) {
    return fallback
  }
  return match.split('=').slice(1).join('=')
}

async function main() {
  const slug = parseArg('slug')
  const topic = parseArg('topic')
  const locale = parseArg('locale', 'en') || 'en' // Ensure locale is always a string
  const keywords = parseArg('keywords', '')
  const accessLevel = (parseArg('access', 'public') || 'public') as GuideAccessLevel
  const skipImages = parseArg('skip-images') === 'true'

  if (!slug || !topic) {
    console.error('Usage: npm run generate-guide -- --slug=playa-del-carmen-buying-guide --topic="Buying property in Playa del Carmen" --keywords="Playa del Carmen real estate, Quintana Roo ISAI" --locale=en --access=public [--skip-images=true]')
    process.exit(1)
  }

  if (skipImages) {
    console.log('[pSEO] Image generation will be skipped')
  }

  console.log(`[pSEO] Generating guide for slug "${slug}" using topic "${topic}"`)

  const article = await generateGuide({
    slug,
    topic,
    locale,
    keywords: keywords ? keywords.split(',').map((word) => word.trim()).filter(Boolean) : [topic],
    accessLevel,
    skipImages
  })

  console.log('[pSEO] Draft saved at content/guides/' + `${article.slug}.json`)
}

main().catch((error) => {
  console.error('[pSEO] Generation failed', error)
  process.exit(1)
})
