/*
  Warnings:

  - You are about to drop the column `keyData` on the `User` table. All the data in the column will be lost.
  - Added the required column `encryptedKeys` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicKey` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "keyData",
ADD COLUMN     "encryptedKeys" TEXT NOT NULL,
ADD COLUMN     "publicKey" TEXT NOT NULL;
