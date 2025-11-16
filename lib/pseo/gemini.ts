import { GoogleGenerativeAI } from '@google/generative-ai'
import type { GenerateGuideParams, GuideSection, GuideFAQItem } from './types'

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

function buildPrompt(params: GenerateGuideParams): string {
  const dataPoints = params.dataPoints
    ?.map((item) => `${item.label}: ${item.value}`)
    .join('\n')

  return `You are a real estate professional in Mexico writing from your actual experience. This is NOT an AI article - you're a real person sharing real knowledge. Write like you're talking to a friend who asked for your help. Use "I" constantly. Use "you" constantly. Be conversational. Be real. Be human.

Topic: ${params.topic}
Locale: ${params.locale}
Primary keywords: ${params.keywords.join(', ')}

Structured data provided:
${dataPoints || 'None'}

CRITICAL: Output ONLY valid JSON. Do not wrap the response in markdown code blocks, do not add any explanation text, and do not use triple backticks. Return pure JSON that can be parsed directly.

Output a JSON object with this exact schema:
{
  "title": string,
  "metaTitle": string,
  "metaDescription": string,
  "excerpt": string,
  "heroKicker": string,
  "mainImagePrompt": string,
  "tags": string[],
  "sections": [
    {
      "heading": string,
      "paragraphs": string[],
      "bullets": string[]?,
      "dataPoints": [{"label": string, "value": string}]?,
      "imagePrompt": string?
    }
  ],
  "faq": [{"question": string, "answer": string}]?
}

Note: 
- Include "mainImagePrompt" describing a professional header image for the article. For sections that would benefit from visual content (tax explanations, processes, checklists), include an "imagePrompt" field describing an educational infographic-style illustration.
- Include "tags" array with 2-4 specific, relevant tags based on the actual content. Tags should be:
  * Specific to the topic
  * Use kebab-case (lowercase with hyphens)
  * Reflect the main themes and subtopics covered in the guide
  * Avoid generic tags like "mexico-real-estate" or "market-intelligence" unless they're truly central to the content
  * Examples for different topics:
    - Rental guide: ["rental-market", "tenant-rights", "property-search", "rental-agreements"]
    - Buying guide: ["buying", "closing-costs", "notary", "isai-tax"]
    - Tax guide: ["capital-gains", "isr-tax", "tax-planning"]

SEO Requirements:
- Meta title: 50-60 characters, include primary keyword naturally at the beginning.
- Meta description: 150-160 characters, compelling summary with primary keyword, include a call-to-action.
- Title: Clear, keyword-rich, 8-12 words maximum.
- Excerpt: 1 sentence maximum (15-20 words) - a concise, compelling hook that summarizes the guide's value. Keep it short and punchy.

CRITICAL CONTENT QUALITY REQUIREMENTS:

1. WORD COUNT & DEPTH:
   - Minimum 2,000 words total (aim for 2,500-3,500 words for comprehensive coverage)
   - Each section must be substantial (300-500 words minimum per section)
   - No surface-level content - dive deep into each topic
   - Provide actionable, specific information that readers cannot easily find elsewhere

2. SECTION STRUCTURE:
   - Minimum 7-10 sections (not 5) with descriptive H2 headings that include target keywords naturally
   - Each section must cover a distinct aspect of the topic in depth
   - Sections should build upon each other logically (introduction → background → processes → considerations → advanced topics → conclusion)
   - Include sections on: context/background, step-by-step processes, common challenges, best practices, regional variations, legal/regulatory aspects, financial considerations, and actionable next steps

3. PARAGRAPH QUALITY & FORMATTING:
   - Each paragraph: 1-3 sentences maximum - keep it short and punchy
   - Vary sentence length EXTREMELY: mix very short (3-8 words) with medium (12-18 words) and occasional longer (20-25 words)
   - Break up long sections with shorter paragraphs (1-2 sentences each) for better visual flow
   - Each paragraph must provide unique value - no filler or repetition
   - Include specific examples, case studies, real-world scenarios, personal anecdotes, and concrete data
   - Reference specific Mexican regulations, SAT rules, state laws, and notary practices with context
   - Include regional variations (e.g., "In Mexico City, the process differs from coastal areas...")
   - Use white space effectively - don't create walls of text. Mix paragraph lengths for visual variety
   - Start paragraphs with varied openings: "Here's what I've learned...", "The thing is...", "Now, if you're...", "What most people don't realize..."

4. HUMANIZATION & WRITING STYLE (CRITICAL - THIS MUST SOUND 100% HUMAN):
   - Write in FIRST PERSON constantly: "I've seen...", "In my experience...", "What I've learned...", "From what I've observed...", "I always tell clients...", "I've noticed...", "Here's what I know..."
   - Use active voice almost exclusively - passive voice sounds robotic
   - Vary sentence structure EXTREMELY - mix very short (3-8 words) with medium (12-18 words) and occasional longer (20-25 words)
   - Start sentences with varied, conversational openings: "But here's the thing...", "Now, when it comes to...", "That said...", "Here's where it gets interesting...", "The reality is...", "Look, here's what happens...", "So here's the deal...", "What I mean is...", "Here's the kicker..."
   - Use contractions CONSTANTLY: don't, isn't, can't, it's, you'll, they're, we've, I've, that's, here's, there's - aim for 5-8 per paragraph
   - Break up long sentences - humans don't write 30-word sentences. Keep most under 18 words
   - Use "you" constantly to connect: "You'll find...", "If you're looking...", "What you need to know...", "You might be wondering...", "Here's what you should do...", "You're probably thinking..."
   - Include personal observations and real-world examples: "I've noticed that...", "One thing I always tell clients...", "In practice, what happens is...", "I've seen this happen dozens of times...", "Most people I work with..."
   - Vary vocabulary aggressively - never use the same word twice in a paragraph. Use synonyms, different phrasings, alternate expressions
   - Use conversational transitions: "But wait...", "Here's the kicker...", "Now, here's where things get tricky...", "That said...", "On the flip side...", "Here's the thing though...", "But here's what's interesting...", "Now, I know what you're thinking..."
   - Be direct and conversational - cut corporate speak. Say "It's expensive" not "It represents a significant financial investment". Say "You'll pay around 15,000 pesos" not "The approximate cost is 15,000 pesos"
   - Use idioms and casual expressions naturally: "It's worth doing your homework", "The market can be a jungle", "Don't put all your eggs in one basket", "At the end of the day", "It's a no-brainer", "That's where things get dicey"
   - Include rhetorical questions frequently: "But what does this mean for you?", "So how do you navigate this?", "Why does this matter?", "What's the catch?", "Here's the question:"
   - Add occasional asides and parenthetical thoughts: "(This is where most people get tripped up)", "(I can't stress this enough)", "(Trust me on this one)", "(And I'm not kidding)", "(Seriously, this matters)"
   - Use numbers and specifics naturally: "About 70% of renters I've worked with...", "Roughly 3 out of 5 properties...", "I'd say around 15,000 pesos...", "Maybe 20% of the time..."
   - Include imperfect, natural phrasing - don't make every sentence perfect. Humans write with slight variations, occasional redundancy, and natural flow
   - Write like you're talking to someone over coffee, not like you're writing a corporate manual
   - Use casual connectors: "So...", "Look...", "Now...", "Here's the thing...", "But...", "And..."
   - Include occasional incomplete thoughts or trailing off: "But that's a whole other story...", "You get the idea...", "And so on..."

5. BULLET POINTS (CRITICAL - NO REPETITION):
   - Bullet points must ADD NEW INFORMATION not covered in the paragraphs
   - Do NOT repeat information from paragraphs in bullet points
   - Use bullets for: quick reference checklists, specific tips, common mistakes to avoid, regional differences, step-by-step summaries, or additional resources
   - Each bullet should be 1-2 sentences with actionable, specific information
   - If a section has 3 paragraphs, include 5-7 unique bullets that expand on the topic

6. CONTENT DEPTH REQUIREMENTS:
   - Include specific numbers: exact tax rates, fee ranges, timelines, percentages, currency amounts
   - Cite Mexican authorities narratively (e.g., "According to SAT Circular 123, landlords must...", "The Mexican Civil Code Article 2345 specifies...")
   - Provide step-by-step processes where applicable (e.g., "Step 1: Research local market rates. Step 2: Prepare required documentation...")
   - Include regional variations and exceptions (e.g., "In Quintana Roo, additional permits may be required...")
   - Address common mistakes, pitfalls, and how to avoid them
   - Include comparisons where relevant (e.g., "Unlike in the United States, Mexican rental agreements typically...")
   - Provide context and background that helps readers understand the "why" behind processes

7. FAQ SECTION:
   - Minimum 5-7 FAQ items (not 3) targeting long-tail search queries and "People Also Ask" intent
   - Each FAQ answer must be comprehensive (3-5 sentences minimum)
   - Address common concerns, edge cases, and follow-up questions readers might have
   - Include specific examples and actionable advice in answers

8. KEYWORD INTEGRATION:
   - Naturally incorporate primary keywords 3-5 times per section without stuffing
   - Use semantic variations and related terms throughout
   - Include long-tail keyword phrases naturally in headings and content

9. EXTERNAL LINKS:
   - When mentioning websites, services, or external resources, include markdown-style links using the format [text](url)
   - Always use the full URL with https:// protocol
   - Link to relevant government sites, official resources, and reputable platforms

10. AVOID:
   - Repetitive information between paragraphs and bullets
   - Vague statements without specifics
   - Generic advice that could apply to any country
   - Surface-level explanations
   - Filler content or fluff

11. QUALITY CHECK:
    - Before finalizing, ensure each section provides unique, valuable information
    - Verify that bullets add new information not in paragraphs
    - Confirm the guide would genuinely help someone navigate the topic comprehensively
    - Ensure the content demonstrates expertise and builds authority

CRITICAL REMINDER: This is NOT an AI article. This is a real expert sharing real knowledge. Write it like you're having a conversation with a friend who asked for your advice. Use "I" and "you" liberally. Include your actual thoughts and observations. Make it sound like a human wrote it after living through these experiences, not like an AI compiled information. If an AI detector reads this, it should think a real person wrote it. Be conversational, be real, be human.`
}

