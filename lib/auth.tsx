'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>
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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)

      // Create or update users table record when user signs in (for both email/password and OAuth)
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        const user = session.user
        // Extract name from user_metadata (could be from OAuth or email signup)
        const name = user.user_metadata?.name || user.user_metadata?.full_name || ''
        
        try {
          await supabase
            .from('users')
            .upsert({
              id: user.id,
              email: user.email || '',
              name: name,
              language: user.user_metadata?.language || 'en'
            }, {
              onConflict: 'id'
            })
        } catch (e) {
          // Non-fatal: user can still use the app
          console.warn('Failed to sync user to users table:', e)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, name?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
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
          language: 'en'
        }, {
          onConflict: 'id'
        })

      if (insertError) {
        console.error('Failed to create user record:', insertError)
        // Don't return the error here as the auth signup was successful
        // The user can still sign in, but they won't have access to admin features
      }
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
    // Update auth metadata
    const { error } = await supabase.auth.updateUser({
      data: updates,
    })

    // Best-effort sync to application users table
    if (!error && user) {
      try {
        const payload: { name?: string; language?: string } = {}
        if (typeof updates.name !== 'undefined') payload.name = updates.name || ''
        if (typeof updates.language !== 'undefined') payload.language = updates.language
        if (Object.keys(payload).length > 0) {
          await supabase
            .from('users')
            .update(payload)
            .eq('id', user.id)
        }
      } catch (e) {
        // Non-fatal: keep auth metadata as source of truth if this fails
        console.warn('Failed to sync user profile to users table', e)
      }
    }

    return { error }
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
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Failed to delete account:', result)
        return { error: { message: result.error || 'Failed to delete account' } }
      }

      // Sign out the user (this will remove them from auth session)
      await supabase.auth.signOut()
      
      return { error: null }
    } catch (err) {
      console.error('Delete account error:', err)
      return { error: { message: 'Failed to delete account' } }
    }
  }

  const value = {
    user,
    loading,
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
