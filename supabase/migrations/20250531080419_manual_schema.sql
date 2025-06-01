drop policy "ボードアイテム作成可能" on "public"."board_items";

drop policy "ボードアイテム閲覧可能" on "public"."board_items";

drop policy "自分のボードアイテム編集可能" on "public"."board_items";

drop policy "メッセージ送信可能" on "public"."chat_messages";

drop policy "メッセージ閲覧可能" on "public"."chat_messages";

drop policy "自分のメッセージ編集可能" on "public"."chat_messages";

drop policy "インサイト作成可能" on "public"."insights";

drop policy "インサイト閲覧可能" on "public"."insights";

drop policy "自分のインサイト編集可能" on "public"."insights";

drop policy "メンバーは閲覧可能" on "public"."nests";

drop policy "作成者は全操作可能" on "public"."nests";

drop policy "Authenticated users can create or update their own presence" on "public"."user_presence";

drop policy "Authenticated users can view their own presence" on "public"."user_presence";

drop policy "Allow all select" on "public"."users";

drop policy "ユーザーは自分のプロフィールを更新できる" on "public"."users";

drop policy "ユーザーは自分のプロフィールを表示できる" on "public"."users";

revoke delete on table "public"."board_card_relations" from "anon";

revoke insert on table "public"."board_card_relations" from "anon";

revoke references on table "public"."board_card_relations" from "anon";

revoke select on table "public"."board_card_relations" from "anon";

revoke trigger on table "public"."board_card_relations" from "anon";

revoke truncate on table "public"."board_card_relations" from "anon";

revoke update on table "public"."board_card_relations" from "anon";

revoke delete on table "public"."board_card_relations" from "authenticated";

revoke insert on table "public"."board_card_relations" from "authenticated";

revoke references on table "public"."board_card_relations" from "authenticated";

revoke select on table "public"."board_card_relations" from "authenticated";

revoke trigger on table "public"."board_card_relations" from "authenticated";

revoke truncate on table "public"."board_card_relations" from "authenticated";

revoke update on table "public"."board_card_relations" from "authenticated";

revoke delete on table "public"."board_card_relations" from "service_role";

revoke insert on table "public"."board_card_relations" from "service_role";

revoke references on table "public"."board_card_relations" from "service_role";

revoke select on table "public"."board_card_relations" from "service_role";

revoke trigger on table "public"."board_card_relations" from "service_role";

revoke truncate on table "public"."board_card_relations" from "service_role";

revoke update on table "public"."board_card_relations" from "service_role";

revoke delete on table "public"."board_card_sources" from "anon";

revoke insert on table "public"."board_card_sources" from "anon";

revoke references on table "public"."board_card_sources" from "anon";

revoke select on table "public"."board_card_sources" from "anon";

revoke trigger on table "public"."board_card_sources" from "anon";

revoke truncate on table "public"."board_card_sources" from "anon";

revoke update on table "public"."board_card_sources" from "anon";

revoke delete on table "public"."board_card_sources" from "authenticated";

revoke insert on table "public"."board_card_sources" from "authenticated";

revoke references on table "public"."board_card_sources" from "authenticated";

revoke select on table "public"."board_card_sources" from "authenticated";

revoke trigger on table "public"."board_card_sources" from "authenticated";

revoke truncate on table "public"."board_card_sources" from "authenticated";

revoke update on table "public"."board_card_sources" from "authenticated";

revoke delete on table "public"."board_card_sources" from "service_role";

revoke insert on table "public"."board_card_sources" from "service_role";

revoke references on table "public"."board_card_sources" from "service_role";

revoke select on table "public"."board_card_sources" from "service_role";

revoke trigger on table "public"."board_card_sources" from "service_role";

revoke truncate on table "public"."board_card_sources" from "service_role";

revoke update on table "public"."board_card_sources" from "service_role";

revoke delete on table "public"."board_card_tags" from "anon";

revoke insert on table "public"."board_card_tags" from "anon";

