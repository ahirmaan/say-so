<!--
AI coding assistance disclosure: this project's code, architecture, and this
README were written with the assistance of Claude (Anthropic), via Claude Code,
working from a detailed spec provided by the project author. Disclosed per
Bolna x YC Buildathon (Symphony 2026) norms.
-->

# Say.so

A push-to-talk voice assistant that appears as a small floating pill on screen
only while you're using it. Press a hotkey, speak a fact, and Say.so cleans
it up, files it into a folder, saves it, and speaks back a confirmation —
hands-free, no text field involved.

Built for the Bolna x Y Combinator Buildathon (Symphony 2026).

## Why not Bolna's API for the voice loop?

Bolna's platform (`api.bolna.ai` / `platform.bolna.ai`) is built around **phone-call
voice agents**: you create an agent (STT + LLM + TTS pipeline), then trigger it
over a phone call or the Web Call SDK, and fetch a transcript afterwards. There's
no standalone "send a short clip, get a transcript back" or "send text, get audio
back" endpoint — every STT/TTS provider Bolna integrates with is wired in as a
component *inside* an agent/call, not exposed as a direct REST call.

That's a mismatch for Say.so's loop: a hotkey press needs to capture a few
seconds of audio and get a transcript back in roughly real time, with no call
setup, SIP/websocket session, or "agent" indirection. Modeling that as a phone
call would add latency and moving parts without benefit for a desktop app.

So Phase 1 uses a different stack, picked to be fast, accurate, and effectively
**free** to run for a demo:

- **STT:** [Groq](https://groq.com), running `whisper-large-v3-turbo` — the
  same Whisper model OpenAI uses, on Groq's LPU hardware (~200x realtime).
  Free tier: 2,000 requests/day, no card required. Even past that, it's
  ~$0.04/hour of audio vs. OpenAI's ~$0.36/hour.
- **TTS:** [Fish Audio](https://fish.audio)'s free developer tier
  (`s2.1-pro-free`) for the confirmation voice, with your OS's own
  built-in voice (via the `say` package — Windows SAPI / macOS `say` /
  espeak on Linux) as an automatic fallback if Fish Audio ever errors,
  rate-limits, or is slow. Fish Audio's free tier has no hard usage cap but
  also no SLA — the fallback exists so a flaky response never stalls the demo.
- **Fact extraction + folder routing:** Claude Haiku 5.5
  (`anthropic/claude-haiku-5.5`) via **OpenRouter**, not the Anthropic API
  directly, since that's the key this project uses. (Note: OpenRouter is
  text-only — no audio endpoints — hence separate STT/TTS providers above.)

Net result: **no OpenAI key needed anywhere**, and a full demo costs nothing
beyond Fish Audio's free tier running out mid-way (at which point it falls
back to a free local voice anyway).

If more time opens up, revisiting Bolna's Web Call SDK (browser-based calls,
not phone calls) is the most plausible path to using their stack — noted as a
possible follow-up, not attempted for this MVP given the deadline.

## How the loop works

Say.so is driven entirely by one hotkey (default **F9**). You don't need to
hold it down:

1. **Press the hotkey and speak.** The pill appears, showing a live waveform
   (white bars) that reacts to your voice's volume as you talk.
2. **Just stop talking when you're done.** Say.so watches your mic's live
   volume and automatically detects when you've gone quiet for about a
   second and a half, then stops and processes on its own — no second key
   press needed. (If you want to cut it short manually, pressing the hotkey
   again at any point while it's listening stops it immediately instead.)
3. The transcript goes to Claude (via OpenRouter), which first decides what
   you actually want, before doing anything else:
   - **A fact to save** ("remember that...", or just stating something plainly)
     → cleans it up, decides which folder it belongs in, and saves it.
   - **A genuine question** ("who is...", "what is...", "tell me about...")
     → answers it conversationally, from Claude's own knowledge (no live web
     search - if it's about very recent events past its training, it says so
     rather than guessing), in the *same breath* as asking "want me to save
     that as a fact?" if there's something worth remembering. Say no (or say
     up front "just curious, don't save this") and nothing gets filed.
   - **Chat / small talk** → just replies naturally, nothing saved.

   Claude's reasoning for the folder decision is printed to the terminal, so
   it's easy to show *why* a fact landed where it did.
