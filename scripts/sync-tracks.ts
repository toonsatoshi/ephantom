import fs from 'fs/promises';

const USER_ID = '92jEkbO';
const APP_NAME = 'EPHANTOM';

async function sync() {
  try {
    console.log('Fetching tracks from Audius...');
    const response = await fetch(`https://api.audius.co/v1/users/${USER_ID}/tracks?app_name=${APP_NAME}&limit=100`);
    const json = await response.json() as any;
    const audiusTracks = json.data;

    const mappedTracks = audiusTracks.map((t: any, index: number) => ({
      id: index + 1,
      title: t.title.toUpperCase(),
      architect: 'usr_JADE',
      ii_id: 'II-JADEKAY',
      ii_name: 'jadekay',
      bpm: t.bpm || 95,
      genre: t.genre || 'Electronic',
      theme: (t.tags || 'EPHANTOM / CYBERNETIC').split(',').slice(0, 2).join(' / ').toUpperCase(),
      votes: Math.floor(Math.random() * 100),
      rep_weight: 0,
      cycle_id: 1,
      duration: Math.floor(t.duration / 60) + ':' + (t.duration % 60).toString().padStart(2, '0'),
      url: `https://audius.co${t.permalink}`,
      embedUrl: `https://audius.co/embed/track/${t.id}?flavor=card`
    }));

    await fs.writeFile('data/sample-tracks.json', JSON.stringify(mappedTracks, null, 2));
    console.log(`Successfully synced ${mappedTracks.length} tracks to data/sample-tracks.json`);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

sync();
