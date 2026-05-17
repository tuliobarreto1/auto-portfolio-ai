import { redirect } from "next/navigation";
import { Octokit } from "octokit";
import DashboardClient from "./dashboard-client";
import { Repository } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, Github } from "lucide-react";
import { EditDisplayName } from "@/components/edit-display-name";
import { getServerSession, clearSessionCookie } from "@/lib/session";
import { authedClient } from "@/lib/infraforge";
import { getProfileById, getGithubToken } from "@/lib/db";

async function logout() {
    "use server";
    await clearSessionCookie();
    redirect("/");
}

export default async function Dashboard() {
    const session = await getServerSession();
    if (!session) redirect("/");

    const client = authedClient(session.jwt);
    const profile = await getProfileById(client, session.userId);

    // GitHub ainda não conectado -> mostra o CTA de conexão
    if (!profile?.githubId || !profile?.username) {
        return (
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-2xl mx-auto space-y-8">
                    <header className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold">AutoPortfolio AI</h1>
                        <form action={logout}>
                            <Button type="submit" variant="outline" size="sm" className="gap-2">
                                <LogOut className="w-4 h-4" />
                                Sair
                            </Button>
                        </form>
                    </header>

                    <Card className="p-8 text-center space-y-4">
                        <Github className="w-12 h-12 mx-auto text-muted-foreground" />
                        <h2 className="text-xl font-semibold">Conecte sua conta do GitHub</h2>
                        <p className="text-muted-foreground">
                            Para gerar seu portfólio, conecte o GitHub e autorize o acesso aos seus repositórios.
                        </p>
                        <a href="/api/auth/github" className="inline-block">
                            <Button className="gap-2">
                                <Github className="w-4 h-4" />
                                Conectar GitHub
                            </Button>
                        </a>
                    </Card>
                </div>
            </div>
        );
    }

    const token = await getGithubToken(client, session.userId);
    const displayName = profile.displayName || profile.username;

    const octokit = new Octokit({ auth: token ?? undefined });

    let repos: Repository[] = [];
    try {
        const { data } = await octokit.rest.repos.listForAuthenticatedUser({
            sort: "updated",
            per_page: 100,
            visibility: "all",
        });

        repos = data.map((repo: any) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            html_url: repo.html_url,
            language: repo.language,
            stargazers_count: repo.stargazers_count,
            updated_at: repo.updated_at,
            private: repo.private,
        }));
    } catch (e) {
        console.error("Failed to fetch repos", e);
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Seus Repositórios</h1>
                    <div className="flex items-center gap-4">
                        <EditDisplayName currentName={displayName} />
                        <form action={logout}>
                            <Button type="submit" variant="outline" size="sm" className="gap-2">
                                <LogOut className="w-4 h-4" />
                                Sair
                            </Button>
                        </form>
                    </div>
                </header>

                <DashboardClient initialRepos={repos} username={profile.username} />
            </div>
        </div>
    );
}
