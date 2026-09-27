# RPG Living Scene

A SillyTavern extension that gives your **group chats a background**. Characters who are present in the scene but aren't the one speaking drop short reactions as **glassy bubbles floating beside the messages** — a quiet remark, a 💭 thought they'd never say out loud, or two of them whispering to each other. Answer a bubble and that character replies properly, in the main chat, with their own card.

**Version 1.7.2**

---

## ✨ Features

- 💬 **Ambient bubbles** — up to a few short reactions per message, generated in **one API call** for the whole cast.
- 💭 **Thoughts** — some reactions are inner thoughts, drawn in their own dreamier style (optional).
- 🗨 **Background whispers** — two present characters can murmur to each other about what just happened, in a tight little side thread.
- 🎭 **Roster** — one click shows who is in the scene: group members, your own NPCs (no card needed) and NPCs the **RPG Diary** already knows. Toggle anyone in or out.
- 🤖 **Auto-presence** — characters mentioned in recent messages count as present automatically, marked *auto* in the roster.
- ✎ **Aliases & notes** — give a character alternate spellings (fixes translated cards and declensions) and a hand-written character note that outranks the card.
- 🧠 **Line memory** — each character sees their own recent bubbles, so their attitude evolves instead of repeating.
- 💬 **Reply from a bubble** — a mini input right in the bubble sends your line to the main chat and triggers **that character's** reply. Your line can quote what they said.
- 🔄 **Reroll** — regenerate a single bubble without touching the others.
- 🪄 **Stir the scene** — a wand by the newest message generates reactions on demand, ignoring the dice.
- 📝 **Injection** — the bubbles are handed to your main model as quiet context (with depth control), so you can answer them and the story keeps them canon.
- 🙋 **Reacts to you too** — optional, with its own lower chance: the room can respond to **your** messages, not just the bot's.
- 🎬 **Small \*actions\*** — bubbles may carry a tiny physical beat (optional, off by default).
- 🌍 **Bilingual UI (RU / EN)** — the AI writes in the interface language.

## 📦 Install

Copy the `RPG-Living-Scene` folder into:

```
SillyTavern/data/<user>/extensions/
```

Reload SillyTavern and enable it in **Extensions → RPG Living Scene**.

## ⚙️ Setup

1. Enable **Living Scene**.
2. Pick the **interface language** (English / Русский).
3. Fill in **API Settings** (URL / key / model) — any OpenAI-compatible text endpoint (default: OpenRouter). A small cheap model is plenty.
4. Open a group chat and press the 🎭 button at the bottom-right to choose who is in the scene.

Everything else is optional tuning: reaction chance, max reactions per message, per-character cooldown, whisper chance, and how far below the message the bubbles start on each side.

## 🧠 How it decides who speaks

- The **current speaker** never gets a bubble.
- Neither does anyone with **attributed direct speech** in the same message — their voice is already on screen. Silent observers stay eligible, however often they're described.
- Anyone who barked recently sits out for a few messages (whispers are exempt).
- One bubble per character per message; a character in a whisper exchange doesn't also get a separate line.
- Reactions that merely echo a line already in the text are dropped.

## 🔗 Works with the suite

- **RPG Diary** — NPC dossiers become scene characters, with their role and personality feeding the prompt.
- **Dual-Model Thoughts** — the left column starts lower by default so the two don't overlap; adjust the offsets in settings if your layout differs.

## 💾 Storage

Presence, custom NPCs, aliases and notes live in the chat's own metadata; the bubbles are stored on the messages they belong to and survive reloads. Bubbles are tied to the swipe they were written for, so swiping away a reply takes its reactions with it.

# 🎬 Who speaks next (group chats)

In a group, somebody has to decide who answers. Left alone, either everyone
answers every line, or one character quietly starts playing all the others.
Living Scene now decides — and it decides from the line you just wrote.

**Version 1.9.0**

---

## How it reads a line

- 🗣️ **Addressed by name** — *"Albert, pour me a drink"* → Albert answers. Nicknames
  from the roster count too.
- 👀 **Looked at, turned to, nodded at** — *"\*Jenny looked at Albert and nodded.\*"* →
  Albert answers. A look is an address.
- 💬 **Named inside speech, in the third person** — *"Sebastian helped me a lot"* → nobody
  is summoned. Talking **about** someone is not talking **to** them.
- 🧍 **Alone with one character** → they answer, no name needed.
- ➡️ **Nobody new addressed** → the conversation carries on with whoever you were
  already talking to.
- 🤫 **Still nothing** → nobody is triggered and the turn stays yours. Silence is a
  valid answer, and the default one.
- 🧠 Unsure? One short request to the **side model** (the same one that writes the
  bubbles) settles it. Small prompt, one line back — a local model is plenty.

Muted members never answer, and neither does anyone you switched off in the roster.

## ⚙️ Settings

| Setting | What it does |
|---|---|
| Hand the turn to whoever is addressed | The feature itself. Works with the bubbles off. |
| After my message | Decide once you have written. |
| Let characters answer each other | They may reply to each other, not only to you. |
| Replies in a row without me | 0–5. How far a conversation may run before it is your turn again. |
| Confidence needed | 0–1. Lower it to act on a mere mention, raise it for name-only. |
| Never the same character twice running | Keeps one voice from holding the floor. |
| Ask the side model when unclear | Turn off to keep it rules-only and free. |
| Ask them to speak only as themselves | Injects a short note so one character stops writing everyone else's lines. |
| Still nobody → a random enabled member | Lets SillyTavern draw a random unmuted member. Off by default. |

## 📋 One requirement

The group's own reply order must be set to **Manual** — *"characters reply… when you
say so"*. On any automatic order SillyTavern picks speakers by itself, and two
directors means three characters queued instead of one.

There is a button for it in the settings: **Set this group to reply manually**. Some
themes hide that dropdown; the button writes the same field. The line under it always
shows the current state.
