# memoLake リファクタリング計画書

## メタ情報

| 項目 | 内容 |
|---|---|
| 作成日 | 2026-06-12 |
| 作成者 | Claude Fable 5 |
| 根拠 | `docs/check/code-review.md` の指摘（CR-01〜CR-15） |
| 方針 | 1タスクで完結する単位に分割。大規模リファクタリングは行わない。各タスクは独立してコミット・レビュー可能 |
| 対象外 | セキュリティチェックで対応済みの項目 |

## タスク一覧（推奨実施順）

| ID | 対応する指摘 | 内容 | 規模 | 削除/設定変更の承認 |
|---|---|---|---|---|
| RF-01 | CR-01 | home/actions のエラーメッセージ汎用化（Fix 7 漏れ） | 小 | 不要 |
| RF-02 | CR-09 | update-memo.test.ts の next/cache モック追加（既存5件の失敗解消） | 小 | 不要 |
| RF-03 | CR-02 | ActionError / ActionResult 型の共通化 | 小 | 不要 |
| RF-04 | CR-03 | getBooks の戻り値を ActionResult に統一 | 小 | 不要 |
| RF-05 | CR-04 | lib/utils の重複解消 | 小 | **要承認（削除）** |
| RF-06 | CR-05 | components/ui 配下の use-toast / use-mobile 削除 | 小 | **要承認（削除）** |
| RF-07 | CR-06 | モバイルナビゲーションドロワーの共通化 | 中 | 不要 |
| RF-08 | CR-07 | タグ解決ロジックの共通関数抽出 + バッチ upsert 化 | 中 | 不要 |
| RF-09 | CR-13 | getMemos の bookId を必須化（要確認事項の解消後） | 小 | 不要 |
| RF-10 | CR-11 | CLAUDE.md のディレクトリ構造を実態に同期 | 小 | 不要（ドキュメントのみ） |
| RF-11 | CR-12 | ハードコード色のテーマトークン置換 | 中 | 不要 |
| RF-12 | CR-08 | Supabase Database 型生成の導入 | 中 | **要承認（設定/依存）** |
| RF-13 | CR-10 | 未使用 shadcn/ui コンポーネントと依存の削除 | 中 | **要承認（削除 + package.json）** |
| RF-14 | CR-14 | メモフォームロジックのカスタムフック化 | 大→分割要 | 不要（着手前に方針合意） |

---

## 各タスク詳細

### RF-01: home/actions のエラーメッセージ汎用化【最優先】

- **変更ファイル:** `src/features/home/actions/index.ts`（3箇所）
- **内容:** `getHomeData` の `DB_ERROR` 時の `error.message` を「処理に失敗しました」に置換。セキュリティ修正 Fix 7 と同一パターンの対応漏れであり、他より優先して実施すべき。
- **検証:** `npm run build`。home の単体テストは未作成のため新規テストは任意。
- **コミット案:** `fix: getHomeData のDBエラーメッセージを汎用メッセージに統一（Fix7漏れ分）`

### RF-02: 既存単体テスト5件の失敗解消

- **変更ファイル:** `tests/unit/features/memos/actions/update-memo.test.ts`
- **内容:** `vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))` を追加し、「static generation store missing」エラーで失敗している5件を解消する。プロダクトコードの変更なし。
- **検証:** `npm run test` で 99/99 件通過を確認。
- **コミット案:** `test: update-memo.test.ts に next/cache モックを追加し既存5件の失敗を解消`

### RF-03: ActionError / ActionResult 型の共通化

- **変更ファイル:** `src/types/actions.ts`（新規）、`src/features/{books,memos,auth,home}/actions/index.ts`
- **内容:** 統一型を1ファイルに定義し、4つの actions から import に置き換える。型定義のみの変更で実行時挙動は不変。auth の code 一覧（`NOT_FOUND` なし）と home の code 一覧（2種のみ）は共通型のサブセットとして許容されるため、共通型は5種フルセット（`UNAUTHORIZED | VALIDATION | NOT_FOUND | DB_ERROR | UNKNOWN`）で定義する。
- **検証:** `npm run build` + `npm run test`。
- **コミット案:** `refactor: ActionResult/ActionError 型を src/types/actions.ts に共通化`

