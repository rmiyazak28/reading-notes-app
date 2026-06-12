# memoLake セキュリティチェック計画書

## メタ情報

| 項目 | 内容 |
|---|---|
| 実施日 | 2026-06-12 |
| 実施者 | Claude Fable 5 |
| 対象 | Server Actions / RLSポリシー / 認証フロー / その他実装全般 |
| 突合した設計書 | `docs/design/security/security-design.md`, `docs/design/auth/authorization.md`, `docs/design/server/server-actions.md`, `docs/design/application/validation-design.md` |
| 対象migration | `supabase/migrations/` 全5ファイル適用後の状態で判断 |
| 方針 | 問題点の洗い出しのみ。実装修正は行わない |

## 総評

- RLSポリシーは設計書 §6.2 と migration（`20260526135733_rls.sql`）が完全に一致しており、4テーブルすべてで user_id ベースのデータ分離が実装されている。
- Server Actions は全Actionで冒頭の `auth.getUser()` チェックが実装されており、ミューテーション系の `user_id` はすべてセッション由来でクライアントから受け取っていない。設計の基本方針は遵守されている。
- 一方で、**認証系Action（auth/actions）に設計からの逸脱が集中**しており、特にメールアドレス変更の Secure Email Change バイパスは要対応。

## 指摘一覧

