# 5. Server Actions設計

## 5.0 概要

本プロジェクトはNext.js App Router + Server Actions + Supabaseで構成する。
クライアントはREST APIを経由せず、Server Actionsを通じてDBを操作する。
従来型のRoute Handler（`/api/books`等）は使用しない（OAuth callbackを除く）。

### 配置ルール

```
features/
  books/actions/
  memos/actions/
  tags/actions/
  auth/actions/
```

### 共通仕様

| 項目 | 内容 |
|---|---|
| 戻り値型 | `{ data, error }` の統一型 |
| 認証チェック | 各Action冒頭で `auth.getUser()` を実行 |
| バリデーション | Zodスキーマで実施（§7 バリデーション設計と共通） |
| エラー型 | `ActionError` として統一（§9 エラーハンドリング設計参照） |

### 戻り値の共通型

```ts
type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: ActionError };

type ActionError = {
  code: "UNAUTHORIZED" | "VALIDATION" | "NOT_FOUND" | "DB_ERROR" | "UNKNOWN";
  message: string;
};
```

---

## 5.0.1 画面別Action利用方針

### SCR-03 ホーム画面

専用Actionは設けず、既存Actionを組み合わせて取得する。

| セクション | 使用Action | パラメータ |
|---|---|---|
| 最近読んだ本 | `getBooks` | `limit: 5`（目安）, `status`未指定 |
| 読書中書籍 | `getBooks` | `status: "reading"`, `limit: 5` |
| 最近のメモ | `getMemos` | `limit: 5` |
| お気に入りメモ | `getMemos` | `favoriteOnly: true`, `limit: 5` |

> limitの具体的な件数はUI実装時に決定する。

---

## 5.1 書籍Actions

### getBooks

書籍一覧を取得する。

```ts
getBooks(params: GetBooksParams): Promise<ActionResult<Book[]>>

type GetBooksParams = {
  query?: string;
  status?: "unread" | "reading" | "completed";
  limit?: number;
};
```

| 項目 | 内容 |
|---|---|
| 認証 | 必須 |
| ソート | updated_at DESC |
| フィルタ | ログインユーザーの書籍のみ（RLSで担保） |
| 検索 | queryがある場合、タイトル・著者に対してilike検索 |

---

### getBook

書籍詳細を取得する。

```ts
getBook(id: string): Promise<ActionResult<Book>>
```

| 項目 | 内容 |
|---|---|
| 認証 | 必須 |
| 存在チェック | 対象なし → `NOT_FOUND` |

---

### createBook

書籍を新規登録する（MOD-01から呼び出し）。

```ts
createBook(input: CreateBookInput): Promise<ActionResult<Book>>

type CreateBookInput = {
  title: string;       // 必須 / 255文字以内
  author?: string;     // 任意 / 255文字以内
  genre?: string;      // 任意 / 100文字以内
  status?: "unread" | "reading" | "completed"; // デフォルト: "unread"
};
```

| 項目 | 内容 |
|---|---|
| 認証 | 必須 |
| バリデーション | §7.1参照 |
| 重複チェック | 同一user_id + titleは不可（DB UNIQUE制約） |
| user_id | セッションから自動付与（クライアントから受け取らない） |

---

### updateBook

書籍情報を更新する（MOD-02から呼び出し）。

```ts
updateBook(id: string, input: UpdateBookInput): Promise<ActionResult<Book>>

type UpdateBookInput = {
  title?: string;
  author?: string;
  genre?: string;
  status?: "unread" | "reading" | "completed";
  completed_at?: string | null; // status="completed"時は必須
};
```

| 項目 | 内容 |
|---|---|
| 認証 | 必須 |
| バリデーション | §7.1参照 |
| 所有権 | RLSで担保 |
| 補足 | statusを"completed"にする場合、completed_atが未指定なら今日の日付を自動セット |

---

### deleteBook

書籍を削除する（MOD-02から呼び出し）。

```ts
deleteBook(id: string): Promise<ActionResult<void>>
```

| 項目 | 内容 |
|---|---|
| 認証 | 必須 |
| 所有権 | RLSで担保 |
| 連鎖削除 | reading_memos, memo_tags はDB CASCADE DELETEで対応 |

---

## 5.2 読書メモActions

### getMemos

読書メモ一覧を取得する。

```ts
getMemos(params: GetMemosParams): Promise<ActionResult<MemoWithBook[]>>

type GetMemosParams = {
  bookId?: string;      // 指定時: 書籍詳細画面用（F-11, F-13）
                        // 未指定: 全メモ検索・お気に入り一覧用（F-14, F-16）
  query?: string;       // メモ内容・タグ・書籍名・著者名の部分一致
  favoriteOnly?: boolean;
  tagIds?: string[];
  limit?: number;
};
```

| 項目 | 内容 |
|---|---|
| 認証 | 必須 |
| ソート | created_at DESC |
| JOIN | books（書籍名・著者名取得）、memo_tags、tags |
| フィルタ | ログインユーザーのメモのみ（RLSで担保） |

