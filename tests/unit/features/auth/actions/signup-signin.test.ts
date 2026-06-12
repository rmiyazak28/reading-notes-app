import { describe, it, expect, vi, beforeEach } from "vitest"
import { signUpWithEmail, signInWithEmail } from "@/features/auth/actions"

// ── モック ────────────────────────────────────────────────────────────────────

const { mockSignUp, mockSignInWithPassword } = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
  mockSignInWithPassword: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}))

// ── signUpWithEmail ────────────────────────────────────────────────────────────

describe("signUpWithEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignUp.mockResolvedValue({ error: null })
  })

  describe("正常系", () => {
    it("有効な入力で登録できる", async () => {
      const result = await signUpWithEmail({ name: "テストユーザー", email: "test@example.com", password: "pass1234" })
      expect(result.error).toBeNull()
      expect(mockSignUp).toHaveBeenCalled()
    })
  })

  describe("バリデーションエラー", () => {
    it("ユーザー名が空の場合エラーを返す", async () => {
      const result = await signUpWithEmail({ name: "", email: "test@example.com", password: "pass1234" })
      expect(result.error?.code).toBe("VALIDATION")
      expect(mockSignUp).not.toHaveBeenCalled()
    })

    it("メールアドレス形式が不正の場合エラーを返す", async () => {
      const result = await signUpWithEmail({ name: "テスト", email: "invalid", password: "pass1234" })
      expect(result.error?.code).toBe("VALIDATION")
      expect(mockSignUp).not.toHaveBeenCalled()
    })

    it("パスワードが8文字未満の場合エラーを返す", async () => {
      const result = await signUpWithEmail({ name: "テスト", email: "test@example.com", password: "abc123" })
      expect(result.error?.code).toBe("VALIDATION")
      expect(mockSignUp).not.toHaveBeenCalled()
    })

    it("パスワードが73文字以上の場合エラーを返す", async () => {
      const longPass = "a".repeat(71) + "1".repeat(2)
      const result = await signUpWithEmail({ name: "テスト", email: "test@example.com", password: longPass })
      expect(result.error?.code).toBe("VALIDATION")
      expect(mockSignUp).not.toHaveBeenCalled()
    })

    it("パスワードに英字がない場合エラーを返す", async () => {
      const result = await signUpWithEmail({ name: "テスト", email: "test@example.com", password: "12345678" })
      expect(result.error?.code).toBe("VALIDATION")
      expect(mockSignUp).not.toHaveBeenCalled()
    })

    it("パスワードに数字がない場合エラーを返す", async () => {
      const result = await signUpWithEmail({ name: "テスト", email: "test@example.com", password: "abcdefgh" })
      expect(result.error?.code).toBe("VALIDATION")
      expect(mockSignUp).not.toHaveBeenCalled()
    })
  })

  describe("ユーザー列挙防止", () => {
    it("signUp が失敗しても成功を返す（登録済みメールアドレスを列挙させない）", async () => {
      mockSignUp.mockResolvedValue({ error: { message: "User already registered" } })
      const result = await signUpWithEmail({ name: "テスト", email: "test@example.com", password: "pass1234" })
      expect(result.error).toBeNull()
      expect(result.data).toBeUndefined()
    })
  })
})

// ── signInWithEmail ────────────────────────────────────────────────────────────

describe("signInWithEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignInWithPassword.mockResolvedValue({ error: null })
  })

  describe("正常系", () => {
    it("有効な入力でログインできる", async () => {
      const result = await signInWithEmail({ email: "test@example.com", password: "pass1234" })
      expect(result.error).toBeNull()
      expect(mockSignInWithPassword).toHaveBeenCalled()
    })
  })

  describe("バリデーションエラー", () => {
    it("メールアドレス形式が不正の場合エラーを返す", async () => {
      const result = await signInWithEmail({ email: "invalid", password: "pass1234" })
      expect(result.error?.code).toBe("VALIDATION")
      expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })

    it("パスワードが空の場合エラーを返す", async () => {
      const result = await signInWithEmail({ email: "test@example.com", password: "" })
      expect(result.error?.code).toBe("VALIDATION")
      expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })
  })

  describe("認証エラー", () => {
    it("認証失敗の場合 UNAUTHORIZED を返す", async () => {
      mockSignInWithPassword.mockResolvedValue({ error: { message: "Invalid credentials" } })
      const result = await signInWithEmail({ email: "test@example.com", password: "pass1234" })
      expect(result.error?.code).toBe("UNAUTHORIZED")
    })
  })
})
