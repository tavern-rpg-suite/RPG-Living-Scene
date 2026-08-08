import { getContext, extension_settings } from '../../../extensions.js';
import { eventSource, event_types, saveChatDebounced, saveSettingsDebounced, setExtensionPrompt, extension_prompt_roles, characters, name1 } from '../../../../script.js';
import { selected_group, groups } from '../../../group-chats.js';

const MODULE_NAME = 'rpg_living_scene';
const PROMPT_KEY = 'rpg_living_scene_injection';

/* ============================================================
   RPG LIVING SCENE
   Ambient life for group chats: characters present in the scene
   (but not speaking) drop short in-character reactions — spoken
   quips or 💭 thoughts — as glassy bubbles inside the message.
   Free source: lines the main model already wrote for them are
   parsed out of the text. Paid source: ONE side-API call per
   message for everyone at once. A 💬 on a bubble triggers that
   character's full reply in the main chat.
   ============================================================ */

const I18N = {
    en: {
        set_header: 'RPG Living Scene', set_enable: 'Enable Living Scene',
        set_lang: 'Language:', set_api: 'API Settings (side model)',
        set_url: 'URL', set_key: 'API Key', set_model: 'Model', set_temp: 'AI temperature:',
        set_logic: 'Scene logic',
        set_chance: 'Reaction chance per message (%):',
        set_max: 'Max AI reactions per message:',
        set_cooldown: 'Per-character cooldown (messages):',
        set_thoughts: 'Allow 💭 thoughts (not only spoken lines)',
        set_chatter: 'Background whispers: two present characters may murmur to each other',
        set_chatter_chance: 'Whisper-exchange chance (%):',
        set_inject: 'Tell the main model about the bubbles (so you can reply to them)',
        set_quote_reply: 'Quote the bubble in chat when replying to it',
        set_actions: 'Bubbles may include a small *action* beat',
        set_react_user: 'React to YOUR messages too',
        set_react_user_chance: 'Reaction chance for your messages (%):',
        set_calls: 'Side-model calls this session:',
        roster_edit_title: 'Aliases & character note',
        meta_aliases_ph: 'Aliases, comma-separated (Aqua, Аква)…',
        meta_note_ph: 'Character note for the AI (voice, attitude)…',
        meta_save: 'Save',
        set_auto: 'Auto-presence: characters mentioned recently are "in the scene"',
        roster_title: 'Who is in the scene?',
        roster_hint: 'Present characters may quietly react to what happens. Toggle who is actually in the room.',
        roster_npc_ph: 'NPC name (no card needed)…',
        roster_npc_add: 'Add NPC',
        roster_members: 'Group members', roster_npcs: 'Custom NPCs',
        btn_title: 'Living Scene — who is present',
        bark_reply_title: 'Reply to {name}',
        ask_ph: 'Say something to {name}…',
        ask_npc_hint: '{name} has no card — the main model will voice the reply.',
        gen_quiet: 'The scene stayed quiet this time.',
        gen_nocast: 'Nobody is present — open 🎭 and toggle who is in the scene.',
        gen_nokey: 'Set the API key in the Living Scene settings first.',
        set_inject_depth: 'Injection depth:',
        set_off_left: 'Left bubbles: offset from message top (px, below the thoughts):',
        set_off_right: 'Right bubbles: offset from message top (px):',
        set_autonpc: 'Diary NPCs join the scene automatically when mentioned',
        roster_diary: 'From the Diary',
        roster_diary_add: 'Add to the scene',
        roster_diary_none: 'The Diary has no NPCs yet (or the Diary extension is off).',
        roster_auto: 'auto',
        bark_del_title: 'Dismiss',
        bark_regen_title: 'Reroll this line',
        bark_more_title: 'Stir the scene (generate reactions)',
        trigger_hint: 'Command placed in the input — press Send.',
        npc_reply_hint: 'NPC has no card: an address line was placed in the input.',
        no_group: 'Living Scene works best in group chats. You can still add NPCs.',
        gen_fail: 'The scene stayed quiet (AI error).'
    },
    ru: {
        set_header: 'RPG Живая сцена', set_enable: 'Включить живую сцену',
        set_lang: 'Язык:', set_api: 'Настройки API (боковая модель)',
        set_url: 'URL', set_key: 'API-ключ', set_model: 'Модель', set_temp: 'Температура ИИ:',
        set_logic: 'Логика сцены',
        set_chance: 'Шанс реакции на сообщение (%):',
        set_max: 'Макс. ИИ-реакций на сообщение:',
        set_cooldown: 'Перезарядка персонажа (сообщений):',
        set_thoughts: 'Разрешить 💭 мысли (не только реплики вслух)',
        set_chatter: 'Перешёптывания: двое присутствующих могут перекинуться парой фраз',
        set_chatter_chance: 'Шанс перешёптывания (%):',
        set_inject: 'Сообщать основной модели об облачках (чтобы им можно было отвечать)',
        set_quote_reply: 'Дублировать реплику в чат при ответе на облачко',
        set_actions: 'Облачка могут содержать маленькое *действие*',
        set_react_user: 'Реагировать и на ТВОИ сообщения',
        set_react_user_chance: 'Шанс реакции на твои сообщения (%):',
        set_calls: 'Вызовов боковой модели за сессию:',
        roster_edit_title: 'Алиасы и характер',
        meta_aliases_ph: 'Алиасы через запятую (Aqua, Аква)…',
        meta_note_ph: 'Заметка-характер для ИИ (голос, отношение)…',
        meta_save: 'Сохранить',
        set_auto: 'Авто-присутствие: недавно упомянутые считаются «в сцене»',
        roster_title: 'Кто сейчас в сцене?',
        roster_hint: 'Присутствующие могут тихо реагировать на происходящее. Отметь, кто реально в комнате.',
        roster_npc_ph: 'Имя NPC (карточка не нужна)…',
        roster_npc_add: 'Добавить NPC',
        roster_members: 'Участники группы', roster_npcs: 'Свои NPC',
        btn_title: 'Живая сцена — кто присутствует',
        bark_reply_title: 'Ответить персонажу {name}',
        ask_ph: 'Сказать {name}…',
        ask_npc_hint: 'У {name} нет карточки — ответ озвучит основная модель.',
        gen_quiet: 'Сцена в этот раз промолчала.',
        gen_nocast: 'Никого нет в сцене — открой 🎭 и включи присутствующих.',
        gen_nokey: 'Сначала укажи API-ключ в настройках Живой сцены.',
        set_inject_depth: 'Глубина вставки:',
        set_off_left: 'Облачка слева: отступ от верха сообщения (px, ниже мыслей):',
        set_off_right: 'Облачка справа: отступ от верха сообщения (px):',
        set_autonpc: 'NPC из дневника сами появляются в сцене, если упомянуты',
        roster_diary: 'Из дневника',
        roster_diary_add: 'Добавить в сцену',
        roster_diary_none: 'В дневнике пока нет NPC (или расширение дневника выключено).',
        roster_auto: 'авто',
        bark_del_title: 'Убрать',
        bark_regen_title: 'Перегенерировать реплику',
        bark_more_title: 'Оживить сцену (сгенерировать реакции)',
        trigger_hint: 'Команда вставлена в поле ввода — нажми «Отправить».',
        npc_reply_hint: 'У NPC нет карточки: обращение вставлено в поле ввода.',
        no_group: 'Живая сцена лучше всего работает в групповых чатах. Но NPC можно добавить и так.',
        gen_fail: 'Сцена промолчала (ошибка ИИ).'
    }
};

let settings = {};
function t(key, vars) {
    const lang = settings.language === 'ru' ? 'ru' : 'en';
    let str = (I18N[lang] && I18N[lang][key] !== undefined) ? I18N[lang][key] : (I18N.en[key] !== undefined ? I18N.en[key] : key);
    if (vars) for (const k in vars) str = str.split('{' + k + '}').join(vars[k]);
    return str;
}
function genLang() { return settings.language === 'ru' ? 'Russian' : 'English'; }

// Names/barks come from the AI and downloaded cards — never raw in HTML.
function escapeHtml(x) {
    return String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// tiny safe markdown for bubble text: escape first, then *italic* / **bold**
function miniMd(x) {
    let out = escapeHtml(x);
    out = out.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/\*([^*\n]+)\*/g, '<i>$1</i>');
    return out;
}

