import { Octokit } from "octokit";

export async function getRepoContent(owner: string, repo: string, token?: string) {
    const octokit = new Octokit({
        auth: token,
    });

    try {
        // Try to get README
        const readme = await octokit.rest.repos.getReadme({
            owner,
            repo,
            mediaType: {
                format: "raw",
            },
        });

        // Try to get package.json
        let packageJson = "";
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
            packageJson = pkg.data;
        } catch (e) {
            console.log("No package.json found");
        }

        return {
            readme: String(readme.data),
            packageJson: String(packageJson),
        };
    } catch (error) {
        console.error("Error fetching repo content:", error);
        throw new Error("Failed to fetch repository content");
    }
}
