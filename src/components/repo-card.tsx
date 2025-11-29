import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Lock, Globe } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Repository } from "@/lib/store";
import { ScreenRecorder } from "@/components/screen-recorder";

interface RepoCardProps {
    repo: Repository;
    isSelected: boolean;
    onToggle: () => void;
    onAnalyze: () => void;
    summary?: string;
    onSummaryChange: (val: string) => void;
    demoUrl?: string;
    onDemoUrlChange: (val: string) => void;
    isAnalyzing: boolean;
}

export function RepoCard({
    repo, isSelected, onToggle, onAnalyze, summary, onSummaryChange, isAnalyzing, demoUrl, onDemoUrlChange
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
                                {isAnalyzing ? "Analisando..." : "Gerar Resumo com IA"}
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Resumo</label>
                            <Textarea
                                value={summary || ""}
                                onChange={(e) => onSummaryChange(e.target.value)}
                                placeholder="O resumo gerado pela IA aparecerá aqui..."
                                className="min-h-[100px]"
                            />
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
