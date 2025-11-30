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
    private: boolean;
}

export interface PortfolioItem {
    repoId: number;
    objective?: string;        // Objetivo da aplicação
    features?: string;         // Funcionalidades
    technicalSummary?: string; // Resumo técnico
    demoUrl?: string;
    recordingUrl?: string;     // URL da gravação de tela
}

export type VisibilityFilter = 'all' | 'public' | 'private';

interface AppState {
    selectedRepos: Repository[];
    toggleRepoSelection: (repo: Repository) => void;
    portfolioItems: Record<number, PortfolioItem>;
    updatePortfolioItem: (repoId: number, data: Partial<PortfolioItem>) => void;
    clearPortfolioItem: (repoId: number) => void;
    visibilityFilter: VisibilityFilter;
    setVisibilityFilter: (filter: VisibilityFilter) => void;
    syncWithServer: (repositories: Repository[]) => Promise<void>;
    loadFromServer: () => Promise<void>;
    isSyncing: boolean;
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            selectedRepos: [],
            portfolioItems: {},
            visibilityFilter: 'all',
            isSyncing: false,

            toggleRepoSelection: async (repo) => {
                set((state) => {
                    const exists = state.selectedRepos.find((r) => r.id === repo.id);
                    if (exists) {
                        return {
                            selectedRepos: state.selectedRepos.filter((r) => r.id !== repo.id),
                        };
                    }
                    return { selectedRepos: [...state.selectedRepos, repo] };
                });
            },

            updatePortfolioItem: (repoId, data) => {
                set((state) => ({
                    portfolioItems: {
                        ...state.portfolioItems,
                        [repoId]: {
                            ...state.portfolioItems[repoId],
                            repoId,
                            ...data,
                        },
                    },
                }));
            },

            clearPortfolioItem: (repoId) => {
                set((state) => {
                    const newItems = { ...state.portfolioItems };
                    delete newItems[repoId];
                    return { portfolioItems: newItems };
                });
            },

            setVisibilityFilter: (filter) => set({ visibilityFilter: filter }),

            syncWithServer: async (repositories: Repository[]) => {
                const state = get();
                set({ isSyncing: true });

                try {
                    const selectedRepoIds = state.selectedRepos.map(r => r.id);

                    await fetch('/api/portfolio/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            repositories,
                            portfolioItems: state.portfolioItems,
                            selectedRepoIds,
                        }),
                    });
                } catch (error) {
                    console.error('Erro ao sincronizar com servidor:', error);
                } finally {
                    set({ isSyncing: false });
                }
            },

            loadFromServer: async () => {
                try {
                    const res = await fetch('/api/portfolio/load');
                    if (res.ok) {
                        const data = await res.json();
                        set({
                            selectedRepos: data.selectedRepos || [],
                            portfolioItems: data.portfolioItems || {},
                        });
                    }
                } catch (error) {
                    console.error('Erro ao carregar do servidor:', error);
                }
            },
        }),
        {
            name: 'auto-portfolio-storage',
            partialize: (state) => ({
                selectedRepos: state.selectedRepos,
                portfolioItems: state.portfolioItems,
                visibilityFilter: state.visibilityFilter
            }),
        }
    )
);
