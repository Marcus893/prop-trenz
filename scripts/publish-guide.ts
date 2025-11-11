// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local first, then fallback to .env
const rootDir = process.cwd()
config({ path: resolve(rootDir, '.env.local') })
config({ path: resolve(rootDir, '.env') })

import { loadGuide } from '../lib/pseo/storage'
import { saveGuideDraft } from '../lib/pseo/storage'
import { autoTranslateOnPublish } from '../lib/pseo/autoTranslate'

function parseArg(key: string, fallback?: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`--${key}=`))
  if (!match) {
    return fallback
  }
  return match.split('=').slice(1).join('=')
}

async function main() {
  const slug = parseArg('slug')

  if (!slug) {
    console.error('Usage: pnpm ts-node scripts/publish-guide.ts --slug=mexico-property-buying-basics')
    process.exit(1)
  }

  console.log(`[pSEO] Publishing guide "${slug}"...`)

  const guide = await loadGuide(slug)
  if (!guide) {
    console.error(`[pSEO] Guide not found: ${slug}`)
    process.exit(1)
  }

  if (guide.status === 'published') {
    console.log(`[pSEO] Guide "${slug}" is already published`)
    // Still trigger translation check in case translations are missing
    await autoTranslateOnPublish(guide)
    return
  }

  // Update status to published
  const publishedGuide = {
    ...guide,
    status: 'published' as const,
    updatedAt: new Date().toISOString()
  }

  await saveGuideDraft(publishedGuide)
  console.log(`[pSEO] Guide "${slug}" published successfully`)

  // Auto-generate translations
  await autoTranslateOnPublish(publishedGuide)
}

main().catch((error) => {
  console.error('[pSEO] Publishing failed', error)
  process.exit(1)
})

