import { Hono } from 'hono'
import { createDefaultUser } from './state'

export function createEphantomApp(initialState: any, onMutation: (type: string, detail: any) => Promise<void> = async () => {}) {
  const app = new Hono()
  const { cycle, entities, tracks, users } = initialState

  // Helper to get or create user
  const getUser = (address: string) => {
    if (!address) return null
    if (!users[address]) {
      users[address] = createDefaultUser(address)
    }
    return users[address]
  }

  app.get('/api/cycle', (c) => {
    return c.json(cycle)
  })

  app.get('/api/tracks', (c) => {
    return c.json(tracks)
  })

  app.get('/api/entities', (c) => {
    return c.json(entities)
  })

  app.get('/api/vault', (c) => {
    const address = c.req.query('address') || 'anonymous'
    const user = getUser(address)
    return c.json(user)
  })

  app.post('/api/vote/:trackId', async (c) => {
    const id = parseInt(c.req.param('trackId'))
    if (isNaN(id)) return c.json({ error: 'INVALID_TRACK_ID' }, 400)

    const body = await c.req.json().catch(() => ({}))
    const address = body.address || 'anonymous'
    const user = getUser(address)

    const track = tracks.find((t: any) => t.id === id)
    if (!track) return c.json({ error: 'TRACK_NOT_FOUND' }, 404)
    
    if (user.votes_this_cycle.includes(id)) {
      return c.json({ error: 'ALREADY_VOTED' }, 409)
    }

    track.votes += 1
    track.rep_weight += user.reputation
    user.votes_this_cycle.push(id)
    
    // Global cycle stats (simplified)
    cycle.current_voters++
    cycle.quorum_met = cycle.current_voters >= cycle.min_quorum
    
    await onMutation('vote', { address, trackId: id })
    return c.json({ ok: true, track, cycle, user })
  })

  app.post('/api/forge', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const ii = entities.find((e: any) => e.id === body.ii_id) || entities[0]
    
    const randomTrack = tracks[Math.floor(Math.random() * tracks.length)] || { url: '', embedUrl: '' }
    
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
      url: randomTrack.url,
      embedUrl: randomTrack.embedUrl
    }
    
    tracks.push(newTrack)
    await onMutation('forge', { track: newTrack })
    return c.json({ ok: true, track: newTrack })
  })

  return app
}