revoke references on table "public"."board_card_tags" from "anon";

revoke select on table "public"."board_card_tags" from "anon";

revoke trigger on table "public"."board_card_tags" from "anon";

revoke truncate on table "public"."board_card_tags" from "anon";

revoke update on table "public"."board_card_tags" from "anon";

revoke delete on table "public"."board_card_tags" from "authenticated";

revoke insert on table "public"."board_card_tags" from "authenticated";

revoke references on table "public"."board_card_tags" from "authenticated";

revoke select on table "public"."board_card_tags" from "authenticated";

revoke trigger on table "public"."board_card_tags" from "authenticated";

revoke truncate on table "public"."board_card_tags" from "authenticated";

revoke update on table "public"."board_card_tags" from "authenticated";

revoke delete on table "public"."board_card_tags" from "service_role";

revoke insert on table "public"."board_card_tags" from "service_role";

revoke references on table "public"."board_card_tags" from "service_role";

revoke select on table "public"."board_card_tags" from "service_role";

revoke trigger on table "public"."board_card_tags" from "service_role";

revoke truncate on table "public"."board_card_tags" from "service_role";

revoke update on table "public"."board_card_tags" from "service_role";

revoke delete on table "public"."board_cards" from "anon";

revoke insert on table "public"."board_cards" from "anon";

revoke references on table "public"."board_cards" from "anon";

revoke select on table "public"."board_cards" from "anon";

revoke trigger on table "public"."board_cards" from "anon";

revoke truncate on table "public"."board_cards" from "anon";

revoke update on table "public"."board_cards" from "anon";

revoke delete on table "public"."board_cards" from "authenticated";

revoke insert on table "public"."board_cards" from "authenticated";

revoke references on table "public"."board_cards" from "authenticated";

revoke select on table "public"."board_cards" from "authenticated";

revoke trigger on table "public"."board_cards" from "authenticated";

revoke truncate on table "public"."board_cards" from "authenticated";

revoke update on table "public"."board_cards" from "authenticated";

revoke delete on table "public"."board_cards" from "service_role";

revoke insert on table "public"."board_cards" from "service_role";

revoke references on table "public"."board_cards" from "service_role";

revoke select on table "public"."board_cards" from "service_role";

revoke trigger on table "public"."board_cards" from "service_role";

revoke truncate on table "public"."board_cards" from "service_role";

revoke update on table "public"."board_cards" from "service_role";

revoke delete on table "public"."board_items" from "anon";

revoke insert on table "public"."board_items" from "anon";

revoke references on table "public"."board_items" from "anon";

revoke select on table "public"."board_items" from "anon";

revoke trigger on table "public"."board_items" from "anon";

revoke truncate on table "public"."board_items" from "anon";

revoke update on table "public"."board_items" from "anon";

revoke delete on table "public"."board_items" from "authenticated";

revoke insert on table "public"."board_items" from "authenticated";

revoke references on table "public"."board_items" from "authenticated";

revoke select on table "public"."board_items" from "authenticated";

revoke trigger on table "public"."board_items" from "authenticated";

revoke truncate on table "public"."board_items" from "authenticated";

revoke update on table "public"."board_items" from "authenticated";

revoke delete on table "public"."board_items" from "service_role";

revoke insert on table "public"."board_items" from "service_role";

revoke references on table "public"."board_items" from "service_role";

revoke select on table "public"."board_items" from "service_role";

revoke trigger on table "public"."board_items" from "service_role";

revoke truncate on table "public"."board_items" from "service_role";

revoke update on table "public"."board_items" from "service_role";

revoke delete on table "public"."boards" from "anon";

revoke insert on table "public"."boards" from "anon";

revoke references on table "public"."boards" from "anon";

revoke select on table "public"."boards" from "anon";

revoke trigger on table "public"."boards" from "anon";

revoke truncate on table "public"."boards" from "anon";

revoke update on table "public"."boards" from "anon";

revoke delete on table "public"."boards" from "authenticated";

