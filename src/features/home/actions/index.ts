"use server"

import { createClient } from "@/lib/supabase/server"
import type { Book } from "@/features/books/types"
import type { MemoWithTags, Tag } from "@/features/memos/types"

const HOME_LIMIT = 5
const FAVORITE_LIMIT = 10

type ActionError = {
  code: "UNAUTHORIZED" | "DB_ERROR"
  message: string
}

type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: ActionError }

export type HomeMemoWithBook = MemoWithTags & {
  book: { id: string; title: string }
}

export type HomeSummary = {
  totalBooks: number
  readingBookCount: number
  totalMemos: number
  favoriteMemoCount: number
}

export type HomeData = {
  summary: HomeSummary
  recentMemos: HomeMemoWithBook[]
  favoriteMemos: HomeMemoWithBook[]
  readingBooks: Book[]
  tags: Tag[]
}

type RawBook = Omit<Book, "memoCount" | "starCount"> & {
  memoCount: { count: number }[]
}

type RawMemoWithBook = Omit<HomeMemoWithBook, "tags" | "book"> & {
  memo_tags: { tags: { id: string; name: string } | null }[]
  books: { id: string; title: string }
}

function toHomeMemo(raw: RawMemoWithBook): HomeMemoWithBook {
  const { memo_tags, books, ...rest } = raw
  return {
    ...rest,
    tags: memo_tags
      .filter((mt): mt is { tags: Tag } => mt.tags !== null)
      .map((mt) => mt.tags),
    book: books,
  }
}

export async function getHomeData(): Promise<ActionResult<HomeData>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const memoSelect = `*, memo_tags(tags(id, name)), books(id, title)`

  const [
    recentMemosRes,
    favoriteMemosRes,
    readingBooksRes,
    starRes,
    tagsRes,
    totalBooksRes,
    totalMemosRes,
    readingCountRes,
  ] = await Promise.all([
    supabase
      .from("reading_memos")
      .select(memoSelect)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(HOME_LIMIT),
    supabase
      .from("reading_memos")
      .select(memoSelect)
      .eq("user_id", user.id)
      .eq("favorite", true)
      .order("created_at", { ascending: false })
      .limit(FAVORITE_LIMIT),
    supabase
      .from("books")
      .select("*, memoCount:reading_memos(count)")
      .eq("user_id", user.id)
      .eq("status", "reading")
      .order("updated_at", { ascending: false })
      .limit(HOME_LIMIT),
    supabase
      .from("reading_memos")
      .select("book_id")
      .eq("user_id", user.id)
      .eq("favorite", true),
    supabase
      .from("tags")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("books")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("reading_memos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("books")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "reading"),
  ])

  if (recentMemosRes.error) return { data: null, error: { code: "DB_ERROR", message: recentMemosRes.error.message } }
  if (favoriteMemosRes.error) return { data: null, error: { code: "DB_ERROR", message: favoriteMemosRes.error.message } }
  if (readingBooksRes.error) return { data: null, error: { code: "DB_ERROR", message: readingBooksRes.error.message } }

  const starCountMap = new Map<string, number>()
  for (const row of starRes.data ?? []) {
    starCountMap.set(row.book_id, (starCountMap.get(row.book_id) ?? 0) + 1)
  }

  function toBook(raw: RawBook): Book {
    return {
      ...raw,
      memoCount: raw.memoCount[0]?.count ?? 0,
      starCount: starCountMap.get(raw.id) ?? 0,
    }
  }

  return {
    data: {
      summary: {
        totalBooks: totalBooksRes.count ?? 0,
        readingBookCount: readingCountRes.count ?? 0,
        totalMemos: totalMemosRes.count ?? 0,
        favoriteMemoCount: starRes.data?.length ?? 0,
      },
      recentMemos: (recentMemosRes.data as unknown as RawMemoWithBook[]).map(toHomeMemo),
      favoriteMemos: (favoriteMemosRes.data as unknown as RawMemoWithBook[]).map(toHomeMemo),
      readingBooks: (readingBooksRes.data as unknown as RawBook[]).map(toBook),
      tags: (tagsRes.data ?? []) as Tag[],
    },
    error: null,
  }
}
