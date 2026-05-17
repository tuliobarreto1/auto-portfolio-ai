import { PortfolioPreview } from "@/components/portfolio-preview";
import { serviceClient } from "@/lib/infraforge";
import {
    getProfileByUsername,
    getSelectedRepositories,
    getPortfolioItems,
    getResume,
} from "@/lib/db";

export default async function PortfolioPage({
    params
}: {
    params: Promise<{ username: string }>
}) {
    const resolvedParams = await params;
    const username = decodeURIComponent(resolvedParams.username);

    try {
        const client = await serviceClient();

        const profile = await getProfileByUsername(client, username);

        if (!profile) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="text-center space-y-4">
                        <p className="text-muted-foreground">Usuário não encontrado.</p>
                        <p className="text-sm text-muted-foreground">Username procurado: {username}</p>
                        <p className="text-sm text-muted-foreground">Certifique-se de que você já fez login e selecionou projetos no dashboard.</p>
                    </div>
                </div>
            );
        }

        const repositories = await getSelectedRepositories(client, profile.id);

        if (repositories.length === 0) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="text-center space-y-4">
                        <p className="text-muted-foreground">Nenhum projeto selecionado ainda.</p>
                        <p className="text-sm text-muted-foreground">Vá para o dashboard e selecione alguns projetos para exibir no portfólio.</p>
                    </div>
                </div>
            );
        }

        const portfolioItems = await getPortfolioItems(client, profile.id);
        const resume = await getResume(client, profile.id);

        const repos = repositories.map((repo) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.fullName,
            description: repo.description,
            html_url: repo.htmlUrl,
            language: repo.language,
            stargazers_count: repo.stargazersCount,
            updated_at: repo.updatedAt,
            private: repo.private,
        }));

        const items: Record<number, any> = {};
        for (const item of portfolioItems) {
            items[item.repoId] = {
                repoId: item.repoId,
                objective: item.objective,
                features: item.features,
                technicalSummary: item.technicalSummary,
                demoUrl: item.demoUrl,
                recordingUrl: item.recordingUrl,
            };
        }

        return (
            <PortfolioPreview
                repos={repos}
                items={items}
                username={profile.displayName || username}
                usernameSlug={username}
                hasResume={!!resume}
            />
        );
    } catch (error: any) {
        console.error("Portfolio error:", error);
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold text-red-600">Erro ao carregar portfólio</h1>
                    <p className="text-muted-foreground">{error.message || "Ocorreu um erro inesperado."}</p>
                    <p className="text-sm text-muted-foreground">Verifique os logs do servidor para mais detalhes.</p>
                </div>
            </div>
        );
    }
}
