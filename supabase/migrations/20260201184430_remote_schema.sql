


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "participant_id" "uuid" NOT NULL,
    "nickname" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_blocked" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nickname" "text" NOT NULL,
    "room_id" "uuid" NOT NULL,
    "session_token" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."poll_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "options" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'waiting'::"text" NOT NULL,
    "started_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "poll_sessions_status_check" CHECK (("status" = ANY (ARRAY['waiting'::"text", 'active'::"text", 'ended'::"text"])))
);


ALTER TABLE "public"."poll_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."poll_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "poll_id" "uuid" NOT NULL,
    "participant_id" "uuid" NOT NULL,
    "option_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."poll_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "participant_id" "uuid" NOT NULL,
    "nickname" "text" NOT NULL,
    "answer" "jsonb" NOT NULL,
    "is_correct" boolean,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quiz_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "question" "text" NOT NULL,
    "options" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "question_type" "text" DEFAULT 'objective'::"text" NOT NULL,
    "correct_answer" integer,
    "time_limit_seconds" integer DEFAULT 30 NOT NULL,
    "status" "text" DEFAULT 'waiting'::"text" NOT NULL,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "quiz_set_id" "uuid",
    "order_index" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "quiz_sessions_question_type_check" CHECK (("question_type" = ANY (ARRAY['objective'::"text", 'subjective'::"text"]))),
    CONSTRAINT "quiz_sessions_status_check" CHECK (("status" = ANY (ARRAY['waiting'::"text", 'active'::"text", 'ended'::"text"])))
);


ALTER TABLE "public"."quiz_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."raffle_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "mode" "text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'waiting'::"text" NOT NULL,
    "result" "text",
    "started_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "raffle_sessions_mode_check" CHECK (("mode" = ANY (ARRAY['number_range'::"text", 'nicknames'::"text"]))),
    CONSTRAINT "raffle_sessions_status_check" CHECK (("status" = ANY (ARRAY['waiting'::"text", 'spinning'::"text", 'ended'::"text"])))
);


ALTER TABLE "public"."raffle_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "status" "text" DEFAULT 'waiting'::"text" NOT NULL,
    "current_program" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "quiz_set_id" "uuid",
    "quiz_phase" "text" DEFAULT 'waiting'::"text" NOT NULL,
    "quiz_current_index" integer DEFAULT 0 NOT NULL,
    "quiz_time_limit_enabled" boolean DEFAULT false NOT NULL,
    "quiz_time_limit_seconds" integer DEFAULT 30 NOT NULL,
    "quiz_show_ranking" boolean DEFAULT false NOT NULL,
    "room_logo_url" "text",
    "room_show_qr" boolean DEFAULT false NOT NULL,
    CONSTRAINT "rooms_quiz_phase_check" CHECK (("quiz_phase" = ANY (ARRAY['waiting'::"text", 'question'::"text", 'grading'::"text", 'reveal'::"text", 'ended'::"text"]))),
    CONSTRAINT "rooms_status_check" CHECK (("status" = ANY (ARRAY['waiting'::"text", 'active'::"text"])))
);


ALTER TABLE "public"."rooms" OWNER TO "postgres";


ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."poll_sessions"
    ADD CONSTRAINT "poll_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."poll_votes"
    ADD CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."poll_votes"
    ADD CONSTRAINT "poll_votes_poll_id_participant_id_key" UNIQUE ("poll_id", "participant_id");



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_session_id_participant_id_key" UNIQUE ("session_id", "participant_id");



ALTER TABLE ONLY "public"."quiz_sessions"
    ADD CONSTRAINT "quiz_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raffle_sessions"
    ADD CONSTRAINT "raffle_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages_is_blocked" ON "public"."messages" USING "btree" ("is_blocked");



CREATE INDEX "idx_messages_room_id" ON "public"."messages" USING "btree" ("room_id");



CREATE INDEX "idx_participants_room_id" ON "public"."participants" USING "btree" ("room_id");



CREATE INDEX "idx_participants_session_token" ON "public"."participants" USING "btree" ("session_token");



CREATE INDEX "idx_poll_sessions_room_id" ON "public"."poll_sessions" USING "btree" ("room_id");



CREATE INDEX "idx_poll_votes_poll_id" ON "public"."poll_votes" USING "btree" ("poll_id");



CREATE INDEX "idx_quiz_answers_session_correct" ON "public"."quiz_answers" USING "btree" ("session_id", "is_correct");



CREATE INDEX "idx_quiz_answers_session_id" ON "public"."quiz_answers" USING "btree" ("session_id");



CREATE INDEX "idx_quiz_sessions_room_id" ON "public"."quiz_sessions" USING "btree" ("room_id");



CREATE INDEX "idx_quiz_sessions_set_id" ON "public"."quiz_sessions" USING "btree" ("quiz_set_id");



CREATE INDEX "idx_quiz_sessions_status" ON "public"."quiz_sessions" USING "btree" ("status");



CREATE INDEX "idx_raffle_sessions_room_id" ON "public"."raffle_sessions" USING "btree" ("room_id");



