"use client";

import { useState, useEffect } from "react";
import { Repository, useStore } from "@/lib/store";
import { RepoCard } from "@/components/repo-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface DashboardClientProps {
    initialRepos: Repository[];
}

export default function DashboardClient({ initialRepos }: DashboardClientProps) {
    const { data: session } = useSession();
    const {
        openAiKey, setOpenAiKey,
        apiProvider, setApiProvider,
        selectedRepos, toggleRepoSelection,
        portfolioItems, updatePortfolioItem
    } = useStore();

    const [localKey, setLocalKey] = useState("");
    const [analyzing, setAnalyzing] = useState<number | null>(null);

    // Hydrate local state from store
    useEffect(() => {
        if (openAiKey) setLocalKey(openAiKey);
    }, [openAiKey]);

    const handleSaveKey = () => {
        setOpenAiKey(localKey);
    };

    const handleAnalyze = async (repo: Repository) => {
        if (!openAiKey) {
            alert("Please save your API Key first.");
            return;
        }
        setAnalyzing(repo.id);
        try {
            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    repoName: repo.name,
                    owner: repo.full_name.split("/")[0],
                    apiKey: openAiKey,
                    provider: apiProvider
                }),
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            updatePortfolioItem(repo.id, { summary: data.summary });
        } catch (error) {
            console.error(error);
            alert("Failed to analyze repository.");
        } finally {
            setAnalyzing(null);
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-card border rounded-lg p-6 space-y-4">
                <h2 className="text-xl font-semibold">Configuration</h2>

                <div className="space-y-2">
                    <label className="text-sm font-medium">AI Provider</label>
                    <select
                        value={apiProvider}
                        onChange={(e) => setApiProvider(e.target.value as 'openai' | 'deepseek')}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <option value="openai">OpenAI (GPT-3.5/4)</option>
                        <option value="deepseek">DeepSeek</option>
                    </select>
                </div>

                <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">
                            {apiProvider === 'openai' ? 'OpenAI' : 'DeepSeek'} API Key
                        </label>
                        <Input
                            type="password"
                            value={localKey}
                            onChange={(e) => setLocalKey(e.target.value)}
                            placeholder={apiProvider === 'openai' ? 'sk-...' : 'sk-...'}
                        />
                    </div>
                    <Button onClick={handleSaveKey}>Save Key</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Your key is stored locally in your browser and sent securely to our backend only for analysis.
                </p>
            </div>

            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Select Projects</h2>
                {selectedRepos.length > 0 && session?.user?.name && (
                    <Link href={`/portfolio/${session.user.name}`} target="_blank">
                        <Button variant="secondary" className="gap-2">
                            <ExternalLink className="w-4 h-4" /> View Public Portfolio
                        </Button>
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {initialRepos.map((repo) => {
                    const isSelected = selectedRepos.some(r => r.id === repo.id);
                    const item = portfolioItems[repo.id];

                    return (
                        <RepoCard
                            key={repo.id}
                            repo={repo}
                            isSelected={isSelected}
                            onToggle={() => toggleRepoSelection(repo)}
                            onAnalyze={() => handleAnalyze(repo)}
                            isAnalyzing={analyzing === repo.id}
                            summary={item?.summary}
                            onSummaryChange={(val) => updatePortfolioItem(repo.id, { summary: val })}
                            demoUrl={item?.demoUrl}
                            onDemoUrlChange={(val) => updatePortfolioItem(repo.id, { demoUrl: val })}
                        />
                    );
                })}
            </div>
        </div>
    );
}