4. If a fact needs filing and the folder is clear, it's saved immediately.
   If it's ambiguous, the pill asks out loud "Which folder should this go
   in, or should I make a new one?" and starts listening again the same way
   - just answer it, no need to hold anything.
   - If you name an **existing** folder, it saves right away.
   - If you name a folder that **doesn't exist**, it asks back: "*\<name\>*
     doesn't exist yet. Want me to create it?" Say yes and it creates the
     folder and saves there; say no and it asks "which folder, then?" again
     instead of silently creating something you didn't actually ask for.
5. The pill speaks its response (purple waveform, reacting to the TTS voice
   too when it's the Fish Audio path) - a save confirmation, a question's
   answer, or just a reply - then disappears until the next time you press
   the hotkey. **Start talking while it's still speaking and it stops
   immediately** (barge-in, see below) instead of talking over you.

Note on the caption text under the waveform: it shows what *Say.so is
saying*, not a live transcript of your own speech - Groq's Whisper endpoint
only returns a transcript once it's received the entire clip, so there's no
real-time captioning of you talking. The words you see streaming in are the
spoken reply, revealed quickly as it starts speaking.

The TTS voice is Fish Audio's free "Sarah" voice (natural, conversational
female voice), and every line sent to it carries [bracket] emotion/delivery
tags (`[warm][happy]`, `[curious]`, `[apologetic]`, etc. - Fish Audio's S2
expressiveness markup) so confirmations and questions don't sound flat. Those
tags are stripped automatically when falling back to the local OS voice,
which doesn't understand them.

The pill is only ever on screen while a listen/process/speak cycle is active —
it's not a persistent floating overlay. States are shown through color and
animation (white = listening, amber spinner = processing, purple = speaking)
— no text needed to tell what's happening, though the transcript caption adds
text once there's something to show.

### Picking a different hotkey

Default is **F9** — a function key, deliberately: it's never used for normal
typing or OS shortcuts, so the global key watcher (see below) can't collide
with anything. Set `SAYSO_HOTKEY` in `.env` to something else, e.g.
`Control+Shift+X`, if you want a modifier combo instead — just be aware that
**the watcher only observes key events, it can't suppress them**, so a combo
that's also an OS/app shortcut (`Control+X` = Cut, for example) will still do
its normal thing elsewhere, in addition to triggering Say.so.

## Tech stack

- **Electron** for the floating pill UI (chosen over Tauri for speed of
  iteration within the deadline — the whole stack is JS, no Rust toolchain).
- **uiohook-napi** for a true global hotkey that works even when the app
  isn't focused, and supports a manual "press again to stop early" override.
  (Electron's own `globalShortcut` API would technically work for a simple
  tap-to-trigger hotkey, but this already-integrated low-level keyboard hook
  covers that too, cross-platform, N-API-based, no Electron-specific rebuild
  needed.)
- **Web Audio `AnalyserNode`** for both the waveform visuals and voice-activity
  detection (auto-stop on silence) - the same live mic volume data drives
  both, so there's no separate silence-detection library.
- **better-sqlite3** for local-first storage (`data/sayso.db`, gitignored).
  No cloud dependency required to run the demo.
- Renderer captures mic audio via `MediaRecorder`/`getUserMedia`, and drives
  the equalizer via the Web Audio API (`AnalyserNode`) on both the mic stream
  and the TTS playback. All API keys live only in the main process, never
  the renderer.

## Setup

### 1. Install dependencies

```bash
npm install
```

This also runs `electron-rebuild` and builds the dashboard's React app (via
`postinstall`) - see "Dashboard" below for what that is.

