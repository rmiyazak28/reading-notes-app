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

---

## テスト方針

### テスト種別と方針

本プロジェクトのテストは、**単体テスト・マニュアルテスト・E2Eテスト・結合テスト**の4種類で構成する。

画面またはモーダルの実装単位ごとに単体テスト・マニュアルテスト・E2Eテストを実施し、全機能実装後に結合テストを行う。

#### 単体テスト

| 項目 | 内容 |
|---|---|
| ツール | Vitest + React Testing Library |
| 対象 | フォームコンポーネント（バリデーション・UI状態）、ユーティリティ関数、Zodスキーマ |
| 実施タイミング | 各画面・モーダルの実装直後 |
| 実行コマンド | `npm run test` |

対象の考え方：

- **フォームコンポーネント**：バリデーションエラーの表示、送信ボタンの活性状態、パスワード表示トグルなど、ユーザー操作に対するUI状態の変化を検証する
- **Zodスキーマ**：バリデーションルール（必須・文字数上限・形式・パスワード一致など）を単独で検証する
- **ユーティリティ関数**：`lib/utils/` 配下の純粋関数を検証する
- **Server Actions**：Supabaseへの外部通信を含むため単体テストの対象外とし、E2E・結合テストで担保する
- **shadcn/ui ベースのUIコンポーネント**（`components/ui/`）：ライブラリ側の動作担保を前提とし、原則対象外とする
- **認証フォーム**（SCR-01・SCR-02）：バリデーションは E2E テストで網羅しているため単体テストは実施しない

#### マニュアルテスト

| 項目 | 内容 |
|---|---|
| 対象環境 | ローカル開発環境（`http://localhost:3000`） |
| 対象デバイス | PC（Chrome最新版）、スマートフォン（Android Chrome / DevTools モバイルエミュレーション） |
| 実施タイミング | 各画面・モーダルの実装直後 |

チェック観点：

- 画面設計書の表示項目・UIイメージとの一致
- PC / スマホそれぞれのレイアウト（テーブル形式 / カード形式）
- 画面遷移図どおりの遷移動作
- バリデーションエラーの文言・表示タイミング
- トースト通知（成功・失敗）の表示
- スケルトンUI・ローディング状態の表示
- 削除操作時の確認ダイアログ表示
- お気に入りトグルの楽観的UI（即時反映）

#### E2Eテスト

| 項目 | 内容 |
|---|---|
| ツール | Playwright |
| 対象環境 | ローカル開発環境（`http://localhost:3000`） |
| 対象デバイス | デスクトップ（デフォルト）、モバイル（375×667） |
| 実施タイミング | 各画面・モーダルの実装直後 |
| 実行コマンド | `npx playwright test` |
| テストファイル配置 | `e2e/tests/<機能>/<画面ID>.spec.ts` |

テスト観点：

- バリデーションエラーの表示・非表示
- 認証成功・失敗時の画面遷移とトースト表示
- 主要な操作フロー（登録・編集・削除・検索・お気に入りトグル）の正常系・異常系
- デスクトップ / モバイル両ビューポートでの動作

ログイン済み状態が必要なテストは、環境変数 `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` を設定した専用テストアカウントを使用する。未設定の場合は `test.skip()` でスキップする。

```bash
# .env.local または CI 環境変数に設定する
E2E_TEST_EMAIL=your-test-account@example.com
E2E_TEST_PASSWORD=YourTestPassword123
```

#### 結合テスト

| 項目 | 内容 |
|---|---|
| 実施タイミング | 全機能実装後 |
| 方式 | シナリオベースのマニュアルテスト（結合テストシナリオ書を別途作成） |
| 対象 | 複数画面・機能にまたがるユーザー操作フロー |

主なシナリオ（予定）：

| シナリオ | 対象機能 |
|---|---|
| 新規登録 → ログイン → 書籍登録 → メモ登録 → ログアウト | F-01 / F-02 / F-03 / F-08 |
| 書籍検索 → 書籍詳細 → メモ編集 → メモ削除 | F-12 / F-06 / F-09 / F-10 |
| 全メモ検索 → タグ絞り込み → お気に入り登録 | F-14 / F-15 |
| お気に入り一覧 → 書籍詳細遷移 → お気に入り解除 | F-16 / F-06 |
| 設定画面からプロフィール更新 → ログアウト | SCR-10 |
| アカウント削除（CASCADE削除の確認） | SCR-10 |

---

### テスト進捗

#### 凡例

| 記号 | 意味 |
|---|---|
| ✅ | 完了 |
| ⬜ | 未実施 |
| — | 対象外 |

#### 認証系

| 画面 / モーダル | 単体テスト | マニュアルテスト | E2Eテスト |
|---|---|---|---|
| SCR-01 ログイン画面 | — | ✅ | ✅ |
| SCR-02 新規ユーザー登録画面 | — | ✅ | ✅ |

#### 書籍系

| 画面 / モーダル | 単体テスト | マニュアルテスト | E2Eテスト |
|---|---|---|---|
| SCR-03 ホーム画面 | ⬜ | ⬜ | ⬜ |
| SCR-04 書籍一覧画面 | ⬜ | ⬜ | ⬜ |
| SCR-05 書籍詳細画面 | ⬜ | ⬜ | ⬜ |
| MOD-01 書籍登録モーダル | ⬜ | ⬜ | ⬜ |
| MOD-02 書籍編集モーダル | ⬜ | ⬜ | ⬜ |

#### メモ系

| 画面 / モーダル | 単体テスト | マニュアルテスト | E2Eテスト |
|---|---|---|---|
| SCR-06 全読書メモ検索画面 | ⬜ | ⬜ | ⬜ |
| SCR-07 読書メモ登録画面（スマホ） | ⬜ | ⬜ | ⬜ |
| SCR-08 読書メモ編集画面（スマホ） | ⬜ | ⬜ | ⬜ |
| SCR-09 お気に入りメモ一覧画面 | ⬜ | ⬜ | ⬜ |
| MOD-03 読書メモ登録モーダル（PC） | ⬜ | ⬜ | ⬜ |
| MOD-04 読書メモ編集モーダル（PC） | ⬜ | ⬜ | ⬜ |

#### その他

| 画面 / モーダル | 単体テスト | マニュアルテスト | E2Eテスト |
|---|---|---|---|
| SCR-10 設定画面 | ⬜ | ⬜ | ⬜ |

#### 結合テスト

| 項目 | 状態 |
|---|---|
| 結合テストシナリオ作成 | ⬜ |
| 結合テスト実施 | ⬜ |