revoke insert on table "public"."boards" from "authenticated";

revoke references on table "public"."boards" from "authenticated";

revoke select on table "public"."boards" from "authenticated";

revoke trigger on table "public"."boards" from "authenticated";

revoke truncate on table "public"."boards" from "authenticated";

revoke update on table "public"."boards" from "authenticated";

revoke delete on table "public"."boards" from "service_role";

revoke insert on table "public"."boards" from "service_role";

revoke references on table "public"."boards" from "service_role";

revoke select on table "public"."boards" from "service_role";

revoke trigger on table "public"."boards" from "service_role";

revoke truncate on table "public"."boards" from "service_role";

revoke update on table "public"."boards" from "service_role";

revoke delete on table "public"."chat_messages" from "anon";

revoke insert on table "public"."chat_messages" from "anon";

revoke references on table "public"."chat_messages" from "anon";

revoke select on table "public"."chat_messages" from "anon";

revoke trigger on table "public"."chat_messages" from "anon";

revoke truncate on table "public"."chat_messages" from "anon";

revoke update on table "public"."chat_messages" from "anon";

revoke delete on table "public"."chat_messages" from "authenticated";

revoke insert on table "public"."chat_messages" from "authenticated";

revoke references on table "public"."chat_messages" from "authenticated";

revoke select on table "public"."chat_messages" from "authenticated";

revoke trigger on table "public"."chat_messages" from "authenticated";

revoke truncate on table "public"."chat_messages" from "authenticated";

revoke update on table "public"."chat_messages" from "authenticated";

revoke delete on table "public"."chat_messages" from "service_role";

revoke insert on table "public"."chat_messages" from "service_role";

revoke references on table "public"."chat_messages" from "service_role";

revoke select on table "public"."chat_messages" from "service_role";

revoke trigger on table "public"."chat_messages" from "service_role";

revoke truncate on table "public"."chat_messages" from "service_role";

revoke update on table "public"."chat_messages" from "service_role";

revoke delete on table "public"."chat_rooms" from "anon";

revoke insert on table "public"."chat_rooms" from "anon";

revoke references on table "public"."chat_rooms" from "anon";

revoke select on table "public"."chat_rooms" from "anon";

revoke trigger on table "public"."chat_rooms" from "anon";

revoke truncate on table "public"."chat_rooms" from "anon";

revoke update on table "public"."chat_rooms" from "anon";

revoke delete on table "public"."chat_rooms" from "authenticated";

revoke insert on table "public"."chat_rooms" from "authenticated";

revoke references on table "public"."chat_rooms" from "authenticated";

revoke select on table "public"."chat_rooms" from "authenticated";

revoke trigger on table "public"."chat_rooms" from "authenticated";

revoke truncate on table "public"."chat_rooms" from "authenticated";

revoke update on table "public"."chat_rooms" from "authenticated";

revoke delete on table "public"."chat_rooms" from "service_role";

revoke insert on table "public"."chat_rooms" from "service_role";

revoke references on table "public"."chat_rooms" from "service_role";

revoke select on table "public"."chat_rooms" from "service_role";

revoke trigger on table "public"."chat_rooms" from "service_role";

revoke truncate on table "public"."chat_rooms" from "service_role";

revoke update on table "public"."chat_rooms" from "service_role";

revoke delete on table "public"."insights" from "anon";

revoke insert on table "public"."insights" from "anon";

revoke references on table "public"."insights" from "anon";

revoke select on table "public"."insights" from "anon";

revoke trigger on table "public"."insights" from "anon";

revoke truncate on table "public"."insights" from "anon";

revoke update on table "public"."insights" from "anon";

revoke delete on table "public"."insights" from "authenticated";

revoke insert on table "public"."insights" from "authenticated";

revoke references on table "public"."insights" from "authenticated";

revoke select on table "public"."insights" from "authenticated";

revoke trigger on table "public"."insights" from "authenticated";

revoke truncate on table "public"."insights" from "authenticated";

