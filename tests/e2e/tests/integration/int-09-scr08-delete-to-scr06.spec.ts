import { test, expect } from "@playwright/test"
import {
  createTestDb,
  createTestBook,
  createTestMemo,
  deleteTestBook,
  type TestSupabaseClient,
} from "../../helpers/db"

const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36"

test.describe("INT-09: SCR-08（スマホ）で削除→SCR-06から行が消える", () => {
  test.use({ viewport: { width: 375, height: 667 }, userAgent: MOBILE_UA })
  test.setTimeout(60000)

  let db: TestSupabaseClient
  let bookId: string
  let memoContent: string

  test.beforeEach(async () => {
    db = await createTestDb()
    const suffix = Date.now()
    memoContent = `INT09_削除_${suffix}`
    const book = await createTestBook(db)
    bookId = book.id
    await createTestMemo(db, bookId, { content: memoContent })
  })

  // メモはテスト内でUI経由で削除済みのため deleteTestMemo は呼ばない
  test.afterEach(async () => {
    await deleteTestBook(db, bookId)
  })

  test("SCR-08でメモを削除すると /memos のカード一覧から消える", async ({ page }) => {
    await page.goto("/memos")
    const searchInput = page.getByPlaceholder("メモ内容・書籍名・著者・タグで検索...")
    await searchInput.fill(memoContent)
    await page.waitForTimeout(500)
    await expect(page.getByText(memoContent).first()).toBeVisible({ timeout: 8000 })

    await page.getByText(memoContent).first().click()
    await page.waitForURL(/\/memos\/[a-z0-9-]+\/edit/)

    await page.getByRole("button", { name: "削除する" }).click()
    await page.getByText("メモを削除しますか？").waitFor()
    await page.getByRole("alertdialog").getByRole("button", { name: "削除する" }).click()
    await page.getByText("メモを削除しました", { exact: true }).waitFor()

    await page.waitForURL(/\/memos(\?.*)?$/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/memos(\?.*)?$/)

    await searchInput.fill(memoContent)
    await page.waitForTimeout(500)
    await expect(page.getByText("メモが見つかりません")).toBeVisible()
  })
})
