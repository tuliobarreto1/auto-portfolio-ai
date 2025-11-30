import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

export const { handlers, auth, signIn, signOut } = NextAuth({
    secret: process.env.AUTH_SECRET,
    providers: [
        GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
            authorization: {
                params: {
                    scope: "read:user user:email repo", // repo dá acesso a repos públicos E privados
                },
            },
        }),
    ],
    callbacks: {
        authorized: async ({ auth }) => {
            // Logged in users are authenticated, otherwise redirect to login page
            return !!auth
        },
        async jwt({ token, account, profile }) {
            if (account) {
                token.accessToken = account.access_token
            }
            if (profile) {
                token.githubId = profile.id
                // @ts-ignore - Salva o login (username) do GitHub
                token.githubLogin = profile.login
            }
            return token
        },
        async session({ session, token }) {
            // @ts-ignore
            session.accessToken = token.accessToken
            // @ts-ignore
            session.user.id = token.githubId
            // @ts-ignore - Adiciona o login (username) na sessão
            session.user.login = token.githubLogin
            return session
        },
    },
    pages: {
        signIn: "/", // Redirect to home for login
    },
})
