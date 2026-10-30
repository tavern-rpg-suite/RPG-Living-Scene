import { getContext, extension_settings } from '../../../extensions.js';
import { eventSource, event_types, saveChatDebounced, saveSettingsDebounced, setExtensionPrompt, extension_prompt_roles, characters, name1 } from '../../../../script.js';
import { selected_group, groups, editGroup } from '../../../group-chats.js';
import { user_avatar } from '../../../personas.js';
import * as ST from '../../../../script.js';

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
        set_turn: 'Who speaks next',
        set_pass: 'Hand the turn to whoever is addressed',
        set_pass_hint: 'A name or a nickname in the last line, and that character answers — in the main chat, as themselves. Nothing obvious in the text? Nobody is triggered and the turn stays yours.',
        set_pass_after: 'After my message',
        set_pass_between: 'Let characters answer each other',
        set_pass_chain: 'Replies in a row without me:',
        set_pass_conf: 'Confidence needed (0–1):',
        set_pass_norepeat: 'Never the same character twice running',
        set_pass_ask: 'Ask the side model when the text is unclear',
        set_pass_solo: 'Ask them to speak only as themselves',
        set_pass_continue: 'Nobody new addressed → my current partner answers',
        set_pass_random: 'Still nobody → a random enabled member answers (muted ones never)',
        turn_picked: 'The turn goes to {name}',
        turn_needs_manual: 'Living Scene: the group answers on its own, so the turn cannot be handed over. Use the button in the settings to switch it to Manual.',
        turn_btn_manual: 'Set this group to reply manually',
        turn_btn_hint: 'Writes the group\u2019s own "characters reply…" setting to Manual. Some themes hide that dropdown; this is the same field.',
        turn_set_manual: 'This group now replies only when you say so.',
        turn_already_manual: 'This group already replies manually.',
        turn_no_group: 'Open a group chat first.',
        turn_set_failed: 'Could not change it: {err}',
        turn_state_manual: 'Reply order: manual — the turn is ours to hand over.',
        turn_state_auto: 'Reply order: automatic — SillyTavern picks the speakers.',
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
        meta_aliases_ph: 'Aliases, comma-separated (nickname, short name)…',
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
        set_parts_auto: 'Split every new reply by itself (off — only with the button)',
        set_parts_fold: 'Older replies as plain text with a “By roles” button (the last 3 stay in blocks)', parts_unfold: 'By roles',
        set_parts_code: 'Rules first: the model is asked only about what the text does not show', set_parts_solo: 'Show a reply of one character as a block too (portrait and name)', parts_fix_hint: 'Right-click or hold a block to say whose it is.',
        fix_title: 'Whose is this?', fix_narr: 'Narration', fix_new: 'Someone else…', fix_ph: 'Name', fix_ok: 'OK', fix_rename: 'Rename everywhere in this chat', fix_forget: 'Remove from the list',
        set_parts_style: 'Look of the blocks:', style_glass: 'Glass — small faces, light frames', style_ink: 'Ink — no frames, a coloured line', style_classic: 'As before — big faces',
        set_parts_anim: 'Text appears:', anim_none: 'at once', anim_fade: 'word by word, fading in', anim_type: 'word by word, typed',
        set_parts_fonts: 'Each person has their own colour and lettering',
        set_novel_box: 'The text box:', box_parchment: 'Parchment — light, a thin frame and a pattern', box_glass: 'Glass — half-clear, a thin line',
        box_grimoire: 'Grimoire — parchment, ink vines', box_ribbon: 'Night ribbon — a clear band across the screen', box_twilight: 'Twilight — dark glass, a gold frame, gold vines',
        set_novel_info: 'A small plate in the corner:', info_time: 'time', info_date: 'day', info_place: 'place', info_weather: 'weather',
        set_novel_fight: 'Fight stats (RPG Vitals):', fight_combat: 'only in a fight', fight_always: 'always', fight_off: 'never',
        fight_show: 'Show:', fight_hp: 'HP', fight_food: 'satiety', fight_fatigue: 'fatigue', fight_mana: 'mana', fight_you: 'You',
        set_novel_sprite: 'The characters:', sprite_large: 'full height', sprite_medium: 'smaller', sprite_waist: 'from the waist up, closer',
        set_novel_face: 'The speaker\'s portrait in the box:', face_always: 'always', face_nosprite: 'only for those without sprites', face_never: 'never',
        set_novel_hud: 'Buttons over the novel: Map, Diary, Life (those installed)', set_novel_place: 'The place\'s name; a new place comes in with a passage',
        hud_map: 'Map', hud_diary: 'Diary', hud_life: 'Life', novel_place: 'Place', info_day_n: 'Day {n}',
        set_sec_novel: 'Novel', set_novel_btn: 'A ▶ button on each reply opens it in the novel', set_novel_open: 'Open the novel now', novel_btn: 'Play in the novel',
        set_pass_toast: 'Say in a notice who gets the turn',
        set_mappres: 'Presence from RPG Map ("Who is where")',
        roster_map: '🗺 map', roster_map_hint: 'Placed by RPG Map: with you, or in another room. Your switch overrides it.',
        set_sec_compress: 'Long cards', set_compress: 'Long cards are condensed before they are sent (once, kept)', set_compress_over: 'Condense cards longer than (tokens):',
        set_faces: 'Split replies by roles', set_sec_cast: 'Who is in the scene', set_sec_roles: 'Replies by roles',
        set_faces_hint: 'Each person’s lines and actions in their own block, with their face. One side call per reply. Older replies: the button in the message menu.',
        parts_btn: 'Split by roles', parts_plain: 'Show as plain text', parts_compact: 'Only the spoken lines', parts_full: 'Lines and actions', parts_failed: 'Could not split this reply.', parts_one: 'Nothing to split here.', scene_btn: 'Play as a scene', scene_log: 'Log', scene_close: 'Close', scene_end: 'End of the reply', scene_hint: 'Click, Space or → — next · ← — back · Esc — close', novel_menu: 'Novel mode', novel_exit: 'Back to the chat', novel_say: 'Your line…', novel_send: 'Send', novel_prev: 'Previous version', novel_next: 'Another version', novel_regen: 'Regenerate', novel_stop: 'Stop', novel_busy: 'Wait until the reply is finished.', novel_wait: 'The reply is on its way…', novel_hint: 'Click or Space — next · ← — back · Enter — send · Esc — back to the chat', novel_return: 'Return to the character', novel_ask: 'Suggest choices', novel_empty: 'Write the first line below.',
        set_autonpc: 'Offer diary NPCs in the roster',
        set_autonpc_hint: 'They are listed so you can let them in with "+" or the switch. Being mentioned is not enough — an NPC nobody invited stays silent.',
        roster_diary: 'From the Diary',
        roster_diary_add: 'Add to the scene',
        roster_diary_none: 'The Diary has no NPCs yet (or the Diary extension is off).',
        roster_auto: 'auto',
        roster_member_sw: 'On in the group — the same switch as SillyTavern\'s',
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
        set_turn: 'Кто говорит следующим',
        set_pass: 'Передавать ход тому, к кому обратились',
        set_pass_hint: 'Имя или прозвище в последней реплике — и этот персонаж отвечает в основном чате, сам за себя. Если в тексте ничего явного нет, никто не вызывается и ход остаётся у тебя.',
        set_pass_after: 'После моего сообщения',
        set_pass_between: 'Разрешить персонажам отвечать друг другу',
        set_pass_chain: 'Ответов подряд без меня:',
        set_pass_conf: 'Нужная уверенность (0–1):',
        set_pass_norepeat: 'Один и тот же не отвечает дважды подряд',
        set_pass_ask: 'Спрашивать боковую модель, когда текст неясен',
        set_pass_solo: 'Просить говорить только за себя',
        set_pass_continue: 'Ни к кому новому не обратилась → отвечает тот, с кем говорю',
        set_pass_random: 'Всё равно никто → отвечает случайный из включённых (приглушённые никогда)',
        turn_picked: 'Ход переходит к {name}',
        turn_needs_manual: 'Living Scene: группа отвечает сама, поэтому ход передать нельзя. Нажми кнопку в настройках — она переключит на ручной режим.',
        turn_btn_manual: 'Переключить эту группу на ручной ответ',
        turn_btn_hint: 'Записывает настройку самой группы «Персонажи отвечают…» в значение «Когда вы скажете». В некоторых темах этот список спрятан — здесь то же самое поле.',
        turn_set_manual: 'Теперь группа отвечает только когда ты скажешь.',
        turn_already_manual: 'Группа уже отвечает вручную.',
        turn_no_group: 'Сначала открой групповой чат.',
        turn_set_failed: 'Не удалось переключить: {err}',
        turn_state_manual: 'Порядок ответа: вручную — ход можно передавать.',
        turn_state_auto: 'Порядок ответа: автоматический — говорящих выбирает Таверна.',
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
        meta_aliases_ph: 'Алиасы через запятую (прозвище, короткое имя)…',
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
        set_parts_auto: 'Разбивать каждый новый ответ сам (выкл. — только по кнопке)',
        set_parts_fold: 'Старые ответы — обычным текстом с кнопкой «По ролям» (последние 3 остаются блоками)', parts_unfold: 'По ролям',
        set_parts_code: 'Сначала правила: модель спрашивается только о том, чего не видно из текста', set_parts_solo: 'Показывать блоком и ответ одного персонажа (портрет и имя)', parts_fix_hint: 'Правый клик или долгое нажатие по блоку — выбрать, чей он.',
        fix_title: 'Чьё это?', fix_narr: 'Повествование', fix_new: 'Кто-то другой…', fix_ph: 'Имя', fix_ok: 'OK', fix_rename: 'Переименовать во всём чате', fix_forget: 'Убрать из списка',
        set_parts_style: 'Вид блоков:', style_glass: 'Стекло — маленькие лица, лёгкие рамки', style_ink: 'Чернила — без рамок, цветная линия', style_classic: 'Как раньше — крупные лица',
        set_parts_anim: 'Появление текста:', anim_none: 'сразу', anim_fade: 'по словам, проявляясь', anim_type: 'по словам, как печать',
        set_parts_fonts: 'У каждого свой цвет и почерк',
        set_novel_box: 'Окно текста:', box_parchment: 'Пергамент — светлый, тонкая рамка и узор', box_glass: 'Стекло — полупрозрачное, тонкая линия',
        box_grimoire: 'Гримуар — пергамент, чернильные лозы', box_ribbon: 'Ночная лента — прозрачная полоса во всю ширину', box_twilight: 'Сумерки — тёмное стекло, золотая рамка и лозы',
        set_novel_info: 'Маленькая плашка в углу:', info_time: 'время', info_date: 'день', info_place: 'место', info_weather: 'погода',
        set_novel_fight: 'Статы боя (RPG Vitals):', fight_combat: 'только в бою', fight_always: 'всегда', fight_off: 'никогда',
        fight_show: 'Показывать:', fight_hp: 'HP', fight_food: 'сытость', fight_fatigue: 'усталость', fight_mana: 'мана', fight_you: 'Вы',
        set_novel_sprite: 'Персонажи:', sprite_large: 'в полный рост', sprite_medium: 'поменьше', sprite_waist: 'по пояс, ближе',
        set_novel_face: 'Портрет говорящего в окне:', face_always: 'всегда', face_nosprite: 'только у кого нет спрайтов', face_never: 'никогда',
        set_novel_hud: 'Кнопки поверх новеллы: Карта, Дневник, Жизнь (что установлено)', set_novel_place: 'Название места; новое место — с переходом',
        hud_map: 'Карта', hud_diary: 'Дневник', hud_life: 'Жизнь', novel_place: 'Место', info_day_n: 'День {n}',
        set_sec_novel: 'Новелла', set_novel_btn: 'Кнопка ▶ на каждом ответе открывает его в новелле', set_novel_open: 'Открыть новеллу сейчас', novel_btn: 'Играть в новелле',
        set_pass_toast: 'Сообщать уведомлением, к кому перешёл ход',
        set_mappres: 'Присутствие по карте («Кто где»)',
        roster_map: '🗺 карта', roster_map_hint: 'Решает RPG Map: с тобой или в другой комнате. Твой переключатель главнее.',
        set_sec_compress: 'Длинные карточки', set_compress: 'Длинные карточки сжимаются перед отправкой (один раз, запоминается)', set_compress_over: 'Сжимать карточки длиннее (токенов):',
        set_faces: 'Разбивать ответы по ролям', set_sec_cast: 'Кто в сцене', set_sec_roles: 'Ответы по ролям',
        set_faces_hint: 'Реплики и действия каждого — в своём блоке, с портретом. Один запрос к боковой модели на ответ. Для старых сообщений — кнопка в меню сообщения.',
        parts_btn: 'Разбить по ролям', parts_plain: 'Показать обычным текстом', parts_compact: 'Только реплики', parts_full: 'Реплики и действия', parts_failed: 'Не получилось разбить этот ответ.', parts_one: 'Здесь нечего разбивать.', scene_btn: 'Показать сценой', scene_log: 'Журнал', scene_close: 'Закрыть', scene_end: 'Конец ответа', scene_hint: 'Клик, пробел или → — дальше · ← — назад · Esc — закрыть', novel_menu: 'Режим новеллы', novel_exit: 'Вернуться в чат', novel_say: 'Твоя реплика…', novel_send: 'Отправить', novel_prev: 'Предыдущая версия', novel_next: 'Другая версия', novel_regen: 'Перегенерировать', novel_stop: 'Остановить', novel_busy: 'Дождись, пока ответ допишется.', novel_wait: 'Ответ пишется…', novel_hint: 'Клик или пробел — дальше · ← — назад · Enter — отправить · Esc — в чат', novel_return: 'Вернуться к персонажу', novel_ask: 'Предложить варианты', novel_empty: 'Напиши первую реплику внизу.',
        set_autonpc: 'Показывать NPC из дневника в списке сцены',
        set_autonpc_hint: 'Они появляются в списке, чтобы их можно было впустить кнопкой «+» или переключателем. Одного упоминания мало — неприглашённый NPC молчит.',
        roster_diary: 'Из дневника',
        roster_diary_add: 'Добавить в сцену',
        roster_diary_none: 'В дневнике пока нет NPC (или расширение дневника выключено).',
        roster_auto: 'авто',
        roster_member_sw: 'Включён в группе — тот же выключатель, что в SillyTavern',
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
        /* THE TURN
           Bubbles say who is alive in the scene; this says who speaks next. The
           roster, the aliases and the side model are already here, so the decision
           costs nothing extra — and silence stays the default answer. */
        passEnabled: false,      // hand the turn to whoever is being addressed
        passAfterUser: true,     // …after the player writes
        passBetween: false,      // …and let characters answer each other
        passChain: 1,            // replies in a row without the player
        passConfidence: 0.7,     // below this the turn goes back to the player
        passNoRepeat: true,      // never the same character twice running
        passAskModel: true,      // one short side call when the text is unclear
        passSoloVoice: true,     // ask the one who answers not to voice the others
        passContinue: true,      // nobody new addressed → the current partner answers
        passFallbackRandom: false, // still nobody → a random enabled (unmuted) member answers
        offsetLeft: 250,    // px below the message top on the LEFT (clear of the thought bubbles)
        offsetRight: 8,     // px below the message top on the RIGHT
        lineFaces: true,    // a reply is cut into blocks by who speaks and acts (one side call per reply)
        partsCompact: false, // the blocks show only the spoken lines
        novel: false,        // the chat is played as a visual novel (kept between chats and reloads)
        mapPresence: true,   // RPG Map's "Who is where" decides who is present (your switch still wins)
        partsAuto: true,     // every new reply is split by itself (off: only with the button, or while the novel is open)
        partsFold: true,     // older replies show their plain text with a "by roles" button; the last few stay in blocks
        partsCodeFirst: true, // the text's own signs settle what they can; the model is asked only about the rest
        partsSolo: false,     // a reply where one character does everything: shown as one block too
        partsStyle: 'glass', // the blocks' look: glass | ink | classic
        partsAnim: 'fade',   // the text of a new block: none | fade | type
        partsFonts: true,    // each person their own colour and lettering
        novelBtn: true,      // a ▶ on each reply opens it in the novel
        novelBox: 'parchment', // the text box: parchment | glass | dark
        novelSprite: 'large',  // the cast's size: large | medium | waist
        novelFace: 'nosprite', // the speaker's portrait in the box: always | nosprite | never
        novelHud: true,        // buttons for RPG Map, the Diary, RPG Life over the novel
        novelPlace: true,      // the place's name, and a change of place played as a passage
        novelInfo: { time: true, date: true, place: true, weather: true },   // the small plate in the corner (from the Scene Card and the Map)
        novelFight: 'combat',  // RPG Vitals' bars over the novel: combat | always | off
        novelFightShow: { hp: true, food: false, fatigue: false, mana: false },
        passToast: false,    // a notice saying who gets the turn
        compress: true,      // long cards are condensed once before they go to the side model
        compressOver: 400,   // …longer than this many tokens
        briefs: {}           // the condensed cards, kept by card and text
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
    if (!['glass', 'ink', 'classic'].includes(settings.partsStyle)) settings.partsStyle = defaults.partsStyle;
    if (!['none', 'fade', 'type'].includes(settings.partsAnim)) settings.partsAnim = defaults.partsAnim;
    if (!Number.isFinite(settings.compressOver)) settings.compressOver = defaults.compressOver;
    if (settings.novelBox === 'dark') settings.novelBox = 'twilight';   // "Dark — as before" was a twin of the others; Twilight is the dark one now
    if (!['parchment', 'glass', 'grimoire', 'ribbon', 'twilight'].includes(settings.novelBox)) settings.novelBox = defaults.novelBox;
    if (!settings.novelInfo || typeof settings.novelInfo !== 'object') settings.novelInfo = Object.assign({}, defaults.novelInfo);
    if (!['combat', 'always', 'off'].includes(settings.novelFight)) settings.novelFight = defaults.novelFight;
    if (!settings.novelFightShow || typeof settings.novelFightShow !== 'object') settings.novelFightShow = Object.assign({}, defaults.novelFightShow);
    delete settings.novelFightPos;   // the bars stand at the top only now
    if (!['large', 'medium', 'waist'].includes(settings.novelSprite)) settings.novelSprite = defaults.novelSprite;
    if (!['always', 'nosprite', 'never'].includes(settings.novelFace)) settings.novelFace = defaults.novelFace;
    if (!settings.briefs || typeof settings.briefs !== 'object') settings.briefs = {};
    if (!Number.isFinite(settings.temperature)) settings.temperature = defaults.temperature;
    if (!Number.isFinite(settings.passChain)) settings.passChain = defaults.passChain;
    if (!Number.isFinite(settings.passConfidence)) settings.passConfidence = defaults.passConfidence;
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

/* ---- the people of this chat, remembered for the "Whose is this?" menu ----
   Everyone the split has named who is not a card, a roster NPC or the player (Джулиан, «Леди Вэнс»,
   "the valet") and everyone typed in by hand. Kept with the chat; renamed everywhere at once;
   a name removed from the list is not brought back by itself. */
function chatPeople() {
    const st = sceneState();
    if (!Array.isArray(st.people)) st.people = [];
    if (!Array.isArray(st.peopleOff)) st.peopleOff = [];
    return st;
}
// «Марк» in the text for the card Mark: the same person in the other alphabet — the cast, not someone new
function castTwin(name, cands) {
    const cyr = x => /[а-яё]/i.test(x);
    const w = String(name || '').trim();
    return (cands || faceCandidates()).some(c => [c.name].concat(aliasNamesOf(c.name)).some(n => cyr(n) !== cyr(w) && String(n).trim().split(/\s+/).length === w.split(/\s+/).length && sameSound(latinOf(w), latinOf(n))));
}
function cleanPersonName(n) { return String(n || '').replace(/\s+/g, ' ').trim().slice(0, 40); }
function rememberPeople(names, byHand = false) {
    const st = chatPeople();
    const cast = new Set(faceCandidates().map(c => c.name.toLowerCase()));
    let changed = false;
    (names || []).forEach(n => {
        const v = cleanPersonName(n);
        if (!v || v === '-' || v === '?') return;
        const lo = v.toLowerCase();
        if (byHand && st.peopleOff.some(x => x.toLowerCase() === lo)) { st.peopleOff = st.peopleOff.filter(x => x.toLowerCase() !== lo); changed = true; }
        if (cast.has(lo) || castTwin(v) || st.people.some(x => x.toLowerCase() === lo) || st.peopleOff.some(x => x.toLowerCase() === lo)) return;
        st.people.push(v);
        changed = true;
    });
    if (st.people.length > 80) st.people = st.people.slice(-80);
    return changed;
}
// one name becomes another in every split reply of this chat (every swipe), in the list and in the roster notes
function renamePerson(from, to) {
    const a = cleanPersonName(from), b = cleanPersonName(to);
    if (!a || !b || a === b || b === '-' || b === '?') return 0;
    const chat = getContext().chat || [];
    let n = 0;
    const fix = parts => {
        if (!parts || typeof parts !== 'object') return;
        Object.values(parts).forEach(sv => { if (sv && Array.isArray(sv.w)) sv.w.forEach((w, i) => { if (w === a) { sv.w[i] = b; n++; } }); });
    };
    chat.forEach(m => {
        if (!m) return;
        fix(m.extra && m.extra.rls_parts);
        if (Array.isArray(m.swipe_info)) m.swipe_info.forEach(si => fix(si && si.extra && si.extra.rls_parts));
    });
    const st = chatPeople();
    const lo = b.toLowerCase();
    st.people = st.people.filter(x => x !== a && x.toLowerCase() !== lo);
    if (!faceCandidates().some(c => c.name.toLowerCase() === lo)) st.people.push(b);
    st.peopleOff = st.peopleOff.filter(x => x.toLowerCase() !== lo);
    if (st.meta[a] && !st.meta[b]) st.meta[b] = st.meta[a];
    delete st.meta[a];
    saveScene();
    return n;
}
function forgetPerson(name) {
    const st = chatPeople();
    const v = cleanPersonName(name);
    st.people = st.people.filter(x => x !== v);
    if (!st.peopleOff.includes(v)) st.peopleOff.push(v);
    saveScene();
}

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

/* RPG Map's "Who is where": with you → in the scene; in another room or far away →
   not. 'unknown', or a map that is off or not installed, decides nothing. Your own
   switch in the roster still wins over the map. */
/* The map knows only its own rooms. When the Scene Card says you are somewhere the map does not
   have ("Inside a carriage on the road to Yorkshire"), the map's places are of another moment:
   it decides nothing until you are back in one of its rooms. */
function mapIsElsewhere() {
    try {
        const chat = getContext().chat || [];
        let loc = '';
        for (let i = chat.length - 1; i >= 0 && i >= chat.length - 40; i--) { const d = chat[i] && chat[i].extra && chat[i].extra.rpg_info_box; if (d && d.location) { loc = String(d.location); break; } }
        if (!loc.trim()) return false;                       // no Scene Card: the map is all there is
        const r = roomNow();
        if (!r) return false;
        const low = s0 => String(s0 || '').toLowerCase().replace(/ё/g, 'е');
        const card = low(loc), cardLat = translit(card);
        const names = [r.room, r.loc].filter(Boolean).map(low);
        return !names.some(n => n.length >= 3 && (card.includes(n) || cardLat.includes(translit(n))));
    } catch (e) { return false; }
}
function mapWhere(name) {
    try {
        if (settings.mapPresence === false) return null;
        if (mapIsElsewhere()) return null;
        const map = window.RPG && window.RPG.map;
        if (!map || !map.available || typeof map.whereIs !== 'function' || (map.isEnabled && !map.isEnabled())) return null;
        const w = map.whereIs(name);
        if (!w) return null;
        if (w.kind === 'you') return 'here';
        // placed in a room — the room you are in yourself is "here", any other is away
        if (w.kind === 'room') {
            const me = roomNow();
            if (me && w.room && w.room === me.room && (!w.location || !me.loc || w.location === me.loc)) return 'here';
            return 'away';
        }
        if (w.kind === 'away') return 'away';
        return null;
    } catch (e) { return null; }
}

/* One switch for a group member: SillyTavern's own (the crossed eye in the group panel).
   Off there — not in the scene at all: no turn, no thought bubbles. On — who is actually
   near is decided by the map and by mentions, as before. The switch in the roster is the
   same switch. Living Scene's own "absent" marks are for NPCs only now. */
function curGroup() { return selected_group ? (groups || []).find(x => x && x.id === selected_group) || null : null; }
function memberAvatar(name) {
    const g = curGroup();
    if (!g || !name) return null;
    return (g.members || []).find(av => { const c = characters.find(x => x && x.avatar === av); return !!c && c.name === name; }) || null;
}
function memberMuted(avatar) { const g = curGroup(); return !!(g && avatar && (g.disabled_members || []).includes(avatar)); }
async function setMemberMuted(avatar, muted) {
    const g = curGroup();
    if (!g || !avatar || !(g.members || []).includes(avatar)) return;
    if (!Array.isArray(g.disabled_members)) g.disabled_members = [];
    const i = g.disabled_members.indexOf(avatar);
    if (muted && i < 0) g.disabled_members.push(avatar);
    else if (!muted && i >= 0) g.disabled_members.splice(i, 1);
    else return;
    // the group panel shows the same state at once, the way its own buttons do
    $(`.group_member[data-id="${CSS.escape(avatar)}"]`).toggleClass('disabled', !!muted);
    try { await editGroup(g.id, false, false); } catch (e) { console.warn('[Living Scene] could not save the group', e); }
}
// old "absent" marks on group members came from the second switch that is gone — dropped once per chat
function dropMemberMarks() {
    try {
        const g = curGroup();
        if (!g) return;
        const st = sceneState();
        let changed = false;
        (g.members || []).forEach(av => { const c = characters.find(x => x && x.avatar === av); if (c && c.name && c.name in st.present) { delete st.present[c.name]; changed = true; } });
        if (changed) { saveScene(); console.log('[Living Scene] the roster now follows the group switches — old marks cleared'); }
    } catch (e) { /* ignore */ }
}

