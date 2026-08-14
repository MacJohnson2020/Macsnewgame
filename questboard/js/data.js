// Static game data: classes, quest generators, bosses, titles.
// No dependencies — plain globals consumed by app.js.

const CLASSES = [
  { id: "fighter",     name: "Fighter",     style: "Melee",   affinity: "boss",
    flavor: "A weapon-master who answers every problem with steel. Bonus reward on Boss Encounters." },
  { id: "barbarian",   name: "Barbarian",   style: "Melee",   affinity: "slayer",
    flavor: "Rage incarnate, happiest hip-deep in a monster horde. Bonus reward on Slayer Contracts." },
  { id: "paladin",     name: "Paladin",     style: "Melee",   affinity: "dungeon",
    flavor: "A sworn protector who marches into the dark so others don't have to. Bonus reward on Dungeon Delves." },
  { id: "rogue",       name: "Rogue",       style: "Ranged",  affinity: "clue",
    flavor: "Quick hands, quicker wits, and a nose for hidden treasure. Bonus reward on Clue Mysteries." },
  { id: "ranger",      name: "Ranger",      style: "Ranged",  affinity: "minigame",
    flavor: "Thrives on organized skirmishes and team tactics. Bonus reward on Minigame Musters." },
  { id: "wizard",      name: "Wizard",      style: "Magic",   affinity: "skill",
    flavor: "A scholar who treats every skill cape as an open textbook. Bonus reward on Skilling Trials." },
  { id: "necromancer", name: "Necromancer", style: "Magic",   affinity: "lore",
    flavor: "Speaks with the dead and the sagas they left behind. Bonus reward on Lore Quests." },
  { id: "cleric",      name: "Cleric",      style: "Magic",   affinity: "boss",
    flavor: "Faith made manifest, first into the fray and last to fall. Bonus reward on Boss Encounters." },
];

// Rarity table, resolved from a d20 roll. Colors double as RS3-style item-rarity colors.
const RARITY_TABLE = [
  { max: 9,  id: "common",    label: "Common",    color: "#b7b7b7", mult: 1 },
  { max: 15, id: "uncommon",  label: "Uncommon",  color: "#4caf50", mult: 2 },
  { max: 18, id: "rare",      label: "Rare",      color: "#3b82f6", mult: 4 },
  { max: 19, id: "epic",      label: "Epic",      color: "#a855f7", mult: 8 },
  { max: 20, id: "legendary", label: "Legendary", color: "#f59e0b", mult: 15 },
];

function rarityForRoll(roll) {
  return RARITY_TABLE.find(r => roll <= r.max);
}

// Quest type definitions. Each has word banks and a description template.
const QUEST_TYPES = {
  slayer: {
    label: "Slayer Contract", icon: "🗡️",
    targets: ["Voidlings", "Marsh Wraiths", "Bone Golems", "Ashen Revenants", "Chaos Druids",
              "Cave Horrors", "Abyssal Fiends", "a Kalphite Swarm", "Rune Dragons", "TzHaar Warriors",
              "Aquanite Broodlings", "Shadow Wyrms"],
    locations: ["the Whispering Marsh", "the Sunken Crypts", "the Abyssal Rift", "the Kharidian Wastes",
                "the Slayer Tower", "Ashdale Woods", "the Wilderness badlands", "the Vorkath's old lair"],
    desc: (t, l) => `A hooded Slayer Master presses a bounty into your hand: hunt down ${t} lurking in ${l}.`,
  },
  boss: {
    label: "Boss Encounter", icon: "👑",
    desc: (bossName, epithet, loc) => `Word spreads of ${bossName}, ${epithet}, stirring once more within ${loc}. Will you answer the call?`,
  },
  skill: {
    label: "Skilling Trial", icon: "⚒️",
    targets: ["Mining", "Woodcutting", "Fishing", "Herblore", "Runecrafting", "Divination",
              "Archaeology", "Invention", "Smithing", "Farming", "Slayer", "Summoning"],
    desc: (skill) => `The Guildmaster of ${skill} challenges you: train until the old magic hums in your hands and a level bar fills.`,
  },
  dungeon: {
    label: "Dungeon Delve", icon: "🏰",
    targets: ["Stormguard Citadel", "the Iaia Temple", "the Ancient Prison", "the Shadow Reef",
              "the ruins of Kethsi", "the Sunken Pyramid", "the Catacombs of Kourend", "Daemonheim's deepest floors"],
    desc: (d) => `Rumor tells of forgotten treasure sealed within ${d}. Delve deep, if you dare — few who enter alone return with tales.`,
  },
  minigame: {
    label: "Minigame Muster", icon: "🎯",
    targets: ["Barbarian Assault", "Pest Control", "Castle Wars", "Trouble Brewing",
              "Fist of Guthix", "Clan Wars", "Fishing Trawler", "Soul Wars"],
    desc: (m) => `The town crier calls for champions to join the muster at ${m} — glory (and tokens) await the victors.`,
  },
  clue: {
    label: "Clue Mystery", icon: "📜",
    targets: ["an Easy", "a Medium", "a Hard", "an Elite", "a Master"],
    desc: (tier) => `A tattered clue scroll falls from a defeated foe's pocket. It is ${tier} clue — its ink whispers of hidden riches somewhere across Gielinor.`,
  },
  lore: {
    label: "Lore Quest", icon: "🧭",
    targets: ["Missing, Presumed Death", "Sliske's Endgame", "The World Wakes", "Fate of the Gods",
              "Desperate Times", "Kindred Spirits", "Council of War", "While Guthix Sleeps",
              "Dishonour Among Thieves", "Impressing the Locals"],
    desc: (q) => `Word arrives that the saga "${q}" awaits its next chapter. Old bards say every hero eventually walks that road.`,
  },
};

