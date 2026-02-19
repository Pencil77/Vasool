'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, createContext, useContext } from 'react'

// Define the shape of the context state
interface VasoolModeContextType {
  vasoolMode: boolean
  toggleVasoolMode: () => void
  isAdmin: boolean
}

// Create the context
const VasoolModeContext = createContext<VasoolModeContextType | undefined>(
  undefined,
)

// Provider component
export function AdminContext({ children }: { children: React.ReactNode }) {
  const [vasoolMode, setVasoolMode] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkAdminStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('auth_id', user.id)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
          setIsAdmin(false)
        } else if (profile) {
          setIsAdmin(profile.is_admin)
        }
      } else {
        setIsAdmin(false)
      }
    }

    checkAdminStatus()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          checkAdminStatus()
        }
      },
    )

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [supabase, router])

  const toggleVasoolMode = () => {
    setVasoolMode((prevMode) => !prevMode)
  }

  return (
    <VasoolModeContext.Provider value={{ vasoolMode, toggleVasoolMode, isAdmin }}>
      {children}
    </VasoolModeContext.Provider>
  )
}

// Custom hook to use the VasoolModeContext
export function useAdminContext() {
  const context = useContext(VasoolModeContext)
  if (context === undefined) {
    throw new Error('useAdminContext must be used within an AdminContext')
  }
  return context
}