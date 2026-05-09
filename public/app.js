// ╔═══════════════════════════════════════════════════════════╗
// ║  EPHANTOM · Crowd-Controlled Emergent Music Synthesis     ║
// ║  Hardware OS — Genesis Build                              ║
// ╚═══════════════════════════════════════════════════════════╝

class EphantomOS {
  constructor() {
    this.viewContainer = document.getElementById('game-view')
    this.shell          = document.getElementById('gameboy-shell')
    this.dpadContainer  = document.getElementById('dpad-container')
    this.powerLed       = document.getElementById('power-led')
    this.ledGlow        = document.getElementById('led-glow')
    this.bezelGlow      = document.getElementById('bezel-glow')
    this.reflection     = document.getElementById('glass-reflection')
    this.screen         = document.getElementById('screen')

    this.currentState   = 'BOOTING'; this.introStep = 0
    this.introPhrases   = [
      { text: "EPHANTOM", font: "font-heading", size: "26px" },
      { text: "DOING MORE AND MORE WITH LESS AND LESS UNTIL WE CAN DO EVERYTHING WITH NOTHING", font: "font-sci", size: "8px" },
      { text: "THE DECENTRALIZED MUSIC REVOLUTION", font: "font-sci", size: "10px" },
      { text: "AI CREATES THE SOUND. YOU DEFINE THE SOUL.", font: "font-heading", size: "16px" }
    ]
    this.introTimer = null; this.menuIndex = 0
    this.menuOptions = ['THE MATRIX', 'THE FORGE', 'ENTITIES', 'SYSTEM OVERVIEW', 'DAO ROSTER', 'THE VAULT', 'TRIBUTE GATE', 'CONNECT WALLET']
    this.isBooted = false; this.bootLock = false; this.inputThrottle = false; this.audioCtx = null; this.batteryLevel = 100
    this.playerIndex = 0; this.isPlaying = false; this.audioElement = new Audio(); this.curationStatus = null
    this.currentSlide = 0; this.totalSlides = 9
    this.tg = window.Telegram?.WebApp; this.tonConnect = null; this.wallet = null; this.username = this.tg?.initDataUnsafe?.user?.username || 'GUEST_USER'
    if (this.tg) { this.tg.expand(); this.tg.ready() }
    
    this.cycle = null; this.tracks = []; this.entities = []; this.vault = null; this.matrixIndex = 0; this.matrixStatus = null; this.votedIds = new Set()
    this.rosterIndex = 0; this.touchStartX = 0; this.touchStartY = 0; this.vaultPage = 0; this.ghostMaterial = null; this.renderer = null
    
    this.init()
  }

