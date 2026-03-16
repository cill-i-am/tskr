CREATE SCHEMA IF NOT EXISTS "auth";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "app";
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."user" SET SCHEMA "auth";
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."account" SET SCHEMA "auth";
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."session" SET SCHEMA "auth";
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."verification" SET SCHEMA "auth";
