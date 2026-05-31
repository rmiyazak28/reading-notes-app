"use server"

import { createClient } from "@/lib/supabase/server"
import type { MemoWithTags, Tag } from "@/features/memos/types"

type ActionError = {
  code: "UNAUTHORIZED" | "VALIDATION" | "NOT_FOUND" | "DB_ERROR" | "UNKNOWN"
  message: string
}

type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: ActionError }

type RawMemo = Omit<MemoWithTags, "tags"> & {
  memo_tags: { tags: { id: string; name: string } | null }[]
}

type GetMemosParams = {
  bookId: string
}

export async function getMemos(params: GetMemosParams): Promise<ActionResult<MemoWithTags[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const { data, error } = await supabase
    .from("reading_memos")
    .select(`
      *,
      memo_tags (
        tags (id, name)
      )
    `)
    .eq("book_id", params.bookId)
    .order("created_at", { ascending: false })

  if (error) return { data: null, error: { code: "DB_ERROR", message: error.message } }

  const memos: MemoWithTags[] = (data as unknown as RawMemo[]).map(({ memo_tags, ...rest }) => ({
    ...rest,
    tags: memo_tags
      .filter((mt): mt is { tags: Tag } => mt.tags !== null)
      .map(mt => mt.tags),
  }))

  return { data: memos, error: null }
}

/**
 * ★ボタンから呼び出す。現在値を取得してから反転するため2クエリになるが、
 * Supabase の update では NOT 演算子を直接記述できないため、この方式を採用している。
 */
export async function toggleFavorite(id: string): Promise<ActionResult<{ favorite: boolean }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const { data: current, error: fetchError } = await supabase
    .from("reading_memos")
    .select("favorite")
    .eq("id", id)
    .single()

  if (fetchError) return { data: null, error: { code: "NOT_FOUND", message: "メモが見つかりません" } }

  const { data, error } = await supabase
    .from("reading_memos")
    .update({ favorite: !current.favorite })
    .eq("id", id)
    .select("favorite")
    .single()

  if (error) return { data: null, error: { code: "DB_ERROR", message: error.message } }

  return { data: { favorite: data.favorite }, error: null }
}

export async function deleteMemo(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const { error } = await supabase
    .from("reading_memos")
    .delete()
    .eq("id", id)

  if (error) return { data: null, error: { code: "DB_ERROR", message: error.message } }

  return { data: undefined, error: null }
}
