// ─── References extraction ────────────────────────────────────────────────────
// Pulls unique external links from markdown body for the auto-generated
// "References" section at the bottom of articles (E-E-A-T signal).
// If body has no inline links, falls back to a standard set of AU authority sources.

export interface Reference {
  text: string;
  url: string;
}

const STANDARD_AU_REFERENCES: Reference[] = [
  { text: "Australian Dietary Guidelines (Eat for Health)", url: "https://www.eatforhealth.gov.au/" },
  { text: "Allergy & Anaphylaxis Australia", url: "https://allergyfacts.org.au/" },
  { text: "National Heart Foundation of Australia", url: "https://www.heartfoundation.org.au/" },
  { text: "Food Standards Australia New Zealand (FSANZ)", url: "https://www.foodstandards.gov.au/" },
];

export function extractReferences(body: string): Reference[] {
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const seen = new Map<string, string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    const text = match[1].trim();
    const url = match[2].trim();
    if (url.startsWith("http") && !seen.has(url)) {
      seen.set(url, text);
    }
  }
  return Array.from(seen.entries()).map(([url, text]) => ({ text, url }));
}

export function getReferences(body: string): Reference[] {
  const extracted = extractReferences(body);
  return extracted.length > 0 ? extracted : STANDARD_AU_REFERENCES;
}

// ─── Ingredient categories ────────────────────────────────────────────────────

const INGREDIENT_CATEGORIES: Record<string, string[]> = {
  Produce: [
    "apple", "banana", "carrot", "lettuce", "spinach", "tomato", "cucumber",
    "broccoli", "onion", "garlic", "potato", "corn", "peas", "capsicum",
    "berries", "avocado", "lemon", "orange", "kiwi", "cherry tomatoes",
    "carrot stick", "carrot sticks", "capsicum strip", "mandarin", "mango",
    "pineapple", "feijoa", "courgette", "beetroot", "pumpkin", "herbs",
    "herb", "coriander", "parsley", "basil", "mint", "spring onion", "rocket",
    "celery", "mushroom", "zucchini", "silverbeet", "kumara", "edamame",
    "grapes", "pear", "dates", "dried apricots", "ripe banana",
  ],
  "Meat & Seafood": [
    "chicken", "beef", "pork", "ham", "bacon", "turkey", "salmon", "tuna",
    "shrimp", "fish", "sausage", "salami", "pepperoni", "beef mince",
    "chicken breast", "chicken thigh", "sausage meat", "canned tuna",
    "gf sausage", "smoked salmon", "prawn", "lamb", "mince", "tofu",
    "chicken/tofu", "roast beef", "chicken skewer", "falafel",
    "tuna/chicken/avocado",
  ],
  "Dairy & Eggs": [
    "cheese", "milk", "butter", "yoghurt", "egg", "eggs", "cream cheese",
    "feta", "feta cheese", "parmesan", "cream", "cheese stick", "cheese block",
    "cheese sauce", "cheese cube", "grated cheese", "mozzarella", "boiled egg",
    "egg (glaze)",
  ],
  Bakery: [
    "bread", "croissant", "bagel", "tortilla", "pastry", "flour", "muffin",
    "crackers", "croutons", "rice paper", "wrap", "pita", "roll", "ciabatta",
    "puff pastry", "pastry cases", "breadcrumbs",
  ],
  "Grains & Noodles": [
    "rice", "pasta", "sushi rice", "rice noodle", "noodle", "vermicelli",
    "quinoa", "couscous", "oat", "muesli", "rice wheel", "rice cracker",
    "gf pasta", "spaghetti", "macaroni", "pasta spiral", "pretzels",
    "oat cookie",
  ],
  Pantry: [
    "pesto", "olive oil", "soy sauce", "tomato sauce", "tomato paste",
    "mayo", "hummus", "marmite", "sugar", "honey", "jam", "peanut butter",
    "peanut sauce", "teriyaki sauce", "salsa", "caesar dressing", "seaweed",
    "nori", "corn chips", "curry paste", "nuts", "seeds", "dried fruit",
    "olives", "oil", "sauce", "dressing", "coconut milk", "coconut",
    "kidney beans", "black beans", "chickpeas", "lentils", "tahini",
    "mustard", "vinegar", "stock", "spices", "butter chicken sauce",
    "lemon dressing", "vegan mayo", "dairy-free pesto", "pesto/mayo",
    "cocoa",
  ],
};

export function getIngredientCategory(ingredient: string): string {
  const lower = ingredient.toLowerCase();
  for (const [category, items] of Object.entries(INGREDIENT_CATEGORIES)) {
    if (items.some((item) => lower.includes(item) || item.includes(lower))) {
      return category;
    }
  }
  return "General";
}

// ─── Category emojis ──────────────────────────────────────────────────────────

