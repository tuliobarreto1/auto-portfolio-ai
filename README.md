# AutoPortfolio AI

A Next.js application that automatically generates a portfolio from your GitHub repositories using OpenAI.

## Features

- **GitHub Login**: Secure authentication via NextAuth.js.
- **AI Analysis**: Generates summaries for your projects using OpenAI (GPT-3.5/4).
- **Dashboard**: Select repositories and edit summaries.
- **Portfolio View**: A public-ready view of your selected projects.
- **Modern UI**: Built with Tailwind CSS, Shadcn/UI concepts, and Lucide icons.

## Setup

1.  **Clone the repository** (if not already done).
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Variables**:
    Copy `.env.example` to `.env.local` and fill in the values.
    ```bash
    cp .env.example .env.local
    ```
    - `AUTH_SECRET`: Generate one with `openssl rand -base64 32`.
    - `AUTH_GITHUB_ID` & `AUTH_GITHUB_SECRET`: Create an OAuth App in GitHub Developer Settings.
      - Homepage URL: `http://localhost:3000`
      - Callback URL: `http://localhost:3000/api/auth/callback/github`

4.  **Run the development server**:
    ```bash
    npm run dev
    ```

5.  **Open http://localhost:3000**.

## Usage

1.  Log in with GitHub.
2.  In the Dashboard, select your **AI Provider** (OpenAI or DeepSeek).
3.  Enter your **API Key** for the selected provider (stored locally).
4.  Select the repositories you want to showcase.
5.  Click "Generate AI Summary" for each.
6.  Edit the summary or add a demo link if needed.
7.  Click "View Public Portfolio" to see the result.

## Supported AI Providers

- **OpenAI**: Use GPT-3.5-turbo or GPT-4 models
- **DeepSeek**: Use DeepSeek's chat model (more affordable alternative)

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- NextAuth.js v5
- Zustand (State Management)
- OpenAI SDK
- Octokit
