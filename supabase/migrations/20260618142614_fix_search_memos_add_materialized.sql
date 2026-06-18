-- ============================================================
-- fix_search_memos_query_branch.sql
-- search_memos RPC関数の修正: p_query の有無で内部クエリを分岐
--
-- 背景: p_query指定時に ORDER BY + LIMIT を検索条件と同一SELECTに
-- 含めていたため、プランナーが idx_memos_user_created_at を優先し
-- pg_trgm GINインデックス（idx_memos_content_trgm 等）が使われない
-- ことが実測（auto_explain, 50,000件規模）で確認された。
-- 検索語なし/ありで処理を分岐し、検索語ありの場合は一致行確定
-- （CTE）とソート・ページングを分離する。
--
-- 参照: 設計書 §4.6 RPC関数設計、§5.2 読書メモActions（searchMemos）
-- ============================================================
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
    IF p_query IS NULL OR p_query = '' THEN
        -- 検索語なし: 新着順一覧。idx_memos_user_created_at を使う経路。
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
        ORDER BY
            CASE WHEN p_sort_by = 'updated_at' THEN m.updated_at ELSE m.created_at END DESC
        LIMIT p_limit
        OFFSET p_offset;
    ELSE
        -- 検索語あり: 先にCTEで一致行を確定させてからソート・ページングする。
        RETURN QUERY
        WITH matched AS MATERIALIZED (
            SELECT m.id
            FROM reading_memos m
            JOIN books b ON m.book_id = b.id
            WHERE m.user_id = p_user_id
                AND (p_favorite_only = false OR m.favorite = true)
                AND (
                    m.content ILIKE '%' || p_query || '%'
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
        )
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
        FROM matched
        JOIN reading_memos m ON m.id = matched.id
        JOIN books b ON m.book_id = b.id
        ORDER BY
            CASE WHEN p_sort_by = 'updated_at' THEN m.updated_at ELSE m.created_at END DESC
        LIMIT p_limit
        OFFSET p_offset;
    END IF;
END;
$$;