revoke update on table "public"."insights" from "authenticated";

revoke delete on table "public"."insights" from "service_role";

revoke insert on table "public"."insights" from "service_role";

revoke references on table "public"."insights" from "service_role";

revoke select on table "public"."insights" from "service_role";

revoke trigger on table "public"."insights" from "service_role";

revoke truncate on table "public"."insights" from "service_role";

revoke update on table "public"."insights" from "service_role";

revoke delete on table "public"."sources" from "anon";

revoke insert on table "public"."sources" from "anon";

revoke references on table "public"."sources" from "anon";

revoke select on table "public"."sources" from "anon";

revoke trigger on table "public"."sources" from "anon";

revoke truncate on table "public"."sources" from "anon";

revoke update on table "public"."sources" from "anon";

revoke delete on table "public"."sources" from "authenticated";

revoke insert on table "public"."sources" from "authenticated";

revoke references on table "public"."sources" from "authenticated";

revoke select on table "public"."sources" from "authenticated";

revoke trigger on table "public"."sources" from "authenticated";

revoke truncate on table "public"."sources" from "authenticated";

revoke update on table "public"."sources" from "authenticated";

revoke delete on table "public"."sources" from "service_role";

revoke insert on table "public"."sources" from "service_role";

revoke references on table "public"."sources" from "service_role";

revoke select on table "public"."sources" from "service_role";

revoke trigger on table "public"."sources" from "service_role";

revoke truncate on table "public"."sources" from "service_role";

revoke update on table "public"."sources" from "service_role";

revoke delete on table "public"."spaces" from "anon";

revoke insert on table "public"."spaces" from "anon";

revoke references on table "public"."spaces" from "anon";

revoke select on table "public"."spaces" from "anon";

revoke trigger on table "public"."spaces" from "anon";

revoke truncate on table "public"."spaces" from "anon";

revoke update on table "public"."spaces" from "anon";

revoke delete on table "public"."spaces" from "authenticated";

revoke insert on table "public"."spaces" from "authenticated";

revoke references on table "public"."spaces" from "authenticated";

revoke select on table "public"."spaces" from "authenticated";

revoke trigger on table "public"."spaces" from "authenticated";

revoke truncate on table "public"."spaces" from "authenticated";

revoke update on table "public"."spaces" from "authenticated";

revoke delete on table "public"."spaces" from "service_role";

revoke insert on table "public"."spaces" from "service_role";

revoke references on table "public"."spaces" from "service_role";

revoke select on table "public"."spaces" from "service_role";

revoke trigger on table "public"."spaces" from "service_role";

revoke truncate on table "public"."spaces" from "service_role";

revoke update on table "public"."spaces" from "service_role";

revoke delete on table "public"."user_presence" from "anon";

revoke insert on table "public"."user_presence" from "anon";

revoke references on table "public"."user_presence" from "anon";

revoke select on table "public"."user_presence" from "anon";

revoke trigger on table "public"."user_presence" from "anon";

revoke truncate on table "public"."user_presence" from "anon";

revoke update on table "public"."user_presence" from "anon";

revoke delete on table "public"."user_presence" from "authenticated";

revoke insert on table "public"."user_presence" from "authenticated";

revoke references on table "public"."user_presence" from "authenticated";

revoke select on table "public"."user_presence" from "authenticated";

revoke trigger on table "public"."user_presence" from "authenticated";

revoke truncate on table "public"."user_presence" from "authenticated";

revoke update on table "public"."user_presence" from "authenticated";

revoke delete on table "public"."user_presence" from "service_role";

revoke insert on table "public"."user_presence" from "service_role";

revoke references on table "public"."user_presence" from "service_role";

revoke select on table "public"."user_presence" from "service_role";

revoke trigger on table "public"."user_presence" from "service_role";

revoke truncate on table "public"."user_presence" from "service_role";

revoke update on table "public"."user_presence" from "service_role";

alter table "public"."board_card_relations" drop constraint "board_card_relations_card_id_fkey";

