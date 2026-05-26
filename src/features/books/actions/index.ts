"use server"

import { createServerClient } from "@/lib/supabase/server"
import type { Book, ReadingStatus } from "@/features/books/types"

type GetBooksParams = {
  query?: string
  status?: ReadingStatus
  limit?: number
}

export async function getBooks(params: GetBooksParams = {}): Promise<{ data: Book[] | null; error: string | null }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "UNAUTHORIZED" }

  let query = supabase
    .from("books")
    .select(`
      *,
      memoCount:reading_memos(count),
      starCount:reading_memos(count).eq(favorite, true)
    `)
    .order("updated_at", { ascending: false })

  if (params.query) {
    query = query.or(`title.ilike.%${params.query}%,author.ilike.%${params.query}%`)
  }
  if (params.status) {
    query = query.eq("status", params.status)
  }
  if (params.limit) {
    query = query.limit(params.limit)
  }

  const { data, error } = await query
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}