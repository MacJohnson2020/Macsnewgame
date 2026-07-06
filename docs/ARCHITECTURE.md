# Technical Architecture

Companion to `GAME_DESIGN.md` — this covers how the game is built, not
what it contains.

## Stack

- Plain HTML/CSS/JS, **native ES modules** (`<script type="module">`),
  no bundler/build step, no framework, no canvas.
- Game content (skills/items/monsters/tasks/zones) is defined as
  **plain JS data modules** — objects/arrays exported from files under
  `js/data/`, not JSON. Keeps definitions close to any helper functions
  they need and avoids a parsing/fetch step.
- **Fixed-interval tick loop** drives all progress, roughly OSRS's
  ~0.6s cadence. One `setInterval` advances whatever activity is
  currently active each time it fires.

## File Layout

```
index.html
css/
  style.css
js/
  main.js                 entry point: boot, load save, start tick loop, first render
  core/
    state.js              the single gameState object + get/set helpers
    tick.js               setInterval loop; calls the active system's update() each tick
    save.js                localStorage read/write, versioned save format
    xp.js                  XP curve/table (OSRS-style, 1.104x/level), level<->xp helpers
  data/
    skills.js              skill registry: id, name, category, maxLevel (99 or 120)
    items.js                item registry: id, name, tier, category, stats
    monsters.js             monster registry: id, name, zone, level, combat stats, drop table
    zones.js                zone registry: id, name, unlock requirement, resources/monsters present
    tasks.js                task board definitions per tier (Novice..Master)
    tiers.js                gear tier ladder (Scrap..Wyrmforged) + tier metadata
  systems/
    combat.js               auto-combat resolution (attack rounds, damage, drops)
    gathering.js            shared logic for Woodcutting/Mining/Fishing/Hunter/Farming
    production.js           shared logic for Cooking/Firemaking/Smithing/Crafting/Fletching
    herblore.js             potion-making logic
    slayer.js                task assignment/tracking for the Slayer skill specifically
    runecrafting.js          essence -> rune logic
    construction.js          player hub build/upgrade logic
    shop.js                  NPC shop pricing (supply/demand drift) and buy/sell
    taskboard.js             task board tier gating, task pool, reward payout
  ui/
    render.js               top-level render dispatch, re-renders on state change
    panels/
      skillsPanel.js, inventoryPanel.js, combatPanel.js,
      shopPanel.js, taskboardPanel.js, hubPanel.js
    components.js           small reusable DOM-building helpers (icon+text rows, progress bars)
```

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
  relevant `js/data/*.js` registry — no changes to system logic
  required for the common case. Systems are written to iterate/look up
  by id rather than hardcoding specific items or monsters.

## Open Implementation Questions

- Exact tick interval (0.6s vs. something slower for a less twitchy
  feel) — tune once combat is playable.
- Autosave frequency/triggers — finalize during `core/save.js` build.
- Whether gathering/production "progress" is itself tick-granular or
  just a duration checked against elapsed ticks — decide when building
  `systems/gathering.js`.
