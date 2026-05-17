import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";

export default async function Home() {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
            AutoPortfolio AI
          </h1>
          <p className="text-muted-foreground">
            Transforme seus repositórios do GitHub em um portfólio incrível usando IA.
          </p>
        </div>

        <AuthForm />
      </div>
    </main>
  );
}
