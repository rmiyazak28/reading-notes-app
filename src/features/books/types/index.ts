export type ReadingStatus = "unread" | "reading" | "completed"

export interface Book {
  id: string
  user_id: string
  title: string
  author: string | null      // v0はstringだったがDBはNULL許容
  genre: string | null       // 同上
  status: ReadingStatus
  completed_at: string | null  // v0にはなかった。DB定義に存在
  created_at: string
  updated_at: string
  // 以下はJOINで取得する集計値（DBカラムではない）
  memoCount?: number         // v0のmemoCount相当
  starCount?: number         // v0のstarCount相当
}