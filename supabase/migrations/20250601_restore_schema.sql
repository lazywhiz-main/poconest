-- board関連
CREATE TABLE IF NOT EXISTS "public"."board_card_relations" (
    "id" uuid not null default gen_random_uuid(),
    "card_id" uuid not null,
    "related_card_id" uuid not null,
    "created_at" timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS "public"."board_card_sources" (
    "id" uuid not null default gen_random_uuid(),
    "card_id" uuid,
    "source_id" uuid
);

CREATE TABLE IF NOT EXISTS "public"."board_card_tags" (
    "id" uuid not null default gen_random_uuid(),
    "card_id" uuid,
    "tag" text
);

CREATE TABLE IF NOT EXISTS "public"."board_cards" (
    "id" uuid not null default gen_random_uuid(),
    "board_id" uuid,
    "title" text,
    "content" text,
    "column_type" text,
    "order_index" integer,
    "is_archived" boolean default false,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "updated_by" uuid,
    "source_message_id" uuid,
    "metadata" jsonb
);

CREATE TABLE IF NOT EXISTS "public"."board_items" (
    "id" uuid not null default gen_random_uuid(),
    "space_id" uuid not null,
    "parent_id" uuid,
    "user_id" uuid,
    "type" text not null,
    "title" text not null,
    "content" text,
    "position" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "metadata" jsonb default '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS "public"."boards" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "nest_id" uuid
);

-- chat関連
CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" uuid not null default gen_random_uuid(),
    "chat_id" uuid not null,
    "sender_id" uuid not null,
    "content" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "is_edited" boolean default false,
    "is_read" boolean default false,
    "read_by" jsonb default '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS "public"."chat_rooms" (
    "id" uuid not null default gen_random_uuid(),
    "space_id" uuid not null,
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "last_activity" timestamp with time zone default now(),
    "is_public" boolean default true
);

-- insights
CREATE TABLE IF NOT EXISTS "public"."insights" (
    "id" uuid not null default gen_random_uuid(),
    "nest_id" uuid not null,
    "space_id" uuid,
    "source_type" text not null,
    "source_id" uuid,
    "title" text not null,
    "content" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "created_by" uuid,
    "confidence" double precision,
    "tags" text[],
    "is_starred" boolean default false,
    "related_items" jsonb default '[]'::jsonb
);

-- meetings
CREATE TABLE IF NOT EXISTS "public"."meetings" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMP WITH TIME ZONE NOT NULL,
    "end_time" TIMESTAMP WITH TIME ZONE NOT NULL,
    "participants" JSONB DEFAULT '[]'::jsonb,
    "uploaded_files" JSONB DEFAULT '[]'::jsonb,
    "recording_url" TEXT,
    "transcript" TEXT,
    "ai_summary" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- sources
CREATE TABLE IF NOT EXISTS "public"."sources" (
    "id" uuid not null default gen_random_uuid(),
    "type" text,
    "ref_id" text,
    "url" text,
    "label" text,
    "meta" jsonb,
    "created_at" timestamp with time zone default now()
);

-- spaces
CREATE TABLE IF NOT EXISTS "public"."spaces" (
    "id" uuid not null default gen_random_uuid(),
    "nest_id" uuid not null,
    "type" text not null,
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "created_by" uuid,
    "settings" jsonb default '{}'::jsonb,
    "is_default" boolean default false,
    "icon" text,
    "is_active" boolean not null default true,
    "updated_at" timestamp with time zone not null default now()
);

-- user_presence
CREATE TABLE IF NOT EXISTS "public"."user_presence" (
    "user_id" uuid not null,
    "user_name" text,
    "avatar_url" text,
    "last_active" timestamp with time zone not null default now(),
    "status" text,
    "current_space_id" text
);

-- インデックス・制約・RLSポリシー・有効化

-- board_card_relations
CREATE UNIQUE INDEX IF NOT EXISTS board_card_relations_pkey ON public.board_card_relations USING btree (id);
ALTER TABLE public.board_card_relations ADD CONSTRAINT board_card_relations_pkey PRIMARY KEY USING INDEX board_card_relations_pkey;

-- board_card_sources
CREATE UNIQUE INDEX IF NOT EXISTS board_card_sources_pkey ON public.board_card_sources USING btree (id);
ALTER TABLE public.board_card_sources ADD CONSTRAINT board_card_sources_pkey PRIMARY KEY USING INDEX board_card_sources_pkey;

-- board_card_tags
CREATE UNIQUE INDEX IF NOT EXISTS board_card_tags_pkey ON public.board_card_tags USING btree (id);
ALTER TABLE public.board_card_tags ADD CONSTRAINT board_card_tags_pkey PRIMARY KEY USING INDEX board_card_tags_pkey;