alter table "public"."board_card_relations" drop constraint "board_card_relations_related_card_id_fkey";

alter table "public"."board_card_sources" drop constraint "board_card_sources_card_id_fkey";

alter table "public"."board_card_sources" drop constraint "board_card_sources_source_id_fkey";

alter table "public"."board_card_tags" drop constraint "board_card_tags_card_id_fkey";

alter table "public"."board_cards" drop constraint "board_cards_board_id_fkey";

alter table "public"."board_cards" drop constraint "fk_board_cards_created_by";

alter table "public"."board_items" drop constraint "board_items_parent_id_fkey";

alter table "public"."board_items" drop constraint "board_items_space_id_fkey";

alter table "public"."board_items" drop constraint "board_items_type_check";

alter table "public"."board_items" drop constraint "board_items_user_id_fkey";

alter table "public"."boards" drop constraint "fk_boards_nest_id";

alter table "public"."boards" drop constraint "unique_nest_id";

alter table "public"."chat_messages" drop constraint "chat_messages_chat_id_fkey";

alter table "public"."chat_messages" drop constraint "chat_messages_sender_id_fkey";

alter table "public"."chat_rooms" drop constraint "chat_rooms_space_id_fkey";

alter table "public"."insights" drop constraint "insights_created_by_fkey";

alter table "public"."insights" drop constraint "insights_nest_id_fkey";

alter table "public"."insights" drop constraint "insights_source_type_check";

alter table "public"."insights" drop constraint "insights_space_id_fkey";

alter table "public"."nest_invitations" drop constraint "unique_nest_email";

alter table "public"."nest_invitations" drop constraint "unique_token";

alter table "public"."spaces" drop constraint "spaces_created_by_fkey";

alter table "public"."spaces" drop constraint "spaces_nest_id_fkey";

alter table "public"."spaces" drop constraint "spaces_type_check";

alter table "public"."user_presence" drop constraint "user_presence_user_id_fkey";

alter table "public"."nest_invitations" drop constraint "nest_invitations_invited_by_fkey";

alter table "public"."nest_invitations" drop constraint "nest_invitations_target_user_id_fkey";

alter table "public"."nest_members" drop constraint "nest_members_user_id_fkey";

alter table "public"."nest_settings" drop constraint "nest_settings_nest_id_fkey";

alter table "public"."users" drop constraint "users_id_fkey";

-- drop function if exists "public"."handle_new_user"();

alter table "public"."board_card_relations" drop constraint "board_card_relations_pkey";

alter table "public"."board_card_sources" drop constraint "board_card_sources_pkey";

alter table "public"."board_card_tags" drop constraint "board_card_tags_pkey";

alter table "public"."board_cards" drop constraint "board_cards_pkey";

alter table "public"."board_items" drop constraint "board_items_pkey";

alter table "public"."boards" drop constraint "boards_pkey";

alter table "public"."chat_messages" drop constraint "chat_messages_pkey";

alter table "public"."chat_rooms" drop constraint "chat_rooms_pkey";

alter table "public"."insights" drop constraint "insights_pkey";

alter table "public"."sources" drop constraint "sources_pkey";

alter table "public"."spaces" drop constraint "spaces_pkey";

alter table "public"."user_presence" drop constraint "user_presence_pkey";

alter table "public"."nest_members" drop constraint "nest_members_pkey";

alter table "public"."nest_settings" drop constraint "nest_settings_pkey";

drop index if exists "public"."board_card_relations_pkey";

drop index if exists "public"."board_card_sources_pkey";

drop index if exists "public"."board_card_tags_pkey";

drop index if exists "public"."board_cards_pkey";

drop index if exists "public"."board_items_parent_id_idx";

drop index if exists "public"."board_items_pkey";

drop index if exists "public"."board_items_space_id_idx";

drop index if exists "public"."boards_pkey";

drop index if exists "public"."chat_messages_chat_id_idx";

drop index if exists "public"."chat_messages_pkey";

