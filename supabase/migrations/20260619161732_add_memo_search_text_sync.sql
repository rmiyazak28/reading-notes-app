-- ============================================================
-- supabase/migrations/20260619161732_add_memo_search_text_sync.sql
-- search_text 同期トリガー・バックフィル・旧RPC廃止
--
-- 依存: <timestamp>_add_memo_search_text_column.sql（search_textカラム）
-- 参照: 設計書 §4.6 search_text 同期トリガー設計
-- ============================================================

-- 1. 同期関数（設計書 §4.6 と同一）
CREATE OR REPLACE FUNCTION sync_memo_search_text(p_memo_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE reading_memos m
    SET search_text = trim(
        coalesce(m.content, '') || ' ' ||
        coalesce(b.title, '') || ' ' ||
        coalesce(b.author, '') || ' ' ||
        coalesce((
            SELECT string_agg(t.name, ' ')
            FROM memo_tags mt
            JOIN tags t ON t.id = mt.tag_id
            WHERE mt.memo_id = m.id
        ), '')
    )
    FROM books b
    WHERE m.book_id = b.id
      AND m.id = p_memo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. reading_memos用トリガー関数・トリガー（INSERT, UPDATE OF content, book_id）
CREATE OR REPLACE FUNCTION trg_sync_search_text_on_memo()
RETURNS trigger AS $$
BEGIN
    PERFORM sync_memo_search_text(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_memos_sync_search_text
    AFTER INSERT OR UPDATE OF content, book_id ON reading_memos
    FOR EACH ROW
    EXECUTE FUNCTION trg_sync_search_text_on_memo();

-- 3. books用トリガー関数・トリガー（UPDATE OF title, author）
CREATE OR REPLACE FUNCTION trg_sync_search_text_on_book()
RETURNS trigger AS $$
BEGIN
    PERFORM sync_memo_search_text(m.id)
    FROM reading_memos m
    WHERE m.book_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_books_sync_search_text
    AFTER UPDATE OF title, author ON books
    FOR EACH ROW
    EXECUTE FUNCTION trg_sync_search_text_on_book();

-- 4. memo_tags用トリガー関数・トリガー（INSERT, DELETE）
--    INSERTはNEW、DELETEはOLDを参照する必要があるため分岐させる
CREATE OR REPLACE FUNCTION trg_sync_search_text_on_memo_tag()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM sync_memo_search_text(NEW.memo_id);
        RETURN NEW;
    ELSE
        PERFORM sync_memo_search_text(OLD.memo_id);
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_memo_tags_sync_search_text
    AFTER INSERT OR DELETE ON memo_tags
    FOR EACH ROW
    EXECUTE FUNCTION trg_sync_search_text_on_memo_tag();

-- 5. tags用トリガー関数・トリガー（UPDATE OF name）
CREATE OR REPLACE FUNCTION trg_sync_search_text_on_tag()
RETURNS trigger AS $$
BEGIN
    PERFORM sync_memo_search_text(m.id)
    FROM reading_memos m
    JOIN memo_tags mt ON mt.memo_id = m.id
    WHERE mt.tag_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tags_sync_search_text
    AFTER UPDATE OF name ON tags
    FOR EACH ROW
    EXECUTE FUNCTION trg_sync_search_text_on_tag();

-- 6. バックフィル：既存の全メモのsearch_textを計算
DO $$
DECLARE
    v_memo_id uuid;
BEGIN
    FOR v_memo_id IN SELECT id FROM reading_memos LOOP
        PERFORM sync_memo_search_text(v_memo_id);
    END LOOP;
END $$;

-- 7. バックフィル完了後にNOT NULL制約を付与
ALTER TABLE reading_memos
ALTER COLUMN search_text SET NOT NULL;

-- 8. 旧RPC関数の廃止
DROP FUNCTION IF EXISTS search_memos(uuid, text, boolean, text, integer, integer);