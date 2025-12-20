import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerateGuideParams, GuideSection, GuideFAQItem } from "./types";

const MODEL = process.env.GEMINI_MODEL || "gemini-3-pro-preview";

function buildPrompt(params: GenerateGuideParams): string {
  const dataPoints = params.dataPoints
    ?.map((item) => `${item.label}: ${item.value}`)
    .join("\n");

  return `You are a real estate professional in Mexico writing from your actual experience. This is NOT an AI article - you're a real person sharing real knowledge. Write like you're talking to a friend who asked for your help. Use "I" and use "you". Be conversational.

Topic: ${params.topic}
Locale: ${params.locale}
Primary keywords: ${params.keywords.join(", ")}

Structured data provided:
${dataPoints || "None"}

**CRITICAL DATA REFERENCE REQUIREMENT:**
If this guide mentions specific neighborhoods, municipalities, or cities (like "hottest neighborhoods", "best areas", etc.), you MUST include data references for locations mentioned. For example, if you mention "Polanco", you must include {{data:neighborhood:Polanco:Miguel Hidalgo:Ciudad de México:View Polanco prices}} in that same paragraph. This is MANDATORY.

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
- Include "mainImagePrompt" describing a professional header image for the article. For sections that would benefit from visual content, include an "imagePrompt" field describing an educational infographic-style illustration.
- Include "tags" array with 2-4 specific, relevant tags based on the actual content. Tags should be:
  * Specific to the topic
  * Use kebab-case (lowercase with hyphens)
  * Reflect the main themes and subtopics covered in the guide
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
   - Provide actionable, specific information that readers can't easily find elsewhere
   - NO OVERLAPPING CONTENT AMONG SECTIONS

2. SECTION STRUCTURE:
   - Minimum 6-9 sections with descriptive H2 headings that include target keywords naturally
   - Each section must cover a distinct aspect of the topic in depth
   - Sections should build upon each other logically (introduction → background → processes → considerations → advanced topics → conclusion)
   - Include sections on: context/background, step-by-step processes, common challenges, best practices, variations, legal/regulatory aspects, financial considerations, and actionable next steps

3. PARAGRAPH QUALITY & FORMATTING:
   - Each paragraph: 1-3 sentences maximum - keep it short and punchy
   - Vary sentence length EXTREMELY: mix very short (3-8 words) with medium (12-18 words) and occasional longer (20-25 words)
   - Break up long sections with shorter paragraphs (1-2 sentences each) for better visual flow
   - Each paragraph must provide unique value - NO FILLER OR REPETITION
   - Include specific examples, case studies, real-world scenarios, personal anecdotes, and concrete data
   - Reference specific Mexican regulations, SAT rules, state laws, notary practices, etc. with context
   - Use white space effectively - don't create walls of text. Mix paragraph lengths for visual variety
   - Start paragraphs with varied openings: "Here's what I've learned...", "The thing is...", "Now, if you're...", "What most people don't realize..."

4. HUMANIZATION & ANTI-AI SLOP:
   - Say what you mean directly. use specific details instead of broad contrasts.
   - Vary your rhythm. sometimes use two things. sometimes four. sometimes just one damn thing.
   - If you wouldn't say it in real conversation, don't write it.
   - Use simple, active verbs. "show" not "highlighting." "help" not "facilitating.".
   - State your opinion. Skip the diplomatic warm-up.
   - Break up long sentences - humans don't write 30-word sentences. Keep most under 18 words.
   - Use "you" to connect: "You'll find...", "If you're looking...", "What you need to know...", "You might be wondering...", "Here's what you should do..."
   - Include personal observations and real-world examples modestly: "In practice, what happens is...", "I've seen this happen dozens of times...", "Most people I work with..."
   - Vary vocabulary aggressively - never use the same word twice in a paragraph. Use synonyms, different phrasings, alternate expressions.
   - Be direct and conversational - cut corporate speak. Say "It's expensive" not "It represents a significant financial investment". Say "You'll pay around 15,000 pesos" not "The approximate cost is 15,000 pesos"
   - Include imperfect, natural phrasing - don't make every sentence perfect. Humans write with slight variations, occasional redundancy, and natural flow
   - Stop using fancy words: "utilize" → use, "execute" → do, "facilitate" → help, "implement" → start, "optimize" → improve, "leverage" → use. Write like you talk, you get the idea.
   - Ask real questions that require thought to answer, avoid short hook questions.


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

9. DATA REFERENCES (MANDATORY - THIS IS NON-NEGOTIABLE):
   - **EVERY TIME** you mention a neighborhood, municipality, or city by name, you MUST include a data reference
   - **NO EXCEPTIONS** - if you write "Polanco", "Roma", "Condesa", etc., you MUST add a data reference in the SAME paragraph
   - Format: {{data:type:location:label}} or {{data:type:municipality:city:label}}
   - IMPORTANT: Data references are plain text strings - include them exactly as shown in your JSON string values
   
   - **Examples of CORRECT usage for PURCHASE PRICES (link to purchase price map):**
     * "Polanco is expensive. {{data:neighborhood:Polanco:Miguel Hidalgo:Ciudad de México:View Polanco prices}} to see current listings."
     * "Roma Norte and Roma Sur are trendy. {{data:neighborhood:Roma Norte:Cuauhtémoc:Ciudad de México:Explore Roma Norte}} and {{data:neighborhood:Roma Sur:Cuauhtémoc:Ciudad de México:Explore Roma Sur}} are both worth checking out."
     * "Condesa has great parks. {{data:chart:neighborhood:Condesa:Cuauhtémoc:Ciudad de México:View Condesa price trends}} to see how prices have changed."
     * "For Mexico City overall, {{data:city:Ciudad de México:Explore Mexico City map}} shows all neighborhoods."
     * "Juárez is up-and-coming. {{data:neighborhood:Juárez:Cuauhtémoc:Ciudad de México:View Juárez prices}} to explore the area."
     * "Coyoacán is historic. {{data:municipality:Coyoacán:Ciudad de México:Explore Coyoacán}} for more details."
   
   - **Examples of CORRECT usage for RENTAL PRICES (link to rental price map):**
     * "Rent in Polanco averages $35,000 MXN/month. {{data:rent-neighborhood:Polanco:Miguel Hidalgo:Ciudad de México:View Polanco rent prices}} for current rates."
     * "Roma Norte has affordable rentals. {{data:rent-neighborhood:Roma Norte:Cuauhtémoc:Ciudad de México:Explore Roma Norte rent prices}} for more details."
     * "Rental prices in Condesa are higher. {{data:rent-municipality:Cuauhtémoc:Ciudad de México:View Cuauhtémoc rental market}} to compare neighborhoods."
     * "To see all rental prices in Mexico City, {{data:rent-city:Ciudad de México:Explore CDMX rental map}}."
   
   - **MANDATORY RULES:**
     * Include at least ONE data reference per paragraph that mentions a location
     * Use chart references when discussing purchase price trends or market analysis
     * Use neighborhood references for specific areas (purchase data)
     * Use rent-neighborhood references when mentioning rental prices for specific neighborhoods
     * Use rent-city or rent-municipality for broader rental market discussions
     * Use municipality references for broader areas (purchase data)
     * **If you mention a neighborhood in a heading, include a data reference in the first paragraph of that section**
     * **When discussing rental costs/rent prices, ALWAYS use rent- prefix data references (rent-neighborhood, rent-municipality, rent-city)**
   
   - CRITICAL: When including data references in JSON strings, they are part of the string value - do not try to escape the curly braces, just include them as regular text within the string
   - **QUALITY CHECK:** Before finalizing, count how many neighborhoods you mentioned. Every single one MUST have at least one data reference. If you mentioned 10 neighborhoods but only have 2 data references, you've failed this requirement. Go back and add data references for EVERY neighborhood you mentioned.

10. EXTERNAL LINKS:
   - When mentioning websites, services, or external resources, include markdown-style links using the format [text](url)
   - Always use the full URL with https:// protocol
   - Link to relevant government sites, official resources, and reputable platforms

11. AVOID:
   - Repetitive information between paragraphs and bullets
   - Vague statements without specifics
   - Generic advice that could apply to any country
   - Surface-level explanations
   - Filler content or fluff

12. QUALITY CHECK:
    - Before finalizing, ensure each section provides unique, valuable information
    - Verify that bullets add new information not in paragraphs
    - Confirm the guide would genuinely help someone navigate the topic comprehensively
    - Ensure the content demonstrates expertise and builds authority
    - **MANDATORY DATA REFERENCE CHECK:** Count every neighborhood, municipality, and city you mentioned. Every single one MUST have at least one data reference. If you mentioned "Polanco", "Roma", "Condesa", "Juárez", "Coyoacán", etc., each must have a data reference. This is not optional - guides without proper data references will be rejected.

CRITICAL REMINDER: This is NOT an AI article. This is a real expert sharing real knowledge. Write it like you're having a conversation with a friend who asked for your advice. Use "I" and "you" liberally. Include your actual thoughts and observations. Make it sound like a human wrote it after living through these experiences, not like an AI compiled information. If an AI detector reads this, it should think a real person wrote it.`;
}

