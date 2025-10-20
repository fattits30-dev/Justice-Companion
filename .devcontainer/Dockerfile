# Justice Companion Development Container
# Node 20.18.0 LTS with Better-SQLite3 native dependencies

FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

# Install Better-SQLite3 build dependencies
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
        build-essential \
        python3 \
        python3-pip \
        libsqlite3-dev \
        pkg-config \
        libc6-dev \
        make \
        g++ \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright dependencies
RUN npx -y playwright@latest install-deps

# Set up pnpm
RUN npm install -g pnpm@latest

# Set working directory
WORKDIR /workspaces/justice-companion

# Configure Git for better-sqlite3 submodules
RUN git config --global --add safe.directory /workspaces/justice-companion
