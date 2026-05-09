// ╔═══════════════════════════════════════════════════════════╗
// ║  EPHANTOM · Crowd-Controlled Emergent Music Synthesis     ║
// ║  Hardware OS — Genesis Build                              ║
// ╚═══════════════════════════════════════════════════════════╝

class EphantomOS {
  constructor() {
    // ── DOM refs ─────────────────────────────────────────────
    this.viewContainer = document.getElementById('game-view')
    this.shell          = document.getElementById('gameboy-shell')
    this.dpadContainer  = document.getElementById('dpad-container')
    this.powerLed       = document.getElementById('power-led')
    this.ledGlow        = document.getElementById('led-glow')
    this.bezelGlow      = document.getElementById('bezel-glow')
    this.reflection     = document.getElementById('glass-reflection')
    this.screen         = document.getElementById('screen')

    // ── System state ─────────────────────────────────────────
    this.currentState   = 'BOOTING'
    this.introStep      = 0
    this.introPhrases   = [
      { text: "EPHANTOM", font: "font-heading", size: "26px" },
      { text: "DOING MORE AND MORE WITH LESS AND LESS UNTIL WE CAN DO EVERYTHING WITH NOTHING", font: "font-sci", size: "8px" },
      { text: "THE DECENTRALIZED MUSIC REVOLUTION", font: "font-sci", size: "10px" },
      { text: "WE HOLD WEEKLY COMPETITIONS TO SEED NEW SOUNDS", font: "font-tech", size: "14px" },
      { text: "ARCHITECTS BATTLE FOR A SPOT IN THE NEXT RELEASE", font: "font-tech", size: "14px" },
      { text: "THE HIGHEST RATED TRACKS FORM CANONICAL ALBUMS", font: "font-tech", size: "14px" },
      { text: "YOUR INFLUENCE GROWS AS YOUR TASTE ALIGNS WITH SUCCESS", font: "font-tech", size: "14px" },
      { text: "AI CREATES THE SOUND. YOU DEFINE THE SOUL.", font: "font-heading", size: "16px" }
    ]
    this.introTimer     = null
    this.menuIndex      = 0
    this.menuOptions    = ['THE MATRIX', 'THE FORGE', 'ENTITIES', 'SYSTEM OVERVIEW', 'DAO ROSTER', 'THE VAULT', 'CONNECT WALLET']
    this.isBooted       = false
    this.bootLock       = false
    this.inputThrottle  = false
    this.audioCtx       = null
    this.batteryLevel   = 100
    this.isCharging     = false

    // ── Music Player state ────────────────────────────────────
    this.playerIndex    = 0
    this.isPlaying      = false
    this.audioElement   = new Audio()
    this.curationStatus = null // 'LIKED' | 'DISLIKED' | 'SKIPPED'

    // ── Slide state ──────────────────────────────────────────
    this.currentSlide   = 0
    this.totalSlides    = 9

    // ── Telegram / Wallet state ──────────────────────────────
    this.tg             = window.Telegram?.WebApp
    this.tonConnect     = null
    this.wallet         = null
    this.username       = this.tg?.initDataUnsafe?.user?.username || 'GUEST_USER'
    
    if (this.tg) {
      this.tg.expand()
      this.tg.ready()
    }

    // ── Protocol data ─────────────────────────────────────────
    this.cycle     = null   // current cycle
    this.tracks    = []     // submitted tracks
    this.entities  = []     // Instanced Identities
    this.vault     = null   // user reputation + royalties

    // ── THE MATRIX (voting) state ────────────────────────────
    this.matrixIndex   = 0
    this.matrixStatus  = null   // null | 'VOTED' | 'ALREADY_VOTED' | 'ERROR'
    this.votedIds      = new Set()

    // ── ROSTER state ──────────────────────────────────────────
    this.rosterIndex = 0

    // ── Touch state ──────────────────────────────────────────
    this.touchStartX = 0
    this.touchStartY = 0

    // ── THE VAULT state ───────────────────────────────────────
    this.vaultPage = 0  // 0=reputation  1=royalties  2=history

    // ── Three.js overlay ─────────────────────────────────────
    this.ghostMaterial = null
    this.renderer      = null

    this.init()
  }

