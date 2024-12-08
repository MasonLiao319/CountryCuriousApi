/*
  Warnings:

  - You are about to drop the column `governmentType` on the `CountryDetailsCard` table. All the data in the column will be lost.
  - You are about to drop the column `startOfWeek` on the `CountryDetailsCard` table. All the data in the column will be lost.
  - Added the required column `capital` to the `CountryDetailsCard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `region` to the `CountryDetailsCard` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CountryDetailsCard" DROP COLUMN "governmentType",
DROP COLUMN "startOfWeek",
ADD COLUMN     "capital" TEXT NOT NULL,
ADD COLUMN     "region" TEXT NOT NULL;
