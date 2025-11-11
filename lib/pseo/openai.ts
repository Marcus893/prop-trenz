import type { GuideArticle, GenerateGuideParams, GuideSection, GuideFAQItem } from './types'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = process.env.OPENAI_PSEO_MODEL || 'gpt-4o-mini'

interface OpenAIDelta {
  choices: Array<{
    message?: {
      role: string
      content: string
    }
    delta?: {
      content?: string
    }
  }>
}

function buildPrompt(params: GenerateGuideParams): string {
  const dataPoints = params.dataPoints
    ?.map((item) => `${item.label}: ${item.value}`)
    .join('\n')

  return `You are an expert editorial researcher writing authoritative guides about Mexican real estate.
Speak strictly in third-person. Avoid using "you" or "we". Reference Mexican regulations, SAT rules, and notary practices when relevant.

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

Note: Include "mainImagePrompt" describing a professional header image for the article. For sections that would benefit from visual content (tax explanations, processes, checklists), include an "imagePrompt" field describing an educational infographic-style illustration.

SEO Requirements:
- Meta title: 50-60 characters, include primary keyword naturally at the beginning.
- Meta description: 150-160 characters, compelling summary with primary keyword, include a call-to-action.
- Title: Clear, keyword-rich, 8-12 words maximum.
- Excerpt: 2-3 sentences summarizing the guide's value proposition.

Content Requirements:
- Minimum 5 sections with descriptive H2 headings that include target keywords naturally.
- Each paragraph: 2-4 sentences, purely third-person, 15-20 words per sentence for readability.
- Keyword density: Naturally incorporate primary keywords 2-3 times per section without stuffing.
- Include concrete numbers (tax rates, timelines, fees) and cite Mexican authorities narratively (e.g., "SAT guidance indicates...").
- Use semantic structure: headings should logically flow (H2 for main sections, H3 for subsections if needed).
- Add at least 3 FAQ items targeting long-tail search queries and "People Also Ask" intent.
- If data is missing, instruct readers to consult the relevant authority rather than invent details.
- Ensure content is comprehensive (aim for 1500-2500 words total) to establish topical authority.
- Links: When mentioning websites, services, or external resources, include markdown-style links using the format [text](url). For example: "Websites like [Inmuebles24](https://www.inmuebles24.com) offer extensive listings." Always use the full URL with https:// protocol.`
}

interface GuideDraft {
  title: string
  metaTitle: string
  metaDescription: string
  excerpt: string
  heroKicker: string
  mainImagePrompt?: string
  sections: Array<{
    heading: string
    paragraphs: string[]
    bullets?: string[]
    dataPoints?: Array<{ label: string; value: string }>
    imagePrompt?: string
  }>
  faq?: GuideFAQItem[]
}

export async function generateGuideDraft(params: GenerateGuideParams): Promise<GuideDraft> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const prompt = buildPrompt(params)

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.35,
      messages: [
        { role: 'system', content: 'You are a meticulous real estate analyst producing pSEO articles.' },
        { role: 'user', content: prompt }
      ]
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`)
  }

  const json = (await response.json()) as OpenAIDelta
  let content = json.choices?.[0]?.message?.content || json.choices?.[0]?.delta?.content
  if (!content) {
    throw new Error('OpenAI returned an empty response')
  }

  // Extract JSON from markdown code blocks if present
  content = content.trim()
  
  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    content = jsonBlockMatch[1].trim()
  }
  
  // Also handle cases where JSON might be wrapped in other markdown
  // Remove any leading/trailing markdown formatting
  content = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()

  try {
    const parsed = JSON.parse(content)
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
      sections,
      faq
    }
  } catch (error) {
    console.error('[pSEO] Failed to parse OpenAI response', error)
    console.error('[pSEO] Raw content received:', content.substring(0, 500))
    throw new Error(`OpenAI response was not valid JSON: ${error instanceof Error ? error.message : String(error)}. Raw content preview logged above.`)
  }
}
