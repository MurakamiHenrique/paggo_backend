/*
  Warnings:

  - Added the required column `contentType` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "extractedText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("createdAt", "extractedText", "fileName", "fileUrl", "id", "size", "userId", "contentType") 
SELECT 
    "createdAt", 
    "extractedText", 
    "fileName", 
    "fileUrl", 
    "id", 
    "size", 
    "userId",
    CASE 
        WHEN LOWER("fileName") LIKE '%.pdf' THEN 'application/pdf'
        WHEN LOWER("fileName") LIKE '%.jpg' OR LOWER("fileName") LIKE '%.jpeg' THEN 'image/jpeg'
        WHEN LOWER("fileName") LIKE '%.png' THEN 'image/png'
        ELSE 'application/octet-stream'
    END as "contentType"
FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
