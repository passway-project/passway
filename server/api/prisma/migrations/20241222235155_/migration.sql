/*
  Warnings:

  - Added the required column `contentName` to the `FileMetadata` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FileMetadata" ADD COLUMN     "contentName" TEXT NOT NULL;
