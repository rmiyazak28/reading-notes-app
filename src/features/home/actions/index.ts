"use server"

import { createClient } from "@/lib/supabase/server"
import type { Book } from "@/features/books/types"
import type { MemoWithTags, Tag } from "@/features/memos/types"

const HOME_LIMIT = 5

type ActionError = {
  code: "UNAUTHORIZED" | "DB_ERROR"
  message: string
}

type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: ActionError }

export type HomeData = {
  recentBooks: Book[]
  recentMemos: MemoWithTags[]
  favoriteMemos: MemoWithTags[]
  readingBooks: Book[]
  tags: Tag[]
}

type RawBook = Omit<Book, "memoCount" | "starCount"> & {
  memoCount: { count: number }[]
}

type RawMemo = Omit<MemoWithTags, "tags"> & {
  memo_tags: { tags: { id: string; name: string } | null }[]
}

function toMemoWithTags(raw: RawMemo): MemoWithTags {
  const { memo_tags, ...rest } = raw
  return {
    ...rest,
    tags: memo_tags
      .filter((mt): mt is { tags: Tag } => mt.tags !== null)
      .map((mt) => mt.tags),
  }
}

export async function getHomeData(): Promise<ActionResult<HomeData>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const memoSelect = `*, memo_tags(tags(id, name))`

  const [recentBooksRes, recentMemosRes, favoriteMemosRes, readingBooksRes, starRes, tagsRes] =
    await Promise.all([
      supabase
        .from("books")
        .select("*, memoCount:reading_memos(count)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(HOME_LIMIT),
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
        .limit(HOME_LIMIT),
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
    ])

  if (recentBooksRes.error) return { data: null, error: { code: "DB_ERROR", message: recentBooksRes.error.message } }
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
      recentBooks: (recentBooksRes.data as unknown as RawBook[]).map(toBook),
      recentMemos: (recentMemosRes.data as unknown as RawMemo[]).map(toMemoWithTags),
      favoriteMemos: (favoriteMemosRes.data as unknown as RawMemo[]).map(toMemoWithTags),
      readingBooks: (readingBooksRes.data as unknown as RawBook[]).map(toBook),
      tags: (tagsRes.data ?? []) as Tag[],
    },
    error: null,
  }
}
