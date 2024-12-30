/*
  Warnings:

  - You are about to drop the column `isEncrypted` on the `FileMetadata` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FileMetadata" DROP COLUMN "isEncrypted";