### RF-04: getBooks の戻り値を ActionResult に統一

- **変更ファイル:** `src/features/books/actions/index.ts`、`src/app/(protected)/books/page.tsx`
- **内容:** `getBooks` の戻り値を `ActionResult<Book[]>` に変更し、呼び出し側（1箇所）の error 判定を `error.code === "UNAUTHORIZED"` 形式に合わせる。
- **検証:** `npm run build` + 書籍一覧の e2e（`scr-05-mod-02` ほか）。
- **コミット案:** `refactor: getBooks の戻り値型を統一 ActionResult に変更`

### RF-05: lib/utils の重複解消【要承認】

- **変更ファイル:** `src/lib/utils/utils.ts`・`src/lib/utils/index.ts`（削除）、`src/lib/utils.ts`（維持）
- **内容:** 全 import が `@/lib/utils`（= `utils.ts` に解決）であることを確認済みのため、`utils/` ディレクトリごと削除しても影響なし。**ファイル削除のため CLAUDE.md ルール上ユーザーの明示承認が必要。** 承認が得られない場合は `utils/utils.ts` の中身を `export * from "../utils"` に置き換えて実装を一本化する代替案もある。
- **検証:** `npm run build`。
- **コミット案:** `refactor: lib/utils の重複定義を解消`

### RF-06: components/ui の use-toast / use-mobile 削除【要承認】

- **変更ファイル:** `src/components/ui/use-toast.ts`、`src/components/ui/use-mobile.tsx`（削除）
- **内容:** 両ファイルとも import 元ゼロの完全未使用（利用側は全て `@/hooks/` 版）。**削除のため要承認。**
- **検証:** `npm run build`。
- **コミット案:** `refactor: 未使用の components/ui/use-toast・use-mobile を削除`

### RF-07: モバイルナビゲーションドロワーの共通化

- **変更ファイル:** `src/components/layout/navigation-drawer.tsx`（新規）、`src/components/layout/header.tsx`、`src/features/books/components/book-detail-page.tsx`
- **内容:** `navItems` 定義とドロワー（Sheet）一式を `NavigationDrawer` コンポーネントとして抽出。header と book-detail-page から重複約90行を削減する。見た目・挙動は完全に維持する（トリガーボタンの配置だけ呼び出し側に残す）。
- **検証:** `npm run build` + ホーム/書籍詳細のモバイル e2e（`scr-03-home-mobile` 等）+ マニュアル確認（ドロワー開閉・ナビ遷移・ログアウト）。
- **コミット案:** `refactor: モバイルナビゲーションドロワーを NavigationDrawer に共通化`

### RF-08: タグ解決ロジックの共通化 + バッチ upsert

- **変更ファイル:** `src/features/memos/actions/index.ts`
- **内容:**
  1. createMemo / updateMemo に重複するタグ upsert ループを `resolveTagIds()` 内部関数に抽出。
  2. 1件ずつの逐次 upsert を配列渡しの一括 upsert に変更（タグ N 件で N クエリ → 1クエリ）。
- **検証:** `npm run test`（create-memo / update-memo テスト）+ タグ付きメモ作成・編集の e2e（`int-06` 等）。
- **コミット案:** `refactor: タグ解決ロジックを共通化しバッチupsert化`

### RF-09: getMemos の bookId 必須化【要確認の解消が前提】

- **変更ファイル:** `src/features/memos/actions/index.ts`、（呼び出し側があれば型修正）
- **内容:** 現状の呼び出しが常に bookId 付きであることを前提に、`GetMemosParams.bookId` を必須 `string` に変更し、optional 分岐を排除する。**「bookId なしで全メモ取得」のユースケースが将来要件にあるかは要確認**（全メモ検索は `searchMemos` が担っているため、不要と推測されるが断定しない）。
- **検証:** `npm run build` + `npm run test`（get-memos テスト）。
- **コミット案:** `refactor: getMemos の bookId を必須パラメータに変更`

### RF-10: CLAUDE.md のディレクトリ構造を実態に同期