// is this character considered "in the scene" right now?
function isPresent(name) {
    const st = sceneState();
    const av = memberAvatar(name);
    if (av) { if (memberMuted(av)) return false; }
    else {
        if (st.present[name] === true) return true;
        if (st.present[name] === false) return false;
    }
    const m = mapWhere(name);
    if (m) return m === 'here';
    // unset → auto mode: present if mentioned or speaking in the recent messages
    if (!settings.autoPresence) return false;
    const chat = getContext().chat || [];
    const tail = chat.slice(-10);
    const low = name.toLowerCase();
    // stem match: the full card name ("Oliver Grant") almost never appears in prose,
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
    const add = (entry, present) => {
        if (entry.name === excludeName || seen.has(entry.name) || !present) return;
        seen.add(entry.name);
        cast.push(entry);
    };

    // characters of the chat: presence as configured — automatic or switched by hand
    groupMembers().forEach(m => add(m, isPresent(m.name)));

    // NPCs you added yourself with "+": in the scene until you switch them off
    st.npcs.forEach(n => add({ name: n.name, avatar: null, isNpc: true }, st.present[n.name] !== false && !(st.present[n.name] === undefined && mapWhere(n.name) === 'away')));

    /* NPCs that live only in the diary are NOT let in by a mention. Being talked
       about is not being in the room: they speak once you let them in — with "+"
       or with the switch in the roster. */
    if (settings.autoNpc) {
        const added = new Set(st.npcs.map(n => n.name));
        diaryNpcs().forEach(n => add({ name: n.name, avatar: null, isNpc: true },
            !added.has(n.name) && (st.present[n.name] === true || (st.present[n.name] === undefined && mapWhere(n.name) === 'here'))));
    }
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
// how long to wait for the side model: a model on your own computer writes slowly (a long reply's
// split took 50 s on one), so it gets four times as long as a service before the answer is given up on
function waitFor(ms) { return isLocalEndpoint(apiUrl()) ? ms * 4 : ms; }
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

function isJunk(v) {
    if (v == null || typeof v === 'number' || typeof v === 'boolean') return true;
    const x = String(v).trim();
    return !x || /^-?\d+([.,]\d+)?$/.test(x) || /^(null|undefined|nan|none|n\/a|error)$/i.test(x);
}
async function callAI(systemPrompt, userPrompt, timeoutMs = 0, maxTokens = 3000) {
    if (!apiKey()) throw new Error('API key is not set');
    const endpointUrl = apiUrl() + '/chat/completions';
    // A side call that never returns used to hold the turn shut for good: every later
    // message was "already deciding" and nobody answered again until a reload.
    const ctl = timeoutMs > 0 && typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
    try {
    const response = await fetch(endpointUrl, {
        method: 'POST',
        ...(ctl ? { signal: ctl.signal } : {}),
        headers: { 'Authorization': `Bearer ${apiKey().trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: apiModel(),
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
            temperature: settings.temperature,
            max_tokens: maxTokens,
            ...(wantsStrictJson(endpointUrl) ? { response_format: { type: 'json_object' } } : {})
        })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    apiCallCount++;
    $('#rls-calls-n').text(apiCallCount);
    const data = await response.json();
    const content = (data.choices?.[0]?.message?.content || '').trim();
    // the shape is not trusted: JSON inside text, JSON inside a string (sometimes twice)
    const m = content.match(/\{[\s\S]*\}/);
    let v = m ? m[0] : content;
    for (let i = 0; i < 3 && typeof v === 'string'; i++) { try { v = JSON.parse(v.trim()); } catch (e) { break; } }
    if (!v || typeof v !== 'object') { console.warn('[Living Scene] side model: not JSON —', content.slice(0, 600)); const err = new Error('not json'); err.raw = content; throw err; }
    Object.defineProperty(v, '__raw', { value: content, enumerable: false });
    return v;
    } finally { if (timer) clearTimeout(timer); }
}

/* ============================================================
   Who is actively ON STAGE in this text? In narrator-style play one
   card writes for everyone: the message may be "from Oliver" while
   CIEL does all the talking. Giving the talker an ambient bark looked
   absurd — his voice is already on screen. Stem matching tolerates
   Russian declensions (Сиэль/Сиэля/Сиэлю).
   ============================================================ */
// all the ways this character may be written in prose: name + user-given aliases
// (Luna/Луна/Theo — fixes translated cards and declensions in one stroke)
function aliasNamesOf(name) {
    const st = sceneState();
    const meta = (st.meta && st.meta[name]) || {};
    // the roster's aliases, then the forms learned from the replies themselves ("Alex" for «Алекс»),
    // then RPG Phone's «Also called» for this person, read only
    const learned = Array.isArray(meta.auto) ? meta.auto.map(x => String(x || '').trim()).filter(Boolean) : [];
    const k = String(name || '').trim().toLowerCase();
    const phone = phonePairs().filter(x => x.to.toLowerCase() === k).map(x => x.alias);
    return [...new Set([name].concat(String(meta.aliases || '').split(',').map(x => x.trim()).filter(Boolean), learned, phone))];
}
/* RPG Phone keeps, per card, the people living inside it («Characters inside this card») and the
   other ways a name is written («Also called»: "Алекс, Ал" = the card, "Марк = Mark" =
   someone inside). The scene reads both for the cards of this chat; it never writes them. */
function chatCardNames() {
    try {
        const ctx = getContext();
        if (selected_group) {
            const g = (groups || []).find(x => x && x.id === selected_group);
            return (g && g.members || []).map(av => characters.find(c => c && c.avatar === av)).filter(Boolean).map(c => c.name);
        }
        return ctx.characterId !== undefined && characters[ctx.characterId] ? [characters[ctx.characterId].name] : [];
    } catch (e) { return []; }
}
function phonePairs() {
    const ph = extension_settings.rpg_phone;
    if (!ph || !ph.aliases || typeof ph.aliases !== 'object') return [];
    const out = [];
    chatCardNames().forEach(card => {
        String(ph.aliases[card] || '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean).forEach(x => {
            const i = x.indexOf('=');
            if (i < 0) out.push({ alias: x, to: card });
            else { const a = x.slice(0, i).trim(), b = x.slice(i + 1).trim(); if (a && b) out.push({ alias: a, to: b }); }
        });
    });
    return out;
}
function phoneCast() {
    const ph = extension_settings.rpg_phone;
    const out = [];
    chatCardNames().forEach(card => String(ph && ph.cast && ph.cast[card] || '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean).forEach(n => out.push(n)));
    phonePairs().forEach(x => { if (!chatCardNames().includes(x.to)) out.push(x.to); });
    return [...new Set(out)];
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
    // not silence him (Mark was described five times yet never spoke — and his thought
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
   message text is noise — the reader just read it. Luna's "Finally!"
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
/* ---------- who someone is, for the side model: never a card cut off in the middle ----------
   A long card is condensed once (the same way RPG Map does it, with the same instructions) and the
   brief is kept until the card's text changes. RPG Map's own brief of that card is used when it has
   one (read, never written), so a card is never condensed twice. */
const BRIEF_PROMPT = `Condense the character description below into a compact brief for a writer who will show this character in short, everyday scenes.
Keep only what the text states — never add, guess or embellish. Keep every name exactly as written.
Include, where the text gives them: who they are and what they do; their appearance; family and the people close to them, and their relationships with everyone the text mentions (names, and how they feel about each other); their present situation, goals and worries; habits, routine and interests; how they talk.
Aim for about 250 words, but never drop a relationship or the appearance to make it shorter.
Plain text, short lines, no headings. Write it in the same language as the description.
Output strictly JSON: {"brief":"..."}`;
const estTokens = x => Math.round(String(x || '').length / 4);
function textHash(x) {
    let h = 2166136261 >>> 0;
    const v = String(x || '');
    for (let i = 0; i < v.length; i++) { h ^= v.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(36) + ':' + v.length;
}
const cardNorm = d => String(d || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
const briefBusy = new Map();
async function cardBrief(ch, text) {
    const key = `card:${ch.avatar || ch.name}`;
    // RPG Map's brief of exactly this card
    try {
        const mb = extension_settings.rpg_map_engine?.overhear?.briefs?.[`card:${ch.avatar}`];
        if (ch.avatar && mb && typeof mb.text === 'string' && mb.text.trim() && mb.stamp === textHash(text) + ':v2') return mb.text.trim();
    } catch (e) { /* not there */ }
    const own = settings.briefs[key];
    if (own && own.stamp === textHash(text) && own.text) return own.text;
    if (briefBusy.has(key)) return briefBusy.get(key);
    const job = (async () => {
        try {
            const res = await callAI(BRIEF_PROMPT, `CHARACTER: ${ch.name}\n\n${text}`, waitFor(60000), 2000);
            const v = res && typeof res === 'object' ? (res.brief || res.text || res.summary) : res;
            if (typeof v !== 'string' || isJunk(v)) { console.warn('[Living Scene] brief: no text in the answer —', String(res && res.__raw || '').slice(0, 600)); return ''; }
            settings.briefs[key] = { text: v.trim(), stamp: textHash(text), name: ch.name, date: new Date().toISOString() };
            saveSettings();
            return v.trim();
        } catch (e) { console.warn('[Living Scene] brief failed', e); return ''; }
        finally { briefBusy.delete(key); }
    })();
    briefBusy.set(key, job);
    return job;
}
async function personaFor(name) {
    const st = sceneState();
    const meta = (st.meta && st.meta[name]) || {};
    if (meta.note && meta.note.trim()) return String(meta.note).replace(/\s+/g, ' ').trim();   // hand-written wins
    const ch = characters.find(c => c.name === name);
    if (ch && (ch.description || ch.personality)) {
        const text = cardNorm([ch.description, ch.personality].filter(Boolean).join('\n'));
        let out = text;
        if (settings.compress !== false && estTokens(text) > (settings.compressOver || 400)) out = (await cardBrief(ch, text)) || text;   // condensing failed: the whole card, not a cut-off half
        return out.replace(/\s+/g, ' ').trim();
    }
    const dn = diaryNpcs().find(n => n.name.toLowerCase() === name.toLowerCase());   // the Diary knows them
    if (dn) { const pers = [dn.role, dn.note, dn.look].filter(Boolean).join('; ').replace(/\s+/g, ' ').trim(); if (pers) return pers; }
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

    const personas = await Promise.all(cast.map(c => personaFor(c.name)));
    if (getContext().chatId !== myChat) return [];
    const castLines = cast.map((c, k) => {
        const mem = recentBarksOf(c.name, messageId);
        const memTxt = mem.length ? ` | Their recent background lines (continue this running attitude, do NOT repeat): ${mem.map(x => `"${x.slice(0, 80)}"`).join(' / ')}` : '';
        return `- ${c.name}: ${personas[k]}${memTxt}`;
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
        const res = await callAI(sys, `SCENE (latest last):\n${tail}`, 0, 2000);
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
    // (it needs both voices), so their separate normal bark is dropped — Luna no longer
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
    // no card of that name: the same faces as the role blocks — the diary's portraits, Phone's people, the persona
    try { const f = partFace(name); if (f.pic) return `<img class="rls-ava" src="${escapeHtml(f.pic)}" draggable="false" alt="">`; } catch (e) { /* initials below */ }
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
/* ============================================================
   THE TURN — who answers next
   The roster knows who is present and what they are called; that is most of
   the work. A name addressed in the last line hands the turn over. A name
   merely mentioned does not: "I looked at Alex" is not a question to him.
   When the text says nothing either way, ONE short side call may decide, and
   if that is unsure too, nobody is triggered at all.
   ============================================================ */
const TURN_KEY = 'rpg_living_scene_solo';
let turnChain = 0;         // replies since the player last wrote
let turnBusy = false;
let generating = false;    // ST is busy: triggering now throws "generation already in progress"
let turnWarned = false;

/* SillyTavern's own group reply strategy runs first. On Natural, List or Pooled it
   picks speakers by itself the moment you send — ours would then queue a second and
   a third on top, which is exactly the pile-up. Only Manual leaves the decision open,
   so that is the only mode where the turn is ours to hand over. */
const GROUP_MANUAL = 2;
function groupStrategy() {
    try {
        const g = (groups || []).find(x => x && x.id === selected_group);
        return Number(g?.activation_strategy ?? 0);
    } catch (e) { return 0; }
}

/* Some themes hide the group's "characters reply…" dropdown entirely, so the
   setting is written here instead. It is the same field the dropdown edits. */
async function setGroupManual() {
    if (!selected_group) { toastr.warning(t('turn_no_group')); return false; }
    const g = (groups || []).find(x => x && x.id === selected_group);
    if (!g) { toastr.warning(t('turn_no_group')); return false; }
    const was = Number(g.activation_strategy ?? 0);
    if (was === GROUP_MANUAL) { toastr.info(t('turn_already_manual')); return true; }
    g.activation_strategy = GROUP_MANUAL;
    try {
        await editGroup(selected_group, true, false);
        // the dropdown, if this theme shows one, should agree with what was written
        const sel = document.getElementById('rm_group_activation_strategy');
        if (sel) sel.value = String(GROUP_MANUAL);
        turnWarned = false;
        toastr.success(t('turn_set_manual'));
        return true;
    } catch (e) {
        g.activation_strategy = was;
        console.error('[Living Scene] could not change the group strategy:', e);
        toastr.error(t('turn_set_failed', { err: e.message || e }));
        return false;
    }
}

/** Wait for the current generation to finish, within reason. */
function waitIdle(ms = 20000) {
    if (!generating) return Promise.resolve(true);
    return new Promise(resolve => {
        const started = Date.now();
        const tick = setInterval(() => {
            if (!generating) { clearInterval(tick); resolve(true); }
            else if (Date.now() - started > ms) { clearInterval(tick); resolve(false); }
        }, 250);
    });
}

function normTurn(v) {
    return String(v || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

/* "What do you think about Victor?" names Victor and means Alex. A name that
   follows one of these is the subject of the sentence, not its target. */
const ABOUT_RX = /(?:об|обо|о|про|насчёт|насчет|по\s+поводу|вместо|кроме|без|для|about|regarding|concerning|instead\s+of|without)\s*$/i;

/* Presence is generous on purpose — a mention is enough to make someone "present"
   so they can drop a thought bubble. Handing them the TURN on a mention is another
   matter: talking about Victor must not summon Victor. For the turn, a character
   counts as in the room only if you marked them present by hand, or if they have
   actually spoken in the last few messages. */
/* Who may take the turn: the group's ENABLED members — muted ones never — minus
   anyone you marked absent in the roster. Deliberately not the bubble roster, which
   counts a character as present only once they have been mentioned. */
function turnCast(excludeName) {
    const g = (groups || []).find(x => x && x.id === selected_group);
    if (!g) return [];
    const muted = new Set(g.disabled_members || []);
    const st = sceneState();
    const members = (g.members || [])
        .filter(avatar => !muted.has(avatar))
        .map(avatar => characters.find(c => c && c.avatar === avatar))
        .filter(c => c && c.name && c.name !== excludeName);
    const here = members.filter(c => mapWhere(c.name) !== 'away');   // in another room by the map
    // the map has everyone somewhere else: it is not left to silence — everyone enabled may answer, as without the map
    const list = here.length ? here : members;
    if (!here.length && members.length) turnLog('the map puts everyone in another room — answering as if there were no map');
    return list.map(c => ({ name: c.name, avatar: c.avatar, isNpc: false }));
}

// why turnCast came back empty — printed with the "no enabled member" line, so the console says it all
function turnWhyEmpty() {
    try {
        const g = (groups || []).find(x => x && x.id === selected_group);
        if (!g) return `group ${selected_group || '(none)'} not found`;
        const muted = new Set(g.disabled_members || []);
        const st = sceneState();
        const rows = (g.members || []).map(a => {
            const c = characters.find(x => x && x.avatar === a);
            if (!c) return `${a}: no such character`;
            if (muted.has(a)) return `${c.name}: muted in the group`;
            return `${c.name}: ok`;
        });
        return rows.length ? rows.join(', ') : 'the group has no members';
    } catch (e) { return 'unknown'; }
}

/* Exploring alone with RPG Map: the others are not with you, the story is told by a game master.
   Exactly one member of the group writes it — the one you were talking with last (else the first
   enabled one), whatever the map says about where they are — and their reply is shown as narration. */
function mapSolo() {
    try { const m = window.RPG && window.RPG.map; return !!(m && m.available && typeof m.isSolo === 'function' && (!m.isEnabled || m.isEnabled()) && m.isSolo()); } catch (e) { return false; }
}
function soloNarrator() {
    const g = (groups || []).find(x => x && x.id === selected_group);
    if (!g) return null;
    const muted = new Set(g.disabled_members || []);
    const all = (g.members || []).filter(a => !muted.has(a)).map(a => characters.find(c => c && c.avatar === a)).filter(c => c && c.name)
        .map(c => ({ name: c.name, avatar: c.avatar, isNpc: false }));
    return lastPartner(all) || all[0] || null;
}
// replies written while exploring alone: noted by the reply's own time when it comes in, so a deleted
// message never makes a later one at the same number count as the game master's
function soloMark(id) {
    try {
        const m = (getContext().chat || [])[id];
        if (!m || m.is_user || m.is_system || !mapSolo()) return;
        const st = sceneState();
        if (!Array.isArray(st.soloReplies)) st.soloReplies = [];
        const k = String(m.send_date || '');
        if (k && !st.soloReplies.includes(k)) { st.soloReplies.push(k); st.soloReplies = st.soloReplies.slice(-300); saveScene(); }
    } catch (e) { /* nothing to note */ }
}
function soloReply(id) {
    try {
        const m = (getContext().chat || [])[id];
        const st = sceneState();
        return !!m && Array.isArray(st.soloReplies) && st.soloReplies.includes(String(m.send_date || ''));
    } catch (e) { return false; }
}
function reallyHere(name) {
    // In a group the roster already says who is in the room — absent ones are
    // muted there. So everyone enabled counts, unless you marked them absent here.
    try {
        const av = memberAvatar(name);
        if (av && memberMuted(av)) return false;
        const p = av ? undefined : sceneState().present[name];
        if (p !== undefined) return p !== false;
        return mapWhere(name) !== 'away';
    } catch (e) { return true; }
}

/** Addressed, merely named, talked about, or absent from the line. */
function addressedIn(text, name) {
    const body = normTurn(text);
    if (!body) return { hit: false };
    for (const alias of aliasNamesOf(name)) {
        const n = normTurn(alias);
        if (!n || n.length < 2) continue;
        let idx = body.indexOf(n);
        while (idx !== -1) {
            const before = idx === 0 ? ' ' : body[idx - 1];
            if (!/[\p{L}\p{N}]/u.test(before)) {
                // a preposition right in front means the line is ABOUT them
                if (ABOUT_RX.test(body.slice(Math.max(0, idx - 14), idx))) return { hit: true, about: true };
                // what follows decides: "Victor, pour me a drink" vs "Leo and Victor left"
                const rawIdx = text.toLowerCase().replace(/ё/g, 'е').indexOf(n.slice(0, 4));
                const tail = rawIdx >= 0 ? text.slice(rawIdx + n.length) : '';
                const direct = /^\s*[,:!?…]/.test(tail) || /^\s*[—–-]/.test(tail);
                return { hit: true, direct };
            }
            idx = body.indexOf(n, idx + 1);
        }
    }
    return { hit: false };
}

/* A roleplay line has three parts and each means something different:
     *actions*   — "looked at Victor" points the line AT Victor
     "speech"    — "Victor, come here" addresses him; "Oliver helped me" is ABOUT Oliver
     narration   — whatever is left, read like an action                                   */
function splitLine(text) {
    const src = String(text || '');
    const actions = [];
    const speech = [];
    src.replace(/\*([^*]+)\*/g, (_, a) => { actions.push(a); return ''; });
    src.replace(/[“"«]([^”"»]+)[”"»]/g, (_, q) => { speech.push(q); return ''; });
    const narration = src.replace(/\*[^*]+\*/g, ' ').replace(/[“"«][^”"»]+[”"»]/g, ' ');
    return { actions: actions.concat(narration.trim() ? [narration] : []), speech };
}

// looking, turning, nodding, smiling AT someone makes them the one being answered
const GAZE_RX = /(look(?:s|ed|ing)?\s+(?:at|up\s+at|over\s+at)|glanc\p{L}*\s+at|stare[sd]?\s+at|turn(?:s|ed|ing)?\s+to(?:ward)?s?|smil\p{L}*\s+at|nod(?:s|ded|ding)?\s+(?:at|to)|fac(?:es|ed|ing)|reach\p{L}*\s+for|смотр\p{L}*\s+на|посмотр\p{L}*\s+на|взгляну\p{L}*\s+на|взглядыва\p{L}*\s+на|гляд\p{L}*\s+на|погляде\p{L}*\s+на|уставил\p{L}*\s+на|поверну\p{L}*\s+к|оберну\p{L}*\s+к|обрати\p{L}*\s+к|улыбну\p{L}*\s+|кивну\p{L}*\s+|подня\p{L}*\s+(?:глаза|взгляд)\s+на)\s*$/iu;

function gazeAt(actionText, name) {
    const body = normTurn(actionText);
    for (const alias of aliasNamesOf(name)) {
        const n = normTurn(alias);
        if (!n || n.length < 2) continue;
        let idx = body.indexOf(n);
        while (idx !== -1) {
            const before = idx === 0 ? ' ' : body[idx - 1];
            if (!/[\p{L}\p{N}]/u.test(before) && GAZE_RX.test(body.slice(Math.max(0, idx - 36), idx))) return true;
            idx = body.indexOf(n, idx + 1);
        }
    }
    return false;
}

/* A name standing on its own is a call: "Oh… Alex." / "Алекс." The earlier rule
   only knew the comma form, so a name closing a sentence read as a mere mention and
   the turn went to whoever you had been talking to. Interjections before it are
   skipped; a name followed by a verb ("Alex nodded") is still narration. */
const CALL_LEAD_RX = /^[\s"'«»“”*\-—–…,.!?]*(?:о[хй]|а[хй]|э[йх]|ну|слушай|послушай|погоди|подожди|постой|прошу|пожалуйста|эм|мм+|oh|ah|hey|hm+|well|look|listen|please|wait|um+)?[\s,…!?.\-—–]*/iu;

function nameCalled(text, name) {
    const sentences = String(text || '').split(/[.!?…\n]+/);
    for (const raw of sentences) {
        let part = raw.replace(/[*_`]/g, ' ').trim();
        if (!part) continue;
        part = part.replace(CALL_LEAD_RX, '').trim();
        const low = normTurn(part);
        for (const alias of aliasNamesOf(name)) {
            const n = normTurn(alias);
            if (!n || n.length < 2) continue;
            if (low === n) return true;                      // the whole sentence is the name
            if (low.startsWith(n)) {
                const rest = low.slice(n.length).trim();
                if (!rest) return true;                      // nothing after it
                if (/^[,:;!?…]/.test(rest)) return true;     // "Alex, come here"
            }
        }
    }
    return false;
}

function lastPartner(cast) {
    // whoever spoke last among those present — the conversation already under way
    const chat = getContext().chat || [];
    for (let i = chat.length - 1; i >= Math.max(0, chat.length - 12); i--) {
        const m = chat[i];
        if (!m || m.is_user || m.is_system) continue;
        const hit = cast.find(c => normTurn(c.name) === normTurn(m.name));
        if (hit) return hit;
    }
    return null;
}

/* A name written in the other alphabet («Алекс», «Лео», «Марка» for Alex, Leo, Mark):
   compared by its sound — the consonants in order, whether it starts on a vowel, and at least one
   vowel in common — so that "лес" is not Leo and "или" is not anyone. The word is put back as the
   cast name, and the usual reading of the line goes on from there. */
function soundKey(w) {
    let x = /[а-яё]/i.test(w) ? translit(w) : String(w || '').toLowerCase();
    x = x.replace(/w/g, 'u').replace(/y/g, 'i').replace(/(.)\1+/g, '$1');
    const vowelFirst = /^[aeiou]/.test(x);
    const cons = x.replace(/[^a-z]/g, '').replace(/[aeiou]/g, '');
    return { k: (vowelFirst ? 'V' : '') + cons, v: new Set(x.replace(/[^aeiou]/g, '').split('')) };
}
function soundsLike(word, name) {
    if (word.length < 3) return false;
    const a = soundKey(word), b = soundKey(name);
    if (!a.k || !b.k) return false;
    const same = a.k === b.k || a.k.replace(/s$/, '') === b.k.replace(/s$/, '') || (a.k.startsWith(b.k) && a.k.length - b.k.length <= 1 && b.k.length >= 2);
    return same && [...a.v].some(c => b.v.has(c));
}
function turnSpell(text, cast) {
    const names = cast.map(c => c.name).filter(n => /^[\p{L}-]+$/u.test(String(n).split(/\s+/)[0] || ''));
    return String(text || '').replace(/[\p{L}]+/gu, w => {
        const low = w.toLowerCase().replace(/ё/g, 'е');
        if (cast.some(c => aliasNamesOf(c.name).some(a => normTurn(a) === low))) return w;   // already a name it knows
        const hit = names.filter(n => soundsLike(w, String(n).split(/\s+/)[0]));
        return hit.length === 1 ? hit[0] : w;
    });
}
function pickByText(text, cast) {
    text = turnSpell(text, cast);
    const parts = splitLine(text);

    // 1. addressed by name inside speech: "Victor, …" / "…, Victor?"
    const vocative = cast.filter(c => parts.speech.some(q => addressedIn(q, c.name).direct));
    if (vocative.length === 1) return { name: vocative[0].name, isNpc: !!vocative[0].isNpc, confidence: 0.95, why: 'addressed' };

    // 1b. the name stands alone as a call — quotes may be missing or unbalanced
    const called = cast.filter(c => nameCalled(text, c.name));
    if (called.length === 1) return { name: called[0].name, isNpc: !!called[0].isNpc, confidence: 0.92, why: 'called by name' };

    // 2. looked at, turned to, nodded at in the action
    const gaze = cast.filter(c => parts.actions.some(a => gazeAt(a, c.name)));
    if (gaze.length === 1) return { name: gaze[0].name, isNpc: !!gaze[0].isNpc, confidence: 0.9, why: 'looked at' };

    // 3. a plain line with no quotes at all still gets the old reading
    if (!parts.speech.length && !parts.actions.some(a => /\S/.test(a) && a !== text)) {
        const plain = pickPlain(text, cast);
        if (plain.name) return plain;
    }

    // 4. alone with one character: there is nobody else to answer
    if (cast.length === 1) return { name: cast[0].name, isNpc: !!cast[0].isNpc, confidence: 0.9, why: 'only one here' };

    // 5. nobody new addressed: the conversation carries on with whoever it was with
    if (settings.passContinue) {
        const partner = lastPartner(cast);
        if (partner) return { name: partner.name, isNpc: !!partner.isNpc, confidence: 0.8, why: 'conversation continues' };
    }
    return { name: '', confidence: 0, why: 'nobody addressed' };
}

function pickPlain(text, cast) {
    const all = cast.map(c => ({ name: c.name, isNpc: !!c.isNpc, ...addressedIn(text, c.name) })).filter(h => h.hit);
    const hits = all.filter(h => !h.about);
    if (!hits.length) {
        // everyone named was only being discussed: nobody is being asked anything
        return { name: '', confidence: 0, why: all.length ? 'only talked about' : 'nobody named' };
    }
    const direct = hits.filter(h => h.direct);
    if (direct.length === 1) return { name: direct[0].name, isNpc: direct[0].isNpc, confidence: 0.95, why: 'addressed' };
    if (direct.length > 1) return { name: '', confidence: 0, why: 'several addressed' };
    if (hits.length === 1) return { name: hits[0].name, isNpc: hits[0].isNpc, confidence: 0.5, why: 'named only' };
    return { name: '', confidence: 0, why: 'several named' };
}

async function askWhoSpeaks(cast, text) {
    const roster = cast.map(c => `- ${c.name}`).join('\n');
    const sys = settings.language === 'ru'
        ? 'Ты ведёшь групповую сцену. Отвечай только JSON.'
        : 'You are directing a group scene. Answer with JSON only.';
    const user = (settings.language === 'ru'
        ? `КТО ПРИСУТСТВУЕТ:\n${roster}\n\nПОСЛЕДНЯЯ РЕПЛИКА:\n${text}\n\nНазови того единственного, чьего ответа действительно ждут: к кому обратились, кого спросили, обвинили, тронули. Если ни на кого конкретно не указывает — верни пустое имя, это нормальный ответ.\nТолько JSON: {"speaker":"","confidence":0.0}`
        : `WHO IS PRESENT:\n${roster}\n\nTHE LAST LINE:\n${text}\n\nName the one character whose reply is genuinely expected — addressed, asked, accused, touched. If nothing points at anyone in particular, return an empty name; that is a normal answer.\nJSON only: {"speaker":"","confidence":0.0}`);
    const raw = await callAI(sys, user, waitFor(20000), 1000);
    const obj = typeof raw === 'string' ? JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) : raw;
    const want = normTurn(obj && obj.speaker);
    const found = cast.find(c => normTurn(c.name) === want) || (want ? cast.find(c => normTurn(c.name).startsWith(want)) : null);
    return { name: found ? found.name : '', isNpc: found ? !!found.isNpc : false, confidence: Math.max(0, Math.min(1, Number(obj && obj.confidence) || 0)), why: 'side model' };
}

let turnNoteFor = '';
function soloVoiceNote(name) {
    if (!settings.passEnabled || !settings.passSoloVoice || !name) {
        turnNoteFor = '';
        setExtensionPrompt(TURN_KEY, '', 0, 0, false);
        return;
    }
    turnNoteFor = name;
    const txt = settings.language === 'ru'
        ? `\n[Пиши только за ${name}. Не пиши реплики, мысли и действия за других персонажей сцены — они отвечают сами. Никогда не упоминай эту заметку.]\n`
        : `\n[Write only as ${name}. Do not write dialogue, thoughts or actions for the other characters present — they answer for themselves. Never mention this note.]\n`;
    setExtensionPrompt(TURN_KEY, txt, 2, 0, false, extension_prompt_roles.SYSTEM);
}

function turnLog(msg) { console.log(`[Living Scene] turn: ${msg}`); }
const pause = (ms) => new Promise(r => setTimeout(r, ms));

/* Wait until SillyTavern has finished whatever it is doing. The player's own
   message is still inside the group wrapper when MESSAGE_SENT fires; starting a
   reply before that wrapper returns sends it down the wrong path. */
function stBusy() {
    if (typeof ST.isGenerating === 'function') return ST.isGenerating();
    // older builds do not export the flag; the Stop button is shown for exactly that time
    const stop = document.getElementById('mes_stop');
    return !!(stop && stop.offsetParent !== null && getComputedStyle(stop).display !== 'none');
}
async function stIdle(ms = 15000) {
    const busy = stBusy;
    const t0 = Date.now();
    await pause(150);
    while (Date.now() - t0 < ms) {
        if (!busy()) return true;
        await pause(200);
    }
    return false;
}

const turnHandled = new Set();   // messages already decided, so a late signal cannot run it twice
let turnQueued = null;           // a message that arrived while the previous one was being decided
/* The key was the message's number alone. Delete a reply and write again, or
   regenerate, and the new message gets the SAME number — it was taken for one already
   decided and nobody answered it, silently. The time it was sent and its text tell
   the two apart. */
function turnKey(messageId, msg) {
    const m = msg || {};
    return `${getContext().chatId || ''}#${messageId}#${m.send_date || ''}#${String(m.mes || '').length}`;
}

async function passTheTurn(messageId, fromUser) {
    // Deliberately NOT gated on the main Living Scene switch: that one is for the
    // thought bubbles. Handing the turn over is its own feature with its own toggle.
    if (!settings.passEnabled) { turnLog('skipped — "hand the turn over" is off in the settings'); return null; }
    const key = turnKey(messageId, (getContext().chat || [])[messageId]);
    if (turnHandled.has(key)) return null;
    // Busy deciding the previous one: this message waits its turn instead of being
    // marked done and dropped.
    if (turnBusy) { turnLog('busy deciding — this one waits'); turnQueued = { id: messageId, fromUser }; return null; }
    turnHandled.add(key);
    if (turnHandled.size > 200) turnHandled.delete(turnHandled.values().next().value);
    if (fromUser ? !settings.passAfterUser : !settings.passBetween) {
        if (fromUser) turnLog('skipped — "after my message" is off');
        return null;
    }
    if (!fromUser && turnChain >= Math.max(0, settings.passChain || 0)) { turnLog(`skipped — ${turnChain} replies in a row already`); return null; }
    if (!selected_group) { turnLog('skipped — not a group chat'); return null; }

    // On any automatic strategy the group already answers on its own; two directors
    // means three characters in the queue instead of one.
    if (groupStrategy() !== GROUP_MANUAL) {
        turnLog('skipped — the group is not set to reply manually');
        if (!turnWarned) { turnWarned = true; toastr.info(t('turn_needs_manual')); }
        return null;
    }
    // No wait here: /trigger itself waits until SillyTavern is free. A lock of our
    // own could stay shut after a manual-mode send, when no reply ever ends it.

    const chat = getContext().chat || [];
    const msg = chat[messageId];
    if (!msg || msg.is_system) { turnLog(`skipped — message #${messageId} not found`); return null; }

    // exploring alone: one game master, never a character called from the next room, never two
    const solo = mapSolo();
    if (solo && !fromUser) { turnLog('skipped — exploring alone: the game master has answered'); return null; }
    let cast = solo ? [soloNarrator()].filter(Boolean) : turnCast(fromUser ? null : msg.name);
    if (settings.passNoRepeat && !fromUser && msg.name) cast = cast.filter(c => normTurn(c.name) !== normTurn(msg.name));
    if (!cast.length) { turnLog('skipped — no enabled member to answer · ' + (solo ? 'exploring alone · ' : '') + turnWhyEmpty()); return null; }
    turnLog(`can answer: ${cast.map(c => c.name).join(', ')}`);

    turnBusy = true;
    try {
        let pick = solo ? { name: cast[0].name, isNpc: false, confidence: 1, why: 'exploring alone: the game master' } : pickByText(String(msg.mes || ''), cast);
        if (!solo && pick.confidence < settings.passConfidence && settings.passAskModel && apiKey()) {
            try { pick = await askWhoSpeaks(cast, String(msg.mes || '').slice(-1200)); }
            catch (e) { console.warn('[Living Scene] turn: side model failed', e); }
        }
        if (!pick.name || pick.confidence < settings.passConfidence) {
            turnLog(`nobody — ${pick.why || 'unclear'} (${pick.confidence})`);
            soloVoiceNote('');
            /* On Manual, a generation with no character named makes SillyTavern pick a
               random ENABLED member itself — muted ones are never drawn. That is exactly
               the fallback wanted here, and it is the same path regeneration takes. */
            if (fromUser && settings.passFallbackRandom) {
                const c = getContext();
                if (typeof c.generate === 'function') {
                    turnLog('→ nobody addressed: SillyTavern picks a random enabled member');
                    turnChain++;
                    c.generate('normal');
                }
            }
            return null;
        }
        soloVoiceNote(solo ? '' : pick.name);   // the map's rule says who speaks while exploring; "only as …" would contradict it
        turnChain++;
        const ctx = getContext();
        /* The speech bubble next to a group member calls Generate('normal',
           { force_chid }) — nothing else. SillyTavern exposes that same function to
           extensions as context.generate, so that is what is called here: no slash
           command, no name to match, the character index and nothing more. */
        // the card that is IN this group — a library can hold two characters of one name
        const chars = ctx.characters || [];
        const g = (groups || []).find(x => x && x.id === selected_group);
        const inGroup = new Set((g && g.members) || []);
        let chid = chars.findIndex(c => c && inGroup.has(c.avatar) && normTurn(c.name) === normTurn(pick.name));
        if (chid < 0) chid = chars.findIndex(c => c && normTurn(c.name) === normTurn(pick.name));
        if (chid < 0) { turnLog(`${pick.name} was chosen but is not in the character list`); return null; }
        if (typeof ctx.generate !== 'function') { turnLog('this SillyTavern does not expose generate()'); return null; }

        turnLog(`→ ${pick.name} (${pick.why}, ${pick.confidence}) · character #${chid}`);

        /* The group wrapper begins with "if already generating, return" — and returns
           silently. So the call is repeated until the wrapper really starts, which
           the GROUP_WRAPPER_STARTED event confirms. */
        /* A retry used to follow a fixed 900 ms. Before the group starts, SillyTavern
           pings its own server — on a slow connection that alone takes longer, the
           "not started" check fired, and a SECOND generate went out while the first
           was still on its way: two wrappers raced past the busy check and the scene
           got a double reply. Now each call is awaited: it either really starts, or
           returns at once because the group was busy (then it is tried again), or —
           taking long without either — is left alone rather than duplicated. */
        const hasStartEvt = !!event_types.GROUP_WRAPPER_STARTED;
        let started = false;
        const onStart = () => { started = true; };
        if (hasStartEvt) eventSource.on(event_types.GROUP_WRAPPER_STARTED, onStart);
        // a half-typed line in the box would be sent along as your message; keep it aside
        const ta = document.getElementById('send_textarea');
        const draft = ta ? String(ta.value || '') : '';
        if (draft && ta) { ta.value = ''; ta.dispatchEvent(new Event('input', { bubbles: true })); }
        const giveDraftBack = () => {
            if (!draft || !ta) return;
            const now = String(ta.value || '');
            ta.value = now ? draft + ' ' + now : draft;
            ta.dispatchEvent(new Event('input', { bubbles: true }));
        };
        let run = null;
        try {
            for (let attempt = 1; attempt <= 4 && !started; attempt++) {
                if (!(await stIdle())) { turnLog('SillyTavern stayed busy for 15s — not triggered'); break; }
                let settled = false;
                run = Promise.resolve().then(() => ctx.generate('normal', { force_chid: chid })).catch(e => { console.warn('[Living Scene] turn: generate failed', e); });
                run.then(() => { settled = true; });
                if (!hasStartEvt) { started = true; break; }        // cannot confirm on this build
                const t0 = Date.now();
                while (!started && !settled && Date.now() - t0 < 12000) await pause(100);
                if (started) break;
                if (!settled) { turnLog('the group is taking long to start — not sending a second request'); started = true; break; }
                turnLog(`attempt ${attempt}: the group was still busy, trying again`);
            }
        } finally {
            if (hasStartEvt && typeof eventSource.removeListener === 'function') {
                eventSource.removeListener(event_types.GROUP_WRAPPER_STARTED, onStart);
            }
        }
        // the "write only as …" note belongs to THIS reply; left in place it told the
        // next character you summoned by hand to write as someone else
        const myNote = pick.name;
        const after = () => { giveDraftBack(); if (turnNoteFor === myNote) soloVoiceNote(''); };
        if (run && started) run.then(after); else after();
        if (!started) { turnLog('the group never started — giving up'); return null; }
        if (settings.passToast) toastr.info(t('turn_picked', { name: pick.name }));
        return pick;
    } finally {
        turnBusy = false;
        const q = turnQueued; turnQueued = null;
        // only if it is still the newest message: an older one would answer out of place
        if (q && q.id === (getContext().chat || []).length - 1) setTimeout(() => passTheTurn(q.id, q.fromUser), 150);
    }
}

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
    const persona = await personaFor(b.name);
    const sys = `You write ONE short ambient background reaction for the character "${b.name}" (${persona}), who is present in the scene but not the current speaker.
Rules:
- Exactly ONE line, max 18 words, sharply in their voice, as ${kindTxt}.
- CONSISTENT with the scene facts; grounded in a concrete detail (an object, a gesture, a spoken word).
- It MUST be clearly DIFFERENT from their previous line: "${String(b.text).slice(0, 160)}".
- No narration, no asterisks. Language: ${genLang()}.
Output strictly JSON: {"kind":"say","text":""}`;
    try {
        const res = await callAI(sys, `SCENE (latest last):\n${tail}`, 0, 2000);
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
    dropMemberMarks();
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
        const av = isNpc ? null : memberAvatar(name);
        const on = av ? !memberMuted(av) : isPresent(name);          // a member: the group's own switch
        const unset = av ? on : st.present[name] === undefined;
        const byMap = unset ? mapWhere(name) : null;    // placed by RPG Map's "Who is where"
        const isAuto = !byMap && unset && settings.autoPresence;   // picked by the scene, not by hand
        const meta = (st.meta && st.meta[name]) || {};
        return `<div class="rls-row">
            ${avatarHtml(name)}
            <span class="rls-row-name">${escapeHtml(name)}</span>
            ${byMap ? `<span class="rls-auto" title="${escapeHtml(t('roster_map_hint'))}">${t('roster_map')}</span>` : isAuto ? `<span class="rls-auto">${t('roster_auto')}</span>` : ''}
            <i class="fa-solid fa-pen rls-meta-edit" data-name="${escapeHtml(name)}" title="${escapeHtml(t('roster_edit_title'))}"></i>
            ${isNpc ? `<i class="fa-solid fa-trash rls-npc-del" data-name="${escapeHtml(name)}"></i>` : ''}
            <div class="rls-toggle ${on ? 'on' : ''}" data-name="${escapeHtml(name)}" data-npc="${isNpc ? 1 : 0}"${av ? ` data-member="${escapeHtml(av)}" title="${escapeHtml(t('roster_member_sw'))}"` : ''}><div class="rls-knob"></div></div>
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

    body.find('.rls-toggle').on('click', async function () {
        const nm = $(this).data('name');
        const av = $(this).attr('data-member');
        if (av) { await setMemberMuted(av, !memberMuted(av)); renderRoster(); return; }
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
function settingsHtml() {
    // open groups in frames, as the Map and Character Lens have them
    const sub = (title, body) => `
            <div class="rls-sub">
                <div class="rls-subhead">${title}</div>${body}
            </div>`;
    const num = (label, id, attrs) => `<div class="rls-row"><label for="${id}">${label}</label><input type="number" id="${id}" class="text_pole" ${attrs}></div>`;
    const hint = key => `<div class="rls-hint">${t(key)}</div>`;
    return `
<div class="extension_settings rls-settings">
    <div class="inline-drawer">
        <div class="rls-drawer-toggle inline-drawer-header" style="cursor:pointer;">
            <b><i class="fa-solid fa-masks-theater"></i> ${t('set_header')}</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content" id="rls-drawer" style="display:none;">
            <div class="rls-top">
                <label class="checkbox_label"><input type="checkbox" id="rls-enabled"> ${t('set_enable')}</label>
                <select id="rls-lang" class="text_pole" title="${escapeHtml(t('set_lang'))}" aria-label="${escapeHtml(t('set_lang'))}">
                    <option value="en">English</option><option value="ru">Русский</option>
                </select>
            </div>
            ${sub(`🔌 ${t('set_api')}`, `
                <input type="text" id="rls-base" class="text_pole" placeholder="${t('set_url')}" aria-label="${t('set_url')}">
                <input type="password" id="rls-key" class="text_pole" placeholder="${t('set_key')}" aria-label="${t('set_key')}">
                <input type="text" id="rls-model" class="text_pole" placeholder="${t('set_model')}" aria-label="${t('set_model')}">
                ${num(t('set_temp'), 'rls-temp', 'step="0.1" min="0" max="2"')}
                <div class="rls-calls-line">${t('set_calls')} <b id="rls-calls-n">0</b></div>`)}
            ${sub(`💬 ${t('set_logic')}`, `
                ${num(t('set_chance'), 'rls-chance', 'min="0" max="100"')}
                ${num(t('set_max'), 'rls-max', 'min="1" max="4"')}
                ${num(t('set_cooldown'), 'rls-cd', 'min="0" max="20"')}
                <label class="checkbox_label"><input type="checkbox" id="rls-react-user"> ${t('set_react_user')}</label>
                <div class="rls-in">${num(t('set_react_user_chance'), 'rls-user-chance', 'min="0" max="100"')}</div>
                <label class="checkbox_label"><input type="checkbox" id="rls-thoughts"> ${t('set_thoughts')}</label>
                <label class="checkbox_label"><input type="checkbox" id="rls-chatter"> ${t('set_chatter')}</label>
                <div class="rls-in">${num(t('set_chatter_chance'), 'rls-chatter-chance', 'min="0" max="100"')}</div>
                <label class="checkbox_label"><input type="checkbox" id="rls-actions"> ${t('set_actions')}</label>
                <label class="checkbox_label"><input type="checkbox" id="rls-quote"> ${t('set_quote_reply')}</label>
                <label class="checkbox_label"><input type="checkbox" id="rls-inject"> ${t('set_inject')}</label>
                <div class="rls-in">${num(t('set_inject_depth'), 'rls-inject-depth', 'min="0" max="20"')}</div>
                ${num(t('set_off_left'), 'rls-off-left', 'min="0" max="800"')}
                ${num(t('set_off_right'), 'rls-off-right', 'min="0" max="800"')}`)}
            ${sub(`🎬 ${t('set_turn')}`, `
                <label class="checkbox_label"><input type="checkbox" id="rls-pass"> <b>${t('set_pass')}</b></label>
                ${hint('set_pass_hint')}
                <div class="rls-in">
                    <label class="checkbox_label"><input type="checkbox" id="rls-pass-after"> ${t('set_pass_after')}</label>
                    <label class="checkbox_label"><input type="checkbox" id="rls-pass-between"> ${t('set_pass_between')}</label>
                    <label class="checkbox_label"><input type="checkbox" id="rls-pass-norepeat"> ${t('set_pass_norepeat')}</label>
                    <label class="checkbox_label"><input type="checkbox" id="rls-pass-ask"> ${t('set_pass_ask')}</label>
                    <label class="checkbox_label"><input type="checkbox" id="rls-pass-solo"> ${t('set_pass_solo')}</label>
                    <label class="checkbox_label"><input type="checkbox" id="rls-pass-continue"> ${t('set_pass_continue')}</label>
                    <label class="checkbox_label"><input type="checkbox" id="rls-pass-random"> ${t('set_pass_random')}</label>
                    <label class="checkbox_label"><input type="checkbox" id="rls-pass-toast"> ${t('set_pass_toast')}</label>
                    ${num(t('set_pass_chain'), 'rls-pass-chain', 'min="0" max="5"')}
                    ${num(t('set_pass_conf'), 'rls-pass-conf', 'step="0.05" min="0" max="1"')}
                    <div class="rls-manual">
                        <input type="button" id="rls-pass-manual" class="menu_button" value="${t('turn_btn_manual')}">
                        <div class="rls-hint">${t('turn_btn_hint')}</div>
                        <div id="rls-pass-state" class="rls-hint rls-state"></div>
                    </div>
                </div>`)}
            ${sub(`👥 ${t('set_sec_cast')}`, `
                <label class="checkbox_label"><input type="checkbox" id="rls-auto"> ${t('set_auto')}</label>
                <label class="checkbox_label"><input type="checkbox" id="rls-mappres"> ${t('set_mappres')}</label>
                <label class="checkbox_label"><input type="checkbox" id="rls-autonpc"> ${t('set_autonpc')}</label>
                ${hint('set_autonpc_hint')}`)}
            ${sub(`🎭 ${t('set_sec_roles')}`, `
                <label class="checkbox_label"><input type="checkbox" id="rls-faces"> ${t('set_faces')}</label>
                ${hint('set_faces_hint')}
                <div class="rls-in">
                    <label class="checkbox_label"><input type="checkbox" id="rls-parts-auto"> ${t('set_parts_auto')}</label>
                    <label class="checkbox_label"><input type="checkbox" id="rls-parts-fold"> ${t('set_parts_fold')}</label>
                    <label class="checkbox_label"><input type="checkbox" id="rls-parts-code"> ${t('set_parts_code')}</label>
                    <label class="checkbox_label"><input type="checkbox" id="rls-parts-solo"> ${t('set_parts_solo')}</label>
                    <small class="rls-hint">${t('parts_fix_hint')}</small>
                    <div class="rls-row stack"><label for="rls-parts-style">${t('set_parts_style')}</label><select id="rls-parts-style" class="text_pole"><option value="glass">${t('style_glass')}</option><option value="ink">${t('style_ink')}</option><option value="classic">${t('style_classic')}</option></select></div>
                    <div class="rls-row stack"><label for="rls-parts-anim">${t('set_parts_anim')}</label><select id="rls-parts-anim" class="text_pole"><option value="none">${t('anim_none')}</option><option value="fade">${t('anim_fade')}</option><option value="type">${t('anim_type')}</option></select></div>
                    <label class="checkbox_label"><input type="checkbox" id="rls-parts-fonts"> ${t('set_parts_fonts')}</label>
                </div>`)}
            ${sub(`📖 ${t('set_sec_novel')}`, `
                <label class="checkbox_label"><input type="checkbox" id="rls-novel-btn"> ${t('set_novel_btn')}</label>
                <div class="rls-row stack"><label for="rls-novel-box">${t('set_novel_box')}</label><select id="rls-novel-box" class="text_pole"><option value="parchment">${t('box_parchment')}</option><option value="glass">${t('box_glass')}</option><option value="grimoire">${t('box_grimoire')}</option><option value="ribbon">${t('box_ribbon')}</option><option value="twilight">${t('box_twilight')}</option></select></div>
                <div class="rls-row stack"><label for="rls-novel-sprite">${t('set_novel_sprite')}</label><select id="rls-novel-sprite" class="text_pole"><option value="large">${t('sprite_large')}</option><option value="medium">${t('sprite_medium')}</option><option value="waist">${t('sprite_waist')}</option></select></div>
                <div class="rls-row stack"><label for="rls-novel-face">${t('set_novel_face')}</label><select id="rls-novel-face" class="text_pole"><option value="nosprite">${t('face_nosprite')}</option><option value="always">${t('face_always')}</option><option value="never">${t('face_never')}</option></select></div>
                <label class="checkbox_label"><input type="checkbox" id="rls-novel-hud"> ${t('set_novel_hud')}</label>
                <label class="checkbox_label"><input type="checkbox" id="rls-novel-place"> ${t('set_novel_place')}</label>
                <div class="rls-row stack"><label>${t('set_novel_info')}</label><div class="rls-checks">${['time', 'date', 'place', 'weather'].map(k => `<label class="checkbox_label"><input type="checkbox" id="rls-novel-info-${k}" class="rls-novel-info" data-k="${k}"> ${t('info_' + k)}</label>`).join('')}</div></div>
                <div class="rls-row stack"><label for="rls-novel-fight">${t('set_novel_fight')}</label><select id="rls-novel-fight" class="text_pole"><option value="combat">${t('fight_combat')}</option><option value="always">${t('fight_always')}</option><option value="off">${t('fight_off')}</option></select></div>
                <div class="rls-row stack rls-fight-more"><label>${t('fight_show')}</label><div class="rls-checks">${['hp', 'food', 'fatigue', 'mana'].map(k => `<label class="checkbox_label"><input type="checkbox" id="rls-novel-fshow-${k}" class="rls-novel-fshow" data-k="${k}"> ${t('fight_' + k)}</label>`).join('')}</div></div>
                <input type="button" id="rls-novel-open" class="menu_button" value="${t('set_novel_open')}">`)}
            ${sub(`🗜 ${t('set_sec_compress')}`, `
                <label class="checkbox_label"><input type="checkbox" id="rls-compress"> ${t('set_compress')}</label>
                ${num(t('set_compress_over'), 'rls-compress-over', 'min="100" max="4000" step="50"')}`)}
        </div>
    </div>
</div>`;
}

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
        if (!this.checked) closeNovel();
        if (this.checked) restoreOnLoad();
        else { clearAllBubbles(); updateInjection(); }
    });
    $('#rls-lang').val(settings.language || 'en').on('change', function () {
        settings.language = $(this).val(); saveSettings();
        setupUI();
        novelMenuItem();
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
    $('#rls-pass').prop('checked', settings.passEnabled).on('change', function () { settings.passEnabled = this.checked; saveSettings(); if (!this.checked) setExtensionPrompt(TURN_KEY, '', 0, 0, false); });
    const paintTurnState = () => {
        const el = document.getElementById('rls-pass-state');
        if (!el) return;
        if (!selected_group) { el.textContent = t('turn_no_group'); return; }
        el.textContent = groupStrategy() === GROUP_MANUAL ? t('turn_state_manual') : t('turn_state_auto');
    };
    $('#rls-pass-manual').on('click', async () => { await setGroupManual(); paintTurnState(); });
    paintTurnState();

    $('#rls-pass-after').prop('checked', settings.passAfterUser).on('change', function () { settings.passAfterUser = this.checked; saveSettings(); });
    $('#rls-pass-between').prop('checked', settings.passBetween).on('change', function () { settings.passBetween = this.checked; saveSettings(); });
    $('#rls-pass-norepeat').prop('checked', settings.passNoRepeat).on('change', function () { settings.passNoRepeat = this.checked; saveSettings(); });
    $('#rls-pass-continue').prop('checked', settings.passContinue).on('change', function () { settings.passContinue = this.checked; saveSettings(); });
    $('#rls-pass-random').prop('checked', settings.passFallbackRandom).on('change', function () { settings.passFallbackRandom = this.checked; saveSettings(); });
    $('#rls-pass-ask').prop('checked', settings.passAskModel).on('change', function () { settings.passAskModel = this.checked; saveSettings(); });
    $('#rls-pass-solo').prop('checked', settings.passSoloVoice).on('change', function () { settings.passSoloVoice = this.checked; saveSettings(); if (!this.checked) setExtensionPrompt(TURN_KEY, '', 0, 0, false); });
    $('#rls-pass-chain').val(settings.passChain).on('change', function () {
        const v = parseInt(this.value, 10); settings.passChain = Number.isFinite(v) ? Math.max(0, Math.min(5, v)) : 1;
        this.value = settings.passChain; saveSettings();
    });
    $('#rls-pass-conf').val(settings.passConfidence).on('change', function () {
        const v = parseFloat(this.value); settings.passConfidence = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.7;
        this.value = settings.passConfidence; saveSettings();
    });
    $('#rls-inject').prop('checked', settings.injectBarks).on('change', function () { settings.injectBarks = this.checked; saveSettings(); updateInjection(); });
    $('#rls-inject-depth').val(settings.injectDepth).on('change', function () { settings.injectDepth = Math.max(0, parseInt($(this).val()) || 0); $(this).val(settings.injectDepth); saveSettings(); updateInjection(); });
    $('#rls-quote').prop('checked', settings.quoteReply).on('change', function () { settings.quoteReply = this.checked; saveSettings(); });
    $('#rls-actions').prop('checked', settings.allowActions).on('change', function () { settings.allowActions = this.checked; saveSettings(); });
    $('#rls-autonpc').prop('checked', settings.autoNpc).on('change', function () { settings.autoNpc = this.checked; saveSettings(); });
    $('#rls-faces').prop('checked', settings.lineFaces !== false).on('change', function () { settings.lineFaces = this.checked; saveSettings(); renderAllParts(); });
    $('#rls-off-left').val(settings.offsetLeft).on('change', function () { settings.offsetLeft = Math.max(0, parseInt($(this).val()) || 0); $(this).val(settings.offsetLeft); saveSettings(); syncBubbles(); });
    $('#rls-off-right').val(settings.offsetRight).on('change', function () { settings.offsetRight = Math.max(0, parseInt($(this).val()) || 0); $(this).val(settings.offsetRight); saveSettings(); syncBubbles(); });
    $('#rls-parts-auto').prop('checked', settings.partsAuto !== false).on('change', function () { settings.partsAuto = this.checked; saveSettings(); });
    $('#rls-parts-style').val(settings.partsStyle).on('change', function () { settings.partsStyle = this.value; saveSettings(); renderAllParts(); });
    $('#rls-parts-anim').val(settings.partsAnim).on('change', function () { settings.partsAnim = this.value; saveSettings(); });
    $('#rls-parts-fold').prop('checked', settings.partsFold !== false).on('change', function () { settings.partsFold = this.checked; saveSettings(); renderAllParts(); });
    $('#rls-parts-code').prop('checked', settings.partsCodeFirst !== false).on('change', function () { settings.partsCodeFirst = this.checked; saveSettings(); });
    $('#rls-parts-solo').prop('checked', settings.partsSolo === true).on('change', function () { settings.partsSolo = this.checked; saveSettings(); renderAllParts(); });
    $('#rls-parts-fonts').prop('checked', settings.partsFonts !== false).on('change', function () { settings.partsFonts = this.checked; saveSettings(); renderAllParts(); });
    $('#rls-novel-btn').prop('checked', settings.novelBtn !== false).on('change', function () { settings.novelBtn = this.checked; saveSettings(); renderAllParts(); });
    const novelLook = () => { if (novel && novel.look) novel.look(); };
    $('#rls-novel-box').val(settings.novelBox).on('change', function () { settings.novelBox = this.value; saveSettings(); novelLook(); });
    $('#rls-novel-sprite').val(settings.novelSprite).on('change', function () { settings.novelSprite = this.value; saveSettings(); novelLook(); });
    $('#rls-novel-face').val(settings.novelFace).on('change', function () { settings.novelFace = this.value; saveSettings(); novelLook(); });
    $('#rls-novel-hud').prop('checked', settings.novelHud !== false).on('change', function () { settings.novelHud = this.checked; saveSettings(); novelLook(); });
    $('.rls-novel-info').each(function () { this.checked = settings.novelInfo[this.dataset.k] !== false; }).on('change', function () { settings.novelInfo[this.dataset.k] = this.checked; saveSettings(); novelLook(); });
    const fightMore = () => $('.rls-fight-more').toggle(settings.novelFight !== 'off');
    $('#rls-novel-fight').val(settings.novelFight).on('change', function () { settings.novelFight = this.value; saveSettings(); fightMore(); novelLook(); });
    $('.rls-novel-fshow').each(function () { this.checked = !!settings.novelFightShow[this.dataset.k]; }).on('change', function () { settings.novelFightShow[this.dataset.k] = this.checked; saveSettings(); novelLook(); });
    fightMore();
    $('#rls-novel-place').prop('checked', settings.novelPlace !== false).on('change', function () { settings.novelPlace = this.checked; saveSettings(); novelLook(); });
    $('#rls-novel-open').on('click', () => { if (!settings.enabled) { toastr.info(t('set_enable')); return; } if (isChatOpen()) openNovel(); });
    $('#rls-pass-toast').prop('checked', !!settings.passToast).on('change', function () { settings.passToast = this.checked; saveSettings(); });
    $('#rls-compress').prop('checked', settings.compress !== false).on('change', function () { settings.compress = this.checked; saveSettings(); });
    $('#rls-compress-over').val(settings.compressOver).on('change', function () { const v = parseInt(this.value, 10); settings.compressOver = Number.isFinite(v) ? Math.max(100, Math.min(4000, v)) : 400; this.value = settings.compressOver; saveSettings(); });
    $('#rls-mappres').prop('checked', settings.mapPresence !== false).on('change', function () { settings.mapPresence = this.checked; saveSettings(); });
    $('#rls-auto').prop('checked', settings.autoPresence).on('change', function () { settings.autoPresence = this.checked; saveSettings(); });
}

/* ============================================================
   INIT
   ============================================================ */
/* ============================================================
   THE SCENE BY ROLES — a reply cut into blocks, one per person
   The side model reads the reply split into small pieces (each line in
   quotes, each sentence of narration, each dash line) and says whose
   each piece is. The pieces of one person in a row become one block with
   their face, on the left or the right, in the bubbles' glass. The
   message itself is never changed: the blocks are drawn in its place and
   the text comes back with one click, on edit, or with the switch off.
   The answer is kept on the message, per swipe (extra.rls_parts).
   ============================================================ */
const PARTS_MAX = 70;
function partsHash(text) { let h = 0; const s0 = String(text || ''); for (let i = 0; i < s0.length; i++) h = (h * 31 + s0.charCodeAt(i)) | 0; return String(h); }
// pieces of the raw text: { s, e, kind: 'say' | 'act' }, in order
// a piece as it is drawn: one cut inside *…* is closed and reopened, so the italics stay italics
function pieceText(text, s0, e0) {
    let piece = text.slice(s0, e0);
    const paraStart = text.lastIndexOf('\n', s0 - 1) + 1;
    const before = (text.slice(paraStart, s0).match(/(?<!\*)\*(?!\*)/g) || []).length;
    if (before % 2 === 1 && !/^\s*\*/.test(piece)) piece = '*' + piece.replace(/^\s+/, '');
    const inside = (piece.match(/(?<!\*)\*(?!\*)/g) || []).length;
    if (inside % 2 === 1) piece = /\*\s*$/.test(piece) && before % 2 === 0 && !/^\s*\*/.test(text.slice(s0, e0)) ? piece : piece.replace(/\s+$/, '') + '*';
    return piece;
}
/* The model's own thinking left in the reply (<think>…</think>, <thinking>, <reasoning>) is not
   the story: nobody says it and nobody does it. It is blanked out — same length, so every piece
   still points at the right place in the real text — and never cut into pieces. */
const THINK_RE = /<(think|thinking|reasoning|reflection)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
function blankThinking(text) {
    return String(text).replace(THINK_RE, m => m.replace(/[^\n]/g, ' '));
}
const ABBR_END = /(?:^|[\s(«"“*_])(?:Mr|Mrs|Ms|Mx|Dr|Prof|St|Sr|Jr|Sgt|Lt|Capt|Col|Gen|Rev|Fr|Mt|vs|etc|e\.g|i\.e|\p{Lu}|г|гг|т|тт|ул|им|проф|св|др|см)\.$/u;
function splitPieces(mes) {
    const text = String(mes || '').replace(/\r\n?/g, '\n');
    const scan = blankThinking(text);   // what is cut: the text with the thinking blanked out
    const out = [];
    const push = (s0, e0, kind) => {
        while (s0 < e0 && /\s/.test(scan[s0])) s0++;
        while (e0 > s0 && /\s/.test(scan[e0 - 1])) e0--;
        if (e0 > s0) out.push({ s: s0, e: e0, kind });
    };
    // narration: sentence by sentence — inside *…* too (a whole paragraph in italics is several people's
    // sentences); a piece cut inside the italics gets its asterisks back when it is drawn (pieceText)
    const narr = (s0, e0) => {
        const chunk = scan.slice(s0, e0);
        const re = /[^.!?…]+(?:[.!?…]+["»”*]*|$)/g;
        let m, from = -1;
        while ((m = re.exec(chunk)) && m[0]) {
            const ps = s0 + m.index, pe = ps + m[0].length;
            if (from < 0) from = ps;
            // "Mr. Park", "Dr. Grey", "J. R. Smith": a title or an initial ends with a dot but not the sentence
            if (pe < e0 && ABBR_END.test(m[0])) continue;
            push(from, pe, 'act');
            from = -1;
        }
        if (from >= 0) push(from, e0, 'act');
    };
    let at = 0;
    scan.split('\n').forEach(line => {
        const ls = at; at += line.length + 1;
        if (!line.trim()) return;
        // (the whole line may sit in italics or bold: "*— Ready, miss. — he said.*" is still a dash dialogue line)
        if (/^[\s ]*[*_]*[\s ]*[—–]/.test(line) && !/[«"“]/.test(line)) {
            // a dash dialogue line: speech and the author's words take turns, split at " — "
            const re = /[\s ][—–][\s ]/g;
            let last = ls, m, speech = true;
            while ((m = re.exec(line))) { push(last, ls + m.index, speech ? 'say' : 'act'); last = ls + m.index + 1; speech = !speech; }
            push(last, ls + line.length, speech ? 'say' : 'act');
            return;
        }
        const qre = /«[^»\n]*»|"[^"\n]*"|“[^”\n]*”|„[^“”\n]*[“”]/g;
        let last = ls, m;
        while ((m = qre.exec(line))) {
            narr(last, ls + m.index);
            push(ls + m.index, ls + m.index + m[0].length, 'say');
            last = ls + m.index + m[0].length;
        }
        narr(last, ls + line.length);
    });
    // a very long reply: neighbouring narration in one paragraph is asked about together
    while (out.length > PARTS_MAX) {
        let merged = false;
        for (let i = out.length - 2; i >= 0 && out.length > PARTS_MAX; i--) {
            const a0 = out[i], b0 = out[i + 1];
            if (a0.kind === 'act' && b0.kind === 'act' && !text.slice(a0.e, b0.s).includes('\n')) { a0.e = b0.e; out.splice(i + 1, 1); merged = true; }
        }
        if (!merged) break;
    }
    return { text, pieces: out };
}
function partsSys() {
    return `You read one roleplay reply that has been cut into numbered pieces. For EACH piece say whose it is:
- a spoken line: the person who says it;
- an action, a gesture, a look, an inner state: the person it is about;
- narration about the place, the weather, several people at once, or nobody in particular: "-".
Use the names exactly as listed under CAST when it is one of them (aliases count as that person). The player is "${getContext().name1 || name1 || 'User'}".
Someone new who is not in the cast: use the name the text gives them; if the text never names them, a short label from the text (for example "the girl") — in the reply's own language and words, as the text calls them (a Russian reply: "камердинер", not "the valet") — the same label every time; a label listed under LABELLED BEFORE is reused for the same person.
A label is for a person only — never an object, a wound, a body part or a place. Narration about things, rooms or what someone finds is "-" unless it is clearly that person's own action.
When PRESENT NOW is given, a cast member who is not in it is not in the scene: a piece that only mentions them is not theirs.
Follow who is meant by "he", "she", "they" from the pieces around and from the earlier messages.
A sentence about another person inside someone's paragraph ("Megumin, however, was already asleep") is that other person's.
Never guess who is behind something nobody is named or meant in ("The hallway door clicks open behind you" with no one seen): that is "-".
A spoken line is never "-": somebody says it. A line and its tag ("…," he began / «…», — сказал он) belong to the same person, and so do the lines one person says in a row.
If you truly cannot tell, "?".
A piece that ends in "→ Name" is already settled by the text itself: give it that name (you may leave it out of the answer).
Also say how each cast member who appears is actually written in this reply, if it differs from the cast name (a card named «Уильям» may be "William" in an English reply).
For every spoken piece also say how the speaker feels saying it, one word from this list: ${spriteLabels().join(', ')}.
Answer with JSON only: the number of every piece and whose it is, the written forms, and the feelings —
{"who":{"0":"Name","1":"-","2":"?",...},"forms":{"Cast name":["form as written"]},"feel":{"1":"joy",...}}`;
}
function partsUser(messageId, pieces, text, settled = null) {
    const ctx = getContext();
    const st = sceneState();
    const cast = faceCandidates().filter(c => c.kind !== 'user' && !(c.kind === 'card' && isWorldCard(c.name))).map(c => {
        const al = String((st.meta && st.meta[c.name] && st.meta[c.name].aliases) || '').trim();
        return `- ${c.name}${al ? ` (also: ${al})` : ''}`;
    });
    // the earlier replies without the model's thinking in them: it is not the story, and it is tokens
    const prev = (ctx.chat || []).slice(Math.max(0, messageId - 2), messageId)
        .filter(m => m && !m.is_system).map(m => `${m.name}: ${blankThinking(String(m.mes || '')).replace(/\s+/g, ' ').trim().slice(-600)}`).join('\n');
    const lines = pieces.map((p, i) => `[${i}] ${text.slice(p.s, p.e).replace(/\s+/g, ' ').slice(0, 300)}${settled && settled[i] ? `  → ${settled[i]}` : ''}`).join('\n');
    // two short facts instead of more history: who the Scene Card has in the scene, and the labels already given
    const present = presentNowFor(messageId);
    const labelled = labelsBefore(messageId);
    return `CAST:\n${cast.join('\n') || '- (nobody listed)'}\n\n${present.length ? `PRESENT NOW (the scene tracker):\n${present.join(', ')}\n\n` : ''}${labelled.length ? `LABELLED BEFORE (unnamed people of the earlier replies):\n${labelled.join(', ')}\n\n` : ''}EARLIER:\n${prev || '(none)'}\n\nTHE REPLY (written as ${ctx.chat[messageId]?.name || ''}):\n${lines}\n\n{"who":{...}} with every number from 0 to ${pieces.length - 1}.`;
}
// the model's names, checked: someone in the cast, the player, or a name that is really in the text
function partsClean(who, pieces, text, messageId) {
    const cands = faceCandidates();
    const ctx = getContext();
    const near = (ctx.chat || []).slice(Math.max(0, messageId - 3), messageId).map(m => m.mes || '').join(' ') + ' ' + text;
    const known = new Map();
    return pieces.map((p, i) => {
        let w = String((Array.isArray(who) ? who[i] : '') ?? '').trim().slice(0, 60);
        if (!w || w === '-' || w === '?') return w === '?' ? '?' : '-';
        if (known.has(w.toLowerCase())) return known.get(w.toLowerCase());
        const hit = cands.find(c => c.name.toLowerCase() === w.toLowerCase()) || onlyOne(namesIn(w, cands));
        // a world card ("… Manor & Atelier", «Академия …») is nobody — unless this reply writes its whole name
        if (hit && hit.kind === 'card' && isWorldCard(hit.name) && !text.toLowerCase().includes(hit.name.toLowerCase())) return p.kind === 'say' ? '?' : '-';   // the world's own telling is narration
        let out = hit ? hit.name : '';
        if (!out) {
            // someone new: their name (or the label) must be in the text, so nothing is made up
            const hay = near.toLowerCase().replace(/ё/g, 'е');
            // (articles and little words do not count: "The Cook" is not in the text because "the" is)
            out = w.split(/\s+/).filter(part => !SMALL_WORDS.has(part.toLowerCase())).some(part => { const pr = nameStem(part).replace(/ё/g, 'е'); return pr.length >= 3 && hay.includes(pr); }) ? w : '?';
            // the same stranger as in the replies before ("the young servant girl" then "the servant girl"): one label
            if (out !== '?') out = sameStranger(out, messageId) || out;
            // a label the story already tied to a name ("the teacher" → Mr. Park): the name
            if (out !== '?' && /^(the |a |an )?[\p{Ll}]/u.test(out)) out = labelName(out, messageId, text) || out;
        }
        known.set(w.toLowerCase(), out);
        return out;
    });
}
// who the Scene Card has in the scene at this reply (its own card, else the latest one before it)
function presentNowFor(messageId) {
    try {
        const chat = getContext().chat || [];
        for (let i = messageId; i >= 0 && i >= messageId - 20; i--) {
            const d = chat[i] && chat[i].extra && chat[i].extra.rpg_info_box;
            if (d && Array.isArray(d.characters)) return [...new Set(d.characters.map(c => String((c && c.name) || '').trim()).filter(Boolean))].slice(0, 12);
            if (d) return [];
        }
    } catch (e) { /* no Scene Card */ }
    return [];
}
// the labels unnamed people got in the replies before (cast names excluded), newest first
function labelsBefore(messageId) {
    const out = [];
    try {
        const chat = getContext().chat || [];
        const cast = new Set(faceCandidates().map(c => c.name.toLowerCase()));
        for (let i = messageId - 1; i >= 0 && i >= messageId - 12 && out.length < 8; i--) {
            const parts = chat[i] && chat[i].extra && chat[i].extra.rls_parts;
            const saved = parts && typeof parts === 'object' ? parts[chat[i].swipe_id ?? 0] : null;
            (saved && Array.isArray(saved.w) ? saved.w : []).forEach(w => { const x = String(w || '').trim(); if (x && x !== '-' && x !== '?' && !cast.has(x.toLowerCase()) && !out.includes(x) && out.length < 8) out.push(x); });
        }
    } catch (e) { /* none */ }
    return out;
}
/* An unnamed person the model labelled in an earlier reply keeps that label: the model sees one
   reply at a time and calls the same girl "the young servant girl", then "the servant girl" — two
   colours, two faces. Labels whose words (without "the", "young"…) are the same, or one inside
   the other, are one person; the earlier label stays. */
function labelWords(label) {
    return String(label || '').toLowerCase().replace(/ё/g, 'е').split(/[^\p{L}\p{N}]+/u).filter(w => w && !SMALL_WORDS.has(w)).map(w => nameStem(w));
}
function sameStranger(label, messageId) {
    try {
        const mine = labelWords(label);
        if (!mine.length) return null;
        const chat = getContext().chat || [];
        const cast = new Set(faceCandidates().map(c => c.name.toLowerCase()));
        for (let i = messageId - 1; i >= 0 && i >= messageId - 12; i--) {
            const parts = chat[i] && chat[i].extra && chat[i].extra.rls_parts;
            if (!parts || typeof parts !== 'object') continue;
            const saved = parts[chat[i].swipe_id ?? 0];
            const seen = [...new Set((saved && Array.isArray(saved.w) ? saved.w : []).filter(x => x && x !== '-' && x !== '?' && !cast.has(String(x).toLowerCase())))];
            for (const old of seen) {
                if (old.toLowerCase() === label.toLowerCase()) return old;
                const theirs = labelWords(old);
                if (!theirs.length) continue;
                const inside = (a0, b0) => a0.every(w => b0.includes(w));
                if (inside(mine, theirs) || inside(theirs, mine)) return old;
            }
        }
    } catch (e) { /* keep the label as it is */ }
    return null;
}
/* how a cast member is written in the replies, as the model reported it: kept as quiet aliases
   (scene meta "auto"), but only forms that are really in the reply, a few per person */
/* A card named like a place, a school, a company or a service ("The Nocturne Manor & Atelier (N.M.A.) -
   Fantasy Butler Service", «Академия Красный Завет») is the world the story happens in, not someone in
   it. It is not offered to the model as a person, and a piece the model gives it anyway is left open. */
const WORLD_EN = /\b(manor|academy|academia|atelier|service|services|school|college|university|institute|hall|castle|palace|tower|towers|estate|mansion|company|corporation|agency|guild|club|hotel|inn|tavern|cafe|café|kingdom|empire|realm|world|city|town|village|island|station|hospital|clinic|prison|asylum|orphanage|church|temple|monastery|order|society|household|family|rpg|simulator|scenario|adventure|chronicles?)\b/i;
const WORLD_RU = /(?<![\p{L}])(академи[яиюей]|школ[аыеуой]|колледж[аеу]?|университет[аеу]?|институт[аеу]?|особняк[аеу]?|поместь[еяю]|замок|замка|замке|дворец|дворца|дворце|башн[яиею]|компани[яию]|агентств[оае]|гильди[яию]|клуб[ае]?|отел[ьяе]|гостиниц[аые]|таверн[аые]|трактир[ае]?|кафе|королевств[оае]|импери[яию]|мир|мире|город[ае]?|деревн[яие]|остров[ае]?|станци[яи]|больниц[аые]|клиник[аие]|тюрьм[аые]|приют[ае]?|храм[ае]?|монастыр[ьяе]|орден[ае]?|обществ[оае]|семейств[оае]|сценари[йя]|приключени[ея]|хроник[аи])(?![\p{L}])/iu;
function isWorldCard(name) {
    const n = String(name || '').trim();
    if (!n) return false;
    // the name itself, without its subtitle: "Sam (Yandere)" and "Sam - your neighbour" are still Sam
    const main = n.split(/\s[-–—:|]\s|[(\[]/)[0].trim();
    if (/&/.test(main)) return true;                                   // "Manor & Atelier": two things, not a person
    // "Ren the Hotel Manager" is a person: a word for someone in the name keeps it a person
    if (main.toLowerCase().replace(/ё/g, 'е').split(/[^\p{L}-]+/u).some(w => PERSON_NOUNS.has(w) || /^(manager|owner|keeper|master|mistress|headmaster|director|principal|maid|butler|управляющ\p{L}*|хозя\p{L}*|директор\p{L}*)$/u.test(w))) return false;
    if (WORLD_EN.test(main) || WORLD_RU.test(main)) return true;
    const words = main.split(/\s+/).filter(w => !SMALL_WORDS.has(w.toLowerCase()));
    return words.length >= 4;                                          // a title, not a name
}
/* A card that is a world, not a person ("Академия Красный Завет", a narrator card): its name is
   never written in the story, and a small model hands it every piece of the reply, then reports
   the real speaker as "how the card is written" — forms: { "Академия…": ["the student", "Ilya"] }.
   When the card's name stands nowhere in this reply or the messages before it, the pieces given
   to it go to the person the model named for it (a name that is really in the reply, not a label
   like "the student"), and that name is not learned as the card's alias. */
function worldCardFix(raw, forms, text, messageId) {
    try {
        if (!forms || typeof forms !== 'object' || Array.isArray(forms)) return forms;
        const ctx = getContext();
        const cards = faceCandidates().filter(c => c.kind === 'card');
        const around = (ctx.chat || []).slice(Math.max(0, messageId - 10), messageId).map(m => (m && m.mes) || '').join(' ') + ' ' + text;
        const low = String(text || '').toLowerCase();
        const me = String(ctx.name1 || name1 || '').toLowerCase();
        const out = Object.assign({}, forms);
        Object.keys(forms).forEach(key => {
            const c = cards.find(x => x.name.toLowerCase() === String(key).trim().toLowerCase());
            if (!c || !raw.some(w => String(w || '').trim().toLowerCase() === c.name.toLowerCase())) return;
            if (namesIn(around, [c]).length) return;                   // the card's name is in the story: a person after all
            const list = (Array.isArray(forms[key]) ? forms[key] : [forms[key]]).map(x => String(x || '').trim());
            const person = list.find(f => {
                const first = f.split(/\s+/)[0] || '';
                return first.length >= 2 && /^\p{Lu}/u.test(first) && !SMALL_WORDS.has(first.toLowerCase()) && !PERSON_WORDS.test(first) && !YOU_WORDS.test(first)
                    && first.toLowerCase() !== me && new RegExp(`(?<![\\p{L}])${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'iu').test(low);
            });
            // a world card has no name of its own to fall back on: the model's label for the person
            // ("the student", «камердинер»), when the reply really says it, is better than the card
            const label = !person && isWorldCard(c.name) ? list.find(f => {
                const word = (f.toLowerCase().replace(/ё/g, 'е').split(/\s+/).filter(x => !SMALL_WORDS.has(x)).pop() || '');
                return f.length >= 3 && f.length <= 40 && word.length >= 3 && low.replace(/ё/g, 'е').includes(nameStem(word));
            }) : null;
            if (label) {
                for (let i = 0; i < raw.length; i++) if (String(raw[i] || '').trim().toLowerCase() === c.name.toLowerCase()) raw[i] = label;
                delete out[key];
                console.log(`[Living Scene] roles: "${c.name}" is a place, not a person — its pieces go to "${label}", as the model called them`);
                return;
            }
            if (!person) return;
            for (let i = 0; i < raw.length; i++) if (String(raw[i] || '').trim().toLowerCase() === c.name.toLowerCase()) raw[i] = person;
            delete out[key];
            console.log(`[Living Scene] roles: "${c.name}" is never named in the story — its pieces go to ${person}, as the model named them`);
        });
        return out;
    } catch (e) { return forms; }
}
function learnForms(forms, text) {
    if (!forms || typeof forms !== 'object' || Array.isArray(forms)) return;
    const cands = faceCandidates();
    const st = sceneState();
    const low = String(text || '').toLowerCase();
    let changed = false;
    Object.keys(forms).forEach(key => {
        const c = cands.find(x => x.name.toLowerCase() === String(key).trim().toLowerCase());
        if (!c || c.kind === 'user') return;
        const list = (Array.isArray(forms[key]) ? forms[key] : [forms[key]]).map(x => String(x || '').trim()).filter(x => x.length >= 3 && x.length <= 40);
        list.forEach(f => {
            const first = f.split(/\s+/)[0];
            if (!first || first.length < 3 || !low.includes(first.toLowerCase())) return;   // only what is really written there
            if (aliasNamesOf(c.name).some(a => a.toLowerCase() === f.toLowerCase())) return;
            const meta = st.meta[c.name] || (st.meta[c.name] = {});
            meta.auto = (Array.isArray(meta.auto) ? meta.auto : []).concat(f).slice(-6);
            changed = true;
        });
    });
    if (changed) { candCache = null; saveScene(); }
}
const SMALL_WORDS = new Set(['the', 'a', 'an', 'of', 'and', 'old', 'young', 'little', 'big', 'his', 'her', 'their', 'my', 'your', 'mr', 'mrs', 'ms', 'miss', 'sir', 'lady', 'lord', 'и', 'в', 'на', 'с', 'у', 'его', 'её', 'ее', 'их', 'мой', 'твой', 'старый', 'старая', 'молодой', 'молодая']);
// "he", "she", "they" may mean anyone; "you" in a reply means the player and nobody else
const SCENE_STARTS = new Set(['it', 'there', 'this', 'that', 'then', 'suddenly', 'somewhere', 'outside', 'inside', 'behind', 'above', 'below', 'nearby', 'silence', 'вдруг', 'где-то', 'снаружи', 'внутри', 'там', 'тут', 'это', 'затем', 'потом', 'за', 'под', 'над', 'тишина', 'издалека', 'снова']);
const PERSON_WORDS = /(?<![\p{L}])(he|she|him|her|his|hers|they|them|their|i|me|my|we|us|our|он|она|его|её|ее|ему|ей|им|ими|они|их|я|мне|меня|мой|моя|мы|нас)(?![\p{L}])/iu;
const YOU_WORDS = /(?<![\p{L}])(you|your|yours|ты|тебя|тебе|тобой|твой|твоя|твоё|вы|вас|вам|ваш)(?![\p{L}])/iu;
/* ---- reading the reply by its own signs (no model) ----
   Each piece gets a name and how sure that is, or nothing. Sure means the text says it:
   - a sentence that opens with someone's name ("Sam's eyes widen…", "Алекс даже не поднял…");
   - "you…" / «вы…» opening it: the player;
   - "he/she…" opening it: the person last named in this or the paragraph before, if that person
     has not been called the other "he/she" in this reply;
   - a line with its tag in the same paragraph ("…," he murmurs / «…», — сказал он), or an action
     beat right before it ("Sam folded his arms. 'Fine.'"); lines one after another in a paragraph;
   - only one character of the chat in the scene and nobody else named: every line is theirs;
   - a sentence about a thing or a place with no person in it: narration.
   Anything else is left for the model. */
