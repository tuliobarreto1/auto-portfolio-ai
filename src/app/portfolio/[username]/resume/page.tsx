import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { FileText, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResumePageProps {
  params: {
    username: string;
  };
}

export default async function ResumePage({ params }: ResumePageProps) {
  const user = await prisma.user.findFirst({
    where: { username: params.username },
    include: { resume: true },
  });

  if (!user || !user.resume) {
    notFound();
  }

  const fileUrl = user.resume.isEnhanced && user.resume.enhancedFileUrl
    ? user.resume.enhancedFileUrl
    : user.resume.fileUrl;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            {user.displayName || user.username}
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
                  {user.resume.originalFileName}
                </h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Atualizado em{" "}
                    {new Date(user.resume.updatedAt).toLocaleDateString("pt-BR")}
                  </span>
                  {user.resume.isEnhanced && (
                    <span className="text-primary font-medium">
                       
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button asChild>
              <a href={fileUrl} download={user.resume.originalFileName}>
                <Download className="w-4 h-4 mr-2" />
                Baixar Currículo
              </a>
            </Button>
          </div>
        </Card>

        {/* PDF Viewer */}
        {user.resume.fileType === "pdf" ? (
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
              <a href={fileUrl} download={user.resume.originalFileName}>
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
  const user = await prisma.user.findFirst({
    where: { username: params.username },
  });

  if (!user) {
    return {
      title: "Currículo não encontrado",
    };
  }

  return {
    title: `Currículo - ${user.displayName || user.username}`,
    description: `Currículo profissional de ${user.displayName || user.username}`,
  };
}
