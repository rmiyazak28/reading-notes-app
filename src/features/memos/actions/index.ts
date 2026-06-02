"use server"

import { z } from "zod"
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

export async function getUserTags(): Promise<ActionResult<Tag[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const { data, error } = await supabase
    .from("tags")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name")

  if (error) return { data: null, error: { code: "DB_ERROR", message: error.message } }

  return { data: data as Tag[], error: null }
}

const createTagSchema = z.object({
  name: z.string().min(1, "タグ名は必須です").max(50, "50文字以内で入力してください"),
})

export async function createTag(name: string): Promise<ActionResult<Tag>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const parsed = createTagSchema.safeParse({ name })
  if (!parsed.success) {
    return { data: null, error: { code: "VALIDATION", message: parsed.error.issues[0].message } }
  }

  // 同名タグが既存なら upsert して返す
  const { data, error } = await supabase
    .from("tags")
    .upsert({ user_id: user.id, name: parsed.data.name }, { onConflict: "user_id,name" })
    .select("id, name")
    .single()

  if (error) return { data: null, error: { code: "DB_ERROR", message: error.message } }

  return { data: data as Tag, error: null }
}

const createMemoSchema = z.object({
  book_id: z.uuid(),
  page_number: z.number().int().min(1).nullable(),
  content: z.string().min(1, "メモ内容は必須です").max(5000, "5000文字以内で入力してください"),
  tag_ids: z.array(z.uuid()),
  favorite: z.boolean(),
})

type CreateMemoInput = {
  book_id: string
  page_number: number | null
  content: string
  tag_ids: string[]
  favorite: boolean
}

export async function createMemo(input: CreateMemoInput): Promise<ActionResult<MemoWithTags>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const parsed = createMemoSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: { code: "VALIDATION", message: parsed.error.issues[0].message } }
  }

  const { data: memo, error: memoError } = await supabase
    .from("reading_memos")
    .insert({
      user_id: user.id,
      book_id: parsed.data.book_id,
      page_number: parsed.data.page_number,
      content: parsed.data.content,
      favorite: parsed.data.favorite,
    })
    .select()
    .single()

  if (memoError) return { data: null, error: { code: "DB_ERROR", message: memoError.message } }

  if (parsed.data.tag_ids.length > 0) {
    const { error: tagError } = await supabase
      .from("memo_tags")
      .insert(parsed.data.tag_ids.map(tag_id => ({ memo_id: memo.id, tag_id })))

    if (tagError) return { data: null, error: { code: "DB_ERROR", message: tagError.message } }
  }

  // 作成したメモにタグ情報を付けて返す（タグ名は tag_ids から取得）
  const { data: tags, error: tagsError } = await supabase
    .from("tags")
    .select("id, name")
    .in("id", parsed.data.tag_ids)

  if (tagsError) return { data: null, error: { code: "DB_ERROR", message: tagsError.message } }

  return {
    data: { ...memo, tags: (tags ?? []) as Tag[] },
    error: null,
  }
}
