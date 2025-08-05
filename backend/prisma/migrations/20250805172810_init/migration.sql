-- CreateTable
CREATE TABLE "public"."links" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "url" TEXT NOT NULL,
    "domain" VARCHAR(255) NOT NULL DEFAULT 'localhost:8001',
    "utm_source" VARCHAR(255),
    "utm_medium" VARCHAR(255),
    "utm_campaign" VARCHAR(255),
    "utm_term" VARCHAR(255),
    "utm_content" VARCHAR(255),
    "description" TEXT,
    "tags" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "links_slug_key" ON "public"."links"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "public"."settings"("key");
