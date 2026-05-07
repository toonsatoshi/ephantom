import {
  Activity,
  BarChart3,
  CircleDollarSign,
  Clock3,
  Disc3,
  FileAudio2,
  Flame,
  Home,
  ListMusic,
  Mic2,
  Music2,
  Pause,
  Play,
  PlusSquare,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  Upload,
  User,
  Users,
  Wallet,
  Waves,
} from "lucide-react";

const phases = [
  "Seed Selection",
  "Submission (72h)",
  "Voting (72h)",
  "Refinement",
];

const tracks = [
  {
    id: "TRK-019",
    title: "Neon Orchard Protocol",
    artist: "Node_Aria",
    bpm: 122,
    votes: 34620,
    quorum: 71,
  },
  {
    id: "TRK-021",
    title: "Circuit Psalms v2",
    artist: "VocalForge",
    bpm: 96,
    votes: 28440,
    quorum: 59,
  },
  {
    id: "TRK-025",
    title: "Chromatic Dust Choir",
    artist: "Granular Lattice",
    bpm: 140,
    votes: 17880,
    quorum: 37,
  },
];

const activities = [
  "Seed ratified: 'Ghost Funk Cathedral' by Curator 0xA91",
  "Track minted: 'Lumen Choir / Edit 4' from Cycle 8",
  "Refinement proof approved for TRK-013 by Moderator 0xB17",
];

