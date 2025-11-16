export type GuideAccessLevel = 'public' | 'email_capture'

export type GuideStatus = 'draft' | 'review' | 'published'

export interface GuideSection {
  heading: string
  paragraphs: string[]
  bullets?: string[]
  dataPoints?: Array<{ label: string; value: string }>
  imageUrl?: string
  imageAlt?: string
}

export interface GuideFAQItem {
  question: string
  answer: string
}

export interface GuideArticle {
  slug: string
  locale: string
  title: string
  metaTitle?: string
  metaDescription: string
  excerpt?: string
  heroKicker?: string
  status: GuideStatus
  accessLevel: GuideAccessLevel
  tags: string[]
  updatedAt: string
  mainImageUrl?: string
  mainImageAlt?: string
  sections: GuideSection[]
  faq?: GuideFAQItem[]
}

export interface GenerateGuideParams {
  slug: string
  locale: string
  topic: string
  keywords: string[]
  tags?: string[]
  accessLevel?: GuideAccessLevel
  dataPoints?: Array<{ label: string; value: string }>
  skipImages?: boolean
}
