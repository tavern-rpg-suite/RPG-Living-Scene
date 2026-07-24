# RPG Living Scene

A SillyTavern extension that gives your **group chats a background**. Characters who are present in the scene but aren't the one speaking drop short reactions as **glassy bubbles floating beside the messages** — a quiet remark, a 💭 thought they'd never say out loud, or two of them whispering to each other. Answer a bubble and that character replies properly, in the main chat, with their own card.

**Version 1.7.1**

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