  async init() {
    try {
      console.log("EPHANTOM_OS: INITIALIZING...")
      this.initTonConnect()
      this.initThreeJS()
      this.bindInputs()
      this.bindPhysicalSensors()
      this.initBatteryAPI()
      this.bootSequence()
      this.fetchAll() 
      this.updateScale()
      window.addEventListener('resize', () => this.updateScale())
    } catch (err) {
      console.error("OS_INIT_ERROR:", err)
    }
  }

  updateScale() {
    if (!this.shell) return
    const padding = 20
    const availableW = window.innerWidth - padding
    const availableH = window.innerHeight - padding
    const originalW = 634
    const originalH = 1155
    const scale = Math.min(availableW / originalW, availableH / originalH, 1.0)
    document.documentElement.style.setProperty('--gb-scale', scale)
  }

  async fetchAll() {
    try {
      const urls = ['/api/cycle', '/api/tracks', '/api/entities', '/api/vault']
      const results = await Promise.all(urls.map(url => fetch(url).then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))))
      this.cycle = results[0]; this.tracks = results[1]; this.entities = results[2]; this.vault = results[3]
      if (this.vault?.votes_this_cycle) this.vault.votes_this_cycle.forEach(id => this.votedIds.add(id))
    } catch (err) {
      console.warn("Backend offline — using stubs", err)
      this.cycle = this._stubCycle(); this.tracks = this._stubTracks(); this.entities = this._stubEntities(); this.vault = this._stubVault()
    }
    if (this.isBooted) this.render()
  }

  _stubCycle() { return { id: 1, phase: 'VOTING', current_voters: 0, min_quorum: 50, vote_end: Date.now() + 86400000, extensions: 0, max_extensions: 3, quorum_met: false, rep_decay_rate: 5 } }
  _stubTracks() { return [ { id: 101, title: 'GREEN NEEDLE', ii_name: 'JADE KAY', architect: 'usr_ALPHA', genre: 'R&B', bpm: 95, votes: 12, rep_weight: 12400, embedUrl: 'https://audius.co/embed/track/jadekay/green-needle?flavor=card' }, { id: 102, title: 'SILICON_SOUL', ii_name: 'JADE KAY', architect: 'usr_BETA', genre: 'EXPERIMENTAL', bpm: 82, votes: 8, rep_weight: 8900 } ] }
  _stubEntities() { return [ { id: 'II-JADEKAY', name: 'JADE KAY', genre_cluster: 'R&B / RAP / EXPERIMENTAL', bpm_range: [80, 110], lyrical_seeds: ['EPHANTOM', 'CYBERNETIC', 'REBIRTH'], releases: 4, active_curators: 128, seed_cycle: 1, status: 'ACTIVE', video: '/jadekay.mp4' } ] }
  _stubVault() { return { reputation: 1000, floor: 100, rep_decay_rate: 5, royalties_pending: 0.124, royalties_lifetime: 1.5, role: 'SENIOR_CURATOR', votes_this_cycle: [], alignment_history: [ { cycle: 4, aligned: true, track: 'VOID_WALKER', delta: 120 }, { cycle: 3, aligned: false, track: 'CYBER_FOLK', delta: -50 } ] } }

  initTonConnect() {
    try {
      if (typeof TonConnectSDK !== 'undefined') {
        this.tonConnect = new TonConnectSDK.TonConnect({ manifestUrl: 'https://ephantom-protocol.pages.dev/tonconnect-manifest.json' })
        this.tonConnect.onStatusChange(wallet => { this.wallet = wallet; if (wallet) { this._flash('CONNECTED'); this.beep(880, 0.2) } this.render() })
      }
    } catch (err) { console.warn("TON_INIT_ERROR:", err) }
  }

  async connectWallet() { if (!this.tonConnect) return; try { this.tonConnect.connect({ universalLink: 'https://t.me/wallet?attach=wallet', bridgeUrl: 'https://bridge.tonapi.io/bridge' }) } catch (err) { console.error("WALLET_CONNECT_ERROR:", err) } }

  bootSequence() {
    if (this.bootLock) return; this.bootLock = true
    setTimeout(() => { this.powerLed.classList.add('flicker'); setTimeout(() => { this.powerLed.classList.remove('flicker'); this.powerLed.classList.add('on'); if (this.ledGlow) this.ledGlow.style.opacity = '1'; if (this.bezelGlow) this.bezelGlow.style.opacity = '1'; this.startIntro() }, 800) }, 600)
  }

  startIntro() { this.currentState = 'INTRO'; this.introStep = 0; this.isBooted = true; this.runIntroCycle() }
  runIntroCycle() {
    if (this.currentState !== 'INTRO') return
    if (this.introStep >= this.introPhrases.length) { this.introTimer = null; this.currentState = 'SPLASH'; this.render(); return }
    this.render(); this.introTimer = setTimeout(() => { this.introStep++; this.runIntroCycle() }, 5000)
  }
  skipIntro() { if (this.introTimer) { clearTimeout(this.introTimer); this.introTimer = null } this.currentState = 'SPLASH'; this.render() }

  bindInputs() {
    const keys = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right', z:'a', x:'b', Z:'a', X:'b', Enter:'start', Shift:'select' }
    document.addEventListener('keydown', e => { const action = keys[e.key]; if (action) { e.preventDefault(); this.handleInput(action) } })
    ;['btn-up','btn-down','btn-left','btn-right','btn-a','btn-b','btn-start','btn-select'].forEach(id => {
      const el = document.getElementById(id); if (!el) return; const action = id.replace('btn-', '')
      el.addEventListener('mousedown', e => { e.preventDefault(); this.handleInput(action) }); el.addEventListener('touchstart', e => { e.preventDefault(); this.handleInput(action) }, { passive: false })
    })
    const screen = document.getElementById('screen-wrapper')
    if (screen) {
      screen.addEventListener('touchstart', e => { this.touchStartX = e.changedTouches[0].screenX; this.touchStartY = e.changedTouches[0].screenY }, { passive: true })
      screen.addEventListener('touchend', e => { const dx = e.changedTouches[0].screenX - this.touchStartX, dy = e.changedTouches[0].screenY - this.touchStartY; if (Math.abs(dx) > Math.abs(dy)) { if (Math.abs(dx) > 30) this.handleInput(dx > 0 ? 'right' : 'left') } else { if (Math.abs(dy) > 30) this.handleInput(dy > 0 ? 'down' : 'up') } }, { passive: true })
    }
  }

  handleInput(action) {
    if (!this.isBooted && action !== 'start') return; if (this.inputThrottle) return
    this.inputThrottle = true; setTimeout(() => this.inputThrottle = false, 80); this.haptic(['a','b','start'].includes(action) ? 'medium' : 'light'); this.applyPhysicalFeedback(action); this.initAudio()
    if (this.currentState === 'INTRO') { if (action === 'b' || action === 'start') { this.beep(440, 0.1); this.skipIntro() } return }
    if (this.currentState === 'SPLASH') { if (action === 'start' || action === 'a') { this.beep(660, 0.15); this.currentState = 'MENU' } }
    else if (this.currentState === 'MENU') { if (action === 'up') { this.menuIndex = (this.menuIndex - 1 + this.menuOptions.length) % this.menuOptions.length; this.beep(320,0.05) } if (action === 'down') { this.menuIndex = (this.menuIndex + 1) % this.menuOptions.length; this.beep(320,0.05) } if (action === 'a') { this.currentState = this.menuOptions[this.menuIndex]; this.beep(880,0.1) } }
    else if (this.currentState === 'CONNECT WALLET') { if (action === 'a') this.connectWallet(); if (action === 'b') this.currentState = 'MENU' }
    else { if (action === 'b') { this.currentState = 'MENU'; this.beep(220, 0.12); this._stopAudio() } else { this.routeInputToView(action) } }
    this.render()
  }

  _stopAudio() { this.isPlaying = false; this.audioElement.pause() }
  routeInputToView(action) {
    switch (this.currentState) {
      case 'THE MATRIX': this._matrixInput(action); break; case 'THE FORGE': this._playerInput(action); break
      case 'ENTITIES': this._rosterInput(action); break; case 'DAO ROSTER': this._daoRosterInput(action); break
      case 'THE VAULT': this._vaultInput(action); break; case 'SYSTEM OVERVIEW': this._slideInput(action); break
    }
  }

  _playerInput(action) { if (action === 'left') this._curate('DISLIKE'); if (action === 'right') this._curate('LIKE'); if (action === 'a') this._togglePlay(); if (action === 'up') this._nextTrack(); if (action === 'down') this._prevTrack() }
  _curate(dir) { this.curationStatus = dir === 'LIKE' ? 'LIKED' : 'DISLIKED'; this.beep(dir === 'LIKE' ? 880 : 220, 0.1); this.haptic(dir === 'LIKE' ? 'medium' : 'heavy'); setTimeout(() => { this.curationStatus = null; this._nextTrack(); this.render() }, 600); this.render() }
  _togglePlay() { this.isPlaying = !this.isPlaying; if (this.isPlaying) { this.audioElement.play().catch(e => console.warn("Audio blocked", e)); this.beep(660, 0.1) } else { this.audioElement.pause(); this.beep(440, 0.1) } }
  _nextTrack() { if (this.tracks.length) { this.playerIndex = (this.playerIndex + 1) % this.tracks.length; this._loadTrack() } }
  _prevTrack() { if (this.tracks.length) { this.playerIndex = (this.playerIndex - 1 + this.tracks.length) % this.tracks.length; this._loadTrack() } }
  _loadTrack() { const trk = this.tracks[this.playerIndex]; if (trk?.url) { this.audioElement.src = trk.url; if (this.isPlaying) this.audioElement.play().catch(e => console.warn("Audio blocked", e)) } }

  _matrixInput(action) { const total = this.tracks.length; if (action === 'left') this.matrixIndex = (this.matrixIndex - 1 + total) % total; if (action === 'right') this.matrixIndex = (this.matrixIndex + 1) % total; if (action === 'a') this._castVote() }
  async _castVote() {
    const trk = this.tracks[this.matrixIndex]; if (!trk || this.votedIds.has(trk.id)) return
    try { const res = await fetch(`/api/vote/${trk.id}`, { method: 'POST' }); const data = await res.json(); if (data.ok) { this.votedIds.add(trk.id); this._flash('SYNCED'); this.beep(1100, 0.25, 'triangle') } } catch { this.votedIds.add(trk.id); trk.votes += 1; this._flash('SYNCED'); this.beep(1100, 0.25, 'triangle') }
    this.render()
  }

  _flash(status) { this.matrixStatus = status; this.render(); setTimeout(() => { this.matrixStatus = null; this.render() }, 1100) }
  _rosterInput(action) { const total = this.entities.length; if (action === 'left') this.rosterIndex = (this.rosterIndex - 1 + total) % total; if (action === 'right') this.rosterIndex = (this.rosterIndex + 1) % total }
  _daoRosterInput(action) {}
  _vaultInput(action) { if (action === 'left') this.vaultPage = Math.max(0, this.vaultPage - 1); if (action === 'right') this.vaultPage = Math.min(2, this.vaultPage + 1) }
  _slideInput(action) { if (action === 'left') this.currentSlide = Math.max(0, this.currentSlide - 1); if (action === 'right') this.currentSlide = Math.min(this.totalSlides - 1, this.currentSlide + 1) }

  render() {
    if (!this.viewContainer || !this.isBooted) return; this.viewContainer.innerHTML = ''
    if (this.ghostMaterial) this.ghostMaterial.opacity = this.batteryLevel < 10 ? 0.2 : 0.05
    switch (this.currentState) {
      case 'INTRO': this._renderIntro(); break; case 'SPLASH': this._renderSplash(); break; case 'MENU': this._renderMenu(); break
      case 'THE MATRIX': this._renderMatrix(); break; case 'THE FORGE': this._renderPlayer(); break; case 'ENTITIES': this._renderRoster(); break
      case 'DAO ROSTER': this._renderDaoRoster(); break; case 'THE VAULT': this._renderVault(); break
      case 'CONNECT WALLET': this._renderConnectWallet(); break; case 'SYSTEM OVERVIEW': this._renderSlides(); break
      default: this._renderSplash(); break
    }
  }

  _renderIntro() { const item = this.introPhrases[this.introStep] || { text: "", font: "font-tech", size: "10px" }; this.viewContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-[#8bac0f] p-4 text-center"><div class="cinematic-text ${item.font} font-bold tracking-tight leading-tight drop-shadow-lg" style="font-size: ${item.size}">${item.text}</div><div class="absolute bottom-4 text-[10px] font-retro opacity-20 fade-in">[B] SKIP INTRO</div></div>` }
  _renderSplash() { this.viewContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-[#8bac0f] p-3 text-center"><div class="text-[24px] font-heading tracking-tight leading-none mb-3 drop-shadow-lg">EPHANTOM</div><div class="text-[10px] font-tech leading-tight opacity-95 mb-4 px-1 max-w-[90%] font-bold">DECENTRALIZED AUTONOMOUS MUSIC LABEL</div><div class="text-[7px] font-mono opacity-80 mb-4 border-y border-[#8bac0f]/20 py-2 px-1">AI SYNTHESIZES. HUMANS CURATE.<br>EVOLVE THE IDENTITY.</div><div class="text-[5px] font-sci opacity-60 mb-4 uppercase tracking-[0.1em] leading-relaxed italic max-w-[80%]">"Doing more and more with less and less until we can do everything with nothing"</div><div class="mt-4 animate-pulse bg-[#8bac0f] text-[#050c05] px-4 py-2 text-[10px] border-2 border-[#fff] font-retro">PRESS START</div><div class="mt-4 text-[10px] font-retro opacity-30 tracking-widest flex flex-col gap-1"><span>DAO_ROSTER: @zalgorythms</span><span>ESTD. 2026</span></div></div>` }
  _renderMenu() {
    const cycle = this.cycle || this._stubCycle(); this.viewContainer.innerHTML = `<div class="w-full p-2 text-[#8bac0f] font-tech"><div class="text-[7px] font-retro border-b-2 border-[#8bac0f]/20 mb-2 pb-1 flex justify-between items-center"><span>ROOT_SYS</span><span>CYC#${cycle.id}·${cycle.phase}</span></div><div class="space-y-1">${this.menuOptions.map((opt, i) => `<div class="px-2 py-1 text-[10px] font-heading flex justify-between items-center ${this.menuIndex === i ? 'selected' : ''}"><span>${opt}</span>${this.menuIndex === i ? '<span class="text-[10px]">▶</span>' : ''}</div>`).join('')}</div><div class="mt-3 text-[10px] font-retro opacity-40 flex justify-between border-t border-[#8bac0f]/10 pt-2"><span>BATT:${this.batteryLevel}%</span><span>REP:${this.vault ? this.vault.reputation : '...'}</span></div></div>`
  }

  _renderMatrix() {
    const tracks = this.tracks.length ? this.tracks : this._stubTracks(), trk = tracks[this.matrixIndex], cycle = this.cycle || this._stubCycle()
    this.viewContainer.innerHTML = `<div class="w-full h-full p-2 flex flex-col text-[#8bac0f] relative font-tech"><div class="text-[10px] font-retro border-b border-[#8bac0f]/20 pb-1 mb-2 flex justify-between"><span>CYC#${cycle.id}</span><span>VOTE</span></div><div class="matrix-card flex-1 flex flex-col p-2 bg-[#8bac0f]/5 relative"><div class="text-[7px] font-retro opacity-50 mb-1">[${this.matrixIndex+1}/${tracks.length}]</div><div class="text-[12px] font-heading leading-tight mb-2">${trk.title}</div><div class="text-[10px] font-mono opacity-60">${trk.ii_name}</div><div class="mt-auto text-[7px] font-mono flex justify-between opacity-70"><span>BY ${trk.architect?.slice(0,10)}</span><span>▲${trk.votes}</span></div></div><div class="mt-2 text-[10px] font-retro flex justify-between items-center">${this.votedIds.has(trk.id) ? '✓ VOTE_CAST' : '<span class="animate-pulse">[A] VOTE</span>'}</div>${this.matrixStatus ? `<div class="absolute inset-0 flex items-center justify-center z-10"><div class="stamp-animation border-4 border-[#8bac0f] px-3 py-2 bg-[#050c05] font-heading text-[10px] -rotate-12">${this.matrixStatus}</div></div>` : ''}</div>`
  }

  _renderPlayer() {
    const tracks = this.tracks.length ? this.tracks : this._stubTracks(), trk = tracks[this.playerIndex]
    this.viewContainer.innerHTML = `<div class="w-full h-full p-0 flex flex-col text-[#8bac0f] font-tech relative overflow-hidden">${trk.embedUrl ? `<iframe src="${trk.embedUrl}" width="100%" height="100%" allow="encrypted-media" style="border: none; background: #000;"></iframe>` : `<div class="p-2 flex flex-col h-full"><div class="text-[14px] font-heading mb-1">${trk.title}</div><div class="text-[10px] font-mono opacity-60">${trk.ii_name}</div></div>`}${this.curationStatus ? `<div class="absolute inset-0 flex items-center justify-center z-[100] bg-[#050c05]/80 pointer-events-none"><div class="stamp-animation border-4 border-[#8bac0f] px-4 py-2 bg-[#050c05] font-heading text-[12px] -rotate-12">${this.curationStatus}</div></div>` : ''}<div class="absolute top-1 left-1 right-1 flex justify-between pointer-events-none z-40 text-[6px] font-retro opacity-30"><span>[${this.playerIndex + 1}/${tracks.length}] THE FORGE</span><span>◀ DISLIKE / LIKE ▶</span></div></div>`
  }

  _renderRoster() { const ents = this.entities.length ? this.entities : this._stubEntities(), ent = ents[this.rosterIndex]; this.viewContainer.innerHTML = `<div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech"><div class="text-[10px] font-retro border-b border-[#8bac0f]/20 pb-1 mb-2 flex justify-between"><span>II_REGISTRY</span><span>[${this.rosterIndex+1}/${ents.length}]</span></div><div class="matrix-card p-2 flex-1 flex flex-col bg-[#8bac0f]/5"><div class="text-[12px] font-heading mt-1">${ent.name}</div><div class="text-[10px] mt-1 font-tech leading-tight opacity-80">${ent.genre_cluster}</div></div></div>` }
  _renderDaoRoster() { this.viewContainer.innerHTML = `<div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech"><div class="text-[10px] font-retro border-b border-[#8bac0f]/20 pb-1 mb-2">DAO_MEMBERS</div><div class="matrix-card p-2 bg-[#8bac0f]/10 mt-2"><div class="text-[11px] font-heading">@zalgorythms</div></div><div class="matrix-card p-2 mt-2"><div class="text-[11px] font-heading text-blue-400">@${this.username}</div></div></div>` }
  _renderVault() { const v = this.vault || this._stubVault(); this.viewContainer.innerHTML = `<div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech"><div class="text-[10px] font-retro border-b border-[#8bac0f]/20 pb-1 mb-2">THE VAULT</div><div class="bg-[#050c05] text-[#8bac0f] text-center py-4 border-2 border-[#8bac0f]/20"><div class="text-[24px] font-heading">${v.reputation.toLocaleString()}</div><div class="text-[7px] font-retro mt-1">REP</div></div></div>` }
  _renderConnectWallet() { const isConnected = !!this.wallet; this.viewContainer.innerHTML = `<div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech"><div class="text-[10px] font-retro border-b border-[#8bac0f]/20 pb-1 mb-3">WALLET_BRIDGE</div><div class="flex-1 flex flex-col justify-center items-center text-center">${isConnected ? `<div class="text-[14px] font-heading mb-2">CONNECTED</div>` : `<div class="bg-[#050c05] text-[#8bac0f] px-3 py-1.5 text-[10px] font-retro border-2 border-white animate-pulse">[A] CONNECT</div>`}</div></div>` }
  _renderSlides() { const s = [ { title: 'THE CURATOR', body: "You're a decision-maker." } ][this.currentSlide] || { title: 'END', body: 'End of slides' }; this.viewContainer.innerHTML = `<div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech"><div class="text-[14px] font-heading mb-1">${s.title}</div><div class="text-[7px] leading-relaxed opacity-90">${s.body}</div></div>` }

  initThreeJS() {
    const canvas = document.getElementById('screen-canvas'), container = document.getElementById('screen-wrapper'); if (!canvas || !container) return
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false }); this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000); this.camera.position.z = 1
    this.ghostMaterial = new THREE.MeshBasicMaterial({ color: 0x306230, transparent: true, opacity: 0.05 }); this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.ghostMaterial))
    const animate = () => { requestAnimationFrame(animate); if (this.isBooted) { this.renderer.render(this.scene, this.camera) } }; animate()
  }

  async initBatteryAPI() { if (typeof navigator !== 'undefined' && 'getBattery' in navigator) { const b = await navigator.getBattery(); const u = () => { this.batteryLevel = Math.round(b.level * 100); this.render() }; b.addEventListener('levelchange', u); u() } }
  bindPhysicalSensors() { document.addEventListener('mousemove', e => { this.updateOpticalShift((e.clientX / window.innerWidth - 0.5) * 30, (e.clientY / window.innerHeight - 0.5) * 30) }) }
  updateOpticalShift(x, y) { if (this.shell && !this.inputThrottle) this.shell.style.transform = `scale(var(--gb-scale)) rotateY(${x * 0.1}deg) rotateX(${-y * 0.1}deg)` }
  initAudio() { if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (this.audioCtx.state === 'suspended') this.audioCtx.resume() }
  beep(freq = 440, duration = 0.1) { this.initAudio(); if (!this.audioCtx || this.audioCtx.state !== 'running') return; const o = this.audioCtx.createOscillator(), g = this.audioCtx.createGain(); o.type = 'square'; o.frequency.setValueAtTime(freq, this.audioCtx.currentTime); g.gain.setValueAtTime(0.04, this.audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration); o.connect(g); g.connect(this.audioCtx.destination); o.start(); o.stop(this.audioCtx.currentTime + duration) }
  haptic(p = 'light') { if (typeof navigator !== 'undefined' && navigator.vibrate) ({ light: () => navigator.vibrate(10), medium: () => navigator.vibrate(35), heavy: () => navigator.vibrate([60,30,60]) })[p]?.() }
  applyPhysicalFeedback(action) { if (!this.shell) return; this.shell.style.transform = `scale(var(--gb-scale)) rotateX(0.5deg)`; setTimeout(() => { if (this.shell) this.shell.style.transform = 'scale(var(--gb-scale))' }, 150) }
}

function startOS() { if (!window.os) window.os = new EphantomOS() }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startOS); else startOS()
