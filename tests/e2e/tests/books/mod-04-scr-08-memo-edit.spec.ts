import { test, expect, type Page } from "@playwright/test"

const EMAIL = process.env.E2E_TEST_EMAIL
const PASSWORD = process.env.E2E_TEST_PASSWORD

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36"

async function login(page: Page): Promise<void> {
  await page.goto("/login")
  await page.getByLabel("メールアドレス").fill(EMAIL!)
  await page.getByLabel("パスワード").fill(PASSWORD!)
  await page.getByRole("button", { name: "ログイン" }).click()
  await page.waitForURL("**/home")
  await page.goto("/books")
}

/** 書籍を登録して詳細ページへ遷移し、書籍IDを返す */
async function createBookAndGoToDetail(
  page: Page,
  suffix = ""
): Promise<{ bookId: string }> {
  const title = `E2E編集テスト${suffix}_${Date.now()}`
  await page.getByRole("button", { name: "書籍を追加" }).click()
  await page.getByLabel("タイトル").fill(title)
  await page.getByRole("button", { name: "登録" }).click()
  await page.getByText("書籍を登録しました", { exact: true }).waitFor()
  await page.getByText(title).first().click()
  await page.waitForURL(/\/books\/[a-z0-9-]+/)
  const bookId = page.url().split("/books/")[1].split("/")[0]
  return { bookId }
}

/** メモを登録してメモIDを返す（PC モーダル経由） */
async function createMemo(
  page: Page,
  content: string,
  options: { pageNumber?: string; favorite?: boolean } = {}
): Promise<{ memoId: string }> {
  await page.getByRole("button", { name: "メモを追加" }).click()
  const dialog = page.getByRole("dialog")
  if (options.pageNumber) {
    await dialog.getByLabel("ページ数").fill(options.pageNumber)
  }
  await dialog.getByLabel("メモ内容").fill(content)
  if (options.favorite) {
    await dialog.getByRole("button", { name: /お気に入り/ }).click()
  }
  await page.getByRole("button", { name: "登録" }).click()
  await page.getByText("メモを登録しました", { exact: true }).waitFor()
  await expect(page.getByRole("dialog")).not.toBeVisible()
  // テーブル行またはカードからメモIDを取得
  // PC: tr[data-memo-id] / Mobile: 最初のメモカードのリンクから取得
  const row = page.locator("tr").filter({ hasText: content }).first()
  const memoId = await row.getAttribute("data-memo-id").catch(() => null)
  return { memoId: memoId ?? "" }
}

