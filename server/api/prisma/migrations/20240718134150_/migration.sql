-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "passkeyId" TEXT NOT NULL,
    "encryptedKeys" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_passkeyId_key" ON "User"("passkeyId");
