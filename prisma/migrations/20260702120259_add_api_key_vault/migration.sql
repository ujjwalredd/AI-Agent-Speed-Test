-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'anthropic',
    "ciphertext" TEXT NOT NULL,
    "last4" TEXT NOT NULL
);
