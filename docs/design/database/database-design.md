# 4. DB設計

## 4.1 ER図

図のみのファイルは [diagrams/database/er-diagram](../../diagrams/database/er-diagram.md) を参照してください。

---

# 4.2 テーブル一覧

| テーブル名 | 用途 |
|---|---|
| books | 書籍情報 |
| reading_memos | 読書メモ |
| tags | タグ |
| memo_tags | メモ・タグ中間テーブル |

---

# 4.3 テーブル定義

---

## books

| カラム名 | 型 | PK | FK | NOT NULL | 備考 |
|---|---|---|---|---|---|
| id | uuid | ○ | - | ○ | 書籍ID |
| user_id | uuid | - | auth.users.id | ○ | 所有ユーザー |
| isbn | varchar(20) | - | - | ○ | ISBN |
| title | varchar(255) | - | - | ○ | 書籍タイトル |
| author | varchar(255) | - | - | ○ | 著者名 |
| genre | varchar(100) | - | - | - | ジャンル |
| cover_image_url | text | - | - | - | 表紙画像URL |
| status | varchar(20) | - | - | ○ | DEFAULT 'unread' |
| completed_at | date | - | - | - | 読了日 |
| created_at | timestamptz | - | - | ○ | DEFAULT now() |
| updated_at | timestamptz | - | - | ○ | DEFAULT now() |

### 制約

```sql
CHECK (status IN ('unread', 'reading', 'completed'))
```

```sql
CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR
    (status IN ('unread', 'reading'))
)
```

### UNIQUE制約

ISBN重複防止：

```sql
UNIQUE (user_id, isbn)
```

同一タイトル・著者重複防止：

```sql
UNIQUE (user_id, title, author)
```

### 外部キー

```sql
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE
```

---

## reading_memos

| カラム名 | 型 | PK | FK | NOT NULL | 備考 |
|---|---|---|---|---|---|
| id | uuid | ○ | - | ○ | メモID |
| user_id | uuid | - | auth.users.id | ○ | 所有ユーザー |
| book_id | uuid | - | books.id | ○ | 対象書籍 |
| page_number | integer | - | - | - | ページ番号 |
| content | text | - | - | ○ | メモ内容 |
| favorite | boolean | - | - | ○ | DEFAULT false |
| created_at | timestamptz | - | - | ○ | DEFAULT now() |
| updated_at | timestamptz | - | - | ○ | DEFAULT now() |

### 制約

```sql
CHECK (page_number IS NULL OR page_number > 0)
```

### 外部キー

```sql
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE
```

```sql
FOREIGN KEY (book_id)
REFERENCES books(id)
ON DELETE CASCADE
```

---

## tags

| カラム名 | 型 | PK | FK | NOT NULL | 備考 |
|---|---|---|---|---|---|
| id | uuid | ○ | - | ○ | タグID |
| user_id | uuid | - | auth.users.id | ○ | 所有ユーザー |
| name | varchar(50) | - | - | ○ | タグ名 |
| created_at | timestamptz | - | - | ○ | DEFAULT now() |
| updated_at | timestamptz | - | - | ○ | DEFAULT now() |

### UNIQUE制約

```sql
UNIQUE (user_id, name)
```

### 外部キー

```sql
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE
```

---

## memo_tags

| カラム名 | 型 | PK | FK | NOT NULL | 備考 |
|---|---|---|---|---|---|
| memo_id | uuid | ○ | reading_memos.id | ○ | メモID |
| tag_id | uuid | ○ | tags.id | ○ | タグID |

### 備考

- 複合主キー（memo_id, tag_id）

### 外部キー

```sql
FOREIGN KEY (memo_id)
REFERENCES reading_memos(id)
ON DELETE CASCADE
```

```sql
FOREIGN KEY (tag_id)
REFERENCES tags(id)
ON DELETE CASCADE
```

---

# 4.4 updated_at 自動更新トリガー

## 関数作成

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## books

```sql
CREATE TRIGGER trg_books_updated_at
BEFORE UPDATE ON books
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
```

---

## reading_memos

```sql
CREATE TRIGGER trg_reading_memos_updated_at
BEFORE UPDATE ON reading_memos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
```

---

## tags

```sql
CREATE TRIGGER trg_tags_updated_at
BEFORE UPDATE ON tags
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
```

---

# 4.5 インデックス設計

---

## books

### ユーザー別取得

```sql
CREATE INDEX idx_books_user_id
ON books(user_id);
```

### ユーザー × 読書状態検索

```sql
CREATE INDEX idx_books_user_status
ON books(user_id, status);
```

### ISBN検索

```sql
CREATE INDEX idx_books_isbn
ON books(isbn);
```

### 書籍タイトル部分一致検索（pg_trgm + GIN）

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_books_title_trgm
ON books
USING gin (title gin_trgm_ops);
```

### 著者名部分一致検索（pg_trgm + GIN）

```sql
CREATE INDEX idx_books_author_trgm
ON books
USING gin (author gin_trgm_ops);
```

---

## reading_memos

### ユーザー別取得

```sql
CREATE INDEX idx_memos_user_id
ON reading_memos(user_id);
```

### 書籍別取得

```sql
CREATE INDEX idx_memos_book_id
ON reading_memos(book_id);
```

### ユーザー × 書籍取得

```sql
CREATE INDEX idx_memos_user_book
ON reading_memos(user_id, book_id);
```

### ユーザー × お気に入り検索

```sql
CREATE INDEX idx_memos_user_favorite
ON reading_memos(user_id, favorite);
```

### ユーザー × 新着順表示

```sql
CREATE INDEX idx_memos_user_created_at
ON reading_memos(user_id, created_at DESC);
```

### メモ全文部分一致検索（pg_trgm + GIN）

```sql
CREATE INDEX idx_memos_content_trgm
ON reading_memos
USING gin (content gin_trgm_ops);
```

---

## tags

### ユーザー別タグ取得

```sql
CREATE INDEX idx_tags_user_id
ON tags(user_id);
```

### タグ名検索

```sql
CREATE INDEX idx_tags_name
ON tags(name);
```

---

## memo_tags

### メモ → タグ取得

```sql
CREATE INDEX idx_memo_tags_memo_id
ON memo_tags(memo_id);
```

### タグ → メモ取得

```sql
CREATE INDEX idx_memo_tags_tag_id
ON memo_tags(tag_id);
```