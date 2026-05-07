import { AlertTriangle, CheckCircle2, Coins, Gamepad2, Gauge, Wallet } from "lucide-react";

const modules = [
  { key: "gov", label: "gov.ephantomdao.ton", active: true },
  { key: "curate", label: "curate.ephantomdao.ton", active: false },
  { key: "pay", label: "pay.ephantomdao.ton", active: false },
  { key: "rep", label: "rep.ephantomdao.ton", active: false },
];

const quorumEvents = ["QUORUM FAILURE: 1/50", "CYCLE EXTENDED: 24H", "EXTENSIONS USED: 1/3"];

const registry = [
  ["submission_start", "2026-05-06 00:00 UTC"],
  ["submission_end", "2026-05-09 00:00 UTC"],
  ["vote_start", "2026-05-08 00:00 UTC"],
  ["vote_end", "2026-05-11 00:00 UTC"],
  ["min_quorum", "50 voters"],
  ["rep_decay_rate", "5%"],
];

function LcdCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-lime-300/25 bg-[#0d180d] p-3 shadow-[inset_0_0_0_1px_rgba(163,230,53,0.15)]">
      <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-lime-200">{title}</p>
      {children}
    </section>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-[#2f2554] px-3 py-5 text-lime-100">
      <div className="mx-auto max-w-md rounded-[2rem] border-4 border-[#7f6eb0] bg-[#4f3b87] p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between text-[11px]">
          <p className="flex items-center gap-1"><Wallet className="h-3 w-3" /> Tribute Gate: Seed Group Verified</p>
          <p className="font-semibold">NODE: ephantomdao.ton</p>
        </div>

        <div className="rounded-lg border-2 border-lime-200/70 bg-[#1a2b1a] p-3 font-mono">
          <LcdCard title="DAML / Genesis Cycle 0">
            <p className="text-xs">Instanced Identity (II): <span className="font-bold">Cybernetic Folk</span></p>
            <p className="mt-1 text-xs">REP: 1,000 [GENESIS]</p>
            <p className="mt-1 text-xs">Sybil-Resistance: <span className="text-lime-300">ACTIVE</span></p>
          </LcdCard>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <LcdCard title="Governance Terminal">
              <p className="text-[11px]">PROPOSE II _</p>
              <ul className="mt-1 space-y-1 text-[11px]">
                <li>Genre Cluster: Cybernetic Folk</li>
                <li>BPM Range: 95–128</li>
                <li>Lyrical Seeds: post-human longing</li>
              </ul>
              <button className="mt-2 w-full rounded border border-lime-300/40 bg-lime-400/20 py-1 text-[11px]">A: Ratify (48h)</button>
            </LcdCard>

            <LcdCard title="Discovery Deck">
              <p className="text-[11px]">VINYL SLEEVE: TRK-001</p>
              <p className="mt-1 text-[11px]">A = +1 Align / B = Reject</p>
              <p className="mt-2 text-[11px]">Δrep: +0 (no scaling in C0)</p>
            </LcdCard>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <LcdCard title="Performance Ledger">
              <p className="text-[11px]">40/40/10/10 Split</p>
              <div className="mt-1 h-2 w-full rounded bg-lime-950">
                <div className="h-2 w-2/5 rounded-l bg-lime-400" />
              </div>
              <p className="mt-1 text-[11px]">Defense Reserve: $8,400 / $50,000</p>
              <p className="text-[11px]">Payout Threshold: 50,000 sats</p>
            </LcdCard>

            <LcdCard title="Registry / Start">
              <ul className="space-y-1 text-[10px]">
                {registry.map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-2"><span>{k}</span><span>{v}</span></li>
                ))}
              </ul>
            </LcdCard>
          </div>

          <LcdCard title="Quorum Monitor" >
            <div className="space-y-1">
              {quorumEvents.map((event) => (
                <p key={event} className="flex items-center gap-1 text-[11px]"><AlertTriangle className="h-3 w-3" /> {event}</p>
              ))}
            </div>
          </LcdCard>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
          <button className="rounded bg-[#3a2c68] p-2"><Gamepad2 className="mx-auto mb-1 h-4 w-4" />Select<br />System Tree</button>
          <button className="rounded bg-[#3a2c68] p-2"><Gauge className="mx-auto mb-1 h-4 w-4" />D-Pad<br />Scroll</button>
          <button className="rounded bg-[#3a2c68] p-2"><CheckCircle2 className="mx-auto mb-1 h-4 w-4" />A/B<br />Align/Reject</button>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-lime-100/90">
          <p className="flex items-center gap-1"><Coins className="h-3 w-3" /> Refinement Nodes Ready</p>
          <p>SPV: Wyoming • Backup Trigger Armed</p>
        </div>
      </div>
    </div>
  );
}