// ────────────────────────────────────────────
// MOD-04 読書メモ編集モーダル（PC）
// ────────────────────────────────────────────
test.describe("MOD-04 読書メモ編集モーダル（PC）", () => {
  test.use({ viewport: { width: 1280, height: 800 }, userAgent: DESKTOP_UA })

  test.beforeEach(async ({ page }) => {
    if (!EMAIL || !PASSWORD) test.skip()
    await login(page)
  })

  test.describe("モーダルの開閉と初期値", () => {
    test("メモ行をクリック → 編集モーダルが開く", async ({ page }) => {
      await createBookAndGoToDetail(page)
      await createMemo(page, "編集テストメモ")
      await page.getByRole("row").filter({ hasText: "編集テストメモ" }).click()
      await expect(page.getByRole("dialog")).toBeVisible()
      await expect(page.getByRole("dialog").getByText("メモを編集")).toBeVisible()
    })

    test("モーダルにメモ内容の初期値が反映される", async ({ page }) => {
      await createBookAndGoToDetail(page)
      await createMemo(page, "初期値確認メモ", { pageNumber: "99" })
      await page.getByRole("row").filter({ hasText: "初期値確認メモ" }).click()
      const dialog = page.getByRole("dialog")
      await expect(dialog.getByLabel("ページ数")).toHaveValue("99")
      await expect(dialog.getByLabel("メモ内容")).toHaveValue("初期値確認メモ")
    })

    test("お気に入り OFF のメモ → ★ が OFF 状態で表示される", async ({ page }) => {
      await createBookAndGoToDetail(page)
      await createMemo(page, "お気に入りOFFメモ", { favorite: false })
      await page.getByRole("row").filter({ hasText: "お気に入りOFFメモ" }).click()
      const dialog = page.getByRole("dialog")
      // お気に入りOFF: Star アイコンに fill-amber-400 クラスが付かない
      const starIcon = dialog.getByRole("button", { name: /お気に入り/ }).locator("svg")
      await expect(starIcon).not.toHaveClass(/fill-amber-400/)
    })

    test("お気に入り ON のメモ → ★ が ON 状態で表示される", async ({ page }) => {
      await createBookAndGoToDetail(page)
      await createMemo(page, "お気に入りONメモ", { favorite: true })
      await page.getByRole("row").filter({ hasText: "お気に入りONメモ" }).click()
      const dialog = page.getByRole("dialog")
      // お気に入りON: Star アイコンに fill-amber-400 クラスが付く
      const starIcon = dialog.getByRole("button", { name: /お気に入り/ }).locator("svg")
      await expect(starIcon).toHaveClass(/fill-amber-400/)
    })

    test("「キャンセル」ボタン → モーダルが閉じる", async ({ page }) => {
      await createBookAndGoToDetail(page)
      await createMemo(page, "キャンセルテストメモ")
      await page.getByRole("row").filter({ hasText: "キャンセルテストメモ" }).click()
      await page.getByRole("button", { name: "キャンセル" }).click()
      await expect(page.getByRole("dialog")).not.toBeVisible()
    })

    test("Escape キー → モーダルが閉じる", async ({ page }) => {
      await createBookAndGoToDetail(page)
      await createMemo(page, "Escapeテストメモ")
      await page.getByRole("row").filter({ hasText: "Escapeテストメモ" }).click()
      await page.keyboard.press("Escape")
      await expect(page.getByRole("dialog")).not.toBeVisible()
    })

    test("別のメモを開く → 前のメモの内容ではなく新しい内容が表示される", async ({ page }) => {
      await createBookAndGoToDetail(page)
      await createMemo(page, "最初のメモ")
      await createMemo(page, "2番目のメモ")
      // 最初のメモを開いて閉じる
      await page.getByRole("row").filter({ hasText: "最初のメモ" }).click()
      await page.getByRole("button", { name: "キャンセル" }).click()
      // 2番目のメモを開く
      await page.getByRole("row").filter({ hasText: "2番目のメモ" }).click()
      const dialog = page.getByRole("dialog")
      await expect(dialog.getByLabel("メモ内容")).toHaveValue("2番目のメモ")
    })
  })

  test.describe("正常更新", () => {
    test("メモ内容を変更して「更新」→ トーストが表示され一覧が即時更新される", async ({ page }) => {
      await createBookAndGoToDetail(page)
      await createMemo(page, "更新前メモ")
      await page.getByRole("row").filter({ hasText: "更新前メモ" }).click()
      const dialog = page.getByRole("dialog")
      await dialog.getByLabel("メモ内容").fill("更新後メモ")
      await page.getByRole("button", { name: "更新" }).click()
      await expect(page.getByText("メモを更新しました", { exact: true })).toBeVisible()
      await expect(page.getByRole("dialog")).not.toBeVisible()
      await expect(page.getByText("更新後メモ")).toBeVisible()
    })

    test("ページ数を変更して更新 → 一覧に即時反映される", async ({ page }) => {
      await createBookAndGoToDetail(page)
      await createMemo(page, "ページ数更新テスト", { pageNumber: "10" })
      await page.getByRole("row").filter({ hasText: "ページ数更新テスト" }).click()
      const dialog = page.getByRole("dialog")
      await dialog.getByLabel("ページ数").fill("200")
      await page.getByRole("button", { name: "更新" }).click()
      await page.getByText("メモを更新しました", { exact: true }).waitFor()
      await expect(page.getByText("p.200")).toBeVisible()
    })

    test("お気に入り OFF→ON に変更して更新 → お気に入り件数が増える", async ({ page }) => {
      await createBookAndGoToDetail(page)
      await createMemo(page, "お気に入りカウントテスト", { favorite: false })
      await expect(page.getByText("お気に入り 0 件")).toBeVisible()
      await page.getByRole("row").filter({ hasText: "お気に入りカウントテスト" }).click()
      const dialog = page.getByRole("dialog")
      await dialog.getByRole("button", { name: /お気に入り/ }).click()
      await page.getByRole("button", { name: "更新" }).click()
      await page.getByText("メモを更新しました", { exact: true }).waitFor()
      await expect(page.getByText("お気に入り 1 件")).toBeVisible()
    })

    test("お気に入り ON→OFF に変更して更新 → お気に入り件数が減る", async ({ page }) => {
      await createBookAndGoToDetail(page)
      await createMemo(page, "お気に入り減少テスト", { favorite: true })
      await expect(page.getByText("お気に入り 1 件")).toBeVisible()
      await page.getByRole("row").filter({ hasText: "お気に入り減少テスト" }).click()
      const dialog = page.getByRole("dialog")
      await dialog.getByRole("button", { name: /お気に入り/ }).click()
      await page.getByRole("button", { name: "更新" }).click()
      await page.getByText("メモを更新しました", { exact: true }).waitFor()
      await expect(page.getByText("お気に入り 0 件")).toBeVisible()
    })
  })

  test.describe("タグ編集", () => {
    test("新規タグを追加して更新 → メモ一覧にタグが表示される", async ({ page }) => {
      await createBookAndGoToDetail(page)
      await createMemo(page, "タグ追加テスト")
      await page.getByRole("row").filter({ hasText: "タグ追加テスト" }).click()
      const dialog = page.getByRole("dialog")
      const tagName = `E2E編集タグ_${Date.now()}`
      await dialog.getByPlaceholder("タグを入力...").fill(tagName)
      await page.getByText(`「${tagName}」を作成`).click()
      await expect(dialog.getByText(tagName)).toBeVisible()
      await page.getByRole("button", { name: "更新" }).click()
      await page.getByText("メモを更新しました", { exact: true }).waitFor()
      await expect(page.getByText(`#${tagName}`)).toBeVisible()
    })

    test("タグを削除して更新 → メモ一覧からタグが消える", async ({ page }) => {
      await createBookAndGoToDetail(page)
      await createMemo(page, "タグ削除テスト")
      // まずタグを追加して登録
      await page.getByRole("row").filter({ hasText: "タグ削除テスト" }).click()
      const tagName = `E2E削除タグ_${Date.now()}`
      const dialog = page.getByRole("dialog")
      await dialog.getByPlaceholder("タグを入力...").fill(tagName)
      await page.getByText(`「${tagName}」を作成`).click()
      await page.getByRole("button", { name: "更新" }).click()
      await page.getByText("メモを更新しました", { exact: true }).waitFor()
      // 再度開いてタグを削除
      await page.getByRole("row").filter({ hasText: "タグ削除テスト" }).click()
      const dialog2 = page.getByRole("dialog")
      await dialog2.getByRole("button", { name: `${tagName}を削除` }).click()
      await page.getByRole("button", { name: "更新" }).click()
      await page.getByText("メモを更新しました", { exact: true }).waitFor()
      await expect(page.getByText(`#${tagName}`)).not.toBeVisible()
    })
  })

  test.describe("削除", () => {
    test("「削除」ボタン → 確認ダイアログが表示される", async ({ page }) => {
      await createBookAndGoToDetail(page)
      await createMemo(page, "削除確認ダイアログテスト")
      await page.getByRole("row").filter({ hasText: "削除確認ダイアログテスト" }).click()
      await page.getByRole("button", { name: "削除" }).click()
      await expect(page.getByText("メモを削除しますか？")).toBeVisible()
      await expect(page.getByText("この操作は取り消せません。")).toBeVisible()
    })

    test("確認ダイアログの「キャンセル」→ 編集モーダルが残る", async ({ page }) => {
      await createBookAndGoToDetail(page)
      await createMemo(page, "削除キャンセルテスト")
      await page.getByRole("row").filter({ hasText: "削除キャンセルテスト" }).click()
      await page.getByRole("button", { name: "削除" }).click()
      await page.getByText("メモを削除しますか？").waitFor()
      // ダイアログ内のキャンセルボタンをクリック
      await page.getByRole("alertdialog").getByRole("button", { name: "キャンセル" }).click()
      await expect(page.getByRole("dialog")).toBeVisible()
    })

    test("「削除する」→ トーストが表示されメモ一覧から消える", async ({ page }) => {
      await createBookAndGoToDetail(page)
      await createMemo(page, "削除実行テスト")
      await expect(page.getByText("メモ 1 件")).toBeVisible()
      await page.getByRole("row").filter({ hasText: "削除実行テスト" }).click()
      await page.getByRole("button", { name: "削除" }).click()
      await page.getByText("メモを削除しますか？").waitFor()
      await page.getByRole("alertdialog").getByRole("button", { name: "削除する" }).click()
      await expect(page.getByText("メモを削除しました", { exact: true })).toBeVisible()
      await expect(page.getByRole("dialog")).not.toBeVisible()
      await expect(page.getByText("削除実行テスト")).not.toBeVisible()
      await expect(page.getByText("メモ 0 件")).toBeVisible()
    })

    test("お気に入りメモを削除 → お気に入り件数が減る", async ({ page }) => {
      await createBookAndGoToDetail(page)
      await createMemo(page, "お気に入り削除テスト", { favorite: true })
      await expect(page.getByText("お気に入り 1 件")).toBeVisible()
      await page.getByRole("row").filter({ hasText: "お気に入り削除テスト" }).click()
      await page.getByRole("button", { name: "削除" }).click()
      await page.getByText("メモを削除しますか？").waitFor()
      await page.getByRole("alertdialog").getByRole("button", { name: "削除する" }).click()
      await page.getByText("メモを削除しました", { exact: true }).waitFor()
      await expect(page.getByText("お気に入り 0 件")).toBeVisible()
    })
  })
})

