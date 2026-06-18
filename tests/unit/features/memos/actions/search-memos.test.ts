import { describe, it, expect, vi, beforeEach } from "vitest"
import { searchMemos } from "@/features/memos/actions"

const { mockRpc, mockGetUser } = vi.hoisted(() => {
  const mockRpc = vi.fn()
  const mockGetUser = vi.fn()
  return { mockRpc, mockGetUser }
})

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  }),
}))

const baseRpcMemo = {
  id: "memo-1",
  user_id: "user-1",
  book_id: "book-1",
  page_number: 42,
  content: "テストメモ内容",
  favorite: false,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
  book_title: "リーダブルコード",
  book_author: "Dustin Boswell",
  tags: [{ id: "tag-1", name: "設計" }],
}

beforeEach(() => {
  vi.clearAllMocks()
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

    it("books情報付きのメモ一覧を返す", async () => {
      mockRpc.mockResolvedValue({ data: [{ ...baseRpcMemo }], error: null })

      const result = await searchMemos({})

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data![0].book_title).toBe("リーダブルコード")
      expect(result.data![0].book_author).toBe("Dustin Boswell")
      expect(result.data![0].tags).toEqual([{ id: "tag-1", name: "設計" }])
    })

    it("tags が空配列の場合そのまま空配列を返す", async () => {
      mockRpc.mockResolvedValue({ data: [{ ...baseRpcMemo, tags: [] }], error: null })

      const result = await searchMemos({})

      expect(result.data![0].tags).toEqual([])
    })

    it("tags が null の場合は空配列にフォールバックする", async () => {
      mockRpc.mockResolvedValue({ data: [{ ...baseRpcMemo, tags: null }], error: null })

      const result = await searchMemos({})

      expect(result.data![0].tags).toEqual([])
    })

    it("book_author が null の場合 null のまま返す", async () => {
      mockRpc.mockResolvedValue({ data: [{ ...baseRpcMemo, book_author: null }], error: null })

      const result = await searchMemos({})

      expect(result.data![0].book_author).toBeNull()
    })

    it("DB エラー時に DB_ERROR を返す", async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: "db error" } })

      const result = await searchMemos({})

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("DB_ERROR")
    })
  })

  describe("RPC 引数の伝達", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
      mockRpc.mockResolvedValue({ data: [], error: null })
    })

    it("user.id が p_user_id として渡る", async () => {
      await searchMemos({})

      expect(mockRpc).toHaveBeenCalledWith("search_memos", expect.objectContaining({ p_user_id: "user-1" }))
    })

    it("query がある場合に p_query としてトリム済み値を渡す", async () => {
      await searchMemos({ query: "命名" })

      expect(mockRpc).toHaveBeenCalledWith("search_memos", expect.objectContaining({ p_query: "命名" }))
    })

    it("query が空文字の場合は p_query に null を渡す", async () => {
      await searchMemos({ query: "" })

      expect(mockRpc).toHaveBeenCalledWith("search_memos", expect.objectContaining({ p_query: null }))
    })

    it("query が未指定の場合は p_query に null を渡す", async () => {
      await searchMemos({})

      expect(mockRpc).toHaveBeenCalledWith("search_memos", expect.objectContaining({ p_query: null }))
    })

    it("favoriteOnly: true の場合に p_favorite_only: true を渡す", async () => {
      await searchMemos({ favoriteOnly: true })

      expect(mockRpc).toHaveBeenCalledWith("search_memos", expect.objectContaining({ p_favorite_only: true }))
    })

    it("favoriteOnly: false の場合に p_favorite_only: false を渡す", async () => {
      await searchMemos({ favoriteOnly: false })

      expect(mockRpc).toHaveBeenCalledWith("search_memos", expect.objectContaining({ p_favorite_only: false }))
    })

    it("sortBy が p_sort_by として渡る", async () => {
      await searchMemos({ sortBy: "updated_at" })

      expect(mockRpc).toHaveBeenCalledWith("search_memos", expect.objectContaining({ p_sort_by: "updated_at" }))
    })

    it("limit と offset が p_limit・p_offset として渡る", async () => {
      await searchMemos({ limit: 100, offset: 50 })

      expect(mockRpc).toHaveBeenCalledWith("search_memos", expect.objectContaining({
        p_limit: 100,
        p_offset: 50,
      }))
    })
  })
})
