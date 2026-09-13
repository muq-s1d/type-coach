# Typing Coach

A Chrome extension (Manifest V3) that measures your **real** typing speed as you
browse — not in a typing-test box, but in the emails, docs, and chats you
actually write — and tells you **which words slow you down or trip you up**.

## The privacy model (read this first)

An extension that watches keystrokes is, structurally, a keylogger. This one is
built so that it *cannot* meaningfully leak what you type:

1. **Sensitive fields are ignored.** Password, one-time-code, and credit-card
   fields (by input type and `autocomplete` hint) are never observed.
2. **Only whole alphabetic words survive.** A token is kept only if it's letters
   (plus internal `'`/`-`), 2–20 chars long. Anything with digits, symbols, or
   random casing — passwords, card numbers, API keys — is discarded on the spot.
3. **A word must recur ≥3 times** before it's ever shown. One-off secrets never
   reach the UI.
4. **Aggregates only, never sequences.** We store `word → {count, time,
   corrections}`. The order you typed words in is never recorded, so text can't
   be reconstructed.
5. **Nothing leaves your device.** Data lives in `chrome.storage.local`. There is
   no server and no network permission.

## How it's built

| File | Role |
|------|------|
| `manifest.json` | Config + permissions (only `storage`). |
| `content.js` | Injected into pages. Watches keystroke *timing*, builds one word at a time in memory, ships a summary, forgets the characters. |
| `background.js` | Service worker. Aggregates word stats and per-day buckets, computes WPM, persists to storage. |
| `render.js` | Shared view helpers: count-up, trend strip, row meters, ring. |
| `theme.css` | Design tokens and primitives shared by both views. |
| `popup.*` | Toolbar popup: hero WPM, 14-day trend, top three word lists. |
| `dashboard.*` | Full options page: 30-day trend, deep lists, overview, privacy, reset. |
| `fonts/`, `icons/` | Bundled Inter (SIL OFL) and the app icon. |

Data flow: `keydown` → content script measures a finished word →
`chrome.runtime.sendMessage` → background aggregates + saves → a view requests
`GET_SUMMARY` (popup) or `GET_FULL` (dashboard) on open.

## Stats, defined

- **Average** — lifetime `characters ÷ 5 ÷ active typing minutes`.
- **Recent** — the same over the last 60 seconds. Suppressed below 4 words or a
  3-second span, since tiny windows produce meaningless spikes.
- **Best** — highest recent-window reading ever recorded.
- **Clean** — share of words typed with no correction.
- **Active typing time** — gaps between keystrokes *under 3 seconds*. Longer
  pauses are excluded, so idle time neither inflates nor deflates your speed.

## Load it in Chrome (development)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this `typing-coach` folder.
4. Type normally on any site, then click the extension icon to see stats.
5. After changing any file, hit the **reload** ↻ button on the card.

> After reloading the extension, **refresh any open page** before typing.
> Reloading orphans the content script already running in open tabs, so nothing
> is recorded from them until the page is refreshed.

Content scripts cannot run on `chrome://` pages, the Chrome Web Store, or the
address bar. Test on an ordinary site.

## Design notes

The UI follows Apple's iOS Settings language: grouped inset cards on a recessed
canvas, sub-pixel hairline separators inset to the content edge, a three-tier
label hierarchy, and a single accent. Light and dark follow the system via
`prefers-color-scheme`. Inter is bundled locally because MV3's CSP blocks remote
fonts, and a bundled face keeps typography identical across platforms.

Native dialogs (`alert`/`confirm`) are never used: they render clipped inside
extension popups. Destructive actions use a two-click inline confirm instead.

## Ideas / next steps

- Per-site breakdown (coding vs prose vs chat).
- Bigram/digraph analysis ("th", "io") for finger-transition weak spots.
- Hero delta ("+3 from last week"), now that daily history exists.
- Export stats as JSON.
