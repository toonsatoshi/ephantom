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
    this.menuOptions = ['THE MATRIX', 'THE FORGE', 'ENTITIES', 'SYSTEM OVERVIEW', 'DAO ROSTER', 'THE VAULT', 'CONNECT WALLET']
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
    try {
      const urls = ['/api/cycle', '/api/tracks', '/api/entities', '/api/vault']
      const results = await Promise.all(urls.map(url => fetch(url).then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))))
      this.cycle = results[0]; this.tracks = results[1]; this.entities = results[2]; this.vault = results[3]
      if (this.vault?.votes_this_cycle) this.vault.votes_this_cycle.forEach(id => this.votedIds.add(id))
    } catch {
      this.cycle = { id: 1, phase: 'VOTING' }; this.tracks = [ { id: 101, title: 'GREEN NEEDLE', ii_name: 'JADE KAY', genre: 'R&B', bpm: 95, embedUrl: 'https://audius.co/embed/track/jadekay/green-needle?flavor=card' } ]; this.entities = [ { id: 'II-JADEKAY', name: 'JADE KAY', genre_cluster: 'R&B / RAP / EXPERIMENTAL' } ]; this.vault = { reputation: 1000 }
    }
    if (this.isBooted) this.render()
  }

  initTonConnect() { if (typeof TonConnectSDK !== 'undefined') { this.tonConnect = new TonConnectSDK.TonConnect({ manifestUrl: 'https://ephantom-protocol.pages.dev/tonconnect-manifest.json' }); this.tonConnect.onStatusChange(wallet => { this.wallet = wallet; this.render() }) } }
  bootSequence() { if (this.bootLock) return; this.bootLock = true; setTimeout(() => { this.powerLed.classList.add('flicker'); setTimeout(() => { this.powerLed.classList.remove('flicker'); this.powerLed.classList.add('on'); if (this.ledGlow) this.ledGlow.style.opacity = '1'; if (this.bezelGlow) this.bezelGlow.style.opacity = '1'; this.startIntro() }, 800) }, 600) }
  startIntro() { this.currentState = 'INTRO'; this.introStep = 0; this.isBooted = true; this.runIntroCycle() }
  runIntroCycle() { if (this.currentState !== 'INTRO') return; if (this.introStep >= this.introPhrases.length) { this.introTimer = null; this.currentState = 'SPLASH'; this.render(); return }; this.render(); this.introTimer = setTimeout(() => { this.introStep++; this.runIntroCycle() }, 5000) }
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
    else if (this.currentState === 'MENU') { if (action === 'up') this.menuIndex = (this.menuIndex - 1 + this.menuOptions.length) % this.menuOptions.length; if (action === 'down') this.menuIndex = (this.menuIndex + 1) % this.menuOptions.length; if (action === 'a') this.currentState = this.menuOptions[this.menuIndex] }
    else { if (action === 'b') { this.currentState = 'MENU'; this._stopAudio() } else this.routeInputToView(action) }
    this.render()
  }

  _stopAudio() { this.isPlaying = false; this.audioElement.pause() }
  routeInputToView(a) { switch (this.currentState) { case 'THE MATRIX': this._matrixInput(a); break; case 'THE FORGE': this._playerInput(a); break; case 'ENTITIES': this._rosterInput(a); break; case 'THE VAULT': this._vaultInput(a); break; case 'SYSTEM OVERVIEW': this._slideInput(a); break } }
  _playerInput(a) { if (a === 'left') this._curate('DISLIKE'); if (a === 'right') this._curate('LIKE'); if (a === 'a') this._togglePlay(); if (a === 'up') this._nextTrack(); if (a === 'down') this._prevTrack() }
  _curate(d) { this.curationStatus = d === 'LIKE' ? 'LIKED' : 'DISLIKED'; setTimeout(() => { this.curationStatus = null; this._nextTrack(); this.render() }, 600); this.render() }
  _togglePlay() { this.isPlaying = !this.isPlaying; if (this.isPlaying) this.audioElement.play().catch(() => {}); else this.audioElement.pause() }
  _nextTrack() { if (this.tracks.length) { this.playerIndex = (this.playerIndex + 1) % this.tracks.length; this._loadTrack() } }
  _prevTrack() { if (this.tracks.length) { this.playerIndex = (this.playerIndex - 1 + this.tracks.length) % this.tracks.length; this._loadTrack() } }
  _loadTrack() { const trk = this.tracks[this.playerIndex]; if (trk?.url) { this.audioElement.src = trk.url; if (this.isPlaying) this.audioElement.play().catch(() => {}) } }
  _matrixInput(a) { if (a === 'left') this.matrixIndex = (this.matrixIndex - 1 + this.tracks.length) % this.tracks.length; if (a === 'right') this.matrixIndex = (this.matrixIndex + 1) % this.tracks.length }
  _rosterInput(a) { if (a === 'left') this.rosterIndex = (this.rosterIndex - 1 + this.entities.length) % this.entities.length; if (a === 'right') this.rosterIndex = (this.rosterIndex + 1) % this.entities.length }
  _vaultInput(a) { if (a === 'left') this.vaultPage = Math.max(0, this.vaultPage - 1); if (a === 'right') this.vaultPage = Math.min(2, this.vaultPage + 1) }
  _slideInput(a) { if (a === 'left') this.currentSlide = Math.max(0, this.currentSlide - 1); if (a === 'right') this.currentSlide = Math.min(this.totalSlides - 1, this.currentSlide + 1) }

  render() {
    if (!this.viewContainer || !this.isBooted) return; this.viewContainer.innerHTML = ''
    switch (this.currentState) {
      case 'INTRO': this._renderIntro(); break; case 'SPLASH': this._renderSplash(); break; case 'MENU': this._renderMenu(); break
      case 'THE MATRIX': this._renderMatrix(); break; case 'THE FORGE': this._renderPlayer(); break; case 'ENTITIES': this._renderRoster(); break
      case 'DAO ROSTER': this._renderDaoRoster(); break; case 'THE VAULT': this._renderVault(); break; case 'SYSTEM OVERVIEW': this._renderSlides(); break
      default: this._renderSplash(); break
    }
  }

  _renderIntro() { const item = this.introPhrases[this.introStep] || { text: "" }; this.viewContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-[#8bac0f] p-4 text-center"><div class="cinematic-text font-bold" style="font-size: ${item.size}">${item.text}</div></div>` }
  _renderSplash() { this.viewContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-[#8bac0f] p-3 text-center"><div class="text-[24px] font-heading mb-3">EPHANTOM</div><div class="mt-4 animate-pulse bg-[#8bac0f] text-[#050c05] px-4 py-2 text-[10px] font-retro">PRESS START</div></div>` }
  _renderMenu() { this.viewContainer.innerHTML = `<div class="w-full p-2 text-[#8bac0f] font-tech"><div class="space-y-1">${this.menuOptions.map((opt, i) => `<div class="px-2 py-1 text-[10px] font-heading ${this.menuIndex === i ? 'selected' : ''}">${opt}</div>`).join('')}</div></div>` }
  _renderMatrix() { const trk = this.tracks[this.matrixIndex]; this.viewContainer.innerHTML = `<div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech"><div class="matrix-card flex-1 p-2 bg-[#8bac0f]/5"><div>${trk.title}</div><div class="text-[10px] opacity-60">${trk.ii_name}</div></div></div>` }
  _renderPlayer() { const trk = this.tracks[this.playerIndex]; this.viewContainer.innerHTML = `<div class="w-full h-full p-0 flex flex-col text-[#8bac0f] font-tech relative overflow-hidden">${trk.embedUrl ? `<iframe src="${trk.embedUrl}" width="100%" height="100%" allow="encrypted-media" style="border: none; background: #000;"></iframe>` : `<div>${trk.title}</div>`}${this.curationStatus ? `<div class="absolute inset-0 flex items-center justify-center z-[100] bg-[#050c05]/80 pointer-events-none"><div class="stamp-animation border-4 border-[#8bac0f] px-4 py-2 bg-[#050c05] font-heading text-[12px] -rotate-12">${this.curationStatus}</div></div>` : ''}</div>` }
  _renderRoster() { const ent = this.entities[this.rosterIndex]; this.viewContainer.innerHTML = `<div class="w-full h-full p-2 flex flex-col text-[#8bac0f] font-tech"><div class="matrix-card p-2 flex-1 bg-[#8bac0f]/5"><div class="text-[12px] font-heading">${ent.name}</div></div></div>` }
  _renderDaoRoster() { this.viewContainer.innerHTML = `<div class="w-full h-full p-2 text-[#8bac0f]">DAO_MEMBERS</div>` }
  _renderVault() { const v = this.vault || { reputation: 0 }; this.viewContainer.innerHTML = `<div class="w-full h-full p-2 text-[#8bac0f] flex flex-col items-center justify-center"><div class="text-[24px] font-heading">${v.reputation}</div><div>REPUTATION</div></div>` }
  _renderSlides() { this.viewContainer.innerHTML = `<div class="w-full h-full p-2 text-[#8bac0f]">SYSTEM_OVERVIEW</div>` }

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
  haptic(p = 'light') { if (typeof navigator !== 'undefined' && navigator.vibrate) ({ light: () => navigator.vibrate(10), medium: () => navigator.vibrate(35), heavy: () => navigator.vibrate([60,30,60]) })[p]?.() }
  applyPhysicalFeedback(a) { if (!this.shell) return; document.documentElement.style.setProperty('--gb-rotate-x', `0.5deg`); setTimeout(() => { document.documentElement.style.setProperty('--gb-rotate-x', `0deg`) }, 150) }
}
const startOS = () => { if (!window.os) window.os = new EphantomOS() }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startOS); else startOS()
