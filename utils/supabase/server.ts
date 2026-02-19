import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `cookies().set()` method can only be called in a Server Component or Route Handler
            // From your Next.js App Router.
            // https://nextjs.org/docs/app/api-reference/functions/cookies#cookiessetname-value-options
            console.warn('Could not set cookie from Server Component:', error)
          }
        },
        remove(name: string, options: any) {
          try {
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