export const CATEGORY_EMOJIS: Record<string, string> = {
  Produce: "🥦",
  "Meat & Seafood": "🍖",
  "Dairy & Eggs": "🧀",
  Bakery: "🍞",
  "Grains & Noodles": "🍚",
  Pantry: "🥫",
  General: "🛒",
};

// ─── Exact-name emojis (highest priority) ────────────────────────────────────
// Keys must exactly match ingredient names (case-insensitive)

const EXACT_EMOJIS: Record<string, string> = {
  // Produce
  "Apple": "🍎",
  "Avocado": "🥑",
  "Banana": "🍌",
  "Ripe Bananas": "🍌",
  "Berries": "🫐",
  "Broccoli": "🥦",
  "Capsicum": "🫑",
  "Carrot": "🥕",
  "Celery": "🥬",
  "Cherry Tomatoes": "🍅",
  "Corn": "🌽",
  "Cucumber": "🥒",
  "Dates": "🫒",
  "Dried Apricots": "🍑",
  "Edamame": "🫛",
  "Grapes": "🍇",
  "Herbs": "🌿",
  "Kumara": "🍠",
  "Lettuce": "🥬",
  "Mandarin": "🍊",
  "Mango": "🥭",
  "Mushroom": "🍄",
  "Olives": "🫒",
  "Pear": "🍐",
  "Peas": "🫛",
  "Potato": "🥔",
  "Pumpkin": "🎃",
  "Rocket": "🌿",
  "Spinach": "🍃",
  "Tomato": "🍅",
  "Basil": "🌿",
  "Coriander": "🌿",

  // Meat & Seafood
  "Bacon": "🥓",
  "Beef Mince": "🥩",
  "Canned Tuna": "🐟",
  "Chicken": "🍗",
  "Chicken Breast": "🍗",
  "Chicken Skewers": "🍢",
  "Chicken Thigh": "🍗",
  "Chicken/Tofu": "🍗",
  "Falafel": "🧆",
  "GF Sausages": "🌭",
  "Ham": "🍖",
  "Ham/Bacon": "🥓",
  "Mince": "🥩",
  "Roast Beef": "🥩",
  "Sausage Meat": "🌭",
  "Smoked Salmon": "🐟",
  "Tofu": "🫘",
  "Tuna/Chicken/Avocado": "🐟",
  "Turkey": "🦃",

  // Dairy & Eggs
  "Boiled Eggs": "🥚",
  "Butter": "🧈",
  "Cheese": "🧀",
  "Cheese Block": "🧀",
  "Cheese Sauce": "🫙",
  "Cheese Stick": "🥛",
  "Cream Cheese": "🧈",
  "Cream/Milk": "🥛",
  "Egg": "🥚",
  "Egg (glaze)": "🥚",
  "Eggs": "🥚",
  "Feta": "🧀",
  "Milk": "🥛",
  "Mozzarella": "🧀",
  "Yoghurt": "🥣",

  // Bakery
  "Bagel": "🥯",
  "Bread": "🍞",
  "Breadcrumbs": "🍞",
  "Ciabatta": "🥖",
  "Croissant": "🥐",
  "Flour": "🌾",
  "Muffin": "🧁",
  "Pastry": "🥐",
  "Pastry Cases": "🥐",
  "Puff Pastry": "🥐",
  "Roll": "🥖",
  "Tortilla": "🌮",

  // Grains & Noodles
  "GF Pasta": "🍝",
  "Macaroni": "🍝",
  "Muesli (Nut-free)": "🌾",
  "Nori": "🌿",
  "Oat Cookie": "🍪",
  "Pasta": "🍝",
  "Pasta spirals": "🍝",
  "Pretzels": "🥨",
  "GF Crackers": "🍘",
  "Rice": "🍚",
  "Rice Crackers": "🍘",
  "Rice Noodles": "🍜",
  "Rice Paper": "🫙",
  "Rice Wheels": "🍘",
  "Spaghetti": "🍝",
  "Sushi Rice": "🍣",
  "Quinoa": "🌾",
  "Chickpeas": "🫘",
  "Black Beans": "🫘",

  // Pantry
  "Butter Chicken Sauce": "🍛",
  "Caesar Dressing": "🫙",
  "Cocoa": "🍫",
  "Coconut": "🥥",
  "Coconut Milk": "🥥",
  "Curry Paste": "🌶️",
  "Dairy-Free Pesto": "🌿",
  "Hummus": "🫙",
  "Jam": "🍓",
  "Lemon Dressing": "🍋",
  "Marmite": "🫙",
  "Mayo": "🫙",
  "Mustard": "🫙",
  "Peanut Butter": "🥜",
  "Peanut Sauce": "🥜",
  "Pesto": "🌿",
  "Pesto/Mayo": "🌿",
  "Salsa": "🫙",
  "Seaweed": "🌿",
  "Soy Sauce": "🫙",
  "Spices": "🌶️",
  "Sugar": "🍬",
  "Teriyaki Sauce": "🫙",
  "Tomato Paste": "🥫",
  "Tomato Sauce": "🥫",
  "Vegan Mayo": "🫙",
};

