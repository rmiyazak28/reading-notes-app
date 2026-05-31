import { describe, it, expect, vi, beforeEach } from "vitest"
import { createBook } from "@/features/books/actions"

// vi.mock はファイル先頭にホイストされるため、参照する変数も vi.hoisted() で同じタイミングに初期化する。
const { mockSingle, mockInsert, mockFrom, mockGetUser } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockSelect = vi.fn(() => ({ single: mockSingle }))
  const mockInsert = vi.fn(() => ({ select: mockSelect }))
  const mockFrom = vi.fn(() => ({ insert: mockInsert }))
  const mockGetUser = vi.fn()
  return { mockSingle, mockSelect, mockInsert, mockFrom, mockGetUser }
})

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

const validInput = {
  title: "リーダブルコード",
  author: "Dustin Boswell",
  genre: "IT",
  status: "unread" as const,
}

const dbBook = {
  id: "uuid-1",
  user_id: "user-1",
  title: "リーダブルコード",
  author: "Dustin Boswell",
  genre: "IT",
  status: "unread",
  completed_at: null,
  created_at: "2026-05-31T00:00:00Z",
  updated_at: "2026-05-31T00:00:00Z",
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("createBook", () => {
  describe("認証エラー", () => {
    it("未認証の場合 UNAUTHORIZED を返す", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const result = await createBook(validInput)

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("UNAUTHORIZED")
    })
  })

  describe("バリデーションエラー", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    })

    it("タイトルが空の場合 VALIDATION を返す", async () => {
      const result = await createBook({ ...validInput, title: "" })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("VALIDATION")
    })

    it("タイトルが256文字の場合 VALIDATION を返す", async () => {
      const result = await createBook({ ...validInput, title: "a".repeat(256) })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("VALIDATION")
    })

    it("著者が256文字の場合 VALIDATION を返す", async () => {
      const result = await createBook({ ...validInput, author: "a".repeat(256) })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("VALIDATION")
    })

    it("ジャンルが101文字の場合 VALIDATION を返す", async () => {
      const result = await createBook({ ...validInput, genre: "a".repeat(101) })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("VALIDATION")
    })
  })

  describe("DB エラー", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    })

    it("タイトル重複（UNIQUE 制約違反）の場合 VALIDATION を返す", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate" } })

      const result = await createBook(validInput)

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("VALIDATION")
      expect(result.error?.message).toBe("同じタイトルの書籍がすでに登録されています")
    })

    it("その他の DB エラーの場合 DB_ERROR を返す", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: "42P01", message: "table not found" } })

      const result = await createBook(validInput)

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("DB_ERROR")
    })
  })

  describe("正常系", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    })

    it("正常登録時に Book を返す（memoCount・starCount は 0）", async () => {
      mockSingle.mockResolvedValue({ data: dbBook, error: null })

      const result = await createBook(validInput)

      expect(result.error).toBeNull()
      expect(result.data?.title).toBe("リーダブルコード")
      expect(result.data?.memoCount).toBe(0)
      expect(result.data?.starCount).toBe(0)
    })

    it("著者・ジャンルが null でも正常に登録できる", async () => {
      const bookWithNulls = { ...dbBook, author: null, genre: null }
      mockSingle.mockResolvedValue({ data: bookWithNulls, error: null })

      const result = await createBook({ ...validInput, author: null, genre: null })

      expect(result.error).toBeNull()
      expect(result.data?.author).toBeNull()
      expect(result.data?.genre).toBeNull()
    })

    it("タイトルが255文字（上限値）でも正常に登録できる", async () => {
      const longTitle = "a".repeat(255)
      mockSingle.mockResolvedValue({ data: { ...dbBook, title: longTitle }, error: null })

      const result = await createBook({ ...validInput, title: longTitle })

      expect(result.error).toBeNull()
      expect(result.data?.title).toBe(longTitle)
    })

    it("user_id は DB 呼び出しにセッションの値が使われる", async () => {
      mockSingle.mockResolvedValue({ data: dbBook, error: null })

      await createBook(validInput)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: "user-1" })
      )
    })
  })
})