CREATE OR REPLACE TRIGGER "update_rooms_updated_at" BEFORE UPDATE ON "public"."rooms" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."poll_sessions"
    ADD CONSTRAINT "poll_sessions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."poll_votes"
    ADD CONSTRAINT "poll_votes_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."poll_votes"
    ADD CONSTRAINT "poll_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "public"."poll_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."quiz_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_sessions"
    ADD CONSTRAINT "quiz_sessions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raffle_sessions"
    ADD CONSTRAINT "raffle_sessions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."poll_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."poll_votes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public delete messages" ON "public"."messages" FOR DELETE USING (true);



CREATE POLICY "public delete participants" ON "public"."participants" FOR DELETE USING (true);



CREATE POLICY "public delete poll_sessions" ON "public"."poll_sessions" FOR DELETE USING (true);



CREATE POLICY "public delete poll_votes" ON "public"."poll_votes" FOR DELETE USING (true);



CREATE POLICY "public delete quiz_answers" ON "public"."quiz_answers" FOR DELETE USING (true);



CREATE POLICY "public delete quiz_sessions" ON "public"."quiz_sessions" FOR DELETE USING (true);



CREATE POLICY "public delete raffle_sessions" ON "public"."raffle_sessions" FOR DELETE USING (true);



CREATE POLICY "public delete rooms" ON "public"."rooms" FOR DELETE USING (true);



CREATE POLICY "public insert messages" ON "public"."messages" FOR INSERT WITH CHECK (true);



CREATE POLICY "public insert participants" ON "public"."participants" FOR INSERT WITH CHECK (true);



CREATE POLICY "public insert poll_sessions" ON "public"."poll_sessions" FOR INSERT WITH CHECK (true);



CREATE POLICY "public insert poll_votes" ON "public"."poll_votes" FOR INSERT WITH CHECK (true);



CREATE POLICY "public insert quiz_answers" ON "public"."quiz_answers" FOR INSERT WITH CHECK (true);



CREATE POLICY "public insert quiz_sessions" ON "public"."quiz_sessions" FOR INSERT WITH CHECK (true);



CREATE POLICY "public insert raffle_sessions" ON "public"."raffle_sessions" FOR INSERT WITH CHECK (true);



CREATE POLICY "public insert rooms" ON "public"."rooms" FOR INSERT WITH CHECK (true);



CREATE POLICY "public read messages" ON "public"."messages" FOR SELECT USING (true);



CREATE POLICY "public read participants" ON "public"."participants" FOR SELECT USING (true);



CREATE POLICY "public read poll_sessions" ON "public"."poll_sessions" FOR SELECT USING (true);



CREATE POLICY "public read poll_votes" ON "public"."poll_votes" FOR SELECT USING (true);



CREATE POLICY "public read quiz_answers" ON "public"."quiz_answers" FOR SELECT USING (true);



CREATE POLICY "public read quiz_sessions" ON "public"."quiz_sessions" FOR SELECT USING (true);



CREATE POLICY "public read raffle_sessions" ON "public"."raffle_sessions" FOR SELECT USING (true);



CREATE POLICY "public read rooms" ON "public"."rooms" FOR SELECT USING (true);



CREATE POLICY "public update messages" ON "public"."messages" FOR UPDATE USING (true);



CREATE POLICY "public update participants" ON "public"."participants" FOR UPDATE USING (true);



CREATE POLICY "public update poll_sessions" ON "public"."poll_sessions" FOR UPDATE USING (true);



CREATE POLICY "public update poll_votes" ON "public"."poll_votes" FOR UPDATE USING (true);



CREATE POLICY "public update quiz_answers" ON "public"."quiz_answers" FOR UPDATE USING (true);



CREATE POLICY "public update quiz_sessions" ON "public"."quiz_sessions" FOR UPDATE USING (true);



CREATE POLICY "public update raffle_sessions" ON "public"."raffle_sessions" FOR UPDATE USING (true);



CREATE POLICY "public update rooms" ON "public"."rooms" FOR UPDATE USING (true);



ALTER TABLE "public"."quiz_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."raffle_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."participants";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."poll_sessions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."poll_votes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."quiz_answers";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."quiz_sessions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."raffle_sessions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."rooms";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."participants" TO "anon";
GRANT ALL ON TABLE "public"."participants" TO "authenticated";
GRANT ALL ON TABLE "public"."participants" TO "service_role";



GRANT ALL ON TABLE "public"."poll_sessions" TO "anon";
GRANT ALL ON TABLE "public"."poll_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."poll_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."poll_votes" TO "anon";
GRANT ALL ON TABLE "public"."poll_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."poll_votes" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_answers" TO "anon";
GRANT ALL ON TABLE "public"."quiz_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_answers" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_sessions" TO "anon";
GRANT ALL ON TABLE "public"."quiz_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."raffle_sessions" TO "anon";
GRANT ALL ON TABLE "public"."raffle_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."raffle_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."rooms" TO "anon";
GRANT ALL ON TABLE "public"."rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."rooms" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


  create policy "Allow public access to room-logos 1w8zz5i_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'room-logos'::text));



  create policy "Allow public access to room-logos 1w8zz5i_1"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'room-logos'::text));



  create policy "Allow public access to room-logos 1w8zz5i_2"
  on "storage"."objects"
  as permissive
  for update
  to public
using ((bucket_id = 'room-logos'::text));



