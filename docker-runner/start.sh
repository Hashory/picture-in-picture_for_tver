#!/bin/bash

# Validate required variables
if [ -z "$REPO_URL" ]; then
    echo "Error: REPO_URL environment variable is required."
    exit 1
fi

if [ -z "$GITHUB_PAT" ]; then
    echo "Error: GITHUB_PAT environment variable is required to fetch registration token."
    exit 1
fi

# Extract repository owner and name from REPO_URL
# Assuming format like: https://github.com/owner/repo
REPO_PATH=$(echo "$REPO_URL" | sed -E 's|https?://github.com/([^/]+/[^/]+).*|\1|')

echo "Fetching registration token for ${REPO_PATH}..."
# Use GitHub API to fetch a runner registration token
RESPONSE=$(curl -s -X POST -H "Authorization: token ${GITHUB_PAT}" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/${REPO_PATH}/actions/runners/registration-token")

REG_TOKEN=$(echo "$RESPONSE" | jq -r .token)

if [ "$REG_TOKEN" == "null" ] || [ -z "$REG_TOKEN" ]; then
    echo "Error: Failed to fetch registration token. API response:"
    echo "$RESPONSE"
    exit 1
fi

echo "Successfully fetched registration token."

# Cleanup function to be executed on trap
cleanup() {
    echo "Removing runner..."
    ./config.sh remove --unattended --token "${REG_TOKEN}"
}

# Trap termination signals
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM

# Configure the runner
echo "Configuring runner..."
./config.sh --unattended \
    --url "${REPO_URL}" \
    --token "${REG_TOKEN}" \
    --replace \
    --name "tver-pinp-test-$(hostname)" \
    --labels "tver-pinp-test" \
    --work "_work"

echo "Starting runner..."
./run.sh & wait $!
