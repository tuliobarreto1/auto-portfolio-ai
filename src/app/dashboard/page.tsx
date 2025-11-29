import { auth, signOut } from "@/auth";
import { Octokit } from "octokit";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";
import { Repository } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default async function Dashboard() {
    const session = await auth();
    if (!session) redirect("/");

    // @ts-ignore
    const token = session.accessToken;

    const octokit = new Octokit({ auth: token });

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
                        <span className="text-muted-foreground">Bem-vindo, {session.user?.name}</span>
                        <form
                            action={async () => {
                                "use server";
                                await signOut({ redirectTo: "/" });
                            }}
                        >
                            <Button type="submit" variant="outline" size="sm" className="gap-2">
                                <LogOut className="w-4 h-4" />
                                Sair
                            </Button>
                        </form>
                    </div>
                </header>

                <DashboardClient initialRepos={repos} />
            </div>
        </div>
    );
}
