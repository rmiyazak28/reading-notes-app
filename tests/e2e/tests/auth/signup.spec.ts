import { test, expect } from "@playwright/test";

test.describe("SCR-02 新規登録画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
  });

  test.describe("バリデーション", () => {
    test("何も入力せず送信 → 全フィールドにエラーが表示される", async ({ page }) => {
      await page.getByRole("button", { name: "アカウントを作成" }).click();
      await expect(page.getByText("ユーザー名を入力してください")).toBeVisible();
      await expect(page.getByText("メールアドレスを入力してください")).toBeVisible();
      await expect(page.getByText("パスワードを入力してください")).toBeVisible();
      await expect(page.getByText("パスワード（確認）を入力してください")).toBeVisible();
    });

    test("メールアドレスに abc を入力して送信 → メール形式エラーが表示される", async ({ page }) => {
      await page.getByLabel("メールアドレス").fill("abc");
      await page.getByRole("button", { name: "アカウントを作成" }).click();
      await expect(page.getByText("メール形式で入力してください")).toBeVisible();
    });

    test("7文字パスワードで送信 → 8文字以上エラーが表示される", async ({ page }) => {
      await page.getByLabel("パスワード", { exact: true }).fill("Abc1234");
      await page.getByRole("button", { name: "アカウントを作成" }).click();
      await expect(page.getByText("パスワードは8文字以上で入力してください")).toBeVisible();
    });

    test("英字のみ8文字以上で送信 → 数字エラーが表示される", async ({ page }) => {
      await page.getByLabel("パスワード", { exact: true }).fill("Abcdefgh");
      await page.getByRole("button", { name: "アカウントを作成" }).click();
      await expect(page.getByText("数字を1文字以上含めてください")).toBeVisible();
    });

    test("数字のみ8文字以上で送信 → 英字エラーが表示される", async ({ page }) => {
      await page.getByLabel("パスワード", { exact: true }).fill("12345678");
      await page.getByRole("button", { name: "アカウントを作成" }).click();
      await expect(page.getByText("英字を1文字以上含めてください")).toBeVisible();
    });

    test("パスワードと確認が不一致で送信 → 不一致エラーが表示される", async ({ page }) => {
      await page.getByLabel("パスワード", { exact: true }).fill("Password123");
      await page.getByLabel("パスワード（確認）").fill("Password456");
      await page.getByRole("button", { name: "アカウントを作成" }).click();
      await expect(page.getByText("パスワードが一致しません")).toBeVisible();
    });

    test("パスワードと確認が一致 → confirmPassword のエラーが表示されない", async ({ page }) => {
      await page.getByLabel("パスワード", { exact: true }).fill("Password123");
      await page.getByLabel("パスワード（確認）").fill("Password123");
      await page.getByRole("button", { name: "アカウントを作成" }).click();
      await expect(page.getByText("パスワードが一致しません")).not.toBeVisible();
    });
  });

  test.describe("登録成功", () => {
    test("全項目正しく入力して送信 → 登録完了トーストが表示され /login に遷移する", async ({ page }) => {
      const uniqueEmail = `test+${Date.now()}@example.com`;
      await page.getByLabel("ユーザー名").fill("テストユーザー");
      await page.getByLabel("メールアドレス").fill(uniqueEmail);
      await page.getByLabel("パスワード", { exact: true }).fill("Password123");
      await page.getByLabel("パスワード（確認）").fill("Password123");
      await page.getByRole("button", { name: "アカウントを作成" }).click();
      await expect(page.getByText("登録完了", { exact: true })).toBeVisible();
      await expect(page).toHaveURL("/login");
    });
  });

  test.describe("パスワード表示トグル", () => {
    test("パスワードフィールドのトグルを押す → type が text に変わる", async ({ page }) => {
      // 2つある「パスワードを表示」ボタンのうち、先頭がパスワードフィールド用
      await page.getByRole("button", { name: "パスワードを表示" }).first().click();
      await expect(page.getByLabel("パスワード", { exact: true })).toHaveAttribute("type", "text");
    });

    test("確認パスワードフィールドのトグルを押す → type が text に変わる", async ({ page }) => {
      // 2つある「パスワードを表示」ボタンのうち、末尾が確認パスワードフィールド用
      await page.getByRole("button", { name: "パスワードを表示" }).last().click();
      await expect(page.getByLabel("パスワード（確認）")).toHaveAttribute("type", "text");
    });
  });

  test.describe("ナビゲーション", () => {
    test("ログインリンクを押す → /login に遷移する", async ({ page }) => {
      await page.getByRole("link", { name: "ログイン" }).click();
      await expect(page).toHaveURL("/login");
    });
  });

  test.describe("モバイル (375×667)", () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test("全項目正しく入力して登録成功 → /login に遷移する", async ({ page }) => {
      const uniqueEmail = `test+${Date.now()}@example.com`;
      await page.getByLabel("ユーザー名").fill("テストユーザー");
      await page.getByLabel("メールアドレス").fill(uniqueEmail);
      await page.getByLabel("パスワード", { exact: true }).fill("Password123");
      await page.getByLabel("パスワード（確認）").fill("Password123");
      await page.getByRole("button", { name: "アカウントを作成" }).click();
      await expect(page).toHaveURL("/login");
    });

    test("空送信 → バリデーションエラーが表示される", async ({ page }) => {
      await page.getByRole("button", { name: "アカウントを作成" }).click();
      await expect(page.getByText("ユーザー名を入力してください")).toBeVisible();
      await expect(page.getByText("メールアドレスを入力してください")).toBeVisible();
      await expect(page.getByText("パスワードを入力してください")).toBeVisible();
    });
  });
});
