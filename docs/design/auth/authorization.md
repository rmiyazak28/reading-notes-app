# 6. 認証・認可設計

## 6.1 認証

* Supabase Authentication を利用
* Email/Password認証
* Google OAuth認証

---

## 6.2 認可

### RLSポリシー

#### books

```sql
user_id = auth.uid()
```

#### reading_memos

```sql
user_id = auth.uid()
```

#### tags

```sql
user_id = auth.uid()
```
