import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;

test.describe("SCR-01 ログイン画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test.describe("バリデーション", () => {
    test("何も入力せず送信 → 全フィールドにエラーが表示される", async ({ page }) => {
      await page.getByRole("button", { name: "ログイン" }).click();
      await expect(page.getByText("メールアドレスを入力してください")).toBeVisible();
      await expect(page.getByText("パスワードを入力してください")).toBeVisible();
    });

    test("メールアドレスに abc を入力して送信 → メール形式エラーが表示される", async ({ page }) => {
      await page.getByLabel("メールアドレス").fill("abc");
      await page.getByRole("button", { name: "ログイン" }).click();
      await expect(page.getByText("メール形式で入力してください")).toBeVisible();
    });

    test("メールアドレスのみ正しく入力してパスワード空で送信 → パスワードのエラーのみ表示される", async ({
      page,
    }) => {
      await page.getByLabel("メールアドレス").fill("test@example.com");
      await page.getByRole("button", { name: "ログイン" }).click();
      await expect(page.getByText("パスワードを入力してください")).toBeVisible();
      await expect(page.getByText("メールアドレスを入力してください")).not.toBeVisible();
      await expect(page.getByText("メール形式で入力してください")).not.toBeVisible();
    });
  });

  test.describe("認証失敗", () => {
    test("存在しない認証情報で送信 → ログインエラートーストが表示される", async ({ page }) => {
      await page.getByLabel("メールアドレス").fill("nonexistent@example.com");
      await page.getByLabel("パスワード").fill("WrongPass123");
      await page.getByRole("button", { name: "ログイン" }).click();
      await expect(page.getByText("ログインエラー", { exact: true })).toBeVisible();
      await expect(page).toHaveURL("/login");
    });
  });

  test.describe("認証成功", () => {
    test("正しい認証情報で送信 → /home に遷移する", async ({ page }) => {
      test.skip(!EMAIL || !PASSWORD, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD が未設定");
      await page.getByLabel("メールアドレス").fill(EMAIL!);
      await page.getByLabel("パスワード").fill(PASSWORD!);
      await page.getByRole("button", { name: "ログイン" }).click();
      await expect(page).toHaveURL("/home");
    });
  });

  test.describe("パスワード表示トグル", () => {
    test("トグルボタンを押す → input の type が text に変わる", async ({ page }) => {
      await page.getByRole("button", { name: "パスワードを表示" }).click();
      await expect(page.getByLabel("パスワード")).toHaveAttribute("type", "text");
    });

    test("もう一度押す → input の type が password に戻る", async ({ page }) => {
      await page.getByRole("button", { name: "パスワードを表示" }).click();
      await page.getByRole("button", { name: "パスワードを隠す" }).click();
      await expect(page.getByLabel("パスワード")).toHaveAttribute("type", "password");
    });
  });

  test.describe("ナビゲーション", () => {
    test("新規登録リンクを押す → /signup に遷移する", async ({ page }) => {
      await page.getByRole("link", { name: "新規登録" }).click();
      await expect(page).toHaveURL("/signup");
    });
  });

  test.describe("モバイル (375×667)", () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test("正しい認証情報でログイン → /home に遷移する", async ({ page }) => {
      test.skip(!EMAIL || !PASSWORD, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD が未設定");
      await page.getByLabel("メールアドレス").fill(EMAIL!);
      await page.getByLabel("パスワード").fill(PASSWORD!);
      await page.getByRole("button", { name: "ログイン" }).click();
      await expect(page).toHaveURL("/home");
    });

    test("空送信 → バリデーションエラーが表示される", async ({ page }) => {
      await page.getByRole("button", { name: "ログイン" }).click();
      await expect(page.getByText("メールアドレスを入力してください")).toBeVisible();
      await expect(page.getByText("パスワードを入力してください")).toBeVisible();
    });
  });
});