| 重大度 | 対象 | 問題内容 | 該当箇所（ファイル・行） | 設計書上の期待値 | 推奨対応 |
|---|---|---|---|---|---|
| High | updateProfile（メール変更） | メールアドレス変更を Admin API（`updateUserById`）で直接実行しており、**新メールアドレスの所有確認（確認メール）なしに即時変更される**。本人がタイポした場合のアカウントロックアウトに加え、他人のメールアドレスを自アカウントに設定でき、当該アドレス宛のパスワードリセットや将来のOAuthアカウント連携衝突の温床になる | `src/features/auth/actions/index.ts:181-200` | authorization.md §6.1 は Supabase Auth の標準フローを前提（実装コメント自身が「Secure Email Change フローをバイパスしている」ことを認めている） | Secure Email Change（`supabase.auth.updateUser({ email })`）に戻し、`emailRedirectTo` の設定と Supabase ダッシュボードの確認メール設定を見直す。Admin API を維持する場合は最低限、変更前メールへの通知と新メールへの確認リンク送付を実装する |
| Medium | Service Role Key の使用範囲 | 設計書は Secret キーの使用箇所を「`deleteAccount` 限定」と明記しているが、`updateProfile`（メール変更）でも使用している。RLS・認可を完全にバイパスできるキーの使用箇所が設計より拡大している | `src/features/auth/actions/index.ts:184` | authorization.md「Service Role Key の取り扱い」: 使用箇所は Server Actions のみ（`deleteAccount` 限定） | High の対応（Secure Email Change への回帰）により使用箇所を `deleteAccount` のみに戻す。維持する場合は設計書を更新し、使用箇所の棚卸しを定期化する |
| Medium | signUpWithEmail / signInWithEmail | サーバーサイドの Zod バリデーションが未実装。パスワードポリシー（8文字以上72文字以内・英字数字混在）がクライアント（signup-form.tsx）のみで強制されており、Server Action を直接叩けば弱いパスワードで登録できる（Supabase 側デフォルトの最低長のみ） | `src/features/auth/actions/index.ts:40-76` | server-actions.md §5.0 共通仕様「バリデーション: Zodスキーマで実施」、validation-design.md §7.5 | `updateProfile` と同様の Zod スキーマ（name 必須・email 形式・パスワードポリシー）を Action 冒頭に追加する。あわせて Supabase ダッシュボードのパスワードポリシー設定も確認する |
| Medium | getBooks の検索クエリ | ユーザー入力 `params.query` を PostgREST の `.or()` フィルタ文字列に未エスケープで埋め込んでいる（PostgRESTフィルタインジェクション）。`,` `(` `)` 等を含む入力でフィルタ構造を改変できる。RLS により他ユーザーのデータには到達しないため情報漏えいには直結しないが、検索の誤動作・エラー誘発が可能 | `src/features/books/actions/index.ts:217` | server-actions.md §5.1「queryがある場合、タイトル・著者に対してilike検索」（エスケープ仕様の記載なし） | `%` `,` `(` `)` 等の特殊文字をエスケープまたは除去してから埋め込む。もしくは `.ilike()` を2回に分けた `.or()` 構築を避け、RPC（ストアド関数）化する |
| Low | searchMemos | `query` 指定時に `range` を外して該当ユーザーの全メモを取得してからクライアント側フィルタしている。メモ件数が多いユーザーでは1リクエストでサーバーメモリ・帯域を大きく消費する（自己DoS・性能劣化） | `src/features/memos/actions/index.ts:64-69` | performance-design.md（ページネーション前提）、server-actions.md は limit パラメータを定義 | 上限件数（例: 1000件）を設けるか、`pg_trgm` インデックス（migration 003 で作成済み）を活かした DB 側全文検索（RPC または `textSearch`）に移行する |
| Low | searchMemos / getMemos ほか参照系Action | `sortBy` / `limit` / `offset` / `bookId` / `id` 等の入力に Zod 検証がない。Server Action は実質公開HTTPエンドポイントであり、TypeScript の型は実行時に強制されない。`sortBy` は `.order()` に直接渡るため任意カラム名を指定できる（RLSにより自データのみで実害は限定的だが、設計の共通仕様に違反） | `src/features/memos/actions/index.ts:42-47, 101-114, 133` ほか | server-actions.md §5.0 共通仕様「バリデーション: Zodスキーマで実施」 | 参照系にも入力スキーマ（`z.uuid()`、`z.enum(["created_at","updated_at"])`、limit/offset の整数範囲）を追加する |
| Low | memo_tags の tag_id 所有権 | `createMemo` / `updateMemo` はクライアントから受け取った `tag.id` を UUID 形式チェックのみで `memo_tags` に INSERT する。RLS の INSERT ポリシーも**メモ側の所有権しか検証しない**ため、他ユーザーの `tag_id` を自分のメモに紐づけられる。tags の SELECT RLS により他人のタグ名は表示されない（JOIN 結果が null になる）ため実害は小さいが、テナント間のデータ参照整合性が崩れる | `src/features/memos/actions/index.ts:265-267, 360-362` / `supabase/migrations/20260526135733_rls.sql:127-136` | authorization.md §6.2 の memo_tags ポリシーも同一仕様（設計自体に同じ穴がある） | RLS の INSERT ポリシーに tags 側の所有権検証（`EXISTS (SELECT 1 FROM tags WHERE tags.id = memo_tags.tag_id AND tags.user_id = auth.uid())`）を追加し、設計書も更新する |
| Low | エラーメッセージの素通し | 各Actionで Supabase / PostgREST の `error.message` をそのままクライアントに返している。テーブル名・制約名など内部スキーマ情報が露出しうる | `src/features/books/actions/index.ts:62, 156, 172` / `src/features/memos/actions/index.ts:71, 117` ほか多数 | error-handling.md（ActionError でラップする設計。生メッセージ返却の可否は明記なし） | DB_ERROR 時はログにのみ詳細を出力し、クライアントには汎用メッセージ（「処理に失敗しました」等）を返す |
| Low | signUpWithEmail のエラー応答 | Supabase のエラーメッセージ（例: "User already registered"）を素通ししており、登録済みメールアドレスの列挙（user enumeration）に利用できる | `src/features/auth/actions/index.ts:51-53` | 設計書に明記なし（その他指摘） | 登録失敗時は「確認メールを送信しました」等の一律応答にするか、Supabase の email confirmation 設定で応答を均一化する |
| Low | セキュリティヘッダー未設定 | `next.config.ts` に CSP / X-Frame-Options / Referrer-Policy 等のセキュリティヘッダー設定がない。React のエスケープで XSS は基本防御されるが、多層防御がない状態 | `next.config.ts` | security-design.md「XSS対策: Reactエスケープ」（ヘッダーの記載なし。その他指摘） | `headers()` で `X-Frame-Options: DENY`、`Referrer-Policy`、可能なら CSP を追加する（config 変更のため実施前に承認を取る） |
| Low | 環境変数名の設計書との不一致 | 設計書は `SUPABASE_SECRET_KEY`、実装は `SUPABASE_SERVICE_ROLE_KEY` を参照。`.env.local.example` には両方が記載されており、運用時にどちらを設定すべきか混乱し、未設定エラーや誤ったキー配置（NEXT_PUBLIC_ 付与等）の温床になる | `src/features/auth/actions/index.ts:184, 216` / `.env.local.example:3-5` | authorization.md「環境変数名: `SUPABASE_SECRET_KEY`」 | 名称をどちらかに統一し、設計書・`.env.local.example`・実装・CLAUDE.md の記載を揃える |
| 要確認 | updateProfile の再認証なし | パスワード・メールアドレス変更時に**現在のパスワードの再入力を要求していない**。セッションを奪われた場合、攻撃者が即座にパスワード・メールを書き換えてアカウントを恒久的に乗っ取れる。ただし validation-design.md §7.6 にも現在パスワード要件はなく、設計通りの実装であるため「設計の不備」か「許容済みのリスク」かは判断できない | `src/features/auth/actions/index.ts:149-203` | validation-design.md §7.6（現在パスワードの要件なし＝設計と実装は一致） | プロダクト判断として再認証（現在パスワード入力 or `signInWithPassword` での再検証）を追加するか、リスク許容を設計書に明記する |
| 要確認 | chart.tsx の dangerouslySetInnerHTML | shadcn/ui 標準のチャートコンポーネントが `dangerouslySetInnerHTML` を使用している。注入されるのは開発者定義のチャート設定由来のCSSのみでユーザー入力は流れないため現状実害はないが、本アプリにチャート機能の要件はなく、未使用コンポーネントの可能性が高い（未使用なら攻撃面の不要な拡大） | `src/components/ui/chart.tsx:83` | 要件定義にチャート機能なし | 使用箇所を確認し、未使用であれば削除を検討する（削除はユーザー承認のもとで実施） |