> **If install scripts get skipped:** some npm setups (including a sandboxed
> terminal) gate native packages' install/postinstall scripts behind an
> allowlist, which can silently leave `better-sqlite3` or `esbuild` (used by
> the dashboard's build) without their native binary, surfacing later as a
> `NODE_MODULE_VERSION` mismatch or a missing-binary error. Fix: `npm rebuild
> <package> --foreground-scripts` (e.g. `npm rebuild better-sqlite3
> --foreground-scripts`, or `cd dashboard-ui && npm rebuild esbuild
> --foreground-scripts`), then retry.

### 2. Add your API keys

Copy `.env.example` to `.env` and fill in:

```
GROQ_API_KEY=         # speech-to-text (Whisper via Groq) - free tier, no card
FISH_API_KEY=         # text-to-speech (Fish Audio) - free tier
OPENROUTER_API_KEY=   # fact extraction + folder routing (Claude via OpenRouter)
SAYSO_HOTKEY=F9       # optional, this is the default
```

If `FISH_API_KEY` is missing or Fish Audio errors, confirmations still speak
via your OS's built-in voice — no key needed for that path at all.

### 3. Seed starter folders (optional but recommended for a demo)

```bash
npm run seed
```

Creates three starter folders — "Ideas", "Decisions", "Random" — so the demo
isn't starting from a completely empty state.

### 4. Run it

```bash
npm start
```

Nothing appears on screen until you use it. Press `F9` (or whatever you set
`SAYSO_HOTKEY` to) from anywhere — the app doesn't need to be focused — and
the pill appears with a live waveform. See "How the loop works" above for how
it auto-stops when you stop talking.

The first time you record, your OS will prompt for microphone access (Say.so
auto-grants Electron's own permission dialog; your OS-level mic privacy
setting is separate and may still ask once).

**No terminal window needed day-to-day:** double-click
[`Launch Say.so.vbs`](Launch%20Say.so.vbs) instead of running `npm start` —
it starts the app with no visible console window. A copy of it is also
registered in your Windows Startup folder
(`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Say.so.vbs`), so it
starts automatically the next time you log in — the hotkey just works, no
manual step at all. Delete that file from the Startup folder if you ever want
to turn that off.

### Pill appearance

The pill sits centered horizontally near the top of the screen, and is only
ever drawn there while active — it animates in (fade + pop) when a
listen/process/speak cycle starts, and animates back out when it returns to
idle, rather than snapping instantly on/off.

- **White** waveform = you're speaking (listening).
- **Purple** waveform = Say.so is speaking back (TTS).
- **Amber spinner** = processing (transcribing / thinking).
- The pill grows a little taller once there's a transcript to show, with the
  text streaming in under the waveform (see "How the loop works" above).
- The pill itself has a white frosted-glass look, done entirely in CSS
  (`backdrop-filter` + a translucent gradient). Windows' native acrylic
  background material was tried here too, but it paints its blur across the
  whole rectangular window at the OS compositor level, which overrode this
  window's rounded, transparent-background pill shape — so it's deliberately
  not used; the CSS approach is the real implementation, not a fallback.

### Dashboard

A tray icon (bottom-right of your taskbar on Windows, menu bar on macOS) gives
you:
- **Open Dashboard** — a full knowledge-management UI for everything the
  assistant has captured (see below).
- **Quit Say.so** — the pill window has no title bar or taskbar entry by
  design, so this is the way to close the app.

Double-clicking the tray icon also opens the dashboard.

The dashboard is a separate React + TypeScript + Tailwind app
(`dashboard-ui/`), built to static files and loaded into its own Electron
window — it doesn't touch the pill, hotkey, or voice pipeline at all. It
reads and writes the same SQLite database the assistant does, through its own
preload bridge (`electron/preload-dashboard.js`) and a set of
`dashboard:*`-prefixed IPC handlers in `main.js`.

**Pages:** Overview (stats + recently saved + folder grid), All Notes
(search/filter/sort, list/grid view, bulk select → move/favorite/delete),
My Folders (grid with rename/change-icon/delete, create-folder dialog with a
real icon picker), a Folder Detail page per folder, Favorites, Recent
Activity (a real log — every fact save, folder create, favorite toggle,
move, edit, and delete is recorded, not fabricated), a Note Detail/Edit view,
global search (`Ctrl/Cmd+K`), and Settings.

**What's real vs. not:** favorites, folder icons/descriptions, and the
activity log are genuine schema additions (`facts.favorite`, `folders.icon`,
`folders.description`, and an `activity` table) — not UI that pretends to
save but doesn't. Settings' "Export data" writes an actual JSON file via a
native save dialog. Tags and nested folders aren't implemented (the original
Phase 1 spec didn't call for folder nesting, and tags were never part of the
data model) — rather than fake either, Settings marks the related rows
"Not yet supported" instead of showing a control that silently does nothing.

