/*
  Warnings:

  - A unique constraint covering the columns `[userId,countryId]` on the table `SavedCountries` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SavedCountries_userId_countryId_key" ON "SavedCountries"("userId", "countryId");