const QUEST_TYPE_ORDER = ["slayer", "boss", "skill", "dungeon", "minigame", "clue", "lore"];

// Iconic RS3 bosses, reskinned with a D&D epithet + lair.
const BOSSES = [
  { name: "Telos, the Warden of Zaros", epithet: "the Mad Titan of the Void", lair: "the Prifddinas anachronia rift" },
  { name: "Vorago", epithet: "the Ancient Colossus", lair: "the Vault of Shattered Kings" },
  { name: "Nex, Angel of Death", epithet: "the Fallen Seraph", lair: "the Frozen Halls beneath Frostenhorn" },
  { name: "The Magister", epithet: "the Mirror-Souled Tyrant", lair: "the Ambassador's Sanctum" },
  { name: "Solak", epithet: "the World-Tree's Wrath", lair: "the drowned roots of Freneskae" },
  { name: "Arch-Glacor", epithet: "the Ice-Bound Horror", lair: "the Wilderness's frozen scar" },
  { name: "Zamorak, Lord of Chaos", epithet: "the Dark God-King", lair: "the God Wars Dungeon II" },
  { name: "Croesus", epithet: "the Bloated Devourer", lair: "the rot-choked Iceberg" },
  { name: "Yakamaru", epithet: "the Twisted Experiment", lair: "the Culinaromancer's ruined lab" },
  { name: "Raksha, the First Necromancer", epithet: "the Wailing Wraith-Lord", lair: "the Shadow Reef's deepest trench" },
];

// Titles unlocked by total contracts completed.
const TITLES = [
  { at: 0,   title: "Tavern Newcomer" },
  { at: 5,   title: "Contract Regular" },
  { at: 10,  title: "Bounty Hunter" },
  { at: 20,  title: "Dungeon Delver" },
  { at: 35,  title: "Boss Slayer" },
  { at: 50,  title: "Legend of the Realm" },
  { at: 75,  title: "Mythic Adventurer" },
  { at: 100, title: "Living Legend" },
];

function titleForCount(count) {
  let cur = TITLES[0].title;
  for (const t of TITLES) if (count >= t.at) cur = t.title;
  return cur;
}

// Simple RS3-flavored XP curve: level up gets steadily more expensive.
function xpForLevel(level) {
  return Math.round(50 * Math.pow(level, 1.5));
}

function levelFromXp(totalXp) {
  let level = 1;
  let xpLeft = totalXp;
  while (xpLeft >= xpForLevel(level)) {
    xpLeft -= xpForLevel(level);
    level++;
  }
  return { level, xpIntoLevel: xpLeft, xpNeeded: xpForLevel(level) };
}
