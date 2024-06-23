-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "passkeyId" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_passkeyId_key" ON "User"("passkeyId");
