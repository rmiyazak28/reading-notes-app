"use server"

import { createClient } from "@/lib/supabase/server"
import type { Book, ReadingStatus } from "@/features/books/types"

type GetBooksParams = {
  query?: string
  status?: ReadingStatus
  limit?: number
}

/**
 * Supabase の集計クエリが `reading_memos(count)` を `{ count: number }[]` 形式で返すため、
 * アプリ層の Book 型（memoCount: number）に変換する前の中間型として定義している。
 * 変換後は {@link Book} にキャストして返す。
 */
type RawBook = Omit<Book, "memoCount"> & {
  memoCount: { count: number }[]
}

/**
 * ログインユーザーの書籍一覧を取得する Server Action。
 *
 * @param params - 絞り込み条件
 *   - query: タイトル・著者への部分一致（OR 検索）
 *   - status: 読書状態フィルタ
 *   - limit: 取得件数の上限
 * @returns `{ data: Book[], error: null }` または `{ data: null, error: string }`。
 *   認証未済の場合は error に "UNAUTHORIZED" を返す。
 * @remarks
 *   memoCount は Supabase の集計構文（`reading_memos(count)`）を使ってメインクエリで JOIN 取得するが、
 *   starCount は `favorite=true` に絞ったカウントが必要で、Supabase の集計構文はフィルタ付きカウントを
 *   同一クエリ内に直接記述できないため、別クエリで取得して Map に変換している。
 */
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

  // favorite=true のフィルタ付きカウントが必要なため、Supabase の集計構文では対応できず別クエリで取得する。
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
