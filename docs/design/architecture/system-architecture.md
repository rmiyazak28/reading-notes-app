# 1. システム構成設計

## 1.1 システム構成図

図のみのファイルは [diagrams/system/architecture](../../diagrams/system/architecture.md) を参照してください。

---

## 1.2 採用技術

| 分類 | 技術 |
|---|---|
| フロントエンド | Next.js(App Router) |
| UI | React + Tailwind CSS |
| 言語 | TypeScript |
| 認証 | Supabase Authentication |
| DB / BaaS | Supabase(PostgreSQL) |
| ORM / BaaS | Supabase |
| ホスティング | Vercel |
| 状態管理 | React Context |
| サーバ処理 | Server Actions |
| PWA | next-pwa |
| バージョン管理 | GitHub |

---

## 1.3 PWA構成

### 概要
スマートフォンでネイティブアプリ風に利用できるよう PWA に対応する。

---

### 構成要素

| 項目 | 内容 |
|---|---|
| manifest.json | アプリ情報定義 |
| Service Worker | キャッシュ制御 |
| HTTPS | セキュア通信 |
| App Icon | ホーム画面アイコン |

---

### 対応内容

| 項目 | 内容 |
|---|---|
| ホーム画面追加 | 対応 |
| standalone起動 | 対応 |
| オフラインキャッシュ | 一部対応 |
| Push通知 | 初期リリース対象外 |
| Background Sync | 初期リリース対象外 |

---

### キャッシュ対象

| 対象 |
|---|
| HTML |
| CSS |
| JavaScript |
| 一部APIレスポンス |