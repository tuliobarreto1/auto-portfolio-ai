"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Sparkles, Trash2, Download, Eye } from "lucide-react";

interface ResumeData {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  enhancedFileUrl?: string;
  isEnhanced: boolean;
  createdAt: string;
  updatedAt: string;
}

export function ResumeUpload() {
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar currículo existente
  useEffect(() => {
    loadResume();
  }, []);

  const loadResume = async () => {
    try {
      const res = await fetch("/api/resume/upload");
      const data = await res.json();
      if (data.resume) {
        setResume(data.resume);
      }
    } catch (error) {
      console.error("Erro ao carregar currículo:", error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Apenas arquivos PDF ou DOCX são permitidos");
      return;
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 10MB");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setResume(data.resume);
      alert("Currículo enviado com sucesso!");
    } catch (error: any) {
      alert(error.message || "Erro ao enviar currículo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleEnhance = async () => {
    if (!resume) return;

    setEnhancing(true);
    try {
      const res = await fetch("/api/resume/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (resume.fileType === "pdf") {
        // Recarregar dados do currículo
        await loadResume();
        alert("Currículo aprimorado com sucesso!");
      } else {
        // Para DOCX, mostrar sugestões
        alert(
          `Sugestões da IA:\n\nHabilidades: ${data.suggestions.skills.join(", ")}\n\nExperiência: ${data.suggestions.experience.join("\n")}\n\nDestaques: ${data.suggestions.highlights.join("\n")}`
        );
      }
    } catch (error: any) {
      alert(error.message || "Erro ao aprimorar currículo");
    } finally {
      setEnhancing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir o currículo?")) return;

    try {
      const res = await fetch("/api/resume/upload", {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setResume(null);
      alert("Currículo excluído com sucesso!");
    } catch (error: any) {
      alert(error.message || "Erro ao excluir currículo");
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Currículo
          </h3>
        </div>

        {!resume ? (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Envie seu currículo em PDF ou DOCX
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Enviando..." : "Selecionar Arquivo"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 mt-1 text-primary" />
                <div>
                  <p className="font-medium">{resume.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {resume.fileType.toUpperCase()} •{" "}
                    {resume.isEnhanced ? "Aprimorado pela IA" : "Original"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  window.open(
                    resume.isEnhanced && resume.enhancedFileUrl
                      ? resume.enhancedFileUrl
                      : resume.fileUrl,
                    "_blank"
                  )
                }
              >
                <Eye className="w-4 h-4 mr-2" />
                Visualizar
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href =
                    resume.isEnhanced && resume.enhancedFileUrl
                      ? resume.enhancedFileUrl
                      : resume.fileUrl;
                  link.download = resume.fileName;
                  link.click();
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar
              </Button>

              <Button
                onClick={handleEnhance}
                disabled={enhancing}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {enhancing
                  ? "Aprimorando..."
                  : resume.isEnhanced
                  ? "Aprimorar Novamente"
                  : "Aprimorar com IA"}
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Enviando..." : "Substituir Arquivo"}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>
                • Envie seu currículo e escolha se quer salvá-lo como está ou
                aprimorá-lo com IA
              </p>
              <p>
                • A IA analisará seus projetos do GitHub e adicionará informações
                relevantes
              </p>
              <p>
                • O currículo será exibido em seu portfólio público em uma página
                dedicada
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
