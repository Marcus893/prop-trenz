import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing environment variables!', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl,
    keyLength: supabaseAnonKey?.length
  })
}

// Track if fetch is being called (to detect stuck client)
let fetchCallCount = 0
let lastFetchCallTime = 0

// Create a custom fetch with timeout
const createCustomFetch = () => {
  return (url: RequestInfo | URL, options: RequestInit = {}) => {
    const urlString = typeof url === 'string' ? url : url.toString()
    const isAuthRequest = urlString.includes('/auth/v1/')
    
    // Track fetch calls
    fetchCallCount++
    lastFetchCallTime = Date.now()
    
    // Add timeout to fetch requests
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 30000) // 30 second timeout
    
    // Merge abort signals if one already exists
    const existingSignal = options.signal
    if (existingSignal) {
      existingSignal.addEventListener('abort', () => controller.abort())
    }
    
    return fetch(url, {
      ...options,
      signal: controller.signal,
    })
      .finally(() => {
        clearTimeout(timeoutId)
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout')
        }
        throw error
      })
  }
}

// Factory function to create a new Supabase client
const createSupabaseClient = (): SupabaseClient => {
  return createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      global: {
        fetch: createCustomFetch(),
      },
    }
  )
}

// Create initial Supabase client
let supabase = createSupabaseClient()

// Function to reset the Supabase client (useful when it gets stuck)
export const resetSupabaseClient = () => {
  // Don't create a new client - instead, try to clear any internal state
  // Creating new clients causes "Multiple GoTrueClient instances" warnings
  // Just reset the fetch counter to allow detection to work again
  fetchCallCount = 0
  lastFetchCallTime = 0
}

// Export the client (will be updated when reset)
export { supabase }

