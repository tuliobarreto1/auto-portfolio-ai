-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "fileName" TEXT NOT NULL DEFAULT 'resume.pdf',
ADD COLUMN     "templateType" TEXT NOT NULL DEFAULT 'classic';
