# PropTrenz MVP - Setup Instructions

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Supabase Account** - Create at [supabase.com](https://supabase.com)
3. **PostHog Account** (Optional) - Create at [posthog.com](https://posthog.com) for user analytics

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

1. Copy `env.example` to `.env.local`
2. Fill in your environment variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# PostHog Analytics (Optional - for user behavior tracking)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Contact Widget Email Notifications (Optional)
RESEND_API_KEY=your_resend_api_key
CONTACT_FORM_RECIPIENT_EMAIL=you@proptrenz.com
CONTACT_FORM_FROM_EMAIL="PropTrenz <support@send.proptrenz.com>"

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_string

# Programmatic SEO (Optional)
OPENAI_API_KEY=your_openai_key # For text generation
OPENAI_PSEO_MODEL=gpt-4o-mini # optional override
GEMINI_API_KEY=your_gemini_api_key # For image generation (or use GOOGLE_AI_API_KEY)
```

### 3. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database/schema.sql`
4. Execute the SQL to create all tables and functions

### 4. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Features Implemented

### ✅ Core Features
- **Interactive Line Charts**: Price trend visualization with Recharts
- **Geographic Navigation**: Hierarchical location selection (National → States → Municipalities)
- **Multilingual Support**: English, Spanish, Chinese (Simplified)
- **User Authentication**: Sign up/Sign in with Supabase Auth
- **Admin Panel**: CSV upload interface for SHF data
- **Data Processing Pipeline**: Automated SHF CSV processing
- **Responsive Design**: Mobile-friendly interface

### ✅ Data Management
- **SHF Data Integration**: Processes quarterly CSV files from SHF
- **Residential Focus**: Filters out government housing, focuses on residential market
- **Property Types**: Nueva, Usada, Casa sola, Condominio
- **Geographic Coverage**: National, 32 states, 100+ municipalities, metro zones

### ✅ Technical Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Charts**: Recharts for interactive visualizations
- **Internationalization**: next-i18next
- **UI Components**: Custom components with Lucide React icons

## Usage

### For Users
1. **Browse Locations**: Use the geographic navigator to explore different regions
2. **View Charts**: Click on locations to see interactive price trend charts
3. **Switch Languages**: Use the language switcher in the top-right corner
4. **Create Account**: Sign up to access additional features (future)

### For Admins
1. **Upload Data**: Go to Admin panel to upload new SHF CSV files
2. **Monitor Uploads**: View upload history and processing status
3. **Data Management**: Track records processed and any errors

## Data Upload Process

1. Download quarterly CSV from SHF transparency portal
2. Go to Admin panel in the application
3. Upload the CSV file
4. System automatically processes and stores the data
5. New data becomes available immediately

## Next Steps (Phase 2)

- **3D Globe Interface**: Interactive 3D globe for global expansion
- **Advanced Analytics**: ROI calculators, forecasting
- **Price Alerts**: Email notifications for price changes
- **Mobile App**: React Native mobile application
- **Additional Languages**: French, German, Portuguese, Japanese, Korean

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure Supabase URL and keys are correct
2. **CSV Upload**: Make sure CSV follows SHF format with semicolon delimiters
3. **Authentication**: Check Supabase Auth settings
4. **Build Errors**: Run `npm run type-check` to identify TypeScript issues

### Support

For issues or questions, check the console logs and ensure all environment variables are properly set.

## Programmatic SEO Workflow

The app ships with a lightweight pSEO pipeline that stores generated guides in `content/guides`. Each guide is rendered at `/guides/[slug]` and can be gated behind sign-in or email capture.

### SEO Optimizations

All generated guides include comprehensive SEO features:

- **Structured Data**: JSON-LD schemas for Article and FAQPage (enables rich snippets)
- **Meta Tags**: Optimized title (50-60 chars), description (150-160 chars), Open Graph, Twitter Cards
- **Canonical URLs**: Prevents duplicate content issues
- **Semantic HTML**: Proper article structure with microdata attributes
- **Sitemap Integration**: Guides automatically included in `/sitemap.xml`
- **Keyword Optimization**: Natural keyword density (2-3 mentions per section) without stuffing
- **Content Length**: 1500-2500 words for topical authority

### Generation Process

1. **Configure OpenAI**: set `OPENAI_API_KEY` (and optionally override the model with `OPENAI_PSEO_MODEL`).
2. **Set site URL** (optional): `NEXT_PUBLIC_SITE_URL=https://proptrenz.com` for canonical URLs and OG images.
3. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

4. **Generate a draft**:
   ```bash
   npm run generate-guide -- --slug=playa-del-carmen-buying-guide --topic="Buying property in Playa del Carmen" --keywords="Playa del Carmen real estate, Quintana Roo ISAI" --locale=en --access=public
   ```
   
   To skip image generation (useful if you hit billing limits):
   ```bash
   npm run generate-guide -- --slug=playa-del-carmen-buying-guide --topic="Buying property in Playa del Carmen" --keywords="Playa del Carmen real estate, Quintana Roo ISAI" --locale=en --access=public --skip-images=true
   ```
   
   To generate images for an existing guide later:
   ```bash
   npm run generate-images -- --slug=playa-del-carmen-buying-guide
   ```

5. **Review & publish**: 
   - Option A: Manually edit the JSON file and set `"status": "published"`, then run:
     ```bash
     npm run translate-guides -- --slug=playa-del-carmen-buying-guide
     ```
     Or to translate all published guides with missing translations:
     ```bash
     npm run translate-guides
     ```
   - Option B: Use the publish script (automatically generates translations):
     ```bash
     npm run publish-guide -- --slug=playa-del-carmen-buying-guide
     ```
   
   **Note**: If you manually change the status to "published" in the JSON file, you need to run `npm run translate-guides` separately to generate translations. The `publish-guide` script automatically triggers translations.

6. **Automatic translations**: When a guide is published using the `publish-guide` script, translations to Spanish and Chinese are automatically generated using OpenAI. Translations are saved as `{slug}-{locale}.json` and start as drafts for review.

Guides respect `accessLevel` (`public`, `login_required`, `email_capture`). Auth-protected content displays an inline sign-in/sign-up form that plugs into Supabase Auth.

### Translation System

- **Auto-translation**: When you publish a guide, translations to all supported locales (es, zh) are automatically generated
- **Locale-specific files**: Translations are stored as `{slug}-{locale}.json` (e.g., `mexico-property-buying-basics-es.json`)
- **Routing**: Guides are automatically served in the correct locale based on the user's language preference
- **Manual translation**: To generate translations for a specific guide or all published guides:
  ```bash
  # Translate a specific guide
  npm run translate-guides -- --slug=your-slug
  
  # Regenerate translations (useful when translation logic is updated, e.g., to update tags)
  npm run translate-guides -- --slug=your-slug --force
  
  # Translate all published guides with missing translations
  npm run translate-guides
  ```




