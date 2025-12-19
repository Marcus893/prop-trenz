import React from 'react'
import { parseDataReferences, getDataReferenceUrl, getDataReferenceLabel } from './dataReferences'
import { DataReferenceLink } from '@/components/guides/DataReferenceLink'
import type { DataReference } from './dataReferences'

/**
 * Parse text and replace data references with interactive components
 * Similar to parseLinks but for data references
 */
export function parseDataReferencesInText(text: string): React.ReactNode[] {
  const references = parseDataReferences(text)
  
  if (references.length === 0) {
    return [text]
  }
  
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  
  references.forEach((ref, index) => {
    // Add text before the reference
    if (ref.startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, ref.startIndex))
    }
    
    // Add the data reference component
    parts.push(
      <DataReferenceLink
        key={`data-ref-${index}`}
        reference={ref.reference}
      />
    )
    
    lastIndex = ref.endIndex
  })
  
  // Add remaining text after the last reference
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }
  
  return parts.length > 0 ? parts : [text]
}

/**
 * Enhanced parser that handles both markdown links and data references
 */
export function parseTextWithReferences(text: string): React.ReactNode[] {
  // First, find all data references and markdown links
  const dataRefs = parseDataReferences(text)
  
  // Simple markdown link regex
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  const links: Array<{ match: string; text: string; url: string; startIndex: number; endIndex: number }> = []
  let match
  
  while ((match = linkRegex.exec(text)) !== null) {
    links.push({
      match: match[0],
      text: match[1],
      url: match[2],
      startIndex: match.index!,
      endIndex: match.index! + match[0].length
    })
  }
  
  // Combine and sort all matches by position
  const allMatches = [
    ...dataRefs.map(ref => ({ ...ref, isDataRef: true })),
    ...links.map(link => ({ ...link, isDataRef: false }))
  ].sort((a, b) => a.startIndex - b.startIndex)
  
  if (allMatches.length === 0) {
    // No links or data refs, but still parse markdown formatting
    return parseMarkdownFormatting(text, 0)
  }
  
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  
  allMatches.forEach((match, index) => {
    // Add text before the match
    if (match.startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, match.startIndex))
    }
    
    // Add the appropriate component
    if (match.isDataRef) {
      // TypeScript narrowing: when isDataRef is true, match has reference property
      const dataRef = match as { isDataRef: true; match: string; reference: DataReference; startIndex: number; endIndex: number }
      parts.push(
        <DataReferenceLink
          key={`data-ref-${index}`}
          reference={dataRef.reference}
        />
      )
    } else {
      // TypeScript narrowing: when isDataRef is false, match has url and text properties
      const link = match as { isDataRef: false; match: string; text: string; url: string; startIndex: number; endIndex: number }
      const url = link.url.startsWith('http://') || link.url.startsWith('https://')
        ? link.url
        : `https://${link.url}`
      
      parts.push(
        <a
          key={`link-${index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 underline hover:text-blue-700 transition-colors"
        >
          {link.text}
        </a>
      )
    }
    
    lastIndex = match.endIndex
  })
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }
  
  // Now parse markdown formatting (bold and italic) in text parts
  const formattedParts = parts.map((part, partIndex) => {
    if (typeof part !== 'string') {
      return part
    }
    return parseMarkdownFormatting(part, partIndex)
  })
  
  return formattedParts.length > 0 ? formattedParts.flat() : [text]
}

/**
 * Parse markdown bold (**text**) and italic (*text*) formatting
 */
function parseMarkdownFormatting(text: string, keyPrefix: number | string = 0): React.ReactNode[] {
  // Use a single regex that captures bold (**text**) first, then italic (*text*)
  // Bold: **content** - must come first
  // Italic: *content* - single asterisks
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)/g
  
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match
  let matchIndex = 0
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }
    
    if (match[1]) {
      // Bold match (**text**)
      parts.push(
        <strong key={`${keyPrefix}-bold-${matchIndex}`} className="font-bold">
          {match[2]}
        </strong>
      )
    } else if (match[3]) {
      // Italic match (*text*)
      parts.push(
        <em key={`${keyPrefix}-italic-${matchIndex}`} className="italic">
          {match[4]}
        </em>
      )
    }
    
    lastIndex = match.index + match[0].length
    matchIndex++
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }
  
  return parts.length > 0 ? parts : [text]
}


