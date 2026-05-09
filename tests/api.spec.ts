import { createEphantomApp } from '../shared/api'
import { createInitialState } from '../shared/state'

describe('EPHANTOM API Integration', () => {
  let app: any
  let state: any

  beforeEach(() => {
    state = createInitialState([
      { id: 1, title: 'Track 1', votes: 10, url: 'url1', embedUrl: 'embed1' }
    ])
    app = createEphantomApp(state)
  })

  it('should load tracks from API', async () => {
    const res = await app.request('/api/tracks')
    const tracks = await res.json()
    expect(res.status).toBe(200)
    expect(tracks.length).toBe(1)
    expect(tracks[0].title).toBe('Track 1')
  })

  it('should increment vote count', async () => {
    const address = 'test-addr'
    const res = await app.request('/api/vote/1', {
      method: 'POST',
      body: JSON.stringify({ address }),
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.track.votes).toBe(11)
    expect(state.users[address].votes_this_cycle).toContain(1)
  })

  it('should prevent double voting', async () => {
    const address = 'test-addr'
    await app.request('/api/vote/1', {
      method: 'POST',
      body: JSON.stringify({ address }),
      headers: { 'Content-Type': 'application/json' }
    })
    const res = await app.request('/api/vote/1', {
      method: 'POST',
      body: JSON.stringify({ address }),
      headers: { 'Content-Type': 'application/json' }
    })
    expect(res.status).toBe(409)
  })

  it('should forge a playable track', async () => {
    const res = await app.request('/api/forge', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Track' }),
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.track.title).toBe('New Track')
    expect(data.track.url).toBeDefined()
    expect(data.track.embedUrl).toBeDefined()
  })
})
