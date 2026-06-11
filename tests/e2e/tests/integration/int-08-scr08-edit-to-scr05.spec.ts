import { test, expect } from "@playwright/test"
import {
  createTestDb,
  createTestBook,
  createTestMemo,
  deleteTestBook,
  deleteTestMemo,
  type TestSupabaseClient,
} from "../../helpers/db"

const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36"

test.describe("INT-08: SCR-08（スマホ）で編集→SCR-05に反映", () => {
  test.use({ viewport: { width: 375, height: 667 }, userAgent: MOBILE_UA })
  test.setTimeout(60000)

  let db: TestSupabaseClient
  let bookId: string
  let memoId: string
  let contentBefore: string
  let contentAfter: string

  test.beforeEach(async () => {
    db = await createTestDb()
    const suffix = Date.now()
    contentBefore = `INT08_編集前_${suffix}`
    contentAfter = `INT08_編集後_${suffix}`
    const book = await createTestBook(db)
    bookId = book.id
    const memo = await createTestMemo(db, bookId, { content: contentBefore })
    memoId = memo.id
  })

  test.afterEach(async () => {
    await deleteTestMemo(db, memoId)
    await deleteTestBook(db, bookId)
  })

  test("SCR-08でメモ内容を編集して更新すると SCR-05 のメモカードに反映される", async ({ page }) => {
    await page.goto(`/books/${bookId}`)
    const memoCard = page.locator("div[class*='cursor-pointer']").filter({ hasText: contentBefore }).first()
    await expect(memoCard).toBeVisible({ timeout: 10000 })
    await memoCard.click()
    await page.waitForURL(/\/memos\/[a-z0-9-]+\/edit/, { timeout: 15000 })

    await page.getByLabel("メモ内容").fill(contentAfter)
    await page.getByRole("button", { name: "更新する" }).click()
    await page.getByText("メモを更新しました", { exact: true }).waitFor()

    await expect(page).toHaveURL(new RegExp(`/books/${bookId}$`))
    await expect(page.getByText(contentAfter)).toBeVisible()
  })
})
