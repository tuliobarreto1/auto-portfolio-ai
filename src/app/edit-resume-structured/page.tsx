"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { StructuredResume } from "../api/resume/parse/route";

export default function EditResumeStructuredPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resumeData, setResumeData] = useState<StructuredResume | null>(null);

  useEffect(() => {
    loadAndParseResume();
  }, []);

  const loadAndParseResume = async () => {
    try {
      const res = await fetch("/api/resume/parse");
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResumeData(data.structured);
    } catch (error: any) {
      alert(error.message || "Erro ao carregar currículo");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!resumeData) return;

    setSaving(true);
    try {
      const res = await fetch("/api/resume/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      alert("Currículo atualizado com sucesso!");
      router.push("/dashboard");
    } catch (error: any) {
      alert(error.message || "Erro ao salvar currículo");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !resumeData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Editor de Currículo</h1>
                <p className="text-sm text-muted-foreground">
                  Edite as informações e salve para gerar um novo PDF
                </p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar e Gerar PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-6">
          {/* Informações Pessoais */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Informações Pessoais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo</Label>
                <Input
                  value={resumeData.personalInfo.nome}
                  onChange={(e) =>
                    setResumeData({
                      ...resumeData,
                      personalInfo: { ...resumeData.personalInfo, nome: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={resumeData.personalInfo.email}
                  onChange={(e) =>
                    setResumeData({
                      ...resumeData,
                      personalInfo: { ...resumeData.personalInfo, email: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={resumeData.personalInfo.telefone}
                  onChange={(e) =>
                    setResumeData({
                      ...resumeData,
                      personalInfo: { ...resumeData.personalInfo, telefone: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>LinkedIn</Label>
                <Input
                  value={resumeData.personalInfo.linkedin}
                  onChange={(e) =>
                    setResumeData({
                      ...resumeData,
                      personalInfo: { ...resumeData.personalInfo, linkedin: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>GitHub</Label>
                <Input
                  value={resumeData.personalInfo.github}
                  onChange={(e) =>
                    setResumeData({
                      ...resumeData,
                      personalInfo: { ...resumeData.personalInfo, github: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </Card>

          {/* Resumo Profissional */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Resumo Profissional</h2>
            <Textarea
              value={resumeData.resumoProfissional}
              onChange={(e) =>
                setResumeData({ ...resumeData, resumoProfissional: e.target.value })
              }
              rows={4}
            />
          </Card>

          {/* Experiências */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Experiências Profissionais</h2>
              <Button
                size="sm"
                onClick={() =>
                  setResumeData({
                    ...resumeData,
                    experiencias: [
                      ...resumeData.experiencias,
                      {
                        cargo: "",
                        empresa: "",
                        periodo: "",
                        descricao: "",
                        responsabilidades: [],
                      },
                    ],
                  })
                }
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-4">
              {resumeData.experiencias.map((exp, index) => (
                <Card key={index} className="p-4 bg-muted/30">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-sm font-semibold">
                      Experiência #{index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setResumeData({
                          ...resumeData,
                          experiencias: resumeData.experiencias.filter(
                            (_, i) => i !== index
                          ),
                        })
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3">
                    <div>
                      <Label className="text-xs">Cargo</Label>
                      <Input
                        value={exp.cargo}
                        onChange={(e) => {
                          const newExp = [...resumeData.experiencias];
                          newExp[index].cargo = e.target.value;
                          setResumeData({ ...resumeData, experiencias: newExp });
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Empresa</Label>
                        <Input
                          value={exp.empresa}
                          onChange={(e) => {
                            const newExp = [...resumeData.experiencias];
                            newExp[index].empresa = e.target.value;
                            setResumeData({ ...resumeData, experiencias: newExp });
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Período</Label>
                        <Input
                          value={exp.periodo}
                          onChange={(e) => {
                            const newExp = [...resumeData.experiencias];
                            newExp[index].periodo = e.target.value;
                            setResumeData({ ...resumeData, experiencias: newExp });
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Descrição</Label>
                      <Textarea
                        value={exp.descricao}
                        onChange={(e) => {
                          const newExp = [...resumeData.experiencias];
                          newExp[index].descricao = e.target.value;
                          setResumeData({ ...resumeData, experiencias: newExp });
                        }}
                        rows={2}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          {/* Educação */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Educação</h2>
              <Button
                size="sm"
                onClick={() =>
                  setResumeData({
                    ...resumeData,
                    educacao: [
                      ...resumeData.educacao,
                      {
                        curso: "",
                        instituicao: "",
                        periodo: "",
                        descricao: "",
                      },
                    ],
                  })
                }
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-4">
              {resumeData.educacao.map((edu, index) => (
                <Card key={index} className="p-4 bg-muted/30">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-sm font-semibold">
                      Educação #{index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setResumeData({
                          ...resumeData,
                          educacao: resumeData.educacao.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3">
                    <div>
                      <Label className="text-xs">Curso</Label>
                      <Input
                        value={edu.curso}
                        onChange={(e) => {
                          const newEdu = [...resumeData.educacao];
                          newEdu[index].curso = e.target.value;
                          setResumeData({ ...resumeData, educacao: newEdu });
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Instituição</Label>
                        <Input
                          value={edu.instituicao}
                          onChange={(e) => {
                            const newEdu = [...resumeData.educacao];
                            newEdu[index].instituicao = e.target.value;
                            setResumeData({ ...resumeData, educacao: newEdu });
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Período</Label>
                        <Input
                          value={edu.periodo}
                          onChange={(e) => {
                            const newEdu = [...resumeData.educacao];
                            newEdu[index].periodo = e.target.value;
                            setResumeData({ ...resumeData, educacao: newEdu });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          {/* Habilidades */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Habilidades</h2>
            <div className="space-y-4">
              <div>
                <Label>Habilidades Técnicas (separadas por vírgula)</Label>
                <Textarea
                  value={resumeData.habilidades.tecnicas.join(", ")}
                  onChange={(e) =>
                    setResumeData({
                      ...resumeData,
                      habilidades: {
                        ...resumeData.habilidades,
                        tecnicas: e.target.value.split(",").map((s) => s.trim()),
                      },
                    })
                  }
                  rows={3}
                />
              </div>
              <div>
                <Label>Idiomas (separados por vírgula)</Label>
                <Input
                  value={resumeData.habilidades.idiomas.join(", ")}
                  onChange={(e) =>
                    setResumeData({
                      ...resumeData,
                      habilidades: {
                        ...resumeData.habilidades,
                        idiomas: e.target.value.split(",").map((s) => s.trim()),
                      },
                    })
                  }
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
