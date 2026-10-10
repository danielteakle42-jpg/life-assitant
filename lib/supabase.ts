import { createBrowserClient } from '@supabase/ssr'

export function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://configuration-required.invalid'
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'configuration-required'
  return createBrowserClient(url, key)
}
