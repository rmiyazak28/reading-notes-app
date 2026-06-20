import { describe, it, expect, vi, beforeEach } from "vitest"
import { searchMemos } from "@/features/memos/actions"

const { mockFrom, mockGetUser } = vi.hoisted(() => {
  const mockFrom = vi.fn()
  const mockGetUser = vi.fn()
  return { mockFrom, mockGetUser }
})

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

const baseRawMemo = {
  id: "memo-1",
  user_id: "user-1",
  book_id: "book-1",
  page_number: 42,
  content: "テストメモ内容",
  favorite: false,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
  books: { title: "リーダブルコード", author: "Dustin Boswell" },
  memo_tags: [{ tags: { id: "tag-1", name: "設計" } }],
}

function buildChain(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = ["select", "order", "range", "ilike", "eq"]
  methods.forEach(m => {
    chain[m] = vi.fn(() => chain)
  })
  // range is terminal — return the resolved value
  ;(chain.range as ReturnType<typeof vi.fn>).mockResolvedValue(resolvedValue)
  return chain
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

    it("books情報とタグ付きのメモ一覧を返す", async () => {
      const chain = buildChain({ data: [{ ...baseRawMemo }], error: null })
      mockFrom.mockReturnValue(chain)

      const result = await searchMemos({})

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data![0].book_title).toBe("リーダブルコード")
      expect(result.data![0].book_author).toBe("Dustin Boswell")
      expect(result.data![0].tags).toEqual([{ id: "tag-1", name: "設計" }])
    })

    it("memo_tags が空配列の場合 tags は空配列を返す", async () => {
      const chain = buildChain({ data: [{ ...baseRawMemo, memo_tags: [] }], error: null })
      mockFrom.mockReturnValue(chain)

      const result = await searchMemos({})

      expect(result.data![0].tags).toEqual([])
    })

    it("memo_tags に tags: null が混在する場合はスキップする", async () => {
      const chain = buildChain({ data: [{ ...baseRawMemo, memo_tags: [{ tags: null }] }], error: null })
      mockFrom.mockReturnValue(chain)

      const result = await searchMemos({})

      expect(result.data![0].tags).toEqual([])
    })

    it("books.author が null の場合 book_author は null を返す", async () => {
      const chain = buildChain({
        data: [{ ...baseRawMemo, books: { title: "タイトル", author: null } }],
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await searchMemos({})

      expect(result.data![0].book_author).toBeNull()
    })

    it("books が null の場合 book_title は空文字・book_author は null を返す", async () => {
      const chain = buildChain({ data: [{ ...baseRawMemo, books: null }], error: null })
      mockFrom.mockReturnValue(chain)

      const result = await searchMemos({})

      expect(result.data![0].book_title).toBe("")
      expect(result.data![0].book_author).toBeNull()
    })

    it("DB エラー時に DB_ERROR を返す", async () => {
      const chain = buildChain({ data: null, error: { message: "db error" } })
      mockFrom.mockReturnValue(chain)

      const result = await searchMemos({})

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("DB_ERROR")
    })

    it("返却値に search_text が含まれない", async () => {
      const chain = buildChain({ data: [{ ...baseRawMemo }], error: null })
      mockFrom.mockReturnValue(chain)

      const result = await searchMemos({})

      expect(result.data![0]).not.toHaveProperty("search_text")
    })
  })

  describe("クエリ条件の構築", () => {
    let chain: ReturnType<typeof buildChain>

    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
      chain = buildChain({ data: [], error: null })
      mockFrom.mockReturnValue(chain)
    })

    it("query がある場合に ilike('search_text', '%query%') を呼ぶ", async () => {
      await searchMemos({ query: "命名" })

      expect(chain.ilike).toHaveBeenCalledWith("search_text", "%命名%")
    })

    it("query をトリムして ilike に渡す", async () => {
      await searchMemos({ query: "  命名  " })

      expect(chain.ilike).toHaveBeenCalledWith("search_text", "%命名%")
    })

    it("query が空文字の場合は ilike を呼ばない", async () => {
      await searchMemos({ query: "" })

      expect(chain.ilike).not.toHaveBeenCalled()
    })

    it("query が未指定の場合は ilike を呼ばない", async () => {
      await searchMemos({})

      expect(chain.ilike).not.toHaveBeenCalled()
    })

    it("favoriteOnly: true の場合に eq('favorite', true) を呼ぶ", async () => {
      await searchMemos({ favoriteOnly: true })

      expect(chain.eq).toHaveBeenCalledWith("favorite", true)
    })

    it("favoriteOnly: false の場合は eq を呼ばない", async () => {
      await searchMemos({ favoriteOnly: false })

      expect(chain.eq).not.toHaveBeenCalled()
    })

    it("sortBy を order に渡す", async () => {
      await searchMemos({ sortBy: "updated_at" })

      expect(chain.order).toHaveBeenCalledWith("updated_at", { ascending: false })
    })

    it("sortBy 未指定の場合は created_at DESC でソートする", async () => {
      await searchMemos({})

      expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: false })
    })

    it("limit と offset を range に渡す", async () => {
      await searchMemos({ limit: 100, offset: 50 })

      expect(chain.range).toHaveBeenCalledWith(50, 149)
    })

    it("limit・offset 未指定の場合はデフォルト値（50, 0）で range を呼ぶ", async () => {
      await searchMemos({})

      expect(chain.range).toHaveBeenCalledWith(0, 49)
    })
  })
})