  async init() {
    try {
      this.initTonConnect(); this.initThreeJS(); this.bindInputs(); this.bindPhysicalSensors(); this.initBatteryAPI(); this.bootSequence(); this.fetchAll() 
      this.updateScale(); window.addEventListener('resize', () => this.updateScale())
      if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.updateScale())
    } catch (err) { console.error("OS_INIT_ERROR:", err) }
  }

  updateScale() {
    const w = window.innerWidth, h = window.innerHeight
    const scale = Math.min(w / 634, h / 1155) * 0.98
    document.documentElement.style.setProperty('--gb-scale', scale)
  }

  async fetchAll() {
    this.isLoading = true; this.render()
    try {
      const address = this.wallet?.account?.address || 'anonymous'
      const urls = ['/api/cycle', '/api/tracks', '/api/entities', `/api/vault?address=${address}`]
      const results = await Promise.all(urls.map(url => fetch(url).then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))))
      this.cycle = results[0]; this.tracks = results[1]; this.entities = results[2]; this.vault = results[3]
      if (this.vault?.votes_this_cycle) {
        this.votedIds = new Set(this.vault.votes_this_cycle)
      }
    } catch (err) {
      console.error("FETCH_ERROR:", err)
      this.errorMsg = "CONNECTION_LOST"
    } finally {
      this.isLoading = false; this.render()
    }
  }

  initTonConnect() {
    if (typeof TON_CONNECT_UI !== 'undefined') {
      this.tonConnect = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: window.location.origin + '/tonconnect-manifest.json',
        buttonRootId: null // We use our own UI
      });
      this.tonConnect.onStatusChange(async wallet => {
        this.wallet = wallet;
        if (wallet) {
          const addr = wallet.account.address;
          this.username = addr.slice(0, 6) + '...' + addr.slice(-4);
        } else {
          this.username = this.tg?.initDataUnsafe?.user?.username || 'GUEST_USER';
        }
        await this.fetchAll();
        this.render();
      });
    }
  }

  async connectWallet() {
    if (!this.tonConnect) return;
    if (this.wallet) {
      await this.tonConnect.disconnect();
    } else {
      await this.tonConnect.openModal();
    }
  }

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
  skipIntro() { if (this.introTimer) { clearTimeout(this.introTimer); this.introTimer = null }; this.currentState = 'SPLASH'; this.render() }

  bindInputs() {
    const keys = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right', z:'a', x:'b', Z:'a', X:'b', Enter:'start', Shift:'select' }
    document.addEventListener('keydown', e => { const a = keys[e.key]; if (a) { e.preventDefault(); this.handleInput(a) } })
    ;['btn-up','btn-down','btn-left','btn-right','btn-a','btn-b','btn-start','btn-select'].forEach(id => {
      const el = document.getElementById(id); if (!el) return; const a = id.replace('btn-', '')
      el.addEventListener('mousedown', e => { e.preventDefault(); this.handleInput(a) }); el.addEventListener('touchstart', e => { e.preventDefault(); this.handleInput(a) }, { passive: false })
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
    
    if (this.currentState === 'INTRO') { if (action === 'b' || action === 'start') this.skipIntro(); return }
    if (this.currentState === 'SPLASH') { if (action === 'start' || action === 'a') this.currentState = 'MENU' }
    else if (this.currentState === 'MENU') {
      if (action === 'up') this.menuIndex = (this.menuIndex - 1 + this.menuOptions.length) % this.menuOptions.length;
      if (action === 'down') this.menuIndex = (this.menuIndex + 1) % this.menuOptions.length;
      if (action === 'a') {
        const opt = this.menuOptions[this.menuIndex]
        if (opt === 'TRIBUTE GATE') {
          this.openTribute()
        } else if (opt === 'CONNECT WALLET') {
          this.connectWallet()
        } else {
          this.currentState = opt
        }
      }
    }
    else { if (action === 'b') { this.currentState = 'MENU'; this._stopAudio() } else this.routeInputToView(action) }
    this.render()
  }

  openTribute() {
    const url = 'https://t.me/tribute/app?startapp=sUHr'
    if (this.tg?.openTelegramLink) { this.tg.openTelegramLink(url) } else { window.open(url, '_blank') }
  }

  _stopAudio() { this.isPlaying = false; this.audioElement.pause() }
  routeInputToView(a) { switch (this.currentState) { case 'THE MATRIX': this._matrixInput(a); break; case 'THE FORGE': this._playerInput(a); break; case 'ENTITIES': this._rosterInput(a); break; case 'THE VAULT': this._vaultInput(a); break; case 'SYSTEM OVERVIEW': this._slideInput(a); break } }
  
  _playerInput(a) { if (a === 'left') this._curate('DISLIKE'); if (a === 'right') this._curate('LIKE'); if (a === 'a') this._togglePlay(); if (a === 'up') this._nextTrack(); if (a === 'down') this._prevTrack() }
  _curate(d) { this.curationStatus = d === 'LIKE' ? 'LIKED' : 'DISLIKED'; this.beep(d === 'LIKE' ? 880 : 220, 0.1); setTimeout(() => { this.curationStatus = null; this._nextTrack(); this.render() }, 600); this.render() }
  _togglePlay() { this.isPlaying = !this.isPlaying; if (this.isPlaying) { this.audioElement.play().catch(() => {}); this.beep(660, 0.1) } else { this.audioElement.pause(); this.beep(440, 0.1) } }
  _nextTrack() { if (this.tracks.length) { this.playerIndex = (this.playerIndex + 1) % this.tracks.length; this._loadTrack() } }
  _prevTrack() { if (this.tracks.length) { this.playerIndex = (this.playerIndex - 1 + this.tracks.length) % this.tracks.length; this._loadTrack() } }
  _loadTrack() { const trk = this.tracks[this.playerIndex]; if (trk?.url && trk.url !== '#') { this.audioElement.src = trk.url; if (this.isPlaying) this.audioElement.play().catch(() => {}) } }
  
  _matrixInput(a) { if (a === 'left') this.matrixIndex = (this.matrixIndex - 1 + this.tracks.length) % this.tracks.length; if (a === 'right') this.matrixIndex = (this.matrixIndex + 1) % this.tracks.length; if (a === 'a') this._castVote() }
  async _castVote() {
    const trk = this.tracks[this.matrixIndex];
    if (!trk || this.votedIds.has(trk.id)) return;

    try {
      const resp = await fetch(`/api/vote/${trk.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: this.wallet?.account?.address || 'anonymous'
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        this.votedIds.add(trk.id);
        this.matrixStatus = 'SYNCED';
        this.beep(1100, 0.2);
        // Refresh local data
        await this.fetchAll();
      } else {
        const err = await resp.json();
        console.error("VOTE_ERROR:", err.error);
        this.matrixStatus = err.error || 'ERROR';
        this.beep(220, 0.3);
      }
    } catch (err) {
      console.error("VOTE_FETCH_FAILED:", err);
      this.matrixStatus = 'OFFLINE';
      this.beep(220, 0.3);
    }

    setTimeout(() => { this.matrixStatus = null; this.render() }, 1500);
    this.render();
  }
  
  _rosterInput(a) { if (a === 'left') this.rosterIndex = (this.rosterIndex - 1 + this.entities.length) % this.entities.length; if (a === 'right') this.rosterIndex = (this.rosterIndex + 1) % this.entities.length }
  _vaultInput(a) { if (a === 'left') this.vaultPage = Math.max(0, this.vaultPage - 1); if (a === 'right') this.vaultPage = Math.min(2, this.vaultPage + 1) }
  _slideInput(a) { if (a === 'left') this.currentSlide = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides; if (a === 'right') this.currentSlide = (this.currentSlide + 1) % this.totalSlides }

  render() {
    if (!this.viewContainer || !this.isBooted) return; this.viewContainer.innerHTML = ''
    switch (this.currentState) {
      case 'INTRO': this._renderIntro(); break; case 'SPLASH': this._renderSplash(); break; case 'MENU': this._renderMenu(); break
      case 'THE MATRIX': this._renderMatrix(); break; case 'THE FORGE': this._renderPlayer(); break; case 'ENTITIES': this._renderRoster(); break
      case 'DAO ROSTER': this._renderDaoRoster(); break; case 'THE VAULT': this._renderVault(); break; case 'SYSTEM OVERVIEW': this._renderSlides(); break
      case 'CONNECT WALLET': this._renderMenu(); break // Stay on menu
      default: this._renderSplash(); break
    }
  }

  _renderIntro() { const item = this.introPhrases[this.introStep] || { text: "" }; this.viewContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-[#8bac0f] p-4 text-center"><div class="cinematic-text font-bold" style="font-size: ${item.size}">${item.text}</div></div>` }
  
  _renderSplash() { this.viewContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-[#8bac0f] p-3 text-center"><div class="text-[24px] font-heading mb-3 drop-shadow-lg">EPHANTOM</div><div class="text-[10px] font-tech opacity-90 mb-4 font-bold">DECENTRALIZED AUTONOMOUS MUSIC LABEL</div><div class="mt-4 animate-pulse bg-[#8bac0f] text-[#050c05] px-4 py-2 text-[10px] border-2 border-[#fff] font-retro">PRESS START</div></div>` }
  
  _renderMenu() {
    const cycle = this.cycle || {id:1, phase:'VOTING'};
    const batteryIcon = this.batteryLevel < 20 ? '🪫' : (this.batteryLevel < 60 ? '🔋' : '🔋');
    this.viewContainer.innerHTML = `<div class="w-full p-2 text-[#8bac0f] font-tech"><div class="text-[7px] font-retro border-b-2 border-[#8bac0f]/20 mb-2 pb-1 flex justify-between items-center"><span>ROOT_SYS</span><span>${batteryIcon}${this.batteryLevel}% · CYC#${cycle.id}·${cycle.phase}</span></div><div class="space-y-1">${this.menuOptions.map((opt, i) => {
      let label = opt;
      if (opt === 'CONNECT WALLET' && this.wallet) label = 'DISCONNECT';
      return `<div class="px-2 py-1 text-[10px] font-heading flex justify-between items-center ${this.menuIndex === i ? 'selected' : ''}"><span>${label}</span>${this.menuIndex === i ? '<span class="text-[10px]">▶</span>' : ''}</div>`
    }).join('')}</div></div>`
  }

  sanitize(str) {
    if (typeof str !== 'string') return str;
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  _renderMatrix() {
    const tracks = this.tracks.length ? this.tracks : [];
    if (this.isLoading) return this._renderLoading("SYNCING_MATRIX...")
    if (tracks.length === 0) return this._renderEmpty("NO TRACKS IN THE MATRIX")
    const trk = tracks[this.matrixIndex];
    if (!trk) return;
    this.viewContainer.innerHTML = `<div class="w-full h-full p-2 flex flex-col text-[#8bac0f] relative font-tech"><div class="text-[10px] font-retro border-b border-[#8bac0f]/20 pb-1 mb-2">THE MATRIX</div><div class="matrix-card flex-1 flex flex-col p-2 bg-[#8bac0f]/5 relative"><div class="text-[12px] font-heading mb-2">${this.sanitize(trk.title)}</div><div class="text-[10px] font-mono opacity-60">${this.sanitize(trk.ii_name)}</div><div class="mt-auto text-[7px] font-mono flex justify-between opacity-70"><span>▲${trk.votes}</span></div></div><div class="mt-2 text-[10px] font-retro">${this.votedIds.has(trk.id) ? '✓ VOTE_CAST' : (this.wallet ? '<span class="animate-pulse">[A] VOTE</span>' : 'CONNECT WALLET TO VOTE')}</div>${this.matrixStatus ? `<div class="absolute inset-0 flex items-center justify-center z-10"><div class="stamp-animation border-4 border-[#8bac0f] px-3 py-2 bg-[#050c05] font-heading text-[10px] -rotate-12">${this.matrixStatus}</div></div>` : ''}</div>`
  }

  _renderPlayer() {
    const tracks = this.tracks.length ? this.tracks : [];
    if (this.isLoading) return this._renderLoading("FORGING_SIGNAL...")
    if (tracks.length === 0) return this._renderEmpty("THE FORGE IS COLD")
    const trk = tracks[this.playerIndex];
    if (!trk) return;
    this.viewContainer.innerHTML = `<div class="w-full h-full p-0 flex flex-col text-[#8bac0f] font-tech relative overflow-hidden">${trk.embedUrl ? `<iframe src="${trk.embedUrl}" width="100%" height="100%" allow="encrypted-media" style="border: none; background: #000;"></iframe>` : `<div class="p-2 flex flex-col h-full"><div class="text-[14px] font-heading mb-1">${this.sanitize(trk.title)}</div><div class="text-[10px] font-mono opacity-60">${this.sanitize(trk.ii_name)}</div><div class="mt-auto bg-[#8bac0f] text-[#050c05] px-2 py-1 inline-block text-center font-retro">[A] PLAY</div></div>`}${this.curationStatus ? `<div class="absolute inset-0 flex items-center justify-center z-[100] bg-[#050c05]/80 pointer-events-none"><div class="stamp-animation border-4 border-[#8bac0f] px-4 py-2 bg-[#050c05] font-heading text-[12px] -rotate-12">${this.curationStatus}</div></div>` : ''}<div class="absolute top-1 left-1 right-1 flex justify-between pointer-events-none z-40 text-[6px] font-retro opacity-30"><span>[${this.playerIndex + 1}/${tracks.length}] THE FORGE</span><span>◀ DISLIKE / LIKE ▶</span></div></div>`
  }

  _renderLoading(msg) {
    this.viewContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-[#8bac0f] animate-pulse"><div class="text-[10px] font-retro">${msg}</div></div>`
  }

  _renderEmpty(msg) {
    this.viewContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-[#8bac0f] opacity-50"><div class="text-[10px] font-retro">${msg}</div></div>`
  }

  _renderRoster() {
    const ents = this.entities.length ? this.entities : []; const ent = ents[this.rosterIndex];
    if (!ent) return;
    this.viewContainer.innerHTML = `<div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech"><div class="text-[10px] font-retro border-b border-[#8bac0f]/20 pb-1 mb-2 flex justify-between"><span>II_REGISTRY</span><span>[${this.rosterIndex+1}/${ents.length}]</span></div><div class="matrix-card p-2 flex-1 flex flex-col bg-[#8bac0f]/5"><div class="text-[12px] font-heading mb-1">${ent.name}</div><div class="text-[10px] leading-tight opacity-80">${ent.genre_cluster}</div><div class="mt-auto text-[7px] font-mono opacity-60">RELEASES: ${ent.releases}</div></div></div>`
  }

  _renderDaoRoster() {
    this.viewContainer.innerHTML = `<div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech"><div class="text-[10px] font-retro border-b border-[#8bac0f]/20 pb-1 mb-2">DAO_MEMBERS</div><div class="space-y-3 mt-2"><div class="matrix-card p-2 bg-[#8bac0f]/10"><div class="text-[10px] opacity-50">FOUNDER</div><div class="text-[11px] font-heading">@zalgorythms</div></div><div class="matrix-card p-2"><div class="text-[10px] opacity-50">MEMBER</div><div class="text-[11px] font-heading text-blue-400">@${this.username}</div></div></div></div>`
  }

  _renderVault() {
    const v = this.vault || { reputation: 1000, royalties_pending: 0, alignment_history: [] };
    const pages = ['REPUTATION', 'ROYALTIES', 'ALIGNMENT'];
    let body = '';
    
    if (this.vaultPage === 0) {
      body = `<div class="flex-1 flex flex-col items-center justify-center"><div class="bg-[#8bac0f] text-[#050c05] p-4 border-2 border-white/20 w-full text-center"><div class="text-[24px] font-heading">${v.reputation.toLocaleString()}</div><div class="text-[8px] font-retro mt-1">REP</div></div><div class="mt-4 text-[10px] font-mono opacity-60">PENDING: ${v.royalties_pending} TON</div></div>`;
    } else if (this.vaultPage === 1) {
      body = `<div class="flex-1 flex flex-col justify-center text-center"><div class="text-[10px] font-retro opacity-50">PENDING</div><div class="text-[20px] font-heading">${v.royalties_pending} TON</div><div class="mt-4 text-[8px] opacity-40">THRESHOLD: 1.0 TON</div></div>`;
    } else {
      const history = v.alignment_history || [];
      body = `<div class="flex-1 flex flex-col p-1 overflow-y-auto"><div class="text-[8px] font-retro mb-2 opacity-50">VOTE_HISTORY</div><div class="space-y-1">${history.length ? history.map((h: any) => `<div class="text-[7px] border-l-2 border-[#8bac0f] pl-1">SYNCED_ID: ${h.trackId}</div>`).join('') : '<div class="text-[7px] opacity-30">NO_DATA_FOUND</div>'}</div></div>`;
    }
    
    this.viewContainer.innerHTML = `<div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech"><div class="text-[10px] font-retro border-b border-[#8bac0f]/20 pb-1 mb-2 flex justify-between"><span>THE VAULT</span><span>${pages[this.vaultPage]}</span></div>${body}</div>`
  }

  _renderSlides() {
    const slides = [
      { title: 'THE CURATOR', body: "You're a decision-maker. Shape which AI-assisted tracks get released." },
      { title: 'TRIBUTE GATE', body: "Active Curators pay a monthly tribute to unlock voting rights." },
      { title: '$PHNTM TOKEN', body: "Earn tokens for every curation action. Reputation acts as a multiplier." },
      { title: 'THE ARCHITECT', body: "Submit tracks. If the crowd wins, you earn 40% royalties." },
      { title: 'CONSENSUS', body: "Every cycle runs on a 72-hour vote weighted by reputation." },
      { title: 'REFINEMENT', body: "Producers who polish tracks split 10% of royalties." },
      { title: 'IDENTITY', body: "Sound evolves every cycle based on collective decisions." },
      { title: 'TREASURY', body: "10% flows to infrastructure and legal ops." },
      { title: 'ECONOMICS', body: "Self-sustaining via subscriptions and royalties." }
    ]
    const s = slides[this.currentSlide]
    this.viewContainer.innerHTML = `<div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech"><div class="text-[8px] font-retro border-b border-[#8bac0f]/20 pb-1 mb-2 flex justify-between"><span>OVERVIEW</span><span>${this.currentSlide+1}/9</span></div><div class="flex-1 flex flex-col justify-center"><div class="text-[14px] font-heading leading-tight mb-2">${s.title}</div><div class="text-[10px] leading-relaxed opacity-90">${s.body}</div></div><div class="mt-auto text-[6px] font-retro opacity-40">◀ NAVIGATE ▶</div></div>`
  }

  initThreeJS() {
    const canvas = document.getElementById('screen-canvas'), container = document.getElementById('screen-wrapper'); if (!canvas || !container) return
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false }); this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000); this.camera.position.z = 1
    this.ghostMaterial = new THREE.MeshBasicMaterial({ color: 0x306230, transparent: true, opacity: 0.05 }); this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.ghostMaterial))
    const animate = () => { requestAnimationFrame(animate); if (this.isBooted) this.renderer.render(this.scene, this.camera) }; animate()
  }

  async initBatteryAPI() { if (typeof navigator !== 'undefined' && 'getBattery' in navigator) { const b = await navigator.getBattery(); const u = () => { this.batteryLevel = Math.round(b.level * 100); this.render() }; b.addEventListener('levelchange', u); u() } }
  bindPhysicalSensors() { document.addEventListener('mousemove', e => this.updateOpticalShift((e.clientX / window.innerWidth - 0.5) * 30, (e.clientY / window.innerHeight - 0.5) * 30)) }
  updateOpticalShift(x, y) { if (this.shell && !this.inputThrottle) { document.documentElement.style.setProperty('--gb-rotate-x', `${-y * 0.1}deg`); document.documentElement.style.setProperty('--gb-rotate-y', `${x * 0.1}deg`) } }
  initAudio() { if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (this.audioCtx.state === 'suspended') this.audioCtx.resume() }
  beep(freq = 440, duration = 0.1) { this.initAudio(); if (!this.audioCtx || this.audioCtx.state !== 'running') return; const o = this.audioCtx.createOscillator(), g = this.audioCtx.createGain(); o.type = 'square'; o.frequency.setValueAtTime(freq, this.audioCtx.currentTime); g.gain.setValueAtTime(0.04, this.audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration); o.connect(g); g.connect(this.audioCtx.destination); o.start(); o.stop(this.audioCtx.currentTime + duration) }
  haptic(p = 'light') { if (typeof navigator !== 'undefined' && navigator.vibrate) ({ light: () => navigator.vibrate(10), medium: () => navigator.vibrate(35), heavy: () => navigator.vibrate([60,30,60]) })[p]?.() }
  applyPhysicalFeedback(a) { if (!this.shell) return; document.documentElement.style.setProperty('--gb-rotate-x', `0.5deg`); setTimeout(() => { document.documentElement.style.setProperty('--gb-rotate-x', `0deg`) }, 150) }
}
const startOS = () => { if (!window.os) window.os = new EphantomOS() }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startOS); else startOS()
