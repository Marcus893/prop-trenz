import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Function to get authenticated Supabase client
export async function getAuthenticatedClient() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('No authenticated session found')
  }
  
  // Create a new client with the current session
  const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    }
  })
  
  return authenticatedClient
}

// Database types
export interface Location {
  id: string
  type: 'national' | 'state' | 'municipality' | 'metro_zone'
  name: string
  state?: string
  parent_id?: string
  created_at: string
  updated_at: string
}

export interface ResidentialPropertyType {
  id: string
  name: string
  display_name_en: string
  display_name_es: string
  display_name_zh: string
  description_en?: string
  description_es?: string
  description_zh?: string
  created_at: string
}

export interface ResidentialPriceIndex {
  id: string
  location_id: string
  property_type_id?: string
  quarter: number
  year: number
  index_value: number
  created_at: string
}

export interface User {
  id: string
  email: string
  name?: string
  language: string
  created_at: string
  updated_at: string
}

export interface UserWatchlist {
  id: string
  user_id: string
  location_id: string
  property_type_id?: string
  created_at: string
}

export interface DataUploadLog {
  id: string
  filename: string
  upload_date: string
  records_processed: number
  status: 'processing' | 'completed' | 'failed'
  error_message?: string
  uploaded_by?: string
}

// API functions
export const db = {
  // Locations
  async getLocations(type?: string) {
    let query = supabase.from('locations').select('*')
    if (type) {
      query = query.eq('type', type)
    }
    const { data, error } = await query.order('name')
    return { data, error }
  },

  async getLocationById(id: string) {
    return supabase.from('locations').select('*').eq('id', id).single()
  },

  async getLocationsByState(state: string) {
    return supabase.from('locations').select('*').eq('state', state).order('name')
  },

  // Property Types
  async getPropertyTypes() {
    return supabase.from('residential_property_types').select('*').order('name')
  },

  // Price Indices
  async getPriceIndices(locationId: string, propertyTypeId?: string) {
    let query = supabase
      .from('residential_price_indices')
      .select(`
        *,
        locations!inner(*),
        residential_property_types(*)
      `)
      .eq('location_id', locationId)
      .order('year', { ascending: true })
      .order('quarter', { ascending: true })

    if (propertyTypeId) {
      query = query.eq('property_type_id', propertyTypeId)
    }

    return query
  },

  async getPriceTrend(locationId: string, propertyTypeId?: string, yearsBack = 20) {
    return supabase.rpc('get_price_trend', {
      p_location_id: locationId,
      p_property_type_id: propertyTypeId,
      p_years_back: yearsBack
    })
  },

  // Users
  async createUser(userData: Partial<User>) {
    return supabase.from('users').insert(userData).select().single()
  },

  async getUserById(id: string) {
    return supabase.from('users').select('*').eq('id', id).single()
  },

  async updateUser(id: string, updates: Partial<User>) {
    return supabase.from('users').update(updates).eq('id', id).select().single()
  },

  // Watchlists
  async getUserWatchlist(userId: string) {
    return supabase
      .from('user_watchlists')
      .select(`
        *,
        locations(*),
        residential_property_types(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  },

  async addToWatchlist(userId: string, locationId: string, propertyTypeId?: string) {
    return supabase.from('user_watchlists').insert({
      user_id: userId,
      location_id: locationId,
      property_type_id: propertyTypeId
    }).select().single()
  },

  async removeFromWatchlist(userId: string, locationId: string, propertyTypeId?: string) {
    return supabase
      .from('user_watchlists')
      .delete()
      .eq('user_id', userId)
      .eq('location_id', locationId)
      .eq('property_type_id', propertyTypeId)
  },

  // Data Upload Logs
  async createUploadLog(logData: Partial<DataUploadLog>) {
    return supabase.from('data_upload_logs').insert(logData).select().single()
  },

  async updateUploadLog(id: string, updates: Partial<DataUploadLog>) {
    return supabase.from('data_upload_logs').update(updates).eq('id', id).select().single()
  },

  async getUploadLogs() {
    const { data, error } = await supabase
      .from('data_upload_logs')
      .select('*')
      .order('upload_date', { ascending: false })
    
    return { data, error }
  },

  // Insights
  async getInsights() {
    return supabase.from('insights').select('*').eq('id', 1).single()
  }
}
