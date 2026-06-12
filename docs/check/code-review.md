# memoLake コードレビュー結果

## メタ情報

| 項目 | 内容 |
|---|---|
| 実施日 | 2026-06-12 |
| 実施者 | Claude Fable 5 |
| 対象 | `src/` 全体（Server Actions / コンポーネント / hooks / lib / 設定）、`tests/` 構成 |
| 対象外 | セキュリティチェック（`docs/check/security-check.md`）で対応済みの項目（エラーメッセージ汎用化※、Zodバリデーション、RLS、フィルタインジェクション） |
| 方針 | 指摘の洗い出しのみ。実装修正は行わない |

※ ただし対応漏れを1件発見したため、指摘 CR-01 として記載する。

## 総評

- 機能コードの品質は全体として良好。Server Actions の認証チェック・バリデーション・統一エラー型のパターンは一貫して守られており、コメントも「why」中心で設計規約に沿っている。
- 主な問題は**重複**に集中している：型定義の4重複、ユーティリティの3重複、モバイルドロワーの2重複、タグ解決ロジックの2重複。いずれも機能追加時の修正漏れ（片方だけ直す）の温床になる。
- shadcn/ui コンポーネントの大半（約40/57ファイル）が未使用で、コードベースの見通しと攻撃面を不必要に広げている。
- CLAUDE.md・設計書に記載のディレクトリ構造と実態の乖離が複数あり、新規参加者（や AI アシスタント）の誤誘導リスクがある。

## 指摘一覧

### CR-01: home/actions の DBエラーメッセージ素通し（セキュリティ Fix 7 の対応漏れ）【重要度: 高】

- **該当箇所:** `src/features/home/actions/index.ts:120-122`
- **内容:** `getHomeData` の3箇所で `error.message` をそのままクライアントへ返している。セキュリティチェック「エラーメッセージの素通し」の修正（books / memos / auth は対応済み）の際、`features/home/actions` が対象から漏れた。
- **推奨対応:** 他の Action と同じく「処理に失敗しました」に統一する。

### CR-02: ActionError / ActionResult 型の4重複定義【重要度: 中】

- **該当箇所:** `src/features/books/actions/index.ts:7-14`、`src/features/memos/actions/index.ts:8-15`、`src/features/auth/actions/index.ts:8-19`、`src/features/home/actions/index.ts:10-17`
- **内容:** 同じ統一エラー型が4ファイルに別々に定義されている。しかも内容が微妙に不一致（auth は `NOT_FOUND` なし、home は `UNAUTHORIZED | DB_ERROR` の2種のみ）。CLAUDE.md は「unified type」と定義しており、共通化されていないのは設計意図とずれている。
- **推奨対応:** `src/types/actions.ts`（CLAUDE.md の構造図に既に `src/types/` が記載されている）へ抽出し、全 Action から import する。

### CR-03: getBooks の戻り値型が統一 ActionResult に従っていない【重要度: 中】

- **該当箇所:** `src/features/books/actions/index.ts:206`
- **内容:** `getBooks` のみ `{ data: Book[] | null; error: string | null }` という独自型を返す。`error` が文字列（`"UNAUTHORIZED"` や汎用メッセージ）のため、呼び出し側で `error.code` による分岐ができず、他 Action と扱いが異なる。
- **推奨対応:** `ActionResult<Book[]>` に統一する。呼び出し箇所は `src/app/(protected)/books/page.tsx` の1箇所のみで影響は小さい。

### CR-04: lib/utils の3ファイル重複【重要度: 中】

- **該当箇所:** `src/lib/utils.ts`、`src/lib/utils/utils.ts`（内容が完全同一）、`src/lib/utils/index.ts`（re-export のみ）
- **内容:** `cn()` 関数が2ファイルに同一実装で存在。import は全て `@/lib/utils` で、TypeScript のモジュール解決上どちらに解決されるか紛らわしい状態（ファイル `utils.ts` が優先されるため `utils/` ディレクトリ側は実質デッドコード）。
- **推奨対応:** `src/lib/utils/` 配下の2ファイルを削除し `src/lib/utils.ts` に一本化する。**削除を伴うため CLAUDE.md ルール上ユーザー承認が必要。**

### CR-05: use-toast / use-mobile の2重複【重要度: 中】

