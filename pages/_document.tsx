import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Favicon - using the logo icon */}
        <link rel="icon" type="image/svg+xml" href="/logo-icon.svg" />
        <link rel="alternate icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* SEO Meta Tags */}
        <meta name="description" content="Explore 20+ years of Mexican real estate price trends with interactive charts and geographic navigation. Perfect for investors, agents, and market analysts." />
        <meta name="keywords" content="mexican real estate, property prices, real estate trends, mexico property data, real estate analytics, mexico city property, monterrey real estate" />
        <meta name="author" content="PropTrenz" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://proptrenz.com" />
        <meta property="og:title" content="PropTrenz - Mexican Real Estate Price Trends" />
        <meta property="og:description" content="Explore 20+ years of Mexican real estate price data with interactive charts and geographic navigation. 32 states, 100+ cities covered." />
        <meta property="og:image" content="https://proptrenz.com/og-image.png" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://proptrenz.com" />
        <meta name="twitter:title" content="PropTrenz - Mexican Real Estate Price Trends" />
        <meta name="twitter:description" content="Explore 20+ years of Mexican real estate price data with interactive charts and geographic navigation." />
        <meta name="twitter:image" content="https://proptrenz.com/og-image.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

