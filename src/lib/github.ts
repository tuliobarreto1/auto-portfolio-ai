import { Octokit } from "octokit";

export async function getRepoContent(owner: string, repo: string, token?: string) {
    const octokit = new Octokit({
        auth: token,
    });

    let readme = "";
    let packageJson = "";
    let description = "";
    let sourceFiles = "";

    // Get repository info first (always available)
    try {
        const repoInfo = await octokit.rest.repos.get({
            owner,
            repo,
        });
        description = repoInfo.data.description || "";
    } catch (e) {
        console.log("Error fetching repo info:", e);
    }

    // Try to get README (optional)
    try {
        const readmeResponse = await octokit.rest.repos.getReadme({
            owner,
            repo,
            mediaType: {
                format: "raw",
            },
        });
        readme = String(readmeResponse.data);
    } catch (e) {
        console.log("No README found");
    }

    // Try to get package.json (optional)
    try {
        const pkg = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: "package.json",
            mediaType: {
                format: "raw",
            },
        });
        // @ts-ignore
        packageJson = String(pkg.data);
    } catch (e) {
        console.log("No package.json found");
    }

    // Se não tem README, tenta buscar arquivos de código principais explorando o projeto
    if (!readme) {
        console.log("No README, exploring project structure...");
        try {
            const fileContents: string[] = [];
            const filesToRead: Array<{ path: string; name: string }> = [];

            // Função auxiliar para explorar diretórios
            async function exploreDirectory(path: string, depth: number = 0) {
                // Limita profundidade para não demorar muito
                if (depth > 2 || filesToRead.length >= 15) return;

                try {
                    const { data: contents } = await octokit.rest.repos.getContent({
                        owner,
                        repo,
                        path,
                    });

                    if (!Array.isArray(contents)) return;

                    console.log(`Exploring ${path || 'root'}: found ${contents.length} items`);

                    // Pastas a ignorar
                    const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'test', 'tests', '__tests__', '.vscode', '.idea'];

                    // Pastas importantes para explorar (ordem de prioridade)
                    const importantDirs = ['src', 'app', 'lib', 'components', 'pages', 'api', 'server', 'routes', 'controllers', 'models', 'views', 'public', 'scripts'];

                    // Arquivos importantes
                    const importantFiles = [
                        'index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts',
                        'server.js', 'server.ts', 'index.html', 'App.tsx', 'App.jsx',
                        'main.py', 'app.py', '__init__.py', 'main.go', 'main.java',
                        'routes.js', 'routes.ts', 'config.js', 'config.ts'
                    ];

                    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.php', '.rb', '.vue', '.c', '.cpp', '.cs', '.swift', '.kt'];

                    // Primeiro, adiciona arquivos importantes do diretório atual
                    for (const item of contents) {
                        if (item.type === 'file' && filesToRead.length < 15) {
                            const fileName = item.name;

                            // Prioriza arquivos importantes
                            if (importantFiles.includes(fileName)) {
                                console.log(`Found important file: ${item.path}`);
                                filesToRead.push({ path: item.path, name: fileName });
                            }
                            // Ou qualquer arquivo de código
                            else if (codeExtensions.some(ext => fileName.endsWith(ext))) {
                                console.log(`Found code file: ${item.path}`);
                                filesToRead.push({ path: item.path, name: fileName });
                            }
                        }
                    }

                    // Depois, explora subdiretórios importantes
                    for (const item of contents) {
                        if (item.type === 'dir' && filesToRead.length < 15) {
                            const dirName = item.name.toLowerCase();

                            // Ignora pastas conhecidas
                            if (ignoreDirs.includes(dirName)) {
                                continue;
                            }

                            // Prioriza pastas importantes, mas também explora outras se necessário
                            if (importantDirs.includes(dirName) || depth === 0) {
                                console.log(`Exploring directory: ${item.path}`);
                                await exploreDirectory(item.path, depth + 1);
                            }
                        }
                    }
                } catch (e) {
                    console.log(`Error exploring ${path}:`, e);
                }
            }

            // Começa pela raiz
            await exploreDirectory("");

            console.log(`Total files found: ${filesToRead.length}`);

            // Lê o conteúdo dos arquivos encontrados (limita a 10 arquivos)
            const maxFiles = Math.min(filesToRead.length, 10);
            for (let i = 0; i < maxFiles; i++) {
                const file = filesToRead[i];
                try {
                    const { data } = await octokit.rest.repos.getContent({
                        owner,
                        repo,
                        path: file.path,
                        mediaType: {
                            format: "raw",
                        },
                    });
                    // @ts-ignore
                    const content = String(data).substring(0, 1000);
                    fileContents.push(`\n--- ${file.path} ---\n${content}`);
                    console.log(`Read file: ${file.path}`);
                } catch (e) {
                    console.log(`Failed to read ${file.path}`);
                }
            }

            if (fileContents.length > 0) {
                sourceFiles = `Estrutura do projeto analisada (${fileContents.length} arquivos):\n` + fileContents.join('\n');
                console.log(`Source files collected: ${fileContents.length} files`);
            } else {
                console.log('No source files found in the repository');
            }
        } catch (e) {
            console.log("Error exploring project:", e);
        }
    }

    // Verifica se tem algum conteúdo útil
    if (!readme && !packageJson && !sourceFiles && !description) {
        throw new Error("Repositório sem conteúdo analisável. Adicione um README ou arquivos de código para gerar a análise.");
    }

    return {
        readme,
        packageJson,
        description,
        sourceFiles,
    };
}
