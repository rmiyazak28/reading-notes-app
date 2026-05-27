"use server"

import { createClient } from "@/lib/supabase/server"
import type { Book, ReadingStatus } from "@/features/books/types"

type GetBooksParams = {
  query?: string
  status?: ReadingStatus
  limit?: number
}

type RawBook = Omit<Book, "memoCount"> & {
  memoCount: { count: number }[]
}

export async function getBooks(params: GetBooksParams = {}): Promise<{ data: Book[] | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "UNAUTHORIZED" }

  let booksQuery = supabase
    .from("books")
    .select("*, memoCount:reading_memos(count)")
    .order("updated_at", { ascending: false })

  if (params.query) {
    booksQuery = booksQuery.or(`title.ilike.%${params.query}%,author.ilike.%${params.query}%`)
  }
  if (params.status) {
    booksQuery = booksQuery.eq("status", params.status)
  }
  if (params.limit) {
    booksQuery = booksQuery.limit(params.limit)
  }

  const { data: booksData, error: booksError } = await booksQuery
  if (booksError) return { data: null, error: booksError.message }
  if (!booksData || booksData.length === 0) return { data: [], error: null }

  const bookIds = booksData.map((b) => b.id)

  const { data: starData } = await supabase
    .from("reading_memos")
    .select("book_id")
    .eq("favorite", true)
    .in("book_id", bookIds)

  const starCountMap = new Map<string, number>()
  for (const row of starData ?? []) {
    starCountMap.set(row.book_id, (starCountMap.get(row.book_id) ?? 0) + 1)
  }

  const books: Book[] = (booksData as unknown as RawBook[]).map((book) => ({
    ...book,
    memoCount: book.memoCount[0]?.count ?? 0,
    starCount: starCountMap.get(book.id) ?? 0,
  }))

  return { data: books, error: null }
}