- **該当箇所:** `src/hooks/use-toast.ts`（191行）と `src/components/ui/use-toast.ts`（191行）、`src/hooks/use-mobile.ts` と `src/components/ui/use-mobile.tsx`
- **内容:** 同一内容のフックが2箇所に存在。利用側は全て `@/hooks/` 側を import しており（`sidebar.tsx` も `@/hooks/use-mobile` を参照）、`components/ui/` 側は完全未使用。shadcn CLI 導入時の残骸と推測される。
- **推奨対応:** `components/ui/use-toast.ts`・`use-mobile.tsx` の削除（**要ユーザー承認**）。

### CR-06: モバイルナビゲーションドロワーの実装重複【重要度: 中】

- **該当箇所:** `src/components/layout/header.tsx:38-42, 122-186` と `src/features/books/components/book-detail-page.tsx:39-43, 183-254`
- **内容:** `navItems` 定義・ユーザー情報表示・ナビリンク・設定/ログアウトを含むドロワー一式（約90行）がほぼコピーで2箇所に存在する。book-detail-page 側のコメントに「他画面のヘッダーを変更せずに済む」と意図は書かれているが、メニュー項目追加時に2箇所の修正が必要になる。
- **推奨対応:** ドロワー部分を `components/layout/navigation-drawer.tsx` として抽出し、両者から利用する。

### CR-07: タグ解決ロジックの重複と逐次クエリ【重要度: 中】

- **該当箇所:** `src/features/memos/actions/index.ts:292-311`（updateMemo）と `387-407`（createMemo）
- **内容:**
  1. 新規タグの upsert → id 解決のループ約20行がほぼ同一の2重実装。
  2. ループ内で `await` しているため、タグ N 件で N 回の逐次 DB クエリが発生する。`upsert` は配列を受け取れるため1クエリにまとめられる。
- **推奨対応:** `resolveTagIds(supabase, userId, tags)` のような共通関数に抽出し、あわせてバッチ upsert 化する。

### CR-08: `as unknown as` 二重キャストの多用【重要度: 低】

- **該当箇所:** `src/features/books/actions/index.ts:113-114, 245`、`src/features/memos/actions/index.ts:87, 137, 238`、`src/features/home/actions/index.ts:145-147` の計8箇所
- **内容:** Supabase クライアントに DB スキーマ型（`Database` 生成型）を与えていないため、JOIN 結果を二重キャストで握りつぶしている。スキーマ変更時に型エラーが出ず、実行時まで気づけない。
- **推奨対応:** `supabase gen types typescript` で型を生成し `createClient<Database>()` に適用する。キャストの大半が不要になる。

### CR-09: revalidatePath の適用が不統一【重要度: 低】

- **該当箇所:** `src/features/memos/actions/index.ts:196, 335`（deleteMemo / updateMemo のみ）
- **内容:** `createMemo`・`toggleFavorite`・books 系の全 Action には `revalidatePath` がない。現状はクライアント側の `useState` 更新で画面が同期されるため動作するが、「いつ revalidate するか」の規約がなく、さらにこの `revalidatePath` が単体テスト5件（`update-memo.test.ts`）の既知の失敗原因になっている（テスト側で `next/cache` が未モック）。
- **推奨対応:** (1) テストに `vi.mock("next/cache")` を追加して既存5件の失敗を解消する。(2) revalidate の方針（クライアント state 更新に統一 or 全ミューテーションで revalidate）を設計書に明記する。

### CR-10: 未使用 shadcn/ui コンポーネントが約40ファイル【重要度: 低】

- **該当箇所:** `src/components/ui/` 全57ファイル中、実際に import されているのは17個（button, input, spinner, alert-dialog, textarea, dialog, separator, toast, table, sheet, select, skeleton, label, tooltip, toggle, toaster, dropdown-menu）
- **内容:** accordion / calendar / carousel / sidebar（726行）など約40ファイルが未使用。`package.json` の Radix 依存（27パッケージ）の多くもこれらのためだけに存在する可能性が高い。セキュリティチェックで指摘済みの `chart.tsx` もこの一部。
- **推奨対応:** 未使用コンポーネントと対応する依存パッケージの削除。**削除・package.json 変更のためユーザー承認必須。** 削除しない判断なら現状維持で実害はない。

### CR-11: CLAUDE.md・設計書のディレクトリ構造と実態の乖離【重要度: 低】

