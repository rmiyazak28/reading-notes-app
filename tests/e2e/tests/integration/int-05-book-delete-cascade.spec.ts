import { test, expect } from "@playwright/test"
import {
  createTestDb,
  createTestBook,
  createTestMemo,
  deleteTestBook,
  type TestSupabaseClient,
} from "../../helpers/db"

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

test.describe("INT-05: 書籍削除→関連メモがSCR-06から消える（CASCADE確認）", () => {
  test.use({ viewport: { width: 1280, height: 800 }, userAgent: DESKTOP_UA, isMobile: false, hasTouch: false })
  test.setTimeout(60000)

  let db: TestSupabaseClient
  let bookId: string
  let memoContent: string

  test.beforeEach(async () => {
    db = await createTestDb()
    const suffix = Date.now()
    memoContent = `INT05_CASCADE_${suffix}`
    const book = await createTestBook(db)
    bookId = book.id
    await createTestMemo(db, bookId, { content: memoContent })
  })

  // 書籍はテスト内でUI経由で削除済みのため afterEach でのエラーは無視される（Supabase の delete は該当行なしでもエラーを返さない）
  test.afterEach(async () => {
    await deleteTestBook(db, bookId)
  })

  test("書籍をMOD-02で削除するとCASCADEで関連メモが /memos から消える", async ({ page }) => {
    // 事前確認: /memos で1件ヒットする
    await page.goto("/memos")
    const searchInput = page.getByPlaceholder("メモ内容・書籍名・著者・タグで検索...")
    await searchInput.fill(memoContent)
    await page.waitForTimeout(500)
    await expect(page.locator("tbody tr").filter({ hasText: memoContent })).toHaveCount(1)

    // 書籍詳細へ遷移して削除
    await page.goto(`/books/${bookId}`)
    await page.getByRole("button", { name: "書籍を編集" }).click()
    await page.getByRole("button", { name: "削除" }).click()
    await page.getByRole("button", { name: "削除する" }).click()
    await page.getByText("書籍を削除しました", { exact: true }).waitFor()
    await expect(page).toHaveURL(/\/books$/)

    // /memos で同じキーワードで再検索 → 0件
    await page.goto("/memos")
    await searchInput.fill(memoContent)
    await page.waitForTimeout(500)
    await expect(page.getByText("メモが見つかりません")).toBeVisible()
  })
})
