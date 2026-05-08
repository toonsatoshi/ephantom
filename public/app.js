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

    // ── THE FORGE (submission) state ─────────────────────────
    this.forgeStep    = 0      // 0=select_ii  1=bpm  2=genre  3=confirm  4=result
    this.forgeIIIndex = 0      // index into entities[]
    this.forgeBPM     = 128
    this.forgeBPMStep = 4
    this.forgeGenreIndex = 0
    this.forgeGenres  = ['DARK TECHNO','HYPERPOP','AMBIENT','BREAKCORE','GLITCH','INDUSTRIAL','DRUM&BASS','DRONE']
    this.forgeResult  = null   // null | { ok, track } | { error }
    this.forgePending = false

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

  // ═══════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════

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
    } catch (err) {
      console.error("OS_INIT_ERROR:", err)
    }
  }

  async fetchAll() {
    try {
      const urls = ['/api/cycle', '/api/tracks', '/api/entities', '/api/vault']
      const results = await Promise.all(urls.map(url => 
        fetch(url).then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      ))
      this.cycle    = results[0]
      this.tracks   = results[1]
      this.entities = results[2]
      this.vault    = results[3]
      if (this.vault && this.vault.votes_this_cycle) {
        this.vault.votes_this_cycle.forEach(id => this.votedIds.add(id))
      }
    } catch (err) {
      console.warn("Backend offline or error — using stubs", err)
      this.cycle    = this._stubCycle()
      this.tracks   = this._stubTracks()
      this.entities = this._stubEntities()
      this.vault    = this._stubVault()
    }
    if (this.isBooted) this.render()
  }

  // ── Offline stubs ─────────────────────────────────────────

  _stubCycle() {
    return {
      id: 1, phase: 'VOTING', current_voters: 0, min_quorum: 50,
      vote_end: Date.now() + 86400000, extensions: 0, max_extensions: 3,
      quorum_met: false, rep_decay_rate: 5,
    }
  }
  _stubTracks() {
    return [
      { id: 101, title: 'NEURAL_STORM', ii_name: 'JADE KAY', architect: 'usr_ALPHA', genre: 'GLITCH', bpm: 95, votes: 12, rep_weight: 12400 },
      { id: 102, title: 'SILICON_SOUL', ii_name: 'JADE KAY', architect: 'usr_BETA', genre: 'AMBIENT', bpm: 82, votes: 8, rep_weight: 8900 }
    ]
  }
  _stubEntities() {
    return [
      {
        id: 'II-JADEKAY',
        name: 'JADE KAY',
        genre_cluster: 'NEO-SOUL / GLITCH / AMBIENT',
        bpm_range: [80, 110],
        lyrical_seeds: ['EPHANTOM', 'CYBERNETIC', 'REBIRTH'],
        releases: 4,
        active_curators: 128,
        seed_cycle: 1,
        status: 'ACTIVE',
        video: '/jadekay.mp4'
      }
    ]
  }
  _stubVault() {
    return {
      reputation: 1000, floor: 100, rep_decay_rate: 5,
      royalties_pending: 0.124, royalties_lifetime: 1.5,
      role: 'SENIOR_CURATOR', votes_this_cycle: [],
      alignment_history: [
        { cycle: 4, aligned: true, track: 'VOID_WALKER', delta: 120 },
        { cycle: 3, aligned: false, track: 'CYBER_FOLK', delta: -50 }
      ],
    }
  }

  // ═══════════════════════════════════════════════════════════
  // BOOT
  // ═══════════════════════════════════════════════════════════

  initTonConnect() {
    try {
      if (typeof TonConnectSDK !== 'undefined') {
        this.tonConnect = new TonConnectSDK.TonConnect({
          manifestUrl: 'https://ephantom-protocol.pages.dev/tonconnect-manifest.json'
        })
        this.tonConnect.onStatusChange(wallet => {
          this.wallet = wallet
          if (wallet) {
            this._flash('WALLET_CONNECTED')
            this.beep(880, 0.2)
          }
          this.render()
        })
      }
    } catch (err) {
      console.warn("TON_CONNECT_INIT_ERROR:", err)
    }
  }

  async connectWallet() {
    if (!this.tonConnect) return
    try {
      const walletConnectionSource = {
        universalLink: 'https://t.me/wallet?attach=wallet',
        bridgeUrl: 'https://bridge.tonapi.io/bridge'
      }
      this.tonConnect.connect(walletConnectionSource)
    } catch (err) {
      console.error("WALLET_CONNECT_ERROR:", err)
    }
  }

  bootSequence() {
    if (this.bootLock) return
    this.bootLock = true
    setTimeout(() => {
      this.powerLed.classList.add('flicker')
      setTimeout(() => {
        this.powerLed.classList.remove('flicker')
        this.powerLed.classList.add('on')
        if (this.ledGlow)  this.ledGlow.style.opacity  = '1'
        if (this.bezelGlow) this.bezelGlow.style.opacity = '1'
        this.startIntro()
      }, 800)
    }, 600)
  }

  startIntro() {
    this.currentState = 'INTRO'
    this.introStep = 0
    this.isBooted = true
    this.runIntroCycle()
  }

  runIntroCycle() {
    if (this.currentState !== 'INTRO') return
    if (this.introStep >= this.introPhrases.length) {
      this.currentState = 'SPLASH'
      this.render()
      return
    }
    this.render()
    this.introTimer = setTimeout(() => {
      this.introStep++
      this.runIntroCycle()
    }, 5000)
  }

  skipIntro() {
    if (this.introTimer) clearTimeout(this.introTimer)
    this.currentState = 'SPLASH'
    this.render()
  }

  // ═══════════════════════════════════════════════════════════
  // INPUT
  // ═══════════════════════════════════════════════════════════

  bindInputs() {
    const keys = {
      ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right',
      z:'a', x:'b', Z:'a', X:'b', Enter:'start', Shift:'select',
    }
    document.addEventListener('keydown', e => {
      const action = keys[e.key]
      if (action) { e.preventDefault(); this.handleInput(action) }
    })
    ;['btn-up','btn-down','btn-left','btn-right','btn-a','btn-b','btn-start','btn-select'].forEach(id => {
      const el = document.getElementById(id)
      if (!el) return
      const action = id.replace('btn-', '')
      el.addEventListener('mousedown', e => { e.preventDefault(); this.handleInput(action) })
      el.addEventListener('touchstart', e => { e.preventDefault(); this.handleInput(action) }, { passive: false })
    })

    // Swipe Navigation for Screen
    const screen = document.getElementById('screen-wrapper')
    if (screen) {
      screen.addEventListener('touchstart', e => {
        this.touchStartX = e.changedTouches[0].screenX
        this.touchStartY = e.changedTouches[0].screenY
      }, { passive: true })
      screen.addEventListener('touchend', e => {
        const x = e.changedTouches[0].screenX
        const y = e.changedTouches[0].screenY
        const dx = x - this.touchStartX
        const dy = y - this.touchStartY
        if (Math.abs(dx) > Math.abs(dy)) {
          if (Math.abs(dx) > 30) this.handleInput(dx > 0 ? 'right' : 'left')
        } else {
          if (Math.abs(dy) > 30) this.handleInput(dy > 0 ? 'down' : 'up')
        }
      }, { passive: true })
    }
  }

  handleInput(action) {
    if (!this.isBooted && action !== 'start') return
    if (this.inputThrottle) return
    this.inputThrottle = true
    setTimeout(() => this.inputThrottle = false, 80)
    this.haptic(['a','b','start'].includes(action) ? 'medium' : 'light')
    this.applyPhysicalFeedback(action)
    this.initAudio()

    if (this.currentState === 'INTRO') {
      if (action === 'b' || action === 'start') {
        this.beep(440, 0.1)
        this.skipIntro()
      }
      return
    }

    if (this.currentState === 'SPLASH') {
      if (action === 'start' || action === 'a') {
        this.beep(660, 0.15)
        this.currentState = 'MENU'
      }
    } else if (this.currentState === 'MENU') {
      if (action === 'up')   { this.menuIndex = (this.menuIndex - 1 + this.menuOptions.length) % this.menuOptions.length; this.beep(320,0.05) }
      if (action === 'down') { this.menuIndex = (this.menuIndex + 1) % this.menuOptions.length; this.beep(320,0.05) }
      if (action === 'a')    { this.currentState = this.menuOptions[this.menuIndex]; this.beep(880,0.1) }
    } else if (this.currentState === 'CONNECT WALLET') {
      if (action === 'a') { this.connectWallet() }
      if (action === 'b') { this.currentState = 'MENU' }
    } else {
      if (action === 'b' && !this._forgeIsDeep()) {
        this.currentState = 'MENU'
        this.beep(220, 0.12)
        this._resetForge()
      } else {
        this.routeInputToView(action)
      }
    }
    this.render()
  }

  _forgeIsDeep() {
    return this.currentState === 'THE FORGE' && this.forgeStep > 0 && this.forgeStep < 4
  }

  routeInputToView(action) {
    switch (this.currentState) {
      case 'THE MATRIX': this._matrixInput(action); break
      case 'THE FORGE':  this._forgeInput(action);  break
      case 'ENTITIES':     this._rosterInput(action); break
      case 'DAO ROSTER': this._daoRosterInput(action); break
      case 'THE VAULT':  this._vaultInput(action);  break
      case 'SYSTEM OVERVIEW': this._slideInput(action); break
      }
      }

      _slideInput(action) {
      if (action === 'left')  this.currentSlide = Math.max(0, this.currentSlide - 1)
      if (action === 'right') this.currentSlide = Math.min(this.totalSlides - 1, this.currentSlide + 1)
      }

  _matrixInput(action) {
    const total = this.tracks.length
    if (action === 'left')  this.matrixIndex = (this.matrixIndex - 1 + total) % total
    if (action === 'right') this.matrixIndex = (this.matrixIndex + 1) % total
    if (action === 'a')     this._castVote()
  }

  async _castVote() {
    const trk = this.tracks[this.matrixIndex]
    if (!trk) return
    if (this.votedIds.has(trk.id)) {
      this._flash('ALREADY_VOTED')
      this.beep(160, 0.2, 'sawtooth')
      return
    }
    try {
      const res = await fetch(`/api/vote/${trk.id}`, { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        this.votedIds.add(trk.id)
        const local = this.tracks.find(t => t.id === trk.id)
        if (local) { local.votes = data.track.votes; local.rep_weight = data.track.rep_weight }
        if (data.cycle) { this.cycle.current_voters = data.cycle.current_voters; this.cycle.quorum_met = data.cycle.quorum_met }
        this._flash('SYNCED')
        this.beep(1100, 0.25, 'triangle')
      } else {
        this._flash(data.error || 'ERROR')
        this.beep(160, 0.2, 'sawtooth')
      }
    } catch {
      this.votedIds.add(trk.id)
      trk.votes += 1
      if (this.cycle) this.cycle.current_voters = Math.min((this.cycle.current_voters||38)+1, 60)
      this._flash('SYNCED')
      this.beep(1100, 0.25, 'triangle')
    }
  }

  _flash(status) {
    this.matrixStatus = status
    this.render()
    setTimeout(() => { this.matrixStatus = null; this.render() }, 1100)
  }

  _forgeInput(action) {
    if (this.forgePending) return
    const ents = this.entities.length ? this.entities : this._stubEntities()
    const ii   = ents[this.forgeIIIndex] || ents[0]
    switch (this.forgeStep) {
      case 0:
        if (action === 'left')  this.forgeIIIndex = (this.forgeIIIndex - 1 + ents.length) % ents.length
        if (action === 'right') this.forgeIIIndex = (this.forgeIIIndex + 1) % ents.length
        if (action === 'a')     { this.forgeBPM = ii.bpm_range[0]; this.forgeStep = 1; this.beep(660,0.1) }
        break
      case 1:
        if (action === 'up')    this.forgeBPM = Math.min(this.forgeBPM + this.forgeBPMStep, ii.bpm_range[1])
        if (action === 'down')  this.forgeBPM = Math.max(this.forgeBPM - this.forgeBPMStep, ii.bpm_range[0])
        if (action === 'a')     { this.forgeStep = 2; this.beep(660,0.1) }
        if (action === 'b')     { this.forgeStep = 0; this.beep(220,0.08) }
        break
      case 2:
        if (action === 'up')    this.forgeGenreIndex = (this.forgeGenreIndex - 1 + this.forgeGenres.length) % this.forgeGenres.length
        if (action === 'down')  this.forgeGenreIndex = (this.forgeGenreIndex + 1) % this.forgeGenres.length
        if (action === 'a')     { this.forgeStep = 3; this.beep(660,0.1) }
        if (action === 'b')     { this.forgeStep = 1; this.beep(220,0.08) }
        break
      case 3:
        if (action === 'a')     this._submitForge()
        if (action === 'b')     { this.forgeStep = 2; this.beep(220,0.08) }
        break
      case 4:
        if (action === 'a' || action === 'b') this._resetForge()
        break
    }
  }

  async _submitForge() {
    this.forgePending = true
    this.forgeStep = 'LOADING'
    this.render()
    const ents = this.entities.length ? this.entities : this._stubEntities()
    const ii   = ents[this.forgeIIIndex] || ents[0]
    const genre = this.forgeGenres[this.forgeGenreIndex]
    const payload = {
      ii_id: ii.id,
      bpm: this.forgeBPM,
      genre: genre,
      title: `${genre.replace(/\s/g,'_')}_${Date.now().toString(36).toUpperCase().slice(-4)}`,
    }
    try {
      const res = await fetch('/api/forge', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      this.forgeResult = data
      if (data.ok) {
        this.tracks.push(data.track)
        this.beep(880, 0.3, 'triangle')
        setTimeout(() => this.beep(1100, 0.15, 'triangle'), 300)
      }
    } catch {
      this.forgeResult = { ok: true, track: { ...payload, id: Date.now(), votes:0, ii_name: ii.name, cycle_id: this.cycle?.id || 7, architect: 'usr_LOCAL', rep_weight: 0 } }
      this.tracks.push(this.forgeResult.track)
      this.beep(880, 0.3, 'triangle')
    }
    this.forgePending = false
    this.forgeStep = 4
    this.render()
  }

  _resetForge() {
    this.forgeStep = 0
    this.forgeResult = null
    this.forgePending = false
    this.forgeGenreIndex = 0
  }

  _rosterInput(action) {
    const total = this.entities.length
    if (action === 'left')  this.rosterIndex = (this.rosterIndex - 1 + total) % total
    if (action === 'right') this.rosterIndex = (this.rosterIndex + 1) % total
  }

  _vaultInput(action) {
    if (action === 'left')  this.vaultPage = Math.max(0, this.vaultPage - 1)
    if (action === 'right') this.vaultPage = Math.min(2, this.vaultPage + 1)
  }

  render() {
    try {
      if (!this.viewContainer || !this.isBooted) return
      this.viewContainer.innerHTML = ''
      if (this.ghostMaterial) this.ghostMaterial.opacity = this.batteryLevel < 10 ? 0.2 : 0.05

      switch (this.currentState) {
        case 'INTRO':        this._renderIntro();   break
        case 'SPLASH':       this._renderSplash();  break
        case 'MENU':         this._renderMenu();    break
        case 'THE MATRIX':  this._renderMatrix();  break
        case 'THE FORGE':   this._renderForge();   break
        case 'ENTITIES':     this._renderRoster();  break
        case 'DAO ROSTER':   this._renderDaoRoster(); break
        case 'THE VAULT':   this._renderVault();   break
        case 'CONNECT WALLET': this._renderConnectWallet(); break
        case 'SYSTEM OVERVIEW': this._renderSlides(); break
      }
    } catch (err) {
      console.error("OS_RENDER_ERROR:", err)
    }
  }

  _renderIntro() {
    const item = this.introPhrases[this.introStep] || { text: "", font: "font-tech", size: "10px" }
    this.viewContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-[#8bac0f] p-4 text-center">
        <div class="cinematic-text ${item.font} font-bold tracking-tight leading-tight drop-shadow-lg" style="font-size: ${item.size}">
          ${item.text}
        </div>
        <div class="absolute bottom-4 text-[10px] font-retro opacity-20 fade-in">[B] SKIP INTRO</div>
      </div>`
  }

  _renderSplash() {
    this.viewContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-[#8bac0f] p-3 text-center">
        <div class="text-[24px] font-heading tracking-tight leading-none mb-3 drop-shadow-lg">EPHANTOM</div>
        <div class="text-[10px] font-tech leading-tight opacity-95 mb-4 px-1 max-w-[90%] font-bold">
          DECENTRALIZED AUTONOMOUS MUSIC LABEL
        </div>
        <div class="text-[7px] font-mono opacity-80 mb-4 border-y border-[#040a04]/20 py-2 px-1">
          AI SYNTHESIZES. HUMANS CURATE.<br>EVOLVE THE IDENTITY.
        </div>
        <div class="text-[5px] font-sci opacity-60 mb-4 uppercase tracking-[0.1em] leading-relaxed italic max-w-[80%]">
          "Doing more and more with less and less until we can do everything with nothing"
        </div>
        <div class="mt-4 animate-pulse bg-[#040a04] text-[#8bac0f] px-4 py-2 text-[10px] border-2 border-[#fff] font-retro">PRESS START</div>
        <div class="mt-4 text-[10px] font-retro opacity-30 tracking-widest flex flex-col gap-1">
           <span>DAO_ROSTER: @zalgorythms</span>
           <span>ESTD. 2026</span>
        </div>
      </div>`
  }

  _renderMenu() {
    const cycle = this.cycle || this._stubCycle()
    const phase = cycle.phase
    const c_id  = `#${cycle.id}`
    this.viewContainer.innerHTML = `
      <div class="w-full p-2 text-[#8bac0f] font-tech">
        <div class="text-[7px] font-retro border-b-2 border-[#040a04] mb-2 pb-1 flex justify-between items-center">
          <span>ROOT_SYS</span>
          <span>CYC${c_id}·${phase}</span>
        </div>
        <div class="space-y-1">
          ${this.menuOptions.map((opt, i) => `
            <div class="px-2 py-1 text-[10px] font-heading flex justify-between items-center ${this.menuIndex === i ? 'selected' : ''}">
              <span>${opt}</span>
              ${this.menuIndex === i ? '<span class="text-[10px]">▶</span>' : ''}
            </div>
          `).join('')}
        </div>
        <div class="mt-3 text-[10px] font-retro opacity-40 flex justify-between border-t border-[#040a04]/10 pt-2">
          <span>BATT:${this.batteryLevel}%</span>
          <span>REP:${this.vault ? this.vault.reputation : '...'}</span>
        </div>
      </div>`
  }

  _renderMatrix() {
    const cycle  = this.cycle || this._stubCycle()
    const tracks = this.tracks.length ? this.tracks : this._stubTracks()
    const trk    = tracks[this.matrixIndex]
    const total  = tracks.length
    const quorum = cycle.current_voters || 0
    const minQ   = cycle.min_quorum || 50
    const qPct   = Math.min(100, Math.round(quorum / minQ * 100))
    const hasVoted = trk && this.votedIds.has(trk.id)

    let timeStr = '?'
    if (cycle.vote_end) {
      const ms = cycle.vote_end - Date.now()
      if (ms > 0) {
        const h = Math.floor(ms / 3600000)
        const m = Math.floor((ms % 3600000) / 60000)
        timeStr = `${h}H ${m}M`
      } else {
        timeStr = 'CLOSED'
      }
    }

    if (!trk) {
      this.viewContainer.innerHTML = `
        <div class="w-full h-full p-2 flex flex-col items-center justify-center text-[#8bac0f] font-tech">
          <div class="text-[10px] opacity-40 mb-2">THE MATRIX</div>
          <div class="text-[10px] animate-pulse">NO_ACTIVE_TRACKS</div>
        </div>`
      return
    }

    const leadTrk = [...tracks].sort((a,b)=>b.rep_weight-a.rep_weight)[0]

    this.viewContainer.innerHTML = `
      <div class="w-full h-full p-2 flex flex-col text-[#8bac0f] relative font-tech">
        <div class="text-[10px] font-retro border-b border-[#040a04] pb-1 mb-2 flex justify-between">
          <span>CYC#${cycle.id} · ${cycle.phase}</span>
          <span>${timeStr}</span>
        </div>
        <div class="mb-2">
          <div class="flex justify-between text-[7px] font-retro mb-1">
            <span>QUORUM</span>
            <span>${quorum}/${minQ} ${cycle.quorum_met ? '✓' : ''}</span>
          </div>
          <div class="h-1.5 w-full bg-[#040a04]/10 border border-[#040a04]/20">
            <div class="h-full bg-[#040a04]" style="width:${qPct}%"></div>
          </div>
        </div>
        <div class="matrix-card flex-1 flex flex-col p-2 bg-[#040a04]/5 relative">
          <div class="text-[7px] font-retro opacity-50 mb-1">ARTIFAC [${this.matrixIndex+1}/${total}]</div>
          <div class="text-[12px] font-heading leading-tight mb-2">${trk.title}</div>
          <div class="text-[10px] font-mono opacity-60">${trk.ii_name}</div>
          <div class="flex gap-2 mt-2 text-[7px] font-retro">
            <span class="bg-[#040a04]/10 px-1">${trk.genre}</span>
            <span>${trk.bpm}BPM</span>
          </div>
          <div class="mt-auto text-[7px] font-mono flex justify-between opacity-70">
            <span>BY ${trk.architect?.slice(0,10)}</span>
            <span>▲${trk.votes} · ⚖${(trk.rep_weight||0).toLocaleString()}</span>
          </div>
        </div>
        <div class="mt-2 text-[10px] font-retro flex justify-between items-center">
          ${hasVoted ? '<span class="text-[#99ff99]">✓ VOTE_CAST</span>' : '<span class="animate-pulse">[A] VOTE</span>'}
          <span class="opacity-40">LEAD: ${leadTrk.title.slice(0,8)}</span>
        </div>
        ${this.matrixStatus ? `<div class="absolute inset-0 flex items-center justify-center z-10"><div class="stamp-animation border-4 border-[#040a04] px-3 py-2 bg-[#8bac0f] font-heading text-[10px] -rotate-12">${this.matrixStatus}</div></div>` : ''}
      </div>`
  }

  _renderForge() {
    const ents = this.entities.length ? this.entities : this._stubEntities()
    if (ents.length === 0) return
    const ii   = ents[this.forgeIIIndex] || ents[0]

    if (this.forgeStep === 'LOADING') {
      this.viewContainer.innerHTML = `<div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech"><div class="text-[10px] font-retro border-b border-[#040a04] mb-3 pb-1">FORGE_CONSOLE</div><div class="flex-1 flex flex-col justify-center items-center gap-2"><div class="text-[10px] font-heading animate-pulse">SYNTHESIZING...</div><div class="text-[7px] opacity-60">${ii.name}</div><div class="h-1.5 w-full bg-[#040a04]/10 mt-2"><div class="h-full bg-[#040a04] animate-pulse" style="width:66%"></div></div></div></div>`
      return
    }

    if (this.forgeStep === 4 && this.forgeResult) {
      const ok = this.forgeResult.ok
      const trk = this.forgeResult.track
      this.viewContainer.innerHTML = `<div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech"><div class="text-[10px] font-retro border-b border-[#040a04] mb-2 pb-1">FORGE_RESULT</div><div class="flex-1 flex flex-col justify-center items-center text-center gap-2">${ok ? `<div class="text-[20px] font-heading">⬡</div><div class="text-[10px] font-bold">TRACK SUBMITTED</div><div class="text-[10px] font-mono mt-1">${trk?.title}</div><div class="text-[7px] opacity-60 mt-1">${trk?.ii_name} · ${trk?.bpm}BPM</div>` : `<div class="text-[20px] font-heading">✗</div><div class="text-[10px] font-bold">${this.forgeResult.error || 'ERROR'}</div>`}</div><div class="text-[10px] font-retro text-center animate-pulse mt-2">[A/B] CONTINUE</div></div>`
      return
    }

    const stepLabels = ['SELECT_TARGET_II','SET_BPM','SELECT_GENRE','CONFIRM_SUBMIT']
    const stepNum    = typeof this.forgeStep === 'number' ? this.forgeStep : 0
    const stepLabel  = stepLabels[stepNum] || 'FORGE'
    let stepBody = ''

    switch (stepNum) {
      case 0:
        stepBody = `<div class="text-[7px] font-retro opacity-50 mb-2">◀ [L/R] BROWSE · [A] SELECT ▶</div><div class="matrix-card p-2 flex flex-col bg-[#040a04]/5 flex-1"><div class="text-[10px] font-mono opacity-60">${ii.id}</div><div class="text-[12px] font-heading mt-1">${ii.name}</div>${ii.video ? `<div class="w-full aspect-[16/9] bg-[#040a04]/20 my-2 overflow-hidden border border-[#040a04]/40 relative pointer-events-none shadow-inner"><video src="${ii.video}" autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover opacity-100"></video></div>` : ''}<div class="text-[10px] mt-1 font-tech leading-tight">${ii.genre_cluster}</div><div class="text-[7px] mt-2 font-mono opacity-60">${ii.lyrical_seeds.join(' · ')}</div><div class="mt-auto text-[10px] font-retro flex justify-between opacity-50"><span>${ii.releases} REL</span><span>${ii.active_curators} CUR</span><span class="${ii.status === 'ACTIVE' ? '' : 'animate-pulse'}">${ii.status}</span></div></div>`
        break
      case 1:
        stepBody = `<div class="text-[7px] font-retro opacity-50 mb-2">▲▼ ADJUST · [A] CONFIRM</div><div class="flex-1 flex flex-col items-center justify-center"><div class="text-[10px] font-mono opacity-60">${ii.name}</div><div class="text-[32px] font-heading mt-2">${this.forgeBPM}</div><div class="text-[10px] font-retro mt-1">BPM</div><div class="h-2 w-full bg-[#040a04]/10 mt-4 border border-[#040a04]/20"><div class="h-full bg-[#040a04]" style="width:${Math.round((this.forgeBPM - ii.bpm_range[0]) / (ii.bpm_range[1] - ii.bpm_range[0]) * 100)}%"></div></div></div>`
        break
      case 2:
        stepBody = `<div class="text-[7px] font-retro opacity-50 mb-2">▲▼ SCROLL · [A] CONFIRM</div><div class="flex-1 flex flex-col justify-center"><div class="text-[10px] font-tech opacity-30 text-center py-1">${this.forgeGenres[(this.forgeGenreIndex - 1 + this.forgeGenres.length) % this.forgeGenres.length]}</div><div class="text-[12px] font-heading text-center py-2 border-y border-[#040a04] my-2">${this.forgeGenres[this.forgeGenreIndex]}</div><div class="text-[10px] font-tech opacity-30 text-center py-1">${this.forgeGenres[(this.forgeGenreIndex + 1) % this.forgeGenres.length]}</div></div>`
        break
      case 3:
        stepBody = `<div class="text-[7px] font-retro opacity-50 mb-2">[A] SUBMIT · [B] BACK</div><div class="matrix-card p-2 flex-1 bg-[#040a04]/5 font-mono"><div class="text-[10px] font-heading mb-3 border-b border-[#040a04]/20 pb-1">MANIFEST</div><div class="space-y-1.5 text-[10px]"><div class="flex justify-between"><span class="opacity-60">TARGET</span><span>${ii.name}</span></div><div class="flex justify-between"><span class="opacity-60">BPM</span><span>${this.forgeBPM}</span></div><div class="flex justify-between"><span class="opacity-60">GENRE</span><span>${this.forgeGenres[this.forgeGenreIndex]}</span></div><div class="flex justify-between"><span class="opacity-60">CYCLE</span><span>#${this.cycle?.id || 1}</span></div></div><div class="text-[7px] opacity-40 mt-4 font-tech italic">40% ARCHITECT ROYALTY IF SELECTED</div></div>`
        break
    }

    this.viewContainer.innerHTML = `<div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech"><div class="text-[10px] font-retro border-b border-[#040a04] pb-1 mb-2 flex justify-between"><span>THE_FORGE</span><span>${stepNum+1}/4</span></div><div class="text-[10px] font-heading mb-2 opacity-70">${stepLabel}</div><div class="flex-1 flex flex-col">${stepBody}</div></div>`
  }

  _renderRoster() {
    const ents = this.entities.length ? this.entities : this._stubEntities()
    const ent  = ents[this.rosterIndex] || ents[0]
    this.viewContainer.innerHTML = `<div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech"><div class="text-[10px] font-retro border-b border-[#040a04] pb-1 mb-2 flex justify-between"><span>II_REGISTRY</span><span>[${this.rosterIndex+1}/${ents.length}]</span></div><div class="matrix-card p-2 flex-1 flex flex-col bg-[#040a04]/5"><div class="flex justify-between items-start mb-1"><div><div class="text-[10px] font-mono opacity-50">${ent.id}</div><div class="text-[12px] font-heading mt-1">${ent.name}</div></div><div class="text-[10px] font-retro text-right ${ent.status === 'ACTIVE' ? '' : 'animate-pulse'}">${ent.status}</div></div>${ent.video ? `<div class="w-full aspect-[16/9] bg-[#040a04]/20 mb-2 overflow-hidden border border-[#040a04]/40 relative pointer-events-none shadow-inner"><video src="${ent.video}" autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover opacity-100"></video></div>` : ''}<div class="text-[10px] mt-1 font-tech leading-tight opacity-80">${ent.genre_cluster}</div><div class="mt-2 flex gap-1 flex-wrap">${(ent.lyrical_seeds||[]).map(s => `<span class="bg-[#040a04] text-[#8bac0f] px-1 py-px text-[10px] font-retro border border-white/20">${s}</span>`).join('')}</div><div class="mt-auto space-y-1 font-mono text-[7px]"><div class="flex justify-between"><span class="opacity-60">RELEASES</span><span>${ent.releases}</span></div><div class="flex justify-between"><span class="opacity-60">CURATORS</span><span>${ent.active_curators}</span></div></div></div></div>`
  }

  _renderDaoRoster() {
    this.viewContainer.innerHTML = `
      <div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech">
        <div class="text-[10px] font-retro border-b border-[#040a04] pb-1 mb-2 flex justify-between">
          <span>DAO_MEMBERS</span>
          <span>[LIVE]</span>
        </div>
        <div class="flex-1 flex flex-col gap-3 mt-2">
          <div class="matrix-card p-2 bg-[#040a04]/10 border border-[#040a04]/30">
            <div class="text-[10px] font-retro opacity-50 mb-1 uppercase">Founder</div>
            <div class="text-[11px] font-heading">@zalgorythms</div>
            <div class="text-[10px] font-mono mt-1 opacity-70">REPUTATION: 5,000</div>
          </div>
          <div class="matrix-card p-2 border border-[#040a04]/30 bg-[#040a04]/5">
            <div class="text-[10px] font-retro opacity-50 mb-1 uppercase">Active Member</div>
            <div class="text-[11px] font-heading text-blue-400">@${this.username}</div>
            <div class="text-[10px] font-mono mt-1 opacity-70">REPUTATION: ${this.vault ? this.vault.reputation : 1000}</div>
          </div>
        </div>
        <div class="mt-auto text-[7px] font-tech text-center opacity-50 leading-tight border-t border-[#040a04]/10 pt-2">
          "LOGGED IN AS @${this.username}"
        </div>
      </div>`
  }

  _renderVault() {
    const v = this.vault || this._stubVault()
    const pages = ['REPUTATION', 'ROYALTIES', 'ALIGNMENT']
    let body = ''
    if (this.vaultPage === 0) {
      const pct = Math.min(100, Math.round((v.reputation - v.floor) / (5000 - v.floor) * 100))
      body = `<div class="flex-1 flex flex-col"><div class="bg-[#040a04] text-[#8bac0f] text-center py-4 border-2 border-white/20"><div class="text-[24px] font-heading">${v.reputation.toLocaleString()}</div><div class="text-[7px] font-retro mt-1">@${this.username} REP</div></div><div class="mt-4 space-y-2 text-[9px] font-mono"><div><div class="flex justify-between mb-1"><span class="opacity-60">POWER</span><span>${pct}%</span></div><div class="h-2 w-full bg-[#040a04]/10"><div class="h-full bg-[#040a04]" style="width:${pct}%"></div></div></div><div class="flex justify-between"><span class="opacity-60">ROLE</span><span>${v.role}</span></div><div class="flex justify-between"><span class="opacity-60">WALLET</span><span>${this.wallet ? 'LINKED' : 'NOT_CONNECTED'}</span></div></div></div>`
    } else if (this.vaultPage === 1) {
      body = `<div class="flex-1 flex flex-col"><div class="bg-[#0f380f] text-[#8bac0f] text-center py-3 border-2 border-white/20 mb-3"><div class="text-[10px] font-retro opacity-70 mb-1">PENDING</div><div class="text-[18px] font-heading">${v.royalties_pending?.toFixed(4)}</div><div class="text-[10px] font-mono mt-1">ETH</div></div><div class="space-y-2 text-[10px] font-mono"><div class="flex justify-between"><span class="opacity-60">LIFETIME</span><span>${v.royalties_lifetime?.toFixed(4)} ETH</span></div><div class="flex justify-between"><span class="opacity-60">SPLIT</span><span>CROWD: 40%</span></div><div class="text-[10px] opacity-40 font-tech mt-4 italic text-center">PAYOUT ON QUORUM + THRESHOLD</div></div></div>`
    } else {
      const hist = (v.alignment_history || []).slice(0, 4)
      body = `<div class="flex-1 flex flex-col"><div class="text-[10px] font-heading mb-3 opacity-60">HISTORY</div><div class="space-y-2 font-mono">${hist.map(h => `<div class="flex items-center gap-2 text-[10px] border-b border-[#040a04]/10 pb-1"><span class="w-4 opacity-50">#${h.cycle}</span><span class="${h.aligned ? 'text-[#99ff99]' : 'opacity-40'}">${h.aligned ? '✓' : '✗'}</span><span class="flex-1 truncate">${h.track}</span><span class="font-bold">${h.delta > 0 ? '+' : ''}${h.delta}</span></div>`).join('')}</div></div>`
    }
    this.viewContainer.innerHTML = `<div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech"><div class="text-[10px] font-retro border-b border-[#040a04] pb-1 mb-2 flex justify-between"><span>THE VAULT</span><span>◀ ${pages[this.vaultPage]} ▶</span></div>${body}<div class="mt-auto flex justify-center gap-3 pt-2">${pages.map((_, i) => `<div class="w-2 h-2 rounded-full border border-[#040a04]/20 ${i === this.vaultPage ? 'bg-[#040a04]' : 'bg-transparent'}"></div>`).join('')}</div></div>`
  }

  _renderConnectWallet() {
    const isConnected = !!this.wallet
    this.viewContainer.innerHTML = `
      <div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech">
        <div class="text-[10px] font-retro border-b border-[#040a04] pb-1 mb-3 flex justify-between">
          <span>WALLET_BRIDGE</span>
          <span>TON_NET</span>
        </div>
        <div class="flex-1 flex flex-col justify-center items-center text-center">
          ${isConnected ? `
            <div class="text-[14px] font-heading mb-2">CONNECTED</div>
            <div class="text-[10px] font-mono opacity-60 break-all px-2">${this.wallet.account.address.slice(0,16)}...${this.wallet.account.address.slice(-8)}</div>
            <div class="mt-4 text-[10px] font-mono">USER: @${this.username}</div>
          ` : `
            <div class="text-[10px] font-heading mb-2 animate-pulse">AWAITING_CONNECTION</div>
            <div class="text-[7px] mb-4 opacity-70">CONNECT YOUR TELEGRAM WALLET TO SECURE YOUR REPUTATION</div>
            <div class="bg-[#040a04] text-[#8bac0f] px-3 py-1.5 text-[10px] font-retro border-2 border-white animate-pulse">[A] CONNECT</div>
          `}
        </div>
        <div class="mt-auto text-[10px] opacity-40 italic text-center">REQUIRES TELEGRAM APP</div>
      </div>`
  }

  _renderSlides() {
    const slides = [
      {
        id: 0,
        pill: 'ROLE: CURATOR',
        title: 'THE CURATOR',
        tagline: 'Your Taste. Your Influence.',
        body: "You're not just a listener — you're a decision-maker. Curators propose, vote on, and shape which AI-assisted tracks get released to the world. The more your picks perform on streaming platforms, the more reputation you earn. More reputation means more weight in future votes.",
        statVal: '40%',
        statLabel: 'of royalties go to the crowd'
      },
      {
        id: 1,
        pill: 'SYSTEM: MEMBERSHIP',
        title: 'THE TRIBUTE GATE',
        tagline: 'Start Free. Level Up When You\'re Ready.',
        body: "EPHANTOM is financially self-sustaining from day one. Active Curators pay $9/month to unlock voting rights and royalty distributions. This keeps the crowd serious and the Sybil bots out. Subscription fees fund operations, legal, and infrastructure.",
        statVal: '$9',
        statLabel: 'monthly subscription fee'
      },
      {
        id: 2,
        pill: 'TOKEN: JETTON REWARD',
        title: 'THE CURATION TOKEN',
        tagline: 'Curate Anything. Earn Everything.',
        body: "A real Jetton token ($PHNTM) on the TON blockchain. Every curation action you take earns you tokens. Your reputation score acts as a permanent multiplier on every token you earn. Stack it, trade it, list it on TON DEXs.",
        statVal: '$PHNTM',
        statLabel: 'Jetton on TON blockchain'
      },
      {
        id: 3,
        pill: 'ROLE: ARCHITECT',
        title: 'THE ARCHITECT',
        tagline: 'Build the Sound. Earn the Royalties.',
        body: "Architects are the creators. Submit your AI-assisted track during the 72-hour window. If the crowd votes yours as the winner, you earn 40% of all streaming and licensing royalties — no label deal, no middlemen.",
        statVal: '40%',
        statLabel: 'royalty share for winners'
      },
      {
        id: 4,
        pill: 'SYSTEM: CONSENSUS',
        title: 'CONSENSUS MATRIX',
        tagline: 'Democracy, Reputation-Weighted.',
        body: "Every cycle runs on a 72-hour vote. Votes are weighted by earned reputation — not money, not followers. The track that earns the crowd's approval gets released globally through major streaming platforms.",
        statVal: '72h',
        statLabel: 'per vote cycle'
      },
      {
        id: 5,
        pill: 'ROLE: REFINEMENT',
        title: 'REFINEMENT NODE',
        tagline: 'Polish It. Get Paid.',
        body: "Producers and mixers who take the winning track from raw to release-ready. Submit your project file and proof of work. Verified contributors split 10% of that cycle's royalties.",
        statVal: '10%',
        statLabel: 'refinement royalty share'
      },
      {
        id: 6,
        pill: 'CONCEPT: THE ARTIST',
        title: 'INSTANCED IDENTITY',
        tagline: 'The Artist is a Living System.',
        body: "Virtual music artists defined by crowd vote and ratified on-chain. Sound evolves every cycle based on collective decisions. No single human owns it. Everyone who shapes it shares in its success.",
        statVal: '∞',
        statLabel: 'possible artist identities'
      },
      {
        id: 7,
        pill: 'SYSTEM: TREASURY',
        title: 'THE TREASURY',
        tagline: 'The Engine That Keeps It All Running.',
        body: "10% of every cycle's royalties flow to the Protocol Treasury — funding infrastructure, moderation, marketing, and legal ops via a Wyoming SPV. Transparent spending, on-chain accountability.",
        statVal: '10%',
        statLabel: 'protocol treasury allocation'
      },
      {
        id: 8,
        pill: 'ECONOMICS: OVERVIEW',
        title: 'REVENUE STREAMS',
        tagline: 'The DAO Doesn\'t Wait for a Hit.',
        body: "EPHANTOM is financially self-sustaining from day one. Revenue flows from Curator Subscriptions ($9/mo), Architect Submission Fees ($15/track), and Streaming Royalties (10% to Treasury).",
        statVal: '3',
        statLabel: 'independent revenue sources'
      }
    ]

    const s = slides[this.currentSlide]
    this.viewContainer.innerHTML = `
      <div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech relative overflow-hidden">
        <div class="text-[5px] font-retro border-b border-[#040a04] pb-1 mb-2 flex justify-between">
          <span>SYSTEM_OVERVIEW</span>
          <span>SLIDE ${this.currentSlide + 1}/9</span>
        </div>
        
        <div class="flex-1 flex flex-col justify-between fade-in">
          <div>
            <div class="bg-[#040a04] text-[#8bac0f] px-2 py-0.5 text-[10px] font-retro inline-block mb-2 border border-white/20">${s.pill}</div>
            <div class="text-[14px] font-heading leading-tight mb-1">${s.title}</div>
            <div class="text-[10px] font-mono opacity-70 mb-2 italic">"${s.tagline}"</div>
            <div class="text-[7px] leading-relaxed opacity-90">${s.body}</div>
          </div>

          <div class="mt-4 border-l-4 border-[#040a04] pl-3 py-1 bg-[#040a04]/5">
            <div class="text-[20px] font-heading leading-none">${s.statVal}</div>
            <div class="text-[10px] font-mono opacity-60 mt-1 uppercase">${s.statLabel}</div>
          </div>
        </div>

        <div class="mt-3 flex justify-between items-center text-[5px] font-retro opacity-40">
          <span>[L/R] NAVIGATE</span>
          <div class="flex gap-1.5">
            ${slides.map((_, i) => `<div class="w-1 h-1 rounded-full ${i === this.currentSlide ? 'bg-[#040a04]' : 'bg-[#040a04]/20'}"></div>`).join('')}
          </div>
          <span>[B] MENU</span>
        </div>
      </div>`
  }

  initThreeJS() {
    const canvas = document.getElementById('screen-canvas'), container = document.getElementById('screen-wrapper')
    if (!canvas || !container) return
    const w = container.clientWidth, h = container.clientHeight
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false })
    this.renderer.setSize(w, h)
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000); this.camera.position.z = 1
    this.ghostMaterial = new THREE.MeshBasicMaterial({ color: 0x306230, transparent: true, opacity: 0.05 })
    this.ghostPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.ghostMaterial); this.scene.add(this.ghostPlane)
    const animate = () => { requestAnimationFrame(animate); if (this.isBooted) { this.ghostPlane.rotation.z += 0.005; this.renderer.render(this.scene, this.camera) } }
    animate()
  }

  async initBatteryAPI() {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const b = await navigator.getBattery()
        const u = () => { this.batteryLevel = Math.round(b.level * 100); this.isCharging = b.charging; this.render() }
        b.addEventListener('levelchange', u); b.addEventListener('chargingchange', u); u()
      } catch {}
    }
  }

  bindPhysicalSensors() {
    window.addEventListener('deviceorientation', e => { if (e.beta !== null && e.gamma !== null) this.updateOpticalShift(e.gamma * 0.4, e.beta * 0.4) })
    document.addEventListener('mousemove', e => { this.updateOpticalShift((e.clientX / window.innerWidth - 0.5) * 30, (e.clientY / window.innerHeight - 0.5) * 30) })
  }

  updateOpticalShift(x, y) {
    if (this.reflection) this.reflection.style.transform = `skewX(-15deg) translate(${x}px, ${y}px) scale(2)`
    if (this.shell && !this.inputThrottle) this.shell.style.transform = `rotateY(${x * 0.1}deg) rotateX(${-y * 0.1}deg)`
  }

  initAudio() {
    if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume()
  }

  beep(freq = 440, duration = 0.1, type = 'square') {
    this.initAudio(); if (!this.audioCtx || this.audioCtx.state !== 'running') return
    const o = this.audioCtx.createOscillator(), g = this.audioCtx.createGain()
    o.type = type; o.frequency.setValueAtTime(freq, this.audioCtx.currentTime)
    g.gain.setValueAtTime(0.04, this.audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration)
    o.connect(g); g.connect(this.audioCtx.destination); o.start(); o.stop(this.audioCtx.currentTime + duration)
  }

  haptic(p = 'light') { if (typeof navigator !== 'undefined' && navigator.vibrate) ({ light: () => navigator.vibrate(10), medium: () => navigator.vibrate(35), heavy: () => navigator.vibrate([60,30,60]) })[p]?.() }

  applyPhysicalFeedback(action) {
    this.screen.classList.remove('shake'); void this.screen.offsetWidth; this.screen.classList.add('shake')
    let tX = 0, tY = 0
    if (action === 'up') tX = 0.5; if (action === 'down') tX = -0.5; if (action === 'left') tY = -0.5; if (action === 'right') tY = 0.5; if (action === 'a' || action === 'b') tY = 0.3
    this.shell.style.transform = `rotateX(${tX}deg) rotateY(${tY}deg)`
    if (['up','down','left','right'].includes(action)) this.dpadContainer.style.transform = `translate(${tY * 1.0}px, ${-tX * 1.0}px)`
    requestAnimationFrame(() => setTimeout(() => { this.shell.style.transform = ''; this.dpadContainer.style.transform = '' }, 150))
  }
}

function startOS() {
  if (window.os) return
  window.os = new EphantomOS()
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startOS)
} else {
  startOS()
}
