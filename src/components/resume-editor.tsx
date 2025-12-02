"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ExternalLink } from "lucide-react";

interface ResumeEditorProps {
  resumeId: string;
  onClose: () => void;
}

export function ResumeEditor({ resumeId, onClose }: ResumeEditorProps) {
  const handleOpenEditor = () => {
    // Redirecionar para a página de edição estruturada
    window.location.href = "/edit-resume-structured";
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">Editar Currículo</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Editor de Currículo Estruturado</h3>
            <p className="text-sm text-muted-foreground">
              Seu currículo será convertido em um formato estruturado e editável.
              Você poderá editar todas as seções facilmente e o sistema gerará
              um novo PDF profissional.
            </p>
            <Button onClick={handleOpenEditor} className="w-full gap-2">
              <ExternalLink className="w-4 h-4" />
              Abrir Editor
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-semibold mb-2">
              ✨ Como funciona:
            </p>
            <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
              <li>Extraímos o texto do seu PDF</li>
              <li>A IA organiza em seções editáveis</li>
              <li>Você edita facilmente cada campo</li>
              <li>Geramos um novo PDF formatado</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </Card>
    </div>
  );
}