// Junk from the model (-1, "null", bare numbers) must never become a bark.
function cleanBark(x, maxLen = 200) {
    const s = String(x == null ? '' : x).trim().replace(/^["'«]+|["'»]+$/g, '').trim();
    if (s.length < 2 || !/\p{L}/u.test(s)) return null;
    if (/^(null|undefined|n\/?a|none|нет|-?\d+)$/i.test(s)) return null;
    return s.slice(0, maxLen);
}

/* ============================================================
   SETTINGS
   ============================================================ */
function loadSettings() {
    if (!extension_settings[MODULE_NAME]) extension_settings[MODULE_NAME] = {};
    const defaults = {
        enabled: false,
        language: 'en',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: '',
        model: 'google/gemma-4-31b-it',
        temperature: 0.9,
    strictJson: true,
        barkChance: 65,      // % chance that a message stirs AI reactions at all
        maxBarks: 2,         // max AI reactions per message
        cooldown: 3,         // a character stays quiet for N messages after barking
        allowThoughts: true,
        allowChatter: true,     // background whisper exchanges between two present characters
        chatterChance: 35,      // % chance a message sparks such an exchange
        autoPresence: true,
        autoNpc: true,      // diary NPCs auto-join the scene when mentioned
        injectBarks: true,  // the main model gets to KNOW what the scene said
        injectDepth: 1,
        quoteReply: true,   // replying via 💬 quotes the bubble into the chat first
        allowActions: false, // bubbles may carry a tiny *action* beat
        reactToUser: true,   // the scene may react to the PLAYER's messages too
        userBarkChance: 40,  // …with its own, lower chance
        offsetLeft: 250,    // px below the message top on the LEFT (clear of the thought bubbles)
        offsetRight: 8      // px below the message top on the RIGHT
    };
    settings = Object.assign({}, defaults, extension_settings[MODULE_NAME]);
    // heal NaN/garbage from empty number inputs
    if (!Number.isFinite(settings.barkChance)) settings.barkChance = defaults.barkChance;
    if (!Number.isFinite(settings.maxBarks)) settings.maxBarks = defaults.maxBarks;
    if (!Number.isFinite(settings.cooldown)) settings.cooldown = defaults.cooldown;
    if (!Number.isFinite(settings.chatterChance)) settings.chatterChance = defaults.chatterChance;
    if (!Number.isFinite(settings.userBarkChance)) settings.userBarkChance = defaults.userBarkChance;
    if (!Number.isFinite(settings.injectDepth)) settings.injectDepth = defaults.injectDepth;
    if (!Number.isFinite(settings.offsetLeft)) settings.offsetLeft = defaults.offsetLeft;
    if (!Number.isFinite(settings.offsetRight)) settings.offsetRight = defaults.offsetRight;
    if (!Number.isFinite(settings.temperature)) settings.temperature = defaults.temperature;
}
function saveSettings() {
    extension_settings[MODULE_NAME] = settings;
    if (typeof saveSettingsDebounced === 'function') saveSettingsDebounced();
}

/* ============================================================
   PER-CHAT SCENE STATE (lives in chatMetadata — per chat, no
   global growth, travels with the chat file)
   ============================================================ */
function sceneState() {
    const md = getContext().chatMetadata;
    if (!md) return { present: {}, npcs: [], lastBark: {} };
    if (!md.rpg_living_scene) md.rpg_living_scene = { present: {}, npcs: [], lastBark: {} };
    const st = md.rpg_living_scene;
    if (!st.present) st.present = {};
    if (!Array.isArray(st.npcs)) st.npcs = [];
    if (!st.lastBark) st.lastBark = {};
    if (!st.meta) st.meta = {};   // per-name { aliases, note } authored in the roster
    return st;
}
function saveScene() { saveChatDebounced(); }

// NPC dossiers kept by the RPG Diary extension: {name, role, look, note, trust}
function diaryNpcs() {
    try {
        const chatId = getContext().chatId;
        const st = extension_settings['rpg_diary']?.chatStates?.[chatId];
        return Array.isArray(st?.npcs) ? st.npcs.filter(n => n && n.name) : [];
    } catch (e) { return []; }
}
function diaryPersona(n) {
    return [n.role, n.note, n.look].filter(Boolean).join('; ').replace(/\s+/g, ' ').slice(0, 220);
}

function groupMembers() {
    const out = [];
    if (selected_group) {
        const g = (groups || []).find(x => x.id === selected_group);
        if (g && Array.isArray(g.members)) {
            g.members.forEach(m => {
                const ch = characters.find(c => c.avatar === m) || characters.find(c => c.name === m);
                if (ch && ch.name) out.push({ name: ch.name, avatar: ch.avatar, isNpc: false });
            });
        }
    } else {
        const ctx = getContext();
        if (ctx.characterId !== undefined && characters[ctx.characterId]) {
            const ch = characters[ctx.characterId];
            out.push({ name: ch.name, avatar: ch.avatar, isNpc: false });
        }
    }
    return out;
}

// is this character considered "in the scene" right now?
function isPresent(name) {
    const st = sceneState();
    if (st.present[name] === true) return true;
    if (st.present[name] === false) return false;
    // unset → auto mode: present if mentioned or speaking in the recent messages
    if (!settings.autoPresence) return false;
    const chat = getContext().chat || [];
    const tail = chat.slice(-10);
    const low = name.toLowerCase();
    // stem match: the full card name ("Sebastian Michaelis") almost never appears in prose,
    // and Russian declines names (Себастьяна/Себастьяну) — the old check missed both
    const probes = probesOf(name);
    return tail.some(m => (m.name && m.name.toLowerCase() === low)
        || (m.mes && probes.some(pr => m.mes.toLowerCase().includes(pr))));
}

// everyone who could react: members + custom NPCs (+ diary NPCs), minus the speaker
function presentCast(excludeName) {
    const st = sceneState();
    const cast = [];
    const seen = new Set();
    const add = (entry) => { if (entry.name !== excludeName && !seen.has(entry.name) && isPresent(entry.name)) { seen.add(entry.name); cast.push(entry); } };
    groupMembers().forEach(m => add(m));
    st.npcs.forEach(n => add({ name: n.name, avatar: null, isNpc: true }));
    if (settings.autoNpc) diaryNpcs().forEach(n => add({ name: n.name, avatar: null, isNpc: true }));   // auto-join when mentioned
    return cast;
}

/* ============================================================
   SIDE API
   ============================================================ */
let apiCallCount = 0;
/* ------------------------------------------------------------
   ENDPOINT HANDLING — reaching the server only. Nothing about presence,
   barks, whispers or any prompt changes here.
   1. An empty key falls back to Tavern RPG Engine's. An address YOU typed always
      wins: borrowing takes only what is missing, never the URL. A local backend
      needs no key, so a placeholder is used rather than a borrowed one.
   2. OpenAI-style backends live under /v1; without it LM Studio and KoboldCpp
      reject the path outright.
   3. response_format is an OpenAI parameter. KoboldCpp turns it into a grammar
      forbidding anything but an object, and a model opening with "[" bails out
      with EOS. Local backends do not get it — the reply is parsed leniently anyway.
   ------------------------------------------------------------ */
const KEY_SOURCES = ['tavern_rpg_engine'];
function normalizeBase(url) {
    let u = String(url || '').trim().replace(/\s+/g, '');
    if (!u) return u;
    u = u.replace(/\/+$/, '');
    u = u.replace(/\/(chat\/completions|completions|images|images\/generations|embeddings)$/i, '');
    if (!/\/v\d+($|\/)/i.test(u)) u += '/v1';
    return u;
}
function isLocalEndpoint(url) {
    const u = String(url || '').toLowerCase();
    if (!u) return false;
    return /(^|\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|host\.docker\.internal)([:/]|$)/.test(u)
        || /:(5001|5000|8080|8000|1234|11434|5002)(\/|$)/.test(u)
        || /192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[01])\./.test(u);
}
function wantsStrictJson(url) {
    if (settings.strictJson === false) return false;
    return !isLocalEndpoint(url);
}
function borrowedRaw() {
    for (const src of KEY_SOURCES) {
        if (src === MODULE_NAME) continue;
        try {
            const x = extension_settings[src];
            if (x && x.apiKey && x.model) return { url: x.baseUrl, key: x.apiKey, model: x.model, from: src };
        } catch (e) { /* a neighbour with broken settings must not break us */ }
    }
    return { url: '', key: '', model: '', from: null };
}
function apiConf() {
    const own = String(settings.baseUrl || '').trim();
    const ownKey = String(settings.apiKey || '').trim();
    const ownModel = String(settings.model || '').trim();
    if (own) {
        const local = isLocalEndpoint(own);
        const b = (ownKey && ownModel) ? { key: '', model: '', from: null } : borrowedRaw();
        return {
            url: own,
            key: ownKey || (local ? 'local' : b.key),
            model: ownModel || (local ? '' : b.model),
            from: ownKey ? null : (local ? null : b.from)
        };
    }
    if (ownKey && ownModel) return { url: '', key: ownKey, model: ownModel, from: null };
    const b = borrowedRaw();
    return b.key ? b : { url: '', key: ownKey, model: ownModel, from: null };
}
function apiKey() { return apiConf().key || ''; }
function apiUrl() { return normalizeBase(apiConf().url) || 'https://openrouter.ai/api/v1'; }
function apiModel() { return apiConf().model || ''; }
function borrowedFrom() { return apiConf().from; }

async function callAI(systemPrompt, userPrompt) {
    if (!apiKey()) throw new Error('API key is not set');
    const endpointUrl = apiUrl() + '/chat/completions';
    const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey().trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: apiModel(),
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
            temperature: settings.temperature,
            ...(wantsStrictJson(endpointUrl) ? { response_format: { type: 'json_object' } } : {})
        })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    apiCallCount++;
    $('#rls-calls-n').text(apiCallCount);
    const data = await response.json();
    const content = (data.choices?.[0]?.message?.content || '').trim();
    const m = content.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : content);
}

