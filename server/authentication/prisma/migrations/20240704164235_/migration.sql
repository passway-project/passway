/*
  Warnings:

  - Added the required column `keyData` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "keyData" TEXT NOT NULL;
