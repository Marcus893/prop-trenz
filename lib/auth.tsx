'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'

interface UserProfileData {
  name: string
  language: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  profile: UserProfileData | null
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, name?: string, language?: string) => Promise<{ error: any }>
  signInWithGoogle: () => Promise<{ error: any }>
  signOut: () => Promise<void>
  updateProfile: (updates: { name?: string; language?: string }) => Promise<{ error: any }>
  deleteAccount: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const { i18n } = useTranslation('common')
  const router = useRouter()

  const setLanguagePreference = (language?: string) => {
    if (!language) return

    const normalized = language.toLowerCase()

    if (normalized !== i18n.language) {
      void i18n.changeLanguage(normalized)
    }

    if (router.locale !== normalized) {
      router
        .replace({ pathname: router.pathname, query: router.query }, router.asPath, {
          locale: normalized,
          scroll: false,
        })
        .catch(() => null)
    }
  }

  const applyUserLanguage = (language?: string | null) => {
    if (language) {
      setLanguagePreference(language)
    }
  }

  const mergeProfileIntoUser = (profileData: UserProfileData | null) => {
    if (!profileData) return
    setUser(prev => {
      if (!prev) return prev
      const mergedMetadata = {
        ...(prev.user_metadata || {}),
        name: profileData.name,
        language: profileData.language,
      }
      return { ...prev, user_metadata: mergedMetadata }
    })
  }

  const syncAuthMetadata = async (metadata: { name?: string; language?: string }) => {
    if (!user) return

    const payload: Record<string, string> = {}
    if (typeof metadata.name === 'string') {
      payload.name = metadata.name
    }
    if (typeof metadata.language === 'string') {
      const normalizedLanguage = metadata.language.toLowerCase()
      payload.language = ['en', 'es', 'zh'].includes(normalizedLanguage) ? normalizedLanguage : 'en'
    }

    if (Object.keys(payload).length === 0) {
      return
    }

    // Use a very short timeout and don't block - this is just for convenience
    // The database is the source of truth, not auth metadata
    try {
      const timeoutPromise = new Promise<'timeout'>((resolve) => {
        setTimeout(() => resolve('timeout'), 3000) // 3 second timeout
      })

      const updatePromise = supabase.auth.updateUser({ data: payload })
        .then(() => 'updated' as const)
        .catch(() => 'error' as const)

      const result = await Promise.race([updatePromise, timeoutPromise])

      if (result === 'timeout') {
        // Silently fail - this is non-critical
        console.log('[Auth] Auth metadata sync timed out (non-critical)')
      }
    } catch (error) {
      // Silently fail - this is non-critical
      console.log('[Auth] Auth metadata sync failed (non-critical):', error)
    }
  }

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, language')
        .eq('id', userId)
        .single()

      if (error) {
        console.warn('Failed to load user profile from users table', error)
        return null
      }

      const profileData: UserProfileData = {
        name: data?.name || '',
        language: data?.language || 'en',
      }

      setProfile(profileData)
      mergeProfileIntoUser(profileData)
      applyUserLanguage(profileData.language)
      return profileData
    } catch (error) {
      console.warn('Unexpected error loading user profile', error)
      return null
    }
  }

  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!isMounted) {
          return
        }

        if (session) {
          setUser(session.user)
          const profileData = await fetchUserProfile(session.user.id)
          if (!profileData) {
            applyUserLanguage(session.user.user_metadata?.language as string | undefined)
          }
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        console.warn('Failed to load auth session', error)
        if (isMounted) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void initialize()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) {
        return
      }

      setUser(session?.user ?? null)
      let profileData: UserProfileData | null = null
      if (session?.user) {
        profileData = await fetchUserProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)

      // Create or update users table record when user signs in (for both email/password and OAuth)
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        const user = session.user
        // Prioritize language from user_metadata (set during signup) over profile
        // This ensures the language selected during registration is preserved
        const languageFromMetadata = (user.user_metadata?.language as string)?.toLowerCase()
        const languageFromProfile = profileData?.language?.toLowerCase()
        const nameFromProfile = profileData?.name || user.user_metadata?.name || user.user_metadata?.full_name || ''
        
        // Prefer persisted profile language, then fallback to metadata, then default
        const languageToSaveSource = languageFromProfile || languageFromMetadata || 'en'
 
         // Normalize language code to ensure it's valid
        const validLanguage = ['en', 'es', 'zh'].includes(languageToSaveSource) ? languageToSaveSource : 'en'

        try {
          await supabase
            .from('users')
            .upsert(
              {
                id: user.id,
                email: user.email || '',
                name: nameFromProfile,
                language: validLanguage,
              },
              {
                onConflict: 'id',
              }
            )
        } catch (e) {
          // Non-fatal: user can still use the app
          console.warn('Failed to sync user to users table:', e)
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, name?: string, language: string = 'en') => {
    // Normalize language code to ensure it's valid
    const normalizedLanguage = (language?.toLowerCase() || 'en').trim()
    const validLanguage = ['en', 'es', 'zh'].includes(normalizedLanguage) ? normalizedLanguage : 'en'
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          language: validLanguage, // Store normalized language in user_metadata
        },
      },
    })

    // If signup was successful, try to create a record in the users table
    // Note: This may fail if RLS policies require email verification
    // The user record will be created automatically when they verify their email
    if (data.user && !error) {
      try {
        const { error: insertError } = await supabase
          .from('users')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            name: name || '',
            language: validLanguage // Use the normalized language
          }, {
            onConflict: 'id'
          })

        // Only log if it's not an RLS policy error (which is expected for unverified users)
        if (insertError && insertError.code !== '42501') {
          console.warn('Note: User record will be created after email verification:', insertError.message)
        }
        // RLS errors (42501) are expected for unverified users - the record will be created
        // automatically when they verify their email via the onAuthStateChange handler
      } catch (e) {
        // Silently fail - user record will be created on email verification
      }
    }

    if (!error) {
      setLanguagePreference(validLanguage) // Use normalized language
    }

    return { error }
  }

  const signOut = async () => {
    console.log('[Auth] Starting sign out...')
    const startTime = Date.now()
    
    let signOutCompleted = false
    let timeoutId: NodeJS.Timeout | null = null
    
    try {
      // Set a timeout - if signOut doesn't complete in 3 seconds, assume success
      const timeoutPromise = new Promise<void>((resolve) => {
        timeoutId = setTimeout(() => {
          if (!signOutCompleted) {
            console.log('[Auth] Sign out took >3s, assuming success')
            signOutCompleted = true
            resolve()
          }
        }, 3000)
      })
      
      // Race between signOut and timeout
      const signOutPromise = supabase.auth.signOut().then(() => {
        const elapsed = Date.now() - startTime
        console.log(`[Auth] Sign out completed after ${elapsed}ms`)
        signOutCompleted = true
        if (timeoutId) clearTimeout(timeoutId)
      })
      
      await Promise.race([signOutPromise, timeoutPromise])
      
      // Manual cleanup - clear local session
      setUser(null)
      setProfile(null)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sb-gtkhkhijcntmlewbofcw-auth-token')
      }
    } catch (error) {
      console.error('[Auth] Error during sign out:', error)
      // Still clear local state on error
      signOutCompleted = true
      if (timeoutId) clearTimeout(timeoutId)
      setUser(null)
      setProfile(null)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sb-gtkhkhijcntmlewbofcw-auth-token')
      }
    }
  }

  const signInWithGoogle = async () => {
    try {
      if (typeof window === 'undefined') {
        return { error: { message: 'Must be called from client side' } }
      }
      
      // Get the current origin (localhost:3000 in dev, proptrenz.com in production)
      const origin = window.location.origin
      
      // Build the redirect URL - this is where Supabase will redirect after OAuth
      // Include pathname and query params to return to the exact same page
      const currentPath = window.location.pathname + window.location.search
      const redirectTo = `${origin}${currentPath}`
      
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google', 
        options: { 
          redirectTo,
        } 
      })
      return { error }
    } catch (e) {
      return { error: { message: 'Failed to sign in with Google' } }
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })
      return { error }
    } catch (e) {
      return { error: { message: 'Failed to send reset email' } }
    }
  }

  const updateProfile = async (updates: { name?: string; language?: string }) => {
    if (!user) {
      return { error: { message: 'No user logged in' } }
    }

    console.log('[Auth] Starting profile update...', updates)
    const startTime = Date.now()
    
    try {
      // Call RPC to update database - wait for it to complete
      const { error: rpcError } = await supabase.rpc('update_user_profile', {
        p_user_id: user.id,
        p_name: updates.name ?? null,
        p_language: updates.language ?? null,
      })

      const elapsed = Date.now() - startTime
      console.log(`[Auth] Profile update RPC completed after ${elapsed}ms`)

      if (rpcError) {
        console.error('[Auth] Profile update RPC error:', rpcError)
        return { error: rpcError }
      }

      // Fetch updated profile from database to confirm it was saved
      console.log('[Auth] Fetching updated profile from database to confirm')
      const profileData = await fetchUserProfile(user.id)
      
      const updatedProfile = {
        name: updates.name ?? profileData?.name ?? (user.user_metadata?.name as string) ?? '',
        language: updates.language ?? profileData?.language ?? (user.user_metadata?.language as string) ?? 'en',
      }

      // Update local state
      setProfile(updatedProfile)
      mergeProfileIntoUser(updatedProfile)
      setLanguagePreference(updatedProfile.language)
      
      // Sync to auth metadata in background (non-blocking) - but don't let it interfere
      // Use a small delay to ensure the RPC has fully completed
      setTimeout(() => {
        syncAuthMetadata(updatedProfile).catch(err => {
          console.warn('[Auth] Background syncAuthMetadata failed (non-critical):', err)
        })
      }, 100)

      console.log('[Auth] Profile update success')
      return { error: null }
    } catch (e: any) {
      console.error('[Auth] Profile update exception:', e)
      return { error: e }
    }
  }

  const deleteAccount = async () => {
    if (!user) {
      return { error: { message: 'No user logged in' } }
    }

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return { error: { message: 'No active session' } }
      }

      // Call the edge function which handles complete deletion:
      // 1. Deletes from user_watchlists
      // 2. Anonymizes data_upload_logs
      // 3. Deletes from users table
      // 4. Deletes from auth.users (works for both email/password and OAuth)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl) {
        return { error: { message: 'Supabase URL not configured' } }
      }

      // Create a timeout promise (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - deletion took too long')), 30000)
      })

      // Create the fetch request
      const fetchPromise = fetch(`${supabaseUrl}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise])

      // Check if response is ok
      if (!response.ok && response.status !== 200) {
        let errorMessage = 'Failed to delete account'
        try {
          const result = await response.json()
          errorMessage = typeof result?.error === 'string' ? result.error : errorMessage
        } catch (e) {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage
        }
        return { error: { message: errorMessage } }
      }

      let result: any = null
      try {
        result = await response.json()
      } catch (parseError) {
        // If JSON parsing fails but status is ok, assume success
        result = { success: true }
      }

      const errorMessage = typeof result?.error === 'string' ? result.error : ''
      const alreadyDeleted = !response.ok && errorMessage.toLowerCase().includes('user not found')

      if (!response.ok && !alreadyDeleted) {
        console.error('Failed to delete account:', result)
        return { error: { message: errorMessage || 'Failed to delete account' } }
      }

      // Account deletion was successful - clear local state
      // Note: Don't call signOut() as the user account no longer exists
      // This would cause a 403 error since the user can't be signed out of a deleted account
      setUser(null)
      setProfile(null)
      
      // Clear the session from localStorage manually
      try {
        if (typeof window !== 'undefined') {
          // Clear Supabase auth session from localStorage
          const keys = Object.keys(localStorage)
          keys.forEach(key => {
            if (key.startsWith('sb-') && key.includes('auth-token')) {
              localStorage.removeItem(key)
            }
          })
        }
      } catch (e) {
        // Ignore localStorage errors
      }

      return { error: null }
    } catch (err) {
      console.error('Delete account error:', err)
      // Check if it's a timeout error
      if (err instanceof Error && err.message.includes('timeout')) {
        return { error: { message: 'Deletion timed out. Please try again or contact support.' } }
      }
      return { error: { message: err instanceof Error ? err.message : 'Failed to delete account' } }
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    profile,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
    deleteAccount,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
