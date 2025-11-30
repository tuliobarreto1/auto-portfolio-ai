"use client";

import { useState, useEffect, useMemo } from "react";
import { Repository, useStore, VisibilityFilter } from "@/lib/store";
import { RepoCard } from "@/components/repo-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ResumeUpload } from "@/components/resume-upload";

interface DashboardClientProps {
    initialRepos: Repository[];
}

export default function DashboardClient({ initialRepos }: DashboardClientProps) {
    const { data: session } = useSession();
    const {
        selectedRepos, toggleRepoSelection,
        portfolioItems, updatePortfolioItem, clearPortfolioItem,
        visibilityFilter, setVisibilityFilter,
        syncWithServer, loadFromServer
    } = useStore();

    const [analyzing, setAnalyzing] = useState<number | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Carrega dados do servidor ao montar o componente
    useEffect(() => {
        if (!isLoaded) {
            loadFromServer().finally(() => setIsLoaded(true));
        }
    }, []);

    // Sincroniza com o servidor sempre que os dados mudarem
    useEffect(() => {
        if (isLoaded && session?.user && initialRepos.length > 0) {
            const timeoutId = setTimeout(() => {
                syncWithServer(initialRepos).catch(err => {
                    console.error('Erro ao sincronizar:', err);
                });
            }, 1000); // Debounce de 1 segundo

            return () => clearTimeout(timeoutId);
        }
    }, [selectedRepos, portfolioItems, session?.user, isLoaded]);

    // Filtra e ordena repositórios
    const filteredRepos = useMemo(() => {
        // Primeiro filtra por visibilidade
        let repos = initialRepos;
        if (visibilityFilter === 'public') repos = repos.filter(repo => !repo.private);
        if (visibilityFilter === 'private') repos = repos.filter(repo => repo.private);

        // Depois filtra por busca
        if (searchQuery.trim()) {
            repos = repos.filter(repo =>
                repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Ordena: selecionados primeiro, depois alfabeticamente
        return repos.sort((a, b) => {
            const aSelected = selectedRepos.some(r => r.id === a.id);
            const bSelected = selectedRepos.some(r => r.id === b.id);

            // Se um está selecionado e o outro não, o selecionado vem primeiro
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;

            // Se ambos têm o mesmo status de seleção, ordena alfabeticamente
            return a.name.localeCompare(b.name);
        });
    }, [initialRepos, visibilityFilter, searchQuery, selectedRepos]);

    const handleAnalyze = async (repo: Repository) => {
        setAnalyzing(repo.id);
        try {
            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    repoName: repo.name,
                    owner: repo.full_name.split("/")[0]
                }),
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            updatePortfolioItem(repo.id, {
                objective: data.objective,
                features: data.features,
                technicalSummary: data.technicalSummary
            });
        } catch (error) {
            console.error(error);
            alert("Falha ao analisar repositório.");
        } finally {
            setAnalyzing(null);
        }
    };

    return (
        <div className="space-y-8">
            <ResumeUpload />
            
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <h2 className="text-xl font-semibold">Selecione os Projetos</h2>

                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant={visibilityFilter === 'all' ? 'default' : 'outline'}
                                onClick={() => setVisibilityFilter('all')}
                            >
                                Todos ({initialRepos.length})
                            </Button>
                            <Button
                                size="sm"
                                variant={visibilityFilter === 'public' ? 'default' : 'outline'}
                                onClick={() => setVisibilityFilter('public')}
                            >
                                Públicos ({initialRepos.filter(r => !r.private).length})
                            </Button>
                            <Button
                                size="sm"
                                variant={visibilityFilter === 'private' ? 'default' : 'outline'}
                                onClick={() => setVisibilityFilter('private')}
                            >
                                Privados ({initialRepos.filter(r => r.private).length})
                            </Button>
                        </div>
                    </div>

                    {selectedRepos.length > 0 && session?.user && (
                        <Link href={`/portfolio/${(session.user as any).login || session.user.name}`} target="_blank">
                            <Button variant="secondary" className="gap-2">
                                <ExternalLink className="w-4 h-4" /> Ver Portfólio Público
                            </Button>
                        </Link>
                    )}
                </div>

                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                        type="text"
                        placeholder="Buscar projetos por nome ou descrição..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredRepos.map((repo) => {
                    const isSelected = selectedRepos.some(r => r.id === repo.id);
                    const item = portfolioItems[repo.id];

                    return (
                        <RepoCard
                            key={repo.id}
                            repo={repo}
                            isSelected={isSelected}
                            onToggle={() => toggleRepoSelection(repo)}
                            onAnalyze={() => handleAnalyze(repo)}
                            onClear={() => clearPortfolioItem(repo.id)}
                            isAnalyzing={analyzing === repo.id}
                            objective={item?.objective}
                            onObjectiveChange={(val) => updatePortfolioItem(repo.id, { objective: val })}
                            features={item?.features}
                            onFeaturesChange={(val) => updatePortfolioItem(repo.id, { features: val })}
                            technicalSummary={item?.technicalSummary}
                            onTechnicalSummaryChange={(val) => updatePortfolioItem(repo.id, { technicalSummary: val })}
                            demoUrl={item?.demoUrl}
                            onDemoUrlChange={(val) => updatePortfolioItem(repo.id, { demoUrl: val })}
                        />
                    );
                })}
            </div>
        </div>
    );
}
