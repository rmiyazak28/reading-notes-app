-- ============================================================
-- fix_memo_tags_rls.sql
-- memo_tags の INSERT ポリシーに tag_id の所有権検証を追加
--
-- 問題: 既存ポリシーは memo 側の所有権しか検証していないため、
--       他ユーザーの tag_id を自分のメモに紐づけることができた。
-- 対応: tags 側の所有権（tags.user_id = auth.uid()）も
--       WITH CHECK 句で検証する。
-- 参照: 設計書 §6.2 認可 > memo_tags
-- ============================================================

CREATE OR REPLACE POLICY "memo_tags_insert_own"
    ON memo_tags FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM reading_memos
            WHERE reading_memos.id      = memo_tags.memo_id
              AND reading_memos.user_id = auth.uid()
        )
        AND
        EXISTS (
            SELECT 1 FROM tags
            WHERE tags.id      = memo_tags.tag_id
              AND tags.user_id = auth.uid()
        )
    );
