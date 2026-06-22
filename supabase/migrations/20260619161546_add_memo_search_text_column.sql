-- ============================================================
-- supabase/migrations/20260619161546_add_memo_search_text_column.sql
-- search_text カラムと GIN インデックスの追加
--
-- 依存: 001_extensions.sql（pg_trgm）、002_tables.sql（reading_memos）
-- 参照: 設計書 §4.5 全文横断検索用カラムとGINインデックス（search_text + pg_trgm）
--
-- 背景: 複数テーブルJOINのOR条件ではプランナーがGINインデックスを
-- 使用しないため、reading_memos に非正規化カラム search_text を追加し、
-- 単一テーブル・単一カラムのGINインデックスで検索する方式に変更する。
-- この時点では NOT NULL を付与しない（既存行がNULLのため）。
-- NOT NULL化は次マイグレーション（sync）でバックフィル後に行う。
-- ============================================================

-- 1. カラム追加（この時点ではNULL許容。既存行はNULLになる）
ALTER TABLE reading_memos
ADD COLUMN search_text text;

-- 2. GINインデックス作成（pg_trgm。NULL混在状態でも作成は可能）
CREATE INDEX idx_memos_search_text_trgm
ON reading_memos
USING gin (search_text gin_trgm_ops);

-- 3. 旧方式の複数テーブル横断検索用GINインデックスは不要になるため削除
--    （content単体の部分一致検索自体は今後使わない前提。
--      もし「メモ単体の内容検索」を別用途で残すなら DROP しない判断もある）
DROP INDEX IF EXISTS idx_memos_content_trgm;