/* ============================================================
   Who is actively ON STAGE in this text? In narrator-style play one
   card writes for everyone: the message may be "from Sebastian" while
   CIEL does all the talking. Giving the talker an ambient bark looked
   absurd — his voice is already on screen. Stem matching tolerates
   Russian declensions (Сиэль/Сиэля/Сиэлю).
   ============================================================ */
// all the ways this character may be written in prose: name + user-given aliases
// (Aqua/Аква/Kazuma — fixes translated cards and declensions in one stroke)
function aliasNamesOf(name) {
    const st = sceneState();
    const meta = (st.meta && st.meta[name]) || {};
    return [name].concat(String(meta.aliases || '').split(',').map(x => x.trim()).filter(Boolean));
}
function probesOf(name) {
    const probes = new Set();
    for (const n of aliasNamesOf(name)) {
        const stem = nameStem(n);
        if (stem && stem.length >= 3) probes.add(stem);
        else if (n.length >= 2) probes.add(n.toLowerCase());
    }
    return [...probes];
}

function nameStem(name) {
    let w = String(name || '').trim().split(/\s+/)[0] || '';
    if (w.length > 4) w = w.slice(0, w.length - 1);   // shave a letter: declension tolerance
    return w.toLowerCase();
}
function activeInText(text, name, cast) {
    // only DIRECT SPEECH counts as "on stage": frequent mentions of a silent observer must
    // not silence him (Rufus was described five times yet never spoke — and his thought
    // bubble was the best line in the scene). Attribution patterns mirror the quote parser.
    const Q_OPEN = '[«"“„]', Q_CLOSE = '[»"”“]', GAP = '[^«»"“”„\\n]';
    const patterns = [];
    for (const alias of aliasNamesOf(name)) {
        const first = String(alias || '').trim().split(/\s+/)[0];
        if (!first || first.length < 2) continue;
        const nm = first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        patterns.push(new RegExp(`${nm}${GAP}{0,28}?${Q_OPEN}`, 'iu'));            // Ciel said: "…"
        patterns.push(new RegExp(`${Q_CLOSE}[\\s,]*[—–-]?${GAP}{0,28}?${nm}`, 'iu')); // "…" — said Ciel
    }
    for (const re of patterns) {
        const m = String(text || '').match(re);
        if (!m) continue;
        // if another cast member's name sits in the same attribution gap, the quote is theirs
        const around = m[0].toLowerCase();
        const foreign = (cast || []).some(o => o.name !== name && probesOf(o.name).some(pr => pr.length >= 3 && around.includes(pr)));
        if (!foreign) return true;
    }
    return false;
}

/* ============================================================
   A bark that repeats (or closely paraphrases) a line ALREADY in the
   message text is noise — the reader just read it. Aqua's "Finally!"
   showing up both in the prose and as her bubble was exactly that.
   ============================================================ */
function normForEcho(x) {
    return String(x || '').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
}
function looksLikeEcho(barkText, mesText) {
    const b = normForEcho(barkText);
    const m = normForEcho(mesText);
    if (b.length < 10 || !m) return false;
    if (m.includes(b.slice(0, 60))) return true;          // verbatim (or near-verbatim start)
    const bt = b.split(' ').filter(w => w.length > 2);
    if (bt.length < 4) return false;
    const mset = new Set(m.split(' '));
    const hit = bt.filter(w => mset.has(w)).length;
    return hit / bt.length > 0.8;                         // almost every word is already in the text
}

/* ============================================================
   SOURCE 2 (one API call): short reactions for the whole cast.
   ============================================================ */
function personaSnippet(name) {
    const st = sceneState();
    const meta = (st.meta && st.meta[name]) || {};
    if (meta.note && meta.note.trim()) return String(meta.note).replace(/\s+/g, ' ').slice(0, 220);   // hand-written wins
    const ch = characters.find(c => c.name === name);
    if (ch && ch.description) return String(ch.description).replace(/\s+/g, ' ').slice(0, 220);
    const dn = diaryNpcs().find(n => n.name.toLowerCase() === name.toLowerCase());   // the Diary knows them
    if (dn) { const pers = diaryPersona(dn); if (pers) return pers; }
    return 'a minor NPC of this story — infer their voice and attitude from the scene itself';
}

// the character's own recent background lines: fed back so the attitude EVOLVES
// instead of the same quip being reinvented every turn
function recentBarksOf(name, uptoId, limit = 3) {
    const chat = getContext().chat || [];
    const out = [];
    for (let i = Math.max(0, uptoId - 12); i < uptoId; i++) {
        const m = chat[i];
        if (!m || !m.extra || !Array.isArray(m.extra.rls_barks)) continue;
        for (const b of m.extra.rls_barks) if (b && b.name === name && b.text) out.push(String(b.text));
    }
    return out.slice(-limit);
}

