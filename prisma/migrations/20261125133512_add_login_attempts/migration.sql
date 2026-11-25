-- CreateTable
CREATE TABLE "LoginAttempt" (
    "sessionId" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "failures" INTEGER NOT NULL,
    "lastFailureAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("sessionId","client")
);

-- AddForeignKey
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
