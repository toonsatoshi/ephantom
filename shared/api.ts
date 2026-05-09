import { Hono } from 'hono'
import { StateRepository } from './repository'

/**
 * Validates Telegram Init Data.
 * Requires BOT_TOKEN from environment.
 */
async function validateTelegramData(initData: string, botToken: string): Promise<boolean> {
  if (!initData || !botToken) return false;
  
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    urlParams.sort();

    let dataCheckString = '';
    for (const [key, value] of urlParams.entries()) {
      dataCheckString += `${key}=${value}\n`;
    }
    dataCheckString = dataCheckString.slice(0, -1);

    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const baseKey = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(botToken));
    const finalKey = await crypto.subtle.importKey(
      'raw',
      baseKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', finalKey, encoder.encode(dataCheckString));
    
    const hexSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return hexSignature === hash;
  } catch (err) {
    return false;
  }
}

export function createEphantomApp(repo: StateRepository, onMutation: (type: string, detail: any) => Promise<void> = async () => {}) {
  const app = new Hono()

  // Optional Telegram Verification Middleware
  // app.use('/api/*', async (c, next) => {
  //   const botToken = c.env?.BOT_TOKEN;
  //   const initData = c.req.header('X-Telegram-Init-Data');
  //   if (botToken && initData) {
  //     const isValid = await validateTelegramData(initData, botToken);
  //     if (!isValid) return c.json({ error: 'UNAUTHORIZED_TELEGRAM' }, 401);
  //   }
  //   await next();
  // });

  app.get('/api/cycle', async (c) => {
    const cycle = await repo.getCycle()
    return c.json(cycle)
  })

  app.get('/api/tracks', async (c) => {
    const tracks = await repo.getTracks()
    return c.json(tracks)
  })

  app.get('/api/entities', async (c) => {
    const entities = await repo.getEntities()
    return c.json(entities)
  })

  app.get('/api/vault', async (c) => {
    const address = c.req.query('address') || 'anonymous'
    const user = await repo.getUser(address)
    return c.json(user)
  })

  app.post('/api/vote/:trackId', async (c) => {
    const id = parseInt(c.req.param('trackId'))
    if (isNaN(id)) return c.json({ error: 'INVALID_TRACK_ID' }, 400)

    const body = await c.req.json().catch(() => ({}))
    const address = body.address || 'anonymous'

    try {
      const result = await repo.vote(address, id)
      await onMutation('vote', { address, trackId: id })
      return c.json({ ok: true, ...result })
    } catch (err: any) {
      return c.json({ error: err.message }, 409)
    }
  })

  app.post('/api/forge', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const entities = await repo.getEntities()
    const tracks = await repo.getTracks()
    const cycle = await repo.getCycle()
    
    const ii = entities.find((e: any) => e.id === body.ii_id) || entities[0]
    const randomTrack = tracks[Math.floor(Math.random() * tracks.length)] || { url: '', embedUrl: '' }
    
    // Simple Validation
    const title = (body.title || 'UNTITLED_PHANTOM').toUpperCase().slice(0, 50)
    const bpm = Math.max(40, Math.min(250, parseInt(body.bpm) || 128))
    
    const newTrack = {
      id: tracks.length + 1,
      title: title,
      architect: 'usr_LOCAL',
      ii_id: ii.id,
      ii_name: ii.name,
      bpm: bpm,
      genre: body.genre || ii.genre_cluster.split('/')[0].trim(),
      theme: ii.lyrical_seeds.slice(0, 2).join(' / '),
      votes: 0,
      rep_weight: 0,
      cycle_id: cycle.id,
      duration: '?:??',
      url: randomTrack.url,
      embedUrl: randomTrack.embedUrl
    }
    
    const track = await repo.forge(newTrack)
    await onMutation('forge', { track })
    return c.json({ ok: true, track })
  })

  return app
}
