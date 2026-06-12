import { test, expect } from "@playwright/test"
import {
  createTestDb,
  createTestBook,
  deleteTestBook,
  type TestSupabaseClient,
} from "../../helpers/db"

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

test.describe("INT-04: メモ登録→SCR-06でキーワード検索ヒット確認", () => {
  test.use({ viewport: { width: 1280, height: 800 }, userAgent: DESKTOP_UA, isMobile: false, hasTouch: false })
  test.setTimeout(60000)

  let db: TestSupabaseClient
  let bookId: string
  let bookTitle: string

  test.beforeEach(async () => {
    db = await createTestDb()
    const book = await createTestBook(db)
    bookId = book.id
    bookTitle = book.title
  })

  test.afterEach(async () => {
    await deleteTestBook(db, bookId)
  })

  test("MOD-03で登録したメモが /memos のキーワード検索でヒットし書籍名が表示される", async ({ page }) => {
    const memoContent = `INT04_${Date.now()}`

    await page.goto(`/books/${bookId}`)
    await page.getByRole("button", { name: "メモを追加" }).click()
    await page.getByRole("dialog").getByLabel("メモ内容").fill(memoContent)
    await page.getByRole("button", { name: "登録" }).click()
    await page.getByText("メモを登録しました", { exact: true }).waitFor()

    await page.goto("/memos")
    const searchInput = page.getByPlaceholder("メモ内容・書籍名・著者・タグで検索...")
    await searchInput.fill(memoContent)
    await page.waitForTimeout(500)

    const rows = page.locator("tbody tr").filter({ hasText: memoContent })
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText(bookTitle)
  })
})
