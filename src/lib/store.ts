import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Repository {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    language: string | null;
    stargazers_count: number;
    updated_at: string;
}

export interface PortfolioItem {
    repoId: number;
    summary: string;
    demoUrl?: string;
}

interface AppState {
    openAiKey: string | null;
    apiProvider: 'openai' | 'deepseek';
    setOpenAiKey: (key: string | null) => void;
    setApiProvider: (provider: 'openai' | 'deepseek') => void;
    selectedRepos: Repository[];
    toggleRepoSelection: (repo: Repository) => void;
    portfolioItems: Record<number, PortfolioItem>;
    updatePortfolioItem: (repoId: number, data: Partial<PortfolioItem>) => void;
}

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            openAiKey: null,
            apiProvider: 'openai',
            setOpenAiKey: (key) => set({ openAiKey: key }),
            setApiProvider: (provider) => set({ apiProvider: provider }),
            selectedRepos: [],
            toggleRepoSelection: (repo) =>
                set((state) => {
                    const exists = state.selectedRepos.find((r) => r.id === repo.id);
                    if (exists) {
                        return {
                            selectedRepos: state.selectedRepos.filter((r) => r.id !== repo.id),
                        };
                    }
                    return { selectedRepos: [...state.selectedRepos, repo] };
                }),
            portfolioItems: {},
            updatePortfolioItem: (repoId, data) =>
                set((state) => ({
                    portfolioItems: {
                        ...state.portfolioItems,
                        [repoId]: {
                            ...state.portfolioItems[repoId],
                            repoId,
                            ...data,
                        },
                    },
                })),
        }),
        {
            name: 'auto-portfolio-storage',
            partialize: (state) => ({
                openAiKey: state.openAiKey,
                apiProvider: state.apiProvider,
                selectedRepos: state.selectedRepos,
                portfolioItems: state.portfolioItems
            }),
        }
    )
);
