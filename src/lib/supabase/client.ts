// Client Component・ブラウザ環境専用。
// サーバー環境（Server Component / Server Actions / Middleware）では server.ts の createClient() を使うこと。
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}