// ────────────────────────────────────────────
// SCR-08 読書メモ編集画面（モバイル 375×667）
// ────────────────────────────────────────────
test.describe("SCR-08 読書メモ編集画面（モバイル）", () => {
  test.use({ viewport: { width: 375, height: 667 }, userAgent: MOBILE_UA })

  test.beforeEach(async ({ page }) => {
    if (!EMAIL || !PASSWORD) test.skip()
    await login(page)
  })

  /** モバイルで書籍を登録して詳細ページへ遷移 */
  async function createBookMobile(page: Page): Promise<{ bookId: string }> {
    const title = `E2Eスマホ編集_${Date.now()}`
    await page.getByRole("button", { name: "書籍を追加" }).click()
    await page.getByLabel("タイトル").fill(title)
    await page.getByRole("button", { name: "登録" }).click()
    await page.getByText("書籍を登録しました", { exact: true }).waitFor()
    await page.getByText(title).first().click()
    await page.waitForURL(/\/books\/[a-z0-9-]+/)
    const bookId = page.url().split("/books/")[1].split("/")[0]
    return { bookId }
  }

  /** モバイルでメモを登録 */
  async function createMemoMobile(page: Page, content: string): Promise<void> {
    await page.getByRole("button", { name: "メモを追加" }).click()
    await page.waitForURL(/\/books\/[a-z0-9-]+\/memo\/new/)
    await page.getByLabel("メモ内容").fill(content)
    await page.getByRole("button", { name: "登録" }).click()
    await page.getByText("メモを登録しました", { exact: true }).waitFor()
    await page.waitForURL(/\/books\/[a-z0-9-]+$/)
  }

  test.describe("画面遷移と初期値", () => {
    test("メモカードをタップ → /memos/[id]/edit に遷移する", async ({ page }) => {
      const { bookId } = await createBookMobile(page)
      await createMemoMobile(page, "SCR-08遷移テスト")
      await page.getByText("SCR-08遷移テスト").click()
      await expect(page).toHaveURL(/\/memos\/[a-z0-9-]+\/edit/)
    })

    test("SCR-08 のヘッダーに「メモを編集」が表示される", async ({ page }) => {
      await createBookMobile(page)
      await createMemoMobile(page, "ヘッダー確認テスト")
      await page.getByText("ヘッダー確認テスト").click()
      await page.waitForURL(/\/memos\/[a-z0-9-]+\/edit/)
      await expect(page.getByText("メモを編集")).toBeVisible()
    })

    test("各フィールドの初期値が反映されている", async ({ page }) => {
      const { bookId } = await createBookMobile(page)
      // ページ数付きメモを登録（PC UA を一時使用せず、モバイルで登録後に確認）
      await page.getByRole("button", { name: "メモを追加" }).click()
      await page.waitForURL(/\/books\/[a-z0-9-]+\/memo\/new/)
      await page.getByLabel("ページ数").fill("42")
      await page.getByLabel("メモ内容").fill("初期値テストSCR08")
      await page.getByRole("button", { name: "登録" }).click()
      await page.getByText("メモを登録しました", { exact: true }).waitFor()
      await page.waitForURL(/\/books\/[a-z0-9-]+$/)
      await page.getByText("初期値テストSCR08").click()
      await page.waitForURL(/\/memos\/[a-z0-9-]+\/edit/)
      await expect(page.getByLabel("ページ数")).toHaveValue("42")
      await expect(page.getByLabel("メモ内容")).toHaveValue("初期値テストSCR08")
    })

    test("「←」ボタンをタップ → 書籍詳細画面に戻る", async ({ page }) => {
      const { bookId } = await createBookMobile(page)
      await createMemoMobile(page, "戻るボタンテスト")
      await page.getByText("戻るボタンテスト").click()
      await page.waitForURL(/\/memos\/[a-z0-9-]+\/edit/)
      await page.getByRole("button", { name: "戻る" }).click()
      await expect(page).toHaveURL(new RegExp(`/books/${bookId}$`))
    })
  })

  test.describe("正常更新", () => {
    test("メモ内容を変更して「更新する」→ トーストが表示され書籍詳細に戻る", async ({
      page,
    }) => {
      const { bookId } = await createBookMobile(page)
      await createMemoMobile(page, "更新前スマホメモ")
      await page.getByText("更新前スマホメモ").click()
      await page.waitForURL(/\/memos\/[a-z0-9-]+\/edit/)
      await page.getByLabel("メモ内容").fill("更新後スマホメモ")
      await page.getByRole("button", { name: "更新する" }).click()
      await expect(page.getByText("メモを更新しました", { exact: true })).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`/books/${bookId}$`))
      await expect(page.getByText("更新後スマホメモ")).toBeVisible()
    })

    test("タグを追加して更新 → 書籍詳細のメモカードにタグが表示される", async ({ page }) => {
      await createBookMobile(page)
      await createMemoMobile(page, "スマホタグ追加テスト")
      await page.getByText("スマホタグ追加テスト").click()
      await page.waitForURL(/\/memos\/[a-z0-9-]+\/edit/)
      const tagName = `E2EスマホTag_${Date.now()}`
      await page.getByPlaceholder("タグを入力...").fill(tagName)
      await page.getByText(`「${tagName}」を作成`).click()
      await expect(page.getByText(tagName)).toBeVisible()
      await page.getByRole("button", { name: "更新する" }).click()
      await page.getByText("メモを更新しました", { exact: true }).waitFor()
      await expect(page.getByText(`#${tagName}`)).toBeVisible()
    })
  })

  test.describe("削除", () => {
    test("「削除する」ボタン → 確認ダイアログが表示される", async ({ page }) => {
      await createBookMobile(page)
      await createMemoMobile(page, "スマホ削除確認テスト")
      await page.getByText("スマホ削除確認テスト").click()
      await page.waitForURL(/\/memos\/[a-z0-9-]+\/edit/)
      await page.getByRole("button", { name: "削除する" }).click()
      await expect(page.getByText("メモを削除しますか？")).toBeVisible()
    })

    test("確認ダイアログで「削除する」→ トーストが表示され書籍詳細に戻る", async ({ page }) => {
      const { bookId } = await createBookMobile(page)
      await createMemoMobile(page, "スマホ削除実行テスト")
      await page.getByText("スマホ削除実行テスト").click()
      await page.waitForURL(/\/memos\/[a-z0-9-]+\/edit/)
      await page.getByRole("button", { name: "削除する" }).click()
      await page.getByText("メモを削除しますか？").waitFor()
      await page.getByRole("alertdialog").getByRole("button", { name: "削除する" }).click()
      await expect(page.getByText("メモを削除しました", { exact: true })).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`/books/${bookId}$`))
      await expect(page.getByText("スマホ削除実行テスト")).not.toBeVisible()
    })
  })
})
