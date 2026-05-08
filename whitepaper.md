EPHANTOM: Crowd-Controlled Emergent Music Synthesis

Version 1.2 — Operational Specification

---

0.5 Abstract

The EPHANTOM Protocol enables the collaborative creation and commercial distribution of "Instanced Identities" (IIs)—virtual music artists whose aesthetic direction, track selection, and brand evolution are governed by a decentralized crowd of curators. By integrating AI-assisted synthesis with a reputation-weighted consensus model, the protocol produces high-fidelity, market-ready music that bypasses traditional label gatekeeping. Revenue from streaming and commercial licensing is distributed via a contribution-based meritocracy, rewarding both original creators (Architects) and active curators (The Crowd).

---

1.0 Executive Summary

EPHANTOM is a decentralized autonomous music label (DAML) that leverages AI as a tool for emergent creativity rather than a replacement for human taste. The protocol operates in "Cycles," where curators propose, vote on, and refine musical output. Unlike passive token-based DAOs, EPHANTOM utilizes a non-transferable reputation system to ensure that influence is earned through consistent alignment with market success and aesthetic quality.

---

2.0 Core Thesis

Human taste is the ultimate filter. While AI can generate infinite variations, it cannot determine what "sounds good" to a human audience. EPHANTOM empowers humans to act as the primary selection pressure in a synthetic evolution loop.

---

3.0 The Gated Ecosystem: Tribute Integration

[Initial implementation details regarding Tribute integration for gating and identity verification]

---

4.0 The Consensus Matrix: Emergent Synthesis

4.1 Seeding an Instanced Identity

An II’s aesthetic parameters (genre cluster, BPM range, lyrical theme seeds, reference audio embedding) are defined by a simple majority reputation-weighted vote of existing curators (minimum 5 participants). The proposal is published on-chain for 48 hours. If no objection from >30% of reputation-weighted active curators, it is ratified.

4.2 Cycle Cadence

Default cycle parameters (mutable via Cycle Parameter Registry):

· Submission window: 72 hours
· Voting window: 72 hours (overlaps final 24 hours of submission to allow early voting)
· Minimum unique voters for a track to be considered “release-worthy”: 50, or 10% of active curators, whichever is larger.
· **Quorum Failure Handling (NEW):** If the minimum quorum is not met by the end of the voting window, the cycle is automatically extended by 24 hours. This extension can occur up to 3 times. If quorum is still not met after 3 extensions, the cycle is voided, and no release or reward distribution occurs for that cycle.

4.3 Reputation-Weighted Taste

Initial reputation: 1,000 for all new users.

Update rule after each cycle:
Δrep = alignment × (track_performance_score – 0.5) × 100

· alignment = +1 if curator voted for the final selected track, –1 otherwise.
· track_performance_score = streaming percentile (0–1) of that track relative to all protocol releases in the same 90‑day window.

Decay: 5% per cycle if user did not vote in that cycle.
Floor: 100 reputation (cannot go below).

4.4 Anti-Brigading and Vote Integrity

The protocol employs Sybil-resistance through identity verification and reputation floors. High-reputation curators carry more weight, diluting the impact of coordinated low-reputation bots or "brigades."

---

5.0 Reward Architecture: Performance Royalties

5.1 Contribution-Based Distribution

· The Architect (40%): the user whose submission became the winning track.
· The Active Crowd (40%): distributed equally among all curators who voted for the winning track(s) in that cycle.
· Refinement Nodes (10%): contributors who performed qualifying labor (mixing, mastering, metadata, visual packaging). Verified as below.
· Protocol Treasury (10%): infrastructure, moderation, marketing, legal, system maintenance.

5.1a Refinement Verification

Refinement work is validated by two randomly selected reputation-weighted moderators (elected quarterly). Proof required: DAW project file + timestamped screen recording.
Collusion penalty: If an Architect and Refinement Node are found colluding (e.g., fake submission), both forfeit 100% of cycle rewards and are banned for 3 cycles.
Bounty: 10% of the forfeited amount is paid to the reporter who submitted a confirmed report. Remaining 90% goes to the Treasury.

---

6.0 Global Distribution and Commercial Interface

6.1 SPV Legal Structure

The SPV is incorporated in Wyoming, USA.
Directors: initially 3 core team members, transitioning to multi‑sig with 2 community representatives after 1 year.
Operating costs deducted before royalty split:

· Distribution fees (e.g., DistroKid, TuneCore)
· KYC provider (Sumsub) – capped at $0.25 per active user per year
· Legal/accounting – capped at 2% of gross royalties.
  Any excess >2% requires a governance vote.

