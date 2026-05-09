export const createInitialState = (initialTracks: any[] = []) => ({
  cycle: {
    id: 1,
    phase: 'VOTING',
    submission_end: 0,
    vote_start: 0,
    vote_end: 0,
    min_quorum: 50,
    current_voters: 0,
    extensions: 0,
    max_extensions: 3,
    quorum_met: false,
    rep_decay_rate: 5,
    payout_threshold_nanoton: 1000000000, // 1 TON in nanoTON
  },
  entities: [
    {
      id: 'II-JADEKAY',
      name: 'JADE KAY',
      genre_cluster: 'R&B / RAP / EXPERIMENTAL',
      bpm_range: [80, 110],
      lyrical_seeds: ['EPHANTOM', 'CYBERNETIC', 'REBIRTH'],
      releases: 0,
      active_curators: 1,
      seed_cycle: 1,
      status: 'ACTIVE',
      video: '/jadekay.mp4'
    }
  ],
  tracks: initialTracks,
  users: {} as Record<string, any>
});

export const createDefaultUser = (address: string) => ({
  address,
  reputation: 1000,
  floor: 1000,
  votes_this_cycle: [],
  role: 'NEW_USER',
  royalties_pending: 0,
  royalties_lifetime: 0,
  alignment_history: [],
});
