# memoLake — 読書メモ管理アプリ

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
| フロントエンド | Next.js（App Router） |
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
cd reading-notes-app

# 依存パッケージをインストール
npm install

# 環境変数を設定（後述）
cp .env.local.example .env.local
```

> **補足：** Supabase CLI は devDependency として含まれています（`npm install` で自動的にインストールされます）。

### Supabase セットアップ
1. [Supabase](https://supabase.com) でプロジェクトを作成する
2. 「Project Settings > API」から URL と PUBLISHABLE_KEY を取得し `.env.local` に設定する
3. 「Project Settings > API」から SECRET_KEY を取得し `.env.local` に設定する（外部に漏らさないこと）
4. Supabase CLI でマイグレーションを実行する（後述）
5. Authentication > Providers で Google OAuth を有効化し、クライアントIDとシークレットを設定する
6. Authentication > URL Configuration で Site URL と Redirect URL（`http://localhost:3000/api/auth/callback`）を設定する

#### マイグレーション手順（Supabase CLI）

```bash
# CLIにログイン（ブラウザでPersonal Access Tokenを発行する）
npx supabase login

# リモートプロジェクトにリンク（DBパスワードを求められる）
npx supabase link

# マイグレーションをリモートDBに反映
npx supabase db push
```

`supabase/migrations/` 内のファイルがタイムスタンプ順に自動適用されます。

> **注意：** 初期構築後のスキーマ変更は、ダッシュボードのSQL EditorやTable Editorで直接変更しないこと。必ず `npx supabase migration new <name>` でマイグレーションファイルを作成し、`npx supabase db push` で反映してください。

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
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
# SUPABASE_SECRET_KEY はサーバーサイド専用。NEXT_PUBLIC_ プレフィックス禁止。
SUPABASE_SECRET_KEY=your_supabase_secret_key

# NEXT_PUBLIC_APP_URL は本番環境では Vercel のデプロイ URL に変更する。
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

各値は Supabase ダッシュボードの「Settings > API Keys」から取得できます。
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` は「API Keys」タブの Publishable key の値を使用します。
`SUPABASE_SECRET_KEY` は「API Keys」タブの Secret key の値を使用します（デフォルトでは非表示のため「Reveal」が必要）。

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
│       ├── home/             # ホーム画面
│       ├── books/            # 書籍一覧・詳細・編集
│       ├── memos/            # 全読書メモ検索（SCR-06）・メモ編集（SCR-08、スマホのみ）
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

## 設計上の注意点

実装時に迷いやすい設計判断を記録しておきます。

- **`getUser()` / `getClaims()` / `getSession()` の使い分け**  
  サーバーサイドでは `getSession()` を使用しない（Cookie の値をそのまま返すため改ざんリスクがある）。Server Actions では `getUser()` を使用する。ページ・レイアウト保護では `getClaims()` を使用する（ネットワーク呼び出し不要でJWT検証が可能）。Proxy 内では `getUser()` を使用する。

- **`SUPABASE_SECRET_KEY` の取り扱い**  
  アカウント削除（`deleteAccount` Action）のみで使用。`NEXT_PUBLIC_` プレフィックスを付与してはならない。
  なお、新しい `sb_secret_...` キーと `supabase-js` の Admin API（`auth.admin.*`）の互換性に問題が報告されている（[Issue #1568](https://github.com/supabase/supabase-js/issues/1568)）。実装時に動作確認が必要。問題が解消されない場合は Legacy の `service_role` キーを使用すること。

- **メモ追加の導線**  
  メモの追加は書籍詳細画面（SCR-05）からのみ行う。ホーム・全メモ検索・お気に入り画面にはメモ追加ボタンを置かない。

- **PC / スマホのUI分岐**  
  メモの登録・編集はデバイスで実装が異なる。PCはモーダル（MOD-03・MOD-04）、スマホは専用画面（SCR-07・SCR-08）への画面遷移。

## ロードマップ

### Phase 1（MVP）
- 認証（Email / Google OAuth）
- 書籍CRUD・メモCRUD
- タグ・お気に入り・メモ検索
- PWA対応

### Phase 2
- Google Books API連携（書籍名・著者・表紙画像の自動取得）
- 表紙画像グリッド表示
- 全メモ検索の複数単語対応（スペース区切りAND検索）
- タブレットUI対応

### Phase 3
- Docker開発環境整備
- モバイルアプリ化（React Native / Capacitorなど、方針未定）
- AI読書メモ要約
- バーコード読み取りISBN検索