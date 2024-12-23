/*
  Warnings:

  - You are about to drop the column `contentName` on the `FileMetadata` table. All the data in the column will be lost.
  - Added the required column `contentId` to the `FileMetadata` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FileMetadata" DROP COLUMN "contentName",
ADD COLUMN     "contentId" TEXT NOT NULL;
