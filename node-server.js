import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import fs from 'fs/promises'
import { createEphantomApp } from './shared/api'
import { createInitialState } from './shared/state'
import { InMemoryRepository } from './shared/repository'

const STATE_FILE = './data/state.json'
const SAMPLE_TRACKS_FILE = './data/sample-tracks.json'

async function loadState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    let initialTracks = []
    try {
      const data = await fs.readFile(SAMPLE_TRACKS_FILE, 'utf-8')
      initialTracks = JSON.parse(data)
    } catch (err) {
      console.error("No sample tracks found, starting empty.")
    }
    return createInitialState(initialTracks)
  }
}

const initialState = await loadState()
const repo = new InMemoryRepository(initialState)

const saveState = async () => {
  try {
    await fs.writeFile(STATE_FILE, JSON.stringify(repo.getState(), null, 2))
    console.log('State persisted to disk.')
  } catch (err) {
    console.error('Failed to save state:', err)
  }
}

const app = createEphantomApp(repo, async (type, detail) => {
  console.log(`Mutation: ${type}`, detail)
  await saveState()
})

// Serve static files
app.use('/*', serveStatic({ root: './public' }))

const port = 8001
console.log(`Server is running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port
})
