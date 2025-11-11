import React from 'react'

/**
 * Parses markdown-style links [text](url) in a string and converts them to React components
 * @param text - The text that may contain markdown links
 * @returns An array of React nodes (strings and anchor elements)
 */
export function parseLinks(text: string): React.ReactNode[] {
  // Regex to match markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }

    // Add the link
    const linkText = match[1]
    const linkUrl = match[2]
    
    // Ensure URL has protocol
    const url = linkUrl.startsWith('http://') || linkUrl.startsWith('https://')
      ? linkUrl
      : `https://${linkUrl}`

    parts.push(
      <a
        key={`link-${match.index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-blue-600 underline hover:text-blue-700 transition-colors"
      >
        {linkText}
      </a>
    )

    lastIndex = match.index + match[0].length
  }

  // Add remaining text after the last link
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  // If no links were found, return the original text
  return parts.length > 0 ? parts : [text]
}

