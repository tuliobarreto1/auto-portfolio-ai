'use client';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4 max-w-md">
                <h1 className="text-2xl font-bold text-red-600">Erro ao carregar portfólio</h1>
                <p className="text-muted-foreground">{error.message}</p>
                <button
                    onClick={reset}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                    Tentar novamente
                </button>
            </div>
        </div>
    );
}
