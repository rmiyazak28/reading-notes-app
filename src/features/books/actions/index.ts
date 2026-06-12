"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/types/actions"
import type { Book, ReadingStatus } from "@/features/books/types"

type CreateBookInput = {
  title: string
  author: string | null
  genre: string | null
  status: ReadingStatus
}

const createBookSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(255, "255文字以内で入力してください"),
  author: z.string().max(255, "255文字以内で入力してください").nullable(),
  genre: z.string().max(100, "100文字以内で入力してください").nullable(),
  status: z.enum(["unread", "reading", "completed"]),
})

/**
 * 書籍を新規登録する Server Action。
 * user_id はセッションから取得し、クライアントからは受け取らない。
 * タイトルの重複（同一ユーザー内）は DB の UNIQUE 制約で弾く。
 */
export async function createBook(input: CreateBookInput): Promise<ActionResult<Book>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const parsed = createBookSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: { code: "VALIDATION", message: parsed.error.issues[0].message } }
  }

  const { data, error } = await supabase
    .from("books")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      author: parsed.data.author,
      genre: parsed.data.genre,
      status: parsed.data.status,
    })
    .select()
    .single()

  if (error) {
    // DB の UNIQUE 制約違反（同一ユーザーで同タイトルが既存）
    if (error.code === "23505") {
      return { data: null, error: { code: "VALIDATION", message: "同じタイトルの書籍がすでに登録されています" } }
    }
    return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }
  }

  return {
    data: { ...data, status: data.status as ReadingStatus, memoCount: 0, starCount: 0 },
    error: null,
  }
}

type UpdateBookInput = {
  title: string
  author: string | null
  genre: string | null
  status: ReadingStatus
  completed_at: string | null
}

const updateBookSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(255, "255文字以内で入力してください"),
  author: z.string().max(255, "255文字以内で入力してください").nullable(),
  genre: z.string().max(100, "100文字以内で入力してください").nullable(),
  status: z.enum(["unread", "reading", "completed"]),
  completed_at: z.string().nullable(),
})

export async function getBook(id: string): Promise<ActionResult<Book>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const { data, error } = await supabase
    .from("books")
    .select("*, memoCount:reading_memos(count)")
    .eq("id", id)
    .single()

  if (error) {
    // PGRST116: 0行または複数行 = 書籍が存在しないか他ユーザーの書籍（RLSで非表示）
    if (error.code === "PGRST116") {
      return { data: null, error: { code: "NOT_FOUND", message: "書籍が見つかりません" } }
    }
    return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }
  }

  const { data: starData } = await supabase
    .from("reading_memos")
    .select("id")
    .eq("book_id", id)
    .eq("favorite", true)

  const book: Book = {
    ...(data as unknown as RawBook),
    memoCount: (data as unknown as RawBook).memoCount[0]?.count ?? 0,
    starCount: starData?.length ?? 0,
  }

  return { data: book, error: null }
}

export async function updateBook(id: string, input: UpdateBookInput): Promise<ActionResult<Book>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const parsed = updateBookSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: { code: "VALIDATION", message: parsed.error.issues[0].message } }
  }

  // status が completed でない場合は completed_at を null にクリアする
  let completedAt = parsed.data.completed_at
  if (parsed.data.status === "completed" && !completedAt) {
    completedAt = new Date().toISOString().split("T")[0]
  } else if (parsed.data.status !== "completed") {
    completedAt = null
  }

  const { data, error } = await supabase
    .from("books")
    .update({
      title: parsed.data.title,
      author: parsed.data.author,
      genre: parsed.data.genre,
      status: parsed.data.status,
      completed_at: completedAt,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return { data: null, error: { code: "VALIDATION", message: "同じタイトルの書籍がすでに登録されています" } }
    }
    return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }
  }

  return { data: { ...data, status: data.status as ReadingStatus, memoCount: 0, starCount: 0 }, error: null }
}

export async function deleteBook(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const { error } = await supabase
    .from("books")
    .delete()
    .eq("id", id)

  if (error) return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }

  return { data: undefined, error: null }
}

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
export async function getBooks(params: GetBooksParams = {}): Promise<ActionResult<Book[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  let booksQuery = supabase
    .from("books")
    .select("*, memoCount:reading_memos(count)")
    .order("updated_at", { ascending: false })

  if (params.query) {
    // PostgREST の or() フィルタ文字列に直接埋め込むため、構文を壊す特殊文字を除去する
    const safeQuery = params.query.replace(/[,()"\\']/g, "")
    booksQuery = booksQuery.or(`title.ilike.%${safeQuery}%,author.ilike.%${safeQuery}%`)
  }
  if (params.status) {
    booksQuery = booksQuery.eq("status", params.status)
  }
  if (params.limit) {
    booksQuery = booksQuery.limit(params.limit)
  }

  const { data: booksData, error: booksError } = await booksQuery
  if (booksError) return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }
  if (!booksData || booksData.length === 0) return { data: [], error: null }

  // .in(bookIds) は書籍数分のUUIDをURLクエリに展開するため件数が増えると極端に低速になる。
  // user_id で絞れば同じ結果が得られるため、そちらを使う。
  const { data: starData } = await supabase
    .from("reading_memos")
    .select("book_id")
    .eq("user_id", user.id)
    .eq("favorite", true)

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
