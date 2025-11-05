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
        const nameFromProfile = profileData?.name || user.user_metadata?.name || user.user_metadata?.full_name || ''
        const languageFromProfile = profileData?.language || (user.user_metadata?.language as string) || 'en'

        try {
          await supabase
            .from('users')
            .upsert(
              {
                id: user.id,
                email: user.email || '',
                name: nameFromProfile,
                language: languageFromProfile,
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          language,
        },
      },
    })

    // If signup was successful, create a record in the users table
    if (data.user && !error) {
      const { error: insertError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          email: data.user.email,
          name: name || '',
          language: language || 'en'
        }, {
          onConflict: 'id'
        })

      if (insertError) {
        console.error('Failed to create user record:', insertError)
        // Don't return the error here as the auth signup was successful
        // The user can still sign in, but they won't have access to admin features
      }
    }

    if (!error) {
      setLanguagePreference(language)
    }

    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const signInWithGoogle = async () => {
    try {
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
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

    const { error } = await supabase.rpc('update_user_profile', {
      p_user_id: user.id,
      p_name: updates.name ?? null,
      p_language: updates.language ?? null,
    })

    if (error) {
      return { error }
    }

    const updatedProfile = {
      id: user.id,
      email: user.email || '',
      name: updates.name ?? (user.user_metadata?.name as string) ?? '',
      language: updates.language ?? (user.user_metadata?.language as string) ?? 'en',
    }

    await fetchUserProfile(user.id)
    setLanguagePreference(updatedProfile.language)

    return { error: null }
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
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      let result: any = null
      try {
        result = await response.json()
      } catch (parseError) {
        result = null
      }

      const errorMessage = typeof result?.error === 'string' ? result.error : ''
      const alreadyDeleted = !response.ok && errorMessage.toLowerCase().includes('user not found')

      if (!response.ok && !alreadyDeleted) {
        console.error('Failed to delete account:', result)
        return { error: { message: errorMessage || 'Failed to delete account' } }
      }

      // Sign out the user (this will remove them from auth session)
      await supabase.auth.signOut()
      setUser(null)

      return { error: null }
    } catch (err) {
      console.error('Delete account error:', err)
      return { error: { message: 'Failed to delete account' } }
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
