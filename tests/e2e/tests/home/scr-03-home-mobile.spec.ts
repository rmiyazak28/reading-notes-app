import { test, expect, devices } from "@playwright/test"
import {
  createTestDb,
  createTestBook,
  createTestMemo,
  deleteTestBook,
  deleteTestMemo,
  type TestSupabaseClient,
} from "../../helpers/db"

test.use({ ...devices["Pixel 5"] })

async function selectBookStatus(page: Page, value: "unread" | "reading" | "completed"): Promise<void> {
  const labelMap = { unread: "未読", reading: "読書中", completed: "読了" }
  await page.getByRole("combobox").click()
  await page.getByRole("option", { name: labelMap[value] }).click()
}

test.describe("SCR-03 ホーム画面（スマホ）", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/home")
  })

  // ── 1. サマリーバー ──
  test("4つのサマリーカードが表示される", async ({ page }) => {
    const summary = page.locator(".grid").first()
    await expect(summary.locator("p", { hasText: "読書中" }).first()).toBeVisible()
    await expect(summary.locator("p", { hasText: "総書籍数" })).toBeVisible()
    await expect(summary.locator("p", { hasText: "総メモ数" })).toBeVisible()
    await expect(summary.locator("p", { hasText: "お気に入り" })).toBeVisible()
  })

  // ── 2. FAB ──
  test.describe("FAB", () => {
    test("FABが表示される", async ({ page }) => {
      await expect(page.getByRole("button", { name: "書籍を追加" })).toBeVisible()
    })

    test("FABをタップ → 書籍登録モーダルが開く", async ({ page }) => {
      await page.getByRole("button", { name: "書籍を追加" }).tap()
      await expect(page.getByRole("dialog")).toBeVisible()
    })

    test("「読書中」で登録 → 「読書中」セクションに即時追加される", async ({ page }) => {
      const title = `E2E_SP_読書中_${Date.now()}`
      await page.getByRole("button", { name: "書籍を追加" }).tap()
      await page.getByLabel("タイトル").fill(title)
      await selectBookStatus(page, "reading")
      await page.getByRole("button", { name: "登録" }).click()
      await expect(page.getByText("書籍を登録しました", { exact: true })).toBeVisible()

      const readingSection = page.locator("section").filter({ hasText: "読書中" })
      await expect(readingSection.getByText(title)).toBeVisible()
    })
  })

  // ── 3. メモカードをタップ → SCR-08 に遷移 ──
  test.describe("メモ編集", () => {
    let db: TestSupabaseClient
    let bookId: string
    let memoId: string

    test.beforeEach(async () => {
      db = await createTestDb()
      const book = await createTestBook(db, { status: "reading" })
      bookId = book.id
      const memo = await createTestMemo(db, bookId, { content: "E2Eスマホ編集用メモ" })
      memoId = memo.id
    })

    test.afterEach(async () => {
      await deleteTestMemo(db, memoId)
      await deleteTestBook(db, bookId)
    })

    test("メモカードをタップ → /memos/[id]/edit に遷移する", async ({ page }) => {
      await page.reload()
      const recentSection = page.locator("section").filter({ hasText: "最近のメモ" })
      // スマホ横スクロールカード内のターゲットメモカードをタップ
      const targetCard = recentSection
        .locator(".flex.gap-3 > *")
        .filter({ hasText: "E2Eスマホ編集用メモ" })
      await expect(targetCard).toBeVisible()
      await targetCard.tap()
      await expect(page).toHaveURL(/\/memos\/[^/]+\/edit/)
    })
  })

  // ── 4. お気に入り切り替え ──
  test.describe("お気に入り切り替え", () => {
    let db: TestSupabaseClient
    let bookId: string
    let memoId: string

    test.beforeEach(async () => {
      db = await createTestDb()
      const book = await createTestBook(db, { status: "reading" })
      bookId = book.id
      // favorite=false のメモを用意
      const memo = await createTestMemo(db, bookId, { content: "E2Eスマホ★ON用メモ", favorite: false })
      memoId = memo.id
    })

    test.afterEach(async () => {
      await deleteTestMemo(db, memoId)
      await deleteTestBook(db, bookId)
    })

    test("「最近のメモ」カードの★をタップしてON → 「お気に入りメモ」に追加される", async ({ page }) => {
      await page.reload()
      const recentSection = page.locator("section").filter({ hasText: "最近のメモ" })
      const targetCard = recentSection
        .locator(".flex.gap-3 > *")
        .filter({ hasText: "E2Eスマホ★ON用メモ" })
      await expect(targetCard).toBeVisible()

      await targetCard.getByRole("button", { name: "お気に入りに追加" }).tap()
      await page.waitForTimeout(500)

      const favSection = page.locator("section").filter({ hasText: "お気に入りメモ" })
      await expect(favSection.getByText("E2Eスマホ★ON用メモ", { exact: false })).toBeVisible()
    })
  })

  // ── 5. セクションリンク ──
  test.describe("セクションリンク", () => {
    test("「一覧を見る」（読書中）→ /books?status=reading に遷移する", async ({ page }) => {
      await page.getByRole("link", { name: /一覧を見る/ }).first().click()
      await expect(page).toHaveURL(/\/books\?status=reading/)
    })

    test("「全メモ検索」→ /memos に遷移する", async ({ page }) => {
      await page.getByRole("link", { name: /全メモ検索/ }).click()
      await expect(page).toHaveURL(/\/memos/)
    })

    test("「一覧を見る」（お気に入りメモ）→ /favorites に遷移する", async ({ page }) => {
      await page.getByRole("link", { name: /一覧を見る/ }).last().click()
      await expect(page).toHaveURL(/\/favorites/)
    })
  })
})
