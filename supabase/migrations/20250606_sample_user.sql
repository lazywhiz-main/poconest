-- サンプルユーザー追加
INSERT INTO public.users (id, name, email) VALUES ('00000000-0000-0000-0000-000000000100', 'サンプルユーザー', 'sample@example.com') ON CONFLICT DO NOTHING; 