6.2 Defense Reserve

2% of gross royalties (before any splits) flows to a defense reserve, capped at $50k. After cap, excess rolls into Treasury.
Governance: SPV directors approve use via 3‑of‑5 multi‑sig; community may veto via on‑chain vote (75% quorum) within 7 days.

6.3 Platform Compliance & Backup Trigger

· Spotify: Human‑refined vocals required (Refinement Node step); label as “AI‑assisted”.
· Apple Music: Full disclosure.
· Backup plan: If Spotify/Apple reject >2 releases, activate distribution via SoundCloud + Bandcamp + direct sales (token‑gated) within 30 days.

---

7.0 The Instanced Identity Lifecycle

1. Seed Selection: Aesthetic parameters set via process in 4.1.
2. Submission: Architects submit tracks.
3. Voting: Curators vote using reputation weight.
4. Refinement: Refinement Nodes master and package the winner.
5. Distribution: SPV handles global release.
6. Royalty Split: Payouts triggered per Cycle Parameter Registry.

---

8.0 Human Authorship and Brand Formation

All releases are human-curated and AI-assisted. The brand identity of each II is an emergent property of the crowd's collective choices.

---

9.0 Governance and Operational Discipline

9.1 Cycle Parameter Registry

A TON smart contract stores for each cycle ID:

· submission_start, submission_end
· vote_start, vote_end
· min_quorum (voters)
· payout_threshold_sats (minimum accumulated royalties to trigger distribution)
· rep_decay_rate (default 5%)

Mutability: Parameters for future cycles are changed by reputation-weighted vote (simple majority, minimum 10% turnout of eligible reputation users). No token governance in v1.

9.2 Moderation and Quality Control

Moderators: Elected quarterly by reputation-weighted vote; term 3 months; compensated from Treasury (amount set each election). Dispute resolution: moderator panel of 3.

---

10.0 Risk Controls and System Resilience

10.1 Platform Dependency: Mitigated by the Backup Trigger (6.3).
10.2 Legal and Regulatory Review: Handled by Wyoming SPV and specialized counsel.
10.3 Content Integrity & Defense Reserve: As described in 6.2.
10.4 Development & Funding Disclosure

The Telegram Mini App, TON smart contracts, and reputation backend are not yet built. Estimated cost: $120–150k; timeline: 4 months post‑funding.
Funding source: external pre‑seed SAFE from angel investors (not from Treasury). Whitepaper v1.2 acknowledges this as an open risk.

---

11.0 Expansion Beyond Music

[Future expansion to visuals, fashion, and virtual performance]

---

12.0 Conclusion

EPHANTOM redefines the music label as a decentralized, AI-augmented, and crowd-driven organism.

---

APPENDIX A: Role Matrix

Role | Election / Appointment | Term Length | Compensation | Accountability Mechanism
---|---|---|---|---
Seed Proposer | Any rep-weighted curator | Per cycle | None (but gains rep if selected) | Ratification vote
Moderator | Rep-weighted vote | 3 months | Treasury stipend (set at election) | Can be recalled by 60% rep-weighted vote
Refinement Node | Self-nominate per cycle | Per cycle | 10% of cycle royalties (if verified) | Proof required; collusion ban
SPV Director (initial) | Core team appointment | 1 year | None (voluntary) | After 1 year, community multi-sig
SPV Director (community) | Rep-weighted vote | 1 year | None | Multi-sig with core

---

APPENDIX B: Bootstrapping – Genesis Cycle (Cycle 0)

· No submission fees.
· All votes equal (no reputation weighting).
· Curators = invited seed group (max 100) from existing music/AI/DAO communities.
· One pre‑defined II (e.g., “Cybernetic Folk”) with fixed parameters set by core team.
· Prize pool: $5k sponsored by angels (not from Treasury).
· Oracle transparency: Core team’s final track selection is published as a timestamped vote record. This oracle method is never repeated in future cycles.
· After Cycle 0, reputation is seeded based on voting alignment with the core team’s final pick (one‑time use).

---

APPENDIX C: Legal & SPV Operating Summary

· Jurisdiction: Wyoming, USA.
· KYC provider: Sumsub ($0.25/user/year cap).
· Defense reserve: 2% of gross royalties, $50k cap.
· Distribution backup trigger: As in 6.3.
· Tax treatment: Participants are responsible for their own income tax on royalties; SPV will issue necessary tax forms (e.g., Form 1099 for US persons) where required by law.

---

End of Whitepaper v1.2
