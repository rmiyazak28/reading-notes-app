# 読書メモ管理アプリ

読書中に素早くメモを記録し、後から検索・振り返りができる個人用読書記録アプリ。

SNS機能を持たず、「素早く記録すること」と「必要なメモをすぐ探せること」に特化しています。

---

## 機能

- 書籍の登録・編集・削除（タイトル・著者・ジャンル・読書ステータス・読了日）
- 読書メモの登録・編集・削除（ページ数・メモ内容・タグ）
- お気に入りメモの管理
- 書籍・メモのキーワード検索、タグ絞り込み
- メールアドレス / Google アカウントによる認証
- PWA 対応（ホーム画面追加・オフラインキャッシュ）

---

## 技術スタック

| 分類 | 技術 |
|---|---|
| フロントエンド | Next.js 14（App Router） |
| UI | React / Tailwind CSS |
| 言語 | TypeScript |
| 認証 | Supabase Authentication |
| データベース | Supabase（PostgreSQL） |
| ホスティング | Vercel |
| PWA | next-pwa |

---

## セットアップ

### 前提条件

- Node.js 18 以上
- npm または yarn
- Supabase アカウント（プロジェクト作成済み）

### 手順

```bash
# リポジトリをクローン
git clone https://github.com/rmiyazak28/reading-notes-app.git
cd your-repo

# 依存パッケージをインストール
npm install

# 環境変数を設定（後述）
cp .env.local.example .env.local
```

### Supabase セットアップ
1. [Supabase](https://supabase.com) でプロジェクトを作成する
2. 「Project Settings > API」から URL と anon key を取得し `.env.local` に設定する
3. 「Project Settings > API」から service_role key を取得し `.env.local` に設定する（外部に漏らさないこと）
4. SQL Editor で `supabase/migrations/` 内のSQLファイルを順番に実行する
5. Authentication > Providers で Google OAuth を有効化し、クライアントIDとシークレットを設定する
6. Authentication > URL Configuration で Site URL と Redirect URL（`http://localhost:3000/api/auth/callback`）を設定する

#### SQL実行順序

SQL Editor で以下の順番にファイルを実行してください。

| 順序 | ファイル名 | 内容 |
|---|---|---|
| 1 | `001_extensions.sql` | pg_trgm 拡張の有効化 |
| 2 | `002_tables.sql` | テーブル作成（books / reading_memos / tags / memo_tags） |
| 3 | `003_indexes.sql` | インデックス作成 |
| 4 | `004_rls.sql` | RLSポリシー設定 |
| 5 | `005_triggers.sql` | updated_at 自動更新トリガー |

> 順番を誤ると外部キー制約・RLSの依存関係でエラーになります。

```bash
# 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:3000` を開く。

---

## 環境変数

`.env.local` に以下を設定してください。

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# SUPABASE_SERVICE_ROLE_KEY はサーバーサイド専用。NEXT_PUBLIC_ プレフィックス禁止。
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NEXT_PUBLIC_APP_URL は本番環境では Vercel のデプロイ URL に変更する。
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

各値は Supabase ダッシュボードの「Project Settings > API」から取得できます。

### Vercel デプロイ時の追加設定

Vercel の「Environment Variables」に上記4つを登録してください。
`NEXT_PUBLIC_APP_URL` は本番URLに変更します（例：`https://your-app.vercel.app`）。

### Google OAuth に必要な Supabase 側設定

Supabase ダッシュボード > Authentication > URL Configuration に以下を設定します。

| 項目 | 値 |
|---|---|
| Site URL | `http://localhost:3000`（本番では本番URL） |
| Redirect URL | `http://localhost:3000/api/auth/callback` |

追加の環境変数は不要です（Google OAuthのクライアントIDはSupabaseダッシュボード側に入力するため、`.env.local` には登場しません）。

---

## ディレクトリ構成（主要部分）

```
src/
├── app/
│   ├── (auth)/          # ログイン・新規登録画面
│   └── (protected)/     # 認証済みユーザー向け画面
│       ├── page.tsx          # ホーム画面
│       ├── books/            # 書籍一覧・詳細・編集
│       ├── memos/            # 全読書メモ検索・編集
│       ├── favorites/        # お気に入りメモ一覧
│       └── settings/         # 設定画面
├── features/            # 機能別コンポーネント・hooks・Server Actions
│   ├── books/
│   ├── memos/
│   └── auth/
└── lib/
    └── supabase/        # Supabase クライアント（Client / Server / Middleware）
```

---

## 画面一覧

| 画面 | パス | 概要 |
|---|---|---|
| ログイン | `/login` | メール・Google 認証 |
| 新規登録 | `/signup` | アカウント作成 |
| ホーム | `/home` | 最近の書籍・メモ・お気に入りメモ・読書中書籍を表示 |
| 書籍一覧 | `/books` | 書籍の検索・登録 |
| 書籍詳細 | `/books/[id]` | 書籍情報・メモ一覧 |
| 読書メモ編集 | `/memos/[id]/edit` | メモの編集・削除 |
| 全メモ検索 | `/memos` | 横断検索・フィルタ |
| お気に入り | `/favorites` | お気に入りメモ一覧 |
| 設定 | `/settings` | ログアウト・アカウント管理 |

---

## 開発状況

現在開発中。初期リリース予定機能は「機能」セクションに記載のとおり。