import { getServerSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
          AutoPortfolio AI
        </h1>
        <p className="text-muted-foreground text-lg sm:text-xl">
          Transforme seus repositórios do GitHub em um portfólio incrível em segundos usando IA.
        </p>

        {error && (
          <p className="text-sm text-red-500">{decodeURIComponent(error)}</p>
        )}

        <a href="/api/auth/github">
          <Button size="lg" className="gap-2">
            <Github className="w-5 h-5" />
            Entrar com GitHub
          </Button>
        </a>
      </div>
    </main>
  );
}