async function generateBarks(messageId, cast, force = false, activeNames = []) {
    const ctx = getContext();
    const myChat = ctx.chatId;
    const chat = ctx.chat;
    const msg = chat[messageId];
    if (!msg || !cast.length || !apiKey()) return [];

    const st = sceneState();
    // cooldown gates NORMAL barks; whispers are exempt — a murmured aside is cheap flavor,
    // and the double filter (cooldown + on-stage exclusion) used to leave fewer than two
    // free characters, so exchanges never happened even at 100% chance
    const eligible = force ? cast : cast.filter(c => (messageId - (st.lastBark[c.name] ?? -999)) > Math.max(0, settings.cooldown));
    const wantChatterEarly = settings.allowChatter && cast.length >= 2
        && (force || Math.random() * 100 < Math.max(0, Math.min(100, settings.chatterChance)));
    if (!eligible.length && !wantChatterEarly) return [];

    const castLines = cast.map(c => {
        const mem = recentBarksOf(c.name, messageId);
        const memTxt = mem.length ? ` | Their recent background lines (continue this running attitude, do NOT repeat): ${mem.map(x => `"${x.slice(0, 80)}"`).join(' / ')}` : '';
        return `- ${c.name}: ${personaSnippet(c.name)}${memTxt}`;
    }).join('\n');
    const tail = chat.slice(Math.max(0, messageId - 3), messageId + 1)
        .filter(m => !m.is_system)
        .map(m => `${m.name}: ${String(m.mes || '').slice(0, 700)}`)
        .join('\n\n').slice(-2400);

    const kinds = settings.allowThoughts ? '"say" (a quiet spoken remark) or "think" (an inner thought)' : '"say" (a quiet spoken remark)';
    const maxN = Math.max(1, Math.min(4, settings.maxBarks));
    const activeLine = activeNames.length
        ? `\nThese characters are ALREADY speaking or acting in this beat — do NOT write reactions for them (their voice is on screen): ${activeNames.join(', ')}.`
        : '';
    const wantChatter = wantChatterEarly;
    const chatterRule = wantChatter
        ? `\n- ADDITIONALLY: include ONE quiet BACKGROUND EXCHANGE — 2 to 4 whispered lines (kind "whisper") between exactly TWO of the present characters, murmuring to EACH OTHER (about the scene or their own business, not to the speaker). Include it whenever two of them could plausibly murmur — lean toward including it. Each whisper under 12 words.`
        : '';
    const sys = `You are directing ambient BACKGROUND life in a roleplay scene. These characters are present in the room but are NOT speaking in the current beat:
${castLines}${activeLine}

Given the latest scene below, write 0 to ${maxN} very short reactions — like background barks in a video game. Rules:
- Only characters who would NATURALLY react right now. Silence is a valid answer (empty list).
- At most ONE reaction PER character — never two lines from the same person.
- PREFER spoken remarks ("say"); use "think" only when the character would certainly keep it inside.
- Reactions do NOT have to focus on the player: a character may mutter about their own business, the room, or another character entirely.
- CONSISTENCY IS LAW: a reaction must fit the facts of the scene text. Never make a character comment on something that did not happen (e.g. scolding someone for talking when that someone stayed silent).
- NEVER repeat or paraphrase a line that is already IN the scene text — react to it, add to it, but do not echo it.
- Let each character's attitude EVOLVE from their own recent lines — a small arc, never the same quip twice.
- Ground each line in a CONCRETE detail of the scene — an object, a gesture, a spoken word — not a generic quip.
- Each reaction: max 18 words, sharply in that character's voice, kind ${kinds}.${chatterRule}
- No narration inside "text", no asterisks, no addressing the reader. React to what JUST happened.${settings.allowActions ? '\n- Optionally add "action": a tiny physical beat accompanying the line (max 7 words, no asterisks), e.g. adjusting glasses, glancing at the door.' : ''}
- Language of every "text"${settings.allowActions ? ' and "action"' : ''}: ${genLang()}.
Output strictly JSON: {"barks":[{"name":"","kind":"say","text":""${settings.allowActions ? ',"action":""' : ''}}]}`;

    try {
        const res = await callAI(sys, `SCENE (latest last):\n${tail}`);
        if (getContext().chatId !== myChat) return [];   // chat changed while the model was thinking
        const mesText = (chat[messageId] && chat[messageId].mes) || '';
        const raw = (Array.isArray(res && res.barks) ? res.barks : [])
            .filter(b => !(b && looksLikeEcho(b.text, mesText)));   // echoes of the prose are noise
        const eligNames = new Set(eligible.map(c => c.name.toLowerCase()));
        const castNames = new Set(cast.map(c => c.name.toLowerCase()));
        const used = new Set();       // one NORMAL bark per character ("two Ciels" bug)
        const whisperers = new Set(); // a whisper exchange is between exactly two voices
        const out = [];
        let normals = 0, whispers = 0;
        for (const b of raw) {
            if (!b) continue;
            const isWhisper = b.kind === 'whisper' && wantChatter;
            const pool = isWhisper ? cast : eligible;   // whispers bypass the cooldown pool
            const who = pool.find(c => c.name.toLowerCase() === String(b.name || '').toLowerCase());
            const text = cleanBark(b.text, 160);
            if (!who || !text || !(isWhisper ? castNames : eligNames).has(who.name.toLowerCase())) continue;
            if (isWhisper) {
                if (whispers >= 4) continue;
                if (!whisperers.has(who.name) && whisperers.size >= 2) continue;   // третий голос — мимо
                whisperers.add(who.name);
                out.push({ name: who.name, kind: 'whisper', text, action: settings.allowActions ? cleanBark(b.action, 60) : null, parsed: false });
                st.lastBark[who.name] = messageId;
                whispers++;
            } else {
                if (normals >= maxN || used.has(who.name)) continue;
                used.add(who.name);
                const kind = (b.kind === 'think' && settings.allowThoughts) ? 'think' : 'say';
                out.push({ name: who.name, kind, text, action: settings.allowActions ? cleanBark(b.action, 60) : null, parsed: false });
                st.lastBark[who.name] = messageId;
                normals++;
            }
        }
        return out;
    } catch (e) {
        console.error('[Living Scene] bark generation error:', e);
        if (force) toastr.warning(t('gen_fail'));
        return [];
    }
}

/* ============================================================
   PIPELINE per bot message
   ============================================================ */
async function processMessage(messageId, force = false) {
    if (!settings.enabled) return;
    const ctx = getContext();
    const myChat = ctx.chatId;
    const msg = ctx.chat[messageId];
    if (!msg || msg.is_system) return;
    if (msg.is_user && !force && !settings.reactToUser) return;   // the room may react to YOU too

    // swipes/regens re-fire events — bark exactly once per message variant
    const swipeId = msg.swipe_id ?? 0;
    // regen re-fires with the same swipe id: nothing to generate, but the wand must be
    // re-anchored to the rebuilt message element — this was the "wand disappears" bug
    if (!force && msg.rpg_rls_done === swipeId) { renderBarks(messageId); return; }
    msg.rpg_rls_done = swipeId;

    const cast = presentCast(msg.name);
    if (!cast.length) {
        renderBarks(messageId);                     // wand stays even when the room is empty
        if (force) toastr.info(t('gen_nocast'));
        return;
    }
    if (force && !apiKey()) { renderBarks(messageId); toastr.warning(t('gen_nokey')); return; }

    let barks = [];

    // 2) paid: AI ambient reactions (chance-gated; the manual button skips the dice).
    // Characters actively speaking/acting IN THE TEXT are excluded — in narrator-style
    // play the card's "speaker" and the scene's real talker are different people,
    // and the talker getting an ambient quip about himself looked absurd
    const textActive = cast.filter(c => activeInText(msg.mes || '', c.name, cast)).map(c => c.name);
    const chancePct = msg.is_user ? settings.userBarkChance : settings.barkChance;
    const roll = Math.random() * 100 < Math.max(0, Math.min(100, chancePct));
    if (force || (roll && barks.length < settings.maxBarks)) {
        const already = new Set(barks.map(b => b.name));
        const rest = cast.filter(c => !already.has(c.name) && !textActive.includes(c.name));
        if (rest.length) {
            const ai = await generateBarks(messageId, rest, force, textActive.concat(msg.name));
            if (getContext().chatId !== myChat) return;
            barks = barks.concat(ai);
        } else if (force && !barks.length) {
            renderBarks(messageId);
            toastr.info(t('gen_quiet'));   // everyone present is already on stage this beat
            return;
        }
    }

    if (!barks.length) {
        renderBarks(messageId);                     // chance-roll failed / model stayed silent:
        if (force) toastr.info(t('gen_quiet'));     // the wand still belongs on the newest message
        return;
    }

    if (!msg.extra) msg.extra = {};
    const existing = (force && Array.isArray(msg.extra.rls_barks) && msg.extra.rls_swipe === swipeId) ? msg.extra.rls_barks : [];
    // one voice per character per beat: whisper participants keep ONLY the exchange
    // (it needs both voices), so their separate normal bark is dropped — Aqua no longer
    // exclaims on the left while bickering on the right
    const all = existing.concat(barks);
    const whisperNames = new Set(all.filter(b => b.kind === 'whisper').map(b => String(b.name || '').toLowerCase()));
    const seen = new Set();
    let whispers = 0;
    msg.extra.rls_barks = all.filter(b => {
        const k = String(b.name || '').toLowerCase();
        if (b.kind === 'whisper') return ++whispers <= 4;
        if (whisperNames.has(k)) return false;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    }).slice(0, 8);
    msg.extra.rls_swipe = swipeId;   // barks belong to THIS swipe, never to a swiped-away text
    saveScene();
    renderBarks(messageId);
    updateInjection();
}

/* ============================================================
   MAIN-PROMPT INJECTION
   Without this, replying to a bubble confused the main model —
   it never knew Ciel had muttered anything. The last few
   messages' scene lines are handed to it as quiet context.
   ============================================================ */
function updateInjection() {
    if (!settings.enabled || !settings.injectBarks) {
        setExtensionPrompt(PROMPT_KEY, '', 0, 0, false);
        return;
    }
    const chat = getContext().chat || [];
    const lines = [];
    for (let i = Math.max(0, chat.length - 3); i < chat.length; i++) {
        const m = chat[i];
        if (!m || !m.extra || !Array.isArray(m.extra.rls_barks)) continue;
        if ((m.extra.rls_swipe ?? 0) !== (m.swipe_id ?? 0)) continue;   // barks of a swiped-away variant
        for (const b of m.extra.rls_barks) {
            if (!b || !b.name || !b.text) continue;
            const tag = b.kind === 'think' ? ' (inner thought, unheard)' : b.kind === 'whisper' ? ' (whispering aside)' : '';
            const act = b.action ? `*${String(b.action).slice(0, 60)}* ` : '';
            lines.push(`${b.name}${tag}: ${act}"${String(b.text).slice(0, 160)}"`);
        }
    }
    if (!lines.length) { setExtensionPrompt(PROMPT_KEY, '', 0, 0, false); return; }
    const txt = `\n[Background scene moments that also happened (keep them canon; characters may be addressed about them):\n${lines.slice(-8).join('\n')}]\n`;
    setExtensionPrompt(PROMPT_KEY, txt, 2, Math.max(0, settings.injectDepth || 0), false, extension_prompt_roles.SYSTEM);
}