interface GuideDraft {
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  heroKicker: string;
  mainImagePrompt?: string;
  tags?: string[];
  sections: Array<{
    heading: string;
    paragraphs: string[];
    bullets?: string[];
    dataPoints?: Array<{ label: string; value: string }>;
    imagePrompt?: string;
  }>;
  faq?: GuideFAQItem[];
}

/**
 * Clean and parse JSON response from Gemini, handling common formatting issues
 */
function cleanAndParseJSON(content: string): any {
  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  let cleaned = content.trim();

  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    cleaned = jsonBlockMatch[1].trim();
  }

  // Remove any leading/trailing markdown formatting
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Try to find the JSON object boundaries if there's extra text
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  // Handle control characters and escape issues within string values
  let jsonText = "";
  let inString = false;
  let escapeNext = false;
  let inDataReference = false;
  let dataRefDepth = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const nextChar = i + 1 < cleaned.length ? cleaned[i + 1] : "";
    const prevChar = i > 0 ? cleaned[i - 1] : "";

    // Track data reference boundaries {{...}}
    if (char === "{" && nextChar === "{" && !inString) {
      inDataReference = true;
      dataRefDepth = 0;
      jsonText += char;
      continue;
    }
    if (inDataReference) {
      if (char === "{") dataRefDepth++;
      if (char === "}") {
        dataRefDepth--;
        if (dataRefDepth === 0 && nextChar === "}") {
          inDataReference = false;
          jsonText += char;
          continue;
        }
      }
      // Inside data reference, don't escape - just pass through
      jsonText += char;
      continue;
    }

    if (escapeNext) {
      jsonText += char;
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      jsonText += char;
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      jsonText += char;
      continue;
    }

    if (inString) {
      // Within a string, handle special cases
      if (char === "\n") {
        jsonText += "\\n";
      } else if (char === "\r") {
        jsonText += "\\r";
      } else if (char === "\t") {
        jsonText += "\\t";
      } else if (char === "\b") {
        jsonText += "\\b";
      } else if (char === "\f") {
        jsonText += "\\f";
      } else if (char.charCodeAt(0) < 32 && char !== " ") {
        // Skip other control characters
        continue;
      } else if (char === '"' && prevChar !== "\\") {
        // Unescaped quote inside string - escape it
        jsonText += '\\"';
      } else {
        jsonText += char;
      }
    } else {
      // Outside strings, clean up whitespace issues
      if (char === "\n" || char === "\r") {
        // Replace newlines with space if they're not part of structure
        if (
          prevChar !== "," &&
          prevChar !== ":" &&
          prevChar !== "[" &&
          prevChar !== "{"
        ) {
          jsonText += " ";
        }
      } else if (char.charCodeAt(0) < 32 && char !== " " && char !== "\t") {
        // Skip other control characters outside strings
        continue;
      } else {
        jsonText += char;
      }
    }
  }

  // Try to fix common JSON issues
  // Fix trailing commas
  jsonText = jsonText.replace(/,(\s*[}\]])/g, "$1");

  // Fix double quotes before property names (e.g., ""answer" -> "answer")
  jsonText = jsonText.replace(/""([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g, '"$1":');

  // Fix double quotes in property names that might have been escaped incorrectly
  jsonText = jsonText.replace(/\\?""([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g, '"$1":');

  // Try parsing
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    // If parsing fails, try to extract just the JSON object more aggressively
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[pSEO] JSON parse error, attempting recovery...");
    console.error("[pSEO] Error:", errorMessage);

    // Try to extract position from error message
    const positionMatch = errorMessage.match(/position (\d+)/);
    if (positionMatch) {
      const position = parseInt(positionMatch[1]);
      const start = Math.max(0, position - 100);
      const end = Math.min(jsonText.length, position + 100);
      console.error("[pSEO] Context around error:");
      console.error(jsonText.substring(start, end));
    }

    // Try to find and extract the main JSON object
    const objMatch = jsonText.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        // Try to fix common issues in the extracted JSON
        let fixedJson = objMatch[0];
        // Remove trailing commas
        fixedJson = fixedJson.replace(/,(\s*[}\]])/g, "$1");
        // Fix double quotes before property names (e.g., ""answer" -> "answer")
        fixedJson = fixedJson.replace(
          /""([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g,
          '"$1":'
        );
        // Fix double quotes in property names that might have been escaped incorrectly
        fixedJson = fixedJson.replace(
          /\\?""([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g,
          '"$1":'
        );
        // Try to fix unclosed strings by finding the last complete object
        return JSON.parse(fixedJson);
      } catch (e) {
        console.error(
          "[pSEO] Recovery attempt failed:",
          e instanceof Error ? e.message : String(e)
        );
        // Log a sample of the problematic JSON for debugging
        console.error(
          "[pSEO] First 500 chars of JSON:",
          jsonText.substring(0, 500)
        );
        throw error;
      }
    }

    throw error;
  }
}

export async function generateGuideDraft(
  params: GenerateGuideParams
): Promise<GuideDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      temperature: 0.8, // High temperature for maximum creativity and human-like variation
      topP: 0.95,
      topK: 40,
    },
  });

  const systemInstruction =
    "You are a real estate professional in Mexico with 15+ years of hands-on experience. You write guides based on your actual experience, not as an AI generating content. Write in first person, use contractions, vary sentence structure dramatically, include personal observations, and write conversationally as if explaining to a friend. The goal is to sound 100% human - like a real person sharing real knowledge, not an AI article.";

  const prompt = buildPrompt(params);
  const fullPrompt = `${systemInstruction}\n\n${prompt}`;

  try {
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    let content = response.text();

    if (!content) {
      throw new Error("Gemini returned an empty response");
    }

    // Clean and parse JSON
    const parsed = cleanAndParseJSON(content);

    const sections: GuideSection[] = (parsed.sections || []).map(
      (section: any) => ({
        heading: section.heading,
        paragraphs: section.paragraphs || [],
        bullets: section.bullets,
        dataPoints: section.dataPoints,
        // imagePrompt will be used later to generate images
        imagePrompt: section.imagePrompt,
      })
    );
    const faq: GuideFAQItem[] | undefined = parsed.faq;

    return {
      title: parsed.title,
      metaTitle: parsed.metaTitle || parsed.title,
      metaDescription: parsed.metaDescription,
      excerpt: parsed.excerpt,
      heroKicker: parsed.heroKicker,
      mainImagePrompt: parsed.mainImagePrompt,
      tags: parsed.tags || [], // AI-generated tags based on content
      sections,
      faq,
    };
  } catch (error) {
    console.error("[pSEO] Failed to parse Gemini response", error);
    if (error instanceof Error && error.message.includes("JSON")) {
      // Try to log the raw content for debugging
      try {
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const rawContent = response.text();
        console.error(
          "[pSEO] Raw content received:",
          rawContent?.substring(0, 500)
        );
      } catch (logError) {
        // Ignore logging errors
      }
    }
    throw new Error(
      `Gemini response was not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }. Raw content preview logged above.`
    );
  }
}