drop index if exists "public"."chat_messages_sender_id_idx";

drop index if exists "public"."chat_rooms_pkey";

drop index if exists "public"."chat_rooms_space_id_idx";

drop index if exists "public"."idx_board_card_relations_card_id";

drop index if exists "public"."idx_board_card_relations_related_card_id";

drop index if exists "public"."insights_nest_id_idx";

drop index if exists "public"."insights_pkey";

drop index if exists "public"."insights_space_id_idx";

drop index if exists "public"."sources_pkey";

drop index if exists "public"."spaces_nest_id_idx";

drop index if exists "public"."spaces_pkey";

drop index if exists "public"."unique_nest_email";

drop index if exists "public"."unique_nest_id";

drop index if exists "public"."unique_token";

drop index if exists "public"."user_presence_pkey";

drop index if exists "public"."nest_members_pkey";

drop index if exists "public"."nest_settings_pkey";

drop table "public"."board_card_relations";

drop table "public"."board_card_sources";

drop table "public"."board_card_tags";

drop table "public"."board_cards";

drop table "public"."board_items";

drop table "public"."boards";

drop table "public"."chat_messages";

drop table "public"."chat_rooms";

drop table "public"."insights";

drop table "public"."sources";

drop table "public"."spaces";

drop table "public"."user_presence";

create table "public"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "type" text not null,
    "title" text not null,
    "content" text not null,
    "data" jsonb default '{}'::jsonb,
    "is_read" boolean default false,
    "created_at" timestamp with time zone default now()
);


alter table "public"."notifications" enable row level security;

alter table "public"."nest_invitations" drop column "invited_email";

alter table "public"."nest_invitations" drop column "status";

alter table "public"."nest_members" alter column "role" drop default;

alter table "public"."nest_members" enable row level security;

alter table "public"."nest_settings" drop column "custom_emojis";

alter table "public"."nest_settings" drop column "metadata";

alter table "public"."nest_settings" drop column "theme";

alter table "public"."nest_settings" add column "created_at" timestamp with time zone default now();

alter table "public"."nest_settings" add column "id" uuid not null default gen_random_uuid();

alter table "public"."nest_settings" add column "updated_at" timestamp with time zone default now();

alter table "public"."nest_settings" alter column "notification_settings" set default '{"pushNotifications": true, "emailNotifications": true, "mentionNotifications": true}'::jsonb;

alter table "public"."nest_settings" alter column "privacy_settings" set default '{"contentVisibility": "members_only", "inviteRestriction": "owner_only", "memberListVisibility": "members_only"}'::jsonb;

alter table "public"."nest_settings" enable row level security;

alter table "public"."nests" alter column "color" set default '#A5D6A7'::text;

alter table "public"."nests" alter column "icon" drop default;

alter table "public"."nests" alter column "owner_id" set not null;

alter table "public"."users" drop column "updated_at";

alter table "public"."users" add column "default_nest_id" uuid;

alter table "public"."users" add column "last_seen_at" timestamp with time zone;

alter table "public"."users" add column "settings" jsonb default '{}'::jsonb;

alter table "public"."users" alter column "created_at" set default now();

alter table "public"."users" disable row level security;

CREATE INDEX idx_nest_invitations_nest_id ON public.nest_invitations USING btree (nest_id);

CREATE INDEX idx_nest_invitations_target_user_id ON public.nest_invitations USING btree (target_user_id);

CREATE INDEX idx_nest_invitations_token ON public.nest_invitations USING btree (token);

CREATE INDEX idx_nest_members_nest_id ON public.nest_members USING btree (nest_id);

CREATE INDEX idx_nest_members_user_id ON public.nest_members USING btree (user_id);

CREATE INDEX idx_nest_settings_nest_id ON public.nest_settings USING btree (nest_id);

CREATE INDEX idx_nests_owner_id ON public.nests USING btree (owner_id);

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE INDEX idx_users_email ON public.users USING btree (email);