/* ============================================================
   RENDER — FLOATING glassy bubbles hovering on the SIDES of the
   chat, anchored to their message (like the thought bubbles).
   Left/right alternation makes the scene feel alive around the text.
   ============================================================ */
let rlsLayer = null;
const rlsBubbles = new Map();   // `${messageId}::${idx}` -> { bubble, messageElement, idx, stir }

function avatarHtml(name) {
    const ch = characters.find(c => c.name === name);
    if (ch && ch.avatar) return `<img class="rls-ava" src="/characters/${escapeHtml(ch.avatar)}" draggable="false">`;
    const initials = escapeHtml(String(name).trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase());
    let hue = 0; for (const c of name) hue = (hue * 31 + c.charCodeAt(0)) % 360;
    return `<span class="rls-ava rls-ava-npc" style="background:hsl(${hue},45%,38%)">${initials}</span>`;
}

function initLayer() {
    rlsLayer = document.getElementById('rls-layer');
    if (!rlsLayer) {
        rlsLayer = document.createElement('div');
        rlsLayer.id = 'rls-layer';
        document.body.appendChild(rlsLayer);
    }
}
function clearAllBubbles() {
    for (const [, d] of rlsBubbles.entries()) d.bubble.remove();
    rlsBubbles.clear();
}
function removeBubblesFor(messageId) {
    for (const [key, d] of rlsBubbles.entries()) {
        if (key.startsWith(messageId + '::')) { d.bubble.remove(); rlsBubbles.delete(key); }
    }
}

function placeX(d, rect) {
    const b = d.bubble;
    const W = b.offsetWidth || 235;
    let tight = false;
    if (d.side === 'left') {
        // anchored by the RIGHT edge so collapse/expand doesn't make it jump
        const anchor = rect.left - 16;
        if (anchor - W < 4) {
            b.style.left = (rect.left + 8) + 'px'; b.style.right = 'auto'; tight = true;
        } else {
            b.style.right = Math.round(window.innerWidth - anchor) + 'px'; b.style.left = 'auto';
        }
    } else {
        let x = rect.right + 16;
        if (x + W > window.innerWidth - 4) { x = Math.max(4, rect.right - W - 8); tight = true; }
        if (d.wIndent && !tight) x -= 14;   // the second whisperer leans in
        b.style.left = Math.round(x) + 'px'; b.style.right = 'auto';
    }
    b.classList.toggle('tight', tight);
}

function placeStir(d, rect) {
    const b = d.bubble;
    let x = rect.left - 42;
    if (x < 4) x = rect.left + 8;
    const y = Math.min(Math.max(0, rect.bottom - 34), window.innerHeight - 96);
    b.style.left = x + 'px';
    b.style.top = y + 'px';
}

function syncBubbles() {
    if (!settings.enabled) return;
    // group bubbles per message and stack them by their REAL heights: the old fixed
    // steps (84/52px) made tall two-line bubbles overlap the next one in the column
    const byMsg = new Map();
    for (const [key, d] of rlsBubbles.entries()) {
        if (!document.body.contains(d.messageElement)) { d.bubble.remove(); rlsBubbles.delete(key); continue; }
        const mid = key.split('::')[0];
        if (!byMsg.has(mid)) byMsg.set(mid, []);
        byMsg.get(mid).push(d);
    }
    for (const [, list] of byMsg.entries()) {
        const rect = list[0].messageElement.getBoundingClientRect();
        const off = rect.bottom < -40 || rect.top > window.innerHeight + 40;
        let yL = rect.top + Math.max(0, settings.offsetLeft);
        let yR = rect.top + Math.max(0, settings.offsetRight);
        list.sort((a, b) => ((a.stir ? 1 : 0) - (b.stir ? 1 : 0)) || (a.idx - b.idx));
        for (const d of list) {
            const b = d.bubble;
            b.style.opacity = off ? '0' : '1';
            b.style.pointerEvents = off ? 'none' : 'auto';
            if (off) continue;
            if (d.stir) { placeStir(d, rect); continue; }
            placeX(d, rect);
            const h = b.offsetHeight || 40;
            const gap = b.classList.contains('whisper') ? 6 : 10;
            if (d.side === 'left') { b.style.top = Math.round(yL) + 'px'; yL += h + gap; }
            else { b.style.top = Math.round(yR) + 'px'; yR += h + gap; }
        }
    }
}

// heights animate for ~0.22s on collapse/expand — settle the stack again after that
function syncSoon() { syncBubbles(); setTimeout(syncBubbles, 260); }

function renderBarks(messageId, startCollapsed = false) {
    initLayer();
    removeBubblesFor(messageId);
    if (!settings.enabled) return;

    const mesEl = document.querySelector(`.mes[mesid="${messageId}"]`);
    if (!mesEl) return;   // player messages carry bubbles too now

    const ctx = getContext();
    const msg = ctx.chat[messageId];
    const barks = (msg && msg.extra && Array.isArray(msg.extra.rls_barks) && (msg.extra.rls_swipe ?? 0) === (msg.swipe_id ?? 0))
        ? msg.extra.rls_barks : [];

    // layout pass: normals alternate left/right in 84px rows; whispers stack in a tight
    // column on the right below them — a hushed side-conversation
    // sides only: vertical stacking is measured live in syncBubbles by real heights
    let nNormal = 0;
    let firstWhisperer = null;
    const layout = barks.map(b => {
        if (b.kind === 'whisper') {
            if (firstWhisperer === null) firstWhisperer = b.name;
            return { side: 'right', wIndent: b.name !== firstWhisperer };
        }
        const side = nNormal % 2 === 0 ? 'left' : 'right';
        nNormal++;
        return { side, wIndent: false };
    });

    barks.forEach((b, i) => {
        const think = b.kind === 'think';
        const whisper = b.kind === 'whisper';
        const side = layout[i].side;
        const chip = document.createElement('div');
        chip.className = `rls-chip ${side} ${think ? 'think' : ''} ${whisper ? 'whisper' : ''} ${startCollapsed ? 'collapsed' : ''}`;
        chip.innerHTML = `
            <div class="rls-mini">${avatarHtml(b.name)}${think ? '<span class="rls-mini-th">💭</span>' : ''}</div>
            <div class="rls-full">
                <div class="rls-head">
                    ${avatarHtml(b.name)}
                    <span class="rls-name">${escapeHtml(b.name)}${think ? ' 💭' : ''}${whisper ? ' 🗨' : ''}</span>
                    <span class="rls-acts">
                        <i class="fa-solid fa-comment rls-reply" title="${escapeHtml(t('bark_reply_title', { name: b.name }))}"></i>
                        <i class="fa-solid fa-rotate rls-regen" title="${escapeHtml(t('bark_regen_title'))}"></i>
                        <i class="fa-solid fa-xmark rls-del" title="${escapeHtml(t('bark_del_title'))}"></i>
                    </span>
                </div>
                ${b.action ? `<div class="rls-action">*${escapeHtml(b.action)}*</div>` : ''}
                <div class="rls-text">${think ? '<i>' : ''}${miniMd(b.text)}${think ? '</i>' : ''}</div>
                <div class="rls-ask">
                    <input type="text" class="rls-ask-in" placeholder="${escapeHtml(t('ask_ph', { name: b.name }))}" maxlength="300">
                    <i class="fa-solid fa-paper-plane rls-ask-send"></i>
                </div>
            </div>`;
        chip.style.animationDelay = `0s, ${(Math.random() * 2.4).toFixed(2)}s`;   // desync the bobbing
        rlsLayer.appendChild(chip);
        const isNpc = !characters.some(c => c.name === b.name);
        // 💬 opens a tiny reply box right in the bubble: you speak, THEIR card answers
        chip.querySelector('.rls-reply').addEventListener('click', (e) => {
            e.stopPropagation();
            chip.classList.remove('collapsed');
            chip.classList.toggle('asking');
            if (chip.classList.contains('asking')) chip.querySelector('.rls-ask-in').focus();
            syncSoon();
        });
        const askIn = chip.querySelector('.rls-ask-in');
        askIn.addEventListener('click', (e) => e.stopPropagation());
        askIn.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') { askCharacter(b, isNpc, askIn.value); askIn.value = ''; chip.classList.remove('asking'); syncSoon(); }
        });
        chip.querySelector('.rls-regen').addEventListener('click', (e) => {
            e.stopPropagation();
            regenOneBark(messageId, i);
        });
        chip.querySelector('.rls-ask-send').addEventListener('click', (e) => {
            e.stopPropagation();
            askCharacter(b, isNpc, askIn.value);
            askIn.value = '';
            chip.classList.remove('asking');
            syncSoon();
        });
        chip.querySelector('.rls-del').addEventListener('click', (e) => {
            e.stopPropagation();
            const m = getContext().chat[messageId];
            if (m && m.extra && Array.isArray(m.extra.rls_barks)) {
                m.extra.rls_barks.splice(i, 1);
                saveScene();
                renderBarks(messageId);
                updateInjection();   // a dismissed line leaves the prompt too
            }
        });
        chip.addEventListener('click', (e) => {
            if (e.target.closest('.rls-acts')) return;
            chip.classList.toggle('collapsed');
            syncSoon();
        });
        const d = { bubble: chip, messageElement: mesEl, idx: i, stir: false, side: layout[i].side, wIndent: layout[i].wIndent };
        rlsBubbles.set(`${messageId}::${i}`, d);
    });

    // the "stir the scene" wand floats only on the newest message
    if ((ctx.chat.length - 1) === messageId) {
        const wand = document.createElement('div');
        wand.className = 'rls-stir-float';
        wand.title = t('bark_more_title');
        wand.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i>';
        wand.addEventListener('click', () => {
            wand.classList.add('busy');   // renderBarks() at the end rebuilds the wand fresh
            processMessage(messageId, true);
        });
        rlsLayer.appendChild(wand);
        const d = { bubble: wand, messageElement: mesEl, idx: barks.length, stir: true };
        rlsBubbles.set(`${messageId}::stir`, d);
    }
    syncBubbles();   // one layout pass with real heights
}