const PRON_M = /^(he|him|his|он|его|ему|им)$/i, PRON_F = /^(she|her|hers|она|её|ее|ей)$/i;
// words for "somebody" that say nothing about who: never made into a label by rule
const VAGUE_PEOPLE = new Set(['figure', 'voice', 'someone', 'somebody', 'crowd', 'people', 'men', 'women', 'shape', 'silhouette', 'фигура', 'голос', 'кто-то', 'толпа', 'люди', 'силуэт']);
// people a sentence can open with when nobody is named ("A maid…", «Незнакомец…»): never narration by rule
const PERSON_NOUNS = new Set(('man woman girl boy child kid maid servant guard figure stranger lady gentleman butler valet footman soldier knight priest doctor nurse '
    + 'waiter waitress merchant driver coachman voice someone somebody crowd people men women officer clerk student master mistress king queen prince princess '
    + 'lord duke duchess count countess captain sailor maiden youth elder hunter thief assassin mage wizard witch healer cook housekeeper governess nanny boss '
    + 'teacher professor instructor tutor pupil classmate janitor librarian curator director headmaster headmistress principal guardsman bartender innkeeper '
    + 'учитель учительница преподаватель профессор ученик ученица студентка директор библиотекарь смотритель смотрительница уборщик бармен трактирщик '
    + 'мужчина женщина девушка парень служанка слуга стражник стража фигура незнакомец незнакомка ребенок дама господин госпожа дворецкий камердинер лакей '
    + 'солдат рыцарь священник доктор врач медсестра официант официантка торговец кучер голос кто-то толпа люди офицер студент хозяин хозяйка король королева '
    + 'принц принцесса горничная мальчик девочка старик старуха юноша капитан матрос охотник вор маг ведьма лекарь повар экономка гувернантка няня').split(' '));