-- board_cards
CREATE UNIQUE INDEX IF NOT EXISTS board_cards_pkey ON public.board_cards USING btree (id);
ALTER TABLE public.board_cards ADD CONSTRAINT board_cards_pkey PRIMARY KEY USING INDEX board_cards_pkey;

-- board_items
CREATE UNIQUE INDEX IF NOT EXISTS board_items_pkey ON public.board_items USING btree (id);
ALTER TABLE public.board_items ADD CONSTRAINT board_items_pkey PRIMARY KEY USING INDEX board_items_pkey;
CREATE INDEX IF NOT EXISTS board_items_parent_id_idx ON public.board_items USING btree (parent_id);
CREATE INDEX IF NOT EXISTS board_items_space_id_idx ON public.board_items USING btree (space_id);

-- boards
CREATE UNIQUE INDEX IF NOT EXISTS boards_pkey ON public.boards USING btree (id);
ALTER TABLE public.boards ADD CONSTRAINT boards_pkey PRIMARY KEY USING INDEX boards_pkey;
CREATE UNIQUE INDEX IF NOT EXISTS unique_nest_id ON public.boards USING btree (nest_id);
ALTER TABLE public.boards ADD CONSTRAINT unique_nest_id UNIQUE USING INDEX unique_nest_id;

-- chat_messages
CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_pkey ON public.chat_messages USING btree (id);
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_pkey PRIMARY KEY USING INDEX chat_messages_pkey;
CREATE INDEX IF NOT EXISTS chat_messages_chat_id_idx ON public.chat_messages USING btree (chat_id);
CREATE INDEX IF NOT EXISTS chat_messages_sender_id_idx ON public.chat_messages USING btree (sender_id);

-- chat_rooms
CREATE UNIQUE INDEX IF NOT EXISTS chat_rooms_pkey ON public.chat_rooms USING btree (id);
ALTER TABLE public.chat_rooms ADD CONSTRAINT chat_rooms_pkey PRIMARY KEY USING INDEX chat_rooms_pkey;
CREATE INDEX IF NOT EXISTS chat_rooms_space_id_idx ON public.chat_rooms USING btree (space_id);

-- insights
CREATE UNIQUE INDEX IF NOT EXISTS insights_pkey ON public.insights USING btree (id);
ALTER TABLE public.insights ADD CONSTRAINT insights_pkey PRIMARY KEY USING INDEX insights_pkey;
CREATE INDEX IF NOT EXISTS insights_nest_id_idx ON public.insights USING btree (nest_id);
CREATE INDEX IF NOT EXISTS insights_space_id_idx ON public.insights USING btree (space_id);

-- meetings
CREATE UNIQUE INDEX IF NOT EXISTS meetings_pkey ON public.meetings USING btree (id);
ALTER TABLE public.meetings ADD CONSTRAINT meetings_pkey PRIMARY KEY USING INDEX meetings_pkey;

-- sources
CREATE UNIQUE INDEX IF NOT EXISTS sources_pkey ON public.sources USING btree (id);
ALTER TABLE public.sources ADD CONSTRAINT sources_pkey PRIMARY KEY USING INDEX sources_pkey;

-- spaces
CREATE UNIQUE INDEX IF NOT EXISTS spaces_pkey ON public.spaces USING btree (id);
ALTER TABLE public.spaces ADD CONSTRAINT spaces_pkey PRIMARY KEY USING INDEX spaces_pkey;
CREATE INDEX IF NOT EXISTS spaces_nest_id_idx ON public.spaces USING btree (nest_id);

-- user_presence
CREATE UNIQUE INDEX IF NOT EXISTS user_presence_pkey ON public.user_presence USING btree (user_id);
ALTER TABLE public.user_presence ADD CONSTRAINT user_presence_pkey PRIMARY KEY USING INDEX user_presence_pkey;

-- nests
CREATE UNIQUE INDEX IF NOT EXISTS nests_pkey ON public.nests USING btree (id);
ALTER TABLE public.nests ADD CONSTRAINT nests_pkey PRIMARY KEY USING INDEX nests_pkey;

-- nest_members
CREATE UNIQUE INDEX IF NOT EXISTS nest_members_pkey ON public.nest_members USING btree (nest_id, user_id);
ALTER TABLE public.nest_members ADD CONSTRAINT nest_members_pkey PRIMARY KEY USING INDEX nest_members_pkey;

-- nest_settings
CREATE UNIQUE INDEX IF NOT EXISTS nest_settings_pkey ON public.nest_settings USING btree (nest_id);
ALTER TABLE public.nest_settings ADD CONSTRAINT nest_settings_pkey PRIMARY KEY USING INDEX nest_settings_pkey;