// your line goes to the main chat, then the character's own card answers it:
// /send <text> | /trigger "<name>". An NPC has no card — the main model voices them.
function askCharacter(bark, isNpc, text) {
    const name = typeof bark === 'string' ? bark : bark.name;
    const clean = String(text || '').trim().replace(/\|/g, '¦').replace(/\s*\n+\s*/g, ' ');
    if (!clean) return;
    // quote what they said, so the chat history shows WHAT you are answering —
    // thoughts are unheard and are never quoted aloud
    let quote = '';
    if (settings.quoteReply && typeof bark === 'object' && bark.text && bark.kind !== 'think') {
        const qt = String(bark.text).slice(0, 160).replace(/\|/g, '¦');
        quote = settings.language === 'ru'
            ? `(${name}${bark.kind === 'whisper' ? ', шёпотом' : ''}: «${qt}») `
            : `(${name}${bark.kind === 'whisper' ? ', whispering' : ''}: "${qt}") `;
    }
    const ctx = getContext();
    const exec = (typeof ctx.executeSlashCommands === 'function') ? ctx.executeSlashCommands.bind(ctx)
        : (typeof ctx.executeSlashCommandsWithOptions === 'function') ? ctx.executeSlashCommandsWithOptions.bind(ctx) : null;
    const ta = $('#send_textarea');
    if (isNpc) {
        const line = (settings.language === 'ru' ? `*обращаясь к ${name}* ` : `*turning to ${name}* `) + clean;
        if (exec) {
            try { exec(`/send ${quote}${line} | /trigger`); toastr.info(t('ask_npc_hint', { name })); return; } catch (e) { }
        }
        ta.val((ta.val() ? ta.val() + ' ' : '') + quote + line).trigger('input'); ta.focus();
        toastr.info(t('ask_npc_hint', { name }));
        return;
    }
    if (exec) {
        try { exec(`/send ${quote}${clean} | /trigger "${name}"`); return; } catch (e) { console.error('[Living Scene] ask error:', e); }
    }
    ta.val((ta.val() ? ta.val() + ' ' : '') + quote + clean).trigger('input'); ta.focus();
    toastr.info(t('trigger_hint'));
}

function triggerReply(name, isNpc) {
    const ta = $('#send_textarea');
    if (isNpc) {
        const cur = ta.val();
        const line = settings.language === 'ru' ? `*обращаясь к ${name}* ` : `*turning to ${name}* `;
        ta.val((cur ? cur + ' ' : '') + line).trigger('input');
        ta.focus();
        toastr.info(t('npc_reply_hint'));
        return;
    }
    const ctx = getContext();
    const cmd = `/trigger ${name}`;
    try {
        if (typeof ctx.executeSlashCommands === 'function') { ctx.executeSlashCommands(cmd); return; }
        if (typeof ctx.executeSlashCommandsWithOptions === 'function') { ctx.executeSlashCommandsWithOptions(cmd); return; }
    } catch (e) { console.error('[Living Scene] trigger error:', e); }
    ta.val(cmd).trigger('input');
    ta.focus();
    toastr.info(t('trigger_hint'));
}

// reroll a single bubble: same character, same kind, a DIFFERENT line
async function regenOneBark(messageId, i) {
    const ctx = getContext();
    const myChat = ctx.chatId;
    const msg = ctx.chat[messageId];
    const b = msg && msg.extra && Array.isArray(msg.extra.rls_barks) ? msg.extra.rls_barks[i] : null;
    if (!b) return;
    if (!apiKey()) { toastr.warning(t('gen_nokey')); return; }
    const d = rlsBubbles.get(`${messageId}::${i}`);
    if (d) d.bubble.classList.add('rls-busy');   // the 🔄 spins while the model thinks

    const tail = ctx.chat.slice(Math.max(0, messageId - 3), messageId + 1)
        .filter(m => !m.is_system)
        .map(m => `${m.name}: ${String(m.mes || '').slice(0, 700)}`)
        .join('\n\n').slice(-2400);
    const kindTxt = b.kind === 'whisper'
        ? 'a whispered aside to another present character (kind "whisper")'
        : settings.allowThoughts
            ? 'a quiet spoken remark (kind "say") or an inner thought (kind "think")'
            : 'a quiet spoken remark (kind "say")';
    const sys = `You write ONE short ambient background reaction for the character "${b.name}" (${personaSnippet(b.name)}), who is present in the scene but not the current speaker.
Rules:
- Exactly ONE line, max 18 words, sharply in their voice, as ${kindTxt}.
- CONSISTENT with the scene facts; grounded in a concrete detail (an object, a gesture, a spoken word).
- It MUST be clearly DIFFERENT from their previous line: "${String(b.text).slice(0, 160)}".
- No narration, no asterisks. Language: ${genLang()}.
Output strictly JSON: {"kind":"say","text":""}`;
    try {
        const res = await callAI(sys, `SCENE (latest last):\n${tail}`);
        if (getContext().chatId !== myChat) return;   // chat changed while rerolling
        const text = cleanBark(res && res.text, 160);
        const m2 = getContext().chat[messageId];
        if (!m2 || !m2.extra || !Array.isArray(m2.extra.rls_barks) || !m2.extra.rls_barks[i]) return;
        if (!text) { toastr.info(t('gen_quiet')); renderBarks(messageId); return; }
        const kind = b.kind === 'whisper' ? 'whisper'
            : ((res && res.kind === 'think' && settings.allowThoughts) ? 'think' : 'say');
        m2.extra.rls_barks[i] = { name: b.name, kind, text, parsed: false };
        saveScene();
        renderBarks(messageId);
        updateInjection();
    } catch (e) {
        console.error('[Living Scene] reroll error:', e);
        toastr.warning(t('gen_fail'));
        renderBarks(messageId);
    }
}

function restoreOnLoad() {
    if (!settings.enabled) return;
    const chat = getContext().chat || [];
    chat.forEach((m, idx) => {
        if (m && m.extra && Array.isArray(m.extra.rls_barks) && m.extra.rls_barks.length) {
            renderBarks(idx, true);   // history restores COLLAPSED — little avatars, no clutter
        } else if (idx === chat.length - 1) {
            renderBarks(idx);          // still place the wand on the newest message
        }
    });
    updateInjection();
}

/* ============================================================
   ROSTER PANEL (who is in the scene) — glassy, suite-styled
   ============================================================ */
function isChatOpen() {
    const c = getContext();
    if (!c) return false;
    if (selected_group) return true;
    return c.characterId !== undefined && c.characterId !== null && !!characters[c.characterId];
}

