import { Repository, PortfolioItem } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Github } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PortfolioPreviewProps {
    repos: Repository[];
    items: Record<number, PortfolioItem>;
    username: string;
}

export function PortfolioPreview({ repos, items, username }: PortfolioPreviewProps) {
    return (
        <div className="min-h-screen bg-background p-8">
            <header className="max-w-6xl mx-auto mb-12 text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">Portfólio de {username}</h1>
                <p className="text-muted-foreground">Criado com AutoPortfolio AI</p>
            </header>

            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {repos.map((repo) => {
                    const item = items[repo.id];
                    return (
                        <Card key={repo.id} className="flex flex-col h-full hover:shadow-lg transition-shadow border-muted">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-start gap-2">
                                    <span className="truncate" title={repo.name}>{repo.name}</span>
                                    {repo.language && <Badge variant="secondary" className="shrink-0">{repo.language}</Badge>}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                {item?.objective && (
                                    <div>
                                        <h3 className="text-sm font-semibold mb-1">Objetivo</h3>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                            {item.objective}
                                        </p>
                                    </div>
                                )}

                                {item?.features && (
                                    <div>
                                        <h3 className="text-sm font-semibold mb-1">Funcionalidades</h3>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                            {item.features}
                                        </p>
                                    </div>
                                )}

                                {item?.technicalSummary && (
                                    <div>
                                        <h3 className="text-sm font-semibold mb-1">Stack Técnica</h3>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                            {item.technicalSummary}
                                        </p>
                                    </div>
                                )}

                                {!item?.objective && !item?.features && !item?.technicalSummary && (
                                    <p className="text-sm text-muted-foreground">
                                        {repo.description || "Nenhuma descrição disponível."}
                                    </p>
                                )}
                            </CardContent>
                            <CardFooter className="flex gap-2 mt-auto">
                                <Button variant="outline" size="sm" asChild className="w-full">
                                    <a href={repo.html_url} target="_blank" rel="noreferrer">
                                        <Github className="w-4 h-4 mr-2" /> Código
                                    </a>
                                </Button>
                                {item?.demoUrl && (
                                    <Button size="sm" asChild className="w-full">
                                        <a href={item.demoUrl} target="_blank" rel="noreferrer">
                                            <ExternalLink className="w-4 h-4 mr-2" /> Demo
                                        </a>
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
