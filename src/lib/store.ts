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
    summary: string;
    demoUrl?: string;
}

export type VisibilityFilter = 'all' | 'public' | 'private';

interface AppState {
    selectedRepos: Repository[];
    toggleRepoSelection: (repo: Repository) => void;
    portfolioItems: Record<number, PortfolioItem>;
    updatePortfolioItem: (repoId: number, data: Partial<PortfolioItem>) => void;
    visibilityFilter: VisibilityFilter;
    setVisibilityFilter: (filter: VisibilityFilter) => void;
}

export const useStore = create<AppState>()(
    persist(
        (set) => ({
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
            visibilityFilter: 'all',
            setVisibilityFilter: (filter) => set({ visibilityFilter: filter }),
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