// ─── Fallback substring emojis (sorted by length, longest first) ──────────────

export const SPECIFIC_EMOJIS: Record<string, string> = {
  // Produce (longer keys first for better specificity)
  "cherry tomato": "🍅", "tomato paste": "🥫", "tomato sauce": "🥫",
  "peanut butter": "🥜", "peanut sauce": "🥜",
  "cream cheese": "🧈", "cheese sauce": "🫙", "cheese stick": "🥛",
  "cheese block": "🧀", "rice noodle": "🍜", "rice cracker": "🍘",
  "rice paper": "🫙", "sushi rice": "🍣", "rice wheel": "🍘",
  "smoked salmon": "🐟", "beef mince": "🥩", "roast beef": "🥩",
  "chicken skewer": "🍢", "butter chicken": "🍛", "curry paste": "🌶️",
  "coconut milk": "🥥", "soy sauce": "🫙", "puff pastry": "🥐",
  "dried apricot": "🍑", "oat cookie": "🍪",
  // Singles
  "apple": "🍎", "banana": "🍌", "carrot": "🥕", "corn": "🌽", "grape": "🍇",
  "avocado": "🥑", "lemon": "🍋", "orange": "🍊", "mandarin": "🍊",
  "pear": "🍐", "kiwi": "🥝", "tomato": "🍅", "potato": "🥔",
  "kumara": "🍠", "garlic": "🧄", "onion": "🧅", "cucumber": "🥒",
  "lettuce": "🥬", "spinach": "🍃", "broccoli": "🥦", "capsicum": "🫑",
  "mushroom": "🍄", "berry": "🍓", "strawberry": "🍓", "blueberry": "🫐",
  "watermelon": "🍉", "pineapple": "🍍", "mango": "🥭", "pumpkin": "🎃",
  "courgette": "🥒", "zucchini": "🥒", "beetroot": "🟣",
  "peas": "🫛", "edamame": "🫛", "herb": "🌿", "coriander": "🌿",
  "basil": "🌿", "parsley": "🌿", "feijoa": "🍐", "celery": "🥬",
  "rocket": "🌿", "dates": "🫒", "olive": "🫒",
  "chicken": "🍗", "beef": "🥩", "pork": "🥓", "ham": "🍖", "bacon": "🥓",
  "fish": "🐟", "salmon": "🐟", "tuna": "🐟", "shrimp": "🦐", "prawn": "🦐",
  "sausage": "🌭", "salami": "🍕", "turkey": "🦃", "lamb": "🥩",
  "tofu": "🫘", "falafel": "🧆",
  "milk": "🥛", "cheese": "🧀", "butter": "🧈", "yoghurt": "🥣",
  "egg": "🥚", "cream": "🥛", "feta": "🧀", "mozzarella": "🧀",
  "bread": "🍞", "croissant": "🥐", "bagel": "🥯", "tortilla": "🌮",
  "muffin": "🧁", "wrap": "🌯", "ciabatta": "🥖", "roll": "🥖",
  "cracker": "🍘", "pastry": "🥐", "flour": "🌾", "breadcrumb": "🍞",
  "rice": "🍚", "pasta": "🍝", "noodle": "🍜", "quinoa": "🌾",
  "spaghetti": "🍝", "macaroni": "🍝", "pretzel": "🥨",
  "nori": "🌿", "seaweed": "🌿", "muesli": "🌾",
  "chickpea": "🫘", "black bean": "🫘", "lentil": "🫘", "coconut": "🥥",
  "cocoa": "🍫", "chocolate": "🍫", "honey": "🍯", "jam": "🍓",
  "sugar": "🍬", "mustard": "🫙", "hummus": "🫙", "salsa": "🫙",
  "pesto": "🌿", "mayo": "🫙", "marmite": "🫙", "sauce": "🥫",
  "oil": "🫒", "spice": "🌶️", "curry": "🌶️",
};

// ─── Lookup function ──────────────────────────────────────────────────────────

export function getIngredientEmoji(ingredient: string): string {
  // 1. Exact match (case-insensitive)
  const exactKey = Object.keys(EXACT_EMOJIS).find(
    (k) => k.toLowerCase() === ingredient.toLowerCase()
  );
  if (exactKey) return EXACT_EMOJIS[exactKey];

  // 2. Substring match (longer keys checked first for specificity)
  const lower = ingredient.toLowerCase();
  const keys = Object.keys(SPECIFIC_EMOJIS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lower.includes(key)) return SPECIFIC_EMOJIS[key];
  }

  // 3. Category fallback
  const category = getIngredientCategory(ingredient);
  return CATEGORY_EMOJIS[category] ?? "🛒";
}
