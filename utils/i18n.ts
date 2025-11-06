/**
 * Utility function to get a valid locale for server-side translations
 * This ensures we always have a valid locale even when Next.js doesn't provide one
 */
export function getValidLocale(
  locale: string | undefined,
  defaultLocale: string | undefined,
  fallback: string = 'en'
): string {
  if (locale && typeof locale === 'string' && locale.length > 0) {
    return locale
  }
  
  if (defaultLocale && typeof defaultLocale === 'string' && defaultLocale.length > 0) {
    return defaultLocale
  }
  
  return fallback
}

