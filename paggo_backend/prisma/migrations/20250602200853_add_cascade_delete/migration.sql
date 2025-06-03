-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LLMInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LLMInteraction_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LLMInteraction" ("createdAt", "documentId", "id", "prompt", "response") SELECT "createdAt", "documentId", "id", "prompt", "response" FROM "LLMInteraction";
DROP TABLE "LLMInteraction";
ALTER TABLE "new_LLMInteraction" RENAME TO "LLMInteraction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
