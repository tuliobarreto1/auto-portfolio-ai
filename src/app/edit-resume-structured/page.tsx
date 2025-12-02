"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Loader2, Plus, Trash2, Sparkles, X, ArrowUp, ArrowDown } from "lucide-react";
import { useRouter } from "next/navigation";
import type { StructuredResume } from "../api/resume/parse/route";
import { Select } from "@/components/ui/select";
import { sortExperiencesByDate } from "@/lib/resume-templates";

export default function EditResumeStructuredPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resumeData, setResumeData] = useState<StructuredResume | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("classic");
  const [enhancingField, setEnhancingField] = useState<string | null>(null);
  const [suggestingSkills, setSuggestingSkills] = useState(false);

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

      // Ordenar experiências do mais recente ao mais antigo
      const structuredData = data.structured;
      if (structuredData.experiencias && structuredData.experiencias.length > 0) {
        structuredData.experiencias = sortExperiencesByDate(structuredData.experiencias);
      }

      setResumeData(structuredData);
    } catch (error: any) {
      alert(error.message || "Erro ao carregar currículo");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleEnhanceText = async (
    text: string,
    fieldType: string,
    fieldId: string,
    onUpdate: (enhancedText: string) => void
  ) => {
    if (!text.trim()) {
      alert("O campo está vazio. Digite algo para aprimorar.");
      return;
    }

    setEnhancingField(fieldId);
    try {
      const res = await fetch("/api/resume/enhance-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fieldType }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      onUpdate(data.enhancedText);
    } catch (error: any) {
      alert(error.message || "Erro ao aprimorar texto");
    } finally {
      setEnhancingField(null);
    }
  };

  const handleSuggestSkills = async () => {
    setSuggestingSkills(true);
    try {
      const res = await fetch("/api/resume/suggest-skills", {
        method: "POST",
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.skills && data.skills.length > 0) {
        // Normalizar habilidades existentes para objetos
        const existingSkills = resumeData!.habilidades.tecnicas.map(skill =>
          typeof skill === "string" ? { name: skill, level: "Intermediário" } : skill
        );

        // Criar mapa de habilidades existentes por nome (case-insensitive)
        const existingSkillsMap = new Map(
          existingSkills.map(skill => [skill.name.toLowerCase(), skill])
        );

        // Adicionar apenas habilidades novas (evitar duplicatas)
        const newSkills = data.skills.filter(
          (skill: { name: string; level: string }) =>
            !existingSkillsMap.has(skill.name.toLowerCase())
        );

        // Combinar habilidades existentes com as novas
        const combinedSkills = [...existingSkills, ...newSkills];

        setResumeData({
          ...resumeData!,
          habilidades: {
            ...resumeData!.habilidades,
            tecnicas: combinedSkills,
          },
          showSkillLevels: true,
        });

        if (newSkills.length > 0) {
          alert(
            `${newSkills.length} nova(s) habilidade(s) adicionada(s) com base em ${data.projectsAnalyzed} projeto(s)!\n` +
            `${existingSkills.length} habilidade(s) existente(s) foram mantidas.`
          );
        } else {
          alert(
            `Nenhuma habilidade nova foi adicionada. Todas as ${data.skills.length} habilidades sugeridas já estão no currículo.`
          );
        }
      } else {
        alert("Nenhuma habilidade foi sugerida. Verifique se você tem projetos selecionados.");
      }
    } catch (error: any) {
      alert(error.message || "Erro ao sugerir habilidades");
    } finally {
      setSuggestingSkills(false);
    }
  };

  const moveExperienceUp = (index: number) => {
    if (index === 0) return; // Já está no topo
    const newExperiences = [...resumeData!.experiencias];
    [newExperiences[index - 1], newExperiences[index]] = [newExperiences[index], newExperiences[index - 1]];
    setResumeData({
      ...resumeData!,
      experiencias: newExperiences,
    });
  };

  const moveExperienceDown = (index: number) => {
    if (index === resumeData!.experiencias.length - 1) return; // Já está no final
    const newExperiences = [...resumeData!.experiencias];
    [newExperiences[index], newExperiences[index + 1]] = [newExperiences[index + 1], newExperiences[index]];
    setResumeData({
      ...resumeData!,
      experiencias: newExperiences,
    });
  };

  const handleSave = async () => {
    if (!resumeData) return;

    setSaving(true);
    try {
      const res = await fetch("/api/resume/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData, templateType: selectedTemplate }),
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
          {/* Seletor de Template */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Escolha o Template</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Selecione o estilo visual do seu currículo
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { id: 'classic', name: 'Clássico', desc: 'Simples e direto' },
                { id: 'modern', name: 'Moderno', desc: 'Com sidebar colorida' },
                { id: 'minimal', name: 'Minimalista', desc: 'Clean e elegante' },
                { id: 'professional', name: 'Profissional', desc: 'Formal e corporativo' },
              ].map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedTemplate === template.id
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <div className="font-semibold text-sm">{template.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {template.desc}
                  </div>
                </button>
              ))}
            </div>
          </Card>

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Resumo Profissional</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleEnhanceText(
                    resumeData.resumoProfissional,
                    "resumoProfissional",
                    "resumoProfissional",
                    (enhanced) =>
                      setResumeData({ ...resumeData, resumoProfissional: enhanced })
                  )
                }
                disabled={enhancingField === "resumoProfissional"}
              >
                {enhancingField === "resumoProfissional" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </Button>
            </div>
            <Textarea
              value={resumeData.resumoProfissional}
              onChange={(e) =>
                setResumeData({ ...resumeData, resumoProfissional: e.target.value })
              }
              rows={4}
              placeholder="Descreva sua experiência e objetivos profissionais..."
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
              {resumeData.experiencias.map((exp, index) => {
                return (
                  <Card key={index} className="p-4 bg-muted/30">
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-sm font-semibold">
                        Experiência #{index + 1}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveExperienceUp(index)}
                          disabled={index === 0}
                          className="h-8 w-8"
                          title="Mover para cima"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveExperienceDown(index)}
                          disabled={index === resumeData.experiencias.length - 1}
                          className="h-8 w-8"
                          title="Mover para baixo"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setResumeData({
                              ...resumeData,
                              experiencias: resumeData.experiencias.filter(
                                (_, i) => i !== index
                              ),
                            })
                          }
                          className="h-8 w-8 text-destructive"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  <div className="grid gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs">Cargo</Label>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() =>
                            handleEnhanceText(
                              exp.cargo,
                              "cargo",
                              `cargo-${index}`,
                              (enhanced) => {
                                const newExp = [...resumeData.experiencias];
                                newExp[index].cargo = enhanced;
                                setResumeData({ ...resumeData, experiencias: newExp });
                              }
                            )
                          }
                          disabled={enhancingField === `cargo-${index}`}
                        >
                          {enhancingField === `cargo-${index}` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                      <Input
                        value={exp.cargo}
                        onChange={(e) => {
                          const newExp = [...resumeData.experiencias];
                          newExp[index].cargo = e.target.value;
                          setResumeData({ ...resumeData, experiencias: newExp });
                        }}
                        placeholder="Ex: Desenvolvedor Full Stack"
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
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs">Descrição</Label>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() =>
                            handleEnhanceText(
                              exp.descricao,
                              "descricao",
                              `descricao-${index}`,
                              (enhanced) => {
                                const newExp = [...resumeData.experiencias];
                                newExp[index].descricao = enhanced;
                                setResumeData({ ...resumeData, experiencias: newExp });
                              }
                            )
                          }
                          disabled={enhancingField === `descricao-${index}`}
                        >
                          {enhancingField === `descricao-${index}` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                      <Textarea
                        value={exp.descricao}
                        onChange={(e) => {
                          const newExp = [...resumeData.experiencias];
                          newExp[index].descricao = e.target.value;
                          setResumeData({ ...resumeData, experiencias: newExp });
                        }}
                        rows={2}
                        placeholder="Descreva suas principais realizações e responsabilidades..."
                      />
                    </div>
                  </div>
                </Card>
              );
              })}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Habilidades</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSuggestSkills}
                disabled={suggestingSkills}
                className="gap-2"
              >
                {suggestingSkills ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {suggestingSkills ? "Analisando projetos..." : "Sugerir Habilidades"}
              </Button>
            </div>
            <div className="space-y-4">
              {/* Habilidades Técnicas com Níveis */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Habilidades Técnicas</Label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={resumeData.showSkillLevels !== false}
                      onChange={(e) =>
                        setResumeData({
                          ...resumeData,
                          showSkillLevels: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <span className="text-muted-foreground">
                      Exibir níveis no currículo
                    </span>
                  </label>
                </div>

                {/* Lista de habilidades */}
                <div className="space-y-2">
                  {(() => {
                    // Normalizar para sempre trabalhar com objetos
                    const skills = resumeData.habilidades.tecnicas.map((skill) =>
                      typeof skill === "string" ? { name: skill, level: "Intermediário" } : skill
                    );

                    return skills.map((skill, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={skill.name}
                          onChange={(e) => {
                            const newSkills = [...skills];
                            newSkills[index] = { ...skill, name: e.target.value };
                            setResumeData({
                              ...resumeData,
                              habilidades: {
                                ...resumeData.habilidades,
                                tecnicas: newSkills,
                              },
                            });
                          }}
                          placeholder="Nome da habilidade"
                          className="flex-1"
                        />
                        <Select
                          value={skill.level || "Intermediário"}
                          onChange={(e) => {
                            const newSkills = [...skills];
                            newSkills[index] = { ...skill, level: e.target.value };
                            setResumeData({
                              ...resumeData,
                              habilidades: {
                                ...resumeData.habilidades,
                                tecnicas: newSkills,
                              },
                            });
                          }}
                          className="w-40"
                        >
                          <option value="Básico">Básico</option>
                          <option value="Intermediário">Intermediário</option>
                          <option value="Avançado">Avançado</option>
                          <option value="Expert">Expert</option>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newSkills = skills.filter((_, i) => i !== index);
                            setResumeData({
                              ...resumeData,
                              habilidades: {
                                ...resumeData.habilidades,
                                tecnicas: newSkills,
                              },
                            });
                          }}
                          className="text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ));
                  })()}
                </div>

                {/* Botão Adicionar Habilidade */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const skills = resumeData.habilidades.tecnicas.map((skill) =>
                      typeof skill === "string" ? { name: skill, level: "Intermediário" } : skill
                    );
                    setResumeData({
                      ...resumeData,
                      habilidades: {
                        ...resumeData.habilidades,
                        tecnicas: [...skills, { name: "", level: "Intermediário" }],
                      },
                    });
                  }}
                  className="mt-2 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Habilidade
                </Button>
              </div>

              {/* Idiomas */}
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