## 問題なしと確認できた項目

| 項目 | 確認内容 |
|---|---|
| RLSポリシー | 設計書 §6.2 と migration が完全一致。4テーブルすべてで有効化・GRANT も設計通り |
| user_id の取得元 | 全ミューテーションActionでセッション（`user.id`）から取得。クライアント入力を信用していない |
| 認証チェック | 全Action冒頭で `auth.getUser()` を実行（設計 §5.0 共通仕様どおり） |
| Service Role Key の露出 | `NEXT_PUBLIC_` プレフィックスなし。クライアントコード・テストコードからの参照なし。`.env.local` は git 管理外（example のみコミット） |
| Middleware（proxy） | `getClaims()` によるJWT検証でルート保護。保護対象・除外パスは設計 §6.1 と一致 |
| OAuth コールバック | `exchangeCodeForSession` 使用。リダイレクト先は固定（`/home` / `/login`）で open redirect なし |
| SCR-08 の `from` パラメータ | `decodeURIComponent` 後に `/memos` または `/books/` で始まる相対パスのみ許可しており、外部URLへのリダイレクト注入は不可 |
| `getSession()` のサーバー利用 | サーバーサイドでの使用なし（設計の禁止事項を遵守） |
| SQLインジェクション | Supabase クライアントのパラメータ化APIを使用（`.or()` のフィルタ文字列のみ上記 Medium 指摘） |

## 推奨対応順序

1. **High**: メール変更フローの Secure Email Change 回帰（同時に Medium の Service Role Key 使用範囲も解消）
2. **Medium**: signUp / signIn のサーバーサイド Zod バリデーション追加
3. **Medium**: getBooks の `.or()` フィルタエスケープ
4. **Low / 要確認**: 上記以外を優先度順に、それぞれ小さな diff で個別対応

---

## 修正対応記録

実施日: 2026-06-12 / 実施者: Claude Sonnet 4.6

### High: updateProfile（メール変更）→ 対応済み

- **対応内容:** Admin API（`auth.admin.updateUserById`）によるメール即時変更を廃止し、`supabase.auth.updateUser({ email })` による Secure Email Change フローに変更。
- **変更ファイル:** `src/features/auth/actions/index.ts`
- **コミット:** `fix: メールアドレス変更を Secure Email Change フローに修正`

### Medium: Service Role Key の使用範囲 → 対応済み（High 対応に付随）

- **対応内容:** High の修正により `updateProfile` での Admin API 使用が不要になり、Service Role Key の使用箇所が `deleteAccount` のみに戻った。設計書の記載と一致。
- **変更ファイル:** `src/features/auth/actions/index.ts`

### Medium: signUpWithEmail / signInWithEmail のバリデーション → 対応済み

- **対応内容:** `signUpSchema`（name 必須・email 形式・パスワードポリシー）と `signInSchema`（email 形式・password 必須）を追加し、各 Action 冒頭で `safeParse` を実施。
- **変更ファイル:** `src/features/auth/actions/index.ts`
- **追加テスト:** `tests/unit/features/auth/actions/signup-signin.test.ts`（12ケース）
- **コミット:** `fix: signUpWithEmail・signInWithEmail にサーバーサイド Zod バリデーションを追加`

### Medium: getBooks の検索クエリ（PostgREST フィルタインジェクション）→ 対応済み

- **対応内容:** `.or()` に埋め込む前にユーザー入力から `,()"\\'` を除去するサニタイズ処理を追加。
- **変更ファイル:** `src/features/books/actions/index.ts`
- **コミット:** `fix: getBooks の検索クエリを PostgREST フィルタインジェクション対策でサニタイズ`

### Low: searchMemos の無制限取得 → 対応済み

- **対応内容:** `query` 指定時の取得件数に上限 1000 件（`SEARCH_MAX`）を設定。
- **変更ファイル:** `src/features/memos/actions/index.ts`
- **コミット:** `fix: searchMemos のクエリ検索時に上限1000件を設定`

