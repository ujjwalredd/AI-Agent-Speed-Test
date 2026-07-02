-- CreateTable
CREATE TABLE "BenchmarkRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modelName" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "runsPerTask" INTEGER NOT NULL,
    "overallScore" REAL NOT NULL,
    "speedScore" REAL NOT NULL,
    "accuracyScore" REAL NOT NULL,
    "qualityScore" REAL NOT NULL,
    "reliabilityScore" REAL NOT NULL,
    "consistencyScore" REAL NOT NULL,
    "costScore" REAL NOT NULL,
    "totalCostUsd" REAL NOT NULL,
    "totalInputTok" INTEGER NOT NULL,
    "totalOutputTok" INTEGER NOT NULL,
    "avgTtftMs" REAL NOT NULL,
    "avgTokensPerSec" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "TaskResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "ttftMs" REAL NOT NULL,
    "totalMs" REAL NOT NULL,
    "tokensPerSec" REAL NOT NULL,
    "inputTok" INTEGER NOT NULL,
    "outputTok" INTEGER NOT NULL,
    "costUsd" REAL NOT NULL,
    "qualityScore" REAL NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMsg" TEXT,
    CONSTRAINT "TaskResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "BenchmarkRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TaskResult_runId_idx" ON "TaskResult"("runId");
