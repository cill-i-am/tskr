DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_publication_tables
		WHERE pubname = 'electric_publication_default'
			AND schemaname = 'auth'
			AND tablename = 'user'
	) THEN
		ALTER PUBLICATION "electric_publication_default"
			DROP TABLE "auth"."user";
	END IF;
END
$$;
--> statement-breakpoint
ALTER TABLE "auth"."user" REPLICA IDENTITY DEFAULT;
