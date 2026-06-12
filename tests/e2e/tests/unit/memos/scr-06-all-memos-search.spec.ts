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
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36"

// ────────────────────────────────────────────
// SCR-06 全メモ検索画面（PC 1280×800）
// ────────────────────────────────────────────
test.describe("SCR-06 全メモ検索画面（PC）", () => {
  // isMobile: false / hasTouch: false で mobile-chrome のデバイス設定を完全上書き
  test.use({ viewport: { width: 1280, height: 800 }, userAgent: DESKTOP_UA, isMobile: false, hasTouch: false })
  test.setTimeout(60000)

  let supabase: TestSupabaseClient
  let bookId: string
  let bookId2: string

  test.beforeEach(async ({ page }) => {
    supabase = await createTestDb()
    const suffix = Date.now()
    const book = await createTestBook(supabase, { title: `E2E_SCR06_書籍A_${suffix}` })
    const book2 = await createTestBook(supabase, { title: `E2E_SCR06_書籍B_${suffix}` })
    bookId = book.id
    bookId2 = book2.id
    await createTestMemo(supabase, bookId, {
      content: `E2E_SCR06_メモ通常_${suffix}`,
      favorite: false,
    })
    await createTestMemo(supabase, bookId, {
      content: `E2E_SCR06_メモお気に入り_${suffix}`,
      favorite: true,
    })
    await createTestMemo(supabase, bookId2, {
      content: `E2E_SCR06_書籍B用メモ_${suffix}`,
      favorite: false,
    })
    await page.goto("/memos")
  })

  test.afterEach(async () => {
    await deleteTestBook(supabase, bookId)
    await deleteTestBook(supabase, bookId2)
  })

  // ── 1. 初期表示 ──
  test.describe("初期表示", () => {
    test("/memos にアクセスすると全メモ検索画面が表示される", async ({ page }) => {
      await expect(page).toHaveURL(/\/memos/)
      await expect(page.getByPlaceholder("メモ内容・書籍名・著者・タグで検索...")).toBeVisible()
    })

    test("テーブル形式でメモ一覧が表示される", async ({ page }) => {
      await expect(page.locator("table")).toBeVisible()
    })

    test("テーブルに6列のヘッダーが表示される", async ({ page }) => {
      const headers = page.locator("thead th")
      await expect(headers).toHaveCount(6)
      await expect(headers.nth(0)).toContainText("書籍名")
      await expect(headers.nth(2)).toContainText("メモ内容")
      await expect(headers.nth(4)).toContainText("★")
    })

    test("件数が「X 件」の形式で表示される", async ({ page }) => {
      await expect(page.locator("text=件").first()).toBeVisible()
    })

    test("ソートのデフォルトが「登録日順」である", async ({ page }) => {
      await expect(page.getByRole("combobox")).toContainText("登録日順")
    })

    test("メモ追加ボタンが存在しない", async ({ page }) => {
      await expect(page.getByRole("button", { name: "メモを追加" })).not.toBeVisible()
    })
  })

  // ── 2. テキスト検索 ──
  test.describe("テキスト検索", () => {
    test("メモ内容の一部を入力すると該当メモに絞り込まれる", async ({ page }) => {
      const suffix = await page.url() // suffixを取得する代わりにページからcontentを探す
      const input = page.getByPlaceholder("メモ内容・書籍名・著者・タグで検索...")
      await input.fill("SCR06_メモお気に入り")
      await page.waitForTimeout(500)
      await expect(page.locator("tbody tr")).toHaveCount(1)
    })

    test("書籍名で検索すると該当書籍のメモに絞り込まれる", async ({ page }) => {
      const input = page.getByPlaceholder("メモ内容・書籍名・著者・タグで検索...")
      await input.fill("SCR06_書籍B")
      await page.waitForTimeout(500)
      const rows = page.locator("tbody tr")
      await expect(rows).toHaveCount(1)
      await expect(rows.first()).toContainText("書籍B用メモ")
    })

    test("検索クリア後に全件表示に戻る", async ({ page }) => {
      const input = page.getByPlaceholder("メモ内容・書籍名・著者・タグで検索...")
      await input.fill("SCR06_メモ通常")
      await page.waitForTimeout(500)
      // 絞り込み中はお気に入りメモが非表示
      await expect(page.locator("tbody tr").filter({ hasText: "SCR06_メモお気に入り" })).toHaveCount(0)
      await input.clear()
      await page.waitForTimeout(500)
      // クリア後は全3件のテストメモが再表示される
      await expect(page.locator("tbody tr").filter({ hasText: "SCR06_メモ通常" })).toHaveCount(1)
      await expect(page.locator("tbody tr").filter({ hasText: "SCR06_メモお気に入り" })).toHaveCount(1)
      await expect(page.locator("tbody tr").filter({ hasText: "書籍B用メモ" })).toHaveCount(1)
    })

    test("検索後にURLクエリパラメータ q が反映される", async ({ page }) => {
      const input = page.getByPlaceholder("メモ内容・書籍名・著者・タグで検索...")
      await input.fill("SCR06_テスト")
      await page.waitForTimeout(500)
      await expect(page).toHaveURL(/q=SCR06/)
    })
  })

  // ── 3. お気に入りフィルタ ──
  test.describe("お気に入りフィルタ", () => {
    test("「お気に入りのみ」をクリックするとfavorite=trueのメモのみ表示される", async ({ page }) => {
      await page.getByRole("button", { name: "お気に入りのみ" }).click()
      await page.waitForTimeout(300)
      const rows = page.locator("tbody tr")
      for (let i = 0; i < await rows.count(); i++) {
        const star = rows.nth(i).locator("button svg")
        await expect(star).toHaveClass(/fill-amber-400/)
      }
    })

    test("お気に入りON時にURLに favorite=1 が反映される", async ({ page }) => {
      await page.getByRole("button", { name: "お気に入りのみ" }).click()
      await expect(page).toHaveURL(/favorite=1/)
    })

    test("お気に入りON後に再クリックすると全件表示に戻る", async ({ page }) => {
      const btn = page.getByRole("button", { name: "お気に入りのみ" })
      await btn.click()
      await page.waitForTimeout(300)
      // ON時は非お気に入りメモが非表示
      await expect(page.locator("tbody tr").filter({ hasText: "SCR06_メモ通常" })).toHaveCount(0)
      await btn.click()
      await page.waitForTimeout(300)
      // OFF後は非お気に入りメモが再表示される
      await expect(page.locator("tbody tr").filter({ hasText: "SCR06_メモ通常" })).toHaveCount(1)
    })
  })

  // ── 4. ソート切り替え ──
  test.describe("ソート切り替え", () => {
    test("「更新日順」に変更するとURLに sort=updated_at が反映される", async ({ page }) => {
      await page.getByRole("combobox").click()
      await page.getByRole("option", { name: "更新日順" }).click()
      await expect(page).toHaveURL(/sort=updated_at/)
    })

    test("「登録日順」に戻すと sort パラメータが消える（またはcreated_at）", async ({ page }) => {
      await page.getByRole("combobox").click()
      await page.getByRole("option", { name: "更新日順" }).click()
      await page.getByRole("combobox").click()
      await page.getByRole("option", { name: "登録日順" }).click()
      await expect(page).not.toHaveURL(/sort=updated_at/)
    })
  })

  // ── 5. テキスト検索とフィルタの組み合わせ ──
  test.describe("テキスト検索とフィルタの組み合わせ", () => {
    test("テキスト検索後にお気に入りONで両条件の AND 絞り込みになる", async ({ page }) => {
      const input = page.getByPlaceholder("メモ内容・書籍名・著者・タグで検索...")
      // お気に入りのみのテストメモ固有文字列で検索（書籍名と被らない文字列）
      await input.fill("SCR06_メモお気に入り")
      // 検索ヒット確認（Playwrightの自動リトライで待機）
      await expect(page.locator("tbody tr").filter({ hasText: "SCR06_メモお気に入り" })).toHaveCount(1, { timeout: 8000 })
      // ネットワークアイドル後にお気に入りフィルタをクリック（mobile-chrome で fetch中のクリックがタイムアウトする対策）
      await page.waitForLoadState("networkidle")
      await page.getByRole("button", { name: "お気に入りのみ" }).click()
      // お気に入りのテストメモは表示される
      await expect(page.locator("tbody tr").filter({ hasText: "SCR06_メモお気に入り" })).toHaveCount(1, { timeout: 8000 })
    })
  })

  // ── 6. お気に入り星トグル ──
  test.describe("お気に入り星トグル（PC テーブル行）", () => {
    test("テーブル行の★をクリックするとお気に入りがONになる", async ({ page }) => {
      const row = page.locator("tbody tr").filter({ hasText: "SCR06_メモ通常" }).first()
      const starBtn = row.locator("button").filter({ has: page.locator("svg") }).first()
      await starBtn.click()
      await expect(starBtn.locator("svg")).toHaveClass(/fill-amber-400/)
    })

    test("★をONにした後に再クリックするとOFFに戻る", async ({ page }) => {
      const row = page.locator("tbody tr").filter({ hasText: "SCR06_メモ通常" }).first()
      const starBtn = row.locator("button").filter({ has: page.locator("svg") }).first()
      await starBtn.click()
      await expect(starBtn.locator("svg")).toHaveClass(/fill-amber-400/)
      await starBtn.click()
      await expect(starBtn.locator("svg")).not.toHaveClass(/fill-amber-400/)
    })
  })

  // ── 7. メモ編集（MOD-04） ──
  test.describe("メモ編集（PC・MOD-04）", () => {
    test("テーブル行をクリックするとメモ編集モーダルが開く", async ({ page }) => {
      const row = page.locator("tbody tr").filter({ hasText: "SCR06_メモ通常" }).first()
      await row.click()
      await expect(page.getByRole("dialog")).toBeVisible()
      await expect(page.getByRole("dialog").getByText("メモを編集")).toBeVisible()
    })

    test("モーダルで内容を更新するとトーストが表示され一覧が即時更新される", async ({ page }) => {
      const row = page.locator("tbody tr").filter({ hasText: "SCR06_メモ通常" }).first()
      await row.click()
      const dialog = page.getByRole("dialog")
      await dialog.getByLabel("メモ内容").fill("SCR06_メモ通常_更新後")
      await page.getByRole("button", { name: "更新" }).click()
      await expect(page.getByText("メモを更新しました", { exact: true })).toBeVisible()
      await expect(page.getByRole("dialog")).not.toBeVisible()
      await expect(page.getByText("SCR06_メモ通常_更新後")).toBeVisible()
    })

    test("モーダルで削除するとトーストが表示されテーブルから行が消える", async ({ page }) => {
      const row = page.locator("tbody tr").filter({ hasText: "SCR06_メモ通常" }).first()
      await row.click()
      await page.getByRole("button", { name: "削除" }).click()
      await page.getByText("メモを削除しますか？").waitFor()
      await page.getByRole("alertdialog").getByRole("button", { name: "削除する" }).click()
      await expect(page.getByText("メモを削除しました", { exact: true })).toBeVisible()
      await expect(page.getByRole("dialog")).not.toBeVisible()
      await expect(page.locator("tbody tr").filter({ hasText: "SCR06_メモ通常" })).toHaveCount(0)
    })
  })

  // ── 8. 空状態 ──
  test.describe("空状態", () => {
    test("ヒットしないキーワードで検索すると「メモが見つかりません」が表示される", async ({ page }) => {
      const input = page.getByPlaceholder("メモ内容・書籍名・著者・タグで検索...")
      await input.fill("ヒットしないキーワードXYZ99999")
      await page.waitForTimeout(500)
      await expect(page.getByText("メモが見つかりません")).toBeVisible()
    })
  })
})

