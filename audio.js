const Audio = (() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(ctx.destination);

    const sfxBus = ctx.createGain();
    sfxBus.gain.value = 1.0;
    sfxBus.connect(masterGain);

    const menuGain   = ctx.createGain();
    const battleGain = ctx.createGain();
    menuGain.gain.value   = 0;
    battleGain.gain.value = 0;
    menuGain.connect(masterGain);
    battleGain.connect(masterGain);

    const buffers = {};

    function _load(name, url) {
        return fetch(url)
            .then(r => r.arrayBuffer())
            .then(ab => ctx.decodeAudioData(ab))
            .then(buf => { buffers[name] = buf; });
    }

    function loadAll() {
        return Promise.allSettled([
            _load("music_menu",   "sounds/msong.wav"),
            _load("music_battle", "sounds/bsong.wav"),
            _load("sfx_button",   "sounds/pickupCoin.wav"),
            _load("sfx_shoot",    "sounds/explosion.wav"),
            _load("sfx_cannon",   "sounds/explosiona.wav"),
            _load("sfx_impact",   "sounds/explosionb.wav"),
            _load("sfx_win",      "sounds/win.wav"),
        ]);
    }

    const MENU_LOOP_START   = 0;
    const MENU_TRACK_LEN    = 30;
    const BATTLE_LOOP_START = 0;
    const BATTLE_TRACK_LEN  = 30;

    const FADE_TIME = 8.0;
    let menuSrc   = null;
    let battleSrc = null;
    let menuLoop  = null;
    let battleLoop = null;

    let _musicStarted = false;
    let _currentMode  = null;

    function _startLoopingTrack(name, gainNode, loopStart, trackLen, srcRef, loopRef) {
        if (srcRef.src) {
            try { srcRef.src.stop(); } catch(e) {}
            srcRef.src = null;
        }
        if (loopRef.timer) { clearTimeout(loopRef.timer); loopRef.timer = null; }

        const buf = buffers[name];
        if (!buf) return;

        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(gainNode);
        src.start(0, 0);
        srcRef.src = src;

        function scheduleLoop() {
            loopRef.timer = setTimeout(() => {
                if (!srcRef.src) return;
                const newSrc = ctx.createBufferSource();
                newSrc.buffer = buf;
                newSrc.connect(gainNode);
                newSrc.start(0, loopStart);
                try { srcRef.src.stop(ctx.currentTime + 0.05); } catch(e) {}
                srcRef.src = newSrc;
                scheduleLoop();
            }, (trackLen - loopStart) * 1000);
        }
        scheduleLoop();
    }

    const _menuRef   = { src: null };
    const _battleRef = { src: null };
    const _menuLoopRef   = { timer: null };
    const _battleLoopRef = { timer: null };

    function _startBothTracks() {
        _startLoopingTrack("music_menu",   menuGain,   MENU_LOOP_START,   MENU_TRACK_LEN,   _menuRef,   _menuLoopRef);
        _startLoopingTrack("music_battle", battleGain, BATTLE_LOOP_START, BATTLE_TRACK_LEN, _battleRef, _battleLoopRef);
    }

    function _crossfadeTo(mode) {
        if (_currentMode === mode) return;
        _currentMode = mode;

        const now = ctx.currentTime;
        if (mode === "menu") {
            menuGain.gain.cancelScheduledValues(now);
            battleGain.gain.cancelScheduledValues(now);
            menuGain.gain.linearRampToValueAtTime(0.55, now + FADE_TIME);
            battleGain.gain.linearRampToValueAtTime(0,    now + FADE_TIME);
        } else {
            menuGain.gain.cancelScheduledValues(now);
            battleGain.gain.cancelScheduledValues(now);
            menuGain.gain.linearRampToValueAtTime(0,    now + FADE_TIME);
            battleGain.gain.linearRampToValueAtTime(0.55, now + FADE_TIME);
        }
    }

    function playMenuMusic() {
        if (!_musicStarted) {
            _musicStarted = true;
            _startBothTracks();
            menuGain.gain.setValueAtTime(0.55, ctx.currentTime);
            battleGain.gain.setValueAtTime(0,   ctx.currentTime);
            _currentMode = "menu";
            return;
        }
        _crossfadeTo("menu");
    }

    function playBattleMusic() {
        _crossfadeTo("battle");
    }

    function _stopMusic() {
        const now = ctx.currentTime;
        menuGain.gain.cancelScheduledValues(now);
        battleGain.gain.cancelScheduledValues(now);
        menuGain.gain.linearRampToValueAtTime(0, now + 1.0);
        battleGain.gain.linearRampToValueAtTime(0, now + 1.0);
        _currentMode = null;
    }


    function _play(name, { volume = 1, rate = 1 } = {}) {
        const buf = buffers[name];
        if (!buf) return;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = rate;
        const g = ctx.createGain();
        g.gain.value = volume;
        src.connect(g);
        g.connect(sfxBus);
        src.start();
    }

    function playWin()  { _stopMusic(); setTimeout(() => _play("sfx_win", { volume: 0.7 }), 400); }
    function playLose() { _stopMusic(); setTimeout(() => _play("sfx_win", { volume: 0.4 }), 400);}

    let _shootCount       = 0;
    let _shootWindowStart = 0;

    function playShoot(isCavalry) {
        if (ctx.state === "suspended") ctx.resume();
        const now = Date.now();
        if (now - _shootWindowStart > 400) { _shootCount = 0; _shootWindowStart = now; }
        _shootCount++;
        if (_shootCount > 5) return;
        const base = isCavalry ? 0.28 : 0.45;
        const vol  = base * (1 - (_shootCount - 1) * 0.07);
        _play("sfx_shoot", { volume: vol, rate: 0.9 + Math.random() * 0.2 });
    }

    function playCannon() {
        if (ctx.state === "suspended") ctx.resume();
        _play("sfx_cannon", { volume: 0.6, rate: 0.88 + Math.random() * 0.24 });
    }

    function playImpact() {
        if (ctx.state === "suspended") ctx.resume();
        _play("sfx_impact", { volume: 0.5, rate: 0.82 + Math.random() * 0.36 });
    }

    function playButton() {
        if (ctx.state === "suspended") ctx.resume();
        _play("sfx_button", { volume: 0.55 });
    }

    function resume() { if (ctx.state === "suspended") ctx.resume(); }

    return { loadAll, playMenuMusic, playBattleMusic, playWin, playLose, playShoot, playCannon, playImpact, playButton, resume };
})();

document.addEventListener("click", () => Audio.resume(), { once: true });

Audio.loadAll().then(() => Audio.playMenuMusic());