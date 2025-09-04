
    /* =======================
      Config & Utilities
    ========================*/
    const DBG = {
        mg: false
    };

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - document.getElementById('game-header').offsetHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const dialogueBox = document.getElementById('dialogue-box');
    const dialogueText = document.getElementById('dialogue-text');
    const responseOptions = document.getElementById('response-options');
    const vocabularyCount = document.getElementById('vocabulary-count');
    const timeDisplay = document.getElementById('time-display');
    const locationDisplay = document.getElementById('location-display');
    const startScreen = document.getElementById('start-screen');
    const startButton = document.getElementById('start-button');
    const joystick = document.getElementById('joystick');
    const interactBtn = document.getElementById('interact-btn');
    const closeDialogue = document.getElementById('close-dialogue');
    const notification = document.getElementById('notification');
    const npcHint = document.getElementById('npc-hint');
    const mapButton = document.getElementById('map-button');
    const mapOverlay = document.getElementById('map-overlay');
    const closeMap = document.getElementById('close-map');
    const schoolScreen = document.getElementById('school-screen');
    const closeSchool = document.getElementById('close-school');
    const vocabLesson = document.getElementById('vocab-lesson');
    const grammarLesson = document.getElementById('grammar-lesson');
    const jobBtn = document.getElementById('job-button');
    const jobOv = document.getElementById('job-overlay');
    const jobStatus = document.getElementById('job-status');

    const KeyState = {
        left: false,
        right: false,
        up: false,
        down: false,
        interact: false
    };
    window.addEventListener('keydown', (e) => {
        if (!document.hasFocus()) {
            try {
                window.focus();
            } catch {}
        }
        const k = (e.key || '').toLowerCase();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
            e.preventDefault();
        }
        if (k === 'k') {
            const box = document.getElementById('keydebug');
            box.style.display = box.style.display === 'none' ? 'block' : 'none';
        }
        if (k === 'arrowleft' || k === 'a') KeyState.left = true;
        if (k === 'arrowright' || k === 'd') KeyState.right = true;
        if (k === 'arrowup' || k === 'w') KeyState.up = true;
        if (k === 'arrowdown' || k === 's') KeyState.down = true;
        if (k === 'e' || k === ' ' || k === 'enter') KeyState.interact = true;
    });
    
    window.addEventListener('keyup', (e) => {
        const k = (e.key || '').toLowerCase();
        if (k === 'arrowleft' || k === 'a') KeyState.left = false;
        if (k === 'arrowright' || k === 'd') KeyState.right = false;
        if (k === 'arrowup' || k === 'w') KeyState.up = false;
        if (k === 'arrowdown' || k === 's') KeyState.down = false;
        if (k === 'e' || k === ' ' || k === 'enter') KeyState.interact = false;
    });

    let gameState = {
        player: {
            x: 0,
            y: 0,
            speed: 2.6,
            direction: 'down',
            isMoving: false
        },
        knownWords: ['こんにちは', 'ありがとう', 'コーヒー'],
        inMinigame: false,
        coins: 0,
        learnedSinceMiniGame: 0,
        time: 10.00,
        timeSpeed: 0.2,
        relationships: {
            'takeshi': 0,
            'yuki': 0,
            'akari': 0
        },
        inDialogue: false,
        currentNPC: null,
        gameStarted: false,
        touchId: null,
        playerLocation: 'street',
        learnedWords: {
            'こんにちは': true,
            'ありがとう': true,
            'コーヒー': true,
            'おはよう': false,
            'すみません': false,
            'はい': false,
            'いいえ': false,
            '名前': false,
            '私': false,
            'あなた': false,
            'お願いします': false,
            '水': false,
            'いくらですか': false,
            '美味しい': false,
            '学校': false,
            '勉強': false,
            '日本語': false
        },
        storyProgress: {
            cafeVisited: false,
            metTakeshi: false,
            helpedYuki: false,
            foundBook: false,
            visitedSchool: false
        },
        newMapUnlocked: false,
        currentMap: 'city',
        socialPenaltyUntil: 0,
        jobs: {
            unlocked: {
                cafe: false
            },
            currentJobId: null,
            currentRankIndex: 0,
            isOnShift: false,
            lastSeenAt: Date.now(),
            pendingEventQueue: [],
            totalOfflineHoursWorked: 0,
            eventsTriggered: 0,
            extraEventAnchor: 0,
            totalHoursWorked: 0
        },
        inBattle: false,
        encounterTimerId: null,
        battle: {
          hp: 10,                 // HP do jogador
          enemyHp: 10,            // HP do inimigo
          targetWords: [],
          targetSeq: [],
          targetAnswer: '',
          turn: 'player',
          pickedThisTurn: false,
          history: [],
          battleEnded: false,
          victoryFxRunning: false
        },
        gameMinutesTotal: 0,
        socialPenaltyUntilAbs: 0,
        routeDaily: {},
        flags: {},
        npcTempGrumpy: {}
    };

