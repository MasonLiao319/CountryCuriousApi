/*
  Warnings:

  - You are about to drop the column `ranking` on the `CountryDetailsCard` table. All the data in the column will be lost.
  - Added the required column `languages` to the `CountryDetailsCard` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CountryDetailsCard" DROP COLUMN "ranking",
ADD COLUMN     "languages" TEXT NOT NULL;
