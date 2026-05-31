# 6. 認証・認可設計

## 6.1 認証

### 認証方式

| 方式 | 概要 |
|---|---|
| Email / Password | メールアドレスとパスワードによるログイン・登録 |
| Google OAuth | Googleアカウントによるソーシャルログイン |

Supabase Authentication を利用する。  

---

### セッション管理方針

Next.js App Router + Server Actions 構成のため、`@supabase/ssr` パッケージを用いた Cookie ベースのセッション管理を採用する。  

| 用途 | クライアント | ファイル |
|---|---|---|
| Client Component | `createBrowserClient()` | `lib/supabase/client.ts` |
| Server Component / Server Actions | `createServerClient()` | `lib/supabase/server.ts` |
| Proxy | `createServerClient()` | `lib/supabase/proxy.ts` |

---

### `getUser()` / `getClaims()` / `getSession()` 使い分け方針

`getSession()` はCookieから取得した値をそのまま返すため改ざんリスクがある。サーバーサイドでは使用しない。
`getUser()` はSupabase Authサーバーへのネットワーク呼び出しで最新のユーザーレコードを取得する。ユーザー情報が必要な場面（Server Actions等）で使う。
`getClaims()` は非対称署名キーを使うプロジェクト（新規プロジェクトのデフォルト）ではJWT署名をJWKSエンドポイントの公開鍵でローカル検証する。ネットワーク呼び出しなしで高速だが、JWT有効期限内であれば通過するため、BANや強制ログアウトをリアルタイム検知できない点に注意。

| コンテキスト | 使用関数 | 理由 |
|---|---|---|
| Server Actions（各Action冒頭） | `auth.getUser()` | サーバー側での安全な認証チェック（ユーザー情報が必要なため） |
| Proxy（`lib/supabase/proxy.ts`） | `auth.getClaims()` | JWTシグネチャをローカル検証してトークンを更新する（公式proxy方式の推奨）。ネットワーク呼び出しなしで高速 || ページ・レイアウト保護 | `auth.getClaims()` | ネットワーク不要でJWT検証、ページ保護に推奨 |
| Client Component | `auth.getSession()` | ブラウザ上ではRLSが保護するため許容 |

Server Actions での認証チェックは `§5 Server Actions設計` の共通仕様に記載の通り、各Action冒頭で実施する。

---

### Google OAuth コールバックフロー

```
1. ユーザーが「Googleでログイン」をクリック
2. signInWithGoogle() → supabase.auth.signInWithOAuth() を呼び出し
3. Google認証画面へリダイレクト
4. 認証後、/api/auth/callback へリダイレクト
5. Route Handler でコードをセッションに交換（exchangeCodeForSession）
6. ホーム画面（/home）へリダイレクト
```

コールバックエンドポイント: `src/app/api/auth/callback/route.ts`  

---

### Proxy によるルート保護

`src/proxy.ts` にて認証チェックを行い、未認証ユーザーをログイン画面へリダイレクトする。

保護対象ルート（`/(protected)/` 配下）:

| パス | 画面 |
|---|---|
| `/home` | SCR-03 ホーム |
| `/books/*` | SCR-04〜06 書籍系 |
| `/memos/*` | SCR-07〜08 メモ系 |
| `/favorites` | SCR-09 お気に入り |
| `/settings` | SCR-10 設定 |

認証不要ルート（`/(auth)/` 配下）:

| パス | 画面 |
|---|---|
| `/login` | SCR-01 ログイン |
| `/signup` | SCR-02 新規登録 |
| `/api/auth/callback` | OAuth コールバック |

---

## 6.2 認可

### 基本方針

- Supabase の Row Level Security (RLS) により、DBレベルでユーザーごとのデータ分離を実現する。
RLS はデフォルトで全アクセスを拒否するため、必要な操作ごとにポリシーを明示的に定義する。
また、RLSポリシーとは別に、`authenticated` ロールへのテーブル権限（GRANT）も明示的に付与する必要がある。
- `service_role` キーはRLSを完全にバイパスするため、サーバーサイドのみで使用し、クライアントに露出しない。

---

### RLSポリシー

各テーブルで `authenticated` ロールに対して操作別のポリシーを定義する。  
ポリシーの `USING` 句は既存行の可視性制御（SELECT / UPDATE / DELETE）、`WITH CHECK` 句は書き込みデータの検証（INSERT / UPDATE）に使用する。

#### books

```sql
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "books_select_own"
ON books FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT
CREATE POLICY "books_insert_own"
ON books FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE
CREATE POLICY "books_update_own"
ON books FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE
CREATE POLICY "books_delete_own"
ON books FOR DELETE
TO authenticated
USING (user_id = auth.uid());
```

---

#### reading_memos

```sql
ALTER TABLE reading_memos ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "reading_memos_select_own"
ON reading_memos FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT
CREATE POLICY "reading_memos_insert_own"
ON reading_memos FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE
CREATE POLICY "reading_memos_update_own"
ON reading_memos FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE
CREATE POLICY "reading_memos_delete_own"
ON reading_memos FOR DELETE
TO authenticated
USING (user_id = auth.uid());
```

---

#### tags

```sql
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "tags_select_own"
ON tags FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT
CREATE POLICY "tags_insert_own"
ON tags FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- DELETE
CREATE POLICY "tags_delete_own"
ON tags FOR DELETE
TO authenticated
USING (user_id = auth.uid());
```

> **補足:** `tags` テーブルはタグ名変更を機能要件に含まないため、UPDATEポリシーは定義しない。必要になった時点で追加する。

---

#### memo_tags

`memo_tags` は `user_id` カラムを持たない中間テーブルのため、親テーブル（`reading_memos`）の所有権を JOIN して検証する。

```sql
ALTER TABLE memo_tags ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "memo_tags_select_own"
ON memo_tags FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM reading_memos
    WHERE reading_memos.id = memo_tags.memo_id
      AND reading_memos.user_id = auth.uid()
  )
);

-- INSERT
CREATE POLICY "memo_tags_insert_own"
ON memo_tags FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM reading_memos
    WHERE reading_memos.id = memo_tags.memo_id
      AND reading_memos.user_id = auth.uid()
  )
);

-- DELETE
CREATE POLICY "memo_tags_delete_own"
ON memo_tags FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM reading_memos
    WHERE reading_memos.id = memo_tags.memo_id
      AND reading_memos.user_id = auth.uid()
  )
);
```

---

### Service Role Key の取り扱い

`deleteAccount` Action（§5.4参照）はSupabase Admin APIを使用するため Secret キーが必要となる。取り扱いルールを以下に定める。

| ルール | 内容 |
|---|---|
| 保管場所 | `.env.local`（Vercel環境変数） |
| 環境変数名 | `SUPABASE_SECRET_KEY` |
| 使用箇所 | Server Actions のみ（`deleteAccount` 限定） |
| クライアント露出 | 禁止。`NEXT_PUBLIC_` プレフィックスを付与しない |
| 取得場所 | Supabase ダッシュボード「Settings > API Keys」タブ |
| 互換性注意 | 新しい `sb_secret_...` キーと `auth.admin.*` の互換性問題が報告されている。実装時に動作確認し、問題があれば Legacy の `service_role` キーを使用すること |