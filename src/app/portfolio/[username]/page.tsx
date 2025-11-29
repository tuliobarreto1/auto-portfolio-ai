"use client";

import { useStore } from "@/lib/store";
import { PortfolioPreview } from "@/components/portfolio-preview";
import { useEffect, useState } from "react";

export default function PortfolioPage({ params }: { params: { username: string } }) {
    const { selectedRepos, portfolioItems } = useStore();
    const [mounted, setMounted] = useState(false);

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
            username={decodeURIComponent(params.username)}
        />
    );
}
