-- ============================================================
-- 004_rls.sql
-- Row Level Security（RLS）ポリシー設定
--
-- 依存: 002_tables.sql（テーブル）
-- 参照: 設計書 §6.2 認可
--
-- 基本方針:
--   - RLS を有効化するとデフォルトで全アクセスを拒否する。
--   - 必要な操作ごとにポリシーを明示的に定義する。
--   - authenticated ロールに対してのみポリシーを付与する。
--   - USING 句  : 既存行の可視性制御（SELECT / UPDATE / DELETE）
--   - WITH CHECK: 書き込みデータの検証（INSERT / UPDATE）
-- ============================================================


-- ------------------------------------------------------------
-- books
-- ------------------------------------------------------------
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- SELECT: 自分の書籍のみ参照可
CREATE POLICY "books_select_own"
    ON books FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- INSERT: 自分の user_id でのみ登録可
CREATE POLICY "books_insert_own"
    ON books FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- UPDATE: 自分の書籍のみ更新可
CREATE POLICY "books_update_own"
    ON books FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE: 自分の書籍のみ削除可
CREATE POLICY "books_delete_own"
    ON books FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());


-- ------------------------------------------------------------
-- reading_memos
-- ------------------------------------------------------------
ALTER TABLE reading_memos ENABLE ROW LEVEL SECURITY;

-- SELECT: 自分のメモのみ参照可
CREATE POLICY "reading_memos_select_own"
    ON reading_memos FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- INSERT: 自分の user_id でのみ登録可
CREATE POLICY "reading_memos_insert_own"
    ON reading_memos FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- UPDATE: 自分のメモのみ更新可
CREATE POLICY "reading_memos_update_own"
    ON reading_memos FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE: 自分のメモのみ削除可
CREATE POLICY "reading_memos_delete_own"
    ON reading_memos FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());


-- ------------------------------------------------------------
-- tags
-- ------------------------------------------------------------
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- SELECT: 自分のタグのみ参照可
CREATE POLICY "tags_select_own"
    ON tags FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- INSERT: 自分の user_id でのみ登録可
CREATE POLICY "tags_insert_own"
    ON tags FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- DELETE: 自分のタグのみ削除可
CREATE POLICY "tags_delete_own"
    ON tags FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- UPDATE ポリシーは定義しない。
-- 理由: タグ名変更は機能要件に含まれないため（設計書 §6.2 補足参照）。
--       必要になった時点で追加する。


-- ------------------------------------------------------------
-- memo_tags（中間テーブル）
-- ------------------------------------------------------------
-- memo_tags は user_id カラムを持たないため、
-- 親テーブル reading_memos の所有権を JOIN で検証する。
ALTER TABLE memo_tags ENABLE ROW LEVEL SECURITY;

-- SELECT: 自分のメモに紐づく memo_tags のみ参照可
CREATE POLICY "memo_tags_select_own"
    ON memo_tags FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM reading_memos
            WHERE reading_memos.id      = memo_tags.memo_id
              AND reading_memos.user_id = auth.uid()
        )
    );

-- INSERT: 自分のメモに紐づく memo_tags のみ登録可
CREATE POLICY "memo_tags_insert_own"
    ON memo_tags FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM reading_memos
            WHERE reading_memos.id      = memo_tags.memo_id
              AND reading_memos.user_id = auth.uid()
        )
    );

-- DELETE: 自分のメモに紐づく memo_tags のみ削除可
CREATE POLICY "memo_tags_delete_own"
    ON memo_tags FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM reading_memos
            WHERE reading_memos.id      = memo_tags.memo_id
              AND reading_memos.user_id = auth.uid()
        )
    );