**Development:** `dashboard-ui` is its own npm project. After changing
anything under `dashboard-ui/src`, rebuild with `npm run build:dashboard`
(from the project root) or `cd dashboard-ui && npm run build`, then restart
Say.so — the dashboard window loads `dashboard-ui/dist/index.html`, a static
build, not a dev server, so edits don't hot-reload.

## Data model

SQLite (`data/sayso.db`):

```
folders:  id, name, icon, description, created_at
facts:    id, content, raw_transcript, favorite, folder_id (FK -> folders),
          created_at, updated_at
activity: id, type, description, fact_id (FK), folder_id (FK), created_at
```

`raw_transcript` is kept alongside the cleaned `content` for debugging/audit —
you can always see exactly what was said versus what got stored. `icon`,
`description`, `favorite`, `updated_at`, and the whole `activity` table were
added for the dashboard (see above) via additive migrations in `db.js` that
run safely against an existing database — no manual migration step needed,
and no data loss on upgrade.

## Platform notes

Developed and tested on Windows for this submission. `uiohook-napi` and
`getUserMedia` both work cross-platform, so macOS (the primary target
platform per the brief) should work largely unchanged, but hasn't been
verified on hardware for this submission. One thing to check on a Mac before
the demo: global keyboard hooks need **Accessibility permission**
(System Settings → Privacy & Security → Accessibility) — macOS will prompt
for it the first time the app starts watching for the hotkey.

## Reliability notes

Every outbound API call (Groq, Fish Audio, OpenRouter) has a timeout, and
there's a 20-second watchdog on the recording round-trip itself — so a flaky
network or a stalled mic capture resets the pill to idle instead of leaving
it stuck requiring a restart. Fish Audio failures fall back to a local voice
automatically rather than erroring out.

If a key is set correctly in `.env` but the app still rejects it as invalid:
check whether that same variable name is *also* set as a Windows environment
variable (`echo $env:GROQ_API_KEY` in PowerShell, or check System Properties
→ Environment Variables). `dotenv` normally won't let `.env` override a
variable that's already set at the OS level, which can make a stale system
variable silently and permanently win over a correct `.env` file with no
obvious error — this bit us once during development. main.js and
scripts/seed.js both load `dotenv` with `{ override: true }` specifically so
`.env` always wins regardless, but it's worth knowing this class of problem
exists if a key ever looks "wrong" despite the file being right.

## Known limitations (MVP scope)

- No folder nesting, no settings UI beyond `.env` — intentionally out of
  scope for Phase 1 per the brief. The dashboard is read-only (stats + recent
  facts), no editing from it yet.
- A hotkey press that arrives while the pipeline is mid-flight
  (processing/speaking) is ignored rather than queued, to avoid overlapping
  requests.
- The live equalizer only reacts to the mic during listening, and to the TTS
  voice during speaking when that came from Fish Audio — the local OS-voice
  fallback has no audio buffer to visualize, so it shows a generic pulse
  instead.

## Phase 2 (stretch): screen-aware prompt generation

Not yet built. Planned: capture the active window, send it to a vision model
with an instruction to describe the UI/content as a reusable prompt, and
surface the result near the pill (clipboard copy as the safe baseline).
