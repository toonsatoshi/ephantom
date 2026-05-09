import { Hono } from 'hono'

export function createEphantomApp(initialState: any, onMutation: (type: string, detail: any) => Promise<void> = async () => {}) {
  const app = new Hono()
  const { cycle, entities, tracks, user } = initialState

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

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

  app.post('/api/vote/:trackId', async (c) => {
    await delay(300)
    const id = parseInt(c.req.param('trackId'))
    const track = tracks.find((t: any) => t.id === id)
    if (!track) return c.json({ error: 'TRACK_NOT_FOUND' }, 404)
    
    if (user.votes_this_cycle.includes(id)) {
      return c.json({ error: 'ALREADY_VOTED' }, 409)
    }

    track.votes += 1
    track.rep_weight += user.reputation
    user.votes_this_cycle.push(id)
    cycle.current_voters = Math.min(cycle.current_voters + 1, cycle.min_quorum + 10)
    cycle.quorum_met = cycle.current_voters >= cycle.min_quorum
    
    await onMutation('vote', { trackId: id })
    return c.json({ ok: true, track, cycle })
  })

  app.post('/api/forge', async (c) => {
    await delay(600)
    const body = await c.req.json().catch(() => ({}))
    const ii = entities.find((e: any) => e.id === body.ii_id) || entities[0]
    
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
      url: 'https://audius.co/jadekay/run-on-sentences',
      embedUrl: 'https://audius.co/embed/track/jadekay/run-on-sentences?flavor=card'
    }
    
    tracks.push(newTrack)
    await onMutation('forge', { track: newTrack })
    return c.json({ ok: true, track: newTrack })
  })

  return app
}
