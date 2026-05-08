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
      if (action === 'b') {
        this.currentState = 'MENU'
        this.beep(220, 0.12)
        this._stopAudio()
      } else {
        this.routeInputToView(action)
      }
    }
    this.render()
  }

  _stopAudio() {
    this.isPlaying = false
    this.audioElement.pause()
  }

  routeInputToView(action) {
    switch (this.currentState) {
      case 'THE MATRIX': this._matrixInput(action); break
      case 'THE FORGE':  this._playerInput(action);  break
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

  _playerInput(action) {
    if (action === 'left')  this._curate('DISLIKE')
    if (action === 'right') this._curate('LIKE')
    if (action === 'a')     this._togglePlay()
    if (action === 'up')    this._nextTrack()
    if (action === 'down')  this._prevTrack()
  }

  _curate(direction) {
    this.curationStatus = direction === 'LIKE' ? 'LIKED' : 'DISLIKED'
    this.beep(direction === 'LIKE' ? 880 : 220, 0.1)
    this.haptic(direction === 'LIKE' ? 'medium' : 'heavy')
    
    // Simulate API call for curation
    setTimeout(() => {
      this.curationStatus = null
      this._nextTrack()
      this.render()
    }, 600)
    this.render()
  }

  _togglePlay() {
    this.isPlaying = !this.isPlaying
    if (this.isPlaying) {
      this.audioElement.play().catch(e => console.warn("Audio play blocked", e))
      this.beep(660, 0.1)
    } else {
      this.audioElement.pause()
      this.beep(440, 0.1)
    }
  }

  _nextTrack() {
    const total = this.tracks.length
    if (total === 0) return
    this.playerIndex = (this.playerIndex + 1) % total
    this._loadTrack()
  }

  _prevTrack() {
    const total = this.tracks.length
    if (total === 0) return
    this.playerIndex = (this.playerIndex - 1 + total) % total
    this._loadTrack()
  }

  _loadTrack() {
    const trk = this.tracks[this.playerIndex]
    if (trk && trk.url) {
      this.audioElement.src = trk.url
      if (this.isPlaying) this.audioElement.play().catch(e => console.warn("Audio play blocked", e))
    }
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
        case 'THE FORGE':   this._renderPlayer();  break
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

  _renderPlayer() {
    const tracks = this.tracks.length ? this.tracks : this._stubTracks()
    const trk    = tracks[this.playerIndex]
    const total  = tracks.length

    if (!trk) {
      this.viewContainer.innerHTML = `
        <div class="w-full h-full p-2 flex flex-col items-center justify-center text-[#8bac0f] font-tech">
          <div class="text-[10px] opacity-40 mb-2">THE FORGE</div>
          <div class="text-[10px] animate-pulse">NO_TRACKS_AVAILABLE</div>
        </div>`
      return
    }

    this.viewContainer.innerHTML = `
      <div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech relative">
        <div class="text-[10px] font-retro border-b border-[#040a04] pb-1 mb-2 flex justify-between">
          <span>THE_PLAYER</span>
          <span>[${this.playerIndex + 1}/${total}]</span>
        </div>
        
        <div class="flex-1 flex flex-col items-center justify-center text-center">
          <div class="w-32 h-32 bg-[#040a04]/20 border-2 border-[#8bac0f] mb-4 relative overflow-hidden flex items-center justify-center shadow-inner">
            <div class="text-[40px] ${this.isPlaying ? 'animate-spin' : ''} opacity-40">⬡</div>
            ${this.isPlaying ? '<div class="absolute inset-0 bg-[#8bac0f]/10 animate-pulse"></div>' : ''}
          </div>
          
          <div class="text-[14px] font-heading leading-tight mb-1 truncate w-full px-2">${trk.title}</div>
          <div class="text-[10px] font-mono opacity-60 mb-3">${trk.ii_name}</div>
          
          <div class="flex gap-4 items-center">
            <div class="text-[8px] font-retro opacity-40">◀ DISLIKE</div>
            <div class="bg-[#8bac0f] text-[#040a04] px-3 py-1 text-[10px] font-retro border border-white/20">
              ${this.isPlaying ? 'PAUSE' : 'PLAY'}
            </div>
            <div class="text-[8px] font-retro opacity-40">LIKE ▶</div>
          </div>
        </div>

        <div class="mt-4 bg-[#040a04]/10 h-1 relative overflow-hidden">
          <div class="h-full bg-[#8bac0f] transition-all duration-300" style="width: ${this.isPlaying ? '45%' : '0%'}"></div>
        </div>

        <div class="mt-2 text-[7px] font-mono flex justify-between opacity-50">
          <span>${trk.genre}</span>
          <span>${trk.bpm} BPM</span>
        </div>

        ${this.curationStatus ? `
          <div class="absolute inset-0 flex items-center justify-center z-50 bg-[#050c05]/80">
            <div class="stamp-animation border-4 border-[#8bac0f] px-4 py-2 bg-[#040a04] font-heading text-[12px] -rotate-12">
              ${this.curationStatus}
            </div>
          </div>
        ` : ''}
      </div>`
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