/* "The teacher's mug clinks…" / "A maid curtsied…" / «Незнакомец шагнул…»: the label "the teacher",
   "the maid", «незнакомец» — unless a character of the chat is called that (their name or aliases). */
function strangerAtStart(raw, cands) {
    const orig = String(raw || '').replace(/^[\s*_"«“„—–-]+/, '').split(/[^\p{L}'’-]+/u).filter(Boolean).slice(0, 5);
    const words = orig.map(w => w.toLowerCase().replace(/ё/g, 'е')).slice(0, 4);
    if (!words.length) return null;
    const art = /^(the|a|an)$/.test(words[0]);
    const from = art ? 1 : 0;
    for (let k = from; k < Math.min(words.length, from + 3); k++) {
        const w = words[k].replace(/['’]s$/, '');
        const isP = x => PERSON_NOUNS.has(x) && !VAGUE_PEOPLE.has(x);
        const base = isP(w) ? w : isP(w.replace(/s$/, '')) ? w.replace(/s$/, '') : null;
        if (!base && (VAGUE_PEOPLE.has(w) || VAGUE_PEOPLE.has(w.replace(/s$/, '')))) return null;   // "A figure…" — who it is comes later
        if (!base) { if (!art) return null; continue; }   // Russian: the person word comes first; English: adjectives may stand before it
        if (cands.some(c => aliasNamesOf(c.name).some(a => String(a).toLowerCase().replace(/ё/g, 'е').split(/\s+/).includes(base)))) return null;
        if (orig[k + 1] && /^\p{Lu}/u.test(orig[k + 1])) return null;     // "Teacher Park…", «Профессор Грей…»: a name follows — not a stranger
        return art ? `the ${base}` : base;
    }
    return null;
}
/* "The teacher" of this reply is the "Mr. Park, the computer science teacher" of the one before:
   a label is given the name the story tied it to — "Name, the … teacher", "the teacher, Name",
   "teacher Name", «Илья, учитель информатики», «учитель Пак» — in the narration of this reply or the
   six before it (never inside spoken lines, where people are only addressed). */
const NAME_RE = String.raw`((?:(?:Mr|Mrs|Ms|Miss|Dr|Prof|Professor|Sir|Lady|Lord|Master|Madam|Madame|Mister)\.?\s+)?\p{Lu}[\p{L}'’-]+(?:\s+\p{Lu}[\p{L}'’-]+)?)`;
function labelName(label, messageId, text) {
    try {
        const base = String(label || '').toLowerCase().split(/\s+/).pop();
        if (!base || base.length < 3) return null;
        const ctx = getContext();
        const me = String(ctx.name1 || name1 || '').toLowerCase();
        const noQuotes = x => blankThinking(String(x || '')).replace(/["“«„][^"”»\n]*["”»]/g, m => ' '.repeat(m.length)).replace(/(^|\n)\s*[—–][^\n]*/g, m => ' '.repeat(m.length));
        const stem = /[а-яё]/i.test(base) ? nameStem(base).replace(/ё/g, 'е') : base;
        const noun = /[а-яё]/i.test(base) ? `${stem}\\p{L}*` : `${base}s?`;
        const pats = [
            new RegExp(`${NAME_RE},\\s+(?:(?:the|a|an|his|her|their|our)\\s+)?(?:[\\p{L}-]+\\s+){0,3}${noun}(?![\\p{L}])`, 'gu'),
            new RegExp(`(?<![\\p{L}])(?:the\\s+)?(?:[\\p{L}-]+\\s+){0,2}${noun},\\s+${NAME_RE}`, 'giu'),
            new RegExp(`(?<![\\p{L}])${noun}\\s+${NAME_RE}`, 'giu'),
        ];
        const ok = n => {
            const first = n.replace(/^(?:Mr|Mrs|Ms|Miss|Dr|Prof|Professor|Sir|Lady|Lord|Master|Madam|Madame|Mister)\.?\s+/, '').split(/\s+/)[0].toLowerCase().replace(/ё/g, 'е');
            return first.length >= 2 && !SMALL_WORDS.has(first) && !OPENER_WORDS.has(first) && !SCENE_STARTS.has(first) && !PRON_M.test(first) && !PRON_F.test(first) && !YOU_WORDS.test(first) && first !== me && !(me && n.toLowerCase().includes(me));
        };
        const chat = ctx.chat || [];
        const texts = [text].concat(chat.slice(Math.max(0, messageId - 6), messageId).reverse().filter(m => m && !m.is_system).map(m => m.mes));
        for (const tx of texts) {
            const hay = noQuotes(tx);
            for (const re of pats) {
                re.lastIndex = 0;
                let m;
                while ((m = re.exec(hay))) {
                    // in the second and third shapes the name may be followed by a small word picked up by the
                    // case-blind match ("teacher Han and"): keep only the capitalised words
                    const n = String(m[1]).split(/\s+/).filter((w, i) => i === 0 || /^\p{Lu}/u.test(w)).join(' ');
                    if (/^\p{Lu}/u.test(n) && ok(n)) return n;
                }
            }
        }
    } catch (e) { /* no name for it */ }
    return null;
}
/* People the story names who are in no list (Felix, Ilya): a capitalised word that opens a sentence
   with a verb after it and comes back at least twice in the reply or the two before it, or that the
   Scene Card lists as present. Used only by the text's own reading below. */
// a name in Latin letters, the way it sounds: «Алиса» → "alisa", "Alice" → "alice"
function latinOf(name) {
    const T = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
    return String(name || '').toLowerCase().split('').map(ch => T[ch] ?? ch).join('').replace(/w/g, 'u').replace(/[^a-z]/g, '');
}
// close enough to be the same name in two alphabets (only between different alphabets' spellings)
function sameSound(a, b) {
    if (!a || !b || a.length < 3 || b.length < 3) return false;
    const d = (() => { const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; })();
    return a[0] === b[0] && d / Math.max(a.length, b.length) <= 0.4;
}
const OPENER_WORDS = new Set(('not never nothing nobody none instead yet still again once twice finally almost already always perhaps maybe probably surely really well okay ok oh ah hmm uh um good fine right sorry thanks please funny strange lost silence however meanwhile somewhere someone something everyone everything anyone anything another other each every both all most some many few one two three first last next later soon too also either neither whatever whoever outside inside across around between beyond under over through toward towards against along beside besides despite until unless though although because since whether once '
    + 'не нет ни ничего никто ничто вместо всё все весь вся снова опять наконец почти уже всегда наверное конечно ладно хорошо спасибо пожалуйста странно тишина однако кто-то что-то кто-нибудь где-то никогда каждый другой один одна два три сначала потом позже скоро тоже также или хотя потому пока сквозь через между над под вокруг рядом против').split(/\s+/));
function namesFromText(text, messageId, cands) {
    try {
        const ctx = getContext();
        const around = blankThinking(((ctx.chat || []).slice(Math.max(0, messageId - 2), messageId).map(m => (m && m.mes) || '').join('\n\n')) + '\n\n' + text);   // (each reply its own paragraphs)
        const known = cands.flatMap(c => c.probes);
        // a cast member written in another alphabet («Алекс» for Alex) is someone we know, not a new person
        const cyr = x => /[а-яё]/i.test(x);
        const castFirst = cands.flatMap(c => [c.name].concat(aliasNamesOf(c.name))).map(n => String(n).split(/\s+/)[0]);
        const isKnown = w => known.some(pr => w.toLowerCase().replace(/ё/g, 'е').startsWith(pr.slice(0, Math.max(3, pr.length - 1))))
            || castFirst.some(n => cyr(n) !== cyr(w) && sameSound(latinOf(w), latinOf(n)));
        const count = new Map(), personLike = new Set();
        const re = /(?:^|[.!?…]\s+|\n\s*|[*_]\s*|["«“]\s*)(\p{Lu}[\p{Ll}'’]{2,})(?:['’]s)?\s+\p{Ll}/gu;
        let m;
        while ((m = re.exec(around))) {
            const w = m[1];
            const low = w.toLowerCase().replace(/ё/g, 'е');
            if (SMALL_WORDS.has(low) || SCENE_STARTS.has(low) || PRON_M.test(low) || PRON_F.test(low) || PERSON_NOUNS.has(low) || /^(i|you|your|we|they|this|that|these|those|there|here|what|when|where|why|how|yes|no|but|and|then|still|even|just|only|now|so|if|as|for|with|without|after|before|while|maybe|perhaps|вы|ты|мы|они|это|эта|этот|когда|где|как|что|почему|да|нет|но|и|а|вдруг|похоже|кажется|может|только|даже|теперь|потом|затем|здесь|там|тут|если|пока|уже|еще|ещё|время|время)$/.test(low)) continue;
            if (isKnown(w)) continue;
            // a word that opens sentences but is not a name ("Not yet.", "Instead, he…", «Тихо стало»):
            // the list below, an English adverb in -ly, or the same word written small somewhere around
            if (OPENER_WORDS.has(low) || /^\p{L}{3,}ly$/u.test(low) || new RegExp(`(?<![\\p{L}])${low}(?![\\p{L}])`, 'u').test(around)) continue;
            count.set(w, (count.get(w) || 0) + 1);
            // a person, not the rain: the rest of the paragraph says "he"/"she" or has a spoken line in it
            const rest = around.slice(m.index + m[0].length, (around.indexOf('\n\n', m.index + m[0].length) + 1 || around.length + 1) - 1);
            if (/(?<![\p{L}])(he|she|his|her|him|он|она|его|её|ее|ему|ей|им)(?![\p{L}])/iu.test(rest) || /["«“”]|(^|\n)\s*[—–]/.test(rest)) personLike.add(w);
        }
        const present = new Set(presentNowFor(messageId).map(x => String(x).toLowerCase()));
        // twice opening a sentence, or once opening one and once more anywhere ("Felix turned…" … "Felix, stop")
        const anywhere = w => (around.match(new RegExp(`(?<![\\p{L}])${w}(?![\\p{L}])`, 'gu')) || []).length;
        const found = [...count.entries()].filter(([w, n]) => present.has(w.toLowerCase()) || ((n >= 2 || anywhere(w) >= 2) && personLike.has(w))).map(([w]) => w);
        // someone the story introduces: "It is Mr. Park, the computer science teacher", «Это был Илья, староста»,
        // "Ilya, the student…" — a name next to a word for a person is a person, even said once
        const intro = new RegExp(`${NAME_RE},\\s+(?:(?:the|a|an|his|her|their|our)\\s+)?(?:[\\p{L}-]+\\s+){0,3}([\\p{L}-]+)`, 'gu');
        const plain = around.replace(/["“«„][^"”»\n]*["”»]/g, m => ' '.repeat(m.length));
        let k;
        while ((k = intro.exec(plain))) {
            const n = k[1], noun = k[2].toLowerCase().replace(/ё/g, 'е');
            const isPerson = PERSON_NOUNS.has(noun) || PERSON_NOUNS.has(noun.replace(/(s|es|ы|и|а|у|ом|ой|ей)$/, ''));
            const first = n.replace(/^(?:Mr|Mrs|Ms|Miss|Dr|Prof|Professor|Sir|Lady|Lord|Master|Madam|Madame|Mister)\.?\s+/, '').split(/\s+/)[0];
            const low = first.toLowerCase().replace(/ё/g, 'е');
            if (!isPerson || OPENER_WORDS.has(low) || SMALL_WORDS.has(low) || SCENE_STARTS.has(low) || isKnown(first) || found.includes(n)) continue;
            found.push(n);
        }
        return found.map(w => ({ name: w, pic: '', kind: 'text', probes: probesFor(w) }));
    } catch (e) { return []; }
}
function localWho(pieces, text, messageId) {
    try {
        const ctx = getContext();
        const me = String(ctx.name1 || name1 || '');
        const cands0 = faceCandidates().filter(c => !(c.kind === 'card' && isWorldCard(c.name)));
        const fromText = namesFromText(text, messageId, cands0);
        // the people this chat already met (a proper name, not a label like "the valet"): known by name
        const met = chatPeople().people.filter(n => /^\p{Lu}/u.test(n) && !castTwin(n, cands0) && !cands0.concat(fromText).some(c => c.name.toLowerCase() === n.toLowerCase()))
            // (only as written: «Марк» remembered from one reply does not claim "Mark" of another)
            .map(n => ({ name: n, pic: '', kind: 'text', probes: probesFor(n).filter(pr => /[а-яё]/i.test(pr) === /[а-яё]/i.test(n)) })).filter(c => c.probes.length);
        const cands = cands0.concat(fromText, met);
        const cast = cands.filter(c => c.kind !== 'user');
        const strip = x => String(x || '').replace(/^[\s*_"«“„—–-]+/, '');
        const para = pc => (text.slice(0, pc.s).match(/\n\s*\n/g) || []).length;
        const out = pieces.map(() => null);
        const gender = {};                 // name -> 'm' | 'f', as this reply calls them
        let lastName = null, lastPara = -1;
        const firstWord = x => (strip(x).match(/^[\p{L}'’-]+/u) || [''])[0];
        const nameAtStart = x => { const h = namesIn(strip(x).slice(0, 40), cands).find(z => z.at === 0); return h ? h.c.name : null; };
        // capitalised words inside sentences that are nobody we know: someone else may be speaking
        const strangers = (() => {
            const known = cands.flatMap(c => c.probes);
            const found = [];
            const re = /(?<![.!?…"«“—–]\s)(?<!^)(?<=\s)(\p{Lu}[\p{Ll}]{2,})/gmu;   // a dash line's first word opens a sentence too
            const body = blankThinking(text);
            let m;
            while ((m = re.exec(body))) {
                const w = m[1].toLowerCase();
                if (SMALL_WORDS.has(w) || SCENE_STARTS.has(w) || PRON_M.test(w) || PRON_F.test(w) || /^(i|you|your|вы|ты)$/.test(w)) continue;
                if (known.some(pr => w.startsWith(pr.slice(0, Math.max(3, pr.length - 1))))) continue;
                found.push(m[1]);
            }
            return found;
        })();
        // actions first
        pieces.forEach((pc, i) => {
            if (pc.kind === 'say') return;
            const raw = text.slice(pc.s, pc.e);
            const pp = para(pc);
            const nm = nameAtStart(raw);
            const fw = firstWord(raw).toLowerCase();
            if (nm) { out[i] = { w: nm, c: 0.95 }; lastName = nm; lastPara = pp; return; }
            // "It is Mr. Park, the teacher…", «Это был Илья…»: the one just revealed — and the "A figure steps
            // inside" right before it in the same paragraph was them too
            const reveal = strip(raw).match(/^(?:it|this|that)\s+(?:is|was)\s+|^это\s+(?:был[аио]?\s+)?/i);
            const rn = reveal ? nameAtStart(strip(raw).slice(reveal[0].length)) : null;
            if (rn) {
                out[i] = { w: rn, c: 0.9 }; lastName = rn; lastPara = pp;
                const pv = pieces[i - 1];
                if (pv && pv.kind !== 'say' && para(pv) === pp && (!out[i - 1] || out[i - 1].c < 0.85)) {
                    const lw = strip(text.slice(pv.s, pv.e)).toLowerCase().split(/[^\p{L}-]+/u).slice(0, 3);
                    if (lw.some(w => VAGUE_PEOPLE.has(w))) out[i - 1] = { w: rn, c: 0.85 };
                }
                return;
            }
            if (YOU_WORDS.test(fw) && fw === (fw.match(YOU_WORDS) || [''])[0].toLowerCase()) { out[i] = { w: me, c: 0.9 }; return; }
            // someone the text calls by what they are ("The teacher's mug…", «Учитель отставил…»): that person,
            // under the text's own word — not a character of the chat the model might pin it on
            const lab = strangerAtStart(raw, cands);
            const who = lab ? (labelName(lab, messageId, text) || lab) : null;
            if (who) { out[i] = { w: who, c: 0.85 }; lastName = who; lastPara = pp; return; }
            const fw2 = (strip(raw).match(/^[\p{L}'’-]+,\s+([\p{L}'’-]+)/u) || [])[1] || '';
            const pw = PRON_M.test(fw) || PRON_F.test(fw) ? fw : fw2.toLowerCase();
            const g = /^(he|she|он|она)$/i.test(pw) || PRON_M.test(fw) || PRON_F.test(fw) ? (PRON_M.test(pw) ? 'm' : PRON_F.test(pw) ? 'f' : null) : null;
            if (g && lastName && pp - lastPara <= 1 && (!gender[lastName] || gender[lastName] === g)) {
                gender[lastName] = g;
                out[i] = { w: lastName, c: 0.85 }; lastPara = pp; return;
            }
            const body = strip(raw);
            // "The squeak of his polished shoes…": no name, no "you", and only his (or only her) — the man (or
            // the woman) just named, when this reply has already called them so
            if (lastName && pp - lastPara <= 1 && !namesIn(body, cands).length && !YOU_WORDS.test(body) && !SCENE_STARTS.has(fw)) {
                const pr = (body.match(/(?<![\p{L}])(he|him|his|she|her|hers|they|them|their|i|me|my|we|us|our|он|его|ему|им|она|её|ее|ей|они|их|я|мы)(?![\p{L}])/giu) || []).map(x => x.toLowerCase());
                const gs = new Set(pr.map(x => PRON_M.test(x) ? 'm' : PRON_F.test(x) ? 'f' : 'x'));
                if (gs.size === 1 && !gs.has('x') && gender[lastName] === [...gs][0]) { out[i] = { w: lastName, c: 0.85 }; lastPara = pp; return; }
            }
            // a thing or a place doing something, with nobody in it: narration. "The rain taps…" yes;
            // "A maid curtsied…" no — a person noun near the start leaves it to the model
            const lead = body.toLowerCase().replace(/ё/g, 'е').split(/[^\p{L}-]+/u).slice(0, 4);
            const someone = lead.some(w => PERSON_NOUNS.has(w) || PERSON_NOUNS.has(w.replace(/(s|es|ы|и|а|у|ом|ой|ей)$/, '')));
            if (!someone && !PERSON_WORDS.test(body) && !YOU_WORDS.test(body) && !namesIn(body, cands).length) {
                if (SCENE_STARTS.has(fw)) { out[i] = { w: '-', c: 0.85 }; return; }
                if (SMALL_WORDS.has(fw)) { out[i] = { w: '-', c: 0.8 }; return; }
            }
            // "Behind him, the lights hum": a place word first, and the person only as an object — still the room
            if (!someone && SCENE_STARTS.has(fw) && !YOU_WORDS.test(body) && !namesIn(body, cands).length && !/(?<![\p{L}])(he|she|they|i|we|он|она|они|я|мы)(?![\p{L}])/iu.test(body)) { out[i] = { w: '-', c: 0.85 }; return; }
            // a short fragment right after someone's action in the same paragraph ("He doesn't ask. Not yet."): still them
            const prevA = pieces[i - 1];
            if (prevA && prevA.kind !== 'say' && para(prevA) === pp && out[i - 1] && out[i - 1].w !== '-' && body.split(/\s+/).filter(Boolean).length <= 3 && !namesIn(body, cands).length && !PERSON_WORDS.test(body) && !YOU_WORDS.test(body)) { out[i] = { w: out[i - 1].w, c: 0.85 }; return; }
        });
        // then the lines
        const voices = new Set();
        const meBeat = new Set();
        pieces.forEach((pc, i) => {
            if (pc.kind !== 'say') return;
            const pp = para(pc);
            const next = pieces[i + 1], prev = pieces[i - 1];
            const nextTxt = next ? strip(text.slice(next.s, next.e)) : '';
            // its tag: the bit right after it, starting small ("he murmurs", "— сказал он")
            if (next && next.kind !== 'say' && para(next) === pp && /^[\p{Ll},]/u.test(nextTxt.replace(/^[,\s]+/, '').charAt(0) || '') ) {
                const tagNm = namesIn(nextTxt.slice(0, 50), cands)[0];
                if (tagNm) { out[i] = { w: tagNm.c.name, c: 0.9 }; voices.add(tagNm.c.name); return; }
                if (out[i + 1] && out[i + 1].w !== '-' && out[i + 1].w !== me) { out[i] = { w: out[i + 1].w, c: Math.min(0.9, out[i + 1].c) }; voices.add(out[i + 1].w); return; }
            }
            // an action beat of someone right before it, in the same paragraph
            if (prev && prev.kind !== 'say' && para(prev) === pp && out[i - 1] && out[i - 1].w !== '-' && out[i - 1].w !== me) { out[i] = { w: out[i - 1].w, c: 0.85 }; voices.add(out[i - 1].w); return; }
            // an action beat of someone right after it, in the same paragraph ("Lost it, huh?" *His tone…*)
            if (next && next.kind !== 'say' && para(next) === pp && out[i + 1] && out[i + 1].w !== '-' && out[i + 1].w !== me && !(prev && prev.kind !== 'say' && para(prev) === pp && out[i - 1] && out[i - 1].w === me)) { out[i] = { w: out[i + 1].w, c: 0.85 }; voices.add(out[i + 1].w); return; }
            // right after the player's own action: it may be the player speaking — the model decides
            if (prev && prev.kind !== 'say' && para(prev) === pp && out[i - 1] && out[i - 1].w === me) meBeat.add(i);
        });
        // lines next to a settled line of the same paragraph; then the single voice of the scene
        for (let pass = 0; pass < 2; pass++) pieces.forEach((pc, i) => {
            if (pc.kind !== 'say' || out[i] || meBeat.has(i)) return;
            const pp = para(pc);
            for (const k of [i - 1, i + 1, i - 2, i + 2]) {
                const o = pieces[k];
                if (o && o.kind === 'say' && para(o) === pp && out[k] && out[k].w !== me) { out[i] = { w: out[k].w, c: 0.85 }; return; }
            }
        });
        const author = String((ctx.chat[messageId] && ctx.chat[messageId].name) || '');
        const castNames = cast.filter(c => c.kind !== 'text').map(c => c.name);
        const single = voices.size <= 1 && !strangers.length && (voices.size === 1 ? [...voices][0] : (castNames.length === 1 ? castNames[0] : (castNames.includes(author) && cast.length === 1 ? author : null)));
        if (single) pieces.forEach((pc, i) => { if (pc.kind === 'say' && !out[i] && !meBeat.has(i)) out[i] = { w: single, c: 0.8 }; });
        return out;
    } catch (e) { console.warn('[Living Scene] roles: reading by the text failed', e); return null; }
}

const partsBusy = new Set();
async function askParts(messageId, manual = false, again = false) {
    const ctx = getContext();
    const myChat = ctx.chatId;
    const msg = ctx.chat[messageId];
    if (!msg || msg.is_user || msg.is_system) return;
    if (!settings.enabled || settings.lineFaces === false) return;
    const swipeId = msg.swipe_id ?? 0;
    const key = `${myChat}#${messageId}#${swipeId}`;
    if (partsBusy.has(key)) return;
    const mes0 = String(msg.mes || '');     // the text as it was asked about (another extension may rewrite it meanwhile)
    const { text, pieces } = splitPieces(mes0);
    if (pieces.length < 2) { if (manual) toastr.info(t('parts_one')); return; }
    /* The text's own signs first — a name opening a sentence, "he said" after a line, an action
       beat before it, "you…" for the player, a room with nobody in it. What they settle for sure is
       not asked; when they settle all of it, the model is not called at all. */
    const local = settings.partsCodeFirst !== false ? localWho(pieces, text, messageId) : null;
    const sure = local ? local.map(x => (x && x.c >= 0.85 ? x.w : null)) : null;
    const allSure = !!(local && local.every(x => x && x.c >= 0.8));
    if (!allSure && !apiKey()) { if (manual) toastr.warning(t('gen_nokey')); return; }
    partsBusy.add(key);
    markPartsBusy(messageId, true);
    /* A model answer that fails, or that gives the whole reply to one person when the text clearly
       has more than one in it, is asked once more by itself — as pressing the button again did.
       The text's own reading (no model) is never asked again: it would say the same. */
    let retry = false;
    const mayRetry = !again && !allSure;
    try {
        let res;
        if (allSure) {
            res = { who: Object.fromEntries(local.map((x, i) => [i, x.w])) };
            console.log(`[Living Scene] roles: the text settled all ${pieces.length} pieces — the model was not asked`);
        } else try {
            if (sure) console.log(`[Living Scene] roles: the text settled ${sure.filter(Boolean).length} of ${pieces.length} pieces; the model is asked about the rest`);
            res = await callAI(partsSys(), partsUser(messageId, pieces, text, sure), waitFor(60000));
        }
        catch (e) {
            // a model on your own computer sometimes breaks its JSON with a stray line in the middle;
            // the numbered answers themselves are still there and are read one by one
            res = e && e.raw ? salvageParts(e.raw, pieces.length) : null;
            if (!res) throw e;
            console.warn('[Living Scene] roles: the answer was not clean JSON — read line by line');
        }
        if (getContext().chatId !== myChat) return;
        const now = getContext().chat[messageId];
        if (!now || (now.swipe_id ?? 0) !== swipeId) return;   // another swipe now: its own split comes with it
        // the reply was rewritten meanwhile (an extension tidying it, a continue): the answer was about the
        // old text — the new text is read once more instead of the split being dropped without a word
        if (String(now.mes || '') !== mes0) { if (!again) { console.log('[Living Scene] roles: the reply changed while it was read — reading the new text'); retry = true; } return; }
        // numbered answers: a skipped or merged piece can no longer shift every name after it
        let raw = null;
        const w0 = res && (res.who ?? res);
        if (Array.isArray(w0)) raw = w0.length === pieces.length ? w0 : null;   // a list is trusted only when it has them all
        else if (w0 && typeof w0 === 'object') raw = pieces.map((_, i) => w0[i] ?? w0[String(i)] ?? '?');
        if (!raw) { console.warn('[Living Scene] roles: no "who" in', res); if (mayRetry) { retry = true; return; } if (manual) toastr.warning(t('parts_failed')); return; }
        // what the text settled for sure stands, whatever the model said about it
        if (sure) sure.forEach((w, i) => { if (w) raw[i] = w; });
        const forms0 = worldCardFix(raw, res && res.forms, text, messageId);
        learnForms(forms0, text);
        const who = partsClean(raw, pieces, text, messageId);
        // where the model could not tell, the text's own weaker reading is better than "?"
        if (local) who.forEach((w, i) => { if (w === '?' && local[i] && local[i].w) who[i] = local[i].w; });
        if (!now.extra) now.extra = {};
        if (!now.extra.rls_parts || typeof now.extra.rls_parts !== 'object') now.extra.rls_parts = {};
        now.extra.rls_parts[swipeId] = { h: partsHash(mes0), p: pieces.map(x => [x.s, x.e, x.kind === 'say' ? 's' : 'a']), w: who, f: partsFeel(res && res.feel, pieces.length) };
        rememberPeople(who);
        saveScene();
        if (mayRetry) {
            const v = partsView(messageId);
            const people = new Set((v ? v.blocks : []).map(b => b.w).filter(w => w && w !== '-' && w !== '?'));
            const textSaw = new Set((local || []).filter(x => x && x.w && x.w !== '-' && x.w !== '?').map(x => x.w));
            const given = new Set(raw.map(w => String(w || '').trim()).filter(w => w && w !== '-' && w !== '?'));
            const dumped = given.size === 1 && !raw.some(w => String(w || '').trim() === '-') && pieces.some(x => x.kind === 'say') && pieces.some(x => x.kind !== 'say');
            if (people.size <= 1 && (textSaw.size >= 2 || (dumped && (!people.size || people.has([...given][0]))))) {
                console.log('[Living Scene] roles: the answer gave the whole reply to one person — asking once more');
                retry = true; return;
            }
        }
        partsJustSplit.add(`${messageId}#${swipeId}`);   // its words may come in one by one — once, now
        renderParts(messageId);
        if (novel && novel.refresh) novel.refresh(null);
        if (manual && !document.querySelector(`#chat .mes[mesid="${messageId}"] .rls-parts`)) toastr.info(t('parts_one'));
    } catch (e) {
        console.warn('[Living Scene] roles', e);
        if (mayRetry && getContext().chatId === myChat) retry = true;
        else if (manual) toastr.warning(t('parts_failed'));
    } finally {
        partsBusy.delete(key);
        markPartsBusy(messageId, false);
        // (the second ask puts the ring back in the same moment: nothing blinks)
        if (retry) askParts(messageId, manual, true);
    }
}
// the numbered pairs of a broken answer: "who" (and "feel") read as "N": "text" lines; most of the numbers must be there
function salvageParts(raw, count) {
    const section = (name, stops) => {
        const at = raw.search(new RegExp(`"${name}"\\s*:\\s*\\{`));
        if (at < 0) return '';
        let end = raw.length;
        stops.forEach(st => { const k = raw.indexOf(`"${st}"`, at + 4); if (k > at && k < end) end = k; });
        return raw.slice(at, end);
    };
    const pairs = txt => { const o = {}; const re = /"(\d+)"\s*:\s*"([^"\n]*)"/g; let m; while ((m = re.exec(txt))) if (!(m[1] in o)) o[m[1]] = m[2]; return o; };
    const who = pairs(section('who', ['forms', 'feel']));
    const got = Object.keys(who).filter(k => Number(k) < count).length;
    if (!count || got < Math.ceil(count * 0.8)) return null;
    return { who, feel: pairs(section('feel', ['who', 'forms'])) };
}
function markPartsBusy(messageId, on) {
    btnBusy(document.querySelector(`#chat .mes[mesid="${messageId}"] .rls-split-btn`), on);
}
/* A button that waits: its icon stays (invisible, so nothing in the row moves) and a round ring turns
   over it — a perfect circle has no edge to wobble left and right the way a turned glyph does. */
function btnBusy(el, on) {
    if (!el) return;
    el.classList.toggle('busy', !!on);
    let ring = el.querySelector(':scope > .rls-ring');
    if (on && !ring) { ring = document.createElement('span'); ring.className = 'rls-ring'; ring.setAttribute('aria-hidden', 'true'); el.appendChild(ring); }
    if (!on && ring) ring.remove();
}
/* What the model left open is settled from the text itself, so a block never starts in the
   middle of a sentence and a spoken line never drops out between two blocks of its speaker:
   '"What the fuck," | he began, …' — the line and its tag are one person. */
function settleParts(items, text) {
    const said = it => /^[«"“„—–]/.test(text.slice(it.s, it.e).trim());
    const open = w => !w || w === '?' || w === '-';
    const para = it => (text.slice(0, it.s).match(/\n/g) || []).length;
    // the kind is kept with the split; older splits fall back to the first character
    items.forEach(it => { it.say = it.k ? it.k === 's' : said(it); it.p = para(it); if (it.say && it.w === '-') it.w = '?'; });
    // narration that opens with someone's name is about them ("Mira, however, was already gone…"),
    // whoever's paragraph it stands in
    const cands = faceCandidates();
    items.forEach(it => {
        if (it.say) return;
        const piece = text.slice(it.s, it.e).replace(/^[\s*_"«“]+/, '');
        const first = namesIn(piece.slice(0, 40), cands).find(h => h.at === 0);
        if (first && first.c.name !== it.w) {
            const two = namesIn(piece, cands).filter(h => h.c.name !== first.c.name);
            if (!two.length || two[0].at > 25) { it.w = first.c.name; it.subj = true; }
        }
    });
    // narration that names nobody and points at nobody ("The hallway door clicks open") is nobody's,
    // unless it sits inside a run of one person's pieces in the same paragraph
    items.forEach((it, i) => {
        if (it.say || it.subj || it.w === '-' || it.w === '?') return;
        const piece = text.slice(it.s, it.e);
        // only a sentence that opens on a thing or a place ("The door…", "Somewhere…") — one that opens on
        // a capital word may well be a name the scene has not learned yet ("Алекс даже не поднял…")
        const first = (piece.replace(/^[\s*_"«“]+/, '').match(/^[\p{L}-]+/u) || [''])[0].toLowerCase();
        if (!SMALL_WORDS.has(first) && !SCENE_STARTS.has(first)) return;
        const isMe = String(it.w).toLowerCase() === String(getContext().name1 || name1 || '').toLowerCase();
        if (namesIn(piece, cands).length || PERSON_WORDS.test(piece) || (isMe && YOU_WORDS.test(piece)) || piece.toLowerCase().includes(String(it.w).toLowerCase().split(/\s+/).pop())) return;
        const prev = items[i - 1], next = items[i + 1];
        const inRun = (prev && prev.p === it.p && prev.w === it.w) || (next && next.p === it.p && next.w === it.w);
        if (!inRun) it.w = '-';
    });
    // "He pushed himself off the wall." right after a sentence that opened with a name is still that person
    items.forEach((it, i) => {
        const prev = items[i - 1];
        if (it.say || it.subj || !prev || !prev.subj || prev.p !== it.p) return;
        if (/^[\s*_]*(he|she|they|his|her|their|him|он|она|они|его|её|ее|их)(?=[\s,.!?…])/iu.test(text.slice(it.s, it.e))) { it.w = prev.w; it.subj = true; }
    });
    /* A spoken line nobody was named for is never guessed onto the player: in a character's reply
       the player's pieces are "you"-narration, and a stranger's lines between two of them
       (an unnamed valet dressing you) went into the player's block. The player gets a line only
       when the model names them for it. */
    const me = String(getContext().name1 || name1 || '').toLowerCase();
    const voice = w => !open(w) && String(w).toLowerCase() !== me;
    for (let pass = 0; pass < 2; pass++) {
        items.forEach((it, i) => {
            const prev = items[i - 1], next = items[i + 1];
            const piece = text.slice(it.s, it.e).trim();
            // a piece that starts small ("he began, …") goes on the sentence before it
            if (prev && prev.p === it.p && /^[\p{Ll},;:)]/u.test(piece)) {
                if (open(prev.w) && !open(it.w)) prev.w = it.w;
                else if (open(it.w) && !open(prev.w)) it.w = prev.w;
            }
            if (!it.say || !open(it.w)) return;
            // a line that runs on into its tag ("…," he said) is the tag's person
            if (next && next.p === it.p && voice(next.w) && /[,—–-]\s*["»”“]?$/.test(piece)) { it.w = next.w; return; }
            // otherwise the nearest known voice in the same paragraph
            let k = 1;
            while (i - k >= 0 || i + k < items.length) {
                const a0 = items[i - k], b0 = items[i + k];
                if (a0 && a0.p === it.p && voice(a0.w)) { it.w = a0.w; return; }
                if (b0 && b0.p === it.p && voice(b0.w)) { it.w = b0.w; return; }
                k++;
            }
            // a line on its own between two blocks of one person is theirs
            let a1 = i - 1; while (a1 >= 0 && open(items[a1].w)) a1--;
            let b1 = i + 1; while (b1 < items.length && open(items[b1].w)) b1++;
            if (a1 >= 0 && b1 < items.length && items[a1].w === items[b1].w && voice(items[a1].w)) it.w = items[a1].w;
        });
    }
    items.forEach(it => { if (open(it.w)) it.w = '-'; });
    return items;
}
const partsShowText = new Set();   // messages switched back to plain text, this session

/* "Whose is this?" — the people of the scene, the names this reply already has, narration, or
   someone else by name. The choice is written into the reply's kept split (and remembered as set
   by hand, so no guess ever moves it); asking the model again starts over. */
function closeFixMenu() { document.getElementById('rls-fixmenu')?.remove(); document.removeEventListener('pointerdown', fixOutside, true); document.removeEventListener('keydown', fixKey, true); }
function fixOutside(e) { if (!e.target.closest('#rls-fixmenu')) closeFixMenu(); }
let fixArgs = null;
function fixKey(e) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    // Esc in the rename field: back to the list; anywhere else: the menu closes
    const back = e.target && e.target.closest && e.target.closest('.rls-fix-rename') && fixArgs;
    closeFixMenu();
    if (back) openFixMenu(...fixArgs);
}
function openFixMenu(messageId, blk, x, y) {
    closeFixMenu();
    fixArgs = [messageId, blk, x, y];
    const msg = getContext().chat[messageId];
    const saved = msg && msg.extra && msg.extra.rls_parts && msg.extra.rls_parts[msg.swipe_id ?? 0];
    if (!saved || !Array.isArray(saved.w)) return;
    const idx = String(blk.dataset.pieces || '').split(',').map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < saved.w.length);
    if (!idx.length) return;
    const me = getContext().name1 || name1;
    const names = [];
    const add = n => { const v = String(n || '').trim(); if (v && v !== '-' && v !== '?' && !names.includes(v)) names.push(v); };
    const castSet = new Set(faceCandidates().map(c => c.name));
    faceCandidates().filter(c => c.kind !== 'user').forEach(c => add(c.name));
    const ppl = chatPeople();
    ppl.people.forEach(add);
    saved.w.forEach(add);
    add(me);
    const cur = saved.w[idx[0]];
    // the chat's own people can be renamed (everywhere) and removed from the list; cards, roster and you cannot here
    const own = n => !castSet.has(n) && n !== me;
    const row = n => `<div class="rls-fix-row" data-w="${escapeHtml(n)}"><button type="button" role="menuitem" class="rls-fix-item${n === cur ? ' on' : ''}" data-w="${escapeHtml(n)}">${partFace(n).html}<span>${escapeHtml(n)}</span></button>${own(n) ? `<button type="button" class="rls-fix-ed" title="${escapeHtml(t('fix_rename'))}" aria-label="${escapeHtml(t('fix_rename'))}"><i class="fa-solid fa-pen"></i></button>${saved.w.includes(n) ? '' : `<button type="button" class="rls-fix-rm" title="${escapeHtml(t('fix_forget'))}" aria-label="${escapeHtml(t('fix_forget'))}"><i class="fa-solid fa-xmark"></i></button>`}` : ''}</div>`;
    const menu = document.createElement('div');
    menu.id = 'rls-fixmenu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = `<div class="rls-fix-title">${escapeHtml(t('fix_title'))}</div>
        ${names.map(row).join('')}
        <button type="button" role="menuitem" class="rls-fix-item${cur === '-' ? ' on' : ''}" data-w="-"><span class="rls-fix-narr">¶</span><span>${escapeHtml(t('fix_narr'))}</span></button>
        <form class="rls-fix-new"><input type="text" maxlength="40" placeholder="${escapeHtml(t('fix_new'))}" aria-label="${escapeHtml(t('fix_new'))}"><button type="submit">${escapeHtml(t('fix_ok'))}</button></form>`;
    document.body.appendChild(menu);
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(window.innerWidth - r.width - 8, x)) + 'px';
    menu.style.top = Math.max(8, Math.min(window.innerHeight - r.height - 8, y)) + 'px';
    const apply = w => {
        const v = String(w || '').replace(/\s+/g, ' ').trim().slice(0, 40);
        if (!v) return;
        const m2 = getContext().chat[messageId];
        const sv = m2 && m2.extra && m2.extra.rls_parts && m2.extra.rls_parts[m2.swipe_id ?? 0];
        if (!sv || sv !== saved) { closeFixMenu(); return; }        // the reply changed meanwhile
        const fixed = new Set(Array.isArray(sv.m) ? sv.m : []);
        idx.forEach(i => { sv.w[i] = v; fixed.add(i); });
        sv.m = [...fixed].sort((a, b) => a - b);
        if (v !== '-') rememberPeople([v], true);
        saveScene();
        closeFixMenu();
        renderParts(messageId);
        if (novel && novel.refresh) novel.refresh(null);
    };
    menu.querySelectorAll('.rls-fix-item').forEach(b => b.addEventListener('click', () => apply(b.dataset.w)));
    // ✎ — the name in place becomes a field; Enter renames it in every reply of this chat
    menu.querySelectorAll('.rls-fix-ed').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        const r = b.closest('.rls-fix-row'), old = r.dataset.w;
        r.innerHTML = `<form class="rls-fix-rename"><input type="text" maxlength="40" value="${escapeHtml(old)}" aria-label="${escapeHtml(t('fix_rename'))}"><button type="submit">${escapeHtml(t('fix_ok'))}</button></form>`;
        const inp = r.querySelector('input');
        inp.focus(); inp.select();
        r.querySelector('form').addEventListener('submit', ev => {
            ev.preventDefault();
            const nw = cleanPersonName(inp.value);
            if (nw && nw !== old) {
                const n = renamePerson(old, nw);
                console.log(`[Living Scene] roles: "${old}" is now "${nw}" in ${n} piece(s) of this chat`);
                renderAllParts();
                if (novel && novel.refresh) novel.refresh(null);
            }
            closeFixMenu();
            openFixMenu(messageId, blk, x, y);
        });
    }));
    // ✕ — off the list (the blocks keep their names; a block still called so shows it again)
    menu.querySelectorAll('.rls-fix-rm').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        forgetPerson(b.closest('.rls-fix-row').dataset.w);
        closeFixMenu();
        openFixMenu(messageId, blk, x, y);
    }));
    menu.querySelector('.rls-fix-new').addEventListener('submit', e => { e.preventDefault(); apply(menu.querySelector('.rls-fix-new input').value); });
    (menu.querySelector('.rls-fix-item.on') || menu.querySelector('.rls-fix-item'))?.focus();
    setTimeout(() => { document.addEventListener('pointerdown', fixOutside, true); document.addEventListener('keydown', fixKey, true); }, 0);
}
/* A face for someone with no card, no diary portrait and no card of the same name — the people
   who live inside one card. Their sprite (neutral first) is the face, as Character Expressions
   shows them. Looked up once per chat in the background; the replies are redrawn when it comes. */
const spriteFaces = new Map();   // chatId|name -> sprite path ('' while looking, or none)
let spriteFaceT = null;
function spriteFace(name) {
    const n = String(name || '').trim();
    if (!n || n === '-') return '';
    const key = `${getContext().chatId}|${n}`;
    if (spriteFaces.has(key)) return spriteFaces.get(key);
    spriteFaces.set(key, '');
    spritesOf(n).then(list => {
        const path = pickSprite(list, 'neutral');
        if (!path) return;
        spriteFaces.set(key, path);
        clearTimeout(spriteFaceT);
        spriteFaceT = setTimeout(() => { candCache = null; if (document.querySelector('#chat .rls-parts')) renderAllParts(); }, 80);
    }).catch(() => {});
    return '';
}
function partFace(name) {
    let c = faceCandidates().find(x => x.name === name);
    if (!c || !c.pic) {
        // someone the scene met only now ("Jun") may be in the diary under a fuller or Russian name («Пак Джун»)
        const me = { probes: probesFor(name) };
        const pics = diaryNpcs().filter(n => typeof n.portrait === 'string' && n.portrait);
        const d = pics.find(n => String(n.name).trim().toLowerCase() === String(name).trim().toLowerCase())
            || onlyOne(pics.filter(n => namesIn(n.name, [me]).length && namesIn(name, [{ probes: probesFor(n.name) }]).length).map(n => ({ c: n })));
        if (d) c = { name, pic: d.portrait, kind: (c && c.kind) || 'npc' };
    }
    // no picture anywhere (someone living inside a card): their own sprite from Character Expressions
    if ((!c || !c.pic) && !(c && c.kind === 'user')) { const sp = spriteFace(name); if (sp) c = { name, pic: sp, kind: (c && c.kind) || 'npc' }; }
    let hue = 0; for (const ch of String(name)) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
    const ini = escapeHtml(String(name).trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase());
    return { hue, pic: (c && c.pic) || '', html: c && c.pic ? `<img src="${escapeHtml(c.pic)}" alt="" draggable="false" loading="lazy">` : `<span class="rls-part-ini">${ini}</span>`, me: !!(c && c.kind === 'user') };
}
// the stored split of a reply, settled and grouped into blocks — what the chat draws and the novel plays
function partsView(messageId) {
    const msg = getContext().chat[messageId];
    if (!msg || msg.is_user || msg.is_system) return null;
    const saved = msg.extra && msg.extra.rls_parts && msg.extra.rls_parts[msg.swipe_id ?? 0];
    if (!saved || saved.h !== partsHash(msg.mes) || !Array.isArray(saved.p) || !Array.isArray(saved.w)) return null;
    const text = String(msg.mes || '').replace(/\r\n?/g, '\n');
    // pieces of one person in a row are one block; a short bit of narration between two pieces of the same person stays inside
    const items = settleParts(saved.p.map((x, i) => ({ s: x[0], e: x[1], k: x[2], w: saved.w[i], i })), text);
    if (soloReply(messageId)) items.forEach(it => { if (it.w === msg.name) it.w = '-'; });   // exploring alone: the card wrote as the game master
    for (let i = 1; i < items.length - 1; i++) if (items[i].w === '-' && items[i - 1].w !== '-' && items[i - 1].w === items[i + 1].w && items[i].e - items[i].s < 140 && !text.slice(items[i - 1].e, items[i + 1].s).includes('\n\n')) items[i].w = items[i - 1].w;
    // what the player set by hand stands over every guess above
    const fixed = Array.isArray(saved.m) ? new Set(saved.m) : null;
    if (fixed) items.forEach(it => { if (fixed.has(it.i)) it.w = saved.w[it.i]; });
    const blocks = [];
    items.forEach(it => {
        const b = blocks[blocks.length - 1];
        if (b && b.w === it.w) b.items.push(it); else blocks.push({ w: it.w, items: [it] });
    });
    const me = getContext().name1 || name1;
    const order = [];
    blocks.forEach(b => { if (b.w !== '-' && b.w !== me && !order.includes(b.w)) order.push(b.w); });
    return { messageId, text, blocks, me, order, saved, feel: (saved.f && typeof saved.f === 'object') ? saved.f : {}, fmt: piecesFormatter(msg, messageId) };
}
// each piece formatted on its own (a piece never cuts through *…*), so actions and lines can be told apart
function piecesFormatter(msg, messageId) {
    return x => {
        let h;
        try { h = ST.messageFormatting(String(x).trim(), msg.name, false, false, messageId); } catch (e) { h = escapeHtml(x); }
        return String(h).trim().replace(/^<p>([\s\S]*)<\/p>$/i, '$1');
    };
}
function renderParts(messageId) {
    try {
        const mesEl = document.querySelector(`#chat .mes[mesid="${messageId}"]`);
        if (!mesEl) return;
        const mesText = mesEl.querySelector('.mes_text');
        const old = mesEl.querySelector('.rls-parts');
        if (old) old.remove();
        mesEl.querySelector('.rls-parts-fold')?.remove();
        if (mesText) mesText.classList.remove('rls-hidden');
        const msg = getContext().chat[messageId];
        if (!msg || msg.is_user || msg.is_system || !mesText) return;
        addSplitButton(mesEl, messageId);
        addNovelButton(mesEl, messageId);
        if (!settings.enabled || settings.lineFaces === false || partsShowText.has(messageId)) return;
        if (mesEl.classList.contains('editing') || mesText.querySelector('textarea')) return;
        const v = partsView(messageId);
        if (!v) return;
        const { text, blocks, me, order, fmt, saved } = v;
        // nobody identified, or the whole reply is one block of one person (all of it Jun's):
        // there is nothing to tell apart, the plain text is better. One person with narration around
        // them (the hallway, then Alex) is told apart, and can be played as a scene
        // one block of one person: plain text, unless asked to show it as a block too
        if (!blocks.some(b => b.w !== '-') || (blocks.length < 2 && !(settings.partsSolo === true && blocks[0].w !== me && blocks[0].w !== '?'))) return;
        /* an older reply: its own plain text, and one small button under it that draws the blocks.
           Dozens of split replies in a long chat were hundreds of blocks in the page. */
        if (partsFolded(messageId, msg)) {
            const strip = document.createElement('div');
            strip.className = 'rls-parts-fold';
            strip.innerHTML = `<button type="button" class="rls-unfold" title="${escapeHtml(t('parts_unfold'))}"><i class="fa-solid fa-people-arrows"></i> ${escapeHtml(t('parts_unfold'))}</button>`;
            strip.querySelector('button').addEventListener('click', e => { e.stopPropagation(); partsUnfolded.add(`${getContext().chatId}#${messageId}#${msg.swipe_id ?? 0}`); renderParts(messageId); });
            mesText.after(strip);
            return;
        }
        const piecesHtml = list => list.map((it, k) => {
            const gap = k ? text.slice(list[k - 1].e, it.s) : '';
            const sep = k ? (gap.includes('\n') ? '<br>' : ' ') : '';
            return `${sep}<span class="rls-pp ${it.say ? 'say' : 'act'}">${fmt(pieceText(text, it.s, it.e))}</span>`;
        }).join('');
        const key = `${messageId}#${msg.swipe_id ?? 0}#${saved.h}`;
        const fresh = !partsAnimated.has(key);
        partsAnimated.add(key);
        let n = 0;
        const html = blocks.map(b => {
            const body = piecesHtml(b.items);
            if (!body.trim()) return '';
            const dl = fresh ? `${(n++ * 0.09).toFixed(2)}s` : '';
            const delay = dl ? ` style="animation-delay:${dl}"` : '';
            if (b.w === '-') {
                const len = b.items.reduce((a0, it) => a0 + it.e - it.s, 0);
                return `<div class="rls-part narr${len < 170 ? ' short' : ''}"${delay} data-pieces="${b.items.map(it => it.i).join(',')}"><span class="rls-narr-line"></span><span class="rls-narr-text">${body}</span><span class="rls-narr-line"></span></div>`;
            }
            const f = partFace(b.w);
            const side = b.w === me ? 'r' : (order.indexOf(b.w) % 2 ? 'r' : 'l');
            const nosay = !b.items.some(it => it.say);
            return `<div class="rls-part who ${side} hand${f.hue % 4}${f.me ? ' me' : ''}${nosay ? ' nosay' : ''}" style="--rls-hue:${f.hue}${dl ? `;animation-delay:${dl}` : ''}" data-dl="${dl ? parseFloat(dl) : 0}" data-pieces="${b.items.map(it => it.i).join(',')}">
                <div class="rls-part-ava" title="${escapeHtml(b.w)}">${f.html}</div>
                <div class="rls-part-box"><div class="rls-part-name"><span class="rls-part-mini">${f.html}</span><span>${escapeHtml(b.w)}</span></div><div class="rls-part-text">${body}</div></div>
            </div>`;
        }).join('');
        const wrap = document.createElement('div');
        wrap.className = `rls-parts st-${settings.partsStyle || 'glass'}${settings.partsFonts !== false ? ' fonts' : ''}${fresh ? ' anim' : ''}${settings.partsCompact ? ' compact' : ''}`;
        wrap.innerHTML = html + `<div class="rls-parts-tools">
            <button type="button" class="rls-parts-compact${settings.partsCompact ? ' on' : ''}" title="${escapeHtml(t(settings.partsCompact ? 'parts_full' : 'parts_compact'))}" aria-label="${escapeHtml(t(settings.partsCompact ? 'parts_full' : 'parts_compact'))}"><i class="fa-solid fa-comment-dots"></i></button>
            <button type="button" class="rls-parts-plain" title="${escapeHtml(t('parts_plain'))}" aria-label="${escapeHtml(t('parts_plain'))}">¶</button>
        </div>`;
        wrap.querySelector('.rls-parts-plain').addEventListener('click', e => { e.stopPropagation(); partsShowText.add(messageId); renderParts(messageId); });
        wrap.querySelector('.rls-parts-compact').addEventListener('click', e => {
            e.stopPropagation();
            settings.partsCompact = !settings.partsCompact;
            saveSettings();
            renderAllParts();
        });
        // right-click, or a long press on a touch screen: "whose is this?"
        wrap.addEventListener('contextmenu', e => {
            const blk = e.target.closest('.rls-part');
            if (!blk || !blk.dataset.pieces) return;
            e.preventDefault();
            openFixMenu(messageId, blk, e.clientX, e.clientY);
        });
        let pressT = 0, pressAt = null;
        wrap.addEventListener('pointerdown', e => {
            if (e.pointerType !== 'touch') return;
            const blk = e.target.closest('.rls-part');
            if (!blk || !blk.dataset.pieces) return;
            pressAt = { x: e.clientX, y: e.clientY };
            clearTimeout(pressT);
            pressT = setTimeout(() => { pressAt = null; openFixMenu(messageId, blk, e.clientX, e.clientY); }, 550);
        });
        wrap.addEventListener('pointermove', e => { if (pressAt && Math.hypot(e.clientX - pressAt.x, e.clientY - pressAt.y) > 8) { clearTimeout(pressT); pressAt = null; } });
        ['pointerup', 'pointercancel'].forEach(k => wrap.addEventListener(k, () => { clearTimeout(pressT); pressAt = null; }));
        // a click on someone's block quiets the others; again, and everyone is back
        wrap.addEventListener('click', e => {
            const blk = e.target.closest('.rls-part.who');
            if (!blk || e.target.closest('a, button')) return;
            const sel = window.getSelection && window.getSelection();
            if (sel && String(sel).trim()) return;   // selecting text is not a click
            const was = blk.classList.contains('focus');
            wrap.querySelectorAll('.rls-part.focus').forEach(x => x.classList.remove('focus'));
            if (!was) blk.classList.add('focus');
            wrap.classList.toggle('has-focus', !was);
        });
        // the words come in one by one only for a reply split just now — never for the whole history
        // drawn when a chat opens (hundreds of animated words at once made the page heavy)
        const just = `${messageId}#${msg.swipe_id ?? 0}`;
        if (partsJustSplit.has(just)) {
            partsJustSplit.delete(just);
            if (fresh && settings.partsAnim && settings.partsAnim !== 'none') inkWords(wrap, settings.partsAnim);
        }
        mesText.classList.add('rls-hidden');
        // before the text: what other extensions keep inside the text (RPG Map's choices) stays visible below the blocks
        mesText.before(wrap);
    } catch (e) { console.warn('[Living Scene] roles: draw', e); }
}
const partsAnimated = new Set();   // a block slides in once, not on every redraw
const partsJustSplit = new Set();  // replies split a moment ago (their words may come in one by one)
// a new block's words appear one after another (once, never on a redraw); the markup inside is kept
function inkWords(wrap, mode) {
    const step = mode === 'type' ? 0.045 : 0.028;
    wrap.classList.add('ink-' + mode);
    let longest = 0;
    wrap.querySelectorAll('.rls-part').forEach(blk => {
        const base = Number(blk.dataset.dl || blk.style.animationDelay.replace('s', '') || 0) + 0.15;
        const box = blk.querySelector('.rls-part-text, .rls-narr-text');
        if (!box) return;
        const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
        let k = 0;
        nodes.forEach(node => {
            const frag = document.createDocumentFragment();
            node.nodeValue.split(/(\s+)/).forEach(w => {
                if (!w) return;
                if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
                const sp = document.createElement('span');
                sp.className = 'rls-w';
                const d = base + Math.min(k, 120) * step;
                if (d > longest) longest = d;
                sp.style.animationDelay = `${d.toFixed(3)}s`;
                sp.textContent = w;
                frag.appendChild(sp);
                k++;
            });
            node.parentNode.replaceChild(frag, node);
        });
    });
    setTimeout(() => wrap.classList.remove('ink-' + mode), (longest + 0.6) * 1000);
}

/* ---------- the reply played as a visual-novel scene, with the sprites of Character Expressions ----------
   Sprites are SillyTavern's own: the folder of a card (or its "sprite folder override"), and for someone
   living inside a card, the card's subfolder of that name («Alex/Mark») or a folder of their own.
   Whoever has no sprites is simply not drawn — their name and words still are. */
const SPRITE_LABELS = ['admiration', 'amusement', 'anger', 'annoyance', 'approval', 'caring', 'confusion', 'curiosity', 'desire', 'disappointment', 'disapproval', 'disgust', 'embarrassment', 'excitement', 'fear', 'gratitude', 'grief', 'joy', 'love', 'nervousness', 'optimism', 'pride', 'realization', 'relief', 'remorse', 'sadness', 'surprise', 'neutral'];
function spriteLabels() {
    const custom = Array.isArray(extension_settings.expressions?.custom) ? extension_settings.expressions.custom.map(x => String(x || '').trim().toLowerCase()).filter(Boolean) : [];
    return [...new Set(SPRITE_LABELS.concat(custom))];
}
// the model's feelings, checked: only spoken pieces' numbers, only known labels
function partsFeel(feel, count) {
    const out = {};
    if (!feel || typeof feel !== 'object' || Array.isArray(feel)) return out;
    const ok = new Set(spriteLabels());
    Object.keys(feel).forEach(k => {
        const i = Number(k), v = String(feel[k] || '').trim().toLowerCase();
        if (Number.isInteger(i) && i >= 0 && i < count && ok.has(v)) out[i] = v;
    });
    return out;
}
const spriteCache = new Map();   // folder -> Promise<[{label, path}]>
function spriteList(folder) {
    if (!folder || folder.length > 200) return Promise.resolve([]);
    if (!spriteCache.has(folder)) {
        spriteCache.set(folder, fetch(`/api/sprites/get?name=${encodeURIComponent(folder)}`)
            .then(r => (r.ok ? r.json() : []))
            .then(list => (Array.isArray(list) ? list.filter(x => x && typeof x.path === 'string' && typeof x.label === 'string') : []))
            .catch(() => []));
    }
    return spriteCache.get(folder);
}
// the folders that may hold this person's sprites, best first
function spriteFolders(name) {
    const n = String(name || '').trim();
    if (!n || /^(the|a|an)\s/i.test(n)) return [];   // "The Cook" is a description, not someone's folder
    const overrides = Array.isArray(extension_settings.expressionOverrides) ? extension_settings.expressionOverrides : [];
    const folderOf = c => { const o = overrides.find(x => x && x.name === String(c.avatar || '').replace(/\.[^/.]+$/, '')); return (o && o.path) || c.name; };
    const cards = chatCardNames().map(nm => characters.find(x => x && x.name === nm)).filter(Boolean);
    const out = [];
    const card = cards.find(c => c.name.toLowerCase() === n.toLowerCase());
    if (card) out.push(folderOf(card));
    // «Марк» may keep his sprites in a folder named Mark, and the other way round
    const cap = x => x.split(/(\s+|-)/).map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join('');
    const names = [];
    aliasNamesOf(n).filter(a => !/[\/\\]/.test(a)).slice(0, 3).forEach(a => {
        names.push(a);
        const tr = translit(a);
        if (tr && tr !== a.toLowerCase()) { names.push(cap(tr)); const alt = tr.replace(/dzh|dz/g, 'j'); if (alt !== tr) names.push(cap(alt)); }
    });
    cards.forEach(c => names.forEach(a => { if (a.toLowerCase() !== c.name.toLowerCase()) out.push(`${folderOf(c)}/${a}`); }));
    if (!card) names.forEach(a => out.push(a));
    return [...new Set(out)].slice(0, 12);
}
const spritePeople = new Map();   // name -> Promise<[{label, path}]>, for this chat
async function spritesOf(name) {
    const key = `${getContext().chatId}|${name}`;
    if (!spritePeople.has(key)) spritePeople.set(key, (async () => {
        for (const f of spriteFolders(name)) { const list = await spriteList(f); if (list.length) return list; }
        return [];
    })());
    return spritePeople.get(key);
}
// a feeling told by the words around a line ("…," she laughed / — рявкнул он); nothing clear — none
const FEEL_WORDS = [
    ['anger', /(ярост|злоб|злост|разозл|рявк|прорычал|взбесил|в бешенств|angr|furious|\brage|snarl|growl|snapped|shout)/i],
    ['amusement', /(смеё|смея|засмея|хохоч|хохот|усмехн|ухмыл|хихик|laugh|chuckl|giggl|grin|smirk)/i],
    ['sadness', /(плач|слёз|слез|всхлип|грустн|печальн|тоскл|\bвздохн|\bsigh|\btear|\bcries|\bcried|\bsob|sorrow|sadly)/i],
    ['fear', /(испуган|испуг|страх|дрожащ|задрожал|побледн|afraid|\bfear|trembl|scared|terrified|pale)/i],
    ['surprise', /(удивлён|удивлен|удивлённо|изумл|ахнул|опешил|surpris|gasp|astonish|wide-eyed)/i],
    ['embarrassment', /(смущ|покраснел|зарумян|потупил|blush|embarrass|flush)/i],
    ['annoyance', /(раздраж|поморщ|закатил глаза|фыркнул|annoy|irritat|rolled (his|her|their) eyes|scoff)/i],
    ['caring', /(нежно|ласково|мягко сказал|tender|gently|softly|kindly)/i],
    ['joy', /(радостн|просиял|сиял|счастлив|beam(ed|ing)|joyful|happily|cheerful)/i],
];
function guessFeel(text) {
    const x = String(text || '');
    for (const [label, re] of FEEL_WORDS) if (re.test(x)) return label;
    if (/\?["»”]?\s*$/.test(x.trim()) || /\?\s*["»”]/.test(x)) return 'curiosity';
    return '';
}
function pickSprite(list, feel) {
    if (!list || !list.length) return '';
    const fallback = String(extension_settings.expressions?.fallback_expression || 'joy').toLowerCase();
    // labels compared without case: a file named Joy.png is the joy sprite too
    const is = l => x => String(x.label).toLowerCase() === l;
    const hit = (feel && list.find(is(String(feel).toLowerCase()))) || list.find(is('neutral')) || list.find(is(fallback)) || list[0];
    return hit.path;
}
// the steps of the scene: one per spoken line, with the words around it ("…," he said) on the same step;
// someone's actions with no line are one step, narration is its own
function sceneSteps(view) {
    const steps = [];
    view.blocks.forEach(b => {
        let cur = null;
        b.items.forEach(it => {
            const piece = pieceText(view.text, it.s, it.e);
            if (!piece.trim()) return;
            // a new spoken line opens a new step, unless this step has no line yet
            if (!cur || (it.say && cur.say)) { cur = { who: b.w, parts: [], say: false, feel: '' }; steps.push(cur); }
            cur.parts.push({ text: piece, say: !!it.say });
            if (it.say) { cur.say = true; cur.feel = view.feel[it.i] || cur.feel; }
        });
    });
    // no feeling from the model (an older split, a model that left it out): read it from the words themselves
    steps.forEach(st0 => { if (st0.say && !st0.feel) st0.feel = guessFeel(st0.parts.map(x => x.text).join(' ')); });
    // a line with no feeling of its own keeps the speaker's last one
    const last = {};
    steps.forEach(st0 => { st0.kind = st0.who === '-' ? 'narr' : (st0.say ? 'say' : 'act'); if (st0.feel) last[st0.who] = st0.feel; else st0.feel = last[st0.who] || ''; });
    return steps;
}
// the stage: the room RPG Map is showing (its picture over the chat), else the chat's own background
// the room picture RPG Map is showing over the chat right now, if it shows one
function mapShownRoom() {
    try {
        const room = document.getElementById('rpg-room-bg');
        if (!room || getComputedStyle(room).opacity === '0') return '';
        const layers = [...room.querySelectorAll('.rpg-bg-layer')].filter(l => l.style.backgroundImage && l.style.backgroundImage !== 'none');
        const front = layers.find(l => getComputedStyle(l).opacity !== '0') || layers[0];
        return front ? front.style.backgroundImage : '';
    } catch (e) { return ''; }
}
function sceneBackdrop() {
    try {
        const room = document.getElementById('rpg-room-bg');
        if (room && getComputedStyle(room).opacity !== '0') {
            const layers = [...room.querySelectorAll('.rpg-bg-layer')].filter(l => l.style.backgroundImage && l.style.backgroundImage !== 'none');
            const front = layers.find(l => getComputedStyle(l).opacity !== '0') || layers[0];
            if (front) return front.style.backgroundImage;
        }
        for (const id of ['bg_custom', 'bg1']) {
            const el = document.getElementById(id);
            const img = el ? getComputedStyle(el).backgroundImage : '';
            if (img && img !== 'none') return img;
        }
    } catch (e) { /* the default dusk below */ }
    return '';
}
let sceneOpen = null;
function stepHtml(st0, fmt) {
    const f = st0.fmt || fmt || (x => escapeHtml(x));
    return st0.parts.map(x => `<span class="rls-pp ${x.say ? 'say' : 'act'}">${f(x.text)}</span>`).join(' ');
}
/* The stage at step k, worked out from the steps alone, so going back or jumping from the log
   shows exactly who was there then. Whoever has sprites stands in a row in the order they came in
   (five at most: the one silent longest steps out); the speaker comes forward, the rest wait
   dimmed; a sharp feeling makes a little hop, a heavy one a little sink.
   Returns where the speaker stands (% from the left), or null. */
const STAGE_MAX = 5;
const HOP_FEELS = new Set(['anger', 'surprise', 'excitement', 'fear', 'amusement', 'joy', 'realization', 'annoyance']);
const SINK_FEELS = new Set(['sadness', 'grief', 'remorse', 'disappointment', 'embarrassment', 'nervousness']);
function stageTo(stage, steps, k, sprites, me) {
    const first = new Map(), last = new Map(), feel = new Map();
    for (let j = 0; j <= k && j < steps.length; j++) {
        const w = steps[j].who;
        if (w === '-' || w === me || !(sprites[w] && sprites[w].length)) continue;
        if (!first.has(w)) first.set(w, j);
        last.set(w, j);
        if (steps[j].feel) feel.set(w, steps[j].feel);
    }
    let cast = [...first.keys()];
    if (cast.length > STAGE_MAX) cast = cast.sort((a, b) => last.get(b) - last.get(a)).slice(0, STAGE_MAX);
    cast.sort((a, b) => first.get(a) - first.get(b));
    const cur = steps[k] || {};
    const speaking = cur.who !== '-' && cast.includes(cur.who) ? cur.who : '';
    const n = cast.length;
    // gone: step out
    stage.querySelectorAll('.rls-vn-actor').forEach(el => {
        if (cast.includes(el.dataset.who) || el.classList.contains('gone')) return;
        el.classList.add('gone');
        setTimeout(() => { if (el.classList.contains('gone')) el.remove(); }, 450);
    });
    let at = null;
    cast.forEach((w, idx) => {
        let el = [...stage.querySelectorAll('.rls-vn-actor')].find(x => x.dataset.who === w);
        if (el && el.classList.contains('gone')) { el.remove(); el = null; }
        const isNew = !el;
        if (isNew) {
            el = document.createElement('div');
            el.className = 'rls-vn-actor in';
            el.dataset.who = w;
            el.style.setProperty('--breath-delay', `${(-idx * 1.3).toFixed(1)}s`);
            el.innerHTML = '<img alt="" draggable="false">';
            el.querySelector('img').title = w;
            stage.appendChild(el);
            setTimeout(() => el.classList.remove('in'), 600);
        }
        // a pair stands close, like people talking; the more there are, the wider the row (two: 30% and 70%)
        const span = Math.min(76, 16 * n + 8);
        const x = n === 1 ? 50 : (50 - span / 2) + (span * idx) / (n - 1);
        el.style.left = `${x.toFixed(2)}%`;
        el.style.setProperty('--slot', `${Math.min(46, Math.max(22, 150 / Math.max(n, 1))).toFixed(1)}%`);
        el.style.zIndex = String(w === speaking ? 20 : 10 - Math.round(Math.abs(x - 50) / 10));   // the middle in front, the edges behind
        const img = el.querySelector('img');
        const src = pickSprite(sprites[w], feel.get(w) || '');
        if (img.getAttribute('src') !== src) {
            img.setAttribute('src', src);
            if (!isNew) { img.classList.remove('swap'); void img.offsetWidth; img.classList.add('swap'); }
        }
        const was = el.classList.contains('lit');
        el.classList.toggle('lit', w === speaking);
        if (w === speaking) {
            at = x;
            // the feeling shows in the body for a moment, when it changes or the speaker turns
            const f = feel.get(w) || '';
            if (!isNew && (!was || el.dataset.feel !== f)) {
                const mv = HOP_FEELS.has(f) ? 'hop' : SINK_FEELS.has(f) ? 'sink' : '';
                el.classList.remove('hop', 'sink');
                if (mv) { void el.offsetWidth; el.classList.add(mv); }
            }
            el.dataset.feel = f;
            if (!isNew && !el.classList.contains('hop') && !el.classList.contains('sink')) { el.classList.remove('talk'); void el.offsetWidth; el.classList.add('talk'); }
        }
    });
    return at;
}
function closeScene() {
    if (!sceneOpen) return;
    const { el, off, returnTo } = sceneOpen;
    sceneOpen = null;
    off();
    el.classList.add('out');
    setTimeout(() => el.remove(), 220);
    try { if (returnTo && returnTo.isConnected) returnTo.focus({ preventScroll: true }); } catch (e) { /* nothing to return to */ }
}

/* ---------- the novel: the whole chat played as a visual novel, with a line to answer in ----------
   It sits over SillyTavern and does everything through SillyTavern's own controls (send, swipes,
   regenerate, stop), so nothing about how a reply is made changes. A new reply is played once its
   split by roles is in; a reply that is not split is told paragraph by paragraph. While exploring
   alone with RPG Map, the words stand in the middle of the screen and Map's choices are buttons. */
/* ---------- where each line was said: RPG Map's room, noted when the message comes ----------
   Kept by the message's own time in this chat's scene state, so going back in the novel shows the
   room of that moment, and a change of room is played as a passage. The map is read, never written. */
function mapStateNow() {
    try { const ms = extension_settings.rpg_map_engine?.mapStates?.[getContext().chatId]; return ms && typeof ms === 'object' ? ms : null; } catch (e) { return null; }
}
function roomNow() {
    try {
        const m = window.RPG && window.RPG.map;
        if (!m || !m.available || typeof m.getCurrent !== 'function' || (m.isEnabled && !m.isEnabled())) return null;
        const c = m.getCurrent();
        if (!c || !c.room) return null;
        // the building the room is in, for the place's name
        let loc = '';
        const ms = mapStateNow();
        const maps = (ms && Array.isArray(ms.maps)) ? ms.maps : [];
        for (const mp of maps) for (const b of (mp.blocks || [])) {
            if ((b.name || '') !== (c.block || '')) continue;
            for (const l of (b.locations || [])) if ((l.sublocs || []).some(x => x && x.name === c.room)) { loc = l.name || ''; break; }
            if (loc) break;
        }
        return { key: `${c.block || ''}|${loc}|${c.room}`, block: String(c.block || ''), loc: String(loc), room: String(c.room) };
    } catch (e) { return null; }
}
function roomMark(id) {
    if (!settings.enabled) return;
    try {
        const m = (getContext().chat || [])[id];
        if (!m || m.is_system) return;
        const r = roomNow();
        if (!r) return;
        const st = sceneState();
        if (!st.rooms || typeof st.rooms !== 'object') st.rooms = {};
        const k = String(m.send_date || '');
        if (!k) return;
        st.rooms[k] = r;
        const keys = Object.keys(st.rooms);
        if (keys.length > 400) keys.slice(0, keys.length - 400).forEach(x => delete st.rooms[x]);
        saveScene();
    } catch (e) { /* nothing to note */ }
}
// the room of a message: its own note, else the nearest one before it
function roomOfMid(mid) {
    try {
        const st = sceneState();
        if (!st.rooms) return null;
        const chat = getContext().chat || [];
        for (let i = mid; i >= 0 && i >= mid - 60; i--) { const r = chat[i] && st.rooms[String(chat[i].send_date || '')]; if (r) return r; }
    } catch (e) { /* none */ }
    return null;
}
const roomPicCache = new Map();
function mapIdbImage(key) {
    return new Promise(resolve => {
        let req;
        try { req = indexedDB.open('rpgMapImages'); } catch (e) { resolve(''); return; }
        req.onupgradeneeded = () => { try { req.transaction.abort(); } catch (e) { /* not ours to create */ } };
        req.onerror = () => resolve(''); req.onblocked = () => resolve('');
        req.onsuccess = () => {
            const db = req.result;
            try {
                if (!db.objectStoreNames.contains('imgs')) { db.close(); resolve(''); return; }
                const rq = db.transaction('imgs', 'readonly').objectStore('imgs').get(key);
                rq.onsuccess = () => { db.close(); resolve(typeof rq.result === 'string' ? rq.result : ''); };
                rq.onerror = () => { db.close(); resolve(''); };
            } catch (e) { try { db.close(); } catch (x) { /* closed */ } resolve(''); }
        };
    });
}
// the picture of a noted room, as RPG Map keeps it (its own picture, or a background file)
async function roomPicture(r) {
    if (!r) return '';
    if (roomPicCache.has(r.key)) return roomPicCache.get(r.key);
    let url = '';
    try {
        const ms = mapStateNow();
        let sub = null;
        for (const mp of (ms && ms.maps) || []) for (const b of (mp.blocks || [])) {
            if ((b.name || '') !== r.block) continue;
            for (const l of (b.locations || [])) { if (r.loc && (l.name || '') !== r.loc) continue; const x = (l.sublocs || []).find(y => y && y.name === r.room); if (x) { sub = x; break; } }
            if (sub) break;
        }
        if (sub && typeof sub.image === 'string' && sub.image) url = sub.image.startsWith('idb:') ? await mapIdbImage(sub.image.slice(4)) : sub.image;
        if (!url && sub && typeof sub.bgFile === 'string' && sub.bgFile) url = 'backgrounds/' + encodeURIComponent(sub.bgFile);
        if (url && !/^(data:image\/|blob:|https?:|\/|backgrounds\/)/i.test(url)) url = '';
    } catch (e) { url = ''; }
    const css = url ? `url("${url.replace(/"/g, '%22')}")` : '';
    roomPicCache.set(r.key, css);
    if (roomPicCache.size > 40) roomPicCache.delete(roomPicCache.keys().next().value);
    return css;
}
/* ---------- buttons over the novel: the suite's own windows, opened over it ----------
   Each opens through what that extension itself offers (its button, its bridge), only when it is
   installed. While one of them is open the novel steps back under it, and comes forward again after. */
const HUD = [
    { id: 'map', icon: 'fa-map-location-dot', key: 'hud_map', ok: () => !!document.getElementById('rpg-map-btn'), go: () => document.getElementById('rpg-map-btn').click() },
    { id: 'diary', icon: 'fa-book', key: 'hud_diary', ok: () => !!document.getElementById('rpg-diary-btn'), go: () => document.getElementById('rpg-diary-btn').click() },
    { id: 'life', icon: 'fa-house-chimney', key: 'hud_life', ok: () => !!(window.RPG && window.RPG.life && typeof window.RPG.life.open === 'function'), go: () => window.RPG.life.open() },
];
/* the novel's ornaments: drawn here, coloured by each look's CSS (currentColor) */
const VN_VINE = `<svg viewBox="0 0 160 50" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M0 25 C 14 24, 22 16, 36 14" stroke-width="5.6"/><path d="M36 14 C 54 12, 62 30, 84 32" stroke-width="3.1"/><path d="M84 32 C 100 33, 112 24, 110 15 C 108 8, 98 9, 100 17" stroke-width="2.1"/><path d="M44 13 C 48 4, 60 1, 68 6 C 72 9, 68 14, 64 11" stroke-width="1.7"/><path d="M84 32 C 96 42, 116 44, 132 38" stroke-width="1.5"/><path d="M132 38 C 140 35, 145 40, 139 44" stroke-width="1.1"/><path d="M20 21 C 18 12, 24 6, 30 6" stroke-width="1.4"/></g><g fill="currentColor"><path d="M27 17 l1 -9 l5 7.5 z"/><path d="M52 14 l7 -6 l-1 8.5 z"/><path d="M71 25 l7 -5 l-1.5 8.5 z"/><path d="M92 33 l3 8 l3.5 -7.5 z"/><path d="M116 40 l6 -6 l1 7 z"/><path d="M58 22 c 4 -6 10 -6 13 -2 c -4 4 -9 5 -13 2 z"/><path d="M104 22 c 6 -2 10 2 9 7 c -5 0 -9 -2 -9 -7 z"/><path d="M30 6 c 3 -3 7 -2 8 1 c -3 2 -6 2 -8 -1 z"/><circle cx="100" cy="17" r="1.6"/></g></svg>`;
const vnFlower = s => `<svg viewBox="0 0 20 20" width="${s}" height="${s}" aria-hidden="true"><g fill="currentColor"><circle cx="10" cy="5.2" r="4.4"/><circle cx="14.8" cy="10" r="4.4"/><circle cx="10" cy="14.8" r="4.4"/><circle cx="5.2" cy="10" r="4.4"/></g><circle cx="10" cy="10" r="2.2" class="core"/></svg>`;
const VN_CLOUD = `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17a4 4 0 0 1 .6-7.9A5 5 0 0 1 17 10a3.5 3.5 0 0 1 0 7z"/></svg>`;
// the moon by the hour: full at night, a sliver at dawn and dusk, a sun by day
function vnMoon(time) {
    const m = /(\d{1,2})[:.](\d{2})/.exec(String(time || ''));
    const h = m ? Number(m[1]) + Number(m[2]) / 60 : NaN;
    if (Number.isFinite(h) && h >= 7 && h < 19) return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#1b2130" stroke="currentColor" stroke-width="1.2"/><circle cx="12" cy="12" r="5" fill="#efd78f"/></svg>`;
    const lit = !Number.isFinite(h) ? 6.5 : (h >= 22 || h < 4) ? 0 : 6.5;
    return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#1b2130" stroke="currentColor" stroke-width="1.2"/>${lit ? `<path d="M12 1.5 A10.5 10.5 0 0 1 12 22.5 A${lit} 10.5 0 0 0 12 1.5 Z" fill="#efd78f"/>` : '<circle cx="12" cy="12" r="10" fill="#efd78f"/>'}</svg>`;
}
const HUD_OPEN = ['#rpg-map-modal.visible', '#rpg-diary-modal.visible', '#rpg-life-host.open'];
const hudSomethingOpen = () => HUD_OPEN.some(sel => { const el = document.querySelector(sel); return !!el && getComputedStyle(el).display !== 'none'; });
const NOVEL_BACK = 24;   // messages taken into the novel's timeline
let novel = null;
function exploring() {
    const bar = document.getElementById('rpg-solo-bar');
    if (!bar || getComputedStyle(bar).display === 'none') return null;
    return { where: (bar.querySelector('.rpg-solo-loc b') || {}).textContent || '' };
}
function novelStepsFor(id) {
    const ctx = getContext();
    const m = ctx.chat[id];
    if (!m || m.is_system) return [];
    const me = ctx.name1 || name1;
    if (m.is_user) {
        const t0 = String(m.mes || '').trim();
        return t0 ? [{ who: me, kind: 'say', parts: [{ text: t0, say: true }], feel: '', mid: id, user: true, fmt: piecesFormatter(m, id) }] : [];
    }
    const v = (settings.enabled && settings.lineFaces !== false) ? partsView(id) : null;
    let steps;
    if (v && v.blocks.length) steps = sceneSteps(v).map(x => Object.assign(x, { fmt: v.fmt }));
    else {
        // not split (yet, or never): the reply by paragraphs, in the narrator's box
        const fmt = piecesFormatter(m, id);
        steps = String(m.mes || '').replace(/\r\n?/g, '\n').split(/\n{2,}/).map(x => x.trim()).filter(Boolean)
            .map(x => ({ who: '-', kind: 'narr', parts: [{ text: x, say: false }], feel: '', fmt }));
    }
    steps.forEach(x => { x.mid = id; });
    return steps;
}
function novelTimeline() {
    const chat = getContext().chat || [];
    const steps = [], start = new Map();
    for (let id = Math.max(0, chat.length - NOVEL_BACK); id < chat.length; id++) {
        const st0 = novelStepsFor(id);
        if (!st0.length) continue;
        start.set(id, steps.length);
        steps.push(...st0);
    }
    return { steps, start };
}
function lastReplyId() {
    const chat = getContext().chat || [];
    for (let i = chat.length - 1; i >= 0; i--) if (chat[i] && !chat[i].is_user && !chat[i].is_system) return i;
    return -1;
}
function openNovel(fromId = null) {
    if (novel) return;
    closeScene();
    const ov = document.createElement('div');
    ov.className = 'rls-vn novel';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', t('novel_menu'));
    const B = (cls, icon, key) => `<button type="button" class="${cls}" title="${escapeHtml(t(key))}" aria-label="${escapeHtml(t(key))}"><i class="fa-solid ${icon}"></i></button>`;
    ov.innerHTML = `<div class="rls-vn-bg"></div><div class="rls-vn-shade"></div>
        <div class="rls-vn-stage"></div>
        <div class="rls-vn-veil"></div>
        <div class="rls-vn-card" aria-live="polite"></div>
        <div class="rls-vn-place"></div>
        <div class="rls-vn-info" aria-hidden="true"></div>
        <div class="rls-vn-fight" aria-hidden="true"></div>
        <div class="rls-vn-where"></div>
        <div class="rls-vn-top">
            <span class="rls-vn-hud"></span>
            ${B('rls-vn-solo', 'fa-arrow-left-long', 'novel_return')}
            ${B('rls-vn-prev', 'fa-chevron-left', 'novel_prev')}
            ${B('rls-vn-next2', 'fa-chevron-right', 'novel_next')}
            ${B('rls-vn-regen', 'fa-rotate-right', 'novel_regen')}
            ${B('rls-vn-stop', 'fa-stop', 'novel_stop')}
            <button type="button" class="rls-vn-logbtn">${escapeHtml(t('scene_log'))}</button>
            ${B('rls-vn-close', 'fa-xmark', 'novel_exit')}
        </div>
        <div class="rls-vn-choices" hidden></div>
        <button type="button" class="rls-vn-box">
            <span class="rls-vn-paper" aria-hidden="true"></span>
            <span class="rls-vn-frame" aria-hidden="true"><i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i></span>
            <span class="rls-vn-orn" aria-hidden="true"></span>
            <span class="rls-vn-vine l" aria-hidden="true">${VN_VINE}</span><span class="rls-vn-vine r" aria-hidden="true">${VN_VINE}</span>
            <span class="rls-vn-marks" aria-hidden="true">${vnFlower(9)}${vnFlower(13)}${vnFlower(9)}</span><span class="rls-vn-scroll" aria-hidden="true"></span>
            <span class="rls-vn-plate"></span>
            <span class="rls-vn-face" aria-hidden="true"></span>
            <span class="rls-vn-text"></span>
            <span class="rls-vn-foot"><span class="rls-vn-count"></span><span class="rls-vn-next">▼</span></span>
        </button>
        <form class="rls-vn-say">
            <textarea rows="1" class="rls-vn-input" placeholder="${escapeHtml(t('novel_say'))}" aria-label="${escapeHtml(t('novel_say'))}"></textarea>
            <button type="submit" class="rls-vn-send" title="${escapeHtml(t('novel_send'))}" aria-label="${escapeHtml(t('novel_send'))}"><i class="fa-solid fa-paper-plane"></i></button>
        </form>
        <div class="rls-vn-log" hidden><div class="rls-vn-logtitle">${escapeHtml(t('scene_log'))}</div><div class="rls-vn-loglist"></div></div>`;
    const $q = sel => ov.querySelector(sel);
    const box = $q('.rls-vn-box'), plate = $q('.rls-vn-plate'), txt = $q('.rls-vn-text'), count = $q('.rls-vn-count');
    const stage = $q('.rls-vn-stage'), input = $q('.rls-vn-input'), choices = $q('.rls-vn-choices'), log = $q('.rls-vn-log'), list = $q('.rls-vn-loglist');
    // follow: the reader is with the newest message, so a new one is played as it comes;
    // reading back in the log or with ← stops that until they come back to the newest
    const N = novel = { ov, steps: [], start: new Map(), idx: -1, sprites: {}, bg: '', timer: null, follow: true, waitReply: 0 };
    const me = () => getContext().name1 || name1;
    const loadSprites = async () => {
        const people = [...new Set(N.steps.filter(x => x.who !== '-' && x.who !== me()).map(x => x.who))].filter(w => !(w in N.sprites));
        if (!people.length) return;
        await Promise.all(people.map(async w => { N.sprites[w] = await spritesOf(w); }));
        if (novel === N) show(N.idx, true);
    };
    // the stage counts the people of this reply and the one before it, so the cast does not grow forever
    const windowStart = k => {
        const mid = N.steps[k] && N.steps[k].mid;
        const ids = [...N.start.keys()];
        const at = ids.indexOf(mid);
        return at > 0 ? N.start.get(ids[at - 1]) : 0;
    };
    const setBg = bg => {
        if (bg === N.bg) return;
        N.bg = bg;
        $q('.rls-vn-bg').style.backgroundImage = bg && bg !== 'none' ? bg : '';
    };
    // the room of the line on screen; the live backdrop when that is the room you are in now
    const syncBg = () => {
        if (N.room) {
            const live = roomNow();
            if (live && N.room.key !== live.key) return;           // reading back: that moment's room stays
            if (!mapShownRoom() && roomPicCache.get(N.room.key)) return;   // the map shows nothing: the room's own picture stays
        }
        setBg(sceneBackdrop());
    };
    const placeText = r => r ? [r.room, r.loc && r.loc !== r.room ? r.loc : ''].filter(Boolean).join(' · ') : '';
    const showPlace = () => {
        const el = $q('.rls-vn-place');
        const txt = settings.novelPlace !== false && N.room ? placeText(N.room) : '';
        el.innerHTML = txt ? `<em>${escapeHtml(t('novel_place'))}</em><span>${escapeHtml(txt)}</span>` : '';
    };
    // a new place: the screen darkens, the picture changes, the name comes up for a moment
    const goToRoom = async (r, passage) => {
        N.room = r;
        const live = roomNow();
        const tok = N.roomTok = (N.roomTok || 0) + 1;
        if (!passage || settings.novelPlace === false) {
            const here = live && live.key === r.key;
            setBg((here && mapShownRoom()) || (await roomPicture(r)) || (here ? sceneBackdrop() : N.bg));
            showPlace();
            return;
        }
        ov.classList.add('travel');
        const here = live && live.key === r.key;
        const pic = (here && mapShownRoom()) || (await roomPicture(r)) || (here ? sceneBackdrop() : '');
        await new Promise(res => setTimeout(res, 480));
        if (novel !== N || tok !== N.roomTok) return;
        if (pic) setBg(pic);
        showPlace();
        const card = $q('.rls-vn-card');
        card.innerHTML = `${r.loc && r.loc !== r.room ? `<div class="rls-vn-card-place">${escapeHtml(r.loc)}</div>` : ''}<div class="rls-vn-card-name">${escapeHtml(r.room)}</div><div class="rls-vn-card-line"></div>`;
        card.classList.remove('show'); void card.offsetWidth; card.classList.add('show');
        setTimeout(() => { if (tok === N.roomTok) ov.classList.remove('travel'); }, 160);
        clearTimeout(N.cardTimer);
        N.cardTimer = setTimeout(() => card.classList.remove('show'), 2400);
    };
    const roomFor = k => {
        const st0 = N.steps[k];
        if (!st0) return;
        const r = roomOfMid(st0.mid);
        if (!r) { if (!N.room) showPlace(); return; }
        if (!N.room) { goToRoom(r, false); return; }
        if (r.key !== N.room.key) goToRoom(r, true);
    };
    // the speaker's portrait in the box: for those without sprites, or always
    const faceFor = st0 => {
        const el = $q('.rls-vn-face');
        let pic = '';
        if (st0 && st0.who !== '-' && settings.novelFace !== 'never') {
            const hasSprite = !!(N.sprites[st0.who] && N.sprites[st0.who].length);
            if (settings.novelFace === 'always' || !hasSprite) {
                if (st0.user) pic = user_avatar ? `/thumbnail?type=persona&file=${encodeURIComponent(user_avatar)}` : '';
                else pic = partFace(st0.who).pic || '';
            }
        }
        box.classList.toggle('face', !!pic);
        if (!pic) { el.innerHTML = ''; delete el.dataset.src; return; }
        if (el.dataset.src !== pic) { el.dataset.src = pic; el.innerHTML = `<img src="${escapeHtml(pic)}" alt="" draggable="false">`; }
    };
    // the suite's windows over the novel; while one is open the novel waits under it
    const hudBuild = () => {
        const bar = $q('.rls-vn-hud');
        const list = settings.novelHud !== false ? HUD.filter(h => { try { return h.ok(); } catch (e) { return false; } }) : [];
        const sig = list.map(h => h.id).join(',');
        if (bar.dataset.sig === sig) return;
        bar.dataset.sig = sig;
        bar.innerHTML = list.map(h => `<button type="button" class="rls-vn-hudbtn" data-hud="${escapeHtml(h.id)}" title="${escapeHtml(t(h.key))}" aria-label="${escapeHtml(t(h.key))}"><i class="fa-solid ${h.icon}"></i><span>${escapeHtml(t(h.key))}</span></button>`).join('');
    };
    $q('.rls-vn-hud').addEventListener('click', e => {
        const b0 = e.target.closest('[data-hud]');
        if (!b0) return;
        e.stopPropagation();
        const h = HUD.find(x => x.id === b0.dataset.hud);
        if (!h) return;
        ov.classList.add('under');
        try { h.go(); } catch (err) { console.warn('[Living Scene] novel: open', err); }
        let seen = false, ticks = 0;
        clearInterval(N.underTimer);
        N.underTimer = setInterval(() => {
            ticks++;
            const open = hudSomethingOpen();
            if (open) seen = true;
            if ((seen && !open) || (!seen && ticks > 6) || novel !== N) {
                clearInterval(N.underTimer);
                if (novel === N) { ov.classList.remove('under'); syncBg(); box.focus({ preventScroll: true }); }
            }
        }, 400);
    });
    N.look = () => {
        ov.className = ov.className.replace(/\b(box|size)-\S+/g, '').trim();
        ov.classList.add(`box-${settings.novelBox || 'parchment'}`, `size-${settings.novelSprite || 'large'}`);
        hudBuild(); showPlace(); faceFor(N.steps[N.idx]); infoSync(); fightSync(); plateSpan();
    };
    // the vines stand either side of the name plate, whatever its length
    const plateSpan = () => requestAnimationFrame(() => { if (novel === N) ov.style.setProperty('--rls-plate-half', (plate.getBoundingClientRect().width / 2 + 2) + 'px'); });
    // the small plate in the corner: time, day, place, weather — each one only if wanted and known
    const infoSync = () => {
        const el = $q('.rls-vn-info');
        const want = settings.novelInfo || {};
        let sc = null;
        try { sc = window.RPG && window.RPG.scene && window.RPG.scene.available !== false && typeof window.RPG.scene.get === 'function' ? window.RPG.scene.get() : null; } catch (e) { sc = null; }
        /* what the bridge leaves out (an older Scene Card, or its record missing a field) is read
           from the Scene Card's own record in the chat, the newest one that has a time or a date */
        if (!sc || !sc.time || !sc.weather || !sc.date) {
            const chat = getContext().chat || [];
            for (let i = chat.length - 1; i >= 0 && i >= chat.length - 40; i--) {
                const d = chat[i] && chat[i].extra && chat[i].extra.rpg_info_box;
                if (!d || typeof d !== 'object' || !(d.time || d.date)) continue;
                sc = Object.assign({}, sc || {});
                ['time', 'date', 'weather', 'location'].forEach(k => { if (!sc[k] && typeof d[k] === 'string' && d[k].trim()) sc[k] = d[k].trim(); });
                break;
            }
        }
        const time = want.time !== false && sc && sc.time ? String(sc.time) : '';
        // the date as the Scene Card wrote it (its "day" is only the first number in that date: 3 March was "Day 3")
        const day = want.date !== false && sc ? String(sc.date || (sc.day ? t('info_day_n', { n: sc.day }) : '')) : '';
        const place = want.place !== false ? (N.room ? placeText(N.room) : (sc && sc.location ? String(sc.location) : '')) : '';
        const wx = want.weather !== false && sc && sc.weather ? String(sc.weather) : '';
        const sig = [time, day, place, wx].join('|');
        ov.classList.toggle('info-place', !!place);
        if (el.dataset.sig === sig) return;
        el.dataset.sig = sig;
        const sep = '<span class="rls-vn-info-sep"></span>';
        const bits = [];
        if (time || day) bits.push(`<span class="rls-vn-info-moon">${vnMoon(time)}</span><span class="rls-vn-info-t">${time ? `<b>${escapeHtml(time)}</b>` : ''}${day ? `<i>${escapeHtml(day)}</i>` : ''}</span>`);
        if (place) bits.push(`<span class="rls-vn-info-place">${escapeHtml(place)}</span>`);
        if (wx) bits.push(`<span class="rls-vn-info-wx">${VN_CLOUD}<span>${escapeHtml(wx)}</span></span>`);
        el.innerHTML = bits.length ? `<div class="rls-vn-info-row">${bits.join(sep)}</div>` : '';
    };
    // RPG Vitals' bars: yours on the left, the enemies on the right — in a fight, or always
    const fightSync = () => {
        const el = $q('.rls-vn-fight');
        const V = window.RPG && window.RPG.vitals;
        let mine = null, foes = [], meters = {};
        try {
            if (settings.novelFight !== 'off' && V && V.available && (!V.isEnabled || V.isEnabled())) {
                foes = typeof V.getEnemies === 'function' ? V.getEnemies() : [];
                meters = typeof V.meters === 'function' ? V.meters() : {};
                if (settings.novelFight === 'always' || foes.length) mine = V.getHp ? V.getHp() : null;
            }
        } catch (e) { mine = null; foes = []; }
        if (!mine) foes = [];
        const show = settings.novelFightShow || {};
        const extra = [];
        try {
            if (mine && show.food && meters.hunger && V.getHunger) extra.push(['food', V.getHunger(), 100]);
            if (mine && show.fatigue && meters.fatigue && V.getFatigue) extra.push(['fatigue', V.getFatigue(), 100]);
            if (mine && show.mana && meters.mana && V.getMana) extra.push(['mana', V.getMana(), 100]);
        } catch (e) { /* a meter that is not there */ }
        const hpOn = show.hp !== false;
        const sig = JSON.stringify([mine, foes, extra, hpOn]);
        ov.classList.toggle('fight-on', !!mine);
        if (el.dataset.sig === sig) return;
        el.dataset.sig = sig;
        if (!mine) { el.innerHTML = ''; return; }
        const pct = (a, b) => Math.max(0, Math.min(100, Math.round((Number(a) || 0) / (Number(b) || 1) * 100)));
        const bar = (kind, v, max, label) => `<span class="rls-vn-bar ${kind}"><i style="width:${pct(v, max)}%"></i><b>${label}</b></span>`;
        const medal = (pic, name) => `<span class="rls-vn-medal">${pic ? `<img src="${escapeHtml(pic)}" alt="" draggable="false">` : `<span>${escapeHtml(String(name || '?').trim().slice(0, 1).toUpperCase())}</span>`}</span>`;
        const meIcon = user_avatar ? `/thumbnail?type=persona&file=${encodeURIComponent(user_avatar)}` : '';
        const myBars = (hpOn ? [bar('hp', mine.hp, mine.max, `${Math.round(mine.hp)} / ${Math.round(mine.max)}`)] : [])
            .concat(extra.map(([k, v]) => bar(k, v, 100, `${t('fight_' + k)} ${Math.round(Number(v) || 0)}`)));
        const meHtml = `<div class="rls-vn-fighter l">${medal(meIcon, me())}<span class="rls-vn-fbody"><span class="rls-vn-fname">${escapeHtml(me() || t('fight_you'))}</span>${myBars.join('')}</span></div>`;
        const foeHtml = foes.slice(0, 4).map(f => `<div class="rls-vn-fighter r">${medal('', f.name)}<span class="rls-vn-fbody"><span class="rls-vn-fname">${escapeHtml(f.name)}</span>${bar('hp', f.hp, f.max, `${Math.round(f.hp)} / ${Math.round(f.max)}`)}</span></div>`).join('');
        el.innerHTML = `<div class="rls-vn-fside l">${meHtml}</div><div class="rls-vn-fside r">${foeHtml}</div>`;
    };
    const syncChoices = () => {
        const atEnd = N.idx >= N.steps.length - 1;
        const id = (getContext().chat || []).length - 1;
        const panel = atEnd && !stBusy() ? document.querySelector(`#chat .mes[mesid="${id}"] .rpg-choices`) : null;
        const opts = panel ? [...panel.querySelectorAll('.rpg-choice:not([disabled])')] : [];
        const ask = panel ? panel.querySelector('.rpg-choices-ask') : null;
        const sig = opts.map(o => o.textContent.trim()).join('|') + (ask ? '|ask' : '');
        if (choices.dataset.sig === sig && (!!sig === !choices.hidden)) return;
        choices.dataset.sig = sig;
        choices.innerHTML = '';
        opts.forEach(o => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'rls-vn-choice';
            const key = o.querySelector('.rpg-choice-key'), text = o.querySelector('.rpg-choice-text');
            b.innerHTML = `<span class="k">${escapeHtml(key ? key.textContent : '')}</span><span class="q" aria-hidden="true">${vnFlower(16)}</span><span>${escapeHtml(text ? text.textContent : o.textContent)}</span>`;
            b.addEventListener('click', e => { e.stopPropagation(); if (stBusy()) { toastr.info(t('novel_busy')); return; } o.click(); choices.hidden = true; });
            choices.appendChild(b);
        });
        if (!opts.length && ask) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'rls-vn-choice ask';
            b.innerHTML = `<i class="fa-solid fa-shoe-prints"></i> <span>${escapeHtml(t('novel_ask'))}</span>`;
            b.addEventListener('click', e => { e.stopPropagation(); ask.click(); });
            choices.appendChild(b);
        }
        choices.hidden = !choices.children.length;
    };
    const syncBar = () => {
        hudBuild(); infoSync(); fightSync();
        const busy = stBusy();
        const ex = exploring();
        ov.classList.toggle('explore', !!ex);
        $q('.rls-vn-where').textContent = ex ? ex.where : '';
        $q('.rls-vn-solo').hidden = !ex;
        $q('.rls-vn-stop').hidden = !busy;
        const lastId = lastReplyId(), lastMes = (getContext().chat || []).length - 1;
        const canSwipe = !busy && lastId >= 0 && lastId === lastMes && !getContext().chat[lastId].is_user;
        $q('.rls-vn-prev').hidden = !canSwipe || !((getContext().chat[lastId].swipe_id || 0) > 0);
        $q('.rls-vn-next2').hidden = !canSwipe;
        $q('.rls-vn-regen').hidden = busy || lastMes < 0;
        // while the reply is being written, or split for the scene, there is nothing to send to:
        // the field is locked and the send seal turns
        const wait = busy || N.waitReply > 0;
        $q('.rls-vn-send').disabled = wait;
        $q('.rls-vn-say').classList.toggle('wait', wait);
        input.readOnly = wait;
        input.placeholder = t(wait ? 'novel_wait' : 'novel_say');
    };
    const show = (k, quiet = false, byHand = false) => {
        syncBg(); syncBar();
        if (!N.steps.length) {
            N.idx = -1;
            plate.textContent = '…';
            txt.className = 'rls-vn-text narr';
            txt.textContent = stBusy() ? '' : t('novel_empty');
            count.textContent = '';
            ov.classList.add('narr');
            box.classList.toggle('waiting', stBusy());
            syncChoices();
            return;
        }
        k = Math.max(0, Math.min(k, N.steps.length - 1));
        const moved = k !== N.idx;
        N.idx = k;
        if (byHand) N.follow = N.steps[k].mid === N.steps[N.steps.length - 1].mid;
        const st0 = N.steps[k];
        const narr = st0.who === '-';
        const ws = windowStart(k);
        const at = stageTo(stage, N.steps.slice(ws, k + 1), k - ws, N.sprites, me());
        let hue = 0; for (const ch of String(st0.who)) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
        ov.style.setProperty('--rls-hue', hue);
        ov.classList.toggle('narr', narr);
        ov.classList.toggle('mine', !!st0.user);
        box.classList.toggle('r', !narr && (st0.user || (at != null && at > 55)));
        plate.textContent = narr ? '…' : st0.who;
        plateSpan();
        txt.className = `rls-vn-text ${st0.kind}`;
        txt.innerHTML = stepHtml(st0);
        if (moved && !quiet) { txt.classList.remove('in'); void txt.offsetWidth; txt.classList.add('in'); }
        faceFor(st0);
        roomFor(k);
        const end = k === N.steps.length - 1;
        box.classList.toggle('waiting', end && stBusy());
        box.classList.toggle('end', end);
        count.textContent = end ? '' : `${k + 1} / ${N.steps.length}`;
        list.querySelectorAll('.rls-vn-logrow.cur').forEach(x => x.classList.remove('cur'));
        const row = list.querySelector(`[data-k="${k}"]`); if (row) row.classList.add('cur');
        syncChoices();
    };
    // rebuild from the chat; `playFrom` starts a reply from its beginning when the reader was waiting at the end
    const refresh = (playFrom = null) => {
        if (novel !== N) return;
        const cur = N.steps[N.idx];
        const curMid = cur ? cur.mid : null, curOff = cur ? N.idx - N.start.get(cur.mid) : 0;
        const tl = novelTimeline();
        N.steps = tl.steps; N.start = tl.start;
        list.innerHTML = N.steps.map((st0, k) => `<button type="button" class="rls-vn-logrow ${st0.kind}${st0.user ? ' mine' : ''}" data-k="${k}"><span class="rls-vn-logwho">${escapeHtml(st0.who === '-' ? '—' : st0.who)}</span><span class="rls-vn-logtext">${stepHtml(st0)}</span></button>`).join('');
        let k;
        const onMine = !!(cur && cur.user && playFrom != null && playFrom > cur.mid);   // you sent a line and wait: the answer to it plays
        if (playFrom != null && N.start.has(playFrom) && (N.follow || N.idx < 0 || onMine)) k = N.start.get(playFrom);
        else if (curMid != null && N.start.has(curMid)) k = Math.min(N.start.get(curMid) + curOff, N.steps.length - 1);
        else k = N.steps.length - 1;
        show(k, playFrom == null && k === N.idx);
        loadSprites();
    };
    N.refresh = refresh;
    N.syncBar = syncBar;
    const next = () => { if (!log.hidden) return; if (N.idx < N.steps.length - 1) show(N.idx + 1, false, true); else { N.follow = true; syncChoices(); if (choices.hidden) input.focus({ preventScroll: true }); } };   // never scroll SillyTavern's page under the novel
    const prev = () => { if (!log.hidden) return; if (N.idx > 0) show(N.idx - 1, false, true); };
    const toggleLog = on => { log.hidden = !on; $q('.rls-vn-logbtn').classList.toggle('on', on); if (on) { const row = list.querySelector('.cur'); if (row) { /* only the list scrolls: scrollIntoView moved the whole page and left a grey strip under it */ const lr = list.getBoundingClientRect(), rr = row.getBoundingClientRect(); list.scrollTop += (rr.top - lr.top) - (list.clientHeight - rr.height) / 2; } } };
    list.addEventListener('click', e => { const row = e.target.closest('.rls-vn-logrow'); if (!row) return; toggleLog(false); show(Number(row.dataset.k), false, true); box.focus(); });
    $q('.rls-vn-logbtn').addEventListener('click', e => { e.stopPropagation(); toggleLog(log.hidden); });
    $q('.rls-vn-close').addEventListener('click', e => { e.stopPropagation(); closeNovel(true); });
    $q('.rls-vn-solo').addEventListener('click', e => { e.stopPropagation(); document.getElementById('rpg-end-solo')?.click(); });
    const lastMesEl = () => document.querySelector('#chat .mes.last_mes') || [...document.querySelectorAll('#chat .mes')].pop();
    $q('.rls-vn-prev').addEventListener('click', e => { e.stopPropagation(); lastMesEl()?.querySelector('.swipe_left')?.click(); });
    $q('.rls-vn-next2').addEventListener('click', e => { e.stopPropagation(); lastMesEl()?.querySelector('.swipe_right')?.click(); });
    $q('.rls-vn-regen').addEventListener('click', e => { e.stopPropagation(); if (stBusy()) return; document.getElementById('option_regenerate')?.click(); });
    $q('.rls-vn-stop').addEventListener('click', e => { e.stopPropagation(); document.getElementById('mes_stop')?.click(); });

    box.addEventListener('click', e => { if (e.target.closest('a')) return; next(); });
    stage.addEventListener('click', next);
    // a line of your own: SillyTavern's own box and button send it, as if typed there
    const fit = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; };
    input.addEventListener('input', fit);
    $q('.rls-vn-say').addEventListener('submit', e => {
        e.preventDefault();
        const words = input.value.trim();
        if (!words) { next(); return; }
        if (stBusy() || N.waitReply > 0) { toastr.info(t('novel_busy')); return; }
        const ta = document.getElementById('send_textarea'), send = document.getElementById('send_but');
        if (!ta || !send) return;
        N.follow = true;
        $(ta).val(words).trigger('input');
        send.click();
        input.value = ''; fit();
        box.focus({ preventScroll: true });
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $q('.rls-vn-say').requestSubmit(); }
    });
    const onKey = e => {
        if (novel !== N) return;
        const typing = e.target && (e.target === input || e.target.closest?.('input, textarea, select, [contenteditable="true"]'));
        if (e.key === 'Escape') { e.preventDefault(); if (!log.hidden) toggleLog(false); else if (typing) input.blur(); else closeNovel(true); return; }
        if (typing || !log.hidden || !ov.contains(document.activeElement) && document.activeElement !== document.body) return;
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter' || e.key === 'PageDown') { e.preventDefault(); e.stopPropagation(); next(); }
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); e.stopPropagation(); prev(); }
    };
    document.addEventListener('keydown', onKey, true);
    N.off = () => document.removeEventListener('keydown', onKey, true);
    // what changes outside the chat's events: the room, Map's choices arriving, the stop button
    N.timer = setInterval(() => {
        if (novel !== N || document.hidden) return;
        syncBg(); syncBar(); syncChoices(); box.classList.toggle('waiting', N.idx >= N.steps.length - 1 && stBusy());
        // your own line is on screen and the answer to it is finished and split: it plays now,
        // even if the event that should have started it was missed
        const cur = N.steps[N.idx];
        if (N.follow && cur && cur.user && !stBusy()) {
            const chat = getContext().chat || [];
            const last = lastReplyId(), lm = chat[last];
            const lastMine = chat.map(m => !!(m && m.is_user)).lastIndexOf(true);
            if (cur.mid === lastMine && last > cur.mid && lm && !partsBusy.has(`${getContext().chatId}#${last}#${lm.swipe_id ?? 0}`) && novelStepsFor(last).length) refresh(last);
        }
    }, 700);
    // older browsers without overflow: clip — whatever scrolls the stage is put back
    ov.addEventListener('scroll', () => { if (ov.scrollTop || ov.scrollLeft) { ov.scrollTop = 0; ov.scrollLeft = 0; } });
    N.look();
    document.body.appendChild(ov);
    document.body.classList.add('rls-novel-on');
    N.idx = -1;
    // a reply chosen with its ▶: from its first line; else the newest reply
    N.goto = id => { refresh(null); if (N.start.has(id)) show(N.start.get(id), false, true); };
    if (fromId != null) { refresh(null); if (N.start.has(fromId)) show(N.start.get(fromId), false, true); }
    else refresh(lastReplyId() >= 0 ? lastReplyId() : null);
    box.focus({ preventScroll: true });
    if (!settings.novel) { settings.novel = true; saveSettings(); }
}
function closeNovel(byHand = false) {
    if (!novel) return;
    const N = novel;
    novel = null;
    N.off && N.off();
    clearInterval(N.timer);
    clearInterval(N.underTimer);
    clearTimeout(N.cardTimer);
    N.ov.classList.add('out');
    setTimeout(() => N.ov.remove(), 220);
    document.body.classList.remove('rls-novel-on');
    if (byHand && settings.novel) { settings.novel = false; saveSettings(); }
}
// a reply that has just come: played once its split by roles is in (or given up on)
// a reply that should be split for the scene and is not (yet): a bot's reply of two pieces or more
function novelNeedsSplit(id) {
    const m = getContext().chat[id];
    if (!m || m.is_user || m.is_system || !settings.enabled || settings.lineFaces === false) return false;   // in the novel replies are split whatever "split by itself" says
    if (partsView(id)) return false;
    return splitPieces(String(m.mes || '')).pieces.length >= 2;
}
async function novelOnReply(id) {
    if (!novel) return;
    const N = novel;
    N.waitReply = (N.waitReply || 0) + 1;
    try { await novelPlayReply(N, id); } finally { N.waitReply = Math.max(0, (N.waitReply || 1) - 1); if (novel === N && N.syncBar) N.syncBar(); }
}
async function novelPlayReply(N, id) {
    N.refresh(null);
    await new Promise(r => setTimeout(r, 700));   // the split is asked for 300 ms after the reply
    const ctx = getContext();
    const waitSplit = async () => {
        const until = Date.now() + waitFor(60000) + 5000;   // as long as the split itself may take
        while (novel === N && Date.now() < until) {
            const m = ctx.chat[id];
            const key = `${ctx.chatId}#${id}#${m ? (m.swipe_id ?? 0) : 0}`;
            if (!partsBusy.has(key)) break;
            await new Promise(r => setTimeout(r, 300));
        }
    };
    await waitSplit();
    /* The split failed (the model answered nothing usable, or an error): it is asked again by
       itself — twice more, a little apart — so a scene is never left as plain narration for the
       reader to fix by hand. Then the reply plays, split or, if it truly cannot be, as it is. */
    for (const pause of [1500, 4000]) {
        if (novel !== N || !novelNeedsSplit(id)) break;
        await new Promise(r => setTimeout(r, pause));
        if (novel !== N || !novelNeedsSplit(id)) break;
        askParts(id, false, true);
        await new Promise(r => setTimeout(r, 300));
        await waitSplit();
    }
    if (novel === N) N.refresh(id);
}
function novelMenuItem() {
    if (document.getElementById('rls-novel-wand')) { $('#rls-novel-wand span').text(t('novel_menu')); return; }
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return;
    const it = document.createElement('div');
    it.id = 'rls-novel-wand';
    it.className = 'list-group-item flex-container flexGap5';
    it.innerHTML = `<div class="fa-solid fa-book-open extensionsMenuExtensionButton"></div><span>${escapeHtml(t('novel_menu'))}</span>`;
    it.addEventListener('click', () => { if (!settings.enabled) return; if (novel) closeNovel(true); else if (isChatOpen()) openNovel(); });
    menu.appendChild(it);
}

// "split by roles" in the message's own menu: for older replies, or to ask again
function addSplitButton(mesEl, messageId) {
    const bar = mesEl.querySelector('.extraMesButtons');
    if (!bar) return;
    let b = bar.querySelector('.rls-split-btn');
    if (!settings.enabled || settings.lineFaces === false) { if (b) b.remove(); return; }
    if (!b) {
        b = document.createElement('div');
        b.className = 'mes_button rls-split-btn fa-solid fa-people-arrows';
        b.addEventListener('click', e => {
            e.stopPropagation();
            const id = Number(b.closest('.mes')?.getAttribute('mesid'));
            if (!Number.isFinite(id)) return;
            if (partsShowText.has(id)) { partsShowText.delete(id); const m = getContext().chat[id]; const sv = m && m.extra && m.extra.rls_parts && m.extra.rls_parts[m.swipe_id ?? 0]; if (sv && sv.h === partsHash(m.mes)) { renderParts(id); return; } }
            // a folded older reply: its saved split is drawn, nothing is asked again
            { const m = getContext().chat[id]; if (m && partsFolded(id, m) && partsView(id)) { partsUnfolded.add(`${getContext().chatId}#${id}#${m.swipe_id ?? 0}`); renderParts(id); return; } }
            askParts(id, true);
        });
        bar.prepend(b);
    }
    b.title = t('parts_btn');
}
// ▶ on a reply: that reply in the novel — split first if it is not yet, the novel opened if it is not yet
function addNovelButton(mesEl, messageId) {
    const bar = mesEl.querySelector('.mes_buttons');
    if (!bar) return;
    let b = bar.querySelector('.rls-novel-btn');
    if (!settings.enabled || settings.novelBtn === false) { if (b) b.remove(); return; }
    if (!b) {
        b = document.createElement('div');
        b.className = 'mes_button rls-novel-btn fa-solid fa-play';
        b.setAttribute('role', 'button');
        b.tabIndex = 0;
        const go = e => {
            e.stopPropagation();
            const id = Number(b.closest('.mes')?.getAttribute('mesid'));
            if (Number.isFinite(id)) playInNovel(id);
        };
        b.addEventListener('click', go);
        b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e); } });
        const extra = bar.querySelector('.extraMesButtonsHint');
        if (extra) extra.before(b); else bar.prepend(b);
    }
    b.title = t('novel_btn');
    b.setAttribute('aria-label', t('novel_btn'));
}
async function playInNovel(id) {
    if (!settings.enabled || !isChatOpen()) return;
    const msg = getContext().chat[id];
    if (!msg || msg.is_system) return;
    // not split yet: split it first (one call), then play
    if (!msg.is_user && settings.lineFaces !== false && !partsView(id) && apiKey()) {
        const btn = document.querySelector(`#chat .mes[mesid="${id}"] .rls-novel-btn`);
        btnBusy(btn, true);
        try { await askParts(id, false); } finally { btnBusy(btn, false); }
    }
    if (!novel) openNovel(id);
    else if (novel.goto) novel.goto(id);
}
/* ---- older replies folded ---- */
const PARTS_OPEN_LAST = 3;                 // the newest replies always in blocks
const partsUnfolded = new Set();           // opened by hand this session: chatId#id#swipe
function recentReplies() {
    const chat = getContext().chat || [];
    const out = new Set();
    for (let i = chat.length - 1; i >= 0 && out.size < PARTS_OPEN_LAST; i--) { const m = chat[i]; if (m && !m.is_user && !m.is_system) out.add(i); }
    return out;
}
function partsFolded(messageId, msg) {
    if (settings.partsFold === false || novel) return false;
    if (recentReplies().has(messageId)) return false;
    return !partsUnfolded.has(`${getContext().chatId}#${messageId}#${(msg && msg.swipe_id) ?? 0}`);
}
// a new reply came: the ones now past the last few fold (drawn blocks of replies opened by hand stay)
let refoldTimer = 0;
function refoldParts() {
    clearTimeout(refoldTimer);
    refoldTimer = setTimeout(() => {
        if (settings.partsFold === false) return;
        const chat = getContext().chat || [];
        document.querySelectorAll('#chat .mes[mesid] .rls-parts').forEach(w => {
            const id = Number(w.closest('.mes').getAttribute('mesid'));
            if (partsFolded(id, chat[id])) renderParts(id);
        });
    }, 120);
}
function renderAllParts() {
    const chat = getContext().chat || [];
    document.querySelectorAll('#chat .mes[mesid]').forEach(el => { const id = Number(el.getAttribute('mesid')); if (chat[id] && !chat[id].is_user) renderParts(id); });
}
// Cyrillic ⇄ Latin, so a card named in Russian is found in an English reply (Мира / Mira)
const TR_CYR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const TR_LAT = [['sch', 'щ'], ['sh', 'ш'], ['ch', 'ч'], ['zh', 'ж'], ['ts', 'ц'], ['yu', 'ю'], ['ya', 'я'], ['kh', 'х'], ['a', 'а'], ['b', 'б'], ['c', 'к'], ['d', 'д'], ['e', 'е'], ['f', 'ф'], ['g', 'г'], ['h', 'х'], ['i', 'и'], ['j', 'дж'], ['k', 'к'], ['l', 'л'], ['m', 'м'], ['n', 'н'], ['o', 'о'], ['p', 'п'], ['q', 'к'], ['r', 'р'], ['s', 'с'], ['t', 'т'], ['u', 'у'], ['v', 'в'], ['w', 'в'], ['x', 'кс'], ['y', 'й'], ['z', 'з']];
function translit(x) {
    const low = String(x || '').toLowerCase();
    if (/[а-яё]/.test(low)) return low.split('').map(ch => TR_CYR[ch] ?? ch).join('');
    let out = '', i = 0;
    while (i < low.length) { const hit = TR_LAT.find(([l]) => low.startsWith(l, i)); if (hit) { out += hit[1]; i += hit[0].length; } else { out += low[i]; i++; } }
    return out;
}
// how a name can be found in the text, in either alphabet
function probesFor(n) {
    // "The Cook" is found by "Cook", never by "the"
    const pr = probesOf(n).filter(x => !SMALL_WORDS.has(x));
    aliasNamesOf(n).forEach(a0 => { const words = String(a0).trim().split(/\s+/); if (words.length > 1 && SMALL_WORDS.has(words[0].toLowerCase())) { const st0 = nameStem(words[1]); if (st0.length >= 3) pr.push(st0); } });
    // the other words of a full name count too: «Пак Джун» is called Jun, Alexander James Ashford is Ashford
    aliasNamesOf(n).forEach(a0 => String(a0).trim().split(/\s+/).slice(1).forEach(wd => { if (SMALL_WORDS.has(wd.toLowerCase())) return; const st1 = nameStem(wd); if (st1.length >= 4) pr.push(st1); }));
    pr.slice().forEach(x => {
        const tr = translit(x);
        if (!tr || tr === x || tr.length < 3) return;
        pr.push(tr);
        // «Джун» is Jun, «Джон» is Jon, «Кадзуки» is Kazuki: дж and дз are also written j, й also i
        const alt = tr.replace(/dzh|dz/g, 'j').replace(/y(?=[^aeiouy]|$)/g, 'i');
        if (alt !== tr && alt.length >= 3) pr.push(alt);
    });
    return [...new Set(pr)];
}
// portraits and names the scene knows: the chat's cards, the roster's NPCs, the diary's people, the player
let candCache = null;
function faceCandidates() {
    // asked for every block of a redraw: the answer is kept for a moment
    const key = `${getContext().chatId}|${selected_group || ''}`;
    if (candCache && candCache.key === key && Date.now() - candCache.at < 400) return candCache.list;
    const list = buildCandidates();
    candCache = { key, at: Date.now(), list };
    return list;
}
function buildCandidates() {
    const ctx = getContext();
    const out = [], seen = new Set();
    const add = (name, pic, kind) => {
        const n = String(name || '').trim();
        if (!n) return;
        if (seen.has(n.toLowerCase())) {
            // the same person from another source: their picture fills a gap, never replaces one
            const had = out.find(x => x.name.toLowerCase() === n.toLowerCase());
            if (had && !had.pic && pic) had.pic = pic;
            return;
        }
        const cand = { name: n, pic: pic || '', kind, probes: probesFor(n) };
        // the same person written another way ("Mira" in the diary, «Мира» in the roster):
        // one entry, the first name stays; both names have to find each other, so Ann is not Anna
        const twin = kind !== 'user' && out.find(x => x.kind !== 'user' && namesIn(n, [x]).length && namesIn(x.name, [cand]).length);
        if (twin) { if (!twin.pic && pic) twin.pic = pic; seen.add(n.toLowerCase()); return; }
        seen.add(n.toLowerCase());
        out.push(cand);
    };
    try {
        // a card of the same name lends its face — but not to a description like "The Cook", which many cards share
        // (only when one card has that name: two cards called the same are two different stories)
        const thumb = av => `/thumbnail?type=avatar&file=${encodeURIComponent(av)}`;
        const cardPic = nm => { if (/^(the|a|an)\s/i.test(String(nm || '').trim())) return ''; const cs = characters.filter(x => x && x.name === nm && x.avatar); return cs.length === 1 ? thumb(cs[0].avatar) : ''; };
        if (selected_group) {
            const g = (groups || []).find(x => x && x.id === selected_group);
            (g && g.members || []).forEach(av => { const c = characters.find(x => x && x.avatar === av); if (c) add(c.name, thumb(c.avatar), 'card'); });
        } else if (ctx.characterId !== undefined && characters[ctx.characterId]) add(characters[ctx.characterId].name, characters[ctx.characterId].avatar ? thumb(characters[ctx.characterId].avatar) : '', 'card');   // this chat's own card, not another of the same name
        const st = sceneState();
        st.npcs.forEach(n => add(n.name, cardPic(n.name), 'npc'));
        diaryNpcs().forEach(n => add(n.name, (typeof n.portrait === 'string' && n.portrait) || cardPic(n.name), 'npc'));
        phoneCast().forEach(n => add(n, cardPic(n), 'npc'));   // the people inside the card, as RPG Phone lists them
        add(ctx.name1 || name1, user_avatar ? `/thumbnail?type=persona&file=${encodeURIComponent(user_avatar)}` : '', 'user');
        // still no face: a diary portrait or a card of the same person under another written name
        // ("Луна" in the roster, "Luna" in the diary — aliases, Phone's «Also called» and learned forms count)
        const npcs = diaryNpcs().filter(n => typeof n.portrait === 'string' && n.portrait);
        out.forEach(c => {
            if (c.pic || c.kind === 'user') return;
            const d = npcs.find(n => namesIn(n.name, [c]).length);
            if (d) { c.pic = d.portrait; return; }
            // a card from the library only when it is this very person: the whole name, one of their
            // aliases, or the whole name in the other alphabet («Луна» / "Luna") — and only one such card.
            // A card that merely shares a first name ("Sam …" of another story) is somebody else.
            const norm = x => String(x || '').trim().toLowerCase().replace(/ё/g, 'е');
            const forms = new Set(aliasNamesOf(c.name).map(norm));
            const cyr = x => /[а-яё]/i.test(x);
            const same = characters.filter(x => x && x.avatar && x.name && (forms.has(norm(x.name))
                || (cyr(x.name) !== cyr(c.name) && String(x.name).trim().split(/\s+/).length === c.name.split(/\s+/).length && sameSound(latinOf(x.name), latinOf(c.name)))));
            if (same.length === 1) c.pic = `/thumbnail?type=avatar&file=${encodeURIComponent(same[0].avatar)}`;
        });
    } catch (e) { console.warn('[Living Scene] roles: cast', e); }
    return out.filter(c => c.probes.length);
}
// where each name stands in a piece of text: [{ c, at }]
function namesIn(text, cands) {
    const low = String(text || '').toLowerCase().replace(/ё/g, 'е');
    const hits = [];
    cands.forEach(c => c.probes.forEach(pr => {
        const p = pr.replace(/ё/g, 'е');
        let i = low.indexOf(p);
        while (i !== -1) {
            if (!/[\p{L}\p{N}]/u.test(i > 0 ? low[i - 1] : ' ')) hits.push({ c, at: i });
            i = low.indexOf(p, i + 1);
        }
    }));
    return hits.sort((a, b) => a.at - b.at);
}
function onlyOne(hits) {
    const names = [...new Set(hits.map(h => h.c.name))];
    return names.length === 1 ? hits[0].c : null;
}

jQuery(() => {
    loadSettings();
    console.log(`[Living Scene] loaded — who speaks next: ${settings.passEnabled ? 'ON' : 'OFF'}, fallback to a random enabled member: ${settings.passFallbackRandom ? 'ON' : 'OFF'}`);
    setupUI();
    renderRosterButton();
    initLayer();
    novelMenuItem();   // the wand menu: "Novel mode" (SillyTavern builds that menu late: again once the app is ready)
    if (event_types.APP_READY) eventSource.on(event_types.APP_READY, novelMenuItem);
    setTimeout(novelMenuItem, 1500);

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

    /* Your message is still inside SillyTavern's group wrapper when MESSAGE_SENT
       fires — saving the chat, deciding nobody replies on Manual — and the wrapper
       silently ignores anything started while it runs. So the message is noted
       here and the turn is decided on GROUP_WRAPPER_FINISHED, once it is free. */
    const hasWrapperEvents = !!event_types.GROUP_WRAPPER_FINISHED;
    let pendingTurn = null;          // { id, fromUser }

    eventSource.on(event_types.MESSAGE_RECEIVED, (messageId) => {
        setTimeout(() => processMessage(messageId), 60);
        if (hasWrapperEvents && selected_group) pendingTurn = { id: messageId, fromUser: false };
        else setTimeout(() => passTheTurn(messageId, false), 400);
    });

    eventSource.on(event_types.MESSAGE_SENT, (messageId) => {
        roomMark(messageId);
        turnChain = 0;                       // the player wrote: the chain starts over
        if (settings.reactToUser) setTimeout(() => processMessage(messageId), 60);
        if (hasWrapperEvents && selected_group) {
            const job = { id: messageId, fromUser: true };
            pendingTurn = job;
            turnLog(`message #${messageId} sent — deciding once the group is free`);
            // if the "group finished" signal never comes, do not wait forever
            setTimeout(() => {
                if (pendingTurn !== job) return;
                pendingTurn = null;
                turnLog('no "group finished" signal after 3s — deciding anyway');
                passTheTurn(job.id, job.fromUser);
            }, 3000);
        } else setTimeout(() => passTheTurn(messageId, true), 400);
    });

    if (hasWrapperEvents) {
        eventSource.on(event_types.GROUP_WRAPPER_FINISHED, () => {
            const job = pendingTurn;
            pendingTurn = null;
            if (!job) return;
            // let the wrapper's own cleanup settle before starting a new one
            setTimeout(() => passTheTurn(job.id, job.fromUser), 150);
        });
    }

    eventSource.on(event_types.CHAT_CHANGED, () => {
        turnChain = 0;
        turnWarned = false;
        turnQueued = null;
        turnNoteFor = '';
        setExtensionPrompt(TURN_KEY, '', 0, 0, false);
    });

    // knowing whether ST is mid-generation is what keeps /trigger from colliding
    eventSource.on(event_types.GENERATION_STARTED, () => { generating = true; });
    ['GENERATION_ENDED', 'GENERATION_STOPPED', 'MESSAGE_RECEIVED'].forEach(k => {
        if (event_types[k]) eventSource.on(event_types[k], () => { generating = false; });
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

    // the scene by roles: drawn whenever SillyTavern draws a message's text again
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (messageId) => { renderParts(messageId); refoldParts(); });
    ['MESSAGE_UPDATED', 'MESSAGE_SWIPED', 'MESSAGE_EDITED'].forEach(k => {
        if (event_types[k]) eventSource.on(event_types[k], (messageId) => setTimeout(() => renderParts(messageId), 30));
    });
    eventSource.on(event_types.CHAT_CHANGED, () => {
        partsShowText.clear(); closeScene(); spritePeople.clear(); setTimeout(renderAllParts, 400);
        // the novel stays the way you left it: open in the next chat too
        setTimeout(() => {
            if (!settings.enabled || !settings.novel || !isChatOpen()) { closeNovel(); return; }
            if (novel) { novel.idx = -1; novel.sprites = {}; novel.refresh(lastReplyId()); } else openNovel();
        }, 500);
    });
    eventSource.on(event_types.MESSAGE_RECEIVED, id => { if (novel) novelOnReply(Number(id)); });
    // your own message: shown at once (it is yours, nothing to wait for)
    [event_types.MESSAGE_SENT, event_types.USER_MESSAGE_RENDERED].forEach(ev => { if (ev) eventSource.on(ev, () => setTimeout(() => { if (!novel) return; const chat = getContext().chat || []; const last = chat.length - 1; if (last >= 0 && chat[last].is_user) novel.refresh(last); }, 30)); });
    [event_types.MESSAGE_SWIPED].forEach(ev => { if (ev) eventSource.on(ev, id => { if (novel) { novel.follow = true; setTimeout(() => novel && novel.refresh(Number(id)), 40); } }); });
    [event_types.MESSAGE_DELETED, event_types.MESSAGE_EDITED, event_types.MESSAGE_UPDATED, event_types.GENERATION_STARTED, event_types.GENERATION_ENDED, event_types.GENERATION_STOPPED].forEach(ev => { if (ev) eventSource.on(ev, () => { if (novel) setTimeout(() => novel && novel.refresh(null), 40); }); });
    // a portrait put into the diary shows on the blocks already drawn, not only on the next reply
    let diaryFaces = '';
    eventSource.on(event_types.SETTINGS_UPDATED, () => {
        const sig = diaryNpcs().map(n => `${n.name}:${typeof n.portrait === 'string' ? n.portrait.length : 0}`).join('|');
        if (sig === diaryFaces) return;
        const first = !diaryFaces && !sig;
        diaryFaces = sig;
        if (!first && document.querySelector('#chat .rls-parts')) { candCache = null; renderAllParts(); }
    });
    // a finished reply is read once, after the bubbles have had their turn
    eventSource.on(event_types.MESSAGE_RECEIVED, (messageId) => { soloMark(messageId); roomMark(messageId); setTimeout(() => { if (settings.partsAuto !== false || novel) askParts(messageId); }, 300); });
    /* a split reply whose text changed afterwards (you edited it, an extension rewrote it): its blocks no
       longer fit and it fell back to plain text — with the split on by itself, it is read again */
    const restale = {};
    ['MESSAGE_UPDATED', 'MESSAGE_EDITED'].forEach(k => {
        if (event_types[k]) eventSource.on(event_types[k], messageId => {
            const id = Number(messageId);
            clearTimeout(restale[id]);
            restale[id] = setTimeout(() => {
                if (!(settings.partsAuto !== false || novel)) return;
                const m = getContext().chat[id];
                if (!m || m.is_user || m.is_system) return;
                const sv = m.extra && m.extra.rls_parts && m.extra.rls_parts[m.swipe_id ?? 0];
                if (sv && sv.h !== partsHash(m.mes) && !document.querySelector(`#chat .mes[mesid="${id}"] .mes_text textarea`)) askParts(id);
            }, 500);
        });
    });
    // editing needs the real text: the blocks step aside while the editor is open
    $(document).on('click', '.mes_edit', function () {
        const mes = this.closest('.mes');
        if (!mes) return;
        const p = mes.querySelector('.rls-parts'); if (p) p.remove();
        const tx = mes.querySelector('.mes_text'); if (tx) tx.classList.remove('rls-hidden');
    });
});
