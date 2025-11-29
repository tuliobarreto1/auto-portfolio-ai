import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
          AutoPortfolio AI
        </h1>
        <p className="text-muted-foreground text-lg sm:text-xl">
          Turn your GitHub repositories into a stunning portfolio in seconds using AI.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard" });
          }}
        >
          <Button size="lg" className="gap-2">
            <Github className="w-5 h-5" />
            Sign in with GitHub
          </Button>
        </form>
      </div>
    </main>
  );
}
