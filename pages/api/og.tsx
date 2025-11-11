import { GetServerSideProps } from 'next'

// Simple OG image generator - can be enhanced with @vercel/og later
export default function OGImage() {
  return null
}

export const getServerSideProps: GetServerSideProps = async ({ query, res }) => {
  const title = (query.title as string) || 'PropTrenz Guide'

  // For now, return a simple SVG. Can be enhanced with @vercel/og for better images
  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#1e40af"/>
      <text x="600" y="315" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle" font-weight="bold">
        ${title.length > 50 ? title.substring(0, 47) + '...' : title}
      </text>
      <text x="600" y="380" font-family="Arial, sans-serif" font-size="24" fill="#93c5fd" text-anchor="middle">
        PropTrenz
      </text>
    </svg>
  `

  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Cache-Control', 'public, s-maxage=31536000, stale-while-revalidate')
  res.write(svg)
  res.end()

  return {
    props: {}
  }
}

