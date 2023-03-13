CREATE TABLE "public"."animals" (
    "id" serial,
    "name" varchar(50) NOT NULL,
    PRIMARY KEY ("id")
);
CREATE EXTENSION IF NOT EXISTS pgcrypto;
