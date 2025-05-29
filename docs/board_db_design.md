# ボード空間・元ソースDB設計ドキュメント

## 1. エンティティ一覧（主なテーブル）

- `boards`（ボード空間/プロジェクト単位）
- `board_cards`（カード本体）
- `board_card_tags`（カードのタグ）
- `board_card_sources`（カードと元ソースの紐付け）
- `sources`（元ソース本体）
- `insights`（インサイト）
- `themes`（テーマ）
- `board_card_insights`（カードとインサイトの紐付け）
- `board_card_themes`（カードとテーマの紐付け）

---

## 2. テーブル設計案

### boards
| カラム名         | 型           | 説明                |
|------------------|--------------|---------------------|
| id               | uuid         | PK                  |
| name             | text         | ボード名            |
| created_at       | timestamptz  | 作成日時            |
| updated_at       | timestamptz  | 更新日時            |

### board_cards
| カラム名         | 型           | 説明                |
|------------------|--------------|---------------------|
| id               | uuid         | PK                  |
| board_id         | uuid         | FK: boards.id       |
| title            | text         | タイトル            |
| content          | text         | 本文（Markdown）    |
| column_type      | text         | inbox/insights/themes|
| order_index      | int          | 並び順              |
| is_archived      | boolean      | アーカイブフラグ    |
| created_by       | uuid         | 作成者              |
| created_at       | timestamptz  | 作成日時            |
| updated_at       | timestamptz  | 更新日時            |

### board_card_tags
| カラム名         | 型           | 説明                |
|------------------|--------------|---------------------|
| id               | uuid         | PK                  |
| card_id          | uuid         | FK: board_cards.id  |
| tag              | text         | タグ名              |

### sources（元ソース本体）
| カラム名         | 型           | 説明                |
|------------------|--------------|---------------------|
| id               | uuid         | PK                  |
| type             | text         | chat/card/url/zoom/doc/mail/task など |
| ref_id           | text         | 参照ID（chatmsg-1234等）|
| url              | text         | 外部URL（任意）     |
| label            | text         | UI表示用ラベル      |
| meta             | jsonb        | 追加情報（発言者・日時など）|
| created_at       | timestamptz  | 作成日時            |

### board_card_sources（カードと元ソースの紐付け）
| カラム名         | 型           | 説明                |
|------------------|--------------|---------------------|
| id               | uuid         | PK                  |
| card_id          | uuid         | FK: board_cards.id  |
| source_id        | uuid         | FK: sources.id      |

### insights / themes / 紐付けテーブル
- insights, themesは既存設計に合わせてOK
- 紐付けテーブル（board_card_insights, board_card_themes）はcard_id, insight_id/theme_idの組み合わせ

---

## 3. ER図イメージ（簡易）

```
boards
  |
  | 1:N
  v
board_cards
  | 1:N                | 1:N
  v                    v
board_card_tags   board_card_sources
                        |
                        | N:1
                        v
                    sources
```
（insights, themesも同様にN:Nリレーション）

---

## 4. 運用イメージ

- カード作成時、元ソースが未登録なら`sources`にInsertし、`board_card_sources`で紐付け
- サジェストは`sources`からtype/labelで検索
- 元ソースバッジクリックでtype/ref_id/urlに応じて遷移
- 複数元ソースもOK

---

## 5. Supabase用DDL例

```sql
create table boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table board_cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references boards(id),
  title text,
  content text,
  column_type text,
  order_index int,
  is_archived boolean default false,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table board_card_tags (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references board_cards(id),
  tag text
);

create table sources (
  id uuid primary key default gen_random_uuid(),
  type text,
  ref_id text,
  url text,
  label text,
  meta jsonb,
  created_at timestamptz default now()
);

create table board_card_sources (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references board_cards(id),
  source_id uuid references sources(id)
);
```

---

## 6. 今後の拡張性

- sources.typeを増やせば新しい元ソース種別も柔軟に追加可能
- metaに詳細情報を格納できる
- 逆参照（この元ソースを参照しているカード一覧）も容易

---

この設計をもとにSupabaseテーブル作成・API設計・UI/UX実装を進めてください。
ご要望・修正点があればこのドキュメントに追記してください。 