// Function to get authenticated Supabase client
export async function getAuthenticatedClient() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('No authenticated session found')
  }
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase not configured')
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
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        const error = new Error('Supabase not configured - check environment variables')
        console.error('[Supabase] getLocations error:', error)
        return { data: null, error }
      }

      const queryStart = Date.now()
      const initialFetchCount = fetchCallCount
      
      // Build query with proper chaining
      let queryBuilder = supabase.from('locations').select('id, type, name, state, parent_id')
      
      if (type) {
        queryBuilder = queryBuilder.eq('type', type)
      }
      
      queryBuilder = queryBuilder.order('name', { ascending: true }).limit(10000)
      
      // Helper function to execute a query with timeout
      const executeQuery = async (client: SupabaseClient, maxWaitTime = 30000) => {
        const startTime = Date.now()
        const fetchCountBefore = fetchCallCount
        
        // Build fresh query from the provided client
        let builder = client.from('locations').select('id, type, name, state, parent_id')
        if (type) {
          builder = builder.eq('type', type)
        }
        builder = builder.order('name', { ascending: true }).limit(10000)
        
        // Set up stuck detection
        const stuckCheck = new Promise<{ stuck: true }>((resolve) => {
          setTimeout(() => {
            const fetchWasCalled = fetchCallCount > fetchCountBefore
            if (!fetchWasCalled) {
              console.warn('[Supabase] Query stuck - fetch never called')
              resolve({ stuck: true })
            }
          }, 2000) // Check after 2 seconds
        })
        
        // Set up query timeout
        const queryTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), maxWaitTime)
        })
        
        try {
          // Race query against stuck check and timeout
          const queryPromise = builder.then((result) => ({ result, stuck: false as const }))
          const raceResult = await Promise.race([queryPromise, stuckCheck, queryTimeout]) as 
            | { result: { data: any; error: any }, stuck: false }
            | { stuck: true }
          
          if (raceResult.stuck) {
            throw new Error('Query stuck - fetch never called')
          }
          
          return raceResult.result
        } catch (err) {
          const fetchWasCalled = fetchCallCount > fetchCountBefore
          if (!fetchWasCalled) {
            const stuckError = new Error('Query failed without fetch call')
            stuckError.name = 'StuckQueryError'
            throw stuckError
          }
          throw err
        }
      }
      
      let data, error
      let retryCount = 0
      const maxRetries = 1 // Only retry once
      
      while (retryCount <= maxRetries) {
        try {
          const result = await executeQuery(supabase, 30000)
          data = result.data
          error = result.error
          break // Success, exit retry loop
        } catch (queryError: any) {
          const isStuckError = queryError.name === 'StuckQueryError' || 
                               queryError.message?.includes('stuck') || 
                               queryError.message?.includes('fetch never called') || 
                               queryError.message?.includes('fetch call') ||
                               queryError.message?.includes('timeout')
          
          if (isStuckError && retryCount < maxRetries) {
            retryCount++
            
            // Fallback: Use direct REST API call instead of Supabase client
            try {
              let restUrl = `${supabaseUrl}/rest/v1/locations?select=id,type,name,state,parent_id&order=name.asc&limit=10000`
              
              if (type) {
                restUrl += `&type=eq.${encodeURIComponent(type)}`
              }
              
              const headers: Record<string, string> = {
                'apikey': supabaseAnonKey || '',
                'Authorization': `Bearer ${supabaseAnonKey || ''}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              }
              
              const directResult = await fetch(restUrl, { 
                headers,
                method: 'GET'
              })
              
              if (!directResult.ok) {
                const errorText = await directResult.text()
                throw new Error(`HTTP ${directResult.status}: ${errorText}`)
              }
              
              const directData = await directResult.json()
              data = directData
              error = null
              break // Exit retry loop on success
            } catch (directError: any) {
              console.error('[Supabase] Direct REST API call failed:', directError.message || directError)
              // Continue to throw the original error
              throw queryError
            }
          } else {
            // Either not a stuck error, or max retries reached
            throw queryError
          }
        }
      }
      
      if (error) {
        console.error('[Supabase] getLocations error:', error)
        return { data: null, error }
      }
      
      return { data, error: null }
    } catch (err) {
      console.error('[Supabase] getLocations exception:', err)
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error fetching locations') 
      }
    }
  },

  async getLocationById(id: string) {
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        const error = new Error('Supabase not configured - check environment variables')
        return { data: null, error }
      }

      const initialFetchCount = fetchCallCount
      
      // Set up stuck detection
      const stuckCheck = new Promise<{ stuck: true }>((resolve) => {
        setTimeout(() => {
          const fetchWasCalled = fetchCallCount > initialFetchCount
          if (!fetchWasCalled) {
            resolve({ stuck: true })
          }
        }, 2000) // Check after 2 seconds (user already changed this)
      })
      
      const queryTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 30000)
      })
      
      try {
        const queryPromise = supabase.from('locations').select('*').eq('id', id).single()
          .then((result) => ({ result, stuck: false as const }))
        
        const raceResult = await Promise.race([queryPromise, stuckCheck, queryTimeout]) as 
          | { result: { data: any; error: any }, stuck: false }
          | { stuck: true }
        
        if (raceResult.stuck) {
          throw new Error('Query stuck - fetch never called')
        }
        
        return raceResult.result
      } catch (err) {
        const fetchWasCalled = fetchCallCount > initialFetchCount
        if (!fetchWasCalled) {
          // Fallback to direct REST API
          const restUrl = `${supabaseUrl}/rest/v1/locations?id=eq.${encodeURIComponent(id)}&select=*`
          const headers: Record<string, string> = {
            'apikey': supabaseAnonKey || '',
            'Authorization': `Bearer ${supabaseAnonKey || ''}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
          
          const directResult = await fetch(restUrl, { headers, method: 'GET' })
          if (!directResult.ok) {
            const errorText = await directResult.text()
            throw new Error(`HTTP ${directResult.status}: ${errorText}`)
          }
          
          const directData = await directResult.json()
          // .single() returns a single object, not an array
          const singleData = Array.isArray(directData) ? directData[0] : directData
          return { data: singleData, error: null }
        }
        throw err
      }
    } catch (err) {
      console.error('[Supabase] getLocationById exception:', err)
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error fetching location') 
      }
    }
  },

  async getLocationsByState(state: string) {
    return supabase.from('locations').select('*').eq('state', state).order('name')
  },

  // Property Types
  async getPropertyTypes() {
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        const error = new Error('Supabase not configured - check environment variables')
        return { data: null, error }
      }

      const queryStart = Date.now()
      const initialFetchCount = fetchCallCount
      
      // Build query
      const queryBuilder = supabase.from('residential_property_types').select('*').order('name')
      
      // Set up stuck detection
      const stuckCheck = new Promise<{ stuck: true }>((resolve) => {
        setTimeout(() => {
          const fetchWasCalled = fetchCallCount > initialFetchCount
          if (!fetchWasCalled) {
            resolve({ stuck: true })
          }
        }, 5000)
      })
      
      const queryTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 30000)
      })
      
      try {
        const queryPromise = queryBuilder.then((result) => ({ result, stuck: false as const }))
        const raceResult = await Promise.race([queryPromise, stuckCheck, queryTimeout]) as 
          | { result: { data: any; error: any }, stuck: false }
          | { stuck: true }
        
        if (raceResult.stuck) {
          throw new Error('Query stuck - fetch never called')
        }
        
        return raceResult.result
      } catch (err) {
        const fetchWasCalled = fetchCallCount > initialFetchCount
        if (!fetchWasCalled) {
          // Fallback to direct REST API
          const restUrl = `${supabaseUrl}/rest/v1/residential_property_types?select=*&order=name.asc`
          const headers: Record<string, string> = {
            'apikey': supabaseAnonKey || '',
            'Authorization': `Bearer ${supabaseAnonKey || ''}`,
            'Content-Type': 'application/json',
          }
          
          const directResult = await fetch(restUrl, { headers, method: 'GET' })
          if (!directResult.ok) {
            const errorText = await directResult.text()
            throw new Error(`HTTP ${directResult.status}: ${errorText}`)
          }
          
          const directData = await directResult.json()
          return { data: directData, error: null }
        }
        throw err
      }
    } catch (err) {
      console.error('[Supabase] getPropertyTypes exception:', err)
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error fetching property types') 
      }
    }
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
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        const error = new Error('Supabase not configured - check environment variables')
        return { data: null, error }
      }

      const initialFetchCount = fetchCallCount
      
      // Set up stuck detection
      const stuckCheck = new Promise<{ stuck: true }>((resolve) => {
        setTimeout(() => {
          const fetchWasCalled = fetchCallCount > initialFetchCount
          if (!fetchWasCalled) {
            resolve({ stuck: true })
          }
        }, 5000)
      })
      
      const queryTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 30000)
      })
      
      try {
        const rpcPromise = supabase.rpc('get_price_trend', {
          p_location_id: locationId,
          p_property_type_id: propertyTypeId,
          p_years_back: yearsBack
        }).then((result) => ({ result, stuck: false as const }))
        
        const raceResult = await Promise.race([rpcPromise, stuckCheck, queryTimeout]) as 
          | { result: { data: any; error: any }, stuck: false }
          | { stuck: true }
        
        if (raceResult.stuck) {
          throw new Error('RPC call stuck - fetch never called')
        }
        
        return raceResult.result
      } catch (err) {
        const fetchWasCalled = fetchCallCount > initialFetchCount
        if (!fetchWasCalled) {
          // Fallback to direct REST API for RPC call
          try {
            const rpcUrl = `${supabaseUrl}/rest/v1/rpc/get_price_trend`
            const headers: Record<string, string> = {
              'apikey': supabaseAnonKey || '',
              'Authorization': `Bearer ${supabaseAnonKey || ''}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            }
            
            const rpcParams: Record<string, any> = {
              p_location_id: locationId,
              p_years_back: yearsBack
            }
            
            if (propertyTypeId) {
              rpcParams.p_property_type_id = propertyTypeId
            }
            
            const directResult = await fetch(rpcUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(rpcParams)
            })
            
            if (!directResult.ok) {
              const errorText = await directResult.text()
              throw new Error(`HTTP ${directResult.status}: ${errorText}`)
            }
            
            const directData = await directResult.json()
            return { data: directData, error: null }
          } catch (directError: any) {
            console.error('[Supabase] getPriceTrend direct REST API call failed:', directError.message || directError)
            throw new Error('RPC call failed without fetch call')
          }
        }
        throw err
      }
    } catch (err) {
      console.error('[Supabase] getPriceTrend exception:', err)
      return { 
        data: null, 
        error: err instanceof Error ? err : new Error('Unknown error fetching price trend') 
      }
    }
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
