# Chrome Web Store submission

Everything needed for the Developer Dashboard listing. Copy the fields below
verbatim; assets are in this folder.

**Package:** `type-coach-0.1.0.zip` (rebuild with the command at the bottom)

---

## Store listing

**Name**

```
Type Coach
```

**Short description** (132 char limit; this is 114)

```
Tracks your real typing speed as you browse and shows which words you get stuck on. All data stays on your device.
```

**Category:** Productivity → Workflow & Planning
**Language:** English

**Detailed description**

```
Typing tests tell you how fast you type a typing test. Type Coach measures the typing you actually do all day, then shows you which words slow you down and which ones you keep having to fix.

WHAT YOU GET

• Real-world speed — words per minute measured from ordinary typing anywhere in Chrome, using the standard five-keystrokes-per-word convention.
• Idle never counts — only gaps under three seconds count as typing, so stepping away from your desk never inflates or deflates your number.
• Your slowest words — ranked by how far below your own average each one falls, so you can see exactly what to practise.
• Your most-corrected words — the share of attempts where you had to backspace, revealing the spellings you never quite get right.
• Daily trend — a bar for each day, so progress is something you can see rather than assume.
• Clean rate — the share of words you type without a single correction.
• Light and dark — follows your system theme automatically.

PRIVACY BY CONSTRUCTION

An extension that watches keystrokes is, structurally, a keylogger. Type Coach is built so that it cannot meaningfully retain what you write:

• Password, one-time-code and payment fields are never observed at all.
• Only alphabetic words survive. Anything containing digits, symbols or unusual casing is discarded on the spot, so passwords, card numbers and API keys never reach storage.
• A word must be typed at least three times before it is ever stored or shown, so one-off text never appears.
• Only aggregates are kept — how many times a word was typed, how long it took, how often it was corrected. The order you typed words in is never recorded, so your text cannot be reconstructed.
• Nothing leaves your device. There is no server, no analytics, and the extension requests no network permission whatsoever.

The only permission requested is storage, used to save your own statistics on your own machine. A Reset All Data button in the dashboard erases everything permanently.

Open source, MIT licensed: https://github.com/muq-s1d/type-coach
```

**Privacy policy URL**

```
https://github.com/muq-s1d/type-coach/blob/main/PRIVACY.md
```

**Homepage URL**

```
https://github.com/muq-s1d/type-coach
```

**Support URL**

```
https://github.com/muq-s1d/type-coach/issues
```

---

## Assets in this folder

| Asset | Size | File |
|---|---|---|
| Screenshot 1 | 1280×800 | `screenshot-1-popup.png` |
| Screenshot 2 | 1280×800 | `screenshot-2-dashboard.png` |
| Screenshot 3 | 1280×800 | `screenshot-3-words.png` |
| Screenshot 4 (dark) | 1280×800 | `screenshot-4-dark.png` |
| Small promo tile | 440×280 | `promo-tile-440x280.png` |
| Store icon | 128×128 | `../icons/icon128.png` |

A 1400×560 marquee tile is optional and only used if the extension is featured.

---

## Privacy practices tab

These answers are mandatory and are where a keystroke-reading extension gets
scrutinised. Answer precisely.

**Single purpose description**

```
Type Coach measures the user's typing speed from their ordinary typing in the browser and reports which words they type slowest and most often correct, so they can improve their typing. This is its only function.
```

**Justification — `storage` permission**

```
Used to save the user's own typing statistics locally on their device via chrome.storage.local, so that speed, trends and per-word statistics persist between sessions. No data is transmitted anywhere.
```

**Justification — host permission (`<all_urls>`)**

```
The extension measures typing speed from the user's everyday typing, which happens on arbitrary sites (email, documents, chat, forms). A content script must therefore run on pages the user visits in order to observe keystroke timing in text fields. It reads only keystroke timing and completed alphabetic words, explicitly skips password, one-time-code and payment fields, and never transmits anything. Narrower host permissions would defeat the extension's only purpose, since the user's typing is not confined to a known list of sites.
```

**Remote code:** No, the extension does not use remote code. All code and fonts
are bundled in the package.

**Data collection disclosures**

The dashboard asks which categories you collect. Nothing is transmitted off the
device, so the correct answers are:

- Personally identifiable information — **No**
- Health information — **No**
- Financial and payment information — **No**
- Authentication information — **No**
- Personal communications — **No**
- Location — **No**
- Web history — **No**
- User activity — **No** (keystroke timing is processed locally and never
  collected by the developer or sent anywhere)
- Website content — **No**

Then tick all three certifications: data is not sold to third parties, is not
used for purposes unrelated to the single purpose, and is not used to determine
creditworthiness or for lending.

---

## Expect extra review scrutiny

An extension that reads keystrokes on all sites is a category reviewers examine
closely, and review may take longer than the usual few days. What helps:

- The privacy policy URL is live and specific (it is).
- The host-permission justification names the exact data read and the exclusions.
- The source is public, so a reviewer can verify the claims.

If it is rejected, the rejection email names the specific policy clause. Fix that
clause and resubmit; the earlier review does not count against you.

---

## Rebuilding the package

```bash
cd type-coach
rm -f store/type-coach-*.zip
zip -rq store/type-coach-$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])").zip . \
  -x ".git/*" "store/*" "*.zip" "__*" ".playwright-mcp/*" "brag-output/*"
```

Bump `version` in `manifest.json` before every re-upload; the store rejects a
package whose version is not higher than the published one.