// ────────────────────────────────────────────
// SCR-06 全メモ検索画面（スマホ 375×667）
// ────────────────────────────────────────────
test.describe("SCR-06 全メモ検索画面（スマホ）", () => {
  test.use({ viewport: { width: 375, height: 667 }, userAgent: MOBILE_UA })

  let supabase: TestSupabaseClient
  let bookId: string
  let memoId: string

  test.beforeEach(async ({ page }) => {
    supabase = await createTestDb()
    const suffix = Date.now()
    const book = await createTestBook(supabase, { title: `E2E_SCR06SP_書籍_${suffix}` })
    bookId = book.id
    const memo = await createTestMemo(supabase, bookId, {
      content: `E2E_SCR06SP_メモ通常_${suffix}`,
      favorite: false,
    })
    memoId = memo.id
    await createTestMemo(supabase, bookId, {
      content: `E2E_SCR06SP_メモお気に入り_${suffix}`,
      favorite: true,
    })
    await page.goto("/memos")
  })

  test.afterEach(async () => {
    await deleteTestBook(supabase, bookId)
  })

  test("カード形式でメモ一覧が表示される", async ({ page }) => {
    await expect(page.locator("table")).not.toBeVisible()
    // カード要素（書籍名テキスト）が表示されることを確認
    await expect(page.getByText("SCR06SP_書籍").first()).toBeVisible()
  })

  test("メモ追加ボタン（FAB）が存在しない", async ({ page }) => {
    await expect(page.getByRole("button", { name: "メモを追加" })).not.toBeVisible()
  })

  test("テキスト検索でカード一覧が絞り込まれる", async ({ page }) => {
    const input = page.getByPlaceholder("メモ内容・書籍名・著者・タグで検索...")
    await input.fill("SCR06SP_メモお気に入り")
    await page.waitForTimeout(500)
    await expect(page.getByText("SCR06SP_メモお気に入り").first()).toBeVisible()
    await expect(page.getByText("SCR06SP_メモ通常").first()).not.toBeVisible()
  })

  test("カードの★をタップするとお気に入りがONになる", async ({ page }) => {
    // SCR06SP_メモ通常で検索して対象メモだけ絞り込み、その「お気に入りに追加」ボタンをクリック
    const input = page.getByPlaceholder("メモ内容・書籍名・著者・タグで検索...")
    await input.fill("SCR06SP_メモ通常")
    await page.waitForTimeout(500)
    await expect(page.getByText("SCR06SP_メモ通常").first()).toBeVisible({ timeout: 5000 })
    const starBtn = page.getByRole("button", { name: "お気に入りに追加" }).first()
    await starBtn.click()
    await expect(page.getByRole("button", { name: "お気に入り解除" }).first()).toBeVisible()
  })

  test("カードをタップすると /memos/[id]/edit に遷移する", async ({ page }) => {
    // 検索で対象カードを絞り込んでからクリック
    const input = page.getByPlaceholder("メモ内容・書籍名・著者・タグで検索...")
    await input.fill("SCR06SP_メモ通常")
    await page.waitForTimeout(500)
    await expect(page.getByText("SCR06SP_メモ通常").first()).toBeVisible({ timeout: 5000 })
    await page.getByText("SCR06SP_メモ通常").first().click()
    await expect(page).toHaveURL(/\/memos\/[a-z0-9-]+\/edit/)
  })

  test("SCR-08 から戻ると /memos に戻る", async ({ page }) => {
    // メモIDで直接編集ページにアクセス（from=memos でSCR-06からの遷移を再現）
    await page.goto(`/memos/${memoId}/edit?from=memos`)
    await page.waitForURL(/\/memos\/[a-z0-9-]+\/edit/)
    await page.getByRole("button", { name: "戻る" }).click()
    await page.waitForURL(/\/memos(\?.*)?$/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/memos(\?.*)?$/)
  })
})
