# TVer PiP - Self-Hosted GitHub Actions Runner

This directory contains the configuration to set up a self-hosted GitHub Actions
runner on a Raspberry Pi (ARM64) using Docker. This is necessary because the E2E
tests for the TVer Picture-in-Picture extension must be executed from an IP
address within Japan.

## Setup Instructions

1. **Create a GitHub Personal Access Token (PAT):**
   - Go to your GitHub account settings -> Developer settings -> Personal access
     tokens -> Tokens (classic).
   - Generate a new token with the `repo` scope.

2. **Create the Environment File:** Copy the example environment file and fill
   in your details:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to include your repository URL and the PAT you just created.

   _Example `.env` content:_
   ```env
   REPO_URL=https://github.com/hashory/picture-in-picture_for_tver
   GITHUB_PAT=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. **Build and Start the Runner:** Use Docker Compose to build the image and
   start the runner container in the background.

   ```bash
   deno task docker:build
   deno task docker:up
   ```

4. **Verify the Runner is Connected:** Check the logs to ensure the runner
   registered successfully and is listening for jobs:

   ```bash
   deno task docker:logs
   ```

   You should also see the runner listed with an "Idle" status in your GitHub
   repository's Settings -> Actions -> Runners page.

## Stopping the Runner

To stop the runner and automatically remove it from your GitHub repository
(handled gracefully by the shutdown script):

```bash
deno task docker:down
```
