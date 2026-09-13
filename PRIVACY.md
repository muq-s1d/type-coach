# Privacy Policy for Type Coach

**Last updated: 13 September 2026**

Type Coach is a Chrome extension that measures typing speed. This policy
describes exactly what it does with what you type.

## Summary

**Type Coach does not collect, transmit, sell, or share any data. Nothing you
type ever leaves your device.** The extension requests no network permission and
communicates with no server, including any server operated by the developer.

## What the extension processes

To measure typing speed, a content script observes keystroke events on web pages
you visit. It measures the *timing* of those keystrokes and identifies completed
words, then immediately discards the raw keystrokes.

The extension is built so that it cannot meaningfully retain what you write:

1. **Sensitive fields are never observed.** Password fields, one-time-code
   fields, and payment fields (identified by input type and `autocomplete`
   attribute) are excluded before any keystroke is read.
2. **Only alphabetic words are retained.** A word is kept only if it consists of
   letters, with optional internal apostrophes or hyphens, and is between 2 and
   20 characters. Anything containing digits, symbols, or unusual casing is
   discarded immediately.
3. **A word must recur before it is stored.** A word must be typed at least three
   times before it appears anywhere in the interface.
4. **Only aggregates are kept.** Storage holds per-word counters of the form
   `word → (times typed, total time, corrections)`. The order in which words were
   typed is never recorded, so the text you wrote cannot be reconstructed.

## Where data is stored

All statistics are stored locally using the Chrome `storage.local` API on the
device where they were produced. They are not synced between devices and are not
accessible to the developer or to any third party.

## Permissions

| Permission | Why |
|---|---|
| `storage` | To save your typing statistics locally on your own device. |
| Host access to pages you visit | Required so the content script can observe keystroke timing in text fields in order to measure typing speed. It is used for no other purpose. |

The extension requests no network access, no browsing history access, no cookie
access, and no identity access.

## Your control over your data

The dashboard contains a **Reset All Data** action that permanently deletes every
statistic stored on the device. Uninstalling the extension also removes all of
its stored data.

## Children's privacy

The extension collects no personal information from anyone, including children.

## Changes

Material changes to this policy will be published in this file, and its history
is publicly visible in the project's Git history.

## Contact

Questions or concerns: open an issue at
https://github.com/muq-s1d/type-coach/issues
