# PropTrenz MVP - Setup Instructions

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Supabase Account** - Create at [supabase.com](https://supabase.com)
3. **Mapbox Account** - Create at [mapbox.com](https://mapbox.com) (optional for Phase 1)

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

# Mapbox Configuration (optional for Phase 1)
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_string
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