interface GuideDraft {
  title: string
  metaTitle: string
  metaDescription: string
  excerpt: string
  heroKicker: string
  mainImagePrompt?: string
  tags?: string[]
  sections: Array<{
    heading: string
    paragraphs: string[]
    bullets?: string[]
    dataPoints?: Array<{ label: string; value: string }>
    imagePrompt?: string
  }>
  faq?: GuideFAQItem[]
}

/**
 * Clean and parse JSON response from Gemini, handling common formatting issues
 */
function cleanAndParseJSON(content: string): any {
  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  let cleaned = content.trim()
  
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    cleaned = jsonBlockMatch[1].trim()
  }
  
  // Remove any leading/trailing markdown formatting
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
  
  // Handle control characters that might break JSON parsing
  // Escape control characters within string values
  let jsonText = ''
  let inString = false
  let escapeNext = false
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i]
    
    if (escapeNext) {
      jsonText += char
      escapeNext = false
      continue
    }
    
    if (char === '\\') {
      jsonText += char
      escapeNext = true
      continue
    }
    
    if (char === '"') {
      inString = !inString
      jsonText += char
      continue
    }
    
    if (inString) {
      // Within a string, escape control characters
      if (char === '\n') {
        jsonText += '\\n'
      } else if (char === '\r') {
        jsonText += '\\r'
      } else if (char === '\t') {
        jsonText += '\\t'
      } else if (char.charCodeAt(0) < 32 && char !== ' ') {
        // Skip other control characters
        continue
      } else {
        jsonText += char
      }
    } else {
      jsonText += char
    }
  }
  
  return JSON.parse(jsonText)
}

