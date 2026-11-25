// Warung Kilat — the menu: ingredients, dishes and the recipe table.
// Four dishes, three spice levels each, twelve combinations in all.
// Every combination is 3 or 4 ingredients drawn from the eight bins, and
// every combination's ingredient set is unique, so a finished plate maps
// to exactly one dish at one spice level.

export const INGREDIENTS = [
  { id: 'nasi', name: 'Nasi', key: '1', color: '#F7F3E6', dark: '#C9BFA4' },
  { id: 'mie', name: 'Mie', key: '2', color: '#F2C14E', dark: '#C99A2E' },
  { id: 'ayam', name: 'Ayam', key: '3', color: '#D98A4B', dark: '#A86430' },
  { id: 'telur', name: 'Telur', key: '4', color: '#FFF3C4', dark: '#E8C86A' },
  { id: 'sayur', name: 'Sayur', key: '5', color: '#5FA84F', dark: '#3E7A34' },
  { id: 'bumbu', name: 'Bumbu', key: '6', color: '#D33A2C', dark: '#9E2418' },
  { id: 'sate', name: 'Sate', key: '7', color: '#8A5A2B', dark: '#5F3A17' },
  { id: 'teh', name: 'Teh', key: '8', color: '#C97B2D', dark: '#8F5420' },
];

export const INGREDIENT_BY_ID = Object.fromEntries(
  INGREDIENTS.map((ing) => [ing.id, ing]),
);

export const DISHES = [
  {
    id: 'nasi-goreng',
    name: 'Nasi Goreng',
    // Biasa / Sedang / Pedas, each a list of ingredient ids.
    recipes: [
      ['nasi', 'telur', 'bumbu'],
      ['nasi', 'telur', 'bumbu', 'sayur'],
      ['nasi', 'ayam', 'bumbu', 'telur'],
    ],
  },
  {
    id: 'mie-ayam',
    name: 'Mie Ayam',
    recipes: [
      ['mie', 'ayam', 'bumbu'],
      ['mie', 'ayam', 'bumbu', 'sayur'],
      ['mie', 'ayam', 'bumbu', 'telur'],
    ],
  },
  {
    id: 'sate-ayam',
    name: 'Sate Ayam',
    recipes: [
      ['sate', 'bumbu', 'sayur'],
      ['sate', 'bumbu', 'teh'],
      ['sate', 'bumbu', 'sayur', 'nasi'],
    ],
  },
  {
    id: 'ayam-geprek',
    name: 'Ayam Geprek',
    recipes: [
      ['ayam', 'bumbu', 'nasi'],
      ['ayam', 'bumbu', 'nasi', 'sayur'],
      ['ayam', 'bumbu', 'nasi', 'telur'],
    ],
  },
];

// Flat lookup: "ayam+bumbu+nasi" -> { dish, spice } for a finished plate.
export const RECIPE_BY_KEY = new Map();
for (const dish of DISHES) {
  dish.recipes.forEach((ingredients, spice) => {
    RECIPE_BY_KEY.set([...ingredients].sort().join('+'), { dish, spice });
  });
}

export function recipeKey(ingredients) {
  return [...ingredients].sort().join('+');
}

// The exact recipe a set of ingredients matches, or null.
export function matchRecipe(ingredients) {
  return RECIPE_BY_KEY.get(recipeKey(ingredients)) ?? null;
}

// True when some recipe still contains every ingredient on the plate,
// i.e. the plate can still become a real dish.
export function canStillBecomeDish(ingredients) {
  const have = new Set(ingredients);
  for (const key of RECIPE_BY_KEY.keys()) {
    const needed = key.split('+');
    if (needed.length < have.size) continue;
    if ([...have].every((id) => needed.includes(id))) return true;
  }
  return false;
}

// Price of a finished dish: base + per ingredient + spice bonus.
export function dishPrice(dish, spice) {
  const count = dish.recipes[spice].length;
  return 40 + 12 * count + [0, 15, 30][spice];
}
