# EPHANTOM: Genesis Build

A decentralized autonomous music label where AI creates the sound and the community defines the soul.

## Project Overview

EPHANTOM is a crowd-controlled emergent music synthesis platform. Users act as curators, voting on AI-assisted tracks and shaping the evolution of the protocol's sound identities (Entities).

### Core Features

- **TON Wallet Integration:** Seamless connection via TonConnect UI.
- **The Matrix:** Browse and vote on tracks in the current cycle.
- **The Forge:** Discover and curate new forged tracks.
- **On-Chain Reputation:** Voting power weighted by user reputation stored on the TON blockchain.
- **Shared API Logic:** Unified backend powering both local Node.js and Cloudflare Workers.
- **Persistence:** Local state management surviving server restarts.

## Tech Stack

- **Frontend:** Vanilla JS, TailwindCSS, Three.js, TonConnect UI.
- **Backend:** Hono, Node.js, Cloudflare Workers.
- **Smart Contracts:** Tact (TON Blockchain).
- **Testing:** Jest, Sandbox (for contracts).

## Development Workflow

### Prerequisites

- Node.js (v18+)
- Bun (optional, but recommended)

### Installation

```bash
npm install
```

### Running Locally

```bash
npm run dev
```
The server will be available at `http://localhost:8001`.

### Building and Testing

```bash
# Compile contracts and run all tests
npm test

# Build contracts only
npm run build
```

## Architecture

- `/contracts`: Tact smart contracts for reputation, identities, and voting cycles.
- `/shared`: Shared schema, state, and API logic used by both Node.js and Workers.
- `/public`: Frontend assets and Hardware OS (Genesis Build).
- `/data`: Seed tracks and persisted state.
- `node-server.js`: Node.js server for local development.
- `worker/index.js`: Cloudflare Worker entry point.

## Known Limitations

- **Prototype State:** Reputation is currently simulated in the local API while the on-chain integration is being finalized.
- **Data Persistence:** Local development uses `data/state.json`. Production (Workers) requires KV or D1 integration for persistence.

## License

MIT