- **変更ファイル:** `CLAUDE.md`（必要に応じて設計書の該当箇所）
- **内容:**
  - 実在しない記載を削除または注記: `src/constants/`、`src/types/`（RF-03 実施後は実在する）、`features/*/hooks/`、`(protected)/favorites/`
  - 実在する構成を追記: `features/home/`、`src/proxy.ts`（middleware の Next.js 16 名称）、`src/lib/supabase/proxy.ts`
  - 画面ID表記（SCR-09 = 設定）の整合を確認して統一
- **検証:** ドキュメントのみのためビルド不要。
- **コミット案:** `docs: CLAUDE.md のディレクトリ構造を実装の実態に同期`

### RF-11: ハードコード色のテーマトークン置換

- **変更ファイル:** `src/features/**/*.tsx` のうち `text-[#...]` / `bg-[#...]` を含むファイル（事前に全件 grep で洗い出す）
- **内容:** `#94a3b8` → `text-muted-foreground` 等、`globals.css` 定義済みトークンへの置換。対応するトークンがない色（`#22d3ee` のアクセント等）は置換せず一覧化して報告し、トークン追加の要否をユーザーに確認する。
- **検証:** `npm run build` + 各画面の目視確認（色味が変わる可能性があるため、置換前後の対応表を提示して承認を得る）。
- **コミット案:** `refactor: ハードコード色を Tailwind テーマトークンに置換`

### RF-12: Supabase Database 型生成の導入【要承認】

- **変更ファイル:** `src/types/database.ts`（生成・新規）、`src/lib/supabase/{client,server}.ts`、各 actions のキャスト箇所、`package.json`（gen スクリプト追加）
- **内容:** `supabase gen types typescript` でスキーマ型を生成し `createClient<Database>()` に適用。`as unknown as` 8箇所を型安全な形に置き換える。**package.json 変更を伴うため要承認。** JOIN 集計（`reading_memos(count)`）の型は生成型でも表現しきれない場合があり、その場合は最小限のキャストを残す。
- **検証:** `npm run build` + `npm run test` 全件。
- **コミット案:** `refactor: Supabase Database 生成型を導入し二重キャストを削減`

### RF-13: 未使用 shadcn/ui コンポーネントの削除【要承認】

- **変更ファイル:** `src/components/ui/` の未使用約40ファイル（削除）、`package.json`（対応する未使用 Radix 依存の削除）
- **内容:** 使用中17コンポーネント（button, input, spinner, alert-dialog, textarea, dialog, separator, toast, table, sheet, select, skeleton, label, tooltip, toggle, toaster, dropdown-menu）以外を削除。削除前に (1) 削除対象の最終リスト、(2) 各依存パッケージの使用有無の突合結果を提示して承認を得る。**ファイル削除 + package.json 変更のため二重に要承認。**
- **検証:** `npm run build` + `npm run test` + e2e 全件。
- **コミット案:** `refactor: 未使用の shadcn/ui コンポーネントと依存パッケージを削除`

### RF-14: メモフォームロジックのカスタムフック化【着手前に方針合意が必要】

- **変更ファイル:** `src/features/memos/hooks/use-memo-form.ts`（新規）、メモ系4コンポーネント
- **内容:** デバイス別4実装（create-modal / new-page / edit-modal / edit-page）のフォーム状態・送信・エラー処理ロジックを共通フックに抽出。UI（モーダル/ページの見た目）は設計通り別実装のまま維持する。
- **注意:** 4ファイル同時変更となり「小さな diff」の原則に抵触しかねないため、実施する場合は (1) フック新規作成、(2) 新規系2ファイル適用、(3) 編集系2ファイル適用、の3コミットに分割する。**共通化の範囲（ロジックのみか、フォーム部品 UI までか）はユーザーと合意してから着手する。**
- **検証:** 各段階で `npm run test` + メモ系 e2e 全件（`mod-03` / `mod-04` / `int-02` / `int-08` 等）。

---

## 実施しないこと（明示的な非対象）

- **features 横断のアーキテクチャ変更**（レイヤー追加、actions の分割方針変更など）— 現行パターンで一貫しており、変更の便益がコストに見合わない。
- **tests/e2e/tests/unit/ のディレクトリ改名**（CR-15）— 紛らわしさはあるが、CI 設定・ドキュメント・19 spec ファイルの参照に波及するわりに得るものが小さい。要望があれば単独タスクとして起票する。
- **chart.tsx 単独の削除** — RF-13 に包含する。
