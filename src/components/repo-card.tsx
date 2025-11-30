import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Lock, Globe, ExternalLink } from "lucide-react";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { Input } from "@/components/ui/input";
import { Repository } from "@/lib/store";
import { ScreenRecorder } from "@/components/screen-recorder";

interface RepoCardProps {
    repo: Repository;
    isSelected: boolean;
    onToggle: () => void;
    onAnalyze: () => void;
    onClear: () => void;
    objective?: string;
    onObjectiveChange: (val: string) => void;
    features?: string;
    onFeaturesChange: (val: string) => void;
    technicalSummary?: string;
    onTechnicalSummaryChange: (val: string) => void;
    demoUrl?: string;
    onDemoUrlChange: (val: string) => void;
    isAnalyzing: boolean;
}

export function RepoCard({
    repo, isSelected, onToggle, onAnalyze, onClear,
    objective, onObjectiveChange,
    features, onFeaturesChange,
    technicalSummary, onTechnicalSummaryChange,
    isAnalyzing, demoUrl, onDemoUrlChange
}: RepoCardProps) {
    return (
        <Card className={`transition-all ${isSelected ? 'border-primary ring-1 ring-primary' : ''}`}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                            <a href={repo.html_url} target="_blank" rel="noreferrer" className="hover:underline">
                                {repo.name}
                            </a>
                            {repo.language && <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{repo.language}</span>}
                            {repo.private ? (
                                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 flex items-center gap-1">
                                    <Lock className="w-3 h-3" /> Privado
                                </span>
                            ) : (
                                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-500 flex items-center gap-1">
                                    <Globe className="w-3 h-3" /> Público
                                </span>
                            )}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">{repo.description}</CardDescription>
                    </div>
                    <Button variant={isSelected ? "default" : "outline"} size="sm" onClick={onToggle}>
                        {isSelected ? "Selecionado" : "Selecionar"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1"><Star className="w-4 h-4" /> {repo.stargazers_count}</div>
                    <div className="flex items-center gap-1">Atualizado em {new Date(repo.updated_at).toLocaleDateString('pt-BR')}</div>
                </div>

                {isSelected && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex gap-2">
                            <Button size="sm" onClick={onAnalyze} disabled={isAnalyzing}>
                                {isAnalyzing ? "Analisando..." : "Gerar Análise com IA"}
                            </Button>
                            {(objective || features || technicalSummary) && (
                                <Button size="sm" variant="outline" onClick={onClear}>
                                    Limpar Resumos
                                </Button>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Objetivo da Aplicação</label>
                            <AutoResizeTextarea
                                value={objective || ""}
                                onChange={(e) => onObjectiveChange(e.target.value)}
                                placeholder="Qual é o propósito da aplicação? Que problema ela resolve?"
                                className="min-h-[60px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Funcionalidades</label>
                            <AutoResizeTextarea
                                value={features || ""}
                                onChange={(e) => onFeaturesChange(e.target.value)}
                                placeholder="Principais funcionalidades da aplicação..."
                                className="min-h-[60px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Resumo Técnico</label>
                            <AutoResizeTextarea
                                value={technicalSummary || ""}
                                onChange={(e) => onTechnicalSummaryChange(e.target.value)}
                                placeholder="Stack tecnológica, arquitetura e aspectos técnicos..."
                                className="min-h-[60px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Link do GitHub</label>
                            <div className="flex gap-2">
                                <Input
                                    value={repo.html_url}
                                    readOnly
                                    className="bg-muted cursor-default"
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    asChild
                                >
                                    <a href={repo.html_url} target="_blank" rel="noreferrer" className="gap-1">
                                        <ExternalLink className="w-4 h-4" />
                                        Abrir
                                    </a>
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Link da Demo</label>
                            <Input
                                value={demoUrl || ""}
                                onChange={(e) => onDemoUrlChange(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>

                        <ScreenRecorder
                            repoId={repo.id}
                            onRecordingComplete={(blob, url) => {
                                console.log("Gravação completa:", { blob, url });
                            }}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
