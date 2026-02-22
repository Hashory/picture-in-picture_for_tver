FROM ubuntu:24.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Update and install basic dependencies
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    ca-certificates \
    sudo \
    git \
    unzip \
    xvfb \
    libatk1.0-0t64 \
    libatspi2.0-0t64 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2t64 \
    libatk-bridge2.0-0t64 \
    libcups2t64 \
    libcairo2 \
    libpango-1.0-0 \
    libnspr4 \
    libnss3 \
    libxkbcommon0 \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

# Create github user with sudo privileges
RUN useradd -m github && \
    echo "github ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/github && \
    chmod 0440 /etc/sudoers.d/github

USER github
WORKDIR /home/github

# Install Deno
RUN curl -fsSL https://deno.land/install.sh | sh
ENV PATH="/home/github/.deno/bin:${PATH}"

# Install GitHub Actions runner
# Using ARM64 architecture for Raspberry Pi
ENV RUNNER_VERSION=2.322.0
RUN mkdir actions-runner && cd actions-runner && \
    curl -o actions-runner-linux-arm64-${RUNNER_VERSION}.tar.gz -L https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-arm64-${RUNNER_VERSION}.tar.gz && \
    tar xzf ./actions-runner-linux-arm64-${RUNNER_VERSION}.tar.gz && \
    rm actions-runner-linux-arm64-${RUNNER_VERSION}.tar.gz && \
    sudo ./bin/installdependencies.sh

COPY --chown=github:github start.sh /home/github/actions-runner/start.sh
RUN chmod +x /home/github/actions-runner/start.sh

WORKDIR /home/github/actions-runner

ENTRYPOINT ["./start.sh"]
