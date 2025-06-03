PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "extractedText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Document" ("id", "userId", "fileUrl", "fileName", "size", "extractedText", "createdAt")
SELECT "id", "userId", "fileUrl", "fileName", 0, "extractedText", "createdAt"
FROM "Document";

DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;