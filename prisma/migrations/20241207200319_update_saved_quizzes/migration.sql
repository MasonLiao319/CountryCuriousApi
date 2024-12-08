/*
  Warnings:

  - A unique constraint covering the columns `[userId,questionId]` on the table `SavedQuizzes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SavedQuizzes_userId_questionId_key" ON "SavedQuizzes"("userId", "questionId");
