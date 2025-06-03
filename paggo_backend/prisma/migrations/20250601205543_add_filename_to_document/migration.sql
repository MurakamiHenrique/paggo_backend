/*
  Warnings:

  - Added the required column `fileName` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Create new table with fileName column
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL DEFAULT 'Untitled Document',  -- Add default value
    "extractedText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Copy existing data with default fileName
INSERT INTO "new_Document" ("id", "userId", "fileUrl", "fileName", "extractedText", "createdAt")
SELECT "id", "userId", "fileUrl", 'Untitled Document', "extractedText", "createdAt"
FROM "Document";

-- Drop old table and rename new one
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