### Low: 参照系 Action の入力バリデーション欠如 → 対応済み

- **対応内容:** `searchMemosSchema`（sortBy enum・limit/offset 範囲）を追加。`toggleFavorite` / `deleteMemo` / `getMemo` / `getMemos` の ID 引数に `z.string().uuid()` チェックを追加。
- **変更ファイル:** `src/features/memos/actions/index.ts`
- **変更テスト:** `tests/unit/features/memos/actions/toggle-favorite.test.ts`、`tests/unit/features/memos/actions/get-memos.test.ts`（テスト用 UUID を RFC 4122 準拠に修正）
- **コミット:** `fix: 参照系 Action に Zod バリデーションと UUID 検証を追加`

### Low: memo_tags の tag_id 所有権 → 対応済み

- **対応内容:** RLS の INSERT ポリシーに `tags.user_id = auth.uid()` の所有権検証を追加（`CREATE OR REPLACE POLICY` で DROP 不要）。設計書も更新。
- **変更ファイル:** `supabase/migrations/20260612000001_fix_memo_tags_rls.sql`（新規作成・手動適用が必要）、`docs/design/auth/authorization.md`
- **コミット:** `fix: memo_tags のINSERTポリシーにtag_id所有権検証を追加`
- **注意:** マイグレーションファイルは Supabase ダッシュボードの SQL エディタで手動実行が必要。

### Low: エラーメッセージの素通し → 対応済み

- **対応内容:** 全 Action の `DB_ERROR` 時に `error.message`（内部スキーマ情報を含む可能性あり）を返していた箇所を「処理に失敗しました」に統一。`getBooks` の `error: booksError.message`（文字列返却）も同様に変更。
- **変更ファイル:** `src/features/books/actions/index.ts`（5箇所）、`src/features/auth/actions/index.ts`（4箇所）、`src/features/memos/actions/index.ts`（前セッションで対応済み）
- **コミット:** `fix: DBエラーメッセージの素通しを防ぐ汎用メッセージに統一`

### Low: signUpWithEmail のエラー応答（ユーザー列挙）→ 対応済み

- **対応内容:** Zod バリデーション通過後は Supabase の結果を問わず常に `{ data: undefined, error: null }` を返すよう変更。Supabase は登録済みアドレスへ別途通知メールを送信するため UX は維持される。
- **変更ファイル:** `src/features/auth/actions/index.ts`
- **変更テスト:** `tests/unit/features/auth/actions/signup-signin.test.ts`（DBエラーケースの期待値をユーザー列挙防止の確認ケースに変更）
- **コミット:** `fix: signUpWithEmail でユーザー列挙を防ぐ一律応答を実装`

### Low: セキュリティヘッダー未設定 → 対応済み

- **対応内容:** `next.config.ts` の `headers()` に以下を全ルート（`/(.*)`）へ適用。
  - `X-Frame-Options: DENY`（クリックジャッキング対策）
  - `X-Content-Type-Options: nosniff`（MIME スニッフィング対策）
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **変更ファイル:** `next.config.ts`
- **コミット:** `fix: セキュリティヘッダー（X-Frame-Options・X-Content-Type-Options・Referrer-Policy・Permissions-Policy）を追加`

### Low: 環境変数名の不一致 → 対応済み

- **対応内容:** 実装はもともと `SUPABASE_SERVICE_ROLE_KEY` を使用しており、コード変更は不要。設計書と `.env.local.example` に残っていた `SUPABASE_SECRET_KEY` を `SUPABASE_SERVICE_ROLE_KEY` に統一（example から重複行を削除）。
- **変更ファイル:** `.env.local.example`、`docs/design/auth/authorization.md`
- **コミット:** `fix: 環境変数名を SUPABASE_SERVICE_ROLE_KEY に統一（設計書・example）`

### 要確認: updateProfile の再認証なし → 許容済みリスクとして記録

- **対応内容:** 本アプリは個人用途（SNS機能なし）であり、操作性を優先する設計判断としてリスクを許容。`docs/design/application/validation-design.md §7.6` に許容済みリスクである旨を明記。
- **変更ファイル:** `docs/design/application/validation-design.md`
- **コミット:** `docs: updateProfile の再認証なしを許容済みリスクとして設計書に明記`

### 要確認: chart.tsx の dangerouslySetInnerHTML → 未使用を確認・削除は保留

- **対応内容:** `src/components/ui/chart.tsx` を import しているファイルが存在しないことを確認（完全未使用）。CLAUDE.md の「Never delete files or directories」ルールにより削除は実施しない。将来的に削除を検討する場合はユーザー承認のもとで実施。
