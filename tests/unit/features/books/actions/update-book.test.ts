import { describe, it, expect, vi, beforeEach } from "vitest"
import { updateBook } from "@/features/books/actions"

const { mockSingle, mockInsert, mockFrom, mockGetUser } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockSelect = vi.fn(() => ({ single: mockSingle }))
  const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ select: mockSelect })) }))
  const mockInsert = vi.fn(() => ({ select: mockSelect }))
  const mockFrom = vi.fn(() => ({ update: mockUpdate, insert: mockInsert }))
  const mockGetUser = vi.fn()
  return { mockSingle, mockInsert, mockFrom, mockGetUser }
})

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

const validInput = {
  title: "更新タイトル",
  author: "更新著者",
  genre: "IT",
  status: "reading" as const,
  completed_at: null,
}

const dbBook = {
  id: "book-1",
  user_id: "user-1",
  title: "更新タイトル",
  author: "更新著者",
  genre: "IT",
  status: "reading",
  completed_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-05-31T00:00:00Z",
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("updateBook", () => {
  describe("認証エラー", () => {
    it("未認証の場合 UNAUTHORIZED を返す", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const result = await updateBook("book-1", validInput)

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("UNAUTHORIZED")
    })
  })

  describe("バリデーションエラー", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    })

    it("タイトルが空の場合 VALIDATION を返す", async () => {
      const result = await updateBook("book-1", { ...validInput, title: "" })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("VALIDATION")
    })

    it("タイトルが256文字の場合 VALIDATION を返す", async () => {
      const result = await updateBook("book-1", { ...validInput, title: "a".repeat(256) })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("VALIDATION")
    })
  })

  describe("completed_at の自動セット・クリア", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
      mockSingle.mockResolvedValue({ data: { ...dbBook, status: "completed" }, error: null })
    })

    it("status=completed で completed_at が null の場合、今日の日付が自動セットされる", async () => {
      await updateBook("book-1", { ...validInput, status: "completed", completed_at: null })

      const today = new Date().toISOString().split("T")[0]
      const updateCall = mockFrom.mock.results[0].value.update
      const updateArg = updateCall.mock.calls[0][0]
      expect(updateArg.completed_at).toBe(today)
    })

    it("status=completed で completed_at が指定されている場合、その値が使われる", async () => {
      await updateBook("book-1", { ...validInput, status: "completed", completed_at: "2026-03-01" })

      const updateCall = mockFrom.mock.results[0].value.update
      const updateArg = updateCall.mock.calls[0][0]
      expect(updateArg.completed_at).toBe("2026-03-01")
    })

    it("status=reading に変更した場合、completed_at が null にクリアされる", async () => {
      await updateBook("book-1", { ...validInput, status: "reading", completed_at: "2026-03-01" })

      const updateCall = mockFrom.mock.results[0].value.update
      const updateArg = updateCall.mock.calls[0][0]
      expect(updateArg.completed_at).toBeNull()
    })

    it("status=unread に変更した場合、completed_at が null にクリアされる", async () => {
      await updateBook("book-1", { ...validInput, status: "unread", completed_at: "2026-03-01" })

      const updateCall = mockFrom.mock.results[0].value.update
      const updateArg = updateCall.mock.calls[0][0]
      expect(updateArg.completed_at).toBeNull()
    })
  })

  describe("DB エラー", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    })

    it("タイトル重複（UNIQUE 制約違反）の場合 VALIDATION を返す", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate" } })

      const result = await updateBook("book-1", validInput)

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("VALIDATION")
      expect(result.error?.message).toBe("同じタイトルの書籍がすでに登録されています")
    })

    it("その他の DB エラーの場合 DB_ERROR を返す", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: "42P01", message: "table not found" } })

      const result = await updateBook("book-1", validInput)

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("DB_ERROR")
    })
  })

  describe("正常系", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
      mockSingle.mockResolvedValue({ data: dbBook, error: null })
    })

    it("正常更新時に Book を返す", async () => {
      const result = await updateBook("book-1", validInput)

      expect(result.error).toBeNull()
      expect(result.data?.title).toBe("更新タイトル")
    })

    it("著者・ジャンルが null でも正常に更新できる", async () => {
      const result = await updateBook("book-1", { ...validInput, author: null, genre: null })

      expect(result.error).toBeNull()
    })
  })
})