- **該当箇所:** CLAUDE.md「Directory Structure」、実際の `src/`
- **内容（差分）:**
  - 記載あり・実在しない: `src/constants/`、`src/types/`、`features/*/hooks/`、`src/middleware.ts`、`(protected)/favorites/`
  - 実在する・記載なし: `features/home/`（actions + components 6ファイル）、`src/proxy.ts`（Next.js 16 で middleware が proxy に改名されたもの）、`src/lib/supabase/proxy.ts`
  - 画面IDの表記ゆれ: CLAUDE.md は `favorites/ # SCR-09`・`settings/ # SCR-10` だが、実装・テスト・コミット履歴は設定画面を SCR-09 として扱っている
- **推奨対応:** CLAUDE.md を実態に合わせて更新する（ドキュメントのみの修正）。

### CR-12: ハードコードされたカラーコード【重要度: 低】

- **該当箇所:** `src/features/books/components/book-detail-page.tsx:260, 265, 292-293`（`text-[#94a3b8]`、`text-[#f1f5f9]`、`text-[#22d3ee]`、`text-[#cbd5e1]`）ほか同様の箇所が他コンポーネントにも存在する可能性
- **内容:** Tailwind テーマトークン（`text-muted-foreground` 等）が定義済みにもかかわらず、生のカラーコードを直接指定している箇所がある。テーマ変更（先日の `muted-foreground` 調整のような）が反映されない。
- **推奨対応:** 既存トークンへ置換する。全コンポーネントの洗い出しが必要。

### CR-13: getMemos の bookId が undefined の場合の挙動【要確認】

- **該当箇所:** `src/features/memos/actions/index.ts:115-135`
- **内容:** `GetMemosParams.bookId` は optional だが、クエリは無条件に `.eq("book_id", params.bookId)` を実行する。`bookId` が undefined のまま呼ばれると意図しないフィルタ（または PostgREST エラー）になる。現状の呼び出し箇所は常に bookId を渡しているため実害は未確認。
- **推奨対応:** 「bookId を必須にする」か「undefined 時は eq を付けない」のどちらが仕様として正しいか要確認。型を必須（`bookId: string`）にするのが最も安全。

### CR-14: メモフォームの4実装【要確認】

- **該当箇所:** `memo-create-modal.tsx`（PC・新規）、`memo-new-page.tsx`（モバイル・新規）、`memo-edit-modal.tsx`（PC・編集）、`memo-edit-page.tsx`（モバイル・編集）
- **内容:** デバイス別実装（MOD-03/04 と SCR-07/08）は設計通りだが、フォーム状態管理・バリデーション・送信処理のロジックが4ファイルに分散している可能性が高い。UI の分離は維持しつつ、ロジックのみカスタムフック（例: `useMemoForm`）に共通化できる余地がある。
- **推奨対応:** 設計上の意図的な分離（レスポンシブパターン）であるため、共通化の範囲（ロジックのみ / フォーム部品まで）は要確認。大規模リファクタになるため着手前に方針合意が必要。

### CR-15: tests/e2e/tests/unit/ の命名【重要度: 低（軽微）】

- **該当箇所:** `tests/e2e/tests/unit/`（画面単体の e2e）と `tests/e2e/tests/integration/`（結合）、別途 `tests/unit/`（vitest）
- **内容:** e2e 配下に `unit` という名前のディレクトリがあり、vitest の `tests/unit/` と紛らわしい。`screens/` 等への改名が分かりやすいが、CI・ドキュメントの参照箇所も変わるため優先度は低い。

## 問題なしと確認できた項目

| 項目 | 確認内容 |
|---|---|
| Server Actions のパターン | 認証チェック → Zod 検証 → DB 操作の順序が全 Action で一貫 |
| コメント規約 | 「why」中心のコメントが徹底されている（`// キー入力ごとにサーバーリクエストが発生しないよう...` 等） |
| `any` の使用 | ゼロ件（strict 規約遵守）。`@ts-ignore` もなし |
| eslint-disable | 3件のみで、すべて `react-hooks/exhaustive-deps` のモーダル開閉リセット用途（妥当な使用） |
| 楽観的 UI 更新 | book-detail-page の memoCount / starCount 同期ロジックは網羅的（作成・更新・削除・お気に入り切替すべてで整合） |
| 状態管理 | 設計書通り（検索条件=URL、モーダル=useState、フォーム=React Hook Form） |
| 単体テスト | actions 層を中心に99件。モック構成も一貫している（既知の5件失敗は CR-09 参照） |
