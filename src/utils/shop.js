/** Shop catalog shared by /shop, /buy, /sell, /use, /inventory and the rob system. */
const ITEMS = {
  fishing_rod: {
    id: "fishing_rod",
    name: "Fishing Rod",
    emoji: "🎣",
    price: 7500,
    sell: 3200,
    description: "+25% payout while working. One per person.",
    type: "passive",
  },
  laptop: {
    id: "laptop",
    name: "Laptop",
    emoji: "💻",
    price: 15000,
    sell: 6500,
    description: "+50% payout while working. One per person.",
    type: "passive",
  },
  smartphone: {
    id: "smartphone",
    name: "Smartphone",
    emoji: "📱",
    price: 10000,
    sell: 4500,
    description: "+20% payout from /daily. One per person.",
    type: "passive",
  },
  padlock: {
    id: "padlock",
    name: "Padlock",
    emoji: "🔒",
    price: 4000,
    sell: 1800,
    description: "Blocks one /rob attempt, then breaks. Consumable.",
    type: "consumable",
  },
  shield: {
    id: "shield",
    name: "Bodyguard Shield",
    emoji: "🛡️",
    price: 20000,
    sell: 9000,
    description: "Permanently blocks /rob attempts. One per person.",
    type: "passive",
  },
  booster: {
    id: "booster",
    name: "Daily Booster",
    emoji: "⚡",
    price: 5000,
    sell: 2200,
    description: "Doubles your next /daily automatically. Consumable.",
    type: "consumable",
  },
  gift: {
    id: "gift",
    name: "Mystery Gift",
    emoji: "🎁",
    price: 1500,
    sell: 600,
    description: "Open it with /use for a random surprise. Consumable.",
    type: "usable",
  },
  ring: {
    id: "ring",
    name: "Golden Ring",
    emoji: "💍",
    price: 75000,
    sell: 40000,
    description: "Pure flex. Resells high.",
    type: "passive",
  },
};

function getItem(itemId) {
  return ITEMS[itemId] || null;
}

function allItems() {
  return Object.values(ITEMS);
}

module.exports = { ITEMS, getItem, allItems };
