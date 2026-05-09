import { serveStatic } from 'hono/cloudflare-workers'
import { createEphantomApp } from '../shared/api'
import { createInitialState } from '../shared/state'
import initialTracks from '../data/sample-tracks.json'

const state = createInitialState(initialTracks)
const app = createEphantomApp(state)

// Serve static files
app.use('/*', serveStatic({ root: './public' }))

export default app
