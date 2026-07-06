# Game Design Doc

## Concept

A single-player, browser-based RPG that merges Old School RuneScape's
grindy skilling/economy feel with RS3's quality-of-life sensibilities,
built as a simple step/time-based idle-adjacent MMO-style game (no live
multiplayer in v1, but systems are designed so multiplayer could be
bolted on later).

## Design Pillars

- **Tick/step-based, not twitch.** Progress advances in discrete steps.
  Combat is fully automatic — the player equips gear and picks targets,
  the game resolves outcomes over time rather than requiring input per hit.
- **Skill-driven progression.** Levels and gear, not player mechanical
  skill, are the primary axis of growth.
- **Single-player now, multiplayer-shaped later.** No networking in v1.
  Avoid designs that would have to be thrown away if a shared world is
  added later (e.g. keep character state, economy, and world state
  cleanly separable).

## Core Loop

1. Pick an activity (gather, produce, fight, or run a task from the
   task board).
2. Time/steps pass; the game resolves ticks (resource gained, XP gained,
   combat rounds resolved) automatically.
3. Spend outputs: sell to NPC shops, use materials in production skills,
   upgrade gear, or take on the next task board entry.
4. Level up, unlock new tiers of content (better resources, tougher
   monsters, new zones/recipes), repeat at a higher tier.

## Combat

- **Simplified triangle:** Melee, Ranged, and Magic are separate
  trainable combat stats (style used determines which XP you earn).
  Defence and Hitpoints are shared across all styles.
- **No Prayer in v1.** Cut for scope; combat bonuses come from gear and
  levels only. Revisit as a post-v1 addition (or an RS3-Necromancy-style
  alternative) once the core loop is proven out.
- **Fully automatic resolution.** The player chooses a target and
  equipped style; the game ticks through the fight without requiring
  per-action input. No ability bar in v1.

## Skills (19 total)

### Combat (5)
- **Melee, Ranged, Magic** — trainable per style, driven by gear/style used in auto-combat.
- **Defence** — shared mitigation stat, trains from any combat style.
- **Hitpoints** — shared health pool, trains from any combat style.

### Gathering (5)
- **Woodcutting** — chop trees for logs (feeds Firemaking, Fletching, Crafting).
- **Mining** — mine ore and gems (feeds Smithing, Crafting).
- **Fishing** — catch fish (feeds Cooking).
- **Farming** — grow crops/herbs over time in patches (feeds Cooking, Herblore).
- **Hunter** — trap creatures for unique materials.

### Production (5)
- **Cooking** — raw food → edible food (healing/buffs).
- **Firemaking** — logs → fires (cooking fuel, standalone XP).
- **Smithing** — ore/bars → weapons & armor.
- **Crafting** — hides/gems/cloth → armor, jewelry, containers.
- **Fletching** — logs → bows & arrows (Ranged gear).

### Support (2)
- **Herblore** — herbs + secondary ingredients → potions (combat buffs).
- **Slayer** — assigned monster-kill tasks gating certain monsters/drops behind a level.

### Complex / Late-game (2)
- **Runecrafting** — essence → runes, feeding the Magic style's resource loop.
- **Construction** — build/upgrade a player hub for storage, teleports, and training bonuses.

*Cut from v1:* Prayer, Agility, Thieving, and RS3-specific late-game
skills (Divination, Invention, Archaeology, Necromancy). Candidates for
later phases once the core 19 are solid.

## Progression

- **XP curve:** OSRS-style curve — each level requires roughly 1.104x
  the XP of the previous, same shape as OSRS's table (level 99 ≈
  13M XP under that curve).
- **Level cap:** 99 for all skills except **Runecrafting** and
  **Construction**, which extend to **120** as an endgame flex (RS3-style),
  reflecting their place as the two "complex/late-game" skills.

## Gear & Material Tiers

Custom naming (not reused OSRS metal names) to give the game its own
identity, same power-curve shape as OSRS bronze→dragon:

1. **Scrap** — starting-tier gear, crafted from junk/found materials.
2. **Iron**
3. **Steel**
4. **Alloy** — a composite/mixed-metal tier (distinct flavor, not a reskin).
5. **Silverstone** — silver shot through with ground gem dust.
6. **Auric** — gold-and-magic infused, RS3 "elite tier" equivalent.
7. **Wyrmforged** — top v1 tier, dragon-equivalent rarity/power.

Each tier applies across weapons/armor for all three combat styles
(Melee/Ranged/Magic gear share the same tier ladder), and gates which
Smithing/Fletching/Crafting recipes are available at a given skill level.

## Starter Zone (proposed)

**Millbrook** — a small farming village on the edge of a forest,
mechanically equivalent to Lumbridge/Tutorial Island but with its own
identity:

- **Early monsters:** crows, wild boars, feral dogs, and brigands
  (low-level melee fodder; brigands drop small amounts of gold and
  Scrap-tier gear scraps).
- **Early resources:** normal trees (Woodcutting), a shallow streambed
  (Fishing — small fish only), a copper-vein rockpile (Mining), and a
  few open farming patches at the village edge (Farming).
- **Hub building:** the village center holds the general store (NPC
  shop), bank/storage, and the task board.
- Later zones (forest depths, the old mine, the coastal cliffs, etc.)
  unlock as combat/skill levels rise, each introducing the next gear
  tier's resources and monsters.

## Task Board Tiers

Five tiers, gated by a combined-level threshold (combat level + a
minimum relevant skill level), each with its own reward pool:

1. **Novice** — starter-zone monsters/resources, Scrap/Iron-tier rewards.
2. **Apprentice** — Steel-tier content, first unique (non-shop) drops.
3. **Adept** — Alloy-tier content, recipe unlocks as rewards.
4. **Veteran** — Silverstone/Auric-tier content, rarer material rewards.
5. **Master** — Wyrmforged-tier content, best-in-slot v1 rewards and
   cosmetic/prestige rewards.

## Economy

- **NPC shops only** (no player-to-player trading — single-player game).
- Shop prices fluctuate with supply/demand: buying pushes price up,
  selling pushes it down, prices drift back toward baseline over time —
  a solo stand-in for the Grand Exchange feel without needing other
  players.
- Gold sinks: shop purchases, gear upgrades, Construction costs.

## World & Content Structure

- **Hub + task board**, not fixed zone-gated quest lines.
- A central hub area holds the shops, bank/storage, and the task board.
- The task board issues varied tasks (kill X monsters, gather Y
  resource, craft Z item) that grant XP/gold/unique rewards — replacing
  large fixed quest chains with lighter, repeatable, extensible content.
- New tiers of monsters/resources/recipes unlock as relevant skill and
  combat levels rise, rather than via story-gated zones.

## Tech Stack & Persistence

- **Plain HTML/CSS/JS**, no build step, no canvas rendering — a
  text/icon-driven UI in the spirit of OSRS's interface panels (menus,
  logs, item icons), matching the previous project's structure.
- **Persistence:** browser `localStorage`. No backend, no accounts.

## Open Questions / Future Phases

- Post-v1 candidates: Prayer (or a Necromancy-style alternative),
  Agility, Thieving, save export/import, ability-bar combat option,
  shared/multiplayer world.
- Exact task board task pool per tier (specific tasks, XP/gold amounts)
  — to be fleshed out alongside the first content pass.
- Zones beyond Millbrook (names, themes, which gear tier each
  introduces) — to be designed once the starter zone is implemented.
