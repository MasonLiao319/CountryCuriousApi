-- CreateTable
CREATE TABLE "Users" (
    "userId" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nickName" TEXT,
    "region" TEXT,
    "age" INTEGER,
    "avatarURL" TEXT,
    "backgroundURL" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "settingId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("settingId")
);

-- CreateTable
CREATE TABLE "SavedCountries" (
    "savedCountryId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "countryId" INTEGER NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedCountries_pkey" PRIMARY KEY ("savedCountryId")
);

-- CreateTable
CREATE TABLE "SavedQuizzes" (
    "savedQuizId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedQuizzes_pkey" PRIMARY KEY ("savedQuizId")
);

-- CreateTable
CREATE TABLE "CountryDetailsCard" (
    "countryId" SERIAL NOT NULL,
    "countryName" TEXT NOT NULL,
    "flagURL" TEXT NOT NULL,
    "startOfWeek" TEXT NOT NULL,
    "currencySymbol" TEXT NOT NULL,
    "governmentType" TEXT NOT NULL,
    "ranking" TEXT NOT NULL,
    "additionalInfo" TEXT,

    CONSTRAINT "CountryDetailsCard_pkey" PRIMARY KEY ("countryId")
);

-- CreateTable
CREATE TABLE "QuizQuestionsCard" (
    "questionId" SERIAL NOT NULL,
    "countryId" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,

    CONSTRAINT "QuizQuestionsCard_pkey" PRIMARY KEY ("questionId")
);

-- CreateTable
CREATE TABLE "VerificationCodes" (
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationCodes_pkey" PRIMARY KEY ("email")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CountryDetailsCard_countryName_key" ON "CountryDetailsCard"("countryName");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedCountries" ADD CONSTRAINT "SavedCountries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedCountries" ADD CONSTRAINT "SavedCountries_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "CountryDetailsCard"("countryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedQuizzes" ADD CONSTRAINT "SavedQuizzes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedQuizzes" ADD CONSTRAINT "SavedQuizzes_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestionsCard"("questionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestionsCard" ADD CONSTRAINT "QuizQuestionsCard_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "CountryDetailsCard"("countryId") ON DELETE RESTRICT ON UPDATE CASCADE;
