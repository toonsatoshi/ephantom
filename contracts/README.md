# EPHANTOM Protocol Smart Contracts

This directory contains the Tact smart contracts for the EPHANTOM Protocol.

## Architecture

The protocol uses a decentralized, parent-child architecture to ensure scalability and security on the TON blockchain.

### 1. EphantomProtocol (Master)
- **File:** `ephantom_protocol.tact`
- **Role:** The central registry and entry point.
- **Responsibilities:**
  - Manages the creation of Instanced Identities (IIs).
  - Manages the deployment and update of Reputation Accounts.
  - Routes votes from Reputation Accounts to the correct Identity.

### 2. ReputationAccount (Child of Master)
- **File:** `reputation_account.tact`
- **Role:** Per-user contract.
- **Responsibilities:**
  - Stores the user's non-transferable reputation.
  - Acts as a "voting wallet": users send votes to this contract, which then attaches their reputation weight and forwards it to the Master.

### 3. Identity (Child of Master)
- **File:** `identity.tact`
- **Role:** Represents an "Instanced Identity" (virtual artist).
- **Responsibilities:**
  - Stores aesthetic parameters (seeds).
  - Manages the creation of Cycles.
  - Routes votes to the active Cycle.

### 4. Cycle (Child of Identity)
- **File:** `cycle.tact`
- **Role:** Manages a single cycle of music synthesis and curation.
- **Responsibilities:**
  - Records reputation-weighted votes for tracks.
  - Tracks unique voters to ensure quorum.
  - (Future) Manages reward distribution.

## Development

### Compilation
To compile the contracts, run:
```bash
npx tact --config tact.config.json
```

### Testing
To run the test suite, run:
```bash
npx jest
```

## Protocol Logic implemented
- [x] **Reputation-Weighted Voting:** Votes are automatically weighted by the user's current reputation stored in their `ReputationAccount`.
- [x] **Secure Routing:** Votes can only be cast through the user's own `ReputationAccount`, preventing spoofing.
- [x] **Scalable Identity Management:** Identities and Cycles are deployed as separate contracts to avoid storage bottlenecks.
