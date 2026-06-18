-- ============================================================
-- 006_search_memos_rpc.sql
-- search_memos RPC関数の作成
--
-- 依存: 001_extensions.sql（pg_trgm）、002_tables.sql（テーブル）、003_indexes.sql（GINインデックス）
-- 参照: 設計書 §4.6 RPC関数設計、§5.2 読書メモActions（searchMemos）
-- ============================================================

-- SCR-06 全メモ横断検索用 RPC 関数。
-- PostgREST の or() は結合テーブルのカラムを直接参照できないため RPC 化が必要。
-- ILIKE により pg_trgm の GIN インデックスを活用した DB 側検索を行う。
CREATE OR REPLACE FUNCTION search_memos(
    p_user_id uuid,
    p_query text DEFAULT NULL,
    p_favorite_only boolean DEFAULT false,
    p_sort_by text DEFAULT 'created_at',
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    book_id uuid,
    page_number integer,
    content text,
    favorite boolean,
    created_at timestamptz,
    updated_at timestamptz,
    book_title text,
    book_author text,
    tags jsonb
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.user_id,
        m.book_id,
        m.page_number,
        m.content,
        m.favorite,
        m.created_at,
        m.updated_at,
        b.title::text AS book_title,
        b.author::text AS book_author,
        COALESCE(
            (
                SELECT jsonb_agg(jsonb_build_object('id', t.id::text, 'name', t.name))
                FROM memo_tags mt
                JOIN tags t ON mt.tag_id = t.id
                WHERE mt.memo_id = m.id
            ),
            '[]'::jsonb
        ) AS tags
    FROM reading_memos m
    JOIN books b ON m.book_id = b.id
    WHERE m.user_id = p_user_id
        AND (p_favorite_only = false OR m.favorite = true)
        AND (
            p_query IS NULL
            OR p_query = ''
            OR m.content ILIKE '%' || p_query || '%'
            OR b.title ILIKE '%' || p_query || '%'
            OR b.author ILIKE '%' || p_query || '%'
            OR EXISTS (
                SELECT 1
                FROM memo_tags mt
                JOIN tags t ON mt.tag_id = t.id
                WHERE mt.memo_id = m.id
                  AND t.name ILIKE '%' || p_query || '%'
            )
        )
    ORDER BY
        CASE WHEN p_sort_by = 'updated_at' THEN m.updated_at ELSE m.created_at END DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
