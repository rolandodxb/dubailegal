-- A new post waits for a moderator. Kept in a migration of its own because
-- PostgreSQL will not let a transaction both add an enum value and use it:
-- the value has to be committed before anything may reference it.
ALTER TABLE "blog_post" ALTER COLUMN "status" SET DEFAULT 'PENDING';
