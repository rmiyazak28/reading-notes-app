import { test, expect, type Page } from "@playwright/test"
import {
  createTestDb,
  createTestBook,
  createTestMemo,
  deleteTestBook,
  deleteTestMemo,
  type TestSupabaseClient,
} from "../../helpers/db"

const EMAIL = process.env.E2E_TEST_EMAIL
const PASSWORD = process.env.E2E_TEST_PASSWORD

async function login(page: Page): Promise<void> {
  await page.goto("/login")
  await page.getByLabel("メールアドレス").fill(EMAIL!)
  await page.getByLabel("パスワード").fill(PASSWORD!)
  await page.getByRole("button", { name: "ログイン" }).click()
  await page.waitForURL("**/home")
}

/** Radix UI の Select で指定値を選択する */
async function selectBookStatus(page: Page, value: "unread" | "reading" | "completed"): Promise<void> {
  const labelMap = { unread: "未読", reading: "読書中", completed: "読了" }
  await page.getByRole("combobox").click()
  await page.getByRole("option", { name: labelMap[value] }).click()
}

// ────────────────────────────────────────────
// PC（Desktop Chrome）
// ────────────────────────────────────────────
test.describe("SCR-03 ホーム画面（PC）", () => {
  test.beforeEach(async ({ page }) => {
    if (!EMAIL || !PASSWORD) test.skip()
    await login(page)
  })

  // ── 1. サマリーバー ──
  test.describe("サマリーバー", () => {
    test("4つのサマリーカードが表示される", async ({ page }) => {
      const summary = page.locator(".grid").first()
      await expect(summary.locator("p", { hasText: "読書中" }).first()).toBeVisible()
      await expect(summary.locator("p", { hasText: "総書籍数" })).toBeVisible()
      await expect(summary.locator("p", { hasText: "総メモ数" })).toBeVisible()
      await expect(summary.locator("p", { hasText: "お気に入り" })).toBeVisible()
    })
  })

  // ── 2. セクション構成 ──
  test.describe("セクション構成", () => {
    test("3つのセクション見出しが表示される", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "読書中" })).toBeVisible()
      await expect(page.getByRole("heading", { name: "最近のメモ" })).toBeVisible()
      await expect(page.getByRole("heading", { name: "お気に入りメモ" })).toBeVisible()
    })
  })

  // ── 3. セクションリンク ──
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

  // ── 4. 書籍追加（PC） ──
  test.describe("書籍追加", () => {
    test("「書籍を追加」ボタンをクリック → 書籍登録モーダルが開く", async ({ page }) => {
      await page.getByRole("button", { name: "書籍を追加" }).click()
      await expect(page.getByRole("dialog")).toBeVisible()
    })

    test("「読書中」で登録 → 「読書中」セクションに即時追加される", async ({ page }) => {
      const title = `E2E_読書中_${Date.now()}`
      await page.getByRole("button", { name: "書籍を追加" }).click()
      await page.getByLabel("タイトル").fill(title)
      await selectBookStatus(page, "reading")
      await page.getByRole("button", { name: "登録" }).click()
      await expect(page.getByText("書籍を登録しました", { exact: true })).toBeVisible()
      await expect(page.getByRole("dialog")).not.toBeVisible()

      const readingSection = page.locator("section").filter({ hasText: "読書中" }).first()
      await expect(readingSection.getByText(title)).toBeVisible()
    })

    test("「未読」で登録 → 「読書中」セクションに追加されない", async ({ page }) => {
      const title = `E2E_未読_${Date.now()}`
      await page.getByRole("button", { name: "書籍を追加" }).click()
      await page.getByLabel("タイトル").fill(title)
      // デフォルトが「未読」なのでそのまま登録
      await page.getByRole("button", { name: "登録" }).click()
      await expect(page.getByText("書籍を登録しました", { exact: true })).toBeVisible()

      const readingSection = page.locator("section").filter({ hasText: "読書中" }).first()
      await expect(readingSection.getByText(title)).not.toBeVisible()
    })
  })

  // ── 5. メモのお気に入り切り替え ──
  test.describe("メモのお気に入り切り替え", () => {
    let db: TestSupabaseClient
    let bookId: string
    let memoId: string

    // ★ONテスト: favorite=false のメモを用意する
    test.describe("★をONにする", () => {
      test.beforeEach(async () => {
        db = await createTestDb()
        const book = await createTestBook(db, { status: "reading" })
        bookId = book.id
        const memo = await createTestMemo(db, bookId, { content: "E2E★ON用メモ", favorite: false })
        memoId = memo.id
      })

      test.afterEach(async () => {
        await deleteTestMemo(db, memoId)
        await deleteTestBook(db, bookId)
      })

      test("「最近のメモ」の★をON → 「お気に入りメモ」セクションに即時追加される", async ({ page }) => {
        await page.reload()
        const recentSection = page.locator("section").filter({ hasText: "最近のメモ" })
        const addBtn = recentSection.getByRole("button", { name: "お気に入りに追加" }).first()
        await expect(addBtn).toBeVisible()

        await addBtn.click()
        await page.waitForTimeout(500)

        const favSection = page.locator("section").filter({ hasText: "お気に入りメモ" })
        await expect(favSection.getByText("E2E★ON用メモ", { exact: false })).toBeVisible()
      })
    })

    // ★OFFテスト: favorite=true のメモを用意する
    test.describe("★をOFFにする", () => {
      test.beforeEach(async () => {
        db = await createTestDb()
        const book = await createTestBook(db, { status: "reading" })
        bookId = book.id
        const memo = await createTestMemo(db, bookId, { content: "E2E★OFF用メモ", favorite: true })
        memoId = memo.id
      })

      test.afterEach(async () => {
        await deleteTestMemo(db, memoId)
        await deleteTestBook(db, bookId)
      })

      test("「お気に入りメモ」の★をOFF → セクションから即時除去される", async ({ page }) => {
        await page.reload()
        const favSection = page.locator("section").filter({ hasText: "お気に入りメモ" })
        const targetMemo = favSection.getByText("E2E★OFF用メモ", { exact: false })
        await expect(targetMemo).toBeVisible()

        const removeBtns = favSection.getByRole("button", { name: "お気に入り解除" })
        const countBefore = await removeBtns.count()
        // 作成したメモ行の★ボタンをクリック
        await favSection.locator("div[class*='cursor-pointer']")
          .filter({ hasText: "E2E★OFF用メモ" })
          .getByRole("button", { name: "お気に入り解除" })
          .click()
        await page.waitForTimeout(500)

        await expect(favSection.getByRole("button", { name: "お気に入り解除" })).toHaveCount(countBefore - 1)
      })
    })
  })

  // ── 6. メモ編集モーダル（PC・MOD-04） ──
  test.describe("メモ編集（PC）", () => {
    let db: TestSupabaseClient
    let bookId: string
    let memoId: string

    test.beforeEach(async () => {
      db = await createTestDb()
      const book = await createTestBook(db, { status: "reading" })
      bookId = book.id
      const memo = await createTestMemo(db, bookId, { content: "E2E編集用メモ" })
      memoId = memo.id
    })

    test.afterEach(async () => {
      // 削除テストで既に消えている場合もあるため、エラーは無視
      await deleteTestMemo(db, memoId)
      await deleteTestBook(db, bookId)
    })

    test("「最近のメモ」の行をクリック → メモ編集モーダルが開く", async ({ page }) => {
      await page.reload()
      const recentSection = page.locator("section").filter({ hasText: "最近のメモ" })
      const targetRow = recentSection
        .locator("div[class*='cursor-pointer']")
        .filter({ hasText: "E2E編集用メモ" })
      await expect(targetRow).toBeVisible()
      await targetRow.click()
      await expect(page.getByRole("dialog")).toBeVisible()
    })

    test("メモ内容を変更して「更新」→ トーストが表示され行が更新される", async ({ page }) => {
      await page.reload()
      const recentSection = page.locator("section").filter({ hasText: "最近のメモ" })
      const targetRow = recentSection
        .locator("div[class*='cursor-pointer']")
        .filter({ hasText: "E2E編集用メモ" })
      await expect(targetRow).toBeVisible()
      await targetRow.click()
      await expect(page.getByRole("dialog")).toBeVisible()

      const textarea = page.getByRole("textbox", { name: /メモ内容|内容/ })
      await textarea.fill(`E2E更新済み_${Date.now()}`)
      await page.getByRole("button", { name: "更新" }).click()

      await expect(page.getByText("メモを更新しました", { exact: true })).toBeVisible()
      await expect(page.getByRole("dialog")).not.toBeVisible()
    })

    test("「削除」→「削除する」→ トーストが表示され行が消える", async ({ page }) => {
      await page.reload()
      const recentSection = page.locator("section").filter({ hasText: "最近のメモ" })
      const targetRow = recentSection
        .locator("div[class*='cursor-pointer']")
        .filter({ hasText: "E2E編集用メモ" })
      await expect(targetRow).toBeVisible()

      await targetRow.click()
      await expect(page.getByRole("dialog")).toBeVisible()

      await page.getByRole("button", { name: "削除" }).click()
      await page.getByRole("button", { name: "削除する" }).click()

      await expect(page.getByText("メモを削除しました", { exact: true })).toBeVisible()
      await expect(page.getByRole("dialog")).not.toBeVisible()
      await expect(recentSection.getByText("E2E編集用メモ", { exact: false })).not.toBeVisible()
    })
  })

  // ── 7. PC でのボタン表示 ──
  test.describe("レスポンシブ（PC）", () => {
    test("「書籍を追加」ボタンが表示され、FABは表示されない", async ({ page }) => {
      await expect(page.getByRole("button", { name: "書籍を追加" })).toBeVisible()
      await expect(page.locator("button[aria-label='書籍を追加'].rounded-full")).not.toBeVisible()
    })
  })
})