export async function generateGuideDraft(params: GenerateGuideParams): Promise<GuideDraft> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ 
    model: MODEL,
    generationConfig: {
      temperature: 0.8, // High temperature for maximum creativity and human-like variation
      topP: 0.95,
      topK: 40,
    }
  })

  const systemInstruction = 'You are a real estate professional in Mexico with 15+ years of hands-on experience. You write guides based on your actual experience, not as an AI generating content. Write in first person, use contractions, vary sentence structure dramatically, include personal observations, and write conversationally as if explaining to a friend. The goal is to sound 100% human - like a real person sharing real knowledge, not an AI article.'

  const prompt = buildPrompt(params)
  const fullPrompt = `${systemInstruction}\n\n${prompt}`

  try {
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    let content = response.text()

    if (!content) {
      throw new Error('Gemini returned an empty response')
    }

    // Clean and parse JSON
    const parsed = cleanAndParseJSON(content)
    
    const sections: GuideSection[] = (parsed.sections || []).map((section: any) => ({
      heading: section.heading,
      paragraphs: section.paragraphs || [],
      bullets: section.bullets,
      dataPoints: section.dataPoints,
      // imagePrompt will be used later to generate images
      imagePrompt: section.imagePrompt
    }))
    const faq: GuideFAQItem[] | undefined = parsed.faq

    return {
      title: parsed.title,
      metaTitle: parsed.metaTitle || parsed.title,
      metaDescription: parsed.metaDescription,
      excerpt: parsed.excerpt,
      heroKicker: parsed.heroKicker,
      mainImagePrompt: parsed.mainImagePrompt,
      tags: parsed.tags || [], // AI-generated tags based on content
      sections,
      faq
    }
  } catch (error) {
    console.error('[pSEO] Failed to parse Gemini response', error)
    if (error instanceof Error && error.message.includes('JSON')) {
      // Try to log the raw content for debugging
      try {
        const result = await model.generateContent(fullPrompt)
        const response = await result.response
        const rawContent = response.text()
        console.error('[pSEO] Raw content received:', rawContent?.substring(0, 500))
      } catch (logError) {
        // Ignore logging errors
      }
    }
    throw new Error(`Gemini response was not valid JSON: ${error instanceof Error ? error.message : String(error)}. Raw content preview logged above.`)
  }
}

