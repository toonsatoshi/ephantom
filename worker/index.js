import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { createEphantomApp } from '../shared/api'
import { createInitialState } from '../shared/state'
import { KVRepository } from '../shared/repository'
import initialTracks from '../data/sample-tracks.json'

const app = new Hono()

// API Routes
app.all('/api/*', async (c) => {
  // Use KV for state persistence in production
  // Falls back to initialState if KV is empty
  const repo = new KVRepository(
    c.env.EPHANTOM_KV, 
    createInitialState(initialTracks)
  )
  const apiApp = createEphantomApp(repo)
  return apiApp.fetch(c.req.raw, c.env, c.executionCtx)
})

// Serve static files
// In Cloudflare Workers, assets are typically handled by the 'assets' config in wrangler.json
// but we keep this for compatibility with the Hono routing model.
app.use('/*', serveStatic())

export default app