// ────────────────────────────────────────────
// 空状態（PC）
// ────────────────────────────────────────────
test.describe("SCR-03 空状態メッセージ", () => {
  test.beforeEach(async ({ page }) => {
    if (!EMAIL || !PASSWORD) test.skip()
    await login(page)
  })

  test("「最近のメモ」: 空メッセージまたはメモ行が表示される", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "最近のメモ" })).toBeVisible()
    const isEmpty = (await page.getByText("メモがまだ登録されていません").count()) > 0
    const hasItems = (await page.locator("div[class*='cursor-pointer']").count()) > 0
    expect(isEmpty || hasItems).toBeTruthy()
  })

  test("「お気に入りメモ」: 空メッセージまたはメモ行が表示される", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "お気に入りメモ" })).toBeVisible()
    const isEmpty = (await page.getByText("お気に入りメモはまだありません").count()) > 0
    const hasItems = (await page.locator("div[class*='cursor-pointer']").count()) > 0
    expect(isEmpty || hasItems).toBeTruthy()
  })

  test("「読書中」: 空メッセージまたは書籍行が表示される", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "読書中" })).toBeVisible()
    const isEmpty = (await page.getByText("読書中の書籍はありません").count()) > 0
    const hasItems = (await page.locator("div[class*='cursor-pointer']").count()) > 0
    expect(isEmpty || hasItems).toBeTruthy()
  })
})
