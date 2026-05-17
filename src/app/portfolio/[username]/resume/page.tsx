import { notFound } from "next/navigation";
import { serviceClient } from "@/lib/infraforge";
import { getProfileByUsername, getResume } from "@/lib/db";
import { presignedUrl } from "@/lib/storage";
import { Card } from "@/components/ui/card";
import { FileText, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResumePageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function ResumePage({ params }: ResumePageProps) {
  const resolvedParams = await params;
  const username = decodeURIComponent(resolvedParams.username);

  const client = await serviceClient();
  const profile = await getProfileByUsername(client, username);
  if (!profile) {
    notFound();
  }

  const resume = await getResume(client, profile.id);
  if (!resume) {
    notFound();
  }

  const fileKey =
    resume.isEnhanced && resume.enhancedFileUrl
      ? resume.enhancedFileUrl
      : resume.fileUrl;
  const fileUrl = await presignedUrl(fileKey);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            {profile.displayName || profile.username}
          </h1>
          <p className="text-muted-foreground">Currículo Profissional</p>
        </div>

        {/* Resume Info Card */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <h2 className="font-semibold text-lg">
                  {resume.originalFileName}
                </h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Atualizado em{" "}
                    {new Date(resume.updatedAt).toLocaleDateString("pt-BR")}
                  </span>
                  {resume.isEnhanced && (
                    <span className="text-primary font-medium">

                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button asChild>
              <a href={fileUrl} download={resume.originalFileName}>
                <Download className="w-4 h-4 mr-2" />
                Baixar Currículo
              </a>
            </Button>
          </div>
        </Card>

        {/* PDF Viewer */}
        {resume.fileType === "pdf" ? (
          <Card className="p-0 overflow-hidden">
            <iframe
              src={fileUrl}
              className="w-full h-[calc(100vh-300px)] min-h-[800px]"
              title="Currículo"
            />
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              Currículo em formato DOCX
            </h3>
            <p className="text-muted-foreground mb-6">
              Clique no botão acima para baixar e visualizar o currículo
            </p>
            <Button asChild size="lg">
              <a href={fileUrl} download={resume.originalFileName}>
                <Download className="w-5 h-5 mr-2" />
                Baixar Currículo
              </a>
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: ResumePageProps) {
  const resolvedParams = await params;
  const username = decodeURIComponent(resolvedParams.username);

  const profile = await getProfileByUsername(await serviceClient(), username);

  if (!profile) {
    return {
      title: "Currículo não encontrado",
    };
  }

  const name = profile.displayName || profile.username;
  return {
    title: `Currículo - ${name}`,
    description: `Currículo profissional de ${name}`,
  };
}
