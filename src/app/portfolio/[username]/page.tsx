import { PortfolioPreview } from "@/components/portfolio-preview";
import { prisma } from "@/lib/prisma";

export default async function PortfolioPage({
    params
}: {
    params: Promise<{ username: string }>
}) {
    // Await params diretamente (Next.js 15)
    const resolvedParams = await params;
    const username = decodeURIComponent(resolvedParams.username);

    try {
        console.log("Portfolio: Buscando portfólio para username:", username);

        // Busca o usuário pelo username
        let user;
        try {
            user = await prisma.user.findFirst({
                where: { username },
                include: {
                    repositories: {
                        where: { selected: true },
                    },
                    portfolioItems: true,
                },
            });
        } catch (dbError: any) {
            console.error("Portfolio: Database error:", dbError);
            throw new Error(`Erro de conexão com banco de dados: ${dbError.message}`);
        }

        console.log("Portfolio: Usuário encontrado:", !!user);
        if (user) {
            console.log("Portfolio: Repositórios selecionados:", user.repositories.length);
            console.log("Portfolio: Portfolio items:", user.portfolioItems.length);
        }

        if (!user) {
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

        if (user.repositories.length === 0) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="text-center space-y-4">
                        <p className="text-muted-foreground">Nenhum projeto selecionado ainda.</p>
                        <p className="text-sm text-muted-foreground">Vá para o dashboard e selecione alguns projetos para exibir no portfólio.</p>
                    </div>
                </div>
            );
        }

    // Formata os repositórios para o formato esperado
    const repos = user.repositories.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.fullName,
        description: repo.description,
        html_url: repo.htmlUrl,
        language: repo.language,
        stargazers_count: repo.stargazersCount,
        updated_at: repo.updatedAt.toISOString(),
        private: repo.private,
    }));

    // Formata os portfolio items
    const items: Record<number, any> = {};
    for (const item of user.portfolioItems) {
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
                username={username}
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
