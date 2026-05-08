import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

// ── EPHANTOM Protocol State ────────────────────────────────────────────────

const NOW = Date.now()
const HOUR = 3600000

const cycle = {
  id: 1,
  phase: 'BOOTING',           // SUBMISSION | VOTING | EXTENDED | VOIDED
  submission_end: 0,
  vote_start: 0,
  vote_end: 0,
  min_quorum: 50,
  current_voters: 0,
  extensions: 0,
  max_extensions: 3,
  quorum_met: false,
  rep_decay_rate: 5,
  payout_threshold_sats: 1000,
}

const entities = [
  {
    id: 'II-JADEKAY',
    name: 'JADE KAY',
    genre_cluster: 'NEO-SOUL / GLITCH / AMBIENT',
    bpm_range: [80, 110],
    lyrical_seeds: ['EPHANTOM', 'CYBERNETIC', 'REBIRTH'],
    releases: 0,
    active_curators: 1,
    seed_cycle: 1,
    status: 'ACTIVE',
    video: '/jadekay.mp4'
  }
]

const tracks = []

const user = {
  reputation: 100,
  floor: 100,
  votes_this_cycle: [],
  role: 'NEW_USER',
  royalties_pending: 0,
  royalties_lifetime: 0,
  alignment_history: [],
}

// ── API Routes ─────────────────────────────────────────────────────────────

const delay = (ms) => new Promise(res => setTimeout(res, ms))

app.get('/api/cycle', async (c) => {
  await delay(100)
  return c.json(cycle)
})

app.get('/api/tracks', async (c) => {
  await delay(150)
  return c.json(tracks)
})

app.get('/api/entities', async (c) => {
  await delay(200)
  return c.json(entities)
})

app.get('/api/vault', async (c) => {
  await delay(150)
  return c.json(user)
})

// Vote for a track
app.post('/api/vote/:trackId', async (c) => {
  await delay(300)
  const id = parseInt(c.req.param('trackId'))
  const track = tracks.find(t => t.id === id)
  if (!track) return c.json({ error: 'TRACK_NOT_FOUND' }, 404)
  if (user.votes_this_cycle.includes(id)) {
    return c.json({ error: 'ALREADY_VOTED' }, 409)
  }
  track.votes += 1
  track.rep_weight += user.reputation
  user.votes_this_cycle.push(id)
  cycle.current_voters = Math.min(cycle.current_voters + 1, cycle.min_quorum + 10)
  cycle.quorum_met = cycle.current_voters >= cycle.min_quorum
  return c.json({ ok: true, track, cycle })
})

// Submit a track to the forge
app.post('/api/forge', async (c) => {
  await delay(600)
  const body = await c.req.json().catch(() => ({}))
  const ii = entities.find(e => e.id === body.ii_id) || entities[0]
  const newTrack = {
    id: tracks.length + 1,
    title: body.title || 'UNTITLED_PHANTOM',
    architect: 'usr_LOCAL',
    ii_id: ii.id,
    ii_name: ii.name,
    bpm: body.bpm || 128,
    genre: body.genre || ii.genre_cluster.split('/')[0].trim(),
    theme: ii.lyrical_seeds.slice(0, 2).join(' / '),
    votes: 0,
    rep_weight: 0,
    cycle_id: cycle.id,
    duration: '?:??',
  }
  tracks.push(newTrack)
  return c.json({ ok: true, track: newTrack })
})

// Serve static files
app.use('/*', serveStatic({ root: './public' }))

export default app
