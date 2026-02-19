import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase environment variables are not set. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are defined.'
    )
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies()
          return cookieStore.get(name)?.value
        },
        async set(name: string, value: string, options: any) {
          try {
            const cookieStore = await cookies()
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `cookies().set()` method can only be called in a Server Component or Route Handler
            // From your Next.js App Router.
            // https://nextjs.org/docs/app/api-reference/functions/cookies#cookiessetname-value-options
            console.warn('Could not set cookie from Server Component:', error)
          }
        },
        async remove(name: string, options: any) {
          try {
            const cookieStore = await cookies()
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `cookies().set()` method can only be called in a Server Component or Route Handler
            // From your Next.js App Router.
            // https://nextjs.org/docs/app/api-reference/functions/cookies#cookiessetname-value-options
            console.warn('Could not remove cookie from Server Component:', error)
          }
        },
      },
    }
  )
}