const ledger = [
  "+150 Rep from Cycle 3 Alignment",
  "+90 Rep from Cycle 5 Alignment",
  "-5% Decay for missing Cycle 4",
  "+70 Rep from Cycle 7 Alignment",
];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-zinc-900/80 p-4 shadow-[0_0_22px_rgba(0,255,214,0.08)] backdrop-blur">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function App() {
  const currentPhase = 2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black pb-24 text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-cyan-500/20 bg-black/75 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">TON Wallet</p>
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-300">
              <Wallet className="h-4 w-4" /> EQA9...7K2m connected
            </p>
          </div>
          <div className="rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-[0.14em] text-fuchsia-200">Reputation</p>
            <p className="text-base font-semibold text-fuchsia-100">1,740</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pt-4">
        <Panel title="Hub / Dashboard">
          <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/5 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Active Instanced Identity</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-cyan-200">
              <Flame className="h-5 w-5" /> Cybernetic Folk — from Cycle 0
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-zinc-800/80 p-2">
              <p className="text-zinc-400">Treasury</p>
              <p className="mt-1 font-semibold text-emerald-300">78,124 TON</p>
            </div>
            <div className="rounded-lg bg-zinc-800/80 p-2">
              <p className="text-zinc-400">Curators</p>
              <p className="mt-1 flex items-center gap-1 font-semibold text-zinc-100">
                <Users className="h-3.5 w-3.5" /> 12,480
              </p>
            </div>
            <div className="rounded-lg bg-zinc-800/80 p-2">
              <p className="text-zinc-400">Phase Timer</p>
              <p className="mt-1 flex items-center gap-1 font-semibold text-amber-300">
                <Clock3 className="h-3.5 w-3.5" /> 14h 20m
              </p>
            </div>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {activities.map((item) => (
              <li key={item} className="rounded-lg border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-zinc-300">
                {item}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Active Cycle / Core Loop">
          <div className="mb-3 flex items-center justify-between text-xs text-zinc-400">
            {phases.map((phase, index) => (
              <div key={phase} className="flex flex-col items-center gap-1">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    index <= currentPhase ? "bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.9)]" : "bg-zinc-700"
                  }`}
                />
                <span className={index === currentPhase ? "text-cyan-200" : ""}>{phase}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {tracks.map((track) => (
              <article key={track.id} className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-zinc-100">{track.title}</p>
                  <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-200">{track.bpm} BPM</span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-400">{track.artist}</p>
                <div className="mt-2 h-2 rounded bg-zinc-700">
                  <div className="h-full rounded bg-fuchsia-400" style={{ width: `${track.quorum}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                  <span>Quorum Progress: {track.quorum}% (50 voters or 10%)</span>
                  <span>{track.votes.toLocaleString()} weighted votes</span>
                </div>
                <button className="mt-3 w-full rounded-lg bg-cyan-400/90 py-2 text-sm font-semibold text-black">
                  Vote with Reputation (Power: 1,740)
                </button>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Propose New Seed / Instanced Identity">
          <div className="space-y-3 text-sm">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Genre Cluster</label>
              <div className="flex gap-2">
                {["Cybernetic Folk", "Hyperpop", "Neo-Soul Circuit"].map((tag) => (
                  <button key={tag} className="rounded-full border border-cyan-500/30 px-3 py-1 text-xs text-cyan-200">
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">BPM Range</label>
              <input type="range" min={60} max={180} defaultValue={122} className="w-full accent-fuchsia-400" />
              <p className="mt-1 text-xs text-zinc-500">95 - 128 BPM selected</p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Lyrical Theme Seeds</label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                placeholder="e.g., post-human longing, silicon forests"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Reference Audio Embedding</label>
              <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-600 py-3 text-zinc-300">
                <Upload className="h-4 w-4" /> Upload .wav/.mp3/.embedding
              </button>
            </div>
            <button className="w-full rounded-lg bg-fuchsia-500 py-2 font-semibold text-white">
              Submit for 48h Ratification Window
            </button>
          </div>
        </Panel>

        <Panel title="Refinement Node / Moderator Portal (Restricted)">
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-200">
              Role Active: Refinement Node + Elected Moderator
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="rounded-lg border border-zinc-700 p-3">
                <FileAudio2 className="mx-auto mb-1 h-4 w-4" /> Upload DAW Project
              </button>
              <button className="rounded-lg border border-zinc-700 p-3">
                <Mic2 className="mx-auto mb-1 h-4 w-4" /> Upload Timestamped Recording
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Moderation Queue</p>
              {[
                "TRK-019 Proof / Ableton Project + screen capture",
                "TRK-021 Proof / Logic stems + vocal chain capture",
              ].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-lg border border-zinc-700 p-2">
                  <span className="text-xs text-zinc-300">{item}</span>
                  <button className="rounded bg-emerald-500 px-2 py-1 text-[11px] font-medium text-black">Approve</button>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Profile / Reputation Ledger">
          <div className="space-y-3">
            <div className="rounded-lg bg-zinc-800/80 p-3">
              <p className="text-xs text-zinc-400">Voting Alignment Score</p>
              <p className="mt-1 text-2xl font-semibold text-cyan-200">87.4%</p>
            </div>
            <ul className="space-y-2 text-sm">
              {ledger.map((line) => (
                <li key={line} className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300">
                  {line}
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-zinc-800/80 p-3">
                <p className="text-zinc-400">Architect Slice</p>
                <p className="mt-1 font-semibold text-emerald-300">312 TON</p>
              </div>
              <div className="rounded-lg bg-zinc-800/80 p-3">
                <p className="text-zinc-400">Active Crowd Slice</p>
                <p className="mt-1 font-semibold text-emerald-300">488 TON</p>
              </div>
            </div>
          </div>
        </Panel>
      </main>

      <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-md px-4">
        <div className="rounded-xl border border-cyan-500/20 bg-zinc-900/95 p-3 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-100">Now Playing: Neon Orchard Protocol</p>
              <p className="text-xs text-zinc-400">Node_Aria • 01:24 / 03:19</p>
            </div>
            <button className="rounded-full bg-cyan-400 p-2 text-black">
              <Play className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-700 bg-black/95 px-2 py-1">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {[
            [Home, "Hub"],
            [Disc3, "Cycles"],
            [PlusSquare, "Propose"],
            [User, "Profile"],
          ].map(([Icon, label]) => (
            <button key={label as string} className="flex flex-col items-center gap-1 rounded-lg py-2 text-xs text-zinc-300">
              <Icon className="h-4 w-4" />
              {label as string}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
