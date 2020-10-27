CREATE TABLE "public"."users" (
    "id" serial,
    "name" varchar(50) NOT NULL,
    "created_at" TIMESTAMP,
    PRIMARY KEY ("id")
);
