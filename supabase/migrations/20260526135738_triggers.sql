-- ============================================================
-- 005_triggers.sql
-- updated_at 自動更新トリガー
--
-- 依存: 002_tables.sql（テーブル）
-- 参照: 設計書 §4.4 updated_at 自動更新トリガー
--
-- 対象テーブル: books、reading_memos
-- （tags は updated_at カラムを持たないため対象外）
-- ============================================================


-- ------------------------------------------------------------
-- トリガー関数
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ------------------------------------------------------------
-- books
-- ------------------------------------------------------------
CREATE TRIGGER trg_books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();


-- ------------------------------------------------------------
-- reading_memos
-- ------------------------------------------------------------
CREATE TRIGGER trg_reading_memos_updated_at
    BEFORE UPDATE ON reading_memos
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();