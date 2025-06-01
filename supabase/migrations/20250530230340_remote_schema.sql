drop policy "Enable delete access for authenticated users" on "public"."meetings";

drop policy "Enable insert access for authenticated users" on "public"."meetings";

drop policy "Enable read access for authenticated users" on "public"."meetings";

drop policy "Enable update access for authenticated users" on "public"."meetings";

revoke delete on table "public"."meetings" from "anon";

revoke insert on table "public"."meetings" from "anon";

revoke references on table "public"."meetings" from "anon";

revoke select on table "public"."meetings" from "anon";

revoke trigger on table "public"."meetings" from "anon";

revoke truncate on table "public"."meetings" from "anon";

revoke update on table "public"."meetings" from "anon";

revoke delete on table "public"."meetings" from "authenticated";

revoke insert on table "public"."meetings" from "authenticated";

revoke references on table "public"."meetings" from "authenticated";

revoke select on table "public"."meetings" from "authenticated";

revoke trigger on table "public"."meetings" from "authenticated";

revoke truncate on table "public"."meetings" from "authenticated";

revoke update on table "public"."meetings" from "authenticated";

revoke delete on table "public"."meetings" from "service_role";

revoke insert on table "public"."meetings" from "service_role";

revoke references on table "public"."meetings" from "service_role";

revoke select on table "public"."meetings" from "service_role";

revoke trigger on table "public"."meetings" from "service_role";

revoke truncate on table "public"."meetings" from "service_role";

revoke update on table "public"."meetings" from "service_role";

alter table "public"."meetings" drop constraint "meetings_pkey";

drop index if exists "public"."meetings_pkey";

drop table "public"."meetings";

create table "public"."board_card_relations" (
    "id" uuid not null default gen_random_uuid(),
    "card_id" uuid not null,
    "related_card_id" uuid not null,
    "created_at" timestamp with time zone default now()
);


create table "public"."board_card_sources" (
    "id" uuid not null default gen_random_uuid(),
    "card_id" uuid,
    "source_id" uuid
);


create table "public"."board_card_tags" (
    "id" uuid not null default gen_random_uuid(),
    "card_id" uuid,
    "tag" text
);


