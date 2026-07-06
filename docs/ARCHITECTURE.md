# Technical Architecture

Companion to `GAME_DESIGN.md` — this covers how the game is built, not
what it contains.

## Stack

- **Single self-contained `index.html`** — inline `<style>` and one
  inline `<script>`, no separate files, no modules, no bundler/build
  step, no framework, no canvas. Opens directly via `file://` with
  zero setup (no local server, no CORS/module-loading issues).
- Game content (skills/items/monsters) is defined as **plain JS
  objects/consts** inside the script, grouped into clearly labeled
  sections (see File Layout below) rather than split across files.
- **Fixed-interval tick loop** drives all progress, roughly OSRS's
  ~0.6s cadence. One `setInterval` advances whatever activity is
  currently active each time it fires.

## File Layout

Everything lives in `index.html`. The inline `<script>` is organized
into commented sections in dependency order, mirroring what would
otherwise be separate modules:

```
index.html
  <style>                        all CSS, formerly css/style.css
  <script>
    // core/xp.js       — XP curve/table (OSRS-style, 1.104x/level), level<->xp helpers
    // data/skills.js   — skill registry: id, name, category, maxLevel (99 or 120)
    // data/tiers.js    — gear tier ladder (Scrap..Wyrmforged)
    // data/items.js    — item registry: id, name, tier, category, stats
    // data/monsters.js — monster registry: id, name, zone, level, combat stats, drop table
    // core/state.js    — the single gameState object + get/set helpers
    // core/save.js     — localStorage read/write, versioned save format
    // systems/gathering.js — Woodcutting tick logic (Mining/Fishing/Hunter/Farming later)
    // systems/combat.js    — auto-combat resolution (attack rounds, damage, drops)
    // core/tick.js     — setInterval loop; calls the active system's update() each tick
    // ui/render.js     — render dispatch, re-renders on state change
    // main.js          — entry point: boot, load save, start tick loop, first render
```

New content (a monster, an item, a skill's tick logic) is added as a
new entry/function within the relevant section rather than a new file.
If the script grows unwieldy, splitting sections back into files is a
mechanical extraction — the section boundaries above are exactly where
the seams would go.

## State Management

- **Single source of truth:** one `gameState` object owned by
  `core/state.js` (character stats/levels/xp, inventory, equipment,
  gold, current activity, task board progress, unlocked zones).
- Systems read/mutate `gameState` through `state.js` accessors rather
  than passing it around ad hoc — keeps a seam where multiplayer state
  sync could later hook in without a rewrite.
- UI is a **pure function of state**: `ui/render.js` re-renders the
  active panel(s) from `gameState` after each tick or user action,
  rather than hand-patching the DOM in system code.

## Tick Loop

- `core/tick.js` runs one `setInterval` at a fixed cadence.
- Each firing:
  1. Advance the current activity's system (combat round resolved,
     gathering roll made, production step progressed, task board timer
     checked).
  2. Apply XP/resource/gold changes to `gameState`.
  3. Trigger a UI re-render.
- Only one "active activity" runs at a time in v1 (no parallel
  activities), matching the single-character, single-focus feel of
  early OSRS.

## Save System

- `core/save.js` serializes `gameState` to JSON and writes it to
  `localStorage` under a single versioned key (e.g. `save.v1`).
- A `version` field is included so a future save-format change can
  detect and migrate old saves instead of silently breaking them.
- Autosave on a timer (e.g. every N ticks) plus on key events (level
  up, task turned in) — no manual save button required, though one can
  be added trivially given the format is already export-ready JSON.

## Data-Driven Content

- Adding a new item/monster/task/zone means adding an entry to the
  relevant registry object in the "data" section of the script — no
  changes to system logic required for the common case. Systems are
  written to iterate/look up by id rather than hardcoding specific
  items or monsters.

## Open Implementation Questions

- Exact tick interval (0.6s vs. something slower for a less twitchy
  feel) — tune once combat is playable.
- Autosave frequency/triggers — finalize during `core/save.js` build.
- Whether gathering/production "progress" is itself tick-granular or
  just a duration checked against elapsed ticks — decide when building
  `systems/gathering.js`.
