import { SnackItem } from "./types";

const CALORIES: Record<string, number> = {
  bread: 265, rice: 130, cucumber: 15, mayo: 680, lettuce: 15, chicken: 165,
  cheese: 402, carrot: 41, tomato: 18, hummus: 166, butter: 717, tortilla: 290,
  "tomato sauce": 29, peas: 81, milk: 42, flour: 364, egg: 155, chickpeas: 164,
  yoghurt: 59, spinach: 23, "soy sauce": 53, potato: 77, ham: 145, feta: 264,
  "cream cheese": 342, corn: 86, broccoli: 34, apple: 52, banana: 89, marmite: 220,
  "sushi rice": 130, seaweed: 45, "canned tuna": 132, pastry: 550, pasta: 131, pesto: 393,
  "olive oil": 884, muesli: 360, crackers: 502, "sausage meat": 300, bacon: 410,
  shrimp: 99, turkey: 104, salami: 336, pepperoni: 494, sugar: 387, honey: 304,
  jam: 278, "peanut butter": 588, lentils: 116, "coconut milk": 230, "curry paste": 120,
  nuts: 607, seeds: 520, "dried fruit": 359, beef: 250, pork: 242, fish: 206,
};

const PORTIONS: Record<string, number> = {
  bread: 70, rice: 100, cucumber: 50, mayo: 15, lettuce: 20, chicken: 80,
  cheese: 40, carrot: 50, tomato: 50, hummus: 30, butter: 10, tortilla: 60,
  "tomato sauce": 15, peas: 50, milk: 150, flour: 50, egg: 50, chickpeas: 60,
  yoghurt: 100, spinach: 30, "soy sauce": 10, potato: 150, ham: 50, feta: 30,
  "cream cheese": 30, corn: 50, broccoli: 60, apple: 150, banana: 120, marmite: 5,
  "sushi rice": 100, seaweed: 5, "canned tuna": 70, pastry: 60, pasta: 100, pesto: 20,
  "olive oil": 10, muesli: 45, crackers: 30, "sausage meat": 80, bacon: 40,
  shrimp: 60, turkey: 60, salami: 30, pepperoni: 30, sugar: 10, honey: 15,
  jam: 20, "peanut butter": 30, lentils: 80, "coconut milk": 50, "curry paste": 15,
  nuts: 30, seeds: 20, "dried fruit": 30, beef: 80, pork: 80, fish: 80,
};

export function estimateMenuCalories(ingredients: string[]): number {
  let total = 0;
  for (const item of ingredients) {
    const name = item.toLowerCase();
    const bestMatch = Object.keys(CALORIES).find(
      (key) => key.includes(name) || name.includes(key)
    );
    if (bestMatch) {
      const calPer100g = CALORIES[bestMatch];
      const portionG = PORTIONS[bestMatch] ?? 50;
      total += (calPer100g * portionG) / 100;
    } else {
      total += 40;
    }
  }
  return Math.round(total);
}

export function estimateSnackCalories(snacks: SnackItem[]): number {
  return snacks.reduce(
    (sum, s) => sum + estimateMenuCalories(s.ingredients ?? []),
    0
  );
}