create table "public"."board_cards" (
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


create table "public"."board_items" (
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


alter table "public"."board_items" enable row level security;

create table "public"."boards" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "nest_id" uuid
);


create table "public"."chat_messages" (
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


alter table "public"."chat_messages" enable row level security;

create table "public"."chat_rooms" (
    "id" uuid not null default gen_random_uuid(),
    "space_id" uuid not null,
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "last_activity" timestamp with time zone default now(),
    "is_public" boolean default true
);


create table "public"."insights" (
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


alter table "public"."insights" enable row level security;

create table "public"."nest_invitations" (
    "id" uuid not null default gen_random_uuid(),
    "nest_id" uuid not null,
    "invited_email" text not null,
    "invited_by" uuid not null,
    "status" text not null default 'pending'::text,
    "token" text not null,
    "created_at" timestamp with time zone default now(),
    "accepted_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "is_accepted" boolean default false,
    "target_user_id" uuid
);


create table "public"."nest_members" (
    "user_id" uuid not null,
    "nest_id" uuid not null,
    "role" text not null default 'member'::text,
    "joined_at" timestamp with time zone default now(),
    "last_active_at" timestamp with time zone
);


create table "public"."nest_settings" (
    "nest_id" uuid not null,
    "theme" text default 'default'::text,
    "notification_settings" jsonb,
    "privacy_settings" jsonb,
    "custom_emojis" jsonb,
    "metadata" jsonb
);


create table "public"."nests" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "owner_id" uuid,
    "icon" text default '🏠'::text,
    "color" text,
    "is_active" boolean default true
);


alter table "public"."nests" enable row level security;

create table "public"."sources" (
    "id" uuid not null default gen_random_uuid(),
    "type" text,
    "ref_id" text,
    "url" text,
    "label" text,
    "meta" jsonb,
    "created_at" timestamp with time zone default now()
);


create table "public"."spaces" (
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


create table "public"."user_presence" (
    "user_id" uuid not null,
    "user_name" text,
    "avatar_url" text,
    "last_active" timestamp with time zone not null default now(),
    "status" text,
    "current_space_id" text
);


alter table "public"."user_presence" enable row level security;

create table "public"."users" (
    "id" uuid not null,
    "email" text not null,
    "display_name" text not null,
    "avatar_url" text,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
);


alter table "public"."users" enable row level security;

CREATE UNIQUE INDEX board_card_relations_pkey ON public.board_card_relations USING btree (id);

CREATE UNIQUE INDEX board_card_sources_pkey ON public.board_card_sources USING btree (id);

CREATE UNIQUE INDEX board_card_tags_pkey ON public.board_card_tags USING btree (id);

CREATE UNIQUE INDEX board_cards_pkey ON public.board_cards USING btree (id);

CREATE INDEX board_items_parent_id_idx ON public.board_items USING btree (parent_id);

CREATE UNIQUE INDEX board_items_pkey ON public.board_items USING btree (id);

CREATE INDEX board_items_space_id_idx ON public.board_items USING btree (space_id);

CREATE UNIQUE INDEX boards_pkey ON public.boards USING btree (id);

CREATE INDEX chat_messages_chat_id_idx ON public.chat_messages USING btree (chat_id);

CREATE UNIQUE INDEX chat_messages_pkey ON public.chat_messages USING btree (id);

CREATE INDEX chat_messages_sender_id_idx ON public.chat_messages USING btree (sender_id);

CREATE UNIQUE INDEX chat_rooms_pkey ON public.chat_rooms USING btree (id);

CREATE INDEX chat_rooms_space_id_idx ON public.chat_rooms USING btree (space_id);

CREATE INDEX idx_board_card_relations_card_id ON public.board_card_relations USING btree (card_id);

CREATE INDEX idx_board_card_relations_related_card_id ON public.board_card_relations USING btree (related_card_id);

CREATE INDEX insights_nest_id_idx ON public.insights USING btree (nest_id);

CREATE UNIQUE INDEX insights_pkey ON public.insights USING btree (id);

CREATE INDEX insights_space_id_idx ON public.insights USING btree (space_id);

CREATE UNIQUE INDEX nest_invitations_pkey ON public.nest_invitations USING btree (id);

CREATE UNIQUE INDEX nest_members_pkey ON public.nest_members USING btree (user_id, nest_id);

CREATE UNIQUE INDEX nest_settings_pkey ON public.nest_settings USING btree (nest_id);

CREATE UNIQUE INDEX nests_pkey ON public.nests USING btree (id);

CREATE UNIQUE INDEX sources_pkey ON public.sources USING btree (id);

CREATE INDEX spaces_nest_id_idx ON public.spaces USING btree (nest_id);

CREATE UNIQUE INDEX spaces_pkey ON public.spaces USING btree (id);

CREATE UNIQUE INDEX unique_nest_email ON public.nest_invitations USING btree (nest_id, invited_email);

CREATE UNIQUE INDEX unique_nest_id ON public.boards USING btree (nest_id);

CREATE UNIQUE INDEX unique_token ON public.nest_invitations USING btree (token);

CREATE UNIQUE INDEX user_presence_pkey ON public.user_presence USING btree (user_id);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."board_card_relations" add constraint "board_card_relations_pkey" PRIMARY KEY using index "board_card_relations_pkey";

alter table "public"."board_card_sources" add constraint "board_card_sources_pkey" PRIMARY KEY using index "board_card_sources_pkey";

alter table "public"."board_card_tags" add constraint "board_card_tags_pkey" PRIMARY KEY using index "board_card_tags_pkey";

alter table "public"."board_cards" add constraint "board_cards_pkey" PRIMARY KEY using index "board_cards_pkey";

alter table "public"."board_items" add constraint "board_items_pkey" PRIMARY KEY using index "board_items_pkey";

alter table "public"."boards" add constraint "boards_pkey" PRIMARY KEY using index "boards_pkey";

alter table "public"."chat_messages" add constraint "chat_messages_pkey" PRIMARY KEY using index "chat_messages_pkey";

alter table "public"."chat_rooms" add constraint "chat_rooms_pkey" PRIMARY KEY using index "chat_rooms_pkey";

alter table "public"."insights" add constraint "insights_pkey" PRIMARY KEY using index "insights_pkey";

alter table "public"."nest_invitations" add constraint "nest_invitations_pkey" PRIMARY KEY using index "nest_invitations_pkey";

alter table "public"."nest_members" add constraint "nest_members_pkey" PRIMARY KEY using index "nest_members_pkey";

alter table "public"."nest_settings" add constraint "nest_settings_pkey" PRIMARY KEY using index "nest_settings_pkey";

alter table "public"."nests" add constraint "nests_pkey" PRIMARY KEY using index "nests_pkey";

alter table "public"."sources" add constraint "sources_pkey" PRIMARY KEY using index "sources_pkey";

alter table "public"."spaces" add constraint "spaces_pkey" PRIMARY KEY using index "spaces_pkey";

alter table "public"."user_presence" add constraint "user_presence_pkey" PRIMARY KEY using index "user_presence_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."board_card_relations" add constraint "board_card_relations_card_id_fkey" FOREIGN KEY (card_id) REFERENCES board_cards(id) ON DELETE CASCADE not valid;

alter table "public"."board_card_relations" validate constraint "board_card_relations_card_id_fkey";

alter table "public"."board_card_relations" add constraint "board_card_relations_related_card_id_fkey" FOREIGN KEY (related_card_id) REFERENCES board_cards(id) ON DELETE CASCADE not valid;

alter table "public"."board_card_relations" validate constraint "board_card_relations_related_card_id_fkey";

alter table "public"."board_card_sources" add constraint "board_card_sources_card_id_fkey" FOREIGN KEY (card_id) REFERENCES board_cards(id) not valid;

alter table "public"."board_card_sources" validate constraint "board_card_sources_card_id_fkey";

alter table "public"."board_card_sources" add constraint "board_card_sources_source_id_fkey" FOREIGN KEY (source_id) REFERENCES sources(id) not valid;

alter table "public"."board_card_sources" validate constraint "board_card_sources_source_id_fkey";

alter table "public"."board_card_tags" add constraint "board_card_tags_card_id_fkey" FOREIGN KEY (card_id) REFERENCES board_cards(id) not valid;

alter table "public"."board_card_tags" validate constraint "board_card_tags_card_id_fkey";

alter table "public"."board_cards" add constraint "board_cards_board_id_fkey" FOREIGN KEY (board_id) REFERENCES boards(id) not valid;

alter table "public"."board_cards" validate constraint "board_cards_board_id_fkey";

alter table "public"."board_cards" add constraint "fk_board_cards_created_by" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."board_cards" validate constraint "fk_board_cards_created_by";

alter table "public"."board_items" add constraint "board_items_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES board_items(id) ON DELETE CASCADE not valid;

alter table "public"."board_items" validate constraint "board_items_parent_id_fkey";

alter table "public"."board_items" add constraint "board_items_space_id_fkey" FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE not valid;

alter table "public"."board_items" validate constraint "board_items_space_id_fkey";

alter table "public"."board_items" add constraint "board_items_type_check" CHECK ((type = ANY (ARRAY['list'::text, 'card'::text]))) not valid;

alter table "public"."board_items" validate constraint "board_items_type_check";

alter table "public"."board_items" add constraint "board_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."board_items" validate constraint "board_items_user_id_fkey";

alter table "public"."boards" add constraint "fk_boards_nest_id" FOREIGN KEY (nest_id) REFERENCES nests(id) ON DELETE CASCADE not valid;

alter table "public"."boards" validate constraint "fk_boards_nest_id";

alter table "public"."boards" add constraint "unique_nest_id" UNIQUE using index "unique_nest_id";

alter table "public"."chat_messages" add constraint "chat_messages_chat_id_fkey" FOREIGN KEY (chat_id) REFERENCES chat_rooms(id) ON DELETE CASCADE not valid;

alter table "public"."chat_messages" validate constraint "chat_messages_chat_id_fkey";

alter table "public"."chat_messages" add constraint "chat_messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES auth.users(id) not valid;

alter table "public"."chat_messages" validate constraint "chat_messages_sender_id_fkey";

alter table "public"."chat_rooms" add constraint "chat_rooms_space_id_fkey" FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE not valid;

alter table "public"."chat_rooms" validate constraint "chat_rooms_space_id_fkey";

alter table "public"."insights" add constraint "insights_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."insights" validate constraint "insights_created_by_fkey";

alter table "public"."insights" add constraint "insights_nest_id_fkey" FOREIGN KEY (nest_id) REFERENCES nests(id) ON DELETE CASCADE not valid;

alter table "public"."insights" validate constraint "insights_nest_id_fkey";

alter table "public"."insights" add constraint "insights_source_type_check" CHECK ((source_type = ANY (ARRAY['chat'::text, 'meeting'::text, 'ai'::text, 'manual'::text]))) not valid;

alter table "public"."insights" validate constraint "insights_source_type_check";

alter table "public"."insights" add constraint "insights_space_id_fkey" FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE SET NULL not valid;

alter table "public"."insights" validate constraint "insights_space_id_fkey";

alter table "public"."nest_invitations" add constraint "nest_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES users(id) not valid;

alter table "public"."nest_invitations" validate constraint "nest_invitations_invited_by_fkey";

alter table "public"."nest_invitations" add constraint "nest_invitations_nest_id_fkey" FOREIGN KEY (nest_id) REFERENCES nests(id) ON DELETE CASCADE not valid;

alter table "public"."nest_invitations" validate constraint "nest_invitations_nest_id_fkey";

alter table "public"."nest_invitations" add constraint "nest_invitations_target_user_id_fkey" FOREIGN KEY (target_user_id) REFERENCES users(id) not valid;

alter table "public"."nest_invitations" validate constraint "nest_invitations_target_user_id_fkey";

alter table "public"."nest_invitations" add constraint "unique_nest_email" UNIQUE using index "unique_nest_email";

alter table "public"."nest_invitations" add constraint "unique_token" UNIQUE using index "unique_token";

alter table "public"."nest_members" add constraint "nest_members_nest_id_fkey" FOREIGN KEY (nest_id) REFERENCES nests(id) ON DELETE CASCADE not valid;

alter table "public"."nest_members" validate constraint "nest_members_nest_id_fkey";

alter table "public"."nest_members" add constraint "nest_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."nest_members" validate constraint "nest_members_user_id_fkey";

alter table "public"."nest_settings" add constraint "nest_settings_nest_id_fkey" FOREIGN KEY (nest_id) REFERENCES nests(id) not valid;

alter table "public"."nest_settings" validate constraint "nest_settings_nest_id_fkey";

alter table "public"."nests" add constraint "nests_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."nests" validate constraint "nests_owner_id_fkey";

alter table "public"."spaces" add constraint "spaces_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."spaces" validate constraint "spaces_created_by_fkey";

alter table "public"."spaces" add constraint "spaces_nest_id_fkey" FOREIGN KEY (nest_id) REFERENCES nests(id) ON DELETE CASCADE not valid;

alter table "public"."spaces" validate constraint "spaces_nest_id_fkey";

alter table "public"."spaces" add constraint "spaces_type_check" CHECK ((type = ANY (ARRAY['chat'::text, 'board'::text, 'meeting'::text, 'analysis'::text]))) not valid;

alter table "public"."spaces" validate constraint "spaces_type_check";

alter table "public"."user_presence" add constraint "user_presence_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_presence" validate constraint "user_presence_user_id_fkey";

alter table "public"."users" add constraint "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) not valid;

alter table "public"."users" validate constraint "users_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_card_with_relations(p_board_id uuid, p_title text, p_content text, p_column_type text, p_created_by uuid, p_created_at timestamp with time zone, p_updated_at timestamp with time zone, p_order_index integer, p_is_archived boolean, p_metadata jsonb, p_tags text[], p_source_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    new_card_id uuid;
BEGIN
    -- 1. カード本体を作成
    INSERT INTO board_cards (
        board_id, title, content, column_type, created_by, created_at, updated_at, order_index, is_archived, metadata
    ) VALUES (
        p_board_id, p_title, p_content, p_column_type, p_created_by, p_created_at, p_updated_at, p_order_index, p_is_archived, p_metadata
    ) RETURNING id INTO new_card_id;

    -- 2. タグを追加
    IF array_length(p_tags, 1) > 0 THEN
        INSERT INTO board_card_tags (card_id, tag)
        SELECT new_card_id, unnest(p_tags);
    END IF;

    -- 3. ソースを追加（重複チェック）
    IF p_source_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM board_card_sources WHERE card_id = new_card_id AND source_id = p_source_id
        ) THEN
            INSERT INTO board_card_sources (card_id, source_id) VALUES (new_card_id, p_source_id);
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'card', (
        SELECT row_to_json(c) FROM board_cards c WHERE c.id = new_card_id
    ));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_board_cards_with_tags(board_id uuid)
 RETURNS TABLE(id uuid, board_id uuid, title text, content text, column_type text, order_index integer, is_archived boolean, created_by uuid, created_by_display_name text, created_at timestamp without time zone, updated_at timestamp without time zone, updated_by uuid, source_message_id uuid, metadata jsonb, tags text[], sources jsonb[])
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    c.id,
    c.board_id,
    c.title,
    c.content,
    c.column_type,
    c.order_index,
    c.is_archived,
    c.created_by,
    u.display_name as created_by_display_name,
    c.created_at,
    c.updated_at,
    c.updated_by,
    c.source_message_id,
    c.metadata,
    ARRAY_REMOVE(ARRAY_AGG(t.tag), NULL) AS tags,
    ARRAY_REMOVE(ARRAY_AGG(
      CASE WHEN s.id IS NOT NULL THEN jsonb_build_object(
        'id', s.id,
        'type', s.type,
        'url', s.url,
        'label', s.label,
        'meta', s.meta
      ) ELSE NULL END
    ), NULL) AS sources
  FROM board_cards c
  LEFT JOIN users u ON c.created_by = u.id
  LEFT JOIN board_card_tags t ON c.id = t.card_id
  LEFT JOIN board_card_sources bcs ON c.id = bcs.card_id
  LEFT JOIN sources s ON bcs.source_id = s.id
  WHERE c.board_id = board_id
  GROUP BY c.id, u.display_name
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$function$
;

grant delete on table "public"."board_card_relations" to "anon";

grant insert on table "public"."board_card_relations" to "anon";

grant references on table "public"."board_card_relations" to "anon";

grant select on table "public"."board_card_relations" to "anon";

grant trigger on table "public"."board_card_relations" to "anon";

grant truncate on table "public"."board_card_relations" to "anon";

grant update on table "public"."board_card_relations" to "anon";

grant delete on table "public"."board_card_relations" to "authenticated";

grant insert on table "public"."board_card_relations" to "authenticated";

grant references on table "public"."board_card_relations" to "authenticated";

grant select on table "public"."board_card_relations" to "authenticated";

grant trigger on table "public"."board_card_relations" to "authenticated";

grant truncate on table "public"."board_card_relations" to "authenticated";

grant update on table "public"."board_card_relations" to "authenticated";

grant delete on table "public"."board_card_relations" to "service_role";

grant insert on table "public"."board_card_relations" to "service_role";

grant references on table "public"."board_card_relations" to "service_role";

grant select on table "public"."board_card_relations" to "service_role";

grant trigger on table "public"."board_card_relations" to "service_role";

grant truncate on table "public"."board_card_relations" to "service_role";

grant update on table "public"."board_card_relations" to "service_role";

grant delete on table "public"."board_card_sources" to "anon";

grant insert on table "public"."board_card_sources" to "anon";

grant references on table "public"."board_card_sources" to "anon";

grant select on table "public"."board_card_sources" to "anon";

grant trigger on table "public"."board_card_sources" to "anon";

grant truncate on table "public"."board_card_sources" to "anon";

grant update on table "public"."board_card_sources" to "anon";

grant delete on table "public"."board_card_sources" to "authenticated";

grant insert on table "public"."board_card_sources" to "authenticated";

grant references on table "public"."board_card_sources" to "authenticated";

grant select on table "public"."board_card_sources" to "authenticated";

grant trigger on table "public"."board_card_sources" to "authenticated";

grant truncate on table "public"."board_card_sources" to "authenticated";

grant update on table "public"."board_card_sources" to "authenticated";

grant delete on table "public"."board_card_sources" to "service_role";

grant insert on table "public"."board_card_sources" to "service_role";

grant references on table "public"."board_card_sources" to "service_role";

grant select on table "public"."board_card_sources" to "service_role";

grant trigger on table "public"."board_card_sources" to "service_role";

grant truncate on table "public"."board_card_sources" to "service_role";

grant update on table "public"."board_card_sources" to "service_role";

grant delete on table "public"."board_card_tags" to "anon";

grant insert on table "public"."board_card_tags" to "anon";

grant references on table "public"."board_card_tags" to "anon";

grant select on table "public"."board_card_tags" to "anon";

grant trigger on table "public"."board_card_tags" to "anon";

grant truncate on table "public"."board_card_tags" to "anon";

grant update on table "public"."board_card_tags" to "anon";

grant delete on table "public"."board_card_tags" to "authenticated";

grant insert on table "public"."board_card_tags" to "authenticated";

grant references on table "public"."board_card_tags" to "authenticated";

grant select on table "public"."board_card_tags" to "authenticated";

grant trigger on table "public"."board_card_tags" to "authenticated";

grant truncate on table "public"."board_card_tags" to "authenticated";

grant update on table "public"."board_card_tags" to "authenticated";

grant delete on table "public"."board_card_tags" to "service_role";

grant insert on table "public"."board_card_tags" to "service_role";

grant references on table "public"."board_card_tags" to "service_role";

grant select on table "public"."board_card_tags" to "service_role";

grant trigger on table "public"."board_card_tags" to "service_role";

grant truncate on table "public"."board_card_tags" to "service_role";

grant update on table "public"."board_card_tags" to "service_role";

grant delete on table "public"."board_cards" to "anon";

grant insert on table "public"."board_cards" to "anon";

grant references on table "public"."board_cards" to "anon";

grant select on table "public"."board_cards" to "anon";

grant trigger on table "public"."board_cards" to "anon";

grant truncate on table "public"."board_cards" to "anon";

grant update on table "public"."board_cards" to "anon";

grant delete on table "public"."board_cards" to "authenticated";

grant insert on table "public"."board_cards" to "authenticated";

grant references on table "public"."board_cards" to "authenticated";

grant select on table "public"."board_cards" to "authenticated";

grant trigger on table "public"."board_cards" to "authenticated";

grant truncate on table "public"."board_cards" to "authenticated";

grant update on table "public"."board_cards" to "authenticated";

grant delete on table "public"."board_cards" to "service_role";

grant insert on table "public"."board_cards" to "service_role";

grant references on table "public"."board_cards" to "service_role";

grant select on table "public"."board_cards" to "service_role";

grant trigger on table "public"."board_cards" to "service_role";

grant truncate on table "public"."board_cards" to "service_role";

grant update on table "public"."board_cards" to "service_role";

grant delete on table "public"."board_items" to "anon";

grant insert on table "public"."board_items" to "anon";

grant references on table "public"."board_items" to "anon";

grant select on table "public"."board_items" to "anon";

grant trigger on table "public"."board_items" to "anon";

grant truncate on table "public"."board_items" to "anon";

grant update on table "public"."board_items" to "anon";

grant delete on table "public"."board_items" to "authenticated";

grant insert on table "public"."board_items" to "authenticated";

grant references on table "public"."board_items" to "authenticated";

grant select on table "public"."board_items" to "authenticated";

grant trigger on table "public"."board_items" to "authenticated";

grant truncate on table "public"."board_items" to "authenticated";

grant update on table "public"."board_items" to "authenticated";

grant delete on table "public"."board_items" to "service_role";

grant insert on table "public"."board_items" to "service_role";

grant references on table "public"."board_items" to "service_role";

grant select on table "public"."board_items" to "service_role";

grant trigger on table "public"."board_items" to "service_role";

grant truncate on table "public"."board_items" to "service_role";

grant update on table "public"."board_items" to "service_role";

grant delete on table "public"."boards" to "anon";

grant insert on table "public"."boards" to "anon";

grant references on table "public"."boards" to "anon";

grant select on table "public"."boards" to "anon";

grant trigger on table "public"."boards" to "anon";

grant truncate on table "public"."boards" to "anon";

grant update on table "public"."boards" to "anon";

grant delete on table "public"."boards" to "authenticated";

grant insert on table "public"."boards" to "authenticated";

grant references on table "public"."boards" to "authenticated";

grant select on table "public"."boards" to "authenticated";

grant trigger on table "public"."boards" to "authenticated";

grant truncate on table "public"."boards" to "authenticated";

grant update on table "public"."boards" to "authenticated";

grant delete on table "public"."boards" to "service_role";

grant insert on table "public"."boards" to "service_role";

grant references on table "public"."boards" to "service_role";

grant select on table "public"."boards" to "service_role";

grant trigger on table "public"."boards" to "service_role";

grant truncate on table "public"."boards" to "service_role";

grant update on table "public"."boards" to "service_role";

grant delete on table "public"."chat_messages" to "anon";

grant insert on table "public"."chat_messages" to "anon";

grant references on table "public"."chat_messages" to "anon";

grant select on table "public"."chat_messages" to "anon";

grant trigger on table "public"."chat_messages" to "anon";

grant truncate on table "public"."chat_messages" to "anon";

grant update on table "public"."chat_messages" to "anon";

grant delete on table "public"."chat_messages" to "authenticated";

grant insert on table "public"."chat_messages" to "authenticated";

grant references on table "public"."chat_messages" to "authenticated";

grant select on table "public"."chat_messages" to "authenticated";

grant trigger on table "public"."chat_messages" to "authenticated";

grant truncate on table "public"."chat_messages" to "authenticated";

grant update on table "public"."chat_messages" to "authenticated";

grant delete on table "public"."chat_messages" to "service_role";

grant insert on table "public"."chat_messages" to "service_role";

grant references on table "public"."chat_messages" to "service_role";

grant select on table "public"."chat_messages" to "service_role";

grant trigger on table "public"."chat_messages" to "service_role";

grant truncate on table "public"."chat_messages" to "service_role";

grant update on table "public"."chat_messages" to "service_role";

grant delete on table "public"."chat_rooms" to "anon";

grant insert on table "public"."chat_rooms" to "anon";

grant references on table "public"."chat_rooms" to "anon";

grant select on table "public"."chat_rooms" to "anon";

grant trigger on table "public"."chat_rooms" to "anon";

grant truncate on table "public"."chat_rooms" to "anon";

grant update on table "public"."chat_rooms" to "anon";

grant delete on table "public"."chat_rooms" to "authenticated";

grant insert on table "public"."chat_rooms" to "authenticated";

grant references on table "public"."chat_rooms" to "authenticated";

grant select on table "public"."chat_rooms" to "authenticated";

grant trigger on table "public"."chat_rooms" to "authenticated";

grant truncate on table "public"."chat_rooms" to "authenticated";

grant update on table "public"."chat_rooms" to "authenticated";

grant delete on table "public"."chat_rooms" to "service_role";

grant insert on table "public"."chat_rooms" to "service_role";

grant references on table "public"."chat_rooms" to "service_role";

grant select on table "public"."chat_rooms" to "service_role";

grant trigger on table "public"."chat_rooms" to "service_role";

grant truncate on table "public"."chat_rooms" to "service_role";

grant update on table "public"."chat_rooms" to "service_role";

grant delete on table "public"."insights" to "anon";

grant insert on table "public"."insights" to "anon";

grant references on table "public"."insights" to "anon";

grant select on table "public"."insights" to "anon";

grant trigger on table "public"."insights" to "anon";

grant truncate on table "public"."insights" to "anon";

grant update on table "public"."insights" to "anon";

grant delete on table "public"."insights" to "authenticated";

grant insert on table "public"."insights" to "authenticated";

grant references on table "public"."insights" to "authenticated";

grant select on table "public"."insights" to "authenticated";

grant trigger on table "public"."insights" to "authenticated";

grant truncate on table "public"."insights" to "authenticated";

grant update on table "public"."insights" to "authenticated";

grant delete on table "public"."insights" to "service_role";

grant insert on table "public"."insights" to "service_role";

grant references on table "public"."insights" to "service_role";

grant select on table "public"."insights" to "service_role";

grant trigger on table "public"."insights" to "service_role";

grant truncate on table "public"."insights" to "service_role";

grant update on table "public"."insights" to "service_role";

grant delete on table "public"."nest_invitations" to "anon";

grant insert on table "public"."nest_invitations" to "anon";

grant references on table "public"."nest_invitations" to "anon";

grant select on table "public"."nest_invitations" to "anon";

grant trigger on table "public"."nest_invitations" to "anon";

grant truncate on table "public"."nest_invitations" to "anon";

grant update on table "public"."nest_invitations" to "anon";

grant delete on table "public"."nest_invitations" to "authenticated";

grant insert on table "public"."nest_invitations" to "authenticated";

grant references on table "public"."nest_invitations" to "authenticated";

grant select on table "public"."nest_invitations" to "authenticated";

grant trigger on table "public"."nest_invitations" to "authenticated";

grant truncate on table "public"."nest_invitations" to "authenticated";

grant update on table "public"."nest_invitations" to "authenticated";

grant delete on table "public"."nest_invitations" to "service_role";

grant insert on table "public"."nest_invitations" to "service_role";

grant references on table "public"."nest_invitations" to "service_role";

grant select on table "public"."nest_invitations" to "service_role";

grant trigger on table "public"."nest_invitations" to "service_role";

grant truncate on table "public"."nest_invitations" to "service_role";

grant update on table "public"."nest_invitations" to "service_role";

grant delete on table "public"."nest_members" to "anon";

grant insert on table "public"."nest_members" to "anon";

grant references on table "public"."nest_members" to "anon";

grant select on table "public"."nest_members" to "anon";

grant trigger on table "public"."nest_members" to "anon";

grant truncate on table "public"."nest_members" to "anon";

grant update on table "public"."nest_members" to "anon";

grant delete on table "public"."nest_members" to "authenticated";

grant insert on table "public"."nest_members" to "authenticated";

grant references on table "public"."nest_members" to "authenticated";

grant select on table "public"."nest_members" to "authenticated";

grant trigger on table "public"."nest_members" to "authenticated";

grant truncate on table "public"."nest_members" to "authenticated";

grant update on table "public"."nest_members" to "authenticated";

grant delete on table "public"."nest_members" to "service_role";

grant insert on table "public"."nest_members" to "service_role";

grant references on table "public"."nest_members" to "service_role";

grant select on table "public"."nest_members" to "service_role";

grant trigger on table "public"."nest_members" to "service_role";

grant truncate on table "public"."nest_members" to "service_role";

grant update on table "public"."nest_members" to "service_role";

grant delete on table "public"."nest_settings" to "anon";

grant insert on table "public"."nest_settings" to "anon";

grant references on table "public"."nest_settings" to "anon";

grant select on table "public"."nest_settings" to "anon";

grant trigger on table "public"."nest_settings" to "anon";

grant truncate on table "public"."nest_settings" to "anon";

grant update on table "public"."nest_settings" to "anon";

grant delete on table "public"."nest_settings" to "authenticated";

grant insert on table "public"."nest_settings" to "authenticated";

grant references on table "public"."nest_settings" to "authenticated";

grant select on table "public"."nest_settings" to "authenticated";

grant trigger on table "public"."nest_settings" to "authenticated";

grant truncate on table "public"."nest_settings" to "authenticated";

grant update on table "public"."nest_settings" to "authenticated";

grant delete on table "public"."nest_settings" to "service_role";

grant insert on table "public"."nest_settings" to "service_role";

grant references on table "public"."nest_settings" to "service_role";

grant select on table "public"."nest_settings" to "service_role";

grant trigger on table "public"."nest_settings" to "service_role";

grant truncate on table "public"."nest_settings" to "service_role";

grant update on table "public"."nest_settings" to "service_role";

grant delete on table "public"."nests" to "anon";

grant insert on table "public"."nests" to "anon";

grant references on table "public"."nests" to "anon";

grant select on table "public"."nests" to "anon";

grant trigger on table "public"."nests" to "anon";

grant truncate on table "public"."nests" to "anon";

grant update on table "public"."nests" to "anon";

grant delete on table "public"."nests" to "authenticated";

grant insert on table "public"."nests" to "authenticated";

grant references on table "public"."nests" to "authenticated";

grant select on table "public"."nests" to "authenticated";

grant trigger on table "public"."nests" to "authenticated";

grant truncate on table "public"."nests" to "authenticated";

grant update on table "public"."nests" to "authenticated";

grant delete on table "public"."nests" to "service_role";

grant insert on table "public"."nests" to "service_role";

grant references on table "public"."nests" to "service_role";

grant select on table "public"."nests" to "service_role";

grant trigger on table "public"."nests" to "service_role";

grant truncate on table "public"."nests" to "service_role";

grant update on table "public"."nests" to "service_role";

grant delete on table "public"."sources" to "anon";

grant insert on table "public"."sources" to "anon";

grant references on table "public"."sources" to "anon";

grant select on table "public"."sources" to "anon";

grant trigger on table "public"."sources" to "anon";

grant truncate on table "public"."sources" to "anon";

grant update on table "public"."sources" to "anon";

grant delete on table "public"."sources" to "authenticated";

grant insert on table "public"."sources" to "authenticated";

grant references on table "public"."sources" to "authenticated";

grant select on table "public"."sources" to "authenticated";

grant trigger on table "public"."sources" to "authenticated";

grant truncate on table "public"."sources" to "authenticated";

grant update on table "public"."sources" to "authenticated";

grant delete on table "public"."sources" to "service_role";

grant insert on table "public"."sources" to "service_role";

grant references on table "public"."sources" to "service_role";

grant select on table "public"."sources" to "service_role";

grant trigger on table "public"."sources" to "service_role";

grant truncate on table "public"."sources" to "service_role";

grant update on table "public"."sources" to "service_role";

grant delete on table "public"."spaces" to "anon";

grant insert on table "public"."spaces" to "anon";

grant references on table "public"."spaces" to "anon";

grant select on table "public"."spaces" to "anon";

grant trigger on table "public"."spaces" to "anon";

grant truncate on table "public"."spaces" to "anon";

grant update on table "public"."spaces" to "anon";

grant delete on table "public"."spaces" to "authenticated";

grant insert on table "public"."spaces" to "authenticated";

grant references on table "public"."spaces" to "authenticated";

grant select on table "public"."spaces" to "authenticated";

grant trigger on table "public"."spaces" to "authenticated";

grant truncate on table "public"."spaces" to "authenticated";

grant update on table "public"."spaces" to "authenticated";

grant delete on table "public"."spaces" to "service_role";

grant insert on table "public"."spaces" to "service_role";

grant references on table "public"."spaces" to "service_role";

grant select on table "public"."spaces" to "service_role";

grant trigger on table "public"."spaces" to "service_role";

grant truncate on table "public"."spaces" to "service_role";

grant update on table "public"."spaces" to "service_role";

grant delete on table "public"."user_presence" to "anon";

grant insert on table "public"."user_presence" to "anon";

grant references on table "public"."user_presence" to "anon";

grant select on table "public"."user_presence" to "anon";

grant trigger on table "public"."user_presence" to "anon";

grant truncate on table "public"."user_presence" to "anon";

grant update on table "public"."user_presence" to "anon";

grant delete on table "public"."user_presence" to "authenticated";

grant insert on table "public"."user_presence" to "authenticated";

grant references on table "public"."user_presence" to "authenticated";

grant select on table "public"."user_presence" to "authenticated";

grant trigger on table "public"."user_presence" to "authenticated";

grant truncate on table "public"."user_presence" to "authenticated";

grant update on table "public"."user_presence" to "authenticated";

grant delete on table "public"."user_presence" to "service_role";

grant insert on table "public"."user_presence" to "service_role";

grant references on table "public"."user_presence" to "service_role";

grant select on table "public"."user_presence" to "service_role";

grant trigger on table "public"."user_presence" to "service_role";

grant truncate on table "public"."user_presence" to "service_role";

grant update on table "public"."user_presence" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

create policy "ボードアイテム作成可能"
on "public"."board_items"
as permissive
for insert
to public
with check (((user_id = auth.uid()) AND (space_id IN ( SELECT spaces.id
   FROM spaces
  WHERE (spaces.nest_id IN ( SELECT nest_members.nest_id
           FROM nest_members
          WHERE (nest_members.user_id = auth.uid())))))));


create policy "ボードアイテム閲覧可能"
on "public"."board_items"
as permissive
for select
to public
using ((space_id IN ( SELECT spaces.id
   FROM spaces
  WHERE (spaces.nest_id IN ( SELECT nest_members.nest_id
           FROM nest_members
          WHERE (nest_members.user_id = auth.uid()))))));


create policy "自分のボードアイテム編集可能"
on "public"."board_items"
as permissive
for update
to public
using ((user_id = auth.uid()));


create policy "メッセージ送信可能"
on "public"."chat_messages"
as permissive
for insert
to public
with check (((sender_id = auth.uid()) AND (chat_id IN ( SELECT chat_rooms.id
   FROM chat_rooms
  WHERE (chat_rooms.space_id IN ( SELECT spaces.id
           FROM spaces
          WHERE (spaces.nest_id IN ( SELECT nest_members.nest_id
                   FROM nest_members
                  WHERE (nest_members.user_id = auth.uid())))))))));


create policy "メッセージ閲覧可能"
on "public"."chat_messages"
as permissive
for select
to public
using ((chat_id IN ( SELECT chat_rooms.id
   FROM chat_rooms
  WHERE (chat_rooms.space_id IN ( SELECT spaces.id
           FROM spaces
          WHERE (spaces.nest_id IN ( SELECT nest_members.nest_id
                   FROM nest_members
                  WHERE (nest_members.user_id = auth.uid()))))))));


create policy "自分のメッセージ編集可能"
on "public"."chat_messages"
as permissive
for update
to public
using ((sender_id = auth.uid()));


create policy "インサイト作成可能"
on "public"."insights"
as permissive
for insert
to public
with check (((created_by = auth.uid()) AND (nest_id IN ( SELECT nest_members.nest_id
   FROM nest_members
  WHERE (nest_members.user_id = auth.uid())))));


create policy "インサイト閲覧可能"
on "public"."insights"
as permissive
for select
to public
using ((nest_id IN ( SELECT nest_members.nest_id
   FROM nest_members
  WHERE (nest_members.user_id = auth.uid()))));


create policy "自分のインサイト編集可能"
on "public"."insights"
as permissive
for update
to public
using ((created_by = auth.uid()));


create policy "メンバーは閲覧可能"
on "public"."nests"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM nest_members
  WHERE ((nest_members.nest_id = nests.id) AND (nest_members.user_id = auth.uid())))));


create policy "作成者は全操作可能"
on "public"."nests"
as permissive
for all
to public
using ((owner_id = auth.uid()));


create policy "Authenticated users can create or update their own presence"
on "public"."user_presence"
as permissive
for all
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Authenticated users can view their own presence"
on "public"."user_presence"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Allow all select"
on "public"."users"
as permissive
for select
to public
using (true);


create policy "ユーザーは自分のプロフィールを更新できる"
on "public"."users"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "ユーザーは自分のプロフィールを表示できる"
on "public"."users"
as permissive
for select
to public
using ((auth.uid() = id));