CREATE UNIQUE INDEX nest_invitations_token_key ON public.nest_invitations USING btree (token);

CREATE INDEX notifications_created_at_idx ON public.notifications USING btree (created_at DESC);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE INDEX notifications_type_idx ON public.notifications USING btree (type);

CREATE INDEX notifications_user_id_idx ON public.notifications USING btree (user_id);

CREATE UNIQUE INDEX nest_members_pkey ON public.nest_members USING btree (nest_id, user_id);

CREATE UNIQUE INDEX nest_settings_pkey ON public.nest_settings USING btree (id);

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."nest_members" add constraint "nest_members_pkey" PRIMARY KEY using index "nest_members_pkey";

alter table "public"."nest_settings" add constraint "nest_settings_pkey" PRIMARY KEY using index "nest_settings_pkey";

alter table "public"."nest_invitations" add constraint "nest_invitations_token_key" UNIQUE using index "nest_invitations_token_key";

alter table "public"."nest_members" add constraint "nest_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'member'::text]))) not valid;

alter table "public"."nest_members" validate constraint "nest_members_role_check";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."nest_invitations" add constraint "nest_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."nest_invitations" validate constraint "nest_invitations_invited_by_fkey";

alter table "public"."nest_invitations" add constraint "nest_invitations_target_user_id_fkey" FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."nest_invitations" validate constraint "nest_invitations_target_user_id_fkey";

alter table "public"."nest_members" add constraint "nest_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."nest_members" validate constraint "nest_members_user_id_fkey";

alter table "public"."nest_settings" add constraint "nest_settings_nest_id_fkey" FOREIGN KEY (nest_id) REFERENCES nests(id) ON DELETE CASCADE not valid;

alter table "public"."nest_settings" validate constraint "nest_settings_nest_id_fkey";

alter table "public"."users" add constraint "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."users" validate constraint "users_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

create policy "Nest members can view members"
on "public"."nest_members"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM nest_members nest_members_1
  WHERE ((nest_members_1.nest_id = nest_members_1.nest_id) AND (nest_members_1.user_id = auth.uid())))));


create policy "Nest owners can manage members"
on "public"."nest_members"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM nests
  WHERE ((nests.id = nest_members.nest_id) AND (nests.owner_id = auth.uid())))));


create policy "Nest members can view settings"
on "public"."nest_settings"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM nest_members
  WHERE ((nest_members.nest_id = nest_settings.nest_id) AND (nest_members.user_id = auth.uid())))));


create policy "Nest owners can update settings"
on "public"."nest_settings"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM nests
  WHERE ((nests.id = nest_settings.nest_id) AND (nests.owner_id = auth.uid())))));


create policy "Nest members can view nests"
on "public"."nests"
as permissive
for select
to public
using (((EXISTS ( SELECT 1
   FROM nest_members
  WHERE ((nest_members.nest_id = nests.id) AND (nest_members.user_id = auth.uid())))) OR (owner_id = auth.uid())));


create policy "Nest owners can delete nests"
on "public"."nests"
as permissive
for delete
to public
using ((owner_id = auth.uid()));


create policy "Nest owners can update nests"
on "public"."nests"
as permissive
for update
to public
using ((owner_id = auth.uid()));


create policy "Users can delete their own notifications"
on "public"."notifications"
as permissive
for delete
to public
using ((user_id = auth.uid()));


create policy "Users can update their own notifications"
on "public"."notifications"
as permissive
for update
to public
using ((user_id = auth.uid()));


create policy "Users can view their own notifications"
on "public"."notifications"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "システムは通知を作成可能"
on "public"."notifications"
as permissive
for insert
to authenticated
with check (true);


create policy "ユーザーは自分の通知のみ削除可能"
on "public"."notifications"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));


create policy "ユーザーは自分の通知のみ参照可能"
on "public"."notifications"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));


create policy "ユーザーは自分の通知のみ更新可能"
on "public"."notifications"
as permissive
for update
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.nest_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.nests FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION set_updated_at();


