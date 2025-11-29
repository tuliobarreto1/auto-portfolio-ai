"use client";

import { useStore } from "@/lib/store";
import { PortfolioPreview } from "@/components/portfolio-preview";
import { useEffect, useState } from "react";
import { use } from "react";

export default function PortfolioPage({ params }: { params: Promise<{ username: string }> }) {
    const { selectedRepos, portfolioItems } = useStore();
    const [mounted, setMounted] = useState(false);
    const resolvedParams = use(params);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    if (selectedRepos.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-muted-foreground">Nenhum projeto selecionado ainda. Vá para o dashboard para selecionar projetos.</p>
            </div>
        );
    }

    return (
        <PortfolioPreview
            repos={selectedRepos}
            items={portfolioItems}
            username={decodeURIComponent(resolvedParams.username)}
        />
    );
}
