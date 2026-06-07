import { describe, it, expect, vi, beforeEach } from "vitest"
import { searchMemos } from "@/features/memos/actions"

// Supabase クエリビルダーはメソッドチェーンで条件を積み上げるため、
// 全メソッドが自身を返すフルエントなモックオブジェクトを用意して、
// range() だけを vi.fn() として resolve 値を制御する。
const { mockRange, mockGetUser } = vi.hoisted(() => {
  const mockRange = vi.fn()
  const mockGetUser = vi.fn()
  return { mockRange, mockGetUser }
})

// フルエントなビルダーオブジェクト。メソッドはすべて自身を返す。
const builder: Record<string, unknown> = {}
const chainMethods = ["select", "order", "eq", "or", "filter"]
for (const m of chainMethods) {
  builder[m] = vi.fn(() => builder)
}
builder["range"] = mockRange

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => builder),
  }),
}))

const baseMemo = {
  id: "memo-1",
  user_id: "user-1",
  book_id: "book-1",
  page_number: 42,
  content: "テストメモ内容",
  favorite: false,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
  memo_tags: [],
  books: { title: "リーダブルコード", author: "Dustin Boswell" },
}

beforeEach(() => {
  vi.clearAllMocks()
  // チェーンメソッドも毎回リセット後に再設定する
  for (const m of chainMethods) {
    (builder[m] as ReturnType<typeof vi.fn>).mockReturnValue(builder)
  }
})

describe("searchMemos", () => {
  describe("認証エラー", () => {
    it("未認証の場合 UNAUTHORIZED を返す", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const result = await searchMemos({})

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("UNAUTHORIZED")
    })
  })

  describe("正常系", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    })

    it("メモ一覧を books 情報付きで返す", async () => {
      mockRange.mockResolvedValue({
        data: [{ ...baseMemo, memo_tags: [{ tags: { id: "tag-1", name: "設計" } }] }],
        error: null,
      })

      const result = await searchMemos({})

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data![0].book_title).toBe("リーダブルコード")
      expect(result.data![0].book_author).toBe("Dustin Boswell")
      expect(result.data![0].tags).toEqual([{ id: "tag-1", name: "設計" }])
    })

    it("memo_tags が空の場合 tags が空配列になる", async () => {
      mockRange.mockResolvedValue({
        data: [{ ...baseMemo, memo_tags: [] }],
        error: null,
      })

      const result = await searchMemos({})

      expect(result.data![0].tags).toEqual([])
    })

    it("books が null の場合 book_title が空文字・book_author が null になる", async () => {
      mockRange.mockResolvedValue({
        data: [{ ...baseMemo, books: null, memo_tags: [] }],
        error: null,
      })

      const result = await searchMemos({})

      expect(result.data![0].book_title).toBe("")
      expect(result.data![0].book_author).toBeNull()
    })

    it("DB エラー時 DB_ERROR を返す", async () => {
      mockRange.mockResolvedValue({ data: null, error: { message: "db error" } })

      const result = await searchMemos({})

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("DB_ERROR")
    })

    it("favoriteOnly=true のとき eq('favorite', true) が呼ばれる", async () => {
      mockRange.mockResolvedValue({ data: [], error: null })

      await searchMemos({ favoriteOnly: true })

      expect(builder["eq"]).toHaveBeenCalledWith("favorite", true)
    })

    it("favoriteOnly=false のとき eq は呼ばれない", async () => {
      mockRange.mockResolvedValue({ data: [], error: null })

      await searchMemos({ favoriteOnly: false })

      expect(builder["eq"]).not.toHaveBeenCalled()
    })

    it("query がある場合 or() が呼ばれる", async () => {
      mockRange.mockResolvedValue({ data: [], error: null })

      await searchMemos({ query: "テスト" })

      expect(builder["or"]).toHaveBeenCalled()
    })

    it("query が空文字の場合 or() は呼ばれない", async () => {
      mockRange.mockResolvedValue({ data: [], error: null })

      await searchMemos({ query: "" })

      expect(builder["or"]).not.toHaveBeenCalled()
    })
  })

  describe("クライアントサイドフィルタ（query あり）", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    })

    it("query がメモ内容に部分一致するメモだけ返す", async () => {
      mockRange.mockResolvedValue({
        data: [
          { ...baseMemo, id: "m1", content: "命名は重要", memo_tags: [], books: { title: "本A", author: null } },
          { ...baseMemo, id: "m2", content: "全く関係ない", memo_tags: [], books: { title: "本B", author: null } },
        ],
        error: null,
      })

      const result = await searchMemos({ query: "命名" })

      expect(result.data).toHaveLength(1)
      expect(result.data![0].id).toBe("m1")
    })

    it("query が書籍名に部分一致するメモだけ返す", async () => {
      mockRange.mockResolvedValue({
        data: [
          { ...baseMemo, id: "m1", content: "xyz", memo_tags: [], books: { title: "リーダブルコード", author: null } },
          { ...baseMemo, id: "m2", content: "xyz", memo_tags: [], books: { title: "別書籍", author: null } },
        ],
        error: null,
      })

      const result = await searchMemos({ query: "リーダブル" })

      expect(result.data).toHaveLength(1)
      expect(result.data![0].id).toBe("m1")
    })

    it("query がタグ名に部分一致するメモだけ返す", async () => {
      mockRange.mockResolvedValue({
        data: [
          {
            ...baseMemo, id: "m1", content: "xyz",
            memo_tags: [{ tags: { id: "t1", name: "設計" } }],
            books: { title: "本A", author: null },
          },
          {
            ...baseMemo, id: "m2", content: "xyz",
            memo_tags: [{ tags: { id: "t2", name: "読書" } }],
            books: { title: "本B", author: null },
          },
        ],
        error: null,
      })

      const result = await searchMemos({ query: "設計" })

      expect(result.data).toHaveLength(1)
      expect(result.data![0].id).toBe("m1")
    })

    it("query が著者名に部分一致するメモだけ返す", async () => {
      mockRange.mockResolvedValue({
        data: [
          { ...baseMemo, id: "m1", content: "xyz", memo_tags: [], books: { title: "本A", author: "山田太郎" } },
          { ...baseMemo, id: "m2", content: "xyz", memo_tags: [], books: { title: "本B", author: "佐藤花子" } },
        ],
        error: null,
      })

      const result = await searchMemos({ query: "山田" })

      expect(result.data).toHaveLength(1)
      expect(result.data![0].id).toBe("m1")
    })

    it("query が空文字の場合全件返す（クライアントフィルタなし）", async () => {
      mockRange.mockResolvedValue({
        data: [
          { ...baseMemo, id: "m1", memo_tags: [], books: { title: "本A", author: null } },
          { ...baseMemo, id: "m2", memo_tags: [], books: { title: "本B", author: null } },
        ],
        error: null,
      })

      const result = await searchMemos({ query: "" })

      expect(result.data).toHaveLength(2)
    })
  })
})
