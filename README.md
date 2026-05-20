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
```

各値は Supabase ダッシュボードの「Project Settings > API」から取得できます。

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
| 新規登録 | `/register` | アカウント作成 |
| ホーム | `/` | 最近の書籍・メモ・お気に入りを表示 |
| 書籍一覧 | `/books` | 書籍の検索・登録 |
| 書籍詳細 | `/books/[id]` | 書籍情報・メモ一覧 |
| 書籍編集 | `/books/[id]/edit` | 書籍情報の編集・削除 |
| 読書メモ編集 | `/memos/[id]/edit` | メモの編集・削除 |
| 全メモ検索 | `/memos` | 横断検索・フィルタ |
| お気に入り | `/favorites` | お気に入りメモ一覧 |
| 設定 | `/settings` | ログアウト・アカウント管理 |

---

## 開発状況

現在開発中。初期リリース予定機能は「機能」セクションに記載のとおり。