function renderRosterButton() {
    let container = $('#rpg-buttons-container');
    if (container.length === 0) {
        container = $('<div id="rpg-buttons-container" style="position:fixed; bottom:20px; right:20px; display:flex; gap:15px; z-index:3000;"></div>');
        $('body').append(container);
    }
    let btn = $('#rls-btn');
    if (btn.length === 0) {
        btn = $(`<div class="rpg-floating-btn" id="rls-btn" title="${escapeHtml(t('btn_title'))}" style="position:static; margin:0;"><i class="fa-solid fa-masks-theater"></i></div>`);
        container.prepend(btn);
    }
    if (!settings.enabled || !isChatOpen()) { btn.hide(); $('#rls-roster').removeClass('visible'); return; }
    btn.show();

    if ($('#rls-roster').length === 0) $('body').append(`<div id="rls-roster"><div id="rls-roster-body"></div></div>`);
    btn.off('click').on('click', () => { renderRoster(); $('#rls-roster').toggleClass('visible'); });
    $(document).off('click.rlsRoster').on('click.rlsRoster', (e) => {
        // a toggle click re-renders the roster and DETACHES the clicked node before the
        // event reaches document — closest() then failed and the panel slammed shut
        if (!document.body.contains(e.target)) return;
        if (!e.target.closest('#rls-roster') && !e.target.closest('#rls-btn')) $('#rls-roster').removeClass('visible');
    });
}

function renderRoster() {
    const body = $('#rls-roster-body');
    if (!body.length) return;
    const st = sceneState();
    const members = groupMembers();
    const rowHtml = (name, isNpc) => {
        const on = isPresent(name);
        const isAuto = st.present[name] === undefined && settings.autoPresence;   // picked by the scene, not by hand
        const meta = (st.meta && st.meta[name]) || {};
        return `<div class="rls-row">
            ${avatarHtml(name)}
            <span class="rls-row-name">${escapeHtml(name)}</span>
            ${isAuto ? `<span class="rls-auto">${t('roster_auto')}</span>` : ''}
            <i class="fa-solid fa-pen rls-meta-edit" data-name="${escapeHtml(name)}" title="${escapeHtml(t('roster_edit_title'))}"></i>
            ${isNpc ? `<i class="fa-solid fa-trash rls-npc-del" data-name="${escapeHtml(name)}"></i>` : ''}
            <div class="rls-toggle ${on ? 'on' : ''}" data-name="${escapeHtml(name)}" data-npc="${isNpc ? 1 : 0}"><div class="rls-knob"></div></div>
        </div>
        <div class="rls-meta-editor" data-for="${escapeHtml(name)}" style="display:none;">
            <input type="text" class="text_pole rls-meta-alias" placeholder="${escapeHtml(t('meta_aliases_ph'))}" value="${escapeHtml(meta.aliases || '')}">
            <input type="text" class="text_pole rls-meta-note" placeholder="${escapeHtml(t('meta_note_ph'))}" value="${escapeHtml(meta.note || '')}">
            <button class="menu_button rls-meta-save" data-name="${escapeHtml(name)}">${t('meta_save')}</button>
        </div>`;
    };
    let html = `<div class="rls-roster-title"><i class="fa-solid fa-masks-theater"></i> ${t('roster_title')}</div>
        <div class="rls-roster-hint">${t('roster_hint')}</div>`;
    if (members.length) {
        html += `<div class="rls-roster-sec">${t('roster_members')}</div>` + members.map(m => rowHtml(m.name, false)).join('');
    } else {
        html += `<div class="rls-roster-hint">${t('no_group')}</div>`;
    }
    html += `<div class="rls-roster-sec">${t('roster_npcs')}</div>`;
    html += st.npcs.map(n => rowHtml(n.name, true)).join('');
    // NPCs the Diary already knows — one click to seat them at the scene permanently
    const dnpcs = diaryNpcs().filter(n => !st.npcs.some(x => x.name === n.name) && !members.some(m => m.name === n.name));
    html += `<div class="rls-roster-sec">${t('roster_diary')}</div>`;
    if (dnpcs.length) {
        html += dnpcs.map(n => `<div class="rls-row">
            ${avatarHtml(n.name)}
            <span class="rls-row-name" title="${escapeHtml(diaryPersona(n))}">${escapeHtml(n.name)}</span>
            <i class="fa-solid fa-plus rls-diary-add" data-name="${escapeHtml(n.name)}" title="${escapeHtml(t('roster_diary_add'))}"></i>
        </div>`).join('');
    } else {
        html += `<div class="rls-roster-hint">${t('roster_diary_none')}</div>`;
    }
    html += `<div class="rls-npc-add-row">
        <input type="text" id="rls-npc-name" class="text_pole" placeholder="${escapeHtml(t('roster_npc_ph'))}">
        <button id="rls-npc-add" class="menu_button">${t('roster_npc_add')}</button>
    </div>`;
    body.html(html);

    body.find('.rls-toggle').on('click', function () {
        const nm = $(this).data('name');
        const st2 = sceneState();
        st2.present[nm] = !isPresent(nm);
        saveScene();
        renderRoster();
    });
    body.find('.rls-meta-edit').on('click', function () {
        const nm = $(this).data('name');
        body.find(`.rls-meta-editor[data-for="${CSS.escape(String(nm))}"]`).slideToggle(120);
    });
    body.find('.rls-meta-save').on('click', function () {
        const nm = $(this).data('name');
        const ed = body.find(`.rls-meta-editor[data-for="${CSS.escape(String(nm))}"]`);
        const st2 = sceneState();
        st2.meta[nm] = {
            aliases: String(ed.find('.rls-meta-alias').val() || '').slice(0, 120),
            note: String(ed.find('.rls-meta-note').val() || '').slice(0, 300)
        };
        saveScene();
        renderRoster();
    });
    body.find('.rls-diary-add').on('click', function () {
        const nm = $(this).data('name');
        const st2 = sceneState();
        if (!st2.npcs.some(n => n.name === nm)) {
            st2.npcs.push({ name: nm });
            st2.present[nm] = true;
            saveScene();
        }
        renderRoster();
    });
    body.find('.rls-npc-del').on('click', function () {
        const nm = $(this).data('name');
        const st2 = sceneState();
        st2.npcs = st2.npcs.filter(n => n.name !== nm);
        delete st2.present[nm];
        saveScene();
        renderRoster();
    });
    body.find('#rls-npc-add').on('click', () => {
        const nm = String($('#rls-npc-name').val() || '').trim().slice(0, 40);
        if (!nm) return;
        const st2 = sceneState();
        if (!st2.npcs.some(n => n.name === nm) && !members.some(m => m.name === nm)) {
            st2.npcs.push({ name: nm });
            st2.present[nm] = true;   // an NPC added by hand is obviously in the scene
            saveScene();
        }
        renderRoster();
    });
}

/* ============================================================
   SETTINGS DRAWER
   ============================================================ */