---

### createMemo

読書メモを登録する（MOD-03・SCR-07から呼び出し）。

```ts
createMemo(input: CreateMemoInput): Promise<ActionResult<Memo>>

type CreateMemoInput = {
  book_id: string;
  page_number?: number;  // 1以上
  content: string;       // 必須
  favorite?: boolean;    // デフォルト: false
  tags?: { id?: string; name: string }[];  // idなしは新規作成
};
```

| 項目 | 内容 |
|---|---|
| 認証 | 必須 |
| バリデーション | §7.2参照 |
| タグ紐付け | tagsを受け取り、idなしのタグは先にtagsテーブルにINSERT後（重複時は既存IDを使用）、memo_tagsに一括INSERT |
| user_id | セッションから自動付与 |
| タグ名バリデーション | idなしタグのnameは必須・50文字以内（§7.3参照） |

---

### updateMemo

読書メモを更新する（MOD-04・SCR-08から呼び出し）。

```ts
updateMemo(id: string, input: UpdateMemoInput): Promise<ActionResult<Memo>>

type UpdateMemoInput = {
  page_number?: number | null;
  content?: string;
  favorite?: boolean;
  tags?: { id?: string; name: string }[];  // idなしは新規作成
};
```

| 項目 | 内容 |
|---|---|
| 認証 | 必須 |
| バリデーション | §7.2参照 |
| 所有権 | RLSで担保 |
| タグ更新 | tagsを受け取り、idなしのタグは先にtagsテーブルにINSERT後、memo_tagsを一旦DELETE→再INSERT（洗い替え方式） |
| タグ名バリデーション | idなしタグのnameは必須・50文字以内（§7.3参照） |

---

### deleteMemo

読書メモを削除する（MOD-04・SCR-08から呼び出し）。

```ts
deleteMemo(id: string): Promise<ActionResult<void>>
```

| 項目 | 内容 |
|---|---|
| 認証 | 必須 |
| 所有権 | RLSで担保 |
| 連鎖削除 | memo_tags はDB CASCADE DELETEで対応 |

---

### toggleFavorite

お気に入りをトグルする（★ボタンから呼び出し）。

```ts
toggleFavorite(id: string): Promise<ActionResult<{ favorite: boolean }>>
```

| 項目 | 内容 |
|---|---|
| 認証 | 必須 |
| 所有権 | RLSで担保 |
| 補足 | updateMemoに集約せず独立させることで、一覧画面からの単体操作を軽量化 |

---

## 5.3 タグActions

### getTags

ログインユーザーのタグ一覧を取得する。

```ts
getTags(): Promise<ActionResult<Tag[]>>
```

| 項目 | 内容 |
|---|---|
| 認証 | 必須 |
| ソート | name ASC |

---

## 5.4 認証Actions

### signUpWithEmail

メールアドレスでユーザー登録する（SCR-02から呼び出し）。

```ts
signUpWithEmail(input: SignUpInput): Promise<ActionResult<void>>

type SignUpInput = {
  name: string;
  email: string;
  password: string;
};
```

| 項目 | 内容 |
|---|---|
| 実装 | `supabase.auth.signUp()` を呼び出し |
| name | Supabase Auth の `user_metadata.name` に保存 |

---

### signInWithEmail

メールアドレスでログインする（SCR-01から呼び出し）。

```ts
signInWithEmail(input: SignInInput): Promise<ActionResult<void>>

type SignInInput = {
  email: string;
  password: string;
};
```

---

### signInWithGoogle

GoogleアカウントでOAuth認証を開始する（SCR-01・SCR-02から呼び出し）。

```ts
signInWithGoogle(): Promise<ActionResult<{ url: string }>>
```

| 項目 | 内容 |
|---|---|
| 実装 | `supabase.auth.signInWithOAuth()` を呼び出し |
| callback | `/api/auth/callback` に遷移（Route Handlerで処理） |

---

### signOut

ログアウトする（SCR-03・SCR-10から呼び出し）。

```ts
signOut(): Promise<ActionResult<void>>
```

---

### updateProfile

ユーザー情報を更新する（SCR-10から呼び出し）。

```ts
updateProfile(input: UpdateProfileInput): Promise<ActionResult<void>>

type UpdateProfileInput = {
  name?: string;
  email?: string;
  password?: string;
};
```

| 項目 | 内容 |
|---|---|
| 実装 | `supabase.auth.updateUser()` を呼び出し |

---

### deleteAccount

アカウントを削除する（SCR-10から呼び出し）。

```ts
deleteAccount(): Promise<ActionResult<void>>
```

| 項目 | 内容 |
|---|---|
| 実装 | Supabase Admin APIを使用（Service Role Key必須） |
| 連鎖削除 | books, reading_memos, tags はDB CASCADE DELETEで対応 |
| 注意 | Service Role KeyはServer側のみで使用し、クライアントに露出しない |