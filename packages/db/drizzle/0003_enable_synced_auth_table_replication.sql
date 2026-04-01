DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_publication
		WHERE pubname = 'electric_publication_default'
	) THEN
		CREATE PUBLICATION "electric_publication_default";
	END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_publication_tables
		WHERE pubname = 'electric_publication_default'
			AND schemaname = 'auth'
			AND tablename = 'organization'
	) THEN
		ALTER PUBLICATION "electric_publication_default"
			ADD TABLE "auth"."organization";
	END IF;
END
$$;
--> statement-breakpoint
ALTER TABLE "auth"."organization" REPLICA IDENTITY FULL;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_publication_tables
		WHERE pubname = 'electric_publication_default'
			AND schemaname = 'auth'
			AND tablename = 'member'
	) THEN
		ALTER PUBLICATION "electric_publication_default"
			ADD TABLE "auth"."member";
	END IF;
END
$$;
--> statement-breakpoint
ALTER TABLE "auth"."member" REPLICA IDENTITY FULL;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_publication_tables
		WHERE pubname = 'electric_publication_default'
			AND schemaname = 'auth'
			AND tablename = 'invitation'
	) THEN
		ALTER PUBLICATION "electric_publication_default"
			ADD TABLE "auth"."invitation";
	END IF;
END
$$;
--> statement-breakpoint
ALTER TABLE "auth"."invitation" REPLICA IDENTITY FULL;