// expose to window for modules and skills
window.gameState = window.gameState || gameState;

    const SAVE_KEY = 'NJ:SAVE:v2';     // mude a versão se quiser invalidar saves antigos
    let HAS_LOADED_FROM_STORAGE = false;
    let AUTOSAVE_ENABLED = true;      // só liga depois do Start
    let matrixRAF = 0, mxCtx = null, mxCols = [], mxW=0, mxH=0, mxFont=16;

    // ==== Dialogue Graph Core ====
    /** Node de diálogo */
    class DialogueNode {
      constructor({ id, npc, text, requirements = {}, options = [], effects = {}, cooldown = 0, tags = [] }) {
        Object.assign(this, { id, npc, text, requirements, options, effects, cooldown, tags });
        this.lastSeenAtAbsMin = -Infinity;
      }
    }

    /** util: checa requisitos contra contexto */
    function checkReq(req, ctx, opts){
      const { ignoreCooldown=false, allowAnyTimeInSession=false } = opts || {};
      if (req.location && req.location !== ctx.location) return false;

      if (req.time && !allowAnyTimeInSession){
        const h = Math.floor(ctx.gameTime);
        const slot = (h < 12) ? "morning" : (h < 18 ? "afternoon" : "evening");
        if (Array.isArray(req.time) ? !req.time.includes(slot) : req.time !== slot) return false;
      }

      if (typeof req.minRel === "number" && (ctx.relNpc||0) < req.minRel) return false;
      if (Array.isArray(req.requiredWords)){
        for (const w of req.requiredWords) if (!ctx.knownWords.includes(w)) return false;
      }
      if (req.flagsAll){ for (const f of req.flagsAll) if (!ctx.flags[f]) return false; }
      if (req.flagsNone){ for (const f of req.flagsNone) if (ctx.flags[f]) return false; }
      if (req.noPenalty && ctx.isPenaltyActive) return false;

      if (!ignoreCooldown && ctx.nodeCooldown){
        if (ctx.nowAbsMin - ctx.nodeCooldown.lastSeenAtAbsMin < (req.minCooldown||0)) return false;
      }
      return true;
    }

    function routeNextNode(npcId, graph, ctx, opts){
      const candidates = graph.filter(n => n.npc === npcId);
      const now = ctx.nowAbsMin;
      return candidates.find(n=>{
        n.lastSeenAtAbsMin ??= -Infinity;
        return checkReq(
          Object.assign({minCooldown: n.cooldown||0}, n.requirements),
          Object.assign({}, ctx, { nodeCooldown: n, nowAbsMin: now }),
          opts
        );
      });
    }

    function normWord(w){
      return (w ?? "").toString().trim().normalize("NFKC"); // evita variantes semelhantes
    }

    function ensureVocabState(){
      gameState.learnedWords ||= {};   // { "こんにちは": { firstSeenAt, source } }
      gameState.knownWords   ||= [];   // usado só pra UI/legado; manteremos dedup com learnedWords
    }

    function learnWordUnique(word, source="dialogue"){
      ensureVocabState();
      const w = normWord(word);
      if (!w) return false;

      const already = !!gameState.learnedWords[w];
      if (!already){
        gameState.learnedWords[w] = { firstSeenAt: gameState.gameMinutesTotal||0, source };
        // mantém array legado em sincronia sem duplicar
        if (!gameState.knownWords.includes(w)) gameState.knownWords.push(w);
        if (typeof updateVocabularyCount === "function") updateVocabularyCount();
      }
      return !already;
    }

    /** aplica efeitos atômicos */
    function applyDialogueEffects(effects, ctx){
      const st = ctx.state;

      // afinidade (com multiplicador se penalidade ativa)
      if (typeof effects.relationship === "number"){
        const mult = ctx.isPenaltyActive ? 0.5 : 1.0; // pênalti reduz ganhos
        st.relationships[ctx.npcId] = (st.relationships[ctx.npcId]||0) + (effects.relationship * mult);
      }

      // fofoca (impacto cross-NPC)
      if (effects.gossip){
        const { target, delta = 0 } = effects.gossip;
        if (target) st.relationships[target] = (st.relationships[target]||0) + delta;
      }

      // grumpy temporário
      if (effects.grumpyFor){         // minutos de jogo
        st.npcTempGrumpy = st.npcTempGrumpy || {};
        st.npcTempGrumpy[ctx.npcId] = (st.gameMinutesTotal||0) + effects.grumpyFor;
      }

      if (effects.learnWord){
        learnWordUnique(effects.learnWord, "dialogue");
      }

      if (typeof effects.coins === "number"){
        st.coins = (st.coins||0) + effects.coins;
        if (typeof updateCoins === "function") updateCoins();
      }
      if (effects.setFlag){
        st.storyProgress = st.storyProgress || {};
        st.storyProgress[effects.setFlag] = true;
      }
      if (effects.unlockArea === "novo"){
        st.newMapUnlocked = true;
        showNotification("New District unlocked!");
      }
      if (typeof effects.jobPromoChance === "number"){
        // empilha chance de promoção (usada no resolveWorkChoice)
        st.jobs = st.jobs || {};
        st.jobs.extraEventAnchor = (st.jobs.extraEventAnchor||0) + effects.jobPromoChance;
      }

      if (effects.setFlag){
        gameState.storyProgress ||= {};
        if (!gameState.storyProgress[effects.setFlag]) {
          gameState.storyProgress[effects.setFlag] = true;
          if (effects.toast && typeof showNotification === "function"){
            showNotification(effects.toast);
          }
        }
      }

      if (effects.unlocked){
        const u = effects.unlocked;
        if (typeof u === "string") unlockJob(u);
        else if (u && u.key) unlockJob(u.key, u.toast);
      }
    }

    const persisted = loadGameFromStorage();
    if (persisted){
      // merge superficial - mantenha objetos esperados
      gameState = Object.assign({}, gameState, persisted);
    } else {
      // Primeiro boot: NÃO salve ainda. Espere o usuário apertar Start.
      HAS_LOADED_FROM_STORAGE = false;
    }

    /* =======================
      Work system (jobs & events)
    ========================*/
    const JOBS = {
        cafe: {
            id: 'cafe',
            name: 'Cafe',
            unlockFlag: 'metTakeshi',
            ranks: [{
                    id: 'cleaner',
                    name: 'Cleaning',
                    rate: 4
                },
                {
                    id: 'barista',
                    name: 'Barista',
                    rate: 7
                },
                {
                    id: 'cashier',
                    name: 'Cashier',
                    rate: 10
                },
                {
                    id: 'manager',
                    name: 'Manager',
                    rate: 16
                },
            ],
            eventMilestones: [10, 20, 30, 50, 80, 120],
        },
    };

    function initPlayerPosition() {
        canvas.width || resizeCanvas();
        gameState.player.x = canvas.width / 2;
        gameState.player.y = canvas.height / 2;
    }

    gameState.gameMinutesTotal = 0;
    gameState.socialPenaltyUntilAbs = 0;
    gameState.battle.guardActive = false;      // se true, bloqueia o próximo golpe inimigo
    gameState.battle.guardPower = 1.0;         // 1.0 = bloqueia 100% (ajustável)
    gameState.battle.defensePending = false;   // defesa em andamento (skill overlay aberto)
    initPlayerPosition();

    const DICT = {
      "こんにちは": "olá",
      "ありがとう": "obrigado(a)",
      "コーヒー": "café",
      "お願いします": "por favor",
      "すみません": "com licença / desculpa",
      "はい": "sim",
      "水": "água",
      "学校": "escola",
      "勉強": "estudo",
      "日本語": "língua japonesa"
    };

    // Palavras “neutras” que NÃO geram penalidade ao consultar (opcional)
    const DICT_SAFE = new Set(["水"]); // exemplo: olhar “água” não pega mal

    // Quanto tempo (em minutos in-game) dura a bronca social
    const DICT_PENALTY_MINUTES = 30;

    // Se o uso do dicionário gera fofoca (impacto em outra relação)
    const DICT_GOSSIP = { enabled: true, target: "yuki", delta: -1 };

    let JP_SENTENCES = [
      { words:["私","は","学生","です"],            answer:"私は学生です" },
      { words:["おはよう","ございます"],             answer:"おはようございます" },
      { words:["日本語","を","勉強","します"],        answer:"日本語を勉強します" },
      { words:["水","を","ください"],               answer:"水をください" },
      { words:["ここ","は","公園","です"],          answer:"ここは公園です" },
      { words:["コーヒー","を","お願いします"],       answer:"コーヒーをお願いします" },
      { words:["すみません","駅","は","どこ","です","か"], answer:"すみません駅はどこですか" },
    ];

    const wordDictionary = {
        'こんにちは': 'Hello',
        'ありがとう': 'Thank you',
        'コーヒー': 'Coffee',
        'おはよう': 'Good morning',
        'すみません': 'Excuse me/Sorry',
        'はい': 'Yes',
        'いいえ': 'No',
        '名前': 'Name',
        '私': 'I/me',
        'あなた': 'You',
        'お願いします': 'Please',
        '水': 'Water',
        'いくらですか': 'How much is it?',
        '美味しい': 'Delicious',
        '学校': 'School',
        '勉強': 'Study',
        '日本語': 'Japanese (language)'
    };
    const wordPOS = {
        'こんにちは': 'interjection (greeting)',
        'ありがとう': 'interjection (thanks)',
        'コーヒー': 'noun',
        'おはよう': 'interjection (greeting)',
        'すみません': 'expression (apology/perm.)',
        'はい': 'adverb (affirmation)',
        'いいえ': 'adverb (negation)',
        '名前': 'noun',
        '私': 'pronoun',
        'あなた': 'pronoun',
        'お願いします': 'expression (request)',
        '水': 'noun',
        'いくらですか': 'expression (question)',
        '美味しい': 'adjective',
        '学校': 'noun',
        '勉強': 'noun/verb-suru',
        '日本語': 'noun'
    };


    gameState.battle.skillActive = false;

    // pool simples de pares Kanji → EN
    const EQ_PAIRS = [
      { kanji:'水', en:'water' },
      { kanji:'火', en:'fire' },
      { kanji:'木', en:'tree' },
      { kanji:'山', en:'mountain' },
      { kanji:'川', en:'river' },
      { kanji:'茶', en:'tea' },
      { kanji:'駅', en:'station' },
      { kanji:'本', en:'book' },
      { kanji:'空', en:'sky' },
      { kanji:'雨', en:'rain' },
    ];

    
    // ==== Configs ====
    const ENEMY_MAX_HP = 10;
    const PAIRS_SRC = EQ_PAIRS;
    const DURATION_MS = 5000; // 5s máx

    // --- Helpers de limpeza ---
    function stripQuotes(raw){
      return String(raw ?? '')
        .replace(/^[\"“”„‟‚‘’‹›«»『』「」〝〟]+/, '')
        .replace(/[\"“”„‟‚‘’‹›«»『』「」〝〟]+$/, '');
    }
    function normalizeToken(s){
      return stripQuotes(s).normalize('NFKC').replace(/\s+/g,'').trim();
    }

    function sanitizeJPSentences(arr){
      if (!Array.isArray(arr)) return [];
      return arr.map(item=>{
        let words = item?.words;
        if (!Array.isArray(words) && typeof words === 'string'){
          try { const p = JSON.parse(words); if (Array.isArray(p)) words = p; } catch {}
        }
        if (!Array.isArray(words)) words = [];
        words = words.map(stripQuotes);
        const answer = stripQuotes(item?.answer || words.join(''));
        return { ...item, words, answer };
      });
    }

    // Garante frase válida (>=2 palavras)
    function pickValidSentence(){
      if (!Array.isArray(window.JP_SENTENCES) || !window.JP_SENTENCES.__cleaned){
        window.JP_SENTENCES = sanitizeJPSentences(window.JP_SENTENCES || []);
        window.JP_SENTENCES.__cleaned = true;
      }
      for (let i=0;i<10;i++){
        const cand = window.JP_SENTENCES[Math.floor(Math.random()*window.JP_SENTENCES.length)];
        if (Array.isArray(cand?.words) && cand.words.length >= 2 && cand.words.every(w=>typeof w==='string')) {
          return { words: cand.words.slice(), answer: cand.answer || cand.words.join('') };
        }
      }
      return { words:['おはよう','ございます'], answer:'おはようございます' };
    }

    // REASSIGNA O ARRAY
    JP_SENTENCES = sanitizeJPSentences(JP_SENTENCES);

    // (opcional) debug depois de sanitizar:
    console.log('Sanitized:', JP_SENTENCES.map(s => s.words));
    // garante a estrutura, se ainda não tiver
    function ensureJobs(){
      if (!gameState.jobs) gameState.jobs = {};
      if (!gameState.jobs.unlocked) gameState.jobs.unlocked = {};
      if (!Array.isArray(gameState.jobs.pendingEventQueue)) gameState.jobs.pendingEventQueue = [];
    }

    // use isto para enfileirar eventos (quando processar horas offline etc.)
    function pushWorkEvent(ev){
      ensureJobs();
      gameState.jobs.pendingEventQueue.push(ev);
      if (AUTOSAVE_ENABLED) saveGameToStorage(); // só salva depois do Start
    }

    // chame esta função para abrir o PRÓXIMO evento da fila (se puder)
    function maybeOpenNextWorkEvent(){
      ensureJobs();

      // não abrir durante boot (antes do Start) nem enquanto overlays críticos estiverem ativos
      if (!AUTOSAVE_ENABLED) return;                        // evita “popar” no boot
      if (gameState.inDialogue || gameState.inMinigame || gameState.inBattle) return;

      // trava reentrância (garante um evento por vez)
      gameState.uiLocks = gameState.uiLocks || {};
      if (gameState.uiLocks.workEventOpen) return;

      const q = gameState.jobs.pendingEventQueue;
      if (!q.length) return;

      const ev = q.shift();
      saveGameToStorage();                                   // gated

      gameState.uiLocks.workEventOpen = true;
      try {
        openWorkEvent(ev);                                   // sua função que mostra o overlay
      } catch (e) {
        console.warn('openWorkEvent failed:', e);
        gameState.uiLocks.workEventOpen = false;            // libera se falhar
      }
    }

    // chame isto ao FECHAR o overlay de evento (no botão "Entendi"/"Fechar")
    function closeWorkEvent(){
      gameState.uiLocks = gameState.uiLocks || {};
      gameState.uiLocks.workEventOpen = false;
      if (AUTOSAVE_ENABLED) saveGameToStorage();
    }

    function tryPromote() {
      gameState.jobs = gameState.jobs || {};
      const jobId = gameState.jobs.currentJobId || 'cafe';
      const job = JOBS ? JOBS[jobId] : null;
      if (!job) return;

      const idx = gameState.jobs.currentRankIndex || 0;
      if (idx < job.ranks.length - 1) {
        gameState.jobs.currentRankIndex = idx + 1;
        const newRank = job.ranks[gameState.jobs.currentRankIndex];
        const rateTxt = (newRank && typeof newRank.rate !== 'undefined') ? ` (+${newRank.rate}/h)` : '';
        showNotification(`Promotion! New rank: ${newRank?.name || '—'}${rateTxt}.`, 4000);
      } else {
        showNotification('You are already at the top of this career!');
      }

      // persiste (gated)
      if (typeof saveGameToStorage === 'function') saveGameToStorage();
    }

    function resolveWorkChoice(ev, effects) {
      // sanity
      effects = effects || {};
      gameState.relationships = gameState.relationships || {};
      gameState.jobs = gameState.jobs || {};

      // coins
      if (typeof effects.coins === 'number' && effects.coins !== 0) {
        gameState.coins = (gameState.coins || 0) + effects.coins;
        if (typeof updateCoins === 'function') updateCoins();
        showNotification(effects.coins > 0
          ? `Bonus +${effects.coins} coins!`
          : `Cost ${Math.abs(effects.coins)} coins.`
        );
      }

      // relação com Takeshi
      if (typeof effects.relTakeshi === 'number' && effects.relTakeshi !== 0) {
        gameState.relationships['takeshi'] = (gameState.relationships['takeshi'] || 0) + effects.relTakeshi;
      }

      // chance de promoção (clamp 0..0.5 por segurança)
      let p = 0;
      if (typeof effects.promoChance === 'number') p += Math.max(0, effects.promoChance);
      // bônus por relacionamento (máx +0.10)
      p += Math.max(0, Math.min(0.10, (gameState.relationships['takeshi'] || 0) * 0.02));
      // bônus por horas trabalhadas (máx +0.10)
      p += Math.min(0.10, (gameState.jobs.totalOfflineHoursWorked || 0) * 0.002);
      p = Math.max(0, Math.min(0.5, p)); // clamp final

      if (Math.random() < p) {
        tryPromote();
      } else {
        showNotification('Event resolved. Keep it up!');
      }

      // persiste (respeita AUTOSAVE_ENABLED)
      if (typeof saveGameToStorage === 'function') saveGameToStorage();

      // fecha overlay e libera fila
      if (typeof closeWorkEvent === 'function') closeWorkEvent();

      // se você usa fila, pode tentar abrir o próximo:
      if (typeof maybeOpenNextWorkEvent === 'function') maybeOpenNextWorkEvent();
    }

    // (se já definiu em outro lugar, reaproveite)
    const REAL_MS_PER_JOB_HOUR = window.REAL_MS_PER_JOB_HOUR || (3*60*1000); // 3 min reais = 1h de trabalho
    function currentMinutesOfDay() {
        const h = Math.floor(gameState.time);
        const m = Math.floor((gameState.time - h) * 60);
        return h * 60 + m;
    }

    // helpers de estado (se ainda não existirem)
    function isSocialPenaltyActive(){
      return (gameState.gameMinutesTotal || 0) < (gameState.socialPenaltyUntil || 0);
    }

    function ensureState(){
      gameState.relationships ||= {};
      gameState.npcTempGrumpy ||= {};
      gameState.knownWords ||= [];
      gameState.learnedWords ||= {};
    }

    function triggerDictionaryPenalty(npcId){
      const now = gameState.gameMinutesTotal || 0;
      gameState.socialPenaltyUntil = now + DICT_PENALTY_MINUTES;       // reduz ganhos de afinidade
      gameState.npcTempGrumpy[npcId] = now + DICT_PENALTY_MINUTES;     // NPC ranzinza

      if (DICT_GOSSIP.enabled && DICT_GOSSIP.target){
        gameState.relationships[DICT_GOSSIP.target] =
          (gameState.relationships[DICT_GOSSIP.target]||0) + (DICT_GOSSIP.delta||0);
      }
    }

    // NPC está grumpy?
    function isNpcGrumpy(npcId){
      const until = gameState.npcTempGrumpy?.[npcId] || 0;
      return (gameState.gameMinutesTotal||0) < until;
    }

    function getDictEls() {
        return {
            overlay: document.getElementById('dict-overlay'),
            w: document.getElementById('dict-word'),
            pos: document.getElementById('dict-pos'),
            meaning: document.getElementById('dict-meaning'),
            badge: document.getElementById('dict-penalty-badge'),
            close: document.getElementById('dict-close')
        };
    }

    // === SUBSTITUA sua função por esta ===
    function openDictionary(word) {
      ensureState();

      // 1) abrir/atualizar o overlay existente (coloque aqui o SEU código atual)
      //    ex.: showDictionaryOverlay(word);
      // -----------------------------------------
      // showDictionaryOverlay(word); // <— se tiver uma função assim
      // -----------------------------------------

      // se nada foi passado (ou veio undefined), não prossiga
      if (!word) return;

      // aprender a palavra (se essa é a regra do seu jogo)
      learnWordIfNew(word);

      // 2) penalidade social só quando:
      //    - estamos conversando
      //    - há um NPC atual
      //    - a palavra NÃO é "safe"
      if (gameState.inDialogue && gameState.currentNPC && !DICT_SAFE.has(word)) {
        const npcId = gameState.currentNPC.id;
        const now = gameState.gameMinutesTotal || 0;

        // estende/renova a janela de penalidade baseada em tempo
        gameState.socialPenaltyUntil = now + DICT_PENALTY_MINUTES;

        // deixa o NPC atual “grumpy” pelo mesmo período
        gameState.npcTempGrumpy[npcId] = now + DICT_PENALTY_MINUTES;

        // (opcional) fofoca/impacto em outro NPC
        // gameState.relationships.yuki = (gameState.relationships.yuki || 0) - 1;

        const els = getDictEls();
        if (!els.overlay) return;

        // popula overlay com teus dados
        const meaning = wordDictionary[word] || '—';
        const pos = wordPOS[word] || '—';
        els.w.textContent = word;
        els.pos.textContent = pos;
        els.meaning.textContent = meaning;

        // badge de penalidade (usa tua função existente)
        els.badge.style.display = isSocialPenaltyActive() ? 'inline-block' : 'none';

        // mostra overlay (mantém teu visual)
        els.overlay.style.display = 'flex';

        if (typeof showNotification === "function") {
          // mostra só quando a penalidade NÃO estava ativa (evita spam)
          if (!isSocialPenaltyActive() || (gameState.socialPenaltyUntil - now) <= DICT_PENALTY_MINUTES + 0.1) {
            showNotification("They noticed you checking the dictionary…");
          }
        }
      }
    }

    (function() {
        const els = getDictEls();
        if (els.close) {
            els.close.addEventListener('click', () => {
                els.overlay.style.display = 'none';
            });
        }
    })();

    function annotateDialogueText(rawText) {
        let t = String(rawText);
        Object.keys(wordDictionary).forEach((w) => {
            if (gameState.knownWords.indexOf(w) !== -1 && t.indexOf(w) !== -1) {
                const rep = '<span class="learned-word" data-word="' + w + '">' + w + ' (' + (wordDictionary[w] || '') + ')</span>';
                t = t.split(w).join(rep);
            }
        });
        Object.keys(wordDictionary).forEach((w) => {
            if (gameState.knownWords.indexOf(w) === -1 && t.indexOf(w) !== -1) {
                const rep = '<span class="unknown-word" data-word="' + w + '">' + w + '</span>';
                t = t.split(w).join(rep);
            }
        });
        return t;
    }
    const dictTapHandler = (e) => {
        const t = e.target;
        if (t && t.classList && t.classList.contains('unknown-word')) {
            e.preventDefault();
            e.stopPropagation();
            const w = t.getAttribute('data-word');
            if (w) openDictionary(w);
        }
    };
    dialogueText.addEventListener('pointerup', dictTapHandler, {
        passive: false
    });
    dialogueText.addEventListener('click', dictTapHandler, {
        passive: false
    });
    dialogueBox.addEventListener('pointerup', dictTapHandler, {
        passive: false
    });
    dialogueBox.addEventListener('click', dictTapHandler, {
        passive: false
    });

    function currentTimeSlot(gameTimeHour){
      const h = Math.floor(gameTimeHour||0);
      return (h < 12) ? "morning" : (h < 18 ? "afternoon" : "evening");
    }

    // Constrói nós a partir do objeto legado
    function buildGraphFromLegacy(npcs){
      const graph = [];
      for (const npc of npcs){
        for (const place of Object.keys(npc.dialogues||{})){
          (npc.dialogues[place]||[]).forEach((dlg, idx)=>{
            graph.push(new DialogueNode({
              id: `${npc.id}_${place}_${dlg.time}_${idx}`,
              npc: npc.id,
              text: dlg.japanese || "",
              requirements: {
                location: place,
                time: dlg.time,
                minRel: dlg.relationshipLevel || 0,
                requiredWords: dlg.requiredWords || []
              },
              options: (dlg.responses||[]).map(r=>({
                label: r.words?.length ? `Falar: ${r.words.join(" + ")}` : "Responder",
                needsWords: r.words || [],
                goto: null,
                effects: {
                  relationship: typeof r.relationship === "number" ? r.relationship : 0,
                  learnWord: r.learnWord || undefined,
                  // 👇 guardamos o texto de volta do NPC
                  say: r.response || null
                }
              })),
              cooldown: 8
            }));
          });
        }
      }
      return graph;
    }


    // NPCs (full dialogues)
    const npcs = [{
      id: 'takeshi',
      name: 'Takeshi',
      x: 0,
      y: 0,
      color: '#e76f51',
      location: 'cafe',
      schedule: {
          morning: 'cafe',
          afternoon: 'cafe',
          evening: 'park'
      },
    },
    {
      id: 'yuki',
      name: 'Yuki',
      x: 0,
      y: 0,
      color: '#9d4edd',
      location: 'park',
      schedule: {
          morning: 'park',
          afternoon: 'store',
          evening: 'park'
      },
    },
    {
      id: 'akari',
      name: 'Akari',
      x: 0,
      y: 0,
      color: '#90e0ef',
      location: 'school',
      schedule: {
        morning: 'school',
        afternoon: 'school',
        evening: 'shrine'
      },
    }
];

    // ==== Dialogue Graph: Takeshi ====
    const DIALOGUE_GRAPH = [
      // ======================
      // TAKESHI — CAFE
      // ======================
      {
        id: "takeshi:cafe:0",
        npc: "takeshi",
        text: "おはよう！今日もいい天気ですね。コーヒーはいかがですか？",
        requirements: {
          location: "cafe",
          time: "morning",
          minRel: 0,
          requiredWords: ["こんにちは"]
        },
        options: [
          {
            label: "Falar: こんにちは + コーヒー",
            needsWords: ["こんにちは", "コーヒー"],
            goto: "takeshi:cafe:0:reply#0",
            effects: { relationship: 1, learnWord: "お願いします",  unlocked: { key: "cafe", toast: "Cafe job unlocked!" } }
          },
          {
            label: "Falar: こんにちは",
            needsWords: ["こんにちは"],
            goto: "takeshi:cafe:0:reply#1",
            effects: { relationship: 0.5 }
          }
        ],
        effects: {},
        cooldown: 8,
        tags: ["legacy-base"]
      },
      {
        id: "takeshi:cafe:0:reply#0",
        npc: "takeshi",
        text: "はい、かしこまりました。少々お待ちください。美味しいコーヒーをお出ししますね。",
        requirements: {},
        options: [
          { label: "Continuar", goto: "takeshi:cafe:1", effects: {} }
        ],
        effects: {},
        cooldown: 0,
        tags: ["legacy-reply"]
      },
      {
        id: "takeshi:cafe:0:reply#1",
        npc: "takeshi",
        text: "こんにちは！いらっしゃいませ。ゆっくりしていってください。",
        requirements: {},
        options: [
          { label: "Continuar", goto: "takeshi:cafe:1", effects: {} }
        ],
        effects: {},
        cooldown: 0,
        tags: ["legacy-reply"]
      },

      {
        id: "takeshi:cafe:1",
        npc: "takeshi",
        text: "こんにちは！ゆっくりしていってください。",
        requirements: {
          location: "cafe",
          time: "afternoon",
          minRel: 0,
          requiredWords: ["こんにちは"]
        },
        options: [
          {
            label: "Falar: こんにちは + ありがとう",
            needsWords: ["こんにちは", "ありがとう"],
            goto: "takeshi:cafe:1:reply#0",
            effects: { relationship: 1, learnWord: "すみません" }
          }
        ],
        effects: {},
        cooldown: 8,
        tags: ["legacy-base"]
      },
      {
        id: "takeshi:cafe:1:reply#0",
        npc: "takeshi",
        text: "どういたしまして。またお越しください。ところで、日本語の勉強はどうですか？",
        requirements: {},
        options: [],
        effects: {},
        cooldown: 0,
        tags: ["legacy-reply"]
      },

      // ======================
      // TAKESHI — PARK
      // ======================
      {
        id: "takeshi:park:0",
        npc: "takeshi",
        text: "やあ！公園で休んでるんだ。君もコーヒー飲む？",
        requirements: {
          location: "park",
          time: "evening",
          minRel: 1,
          requiredWords: ["こんにちは"]
        },
        options: [
          {
            label: "Falar: こんにちは + はい",
            needsWords: ["こんにちは", "はい"],
            goto: "takeshi:park:0:reply#0",
            effects: { relationship: 2, learnWord: "水" }
          }
        ],
        effects: {},
        cooldown: 8,
        tags: ["legacy-base"]
      },
      {
        id: "takeshi:park:0:reply#0",
        npc: "takeshi",
        text: "はい、どうぞ。ところで、最近どう？日本語は上手になった？",
        requirements: {},
        options: [],
        effects: {},
        cooldown: 0,
        tags: ["legacy-reply"]
      },

      // ======================
      // YUKI — PARK
      // ======================
      {
        id: "yuki:park:0",
        npc: "yuki",
        text: "おはようございます。お元気ですか？",
        requirements: {
          location: "park",
          time: "morning",
          minRel: 0,
          requiredWords: ["こんにちは"]
        },
        options: [
          {
            label: "Falar: こんにちは",
            needsWords: ["こんにちは"],
            goto: "yuki:park:0:reply#0",
            effects: { relationship: 1, learnWord: "おはよう" }
          }
        ],
        effects: {},
        cooldown: 8,
        tags: ["legacy-base"]
      },
      {
        id: "yuki:park:0:reply#0",
        npc: "yuki",
        text: "今日はいい天気ですね。公園が気に入りましたか？私はよくここで本を読みます。",
        requirements: {},
        options: [
          { label: "Continuar", goto: "yuki:park:1", effects: {} }
        ],
        effects: {},
        cooldown: 0,
        tags: ["legacy-reply"]
      },

      {
        id: "yuki:park:1",
        npc: "yuki",
        text: "あら、あなたも公園がお好きなんですか？",
        requirements: {
          location: "park",
          time: "evening",
          minRel: 1,
          requiredWords: ["こんにちは"]
        },
        options: [
          {
            label: "Falar: はい",
            needsWords: ["はい"],
            goto: "yuki:park:1:reply#0",
            effects: { relationship: 2, learnWord: "美味しい" }
          }
        ],
        effects: {},
        cooldown: 8,
        tags: ["legacy-base"]
      },
      {
        id: "yuki:park:1:reply#0",
        npc: "yuki",
        text: "私もです！週末にはよくここで読書をします。この公園は静かで大好きです。",
        requirements: {},
        options: [],
        effects: {},
        cooldown: 0,
        tags: ["legacy-reply"]
      },

      // ======================
      // YUKI — STORE
      // ======================
      {
        id: "yuki:store:0",
        npc: "yuki",
        text: "あ、こんにちは！買い物ですか？",
        requirements: {
          location: "store",
          time: "afternoon",
          minRel: 1,
          requiredWords: ["こんにちは"]
        },
        options: [
          {
            label: "Falar: こんにちは + はい",
            needsWords: ["こんにちは", "はい"],
            goto: "yuki:store:0:reply#0",
            effects: { relationship: 1, learnWord: "いくらですか" }
          }
        ],
        effects: {},
        cooldown: 8,
        tags: ["legacy-base"]
      },
      {
        id: "yuki:store:0:reply#0",
        npc: "yuki",
        text: "私もお菓子を買いに来ました。日本の食べ物は美味しいですよね。",
        requirements: {},
        options: [],
        effects: {},
        cooldown: 0,
        tags: ["legacy-reply"]
      },

      // ======================
      // AKARI — SCHOOL
      // ======================
      {
        id: "akari:school:0",
        npc: "akari",
        text: "おはよう！日本語の勉強ですか？",
        requirements: {
          location: "school",
          time: "morning",
          minRel: 0,
          requiredWords: ["こんにちは"]
        },
        options: [
          {
            label: "Falar: こんにちは + はい",
            needsWords: ["こんにちは", "はい"],
            goto: "akari:school:0:reply#0",
            effects: { relationship: 1, learnWord: "学校" }
          }
        ],
        effects: {},
        cooldown: 8,
        tags: ["legacy-base"]
      },
      {
        id: "akari:school:0:reply#0",
        npc: "akari",
        text: "素晴らしい！日本語は難しいけど、楽しいですよね。私はここで英語を教えています。",
        requirements: {},
        options: [
          { label: "Continuar", goto: "akari:school:1", effects: {} }
        ],
        effects: {},
        cooldown: 0,
        tags: ["legacy-reply"]
      },

      {
        id: "akari:school:1",
        npc: "akari",
        text: "こんにちは！勉強ははかどっていますか？",
        requirements: {
          location: "school",
          time: "afternoon",
          minRel: 1,
          requiredWords: ["こんにちは"]
        },
        options: [
          {
            label: "Falar: こんにちは + はい",
            needsWords: ["こんにちは", "はい"],
            goto: "akari:school:1:reply#0",
            effects: { relationship: 1, learnWord: "勉強" }
          }
        ],
        effects: {},
        cooldown: 8,
        tags: ["legacy-base"]
      },
      {
        id: "akari:school:1:reply#0",
        npc: "akari",
        text: "良かったです！何かわからないことがあったら、いつでも聞いてくださいね。",
        requirements: {},
        options: [],
        effects: {},
        cooldown: 0,
        tags: ["legacy-reply"]
      },

      // ======================
      // AKARI — SHRINE
      // ======================
      {
        id: "akari:shrine:0",
        npc: "akari",
        text: "こんばんは。神社は静かでいいですよね。",
        requirements: {
          location: "shrine",
          time: "evening",
          minRel: 1,
          requiredWords: ["こんにちは"]
        },
        options: [
          {
            label: "Falar: こんにちは + はい",
            needsWords: ["こんにちは", "はい"],
            goto: "akari:shrine:0:reply#0",
            effects: { relationship: 1, learnWord: "日本語" }
          }
        ],
        effects: {},
        cooldown: 8,
        tags: ["legacy-base"]
      },
      {
        id: "akari:shrine:0:reply#0",
        npc: "akari",
        text: "私はよくここに来てリラックスします。日本の文化は興味深いですよね。",
        requirements: {},
        options: [],
        effects: {},
        cooldown: 0,
        tags: ["legacy-reply"]
      }
    ];

    // Abra diálogo com roteamento
    function openNpcDialogue(npc){
      gameState.inDialogue = true;
      gameState.currentNPC = npc;

      // localização do player e slot de horário atual
      const location = gameState.playerLocation || npc.location; // ou derive do mapa
      const slot = currentTimeSlot(gameState.time);

      if (isNpcGrumpy(npc.id) && npc.grumpyLine){
        renderSimpleLine(npc, npc.grumpyLine);
        return;
      }

      const ctx = {
        state: gameState,
        npcId: npc.id,
        location,
        gameTime: gameState.time,
        knownWords: gameState.knownWords || [],
        relNpc: (gameState.relationships||{})[npc.id]||0,
        flags: Object.assign({}, gameState.storyProgress||{}, gameState.flags||{}),
        isPenaltyActive: isSocialPenaltyActive(),
        nowAbsMin: gameState.gameMinutesTotal||0
      };

      const node = routeNextNode(npc.id, DIALOGUE_GRAPH, ctx)
              || fallbackSmallTalkNode(npc.id, location, slot);

      renderDialogueNode(npc, node, ctx);
    }

    function renderSimpleLine(npc, text){
      dialogueText.textContent = text;
      responseOptions.innerHTML = "";
      dialogueBox.style.display = "block";
    }

    function closeDialogueBox() {
      if (typeof dialogueBox !== "undefined") {
        dialogueBox.style.display = "none";
      }
      gameState.inDialogue = false;
      gameState.currentNPC = null;
    }

    function renderDialogueNode(npc, node, ctx){
      // Texto do NPC com seu anotador (mantém overlay do dicionário)
      dialogueText.innerHTML = annotateDialogueText(node.text || "");

      // Zera opções SEMPRE antes de repovoar
      responseOptions.innerHTML = "";

      // Garante que options é um array
      const opts = Array.isArray(node.options) ? node.options : [];

      // Se não houver opções, finalize o diálogo
      if (opts.length === 0){
        // fecha a caixa de diálogo e reseta estado
        if (typeof closeDialogueBox === "function") {
          closeDialogueBox();
        } else {
          dialogueBox.style.display = "none";
          gameState.inDialogue = false;
          gameState.currentNPC = null;
        }
        return;
      }

      opts.forEach(opt=>{
        const btn = document.createElement("button");
        btn.className = "word-option";
        btn.textContent = opt.label;

        // trava se faltar vocabulário
        if (opt.needsWords){
          const ok = opt.needsWords.every(w => (ctx.knownWords || []).includes(w));
          if (!ok){ btn.disabled = true; btn.classList.add("unknown"); }
        }

        btn.addEventListener("click", ()=>{
          // evita múltiplos disparos
          if (btn.disabled) return;
          btn.disabled = true;

          // aplica efeitos
          applyDialogueEffects(opt.effects || {}, ctx);

          // marca cooldown do nó atual
          node.lastSeenAtAbsMin = ctx.nowAbsMin;

          // limpa as opções imediatamente (evita “acúmulo infinito”)
          responseOptions.innerHTML = "";

          // prepara ctx atualizado (afinidade pode ter mudado)
          const nextCtx = Object.assign({}, ctx, {
            relNpc: (gameState.relationships||{})[npc.id]||0,
            nowAbsMin: gameState.gameMinutesTotal||0
          });

          // segue determinístico: só se houver goto
          if (opt.goto){
            const next = DIALOGUE_GRAPH.find(n => n.id === opt.goto);
            if (next){
              renderDialogueNode(npc, next, nextCtx);
              return;
            }
          }

          // sem goto -> finaliza
          if (typeof closeDialogueBox === "function") {
            closeDialogueBox();
          } else {
            dialogueBox.style.display = "none";
            gameState.inDialogue = false;
            gameState.currentNPC = null;
          }
        });

        responseOptions.appendChild(btn);
      });

      dialogueBox.style.display = "block";
    }

    function annotateWithDictionary(text){
      if (!text) return "";
      // substitui cada termo conhecido por um botão clicável
      // cuidado com regex: ordena por comprimento desc. pra evitar sobreposição
      const words = Object.keys(DICT).sort((a,b)=>b.length - a.length);
      let html = text;
      for (const w of words){
        const safe = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rx = new RegExp(safe, "g");
        html = html.replace(rx, `<button class="dict-word" data-word="${w}" title="Clique para ver">${w}</button>`);
      }
      return html;
    }

    function wireDictionaryButtons(){
      document.querySelectorAll(".dict-word").forEach(btn=>{
        btn.onclick = ()=>{
          const w = btn.dataset.word;
          openDictionaryInline(w, btn);
        };
      });
    }

    function openDictionaryInline(word, anchorEl){
      const meaning = DICT[word] || "(sem registro)";
      // mostra a tradução ao lado
      let tip = anchorEl.nextElementSibling;
      if (!tip || !tip.classList.contains("dict-tooltip")){
        tip = document.createElement("span");
        tip.className = "dict-tooltip";
        anchorEl.after(tip);
      }
      tip.textContent = `= ${meaning}`;

      // Aprender palavra automaticamente (ou chame seu minigame antes)
      learnWordIfNew(word);

      // Se estiver em diálogo com alguém, e a palavra NÃO for “safe”, aplica penalidade
      const npc = gameState.currentNPC;
      if (gameState.inDialogue && npc && !DICT_SAFE.has(word)){
        triggerDictionaryPenalty(npc.id);
        showNotification("They noticed you checking the dictionary… (-social)");
      }
    }

    function learnWordIfNew(w){
      gameState.knownWords ||= [];
      gameState.learnedWords ||= {};
      if (!gameState.knownWords.includes(w)){
        gameState.knownWords.push(w);
        gameState.learnedWords[w] = true;
        if (typeof updateVocabularyCount === "function") updateVocabularyCount();
      }
    }


    function canAdvanceToday(npcId){
      const day = Math.floor((gameState.gameMinutesTotal||0) / (24*60));
      const entry = gameState.routeDaily[npcId] || { lastDay: day, advancesToday: 0 };
      if (entry.lastDay !== day){ entry.lastDay = day; entry.advancesToday = 0; }
      gameState.routeDaily[npcId] = entry;
      return entry.advancesToday < 2; // máx 2 avanços/dia por NPC
    }

    function markAdvance(npcId){
      const day = Math.floor((gameState.gameMinutesTotal||0) / (24*60));
      const entry = gameState.routeDaily[npcId] || { lastDay: day, advancesToday: 0 };
      if (entry.lastDay !== day){ entry.lastDay = day; entry.advancesToday = 0; }
      entry.advancesToday++;
      gameState.routeDaily[npcId] = entry;
    }


    function positionNPCs() {
        npcs[0].x = canvas.width * 0.3;
        npcs[0].y = canvas.height * 0.4;
        npcs[1].x = canvas.width * 0.6;
        npcs[1].y = canvas.height * 0.7;
        npcs[2].x = canvas.width * 0.7;
        npcs[2].y = canvas.height * 0.4;
    }
    positionNPCs();
    window.addEventListener('resize', positionNPCs);

    const novoMap = {
        draw: function() {
            const w = canvas.width,
                h = canvas.height;
            ctx.fillStyle = '#243447';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            for (let x = 0; x < w; x += 40) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }
            for (let y = 0; y < h; y += 40) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }
            ctx.fillStyle = '#fff';
            ctx.font = '13px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('New District (an open area to explore)', w / 2, 28);
        },
        checkPlayerLocation: function(px, py) {
            return 'street';
        }
    };

    function activeMap() {
        return (gameState.currentMap === 'novo') ? novoMap : cityMap;
    }

    const cityMap = {
        buildings: [{
                x: .1,
                y: .3,
                width: .25,
                height: .2,
                color: '#e63946',
                name: 'Cafe',
                id: 'cafe'
            },
            {
                x: .65,
                y: .3,
                width: .25,
                height: .2,
                color: '#a8dadc',
                name: 'Store',
                id: 'store'
            },
            {
                x: .4,
                y: .7,
                width: .2,
                height: .15,
                color: '#457b9d',
                name: 'Park',
                id: 'park'
            },
            {
                x: .1,
                y: .7,
                width: .2,
                height: .15,
                color: '#9d4edd',
                name: 'Shrine',
                id: 'shrine'
            },
            {
                x: .65,
                y: .7,
                width: .25,
                height: .2,
                color: '#f4a261',
                name: 'School',
                id: 'school'
            },
            {
                x: .4,
                y: .3,
                width: .2,
                height: .15,
                color: '#2a9d8f',
                name: 'Hostel',
                id: 'hostel'
            }
        ],
        draw: function() {
            ctx.fillStyle = '#4a4e69';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#8d99ae';
            ctx.fillRect(canvas.width * .4, 0, canvas.width * .1, canvas.height);
            ctx.fillRect(0, canvas.height * .5, canvas.width, canvas.height * .08);
            this.buildings.forEach(b => {
                const x = b.x * canvas.width,
                    y = b.y * canvas.height,
                    w = b.width * canvas.width,
                    h = b.height * canvas.height;
                ctx.fillStyle = b.color;
                ctx.fillRect(x, y, w, h);
                ctx.fillStyle = '#fff';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(b.name, x + w / 2, y + h / 2);
            });
        },
        checkPlayerLocation: function(px, py) {
            for (const b of this.buildings) {
                const x = b.x * canvas.width,
                    y = b.y * canvas.height,
                    w = b.width * canvas.width,
                    h = b.height * canvas.height;
                if (px >= x && px <= x + w && py >= y && py <= y + h) return b.id;
            }
            return 'street';
        }
    };

    function updateTimeDisplay() {
        const h = Math.floor(gameState.time);
        const m = Math.floor((gameState.time - h) * 60);
        timeDisplay.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }

    function startGameTime(){
      setInterval(()=>{
        gameState.time += gameState.timeSpeed / 60;
        if (gameState.time >= 24) gameState.time = 0;

        // avança minutos absolutos do jogo (timeSpeed = min de jogo / s real)
        gameState.gameMinutesTotal += (gameState.timeSpeed || 0);

        updateTimeDisplay();
        // opcional: mostrar/ocultar badge automaticamente
        const badge = document.getElementById('dict-penalty-badge');
        if (badge) badge.style.display = isSocialPenaltyActive() ? 'inline-block' : 'none';
      }, 1000);
    }

    function showMap() {
        mapOverlay.style.display = 'flex';
    }

    function travelToArea(areaId){
      mapOverlay.style.display='none';
      if (areaId==='novo') {
        gameState.currentMap='novo';
        gameState.playerLocation='street';
        updateLocationDisplay();
        showNotification('You traveled to the New District.');
        startEncounterLoop();
        // chance de cair em batalha imediatamente
        if (!gameState.inBattle && Math.random()<0.5) openBattleJP();
      } else {
        gameState.currentMap='city';
        gameState.playerLocation=areaId;
        updateLocationDisplay();
        stopEncounterLoop();
      }
      gameState.player.x = canvas.width/2; gameState.player.y = canvas.height/2;

      if (areaId==='school'){
        schoolScreen.style.display='flex';
        if(!gameState.storyProgress.visitedSchool){
          gameState.storyProgress.visitedSchool=true;
          showNotification('Welcome to school! You can study Japanese here.');
        }
      } else {
        showNotification('You arrived at: '+getLocationName(areaId));
      }
    }

    function getLocationName(id) {
        return ({
            cafe: 'Cafe',
            store: 'Store',
            park: 'Park',
            shrine: 'Shrine',
            school: 'School',
            hostel: 'Hostel',
            street: 'Street'
        })[id] || 'Unknown';
    }

    function learnVocabulary() {
        const pool = ['おはよう', 'すみません', '水', '美味しい', '学校', '勉強', '日本語'];
        const avail = pool.filter(w => !gameState.knownWords.includes(w));
        if (avail.length) {
            const w = avail[Math.floor(Math.random() * avail.length)];
            gameState.knownWords.push(w);
            gameState.learnedWords[w] = true;
            gameState.learnedSinceMiniGame = (gameState.learnedSinceMiniGame || 0) + 1;
            if (gameState.learnedSinceMiniGame >= 2) {
                gameState.learnedSinceMiniGame = 0;
                startVerbMinigame();
            }
            updateVocabularyCount();
            showNotification('You learned: ' + w + ' (' + (wordDictionary[w] || '') + ')', 4000);
        } else showNotification('You already learned all vocabulary available for today!');
    }

    function updateVocabularyCount() {
        const el = document.getElementById('vocabulary-count');
        if (el) el.textContent = 'Words: ' + gameState.knownWords.length;
    }

    function learnGrammar() {
        showNotification('Grammar system under development.');
    }

    function setupTouchControls() {
        let joystickActive = false;
        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const t = e.touches[0];
            gameState.joystickStartX = t.clientX;
            gameState.joystickStartY = t.clientY;
            joystickActive = true;
            gameState.touchId = t.identifier;
        });
        joystick.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!joystickActive) return;
            for (let i = 0; i < e.touches.length; i++) {
                const t = e.touches[i];
                if (t.identifier === gameState.touchId) {
                    const dx = t.clientX - gameState.joystickStartX;
                    const dy = t.clientY - gameState.joystickStartY;
                    const ang = Math.atan2(dy, dx);
                    const dist = Math.min(35, Math.hypot(dx, dy));
                    joystick.style.transform = 'translate(' + dx * .4 + 'px,' + dy * .4 + 'px)';
                    if (dist > 10) {
                        gameState.player.isMoving = true;
                        if (ang > -Math.PI / 4 && ang < Math.PI / 4) gameState.player.direction = 'right';
                        else if (ang > Math.PI / 4 && ang < 3 * Math.PI / 4) gameState.player.direction = 'down';
                        else if (ang < -Math.PI / 4 && ang > -3 * Math.PI / 4) gameState.player.direction = 'up';
                        else gameState.player.direction = 'left';
                    } else gameState.player.isMoving = false;
                    break;
                }
            }
        }, {
            passive: false
        });
        const stop = () => {
            joystickActive = false;
            gameState.player.isMoving = false;
            joystick.style.transform = 'translate(0,0)';
        };
        joystick.addEventListener('touchend', (e) => {
            e.preventDefault();
            stop();
        });
        joystick.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            stop();
        });
    }

    function updateLocationDisplay() {
        locationDisplay.textContent = 'Location: ' + getLocationName(gameState.playerLocation);
    }

    function updateCoins() {
        const el = document.getElementById('coin-display');
        if (el) el.textContent = 'Coins: ' + (gameState.coins || 0);
    }

    function showNotification(msg, dur = 3000) {
        notification.textContent = msg;
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
        }, dur);
    }
    notification.addEventListener('pointerup', () => {
        notification.style.display = 'none';
    });

    function drawPlayer() {
        ctx.fillStyle = '#e9c46a';
        ctx.beginPath();
        ctx.arc(gameState.player.x, gameState.player.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2a9d8f';
        if (gameState.player.direction === 'up') ctx.fillRect(gameState.player.x - 3, gameState.player.y - 18, 6, 6);
        else if (gameState.player.direction === 'down') ctx.fillRect(gameState.player.x - 3, gameState.player.y + 12, 6, 6);
        else if (gameState.player.direction === 'left') ctx.fillRect(gameState.player.x - 18, gameState.player.y - 3, 6, 6);
        else if (gameState.player.direction === 'right') ctx.fillRect(gameState.player.x + 12, gameState.player.y - 3, 6, 6);
    }

    function drawNPC(npc) {
        if (gameState.currentMap !== 'city') return; // nunca desenha NPC fora da cidade
        const tod = getTimeOfDay();
        const place = npc.schedule[tod];
        if (place !== gameState.playerLocation) return;

        ctx.fillStyle = npc.color;
        ctx.beginPath();
        ctx.arc(npc.x, npc.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(npc.name, npc.x, npc.y - 25);
        const dist = Math.hypot(gameState.player.x - npc.x, gameState.player.y - npc.y);
        if (dist < 80) {
            npcHint.style.display = 'block';
        }
    }

    function getTimeOfDay() {
        if (gameState.time >= 5 && gameState.time < 12) return 'morning';
        if (gameState.time >= 12 && gameState.time < 18) return 'afternoon';
        return 'evening';
    }

    function updatePlayer() {
        const sp = 2.8;

        if (gameState.inBattle) return;
        // keyboard: always allow movement when keys pressed
        if (KeyState.left) {
            gameState.player.x -= sp;
            gameState.player.direction = 'left';
        }
        if (KeyState.right) {
            gameState.player.x += sp;
            gameState.player.direction = 'right';
        }
        if (KeyState.up) {
            gameState.player.y -= sp;
            gameState.player.direction = 'up';
        }
        if (KeyState.down) {
            gameState.player.y += sp;
            gameState.player.direction = 'down';
        }

        // mobile joystick (optional)
        if (gameState.player.isMoving) {
            if (gameState.player.direction === 'up') gameState.player.y -= gameState.player.speed;
            else if (gameState.player.direction === 'down') gameState.player.y += gameState.player.speed;
            else if (gameState.player.direction === 'left') gameState.player.x -= gameState.player.speed;
            else if (gameState.player.direction === 'right') gameState.player.x += gameState.player.speed;
        }
        // clamp
        gameState.player.x = Math.max(15, Math.min(canvas.width - 15, gameState.player.x));
        gameState.player.y = Math.max(15, Math.min(canvas.height - 15, gameState.player.y));

        // key-triggered interact (edge-trigger logic handled by keyup too)
        if (KeyState.interact) {
            KeyState.interact = false;
            checkForInteraction();
        }
    }
    // ==== Dialogue helpers (drop-in) ====

    function startDialogue(npc) {
      if (!npc) { showNotification('No one around to talk to.'); return; }

      // Evita trocar de NPC no meio do diálogo
      if (gameState.inDialogue && gameState.currentNPC && gameState.currentNPC !== npc) {
        return;
      }

      gameState.inDialogue = true;
      gameState.currentNPC = npc;

      // Localização e horário atuais
      const playerLoc = gameState.playerLocation || npc.location || 'cafe';
      const tod = getTimeOfDay(); // deve retornar "morning" | "afternoon" | "evening"

      // Se o NPC está "grumpy", mostra a linha curta e sai
      if (typeof isNpcGrumpy === "function" && isNpcGrumpy(npc.id) && npc.grumpyLine) {
        displayDialogue(npc.grumpyLine, npc, null);
        return;
      }

      // Contexto para o roteador
      const ctx = {
        state: gameState,
        npcId: npc.id,
        location: playerLoc,
        // Se seu getTimeOfDay já retorna os slots "morning/afternoon/evening",
        // e seu routeNextNode converte internamente, ok. Se não, mapeie para hora aqui.
        gameTime: (function mapTodToHour(slot){
          if (slot === "morning") return 9;
          if (slot === "afternoon") return 15;
          return 20; // evening
        })(tod),
        knownWords: gameState.knownWords || [],
        relNpc: (gameState.relationships || {})[npc.id] || 0,
        flags: Object.assign({}, gameState.storyProgress || {}, gameState.flags || {}),
        isPenaltyActive: isSocialPenaltyActive ? !!isSocialPenaltyActive() : false,
        nowAbsMin: gameState.gameMinutesTotal || 0
      };

      // Roteia nó atual do grafo
      const node = routeNextNode(npc.id, DIALOGUE_GRAPH, ctx) || fallbackSmallTalkNode(npc.id, playerLoc, tod);

      // (Exemplo de gatilho de história preservado do seu código)
      if (npc.id === 'takeshi' && !(gameState.storyProgress || {}).metTakeshi) {
        gameState.storyProgress = gameState.storyProgress || {};
        gameState.storyProgress.metTakeshi = true;
        showNotification('I met Takeshi, the cafe owner.');
      }

      // Renderiza usando o novo formato (opção A: renderer da engine)
      renderDialogueNode(npc, node, ctx);

      // --------
      // Se você quiser manter TEMPORARIAMENTE o displayDialogue antigo (texto + responses),
      // descomente o "adapter" abaixo e comente a linha acima.
      // Ele converte node.options -> responses (somente para compatibilidade visual).
      //
      // const legacyResponses = (node.options || []).map(opt => ({
      //   words: opt.needsWords || [],
      //   response: (opt.effects && (opt.effects.responseText || opt.effects.say)) || "(...)",
      //   _goto: opt.goto || null,         // guardamos para navegar manualmente
      //   _effects: opt.effects || {}
      // }));
      // displayDialogue(node.text || "", npc, legacyResponses);
      // dialogueBox.dataset.engineGraph = "1"; // marca visual para debug
      // --------
    }

    // Nó fallback minimalista quando nenhum requisito bate
    function fallbackSmallTalkNode(npcId, location, slot){
      return new DialogueNode({
        id: `${npcId}_fallback_${location}_${slot}`,
        npc: npcId,
        text: "……今は忙しい。", // "…estou ocupado agora."
        requirements: {},
        options: []
      });
    }

    // Renderiza o balão de diálogo + botões de resposta
    function displayDialogue(text, npc, responses = null) {
        // Mostra dica “Press E/Space/Enter” enquanto está perto
        try {
            if (npcHint) npcHint.style.display = 'block';
        } catch {}

        dialogueBox.style.display = 'block';
        const processed = annotateDialogueText ? annotateDialogueText(text) : String(text);
        dialogueText.innerHTML = '<strong>' + npc.name + ':</strong> ' + processed;

        responseOptions.innerHTML = '';
        if (responses && responses.length) {
            responses.forEach(r => {
                const btn = document.createElement('button');
                btn.className = 'word-option';

                // Só habilita se o jogador conhece TODAS as palavras da resposta
                const can = (r.words || []).every(w => gameState.knownWords.includes(w));
                if (!can) {
                    btn.textContent = '(I need more words to reply)';
                    btn.classList.add('unknown');
                } else {
                    // Mostra as palavras com tradução ao lado
                    const pretty = (r.words || []).map(w => w + ' (' + (wordDictionary[w] || '') + ')').join(' ');
                    btn.textContent = pretty;
                    btn.onclick = () => selectResponse(r, npc);
                }
                responseOptions.appendChild(btn);
            });
        }

        // Botão de sair
        const exit = document.createElement('button');
        exit.className = 'word-option';
        exit.textContent = 'Exit';
        exit.onclick = () => {
            dialogueBox.style.display = 'none';
            gameState.inDialogue = false;
            gameState.currentNPC = null;
            try {
                if (npcHint) npcHint.style.display = 'none';
            } catch {}
        };
        responseOptions.appendChild(exit);
    }

    function isCafeUnlockResponse(npc, r) {
        if (!npc || npc.id !== 'takeshi' || !r) return false;
        const hasWords = Array.isArray(r.words) &&
            r.words.includes('こんにちは') &&
            r.words.includes('コーヒー'); // “bom dia/olá” + “café”
        const teachesOnegai = r.learnWord === 'お願いします'; // fluxo da manhã ensina 'お願いします'
        return hasWords || teachesOnegai;
    }

    function notifyPenaltyOnce(){
      const t = Math.floor((gameState.gameMinutesTotal || 0));
      if (gameState._lastPenaltyNoteAt === t) return; // já avisou neste minuto
      gameState._lastPenaltyNoteAt = t;
      showNotification('Social impact active: affinity gains -50%.');
    }

    // Processa a escolha do jogador, aplica afinidade/penalidade, ensina palavra, dispara minigame
    function selectResponse(r, npc) {
        let delta = Number(r.relationship) || 0;

        // ✅ só reduz quando de fato há ganho de afinidade
        if (delta > 0 && typeof isSocialPenaltyActive === 'function' && isSocialPenaltyActive()){
          delta *= 0.5;
          notifyPenaltyOnce(); // evita spam de notificação
        }

        gameState.relationships[npc.id] = (gameState.relationships[npc.id] || 0) + delta;

        // Aprende palavra (se houver) + checa minigame
        if (r.learnWord && !gameState.knownWords.includes(r.learnWord)) {
            gameState.knownWords.push(r.learnWord);
            if (gameState.learnedWords) gameState.learnedWords[r.learnWord] = true;

            gameState.learnedSinceMiniGame = (gameState.learnedSinceMiniGame || 0) + 1;
            if (gameState.learnedSinceMiniGame >= 2) {
                gameState.learnedSinceMiniGame = 0;
                try {
                    startVerbMinigame && startVerbMinigame();
                    gameState.inMinigame = true;
                } catch {}
            }
            try {
                updateVocabularyCount && updateVocabularyCount();
            } catch {}
            showNotification('New word learned: ' + r.learnWord + ' (' + (wordDictionary[r.learnWord] || '') + ')');
            if (!gameState.jobs?.unlocked?.cafe && isCafeUnlockResponse(npc, r)) {
                if (!gameState.jobs) gameState.jobs = {
                    unlocked: {},
                    currentJobId: null,
                    currentRankIndex: 0,
                    isOnShift: false,
                    lastSeenAt: Date.now(),
                    pendingEventQueue: [],
                    totalOfflineHoursWorked: 0,
                    eventsTriggered: 0,
                    extraEventAnchor: 0,
                    totalHoursWorked: 0
                };
                if (!gameState.jobs.unlocked) gameState.jobs.unlocked = {};
                gameState.jobs.unlocked.cafe = true;

                try {
                    saveGameToStorage();
                } catch {}
                showNotification('Job unlocked: Cafe! Open the Work panel.');
            }
        }

        // Mostra resposta do NPC
        const resp = annotateDialogueText ? annotateDialogueText(r.response || '...') : (r.response || '...');
        dialogueText.innerHTML = '<strong>' + npc.name + ':</strong> ' + resp;

        // Substitui por botão "Continue"
        responseOptions.innerHTML = '';
        const cont = document.createElement('button');
        cont.className = 'word-option';
        cont.textContent = 'Continue';
        cont.onclick = () => {
            dialogueBox.style.display = 'none';
            gameState.inDialogue = false;
            gameState.currentNPC = null;
            try {
                if (npcHint) npcHint.style.display = 'none';
            } catch {}
        };
        responseOptions.appendChild(cont);
    }

    function checkForInteraction(){
      // sem interação durante batalha/minigame
      if (gameState.inBattle || gameState.inMinigame) return;

      // só existe NPC na cidade; no New District nunca interage
      if (gameState.currentMap !== 'city'){
        showNotification('There is no one around to interact with.');
        return;
      }

      const tod = getTimeOfDay();
      let target = null, bestDist = 1e9;

      for (const npc of npcs){
        // NPC precisa estar **na mesma localização** (segundo agenda do horário)
        const placeNow = npc.schedule ? npc.schedule[tod] : null;
        if (placeNow !== gameState.playerLocation) continue;

        // distância no canvas
        const d = Math.hypot(gameState.player.x - npc.x, gameState.player.y - npc.y);
        if (d < bestDist && d <= 100){
          target = npc; bestDist = d;
        }
      }

      if (target){
        startDialogue(target);
        return;
      }

      // sem fallback aqui (isso que causava o bug)
      showNotification('There is no one nearby to interact with.');
    }

    function loadGameFromStorage(){
      try{
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        HAS_LOADED_FROM_STORAGE = true;
        return data;
      }catch(e){
        console.warn('loadGameFromStorage failed:', e);
        return null;
      }
    }

    function saveGameToStorage(){
      if (!AUTOSAVE_ENABLED) return;          // <-- trava salvamento antes do Start
      try{
        const payload = JSON.stringify(gameState);
        localStorage.setItem(SAVE_KEY, payload);
      }catch(e){
        console.warn('saveGameToStorage failed:', e);
      }
    }

    function clearGameStorage(){
      try{
        localStorage.removeItem(SAVE_KEY);
      }catch(e){
        console.warn('clearGameStorage failed:', e);
      }
    }

    function factoryReset(){
      AUTOSAVE_ENABLED = false;    // evita repovoar instantaneamente
      clearGameStorage();
      // opcional: limpar timers, overlays, etc.
      location.reload();           // recarrega a página sem save
    }

    function stampLastSeen() {
        if (!AUTOSAVE_ENABLED) return;              // gate global
        if (!gameState.jobs || !gameState.jobs.isOnShift) return;

        gameState.jobs.lastSeenAt = Date.now();
        saveGameToStorage();                        // usa o helper com gate
      }
      window.addEventListener('beforeunload', ()=>{
      if (!AUTOSAVE_ENABLED) return; // não salva enquanto está em boot/reset
      try{
        // se quiser, só grave um timestamp simples no state
        gameState._lastSeenAt = Date.now();
        saveGameToStorage();
      }catch{}
    });

    function init() {
      loadGameFromStorage();
      if (gameState.storyProgress?.metTakeshi) {
        gameState.jobs = gameState.jobs || { unlocked:{} };
        gameState.jobs.unlocked = gameState.jobs.unlocked || {};
        if (!gameState.jobs.unlocked.cafe) {
          gameState.jobs.unlocked.cafe = true;
          // NÃO salvar aqui; marca para persistir depois do Start
          gameState._needsPersist = true;
        }
      }

      const MINUTES_PER_GAME_HOUR = 3; // 3 real minutes = 1 "work hour"
      const lastLogin = gameState.jobs.lastSeenAt || Date.now();
      const now = Date.now();
      const diffMs = now - lastLogin;
      const offlineHours = diffMs / (1000 * 60 * MINUTES_PER_GAME_HOUR);

      if (gameState.jobs?.isOnShift && gameState.jobs.currentJobId) {
        processOfflineWork(offlineHours);
        maybeOpenNextWorkEvent();
      }

      gameState.jobs = gameState.jobs || {};
      gameState.jobs.lastSeenAt = now;
      saveGameToStorage(); // <- NÃO salva nada antes do Start (usa o gate AUTOSAVE_ENABLED)
      startButton.addEventListener('click', () => {
          gameState.inDialogue = false;
          gameState.inMinigame = false;
          try {
              document.getElementById('start-screen').style.display = 'none';
          } catch {}
          try {
              const c = document.getElementById('game-canvas');
              c.focus({
                  preventScroll: true
              });
          } catch {}
          try {
              window.focus();
          } catch {}

          startScreen.style.display = 'none';
          gameState.gameStarted = true;
          gameState.__allowPersist = true;
          saveGameToStorage();
          startGameTime();
          gameLoop();
      });
      setupTouchControls();
      canvas.addEventListener('pointerdown', () => {
          try {
              canvas.focus();
          } catch {}
      }, {
          passive: true
      });
      canvas.addEventListener('click', () => {
          checkForInteraction();
      });
      document.body.addEventListener('pointerdown', () => {
          try {
              window.focus();
          } catch {}
      }, {
          passive: true
      });
      interactBtn.addEventListener('click', checkForInteraction);
      closeDialogue.addEventListener('click', () => {
          dialogueBox.style.display = 'none';
          gameState.inDialogue = false;
          gameState.currentNPC = null;
          npcHint.style.display = 'none';
      });
      mapButton.addEventListener('click', showMap);
      closeMap.addEventListener('click', () => {
          mapOverlay.style.display = 'none';
      });
      document.querySelectorAll('.map-area').forEach(a => a.addEventListener('click', e => {
          const id = e.target.id.replace('map-', '');
          if (id === 'novo' && !gameState.newMapUnlocked) {
              showNotification('Get 5 hits in a minigame to unlock the New District.');
              return;
          }
          travelToArea(id);
      }));
      closeSchool.addEventListener('click', () => {
          schoolScreen.style.display = 'none';
          gameState.playerLocation = 'school';
          updateLocationDisplay();
      });
      vocabLesson.addEventListener('click', learnVocabulary);
      vocabLesson.addEventListener('pointerup', (e) => {
          e.preventDefault();
          learnVocabulary();
      }, {
          passive: false
      });
      grammarLesson.addEventListener('click', learnGrammar);
      updateVocabularyCount();
      updateTimeDisplay();
      updateCoins();


      // Work UI
      function renderJobStatus() {
          const cid = gameState.jobs.currentJobId;
          const unlockedCafe = !!gameState.jobs.unlocked.cafe;
          let html = '';

          if (!unlockedCafe) {
              html += 'No job available yet. Tip: talk to Takeshi at the Cafe.';
          } else {
              const job = JOBS.cafe;
              if (!cid) {
                  gameState.jobs.currentJobId = 'cafe';
              }
              const rank = job.ranks[gameState.jobs.currentRankIndex] || job.ranks[0];
              html += `<div><b>Job:</b> ${job.name}</div>`;
              html += `<div><b>Rank:</b> ${rank.name} (rate: ${rank.rate}/h)</div>`;
              html += `<div><b>Status:</b> ${gameState.jobs.isOnShift? 'On shift (accumulates offline hours)':'Off shift'}</div>`;
              html += `<div><b>Total offline hours:</b> ${gameState.jobs.totalOfflineHoursWorked.toFixed(1)}h</div>`;
          }
          jobStatus.innerHTML = html;
      }

      jobBtn.addEventListener('click', () => {
          if (!gameState.jobs?.unlocked?.cafe) {
              showNotification('You need to talk properly to Takeshi (greet + order coffee) to unlock this job.');
              return;
          }
          jobOv.style.display = 'block';
          renderJobStatus();
      });

      document.getElementById('job-close').addEventListener('click', () => {
          jobOv.style.display = 'none';
      });
      // START SHIFT
      document.getElementById('job-start').addEventListener('click', () => {
        ensureJobs();
        if (!gameState.jobs.unlocked.cafe){
          showNotification('No job unlocked.');
          return;
        }
        
        if (gameState.jobs.isOnShift) {
          showNotification('You already started your Shift!');
          return;
        }

        gameState.jobs.isOnShift = true;
        gameState.jobs.currentJobId = gameState.jobs.currentJobId || 'cafe';
        gameState.jobs.lastSeenAt = Date.now();             // âncora para contar offline depois
        saveGameToStorage();                                 // << gated por AUTOSAVE_ENABLED
        renderJobStatus();

        showNotification('Shift started. Coins will accrue while you are offline.');
      });
      // STOP SHIFT (opção: “liquidar” o que ficou pendente até agora)
      document.getElementById('job-stop').addEventListener('click', () => {
        ensureJobs();
        if (!gameState.jobs.unlocked.cafe){
          showNotification('No job unlocked.');
          return;
        }

        // Se quiser, processa imediatamente o período desde o último carimbo:
        if (gameState.jobs.isOnShift && gameState.jobs.lastSeenAt){
          const now = Date.now();
          const ms = Math.max(0, now - gameState.jobs.lastSeenAt);
          const offlineHours = ms / REAL_MS_PER_JOB_HOUR;
          if (offlineHours > 0){
            try { processOfflineWork(offlineHours); } catch {}
            try { maybeOpenNextWorkEvent(); } catch {}
          }
        }

        gameState.jobs.isOnShift = false;
        gameState.jobs.lastSeenAt = Date.now();             // carimba fim do turno
        saveGameToStorage();                                 // << gated
        renderJobStatus();
        showNotification('Shift ended.');
      });
      document.getElementById('workevent-close').addEventListener('click', closeWorkEvent);
      bindBattleButtonsJP();
    }
    init();

    function gameLoop() {
        if (!gameState.gameStarted) return;
        npcHint.style.display = 'none';

        const badge = document.getElementById('dict-penalty-badge');
        if (badge){
          badge.style.display = isSocialPenaltyActive() ? 'inline-block' : 'none';
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        activeMap().draw();
        npcs.forEach(drawNPC);
        updatePlayer();
        drawPlayer();
        gameState.playerLocation = activeMap().checkPlayerLocation(gameState.player.x, gameState.player.y);
        updateLocationDisplay();
        const kdL = document.getElementById('kd-l'),
            kdR = document.getElementById('kd-r'),
            kdU = document.getElementById('kd-u'),
            kdD = document.getElementById('kd-d'),
            kdI = document.getElementById('kd-i');
        if (kdL) {
            kdL.textContent = KeyState.left ? 1 : 0;
            kdR.textContent = KeyState.right ? 1 : 0;
            kdU.textContent = KeyState.up ? 1 : 0;
            kdD.textContent = KeyState.down ? 1 : 0;
            kdI.textContent = KeyState.interact ? 1 : 0;
        }
        requestAnimationFrame(gameLoop);
    }

    function ensureJobsState(){
      if (!gameState.jobs) gameState.jobs = {
        unlocked: {},
        currentJobId: null,
        currentRankIndex: 0,
        isOnShift: false,
        lastSeenAt: Date.now(),
        pendingEventQueue: [],
        totalOfflineHoursWorked: 0,
        eventsTriggered: 0,
        extraEventAnchor: 0,
        totalHoursWorked: 0
      };
      if (!gameState.jobs.unlocked) gameState.jobs.unlocked = {};
    }

    function unlockJob(jobKey, toastMsg="Cafe job unlocked!"){
      ensureJobsState();
      if (!gameState.jobs.unlocked[jobKey]) {
        gameState.jobs.unlocked[jobKey] = true;
        if (typeof showNotification === "function") showNotification(toastMsg);
        // se houver UI específica, atualize aqui:
        if (typeof refreshWorkActions === "function") refreshWorkActions();
      }
    }

    /* =======================
      Minigame — Swipe/Drag v2
    ========================*/
    const VERB_POOL = [{
            w: '行く',
            pos: 'verbo'
        }, {
            w: '飲む',
            pos: 'verbo'
        }, {
            w: '読む',
            pos: 'verbo'
        }, {
            w: '食べる',
            pos: 'verbo'
        },
        {
            w: '勉強する',
            pos: 'verbo'
        }, {
            w: '見る',
            pos: 'verbo'
        }, {
            w: '話す',
            pos: 'verbo'
        },
        {
            w: '学校',
            pos: 'substantivo'
        }, {
            w: '水',
            pos: 'substantivo'
        }, {
            w: 'コーヒー',
            pos: 'substantivo'
        }, {
            w: 'ありがとう',
            pos: 'interjeição'
        },
        {
            w: '美味しい',
            pos: 'adjetivo'
        }, {
            w: '日本語',
            pos: 'substantivo'
        }, {
            w: '名前',
            pos: 'substantivo'
        }, {
            w: 'あなた',
            pos: 'pronome'
        }
    ];
    let mgRunning = false,
        mgScore = 0,
        mgMistakes = 0,
        mgItems = [],
        mgCtx, mgCanvas,
        mgLastSpawn = 0,
        mgW = 960,
        mgH = 540,
        mgLives = 3,
        mgTimeLeft = 60000,
        mgLastTs = 0,
        mgVerbHitsSinceReward = 0,
        mgDPR = 1;

    let mgPathPoints = [];
    let mgIsDragging = false;
    let mgLastPoint = null;
    const mgTrailFadeMs = 220;
    const STEP_MIN_DIST = 2;
    const HIT_MIN_SEG = 6;
    const HIT_PADDING = 22;

    function mgResizeCanvas() {
        const vw = Math.max(640, Math.min(window.innerWidth * 0.95, 1280));
        const vh = Math.max(360, Math.min(window.innerHeight * 0.70, 720));
        mgW = Math.floor(vw);
        mgH = Math.floor(vh);
        mgCanvas.style.width = mgW + 'px';
        mgCanvas.style.height = mgH + 'px';
    }

    function mgApplyDPR() {
        mgDPR = window.devicePixelRatio || 1;
        const cssW = mgCanvas.clientWidth || mgW;
        const cssH = mgCanvas.clientHeight || mgH;
        mgCanvas.width = Math.round(cssW * mgDPR);
        mgCanvas.height = Math.round(cssH * mgDPR);
        mgCtx.setTransform(mgDPR, 0, 0, mgDPR, 0, 0);
    }

    function mgClear() {
        mgCtx.save();
        mgCtx.setTransform(1, 0, 0, 1, 0, 0);
        mgCtx.clearRect(0, 0, mgCanvas.width, mgCanvas.height);
        mgCtx.restore();
    }

    function mgHearts(n) {
        return '❤️'.repeat(Math.max(0, n));
    }

    function mgUpdateUI() {
        const t = Math.max(0, Math.ceil(mgTimeLeft / 1000));
        document.getElementById('mg-lives').textContent = mgHearts(mgLives);
        document.getElementById('mg-time').textContent = String(t);
    }

    function mgEventPos(e) {
        if (typeof e.offsetX === 'number' && typeof e.offsetY === 'number') {
            return {
                x: e.offsetX,
                y: e.offsetY
            };
        }
        const r = mgCanvas.getBoundingClientRect();
        const touch = e.touches && e.touches[0];
        const cx = (typeof e.clientX === 'number') ? e.clientX : (touch ? touch.clientX : 0);
        const cy = (typeof e.clientY === 'number') ? e.clientY : (touch ? touch.clientY : 0);
        return {
            x: cx - r.left,
            y: cy - r.top
        };
    }

    function mgTextRect(ctx, text, x, y) {
        ctx.save();
        ctx.font = '24px Arial';
        const w = Math.max(24, ctx.measureText(text).width);
        ctx.restore();
        const h = 28;
        const pad = HIT_PADDING;
        const rx = x - pad,
            ry = y - h - pad,
            rw = w + pad * 2,
            rh = h + pad * 2;
        return {
            rx,
            ry,
            rw,
            rh
        };
    }

    function lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
        function seg(ax, ay, bx, by, cx, cy, dx, dy) {
            const s1x = bx - ax,
                s1y = by - ay,
                s2x = dx - cx,
                s2y = dy - cy;
            const den = (-s2x * s1y + s1x * s2y);
            if (den === 0) return false;
            const s = (-s1y * (ax - cx) + s1x * (ay - cx)) / den;
            const t = (s2x * (ay - cy) - s2y * (ax - cx)) / den;
            return (s >= 0 && s <= 1 && t >= 0 && t <= 1);
        }
        const r1x = rx,
            r1y = ry,
            r2x = rx + rw,
            r2y = ry + rh;
        if ((x1 >= r1x && x1 <= r2x && y1 >= r1y && y1 <= r2y) || (x2 >= r1x && x2 <= r2x && y2 >= r1y && y2 <= r2y)) return true;
        if (seg(x1, y1, x2, y2, r1x, r1y, r2x, r1y)) return true;
        if (seg(x1, y1, x2, y2, r2x, r1y, r2x, r2y)) return true;
        if (seg(x1, y1, x2, y2, r2x, r2y, r1x, r2y)) return true;
        if (seg(x1, y1, x2, y2, r1x, r2y, r1x, r1y)) return true;
        return false;
    }

    function startVerbMinigame() {
        const overlay = document.getElementById('minigame-overlay');
        mgCanvas = document.getElementById('minigame-canvas');
        mgCtx = mgCanvas.getContext('2d');

        mgResizeCanvas();
        mgApplyDPR();
        mgScore = 0;
        mgMistakes = 0;
        mgItems = [];
        mgRunning = true;
        mgLives = 3;
        mgTimeLeft = 60000;
        mgLastTs = 0;
        mgVerbHitsSinceReward = 0;
        mgPathPoints = [];
        mgIsDragging = false;
        mgLastPoint = null;
        document.getElementById('mg-score').textContent = '0';
        document.getElementById('mg-mistakes').textContent = '0';
        mgUpdateUI();
        overlay.style.display = 'flex';
        window.addEventListener('resize', () => {
            mgResizeCanvas();
            mgApplyDPR();
        });

        mgCanvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            try {
                mgCanvas.setPointerCapture(e.pointerId);
            } catch {}
            const p = mgEventPos(e);
            mgIsDragging = true;
            mgPathPoints = [{
                x: p.x,
                y: p.y,
                t: Date.now()
            }];
            mgLastPoint = {
                x: p.x,
                y: p.y,
                t: Date.now()
            };
        }, {
            passive: false
        });

        function endDrag(e) {
            if (!mgIsDragging) return;
            e && e.preventDefault();
            mgIsDragging = false;
        }
        mgCanvas.addEventListener('pointerup', endDrag, {
            passive: false
        });
        mgCanvas.addEventListener('pointercancel', endDrag, {
            passive: false
        });
        mgCanvas.addEventListener('pointerleave', endDrag, {
            passive: false
        });

        mgCanvas.addEventListener('pointermove', (e) => {
            if (!mgIsDragging || !mgRunning) return;
            e.preventDefault();
            const p = mgEventPos(e);
            const dx = p.x - mgLastPoint.x,
                dy = p.y - mgLastPoint.y;
            const dist = Math.hypot(dx, dy);
            if (dist >= STEP_MIN_DIST) {
                const now = Date.now();
                mgPathPoints.push({
                    x: p.x,
                    y: p.y,
                    t: now
                });
                mgLastPoint = {
                    x: p.x,
                    y: p.y,
                    t: now
                };
            }
        }, {
            passive: false
        });

        document.getElementById('minigame-exit').onclick = endVerbMinigame;

        requestAnimationFrame(minigameLoop);
    }

    function endVerbMinigame() {
        mgRunning = false;
        gameState.inMinigame = false;
        document.getElementById('minigame-overlay').style.display = 'none';
    }

    function spawnItem(ts) {
        if (ts - mgLastSpawn < 520) return;
        mgLastSpawn = ts;
        const pick = VERB_POOL[Math.floor(Math.random() * VERB_POOL.length)];
        const margin = 80;
        const startX = margin + Math.random() * (mgW - margin * 2);
        const item = {
            text: pick.w,
            pos: pick.pos,
            x: startX,
            y: mgH - 10,
            vx: (Math.random() * 2 - 1) * 1.0,
            vy: -(6 + Math.random() * 2),
            alive: true
        };
        mgItems.push(item);
    }

    function updateItems() {
        mgItems.forEach(it => {
            if (it.vy > 7.5) it.vy = 7.5;
            if (it.vy < -8.5) it.vy = -8.5;
            it.x += it.vx;
            it.y += it.vy;
            it.vy += 0.08;
            if (it.x < 16) {
                it.x = 16;
                it.vx = Math.abs(it.vx);
            }
            if (it.x > mgW - 16) {
                it.x = mgW - 16;
                it.vx = -Math.abs(it.vx);
            }
        });
        mgItems = mgItems.filter(it => it.y < mgH + 40 && it.alive);
    }

    function drawItems() {
        mgCtx.save();
        mgCtx.fillStyle = '#ffffff';
        mgCtx.font = '24px Arial';
        mgItems.forEach(it => {
            mgCtx.fillText(it.text, it.x, it.y);
        });
        mgCtx.restore();
    }

    function drawTrail() {
        const now = Date.now();
        mgPathPoints = mgPathPoints.filter(p => now - p.t < mgTrailFadeMs);
        if (mgPathPoints.length < 2) return;
        mgCtx.save();
        mgCtx.lineCap = 'round';
        mgCtx.lineJoin = 'round';
        for (let i = 1; i < mgPathPoints.length; i++) {
            const a = mgPathPoints[i - 1],
                b = mgPathPoints[i];
            const segLen = Math.hypot(b.x - a.x, b.y - a.y);
            if (segLen < HIT_MIN_SEG) continue;
            const age = now - b.t;
            const alpha = Math.max(0, 1 - age / mgTrailFadeMs);
            mgCtx.globalAlpha = alpha;
            mgCtx.strokeStyle = '#e9c46a';
            mgCtx.shadowColor = '#e9c46a';
            mgCtx.shadowBlur = 10;
            mgCtx.lineWidth = 6;
            mgCtx.beginPath();
            mgCtx.moveTo(a.x, a.y);
            mgCtx.lineTo(b.x, b.y);
            mgCtx.stroke();
        }
        mgCtx.restore();
    }

    function testHits() {
        if (mgPathPoints.length < 2) return false;
        const now = Date.now();
        let hit = false;
        const segs = [];
        for (let i = 1; i < mgPathPoints.length; i++) {
            const a = mgPathPoints[i - 1],
                b = mgPathPoints[i];
            const segLen = Math.hypot(b.x - a.x, b.y - a.y);
            if (segLen < HIT_MIN_SEG) continue;
            if (now - b.t > mgTrailFadeMs) continue;
            segs.push([a.x, a.y, b.x, b.y]);
        }
        if (!segs.length) return false;

        mgItems.forEach(it => {
            if (!it.alive) return;
            const r = mgTextRect(mgCtx, it.text, it.x, it.y);
            for (const s of segs) {
                if (lineIntersectsRect(s[0], s[1], s[2], s[3], r.rx, r.ry, r.rw, r.rh)) {
                    it.alive = false;
                    hit = true;
                    if (it.pos === 'verbo') {
                        mgScore++;
                        mgVerbHitsSinceReward++;
                        document.getElementById('mg-score').textContent = String(mgScore);

                        if (mgScore >= 5 && !gameState.newMapUnlocked) {
                            gameState.newMapUnlocked = true;
                            const novo = document.getElementById('map-novo');
                            if (novo) {
                                novo.classList.remove('locked');
                                novo.style.opacity = '1';
                                novo.style.filter = 'none';
                                novo.style.cursor = 'pointer';
                            }
                            showNotification('New District unlocked! Open the map to travel.');
                        }

                        if (mgVerbHitsSinceReward >= 2) {
                            mgVerbHitsSinceReward = 0;
                            gameState.coins = (gameState.coins || 0) + 10;
                            updateCoins();
                            showNotification('+10 coins!');
                        }
                    } else {
                        mgMistakes++;
                        if (mgLives > 0) mgLives--;
                        document.getElementById('mg-mistakes').textContent = String(mgMistakes);
                        document.getElementById('mg-lives').textContent = mgHearts(mgLives);
                        if (mgLives <= 0) {
                            endVerbMinigame();
                            return;
                        }
                    }
                    break;
                }
            }
        });
        return hit;
    }

    function minigameLoop(ts) {
        if (!mgRunning) return;
        if (!mgLastTs) mgLastTs = ts;
        const dt = ts - mgLastTs;
        mgLastTs = ts;
        mgTimeLeft -= dt;
        mgUpdateUI();
        if (mgTimeLeft <= 0) {
            endVerbMinigame();
            return;
        }

        mgClear();
        spawnItem(ts);
        updateItems();
        drawItems();
        drawTrail();

        if (testHits()) {
            mgPathPoints = [];
            mgLastPoint = null;
            mgIsDragging = false;
        }
        requestAnimationFrame(minigameLoop);
    }

    // Game loop + init already defined; bind buttons now:
    document.getElementById('start-button').addEventListener('click', () => {
        if (DBG.mg) console.debug('[Game] start');
    });
    document.getElementById('map-button').addEventListener('click', () => {
        if (DBG.mg) console.debug('[UI] open map');
    });

    function makeRandomWorkEvent(job) {
        const templates = [{
                title: `${job.name}: delicate situation with a customer`,
                text: `A homeless person entered the ${job.name} asking for water and a piece of bread. The manager wasn’t around.`,
                choices: [{
                        label: 'Offer water and calmly explain the rules.',
                        effects: {
                            coins: +5,
                            relTakeshi: +1,
                            promoChance: +0.15
                        }
                    },
                    {
                        label: 'Ignore and keep working.',
                        effects: {
                            coins: +0,
                            relTakeshi: -1,
                            promoChance: +0.00
                        }
                    },
                    {
                        label: 'Ask them to leave in a harsh tone.',
                        effects: {
                            coins: +2,
                            relTakeshi: -2,
                            promoChance: -0.05
                        }
                    },
                ]
            },
            {
                title: `${job.name}: impatient customer`,
                text: `The line is long and a customer starts complaining out loud.`,
                choices: [{
                        label: 'Apologize and offer a small coupon.',
                        effects: {
                            coins: -3,
                            relTakeshi: +1,
                            promoChance: +0.10
                        }
                    },
                    {
                        label: 'Ignore and focus on speeding orders.',
                        effects: {
                            coins: +0,
                            relTakeshi: +0,
                            promoChance: +0.02
                        }
                    },
                    {
                        label: 'Talk back to the customer.',
                        effects: {
                            coins: +0,
                            relTakeshi: -2,
                            promoChance: -0.10
                        }
                    },
                ]
            },
            {
                title: `${job.name}: extra opportunity`,
                text: `A supplier offers a crash course on perfect espresso extraction.`,
                choices: [{
                        label: 'Join during your free time.',
                        effects: {
                            coins: -5,
                            skill: +1,
                            promoChance: +0.20
                        }
                    },
                    {
                        label: 'Decline (no time).',
                        effects: {
                            coins: +0,
                            promoChance: +0.00
                        }
                    },
                ]
            },
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }

    // Quanto de dano TOTAL uma frase perfeita causa no inimigo.
    // Ex.: 10 => completar a frase inteira derruba 10 de HP no total.
    const TOTAL_DAMAGE_PER_SENTENCE = 10;

    /**
     * Retorna o dano desse turno (palavra de índice `idx`) para uma frase
     * com `totalWords` palavras, repartindo o TOTAL_DAMAGE_PER_SENTENCE igualmente.
     * Qualquer resto vai para a última palavra.
     */
    function stepDamageFor(idx, totalWords, totalDamage = TOTAL_DAMAGE_PER_SENTENCE){
      totalWords = Math.max(1, totalWords|0);
      const base = Math.floor(totalDamage / totalWords);
      const remainder = totalDamage % totalWords;
      // se houver resto, adiciona tudo na última palavra
      if (idx === totalWords - 1) return base + remainder;
      return base;
    }

    function processOfflineWork(offlineHours){
      // sanidade de entrada
      if (!Number.isFinite(offlineHours) || offlineHours <= 0) return;

      // garante estrutura básica
      gameState.jobs = gameState.jobs || {};
      gameState.jobs.unlocked = gameState.jobs.unlocked || {};
      gameState.jobs.pendingEventQueue = Array.isArray(gameState.jobs.pendingEventQueue) ? gameState.jobs.pendingEventQueue : [];
      gameState.jobs.currentRankIndex = gameState.jobs.currentRankIndex || 0;
      gameState.jobs.totalOfflineHoursWorked = gameState.jobs.totalOfflineHoursWorked || 0;
      gameState.jobs.totalHoursWorked = gameState.jobs.totalHoursWorked || 0;
      gameState.jobs.eventsTriggered = gameState.jobs.eventsTriggered || 0;
      gameState.jobs.extraEventAnchor = gameState.jobs.extraEventAnchor || 0;

      const jobId = gameState.jobs.currentJobId;
      if (!jobId || !window.JOBS || !JOBS[jobId]) return; // sem job ativo

      const job = JOBS[jobId];
      const ranks = Array.isArray(job.ranks) ? job.ranks : [];
      const rank = ranks[gameState.jobs.currentRankIndex] || ranks[0] || { rate: 0 };

      const rate = Number(rank.rate) || 0;
      const coinsEarned = Math.floor(offlineHours * rate);

      if (coinsEarned !== 0){
        gameState.coins = (gameState.coins || 0) + coinsEarned;
        if (typeof updateCoins === 'function') updateCoins();
        const hrs = offlineHours.toFixed(1);
        showNotification(
          coinsEarned > 0
            ? `You worked offline for ${hrs}h and earned ${coinsEarned} coins.`
            : `You worked offline for ${hrs}h and lost ${Math.abs(coinsEarned)} coins.`
        );
      }

      // acumula horas
      gameState.jobs.totalOfflineHoursWorked += offlineHours;
      gameState.jobs.totalHoursWorked += offlineHours;

      // milestones de eventos
      const milestones = Array.isArray(job.eventMilestones) ? job.eventMilestones : [];

      // helper de fila (usa pushWorkEvent se existir; senão, faz fallback)
      const enqueueEvent = (ev)=>{
        if (typeof pushWorkEvent === 'function') {
          pushWorkEvent(ev);
        } else {
          gameState.jobs.pendingEventQueue.push(ev);
          if (typeof saveGameToStorage === 'function') saveGameToStorage(); // gated
        }
      };

      // eventos nas milestones fixas
      while (
        gameState.jobs.eventsTriggered < milestones.length &&
        gameState.jobs.totalHoursWorked >= milestones[gameState.jobs.eventsTriggered]
      ){
        if (typeof makeRandomWorkEvent === 'function') {
          enqueueEvent(makeRandomWorkEvent(job));
        }
        gameState.jobs.eventsTriggered++;
      }

      // eventos extras a cada +30h após a última milestone
      const lastAnchor = milestones.length ? milestones[milestones.length - 1] : 0;
      if (gameState.jobs.eventsTriggered >= milestones.length && gameState.jobs.extraEventAnchor === 0){
        gameState.jobs.extraEventAnchor = lastAnchor;
      }
      while (
        gameState.jobs.eventsTriggered >= milestones.length &&
        gameState.jobs.totalHoursWorked >= (gameState.jobs.extraEventAnchor + 30)
      ){
        if (typeof makeRandomWorkEvent === 'function') {
          enqueueEvent(makeRandomWorkEvent(job));
        }
        gameState.jobs.extraEventAnchor += 30;
      }

      // persiste (respeita AUTOSAVE_ENABLED)
      if (typeof saveGameToStorage === 'function') saveGameToStorage();
    }

    function getOrderedWordsArray(){
      const ordered = document.getElementById('battle-ordered');
      return Array.from(ordered.querySelectorAll('.word-chip')).map(x => x.textContent);
    }
    function getOrderedWordsArrayNormalized(){
      return getOrderedWordsArray().map(normalizeToken);
    }

    function isPrefixCorrect(chosenArr, targetArr){
      // compara chosenArr como prefixo de targetArr, com normalização
      for (let i = 0; i < chosenArr.length; i++){
        if (normalizeToken(chosenArr[i]) !== normalizeToken(targetArr[i])) return false;
      }
      return true;
    }

    function shuffle(arr){
      const a = arr.slice();
      for (let i=a.length-1; i>0; i--){
        const j = Math.floor(Math.random()*(i+1));
        [a[i],a[j]] = [a[j],a[i]];
      }
      return a;
    }

    function updateEnemyHPUI(){
      const hpEl = document.getElementById('enemyhp-val');
      const fill = document.getElementById('enemyhp-fill');
      const max = 10; // ajuste se mudar o máximo
      const cur = gameState?.battle?.enemyHp ?? max;
      const pct = Math.max(0, Math.min(100, (cur/max)*100));
      if (hpEl) hpEl.textContent = String(cur);
      if (fill) fill.style.width = pct + '%';
    }

    function applyEnemyDamage(amount){
      const max = 10;
      const prev = gameState.battle.enemyHp ?? max;
      const next = Math.max(0, Math.min(max, prev - Math.max(0, amount|0)));
      gameState.battle.enemyHp = next;
      updateEnemyHPUI();
      return next; // retorna HP restante
    }

    function updateHPUI(){
      const hpEl = document.getElementById('hp-val');
      const fill = document.getElementById('hp-fill');
      const pct = Math.max(0, Math.min(100, (gameState.battle.hp/10)*100));
      if (hpEl) hpEl.textContent = String(gameState.battle.hp);
      if (fill) fill.style.width = pct + '%';
    }

    function onPickWordAndAttack(w){
      if (gameState.battle.battleEnded || gameState.battle.victoryFxRunning) return;
      if (gameState.battle.turn !== 'player') return;
      if (gameState.battle.defensePending) return;
      if (gameState.battle.skillActive) return;

      const ordered = document.getElementById('battle-ordered');

      // adiciona chip à frase do jogador
      const chip = document.createElement('button');
      chip.className = 'word-chip';
      chip.textContent = stripQuotes(w);
      ordered.appendChild(chip);

      // índice desta jogada
      const idx = ordered.children.length - 1;

      // alvo seguro
      const targetSeq = Array.isArray(gameState.battle.targetSeq) ? gameState.battle.targetSeq : [];
      if (idx >= targetSeq.length){
        // passou do tamanho esperado: reverte e não consome turno
        chip.remove(); renderBattleUI();
        showNotification('Sentence finished. A new one appears when you finish correctly.');
        return;
      }

      const expected = targetSeq[idx];

      // atualiza pool antes de validar (bloqueia repetidos)
      renderBattleUI();

      // ✅ VERIFICAÇÃO POR TURNO: só a palavra do índice
      const okStep = normalizeToken(w) === normalizeToken(expected);

      // encerra seu turno (ajuste de retaliação abaixo)
      gameState.battle.turn = 'enemy';

      if (okStep){
        const dmg = stepDamageFor(idx, targetSeq.length);
        const hpLeft = applyEnemyDamage(dmg);

        flashEnemyHP && flashEnemyHP();
        showNotification(`Right ORDER (${idx+1}/${targetSeq.length}). Enemy took ${dmg} damage.`, 1200);

        // vitória de verdade (hp == 0)
        if (hpLeft <= 0){
          const reward = 8 + Math.floor(Math.random()*7);
          gameState.coins = (gameState.coins||0) + reward;
          updateCoins && updateCoins();
          // se você tiver animação de vitória, chame aqui; senão:
          handleVictoryAndClose(reward);
          return;
        }

        // completou a frase correta? carrega nova (sem fechar a batalha)
        if ((idx + 1) === targetSeq.length){
          const next = pickValidSentence();
          gameState.battle.targetSeq    = next.words.slice();
          gameState.battle.targetWords  = shuffle(next.words.slice());
          gameState.battle.targetAnswer = next.answer;
          ordered.innerHTML = '';
          renderBattleUI();
        }

        // Sem retaliação quando acerta, se configurado
        if (!ENEMY_RETALIATE_ONLY_ON_MISS){
          setTimeout(()=> enemyTurn(), 420);
        } else {
          setTimeout(()=>{
            gameState.battle.turn = 'player';
            renderBattleUI();
          }, 420);
        }

      } else {
        // erro: feedback e (opcional) remover chip
        chip.classList.add('wrong');
        showNotification(`Wrong word for position ${idx+1}. Expected: 「${expected}」.`, 1100);
        setTimeout(()=>{ chip.remove(); renderBattleUI(); }, 180);

        // inimigo ataca
        setTimeout(()=> enemyTurn(), 420);
      }
    }

    function renderBattleUI(){
      const pool = document.getElementById('battle-pool');
      const ordered = document.getElementById('battle-ordered');
      if (!pool || !ordered) return;
      pool.innerHTML = '';

      const targetSeq = Array.isArray(gameState.battle.targetSeq) ? gameState.battle.targetSeq : [];
      const chosen = {};
      Array.from(ordered.querySelectorAll('.word-chip')).forEach(ch=>{
        const k = normalizeToken(ch.textContent);
        chosen[k] = (chosen[k]||0)+1;
      });

      const total = {};
      targetSeq.forEach(w=>{
        const k = normalizeToken(w);
        total[k] = (total[k]||0)+1;
      });

      (gameState.battle.targetWords || []).forEach(w=>{
        const btn = document.createElement('button');
        btn.className = 'word-chip';
        btn.textContent = stripQuotes(w);
        const key = normalizeToken(w);
        const used = chosen[key] || 0;
        const have = total[key]  || 0;
        if (used >= have){
          btn.classList.add('disabled');
          btn.onclick = null;
        } else {
          btn.onclick = ()=> onPickWordAndAttack(w);
        }
        pool.appendChild(btn);
      });
    }

    function joinOrderedSentence(){
      const ordered = document.getElementById('battle-ordered');
      const words = Array.from(ordered.querySelectorAll('.word-chip')).map(x=>x.textContent);
      return words.join('');
    }

    function openBattleJP(){
      gameState.inBattle = true;
      gameState.battle.battleEnded = false;
      gameState.battle.victoryFxRunning = false;
      gameState.battle.defensePending = false;
      gameState.battle.guardActive = false;

      gameState.battle.turn = 'player';
      gameState.battle.hp = 10;
      gameState.battle.enemyHp = 10;

      const pick = pickValidSentence();
      gameState.battle.targetSeq    = pick.words.slice();
      gameState.battle.targetWords  = shuffle(pick.words.slice());
      gameState.battle.targetAnswer = pick.answer;

      const ordered = document.getElementById('battle-ordered');
      if (ordered) ordered.innerHTML = '';

      updateHPUI && updateHPUI();
      updateEnemyHPUI();
      renderBattleUI && renderBattleUI();
      hideDefensePanel && hideDefensePanel();
      document.getElementById('battle-overlay').style.display = 'flex';

      const instr = document.getElementById('battle-instr');
      if (instr && Array.isArray(gameState.battle.targetSeq)){
        const per = stepDamageFor(0, gameState.battle.targetSeq.length); // valor típico por passo
        instr.textContent = `Pick ONE Japanese word. Each correct word deals ~${per} dmg (split across the sentence).`;
      }

      // debug opcional:
      console.log('[Battle] targetSeq=', gameState.battle.targetSeq);
    }

    function closeBattleJP(message){
      const ov = document.getElementById('battle-overlay');
      ov.style.display = 'none';
      gameState.inBattle = false;
      if (message) showNotification(message);
    }

    function endPlayerTurn(){
      if (!gameState.battle.pickedThisTurn){
        showNotification('Pick one word first (1 per turn).');
        return;
      }

      const orderedArr = getOrderedWordsArray();
      const targetArr  = gameState.battle.targetSeq || [];

      // ✅ checa ORDEM por prefixo
      const okOrder = isPrefixCorrect(orderedArr, targetArr);

      if (okOrder){
        // dano por acerto de ORDEM neste turno
        const dmg = 2; // ajuste como quiser (ex.: 1–2 aleatório)
        applyEnemyDamage(dmg);
        showNotification(`Right ORDER! Enemy took ${dmg} damage.`), 1200;

        // vitória?
        if (gameState.battle.enemyHp <= 0){
          const reward = 8 + Math.floor(Math.random()*7); // 8–14
          gameState.coins = (gameState.coins||0) + reward;
          updateCoins && updateCoins();
          closeBattleJP(`Enemy defeated! +${reward} coins`, 1500);
          return;
        }

        // se completou a frase **corretamente**, sorteia uma nova sentença para a próxima rodada
        if (orderedArr.length === targetArr.length){
          const pick = JP_SENTENCES[Math.floor(Math.random()*JP_SENTENCES.length)];
          gameState.battle.targetSeq   = pick.words.slice();
          gameState.battle.targetWords = shuffle(pick.words);
          gameState.battle.targetAnswer = pick.answer;
          document.getElementById('battle-ordered').innerHTML = '';
          renderBattleUI();
        }

      } else {
        // ordem errada: sem dano (jogador pode usar Undo/Clear no próximo turno)
        showNotification('Wrong ORDER.');
      }

      // passa a vez
      gameState.battle.turn = 'enemy';
      gameState.battle.pickedThisTurn = false;
      enemyTurn();
    }

    /* ========= Enemy turn: Defense mini-skill ========= */
    let defenseTimer=null, defenseTimeLeftMs=0, defenseAnswer='';
    const DEF_SKILLS = [
      { label:'ka', answer:'ka' },
      { label:'shi', answer:'shi' },
      { label:'arigatou', answer:'arigatou' },
      { label:'su', answer:'su' },
      { label:'mi', answer:'mi' },
      { label:'ko', answer:'ko' },
    ];

    // ===== Flow
    function chooseDefend(){
      if (gameState.battle.turn !== 'player') return;
      if (gameState.battle.defensePending) return;
      if (gameState.battle.battleEnded || gameState.battle.victoryFxRunning) return;

      const pick = DEF_SKILLS[Math.floor(Math.random()*DEF_SKILLS.length)];
      defenseAnswer = pick.answer;
      defenseTimeLeftMs = 3000;

      gameState.battle.defensePending = true;   // trava ataque enquanto defende
      showDefensePanel(pick.label, defenseTimeLeftMs);

      if (defenseTimer) clearInterval(defenseTimer);
      const tim = document.getElementById('defense-timer');
      defenseTimer = setInterval(()=>{
        defenseTimeLeftMs -= 100;
        if (defenseTimeLeftMs <= 0){
          clearInterval(defenseTimer); defenseTimer = null;
          resolveDefense(false);                 // tempo esgotou
        } else if (tim){
          tim.textContent = (defenseTimeLeftMs/1000).toFixed(1)+'s';
        }
      }, 100);
    }

    function guardAttempt(){
      if (!gameState.battle.defensePending) return;
      const inp = document.getElementById('defense-input');
      const val = (inp && inp.value || '').trim().toLowerCase();
      const ok = (val === defenseAnswer);
      if (defenseTimer){ clearInterval(defenseTimer); defenseTimer = null; }
      resolveDefense(ok);
    }

    function resolveDefense(success){
      hideDefensePanel();
      gameState.battle.defensePending = false;  // ✅ destrava chips
      if (success){
        gameState.battle.guardActive = true;
        gameState.battle.guardPower  = 1.0;     // 100% bloqueio
        showNotification('Guard ready! Next enemy attack will be blocked.');
      } else {
        showNotification('Defense failed.');
      }
      // consome o turno do jogador e passa ao inimigo
      gameState.battle.turn = 'enemy';
      showTurnBanner && showTurnBanner('Enemy Turn','enemy');
      setTimeout(()=> enemyTurn(), 350);
    }

    const ENEMY_RETALIATE_ONLY_ON_MISS = true; // se true, inimigo só bate quando você erra
    function enemyTurn(){
      let dmg = 1 + Math.floor(Math.random()*5);

      // guarda ativa?
      if (gameState.battle.guardActive){
        const reduced = Math.max(0, Math.round(dmg * (1 - (gameState.battle.guardPower || 1.0))));
        dmg = reduced;
        gameState.battle.guardActive = false;
      }

      if (dmg > 0){
        gameState.battle.hp = Math.max(0, (gameState.battle.hp||10) - dmg);
        updateHPUI && updateHPUI();
        if (gameState.battle.hp <= 0){
          closeBattleJP('You fainted! Better luck next time.');
          return;
        }
      }

      // devolve turno
      gameState.battle.turn = 'player';
      renderBattleUI && renderBattleUI();
    }

    function forceUnlockBattleInputs(){
      gameState.battle.defensePending = false;
      const p = document.getElementById('defense-panel');
      if (p){ p.style.display='none'; p.style.pointerEvents='none'; }
    }

    function openSkills(){ document.getElementById('skills-overlay').style.display = 'flex'; }
    function closeSkills(){ document.getElementById('skills-overlay').style.display = 'none'; }

    /* ========= Battle buttons ========= */
    function bindBattleButtonsJP(){
      document.getElementById('battle-ordered').addEventListener('click', (e)=>{
        if (gameState.battle.skillActive) return;
        if (!e.target.classList.contains('word-chip')) return;
        if (gameState.battle.turn !== 'player') return;
        if (gameState.battle.defensePending) return;
        e.target.remove();
        renderBattleUI();
      });

      const btnDef = document.getElementById('battle-defend');
      if (btnDef) btnDef.onclick = ()=>{
        if (gameState.battle.skillActive) return;
        if (gameState.battle.turn !== 'player') return;
        chooseDefend();
      };

      const btnDefSubmit = document.getElementById('defense-submit');
      if (btnDefSubmit) btnDefSubmit.onclick = guardAttempt;

      const inp = document.getElementById('defense-input');
      if (inp){
        inp.addEventListener('keydown', (e)=>{
          if (e.key === 'Enter'){ e.preventDefault(); guardAttempt(); }
        });
      }
      document.getElementById('battle-flee').onclick = ()=> {if (gameState.battle.battleEnded || gameState.battle.victoryFxRunning) return; if (gameState.battle.skillActive) return; closeBattleJP('You fled the encounter.');};
      // defense overlay submit
      document.getElementById('defense-submit').onclick = guardAttempt;
      document.getElementById('defense-input').addEventListener('keydown', (e)=>{
        if (e.key==='Enter'){ e.preventDefault(); guardAttempt(); }
      });

      const btnSkills = document.getElementById('battle-skills');
      if (btnSkills){
        btnSkills.onclick = ()=>{
          if (gameState.battle.victoryFxRunning || gameState.battle.battleEnded) return;
          if (gameState.battle.turn !== 'player') return;
          if (gameState.battle.defensePending || gameState.battle.skillActive) return;
          openSkillsModal();
        };
      }

      const sm = document.getElementById('skills-modal');
      document.getElementById('skills-close')?.addEventListener('click', ()=> sm.style.display='none');
      document.getElementById('skill-earthquake')?.addEventListener('click', ()=>{
        sm.style.display='none';
        triggerEarthquake();
      });
    }

    /* ========= Random encounter loop (New District) ========= */
    function startEncounterLoop(){
      if (gameState.encounterTimerId) clearInterval(gameState.encounterTimerId);
      gameState.encounterTimerId = setInterval(()=>{
        if (!gameState.gameStarted) return;
        if (gameState.currentMap !== 'novo') return;              // só no New District
        if (gameState.inBattle || gameState.inDialogue || gameState.inMinigame) return;
        if (Math.random() < 0.35){ openBattleJP(); }              // taxa de encontro alta
      }, 3000);
    }
    function stopEncounterLoop(){
      if (gameState.encounterTimerId){
        clearInterval(gameState.encounterTimerId);
        gameState.encounterTimerId = null;
      }
    }

    // ------- TURN BANNER -------
    function showTurnBanner(text, tone='ally'){ // tone: ally/enemy
      const b = document.getElementById('turn-banner');
      if (!b) return;
      b.textContent = text;
      b.style.background = (tone==='enemy') ? 'rgba(230, 57, 70, .95)' : 'rgba(233,196,106,.95)';
      b.classList.add('show');
      setTimeout(()=> b.classList.remove('show'), 600);
    }

    // ------- HP flashes -------
    function flashEnemyHP(){
      const fill = document.getElementById('enemyhp-fill');
      if (!fill) return;
      fill.classList.remove('hit'); void fill.offsetWidth; fill.classList.add('hit');
    }
    function flashPlayerHP(){
      const fill = document.getElementById('hp-fill');
      if (!fill) return;
      fill.classList.remove('hit'); void fill.offsetWidth; fill.classList.add('hit');
    }

    // ------- Shake em quem apanha -------
    function shake(elId){
      const el = document.getElementById(elId);
      if (!el) return;
      el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    }

    // ------- Floater de dano (x,y relativos ao card) -------
    function spawnDamageFloater(text, target='enemy'){
      const card = document.getElementById('battle-card');
      if (!card) return;
      const f = document.createElement('div');
      f.className = 'damage-floater';
      f.textContent = `-${text}`;
      f.style.left = target==='enemy' ? '72%' : '18%';
      f.style.top  = target==='enemy' ? '26%' : '26%';
      card.appendChild(f);
      setTimeout(()=> f.remove(), 700);
    }

    // ------- Defense panel helpers seguros -------
    function showDefensePanel(label, ms){
      const p = document.getElementById('defense-panel');
      document.getElementById('defense-label').textContent = label;
      const input = document.getElementById('defense-input');
      input.value=''; input.blur(); input.focus();
      document.getElementById('defense-timer').textContent = (ms/1000).toFixed(1)+'s';
      p.removeAttribute('hidden'); // garante pointer-events ON
    }
    function hideDefensePanel(){
      const p = document.getElementById('defense-panel');
      if (!p) return;
      p.setAttribute('hidden',''); // garante pointer-events OFF
    }

    function playVictoryAnimation(opts = {}) {
      const card = document.getElementById('battle-card');
      const ov   = document.getElementById('victory-overlay');
      if (!card || !ov) return;

      // shake inimigo
      document.getElementById('enemyhp-wrap')?.classList.add('victory-shake');

      // preparar confete/moedas
      const conf = ov.querySelector('.victory-confetti');
      const coins = ov.querySelector('.victory-coins');
      conf.innerHTML = ''; coins.innerHTML = '';

      const pieces = opts.pieces || 60;
      for (let i=0;i<pieces;i++){
        const p = document.createElement('div');
        p.className = 'vic-piece';
        p.style.left = Math.random()*100 + 'vw';
        p.style.top = (-10 - Math.random()*30) + 'vh';
        const dur = 1200 + Math.random()*900; // 1.2s–2.1s
        p.style.animationDuration = dur + 'ms';
        // confete colorido
        const colors = ['#e63946','#f4a261','#2a9d8f','#90e0ef','#e9c46a','#9d4edd'];
        p.style.background = colors[Math.floor(Math.random()*colors.length)];
        conf.appendChild(p);
      }

      // algumas “moedas”
      const coinCount = opts.coins || 12;
      for (let i=0;i<coinCount;i++){
        const c = document.createElement('div');
        c.className = 'vic-piece';
        c.style.left = (20 + Math.random()*60) + 'vw';
        c.style.top = (-12 - Math.random()*30) + 'vh';
        c.style.animationDuration = (1400 + Math.random()*1200) + 'ms';
        c.style.width='12px'; c.style.height='12px'; c.style.borderRadius='50%';
        c.style.background = 'radial-gradient(circle at 30% 30%, #fff 10%, #f6d365 30%, #f4c10f 60%, #c49b0b 100%)';
        coins.appendChild(c);
      }

      ov.style.display = 'flex';

      // (opcional) som — descomente se quiser
      // try { new Audio('data:audio/mp3;base64,...').play(); } catch {}

      // auto-hide depois que tudo cai
      const totalMs = 2100;
      setTimeout(()=>{
        ov.classList.add('victory-out');
        setTimeout(()=>{
          ov.classList.remove('victory-out');
          ov.style.display = 'none';
          document.getElementById('enemyhp-wrap')?.classList.remove('victory-shake');
          conf.innerHTML=''; coins.innerHTML='';
          if (typeof opts.onEnd === 'function') opts.onEnd();
        }, 360);
      }, totalMs);
    }

    function handleVictoryAndClose(reward){
      if (gameState.battle.battleEnded) return;
      gameState.battle.battleEnded = true;        // trava tudo
      gameState.battle.victoryFxRunning = true;

      const end = ()=> {
        gameState.battle.victoryFxRunning = false;
        closeBattleJP(`Enemy defeated! +${reward} coins`);
        return;
      };

      if (typeof playVictoryAnimation === 'function'){
        playVictoryAnimation({ pieces:80, coins:16, onEnd: end });
      } else {
        end(); // fallback sem FX
      }
    }

  function openSkillsModal(){
    const sm = document.getElementById('skills-modal');
    if (sm) sm.style.display='flex';
  }

  function ensureEqDom() {
    let overlay = document.getElementById('eq-overlay');
    let layer   = document.getElementById('eq-layer');
    let canvas  = document.getElementById('eq-matrix');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'eq-overlay';
      overlay.style.cssText = 'display:none;position:fixed;inset:0;z-index:11000;pointer-events:auto;';
      // estrutura interna
      const inner = document.createElement('div');
      inner.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;';
      layer = document.createElement('div');
      layer.id = 'eq-layer';
      layer.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:auto;';
      canvas = document.createElement('canvas');
      canvas.id = 'eq-matrix';
      canvas.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;';
      inner.appendChild(canvas);
      inner.appendChild(layer);
      overlay.appendChild(inner);
      document.body.appendChild(overlay);
    } else {
      layer  = layer  || document.getElementById('eq-layer');
      canvas = canvas || document.getElementById('eq-matrix');
    }

    // assegura posicionamentos/z-index mesmo se CSS externo mudou
    overlay.style.zIndex = '11000';
    overlay.style.position = 'fixed';

    return { overlay, layer, canvas };
  }

  /** Skill: Earthquake
   * Dura até 5s. Tremor + "matrix rain" + peças clicáveis (kanji/en).
   * Se acertar um par (kanji→en) dentro do tempo → hit kill.
   * Senão, aplica 20–40% do HP do inimigo como dano.
   * Consome o turno do jogador.
   */
  // Skill: Earthquake — Full, self-contained (helpers inclusas dentro)
  function triggerEarthquake(){
  const GS = window.gameState ?? (typeof gameState !== 'undefined' ? gameState : null);
  const B  = GS?.battle;
  if (!GS || !B) { console.warn('[EQ] exit: no gameState/battle'); return 'no-battle'; }
  if (B.victoryFxRunning || B.battleEnded) { console.warn('[EQ] exit: victoryFxRunning/battleEnded'); return 'ended'; }
  if (B.turn !== 'player') { console.warn('[EQ] exit: not player turn'); return 'not-player'; }
  if (B.defensePending || B.skillActive) { console.warn('[EQ] exit: defensePending/skillActive'); return 'busy'; }


    // ==== DEBUG: diga exatamente por que sair ====
    const b = gameState?.battle;
    if (!gameState || !b) { console.warn("[EQ] exit: no gameState/battle"); return "no-battle"; }
    if (b.victoryFxRunning || b.battleEnded) { console.warn("[EQ] exit: victoryFxRunning/battleEnded"); return "ended"; }
    if (b.turn !== 'player') { console.warn("[EQ] exit: not player turn"); return "not-player"; }
    if (b.defensePending || b.skillActive) { console.warn("[EQ] exit: defensePending/skillActive"); return "busy"; }

    // ==== DOM base (robusto) ====
    const { overlay, layer, canvas } = ensureEqDom(); // definido na seção B
    const card = document.getElementById('battle-card');

    if (!overlay || !layer || !canvas || !card){
      console.warn('[EQ] exit: Missing DOM after ensureEqDom');
      return "missing-dom";
    }

    // ==== Estado da skill ====
    gameState.battle.skillActive = true;
    card.classList.add('quake');

    // Mostrar overlay ANTES de medir tamanho (se estava hidden)
    overlay.style.display = 'block';
    overlay.getBoundingClientRect(); // força reflow

    // Iniciar Matrix rain agora que o canvas está visível
    startMatrixRain(canvas);

    // Criar peças (kanji/en) a partir dos pares
    const pairs = shuffle(PAIRS_SRC).slice(0, 5); // 5 pares (10 peças)
    layer.innerHTML = ''; // limpar camada antes
    const pieces = spawnFallingPieces(layer, pairs);

    // Seleção de par
    let selected = null;       // {type, id, el}
    let successHitKill = false;

    function pieceClickHandler(e){
      const t = e.target;
      if (!t.classList.contains('eq-piece')) return;
      const pid = Number(t.getAttribute('data-pair') || '-1');
      const typ = t.getAttribute('data-type'); // 'kanji'|'en'
      if (pid < 0) return;

      if (!selected){
        selected = { type: typ, id: pid, el: t };
        t.classList.add('sel');
      } else {
        if (selected.id === pid && selected.type !== typ){
          // MATCH: Hit Kill
          successHitKill = true;
          selected.el.classList.add('sel');
          t.classList.add('sel');
          endEarthquake(true);
        } else {
          // troca a seleção (falhou pareamento)
          selected.el.classList.remove('sel');
          selected = { type: typ, id: pid, el: t };
          t.classList.add('sel');
        }
      }
    }
    overlay.removeEventListener?.('click', overlay._eqClickHandler);
    overlay._eqClickHandler = pieceClickHandler;
    overlay.addEventListener('click', overlay._eqClickHandler);

    // ===== Animação de queda =====
    const start = performance.now();
    let animId = 0;
    function step(ts){
      const dt = Math.min(32, ts - (step._last || ts)); step._last = ts;

      pieces.forEach(p=>{
        if (p.dead) return;
        p.y += p.speed * (dt / 1000);
        p.el.style.transform = `translate3d(${Math.round(p.x)}px, ${Math.round(p.y)}px, 0)`;
        if (p.y > p.rootH + 30){
          p.dead = true;
          p.el.remove();
        }
      });

      const elapsed = ts - start;
      if (!successHitKill && elapsed < DURATION_MS){
        animId = requestAnimationFrame(step);
      } else {
        endEarthquake(successHitKill);
      }
    }
    animId = requestAnimationFrame(step);

    // ===== Encerramento / aplicação de dano =====
    function endEarthquake(kill){
      // previne múltiplas finalizações
      if (!gameState.battle.skillActive) return;

      cancelAnimationFrame(animId);
      overlay.removeEventListener('click', pieceClickHandler);

      // para Matrix, limpa peças, some overlay e para tremor
      stopMatrixRain(canvas);
      layer.innerHTML = '';
      overlay.style.display = 'none';
      card.classList.remove('quake');

      gameState.battle.skillActive = false;

      // Aplica efeito
      if (kill){
        // Zera HP do inimigo
        const hpLeft = applyEnemyDamage(gameState.battle.enemyHp);
        showNotification('Earthquake Match! Instant kill!');
        if (hpLeft <= 0){
          const reward = 8 + Math.floor(Math.random()*7);
          gameState.coins = (gameState.coins||0) + reward;
          if (typeof updateCoins === 'function') updateCoins();
          if (typeof handleVictoryAndClose === 'function') handleVictoryAndClose(reward);
          else closeBattleJP && closeBattleJP(`Enemy defeated! +${reward} coins`, 1500);
          return;
        }
      } else {
        // Dano parcial 20-40% do HP máximo
        const frac = 0.20 + Math.random()*0.20;
        const dmg  = Math.max(1, Math.round(ENEMY_MAX_HP * frac));
        applyEnemyDamage(dmg);
        showNotification(`Earthquake shakes the foe! -${dmg} HP`, 1200);
        if (gameState.battle.enemyHp <= 0){
          const reward = 8 + Math.floor(Math.random()*7);
          gameState.coins = (gameState.coins||0) + reward;
          if (typeof updateCoins === 'function') updateCoins();
          if (typeof handleVictoryAndClose === 'function') handleVictoryAndClose(reward);
          else closeBattleJP && closeBattleJP(`Enemy defeated! +${reward} coins`);
          return;
        }
      }

      // Consome o turno do jogador → inimigo age
      gameState.battle.turn = 'enemy';
      setTimeout(()=> { if (typeof enemyTurn === 'function') enemyTurn(); }, 350);
    }

    // Cria peças clicáveis distribuídas por toda a largura do viewport
    function spawnFallingPieces(root, pairs){
      const W = Math.max(window.innerWidth,  document.documentElement.clientWidth  || 0);
      const H = Math.max(window.innerHeight, document.documentElement.clientHeight || 0);

      // duplica em kanji/en e embaralha
      const items = [];
      pairs.forEach((p, idx)=>{
        items.push({ text:p.kanji, type:'kanji', pair:idx });
        items.push({ text:p.en,    type:'en',    pair:idx });
      });
      const arr = shuffle(items);

      const targetCols = Math.min(10, Math.max(6, Math.floor(W / 120))); // ~120px base
      const colWidth = W / targetCols;

      return arr.map((it, i)=>{
        const el = document.createElement('div');
        el.className = 'eq-piece';
        el.textContent = it.text;
        el.setAttribute('data-type', it.type);
        el.setAttribute('data-pair', String(it.pair));
        root.appendChild(el);

        const colIdx = i % targetCols;
        const jitter = (Math.random() * (colWidth * 0.5)) - (colWidth * 0.25);
        const x = (colIdx + 0.5) * colWidth + jitter;

        const wave = Math.floor(i / targetCols);
        const y = - (40 + wave * 50 + Math.random()*40);

        const speed = 70 + Math.random()*80; // px/s (estilo matrix)

        el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
        return { el, x, y, speed, dead:false, rootH: H };
      });
    }

    // Matrix rain no canvas (viewport)
    function startMatrixRain(cnv){
      const ctx = cnv.getContext('2d');
      let mxW=0, mxH=0, mxFont=16, raf=0, cols=[];

      const resize = ()=>{
        cnv.width  = Math.max(window.innerWidth,  document.documentElement.clientWidth  || 0);
        cnv.height = Math.max(window.innerHeight, document.documentElement.clientHeight || 0);
        mxW = cnv.width; mxH = cnv.height;
        mxFont = 16;
        const n = Math.floor(mxW / mxFont);
        cols = new Array(n).fill(0);
      };
      resize();
      window.addEventListener('resize', resize);

      const glyphs = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789';

      function draw(){
        ctx.fillStyle = 'rgba(0,0,0,0.12)'; // rastro
        ctx.fillRect(0,0,mxW,mxH);

        ctx.fillStyle = '#00ff9c';
        ctx.font = mxFont + 'px monospace';

        for (let i=0;i<cols.length;i++){
          const ch = glyphs[Math.floor(Math.random()*glyphs.length)];
          const x = i * mxFont;
          const y = cols[i] * mxFont;
          ctx.fillText(ch, x, y);
          if (y > mxH && Math.random() > 0.975) cols[i] = 0;
          cols[i]++;
        }
        raf = requestAnimationFrame(draw);
      }
      draw();

      // attach stopper ao canvas
      cnv._stopMatrix = ()=>{
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        ctx.clearRect(0,0,mxW,mxH);
      };
    }

    function stopMatrixRain(cnv){
      if (cnv && typeof cnv._stopMatrix === 'function') cnv._stopMatrix();
    }
  }
  
   window.factoryReset = factoryReset;
  


// Expose some APIs for external UI/bindings
window.triggerEarthquake = window.triggerEarthquake || triggerEarthquake;
window.openDictionary = window.openDictionary || openDictionary;