-- nest_invitations
CREATE UNIQUE INDEX IF NOT EXISTS nest_invitations_pkey ON public.nest_invitations USING btree (id);
ALTER TABLE public.nest_invitations ADD CONSTRAINT nest_invitations_pkey PRIMARY KEY USING INDEX nest_invitations_pkey;
CREATE UNIQUE INDEX IF NOT EXISTS unique_nest_email ON public.nest_invitations USING btree (nest_id, invited_email);
ALTER TABLE public.nest_invitations ADD CONSTRAINT unique_nest_email UNIQUE USING INDEX unique_nest_email;
CREATE UNIQUE INDEX IF NOT EXISTS unique_token ON public.nest_invitations USING btree (token);
ALTER TABLE public.nest_invitations ADD CONSTRAINT unique_token UNIQUE USING INDEX unique_token;

-- notifications
CREATE UNIQUE INDEX IF NOT EXISTS notifications_pkey ON public.notifications USING btree (id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY USING INDEX notifications_pkey;

-- users
CREATE UNIQUE INDEX IF NOT EXISTS users_pkey ON public.users USING btree (id);
ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY USING INDEX users_pkey;

-- RLS有効化
ALTER TABLE public.nest_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nest_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 必要なポリシー（例: NESTの閲覧/作成/更新/削除など）
-- ここにCREATE POLICY文を追加（remote_schema.sqlから必要なものを抽出してさらに追記可能）

-- nestsテーブルの既存ポリシーを全削除
DROP POLICY IF EXISTS "Nest members can view nests" ON public.nests;
DROP POLICY IF EXISTS "Nest owners can view nests" ON public.nests;
DROP POLICY IF EXISTS "Nest owners can manage nests" ON public.nests;

-- 全員SELECT/INSERT許可だけ残す
CREATE POLICY "All users can select nests"
  ON public.nests
  FOR SELECT
  USING (true);

CREATE POLICY "All users can insert nests"
  ON public.nests
  FOR INSERT
  WITH CHECK (true);

-- nest_members
CREATE POLICY "Nest members can view members"
  ON public.nest_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.nest_members nest_members_1
      WHERE ((nest_members_1.nest_id = nest_members_1.nest_id) AND (nest_members_1.user_id = auth.uid()))
    )
  );

CREATE POLICY "Nest owners can manage members"
  ON public.nest_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.nests
      WHERE ((nests.id = nest_members.nest_id) AND (nests.owner_id = auth.uid()))
    )
  );

-- nest_settings
CREATE POLICY "Nest members can view settings"
  ON public.nest_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nest_members
      WHERE ((nest_members.nest_id = nest_settings.nest_id) AND (nest_members.user_id = auth.uid()))
    )
  );

CREATE POLICY "Nest owners can update settings"
  ON public.nest_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM nests
      WHERE ((nests.id = nest_settings.nest_id) AND (nests.owner_id = auth.uid()))
    )
  );

-- users
CREATE POLICY "Allow all select on users"
  ON public.users
  FOR SELECT
  USING (true);

-- nest_invitations
CREATE POLICY "Allow all select on nest_invitations"
  ON public.nest_invitations
  FOR SELECT
  USING (true);

-- notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING ((user_id = auth.uid()));

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING ((user_id = auth.uid()));

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING ((user_id = auth.uid()));

-- spaces
CREATE POLICY "Allow all select on spaces"
  ON public.spaces
  FOR SELECT
  USING (true);

-- sources
CREATE POLICY "Allow all select on sources"
  ON public.sources
  FOR SELECT
  USING (true);

-- board_cards
CREATE POLICY "Allow all select on board_cards"
  ON public.board_cards
  FOR SELECT
  USING (true);

-- board_items
CREATE POLICY "Allow all select on board_items"
  ON public.board_items
  FOR SELECT
  USING (true);

-- board_card_relations
CREATE POLICY "Allow all select on board_card_relations"
  ON public.board_card_relations
  FOR SELECT
  USING (true);

-- board_card_sources
CREATE POLICY "Allow all select on board_card_sources"
  ON public.board_card_sources
  FOR SELECT
  USING (true);

-- board_card_tags
CREATE POLICY "Allow all select on board_card_tags"
  ON public.board_card_tags
  FOR SELECT
  USING (true);

-- boards
CREATE POLICY "Allow all select on boards"
  ON public.boards
  FOR SELECT
  USING (true);

-- chat_messages
CREATE POLICY "Allow all select on chat_messages"
  ON public.chat_messages
  FOR SELECT
  USING (true);

-- chat_rooms
CREATE POLICY "Allow all select on chat_rooms"
  ON public.chat_rooms
  FOR SELECT
  USING (true);

-- insights
CREATE POLICY "Allow all select on insights"
  ON public.insights
  FOR SELECT
  USING (true);

-- meetings
CREATE POLICY "Allow all select on meetings"
  ON public.meetings
  FOR SELECT
  USING (true);

-- user_presence
CREATE POLICY "Allow all select on user_presence"
  ON public.user_presence
  FOR SELECT
  USING (true); 