function settingsHtml() { return `
<div class="extension_settings rls-settings">
    <div class="inline-drawer">
        <div class="rls-drawer-toggle inline-drawer-header" style="cursor:pointer;">
            <b><i class="fa-solid fa-masks-theater"></i> ${t('set_header')}</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content" id="rls-drawer" style="display:none; padding-top:10px;">
            <label class="checkbox_label"><input type="checkbox" id="rls-enabled"> ${t('set_enable')}</label>
            <div class="flex-container alignitemscenter flexgap5 margin-b-10" style="margin-top:8px;">
                <label>${t('set_lang')}</label>
                <select id="rls-lang" class="text_pole" style="width:auto;">
                    <option value="en">English</option><option value="ru">Русский</option>
                </select>
            </div>
            <hr class="sysHR">
            <h4>🔌 ${t('set_api')}</h4>
            <input type="text" id="rls-base" class="text_pole margin-b-10" placeholder="${t('set_url')}" style="width:100%;">
            <input type="password" id="rls-key" class="text_pole margin-b-10" placeholder="${t('set_key')}" style="width:100%;">
            <input type="text" id="rls-model" class="text_pole margin-b-10" placeholder="${t('set_model')}" style="width:100%;">
            <div class="flex-container alignitemscenter flexgap5 margin-b-10">
                <label>${t('set_temp')}</label>
                <input type="number" step="0.1" id="rls-temp" class="text_pole" min="0" max="2" style="width:60px;">
            </div>
            <div class="rls-calls-line">${t('set_calls')} <b id="rls-calls-n">0</b></div>
            <hr class="sysHR">
            <h4>⚙️ ${t('set_logic')}</h4>
            <div class="flex-container alignitemscenter flexgap5 margin-b-10">
                <label>${t('set_chance')}</label>
                <input type="number" id="rls-chance" class="text_pole" min="0" max="100" style="width:60px;">
            </div>
            <div class="flex-container alignitemscenter flexgap5 margin-b-10">
                <label>${t('set_max')}</label>
                <input type="number" id="rls-max" class="text_pole" min="1" max="4" style="width:50px;">
            </div>
            <div class="flex-container alignitemscenter flexgap5 margin-b-10">
                <label>${t('set_cooldown')}</label>
                <input type="number" id="rls-cd" class="text_pole" min="0" max="20" style="width:50px;">
            </div>
            <label class="checkbox_label"><input type="checkbox" id="rls-react-user"> ${t('set_react_user')}</label>
            <div class="flex-container alignitemscenter flexgap5 margin-b-10" style="padding-left:20px;">
                <label>${t('set_react_user_chance')}</label>
                <input type="number" id="rls-user-chance" class="text_pole" min="0" max="100" style="width:60px;">
            </div>
            <label class="checkbox_label"><input type="checkbox" id="rls-thoughts"> ${t('set_thoughts')}</label>
            <label class="checkbox_label"><input type="checkbox" id="rls-chatter"> ${t('set_chatter')}</label>
            <div class="flex-container alignitemscenter flexgap5 margin-b-10" style="padding-left:20px;">
                <label>${t('set_chatter_chance')}</label>
                <input type="number" id="rls-chatter-chance" class="text_pole" min="0" max="100" style="width:60px;">
            </div>
            <label class="checkbox_label"><input type="checkbox" id="rls-inject"> ${t('set_inject')}</label>
            <div class="flex-container alignitemscenter flexgap5 margin-b-10" style="padding-left:20px;">
                <label>${t('set_inject_depth')}</label>
                <input type="number" id="rls-inject-depth" class="text_pole" min="0" max="20" style="width:50px;">
            </div>
            <label class="checkbox_label"><input type="checkbox" id="rls-quote"> ${t('set_quote_reply')}</label>
            <label class="checkbox_label"><input type="checkbox" id="rls-actions"> ${t('set_actions')}</label>
            <label class="checkbox_label"><input type="checkbox" id="rls-autonpc"> ${t('set_autonpc')}</label>
            <div class="flex-container alignitemscenter flexgap5 margin-b-10">
                <label>${t('set_off_left')}</label>
                <input type="number" id="rls-off-left" class="text_pole" min="0" max="800" style="width:65px;">
            </div>
            <div class="flex-container alignitemscenter flexgap5 margin-b-10">
                <label>${t('set_off_right')}</label>
                <input type="number" id="rls-off-right" class="text_pole" min="0" max="800" style="width:65px;">
            </div>
            <label class="checkbox_label"><input type="checkbox" id="rls-auto"> ${t('set_auto')}</label>
        </div>
    </div>
</div>`; }

function setupUI() {
    $('.rls-settings').remove();
    $('#extensions_settings').append(settingsHtml());
    $('.rls-settings .rls-drawer-toggle').on('click', function () {
        $('#rls-drawer').slideToggle();
        $(this).find('.inline-drawer-icon').toggleClass('down up');
    });
    $('#rls-enabled').prop('checked', settings.enabled).on('change', function () {
        settings.enabled = this.checked; saveSettings();
        renderRosterButton();
        if (this.checked) restoreOnLoad();
        else { clearAllBubbles(); updateInjection(); }
    });
    $('#rls-lang').val(settings.language || 'en').on('change', function () {
        settings.language = $(this).val(); saveSettings();
        setupUI();
        $('#rls-drawer').show();
        $('.rls-settings .inline-drawer-icon').removeClass('down').addClass('up');
        renderRosterButton();
    });
    $('#rls-base').val(settings.baseUrl).on('change', function () { settings.baseUrl = $(this).val().trim(); saveSettings(); });
    $('#rls-key').val(settings.apiKey).on('change', function () { settings.apiKey = $(this).val().trim(); saveSettings(); });
    $('#rls-model').val(settings.model).on('change', function () { settings.model = $(this).val().trim(); saveSettings(); });
    $('#rls-temp').val(settings.temperature).on('change', function () { const v = parseFloat($(this).val()); settings.temperature = isFinite(v) ? Math.max(0, Math.min(2, v)) : 0.9; $(this).val(settings.temperature); saveSettings(); });
    $('#rls-chance').val(settings.barkChance).on('change', function () { settings.barkChance = Math.max(0, Math.min(100, parseInt($(this).val()) || 0)); $(this).val(settings.barkChance); saveSettings(); });
    $('#rls-max').val(settings.maxBarks).on('change', function () { settings.maxBarks = Math.max(1, Math.min(4, parseInt($(this).val()) || 2)); $(this).val(settings.maxBarks); saveSettings(); });
    $('#rls-cd').val(settings.cooldown).on('change', function () { settings.cooldown = Math.max(0, parseInt($(this).val()) || 0); $(this).val(settings.cooldown); saveSettings(); });
    $('#rls-calls-n').text(apiCallCount);
    $('#rls-react-user').prop('checked', settings.reactToUser).on('change', function () { settings.reactToUser = this.checked; saveSettings(); });
    $('#rls-user-chance').val(settings.userBarkChance).on('change', function () { settings.userBarkChance = Math.max(0, Math.min(100, parseInt($(this).val()) || 0)); $(this).val(settings.userBarkChance); saveSettings(); });
    $('#rls-thoughts').prop('checked', settings.allowThoughts).on('change', function () { settings.allowThoughts = this.checked; saveSettings(); });
    $('#rls-chatter').prop('checked', settings.allowChatter).on('change', function () { settings.allowChatter = this.checked; saveSettings(); });
    $('#rls-chatter-chance').val(settings.chatterChance).on('change', function () { settings.chatterChance = Math.max(0, Math.min(100, parseInt($(this).val()) || 0)); $(this).val(settings.chatterChance); saveSettings(); });
    $('#rls-inject').prop('checked', settings.injectBarks).on('change', function () { settings.injectBarks = this.checked; saveSettings(); updateInjection(); });
    $('#rls-inject-depth').val(settings.injectDepth).on('change', function () { settings.injectDepth = Math.max(0, parseInt($(this).val()) || 0); $(this).val(settings.injectDepth); saveSettings(); updateInjection(); });
    $('#rls-quote').prop('checked', settings.quoteReply).on('change', function () { settings.quoteReply = this.checked; saveSettings(); });
    $('#rls-actions').prop('checked', settings.allowActions).on('change', function () { settings.allowActions = this.checked; saveSettings(); });
    $('#rls-autonpc').prop('checked', settings.autoNpc).on('change', function () { settings.autoNpc = this.checked; saveSettings(); });
    $('#rls-off-left').val(settings.offsetLeft).on('change', function () { settings.offsetLeft = Math.max(0, parseInt($(this).val()) || 0); $(this).val(settings.offsetLeft); saveSettings(); syncBubbles(); });
    $('#rls-off-right').val(settings.offsetRight).on('change', function () { settings.offsetRight = Math.max(0, parseInt($(this).val()) || 0); $(this).val(settings.offsetRight); saveSettings(); syncBubbles(); });
    $('#rls-auto').prop('checked', settings.autoPresence).on('change', function () { settings.autoPresence = this.checked; saveSettings(); });
}

/* ============================================================
   INIT
   ============================================================ */
jQuery(() => {
    loadSettings();
    setupUI();
    renderRosterButton();
    initLayer();

    // keep the floating bubbles glued to their messages (same trio as the thought bubbles)
    const chatElement = document.getElementById('chat');
    if (chatElement) {
        chatElement.addEventListener('scroll', syncBubbles, { passive: true });
        const observer = new MutationObserver(syncBubbles);
        observer.observe(chatElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    }
    window.addEventListener('resize', syncBubbles, { passive: true });

    eventSource.on(event_types.CHAT_CHANGED, () => {
        $('#rls-roster').removeClass('visible');
        clearAllBubbles();
        renderRosterButton();
        setTimeout(restoreOnLoad, 150);
    });

    eventSource.on(event_types.MESSAGE_RECEIVED, (messageId) => {
        setTimeout(() => processMessage(messageId), 60);
    });

    eventSource.on(event_types.MESSAGE_SENT, (messageId) => {
        if (!settings.reactToUser) return;
        setTimeout(() => processMessage(messageId), 60);
    });

    eventSource.on(event_types.MESSAGE_SWIPED, (messageId) => {
        // the old barks reacted to the swiped-away text — hide them; new ones come
        // with the fresh MESSAGE_RECEIVED for this swipe
        renderBarks(messageId);
    });

    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (messageId) => {
        const m = getContext().chat[messageId];
        const isLast = messageId === (getContext().chat.length - 1);
        if ((m && m.extra && Array.isArray(m.extra.rls_barks)) || isLast) renderBarks(messageId);
    });

    eventSource.on(event_types.MESSAGE_EDITED, (messageId) => {
        const m = getContext().chat[messageId];
        if (m && m.extra && Array.isArray(m.extra.rls_barks)) renderBarks(messageId);
    });
});
