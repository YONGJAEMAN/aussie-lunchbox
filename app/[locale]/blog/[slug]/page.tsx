import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const BASE_URL = "https://www.aussielunchbox.com.au";

interface PostContent {
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  image: string;
  category: string;
  body: string;
  author?: string;
}

const POSTS: Record<string, PostContent> = {
  "5-healthy-lunchbox-ideas-for-au-kids": {
    title: "5 Healthy Lunchbox Ideas for Australian Kids",
    excerpt:
      "Struggling to come up with fresh lunchbox ideas every week? Here are five nutritious, kid-approved lunches using ingredients easily found at Woolworths or Coles.",
    date: "February 20, 2026",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80",
    category: "Recipes",
    body: `
## Introduction

Packing a school lunchbox five days a week is one of those quiet challenges that many Australia parents face. Between morning routines, work commitments, and trying to keep kids interested in what they eat, it can feel like a constant creative battle.

The good news? You don't need to be a chef to pack a nutritious, interesting lunchbox. Here are five ideas that work brilliantly for Australian kids — all using ingredients you can grab at Woolworths or Coles.

---

## 1. Classic Chicken & Salad Sandwich

**What you need:** Sliced chicken breast, lettuce, cucumber, tomato, mayo, wholegrain bread.

**Why kids love it:** Familiar, filling, and easy to eat at school.

**Tips:**
- Pack the salad components separately in a small container to keep the bread from getting soggy.
- Swap mayo for hummus or avocado for a healthier fat.
- Use a fun cookie cutter to cut the sandwich into a star or heart shape — young kids especially enjoy this.

**Estimated cost:** ~$2.50 per serving.

---

## 2. Sushi Rolls

**What you need:** Sushi rice, nori sheets, cucumber, canned tuna or smoked salmon, soy sauce (small bottle).

**Why kids love it:** Fun to eat, colourful, and you can customise fillings based on what your child likes.

**Tips:**
- Make sushi rice in bulk on Sunday and refrigerate it — it stays good for 2–3 days.
- Use a sushi mat for neat rolling, or simply make hand rolls (temaki) which are faster.
- Pack soy sauce in a small silicone condiment container to avoid spills.

**Estimated cost:** ~$2.00–$2.80 per serving.

---

## 3. Pasta Salad with Pesto & Cherry Tomatoes

**What you need:** Spiral pasta, basil pesto, cherry tomatoes, feta cheese, olives (optional).

**Why kids love it:** Cold pasta travels well, and the pesto gives it a flavour kids really enjoy.

**Tips:**
- Cook pasta in bulk and dress it with pesto while warm — it absorbs better.
- Cherry tomatoes add sweetness and colour, making the lunchbox visually appealing.
- For nut-free schools, use a store-bought dairy-free or nut-free pesto.

**Estimated cost:** ~$1.80 per serving.

---

## 4. Boiled Egg & Veggie Box

**What you need:** 2 boiled eggs, carrot sticks, cucumber slices, cherry tomatoes, hummus for dipping.

**Why kids love it:** It's a "snack board" style lunch that feels fun and interactive.

**Tips:**
- Hard-boil a batch of eggs at the start of the week — they keep in the fridge for up to 5 days.
- Add a small wholegrain roll or crackers on the side to make it more filling.
- Hummus acts as the "dip" and provides protein, making it a balanced meal.

**Estimated cost:** ~$2.00 per serving.

---

## 5. Mini Croissant with Ham & Cheese

**What you need:** Mini croissants (from the Woolworths bakery section), sliced ham, cheese slices, a few baby spinach leaves.

**Why kids love it:** Croissants feel like a treat, but this version is actually quite nutritious.

**Tips:**
- Croissants are best eaten fresh, so pack them without the fillings if possible and let kids assemble at school (fun!).
- Add a small container of fruit (grapes, mandarin segments) to complete the meal.
- Works great as a Friday "treat" lunch.

**Estimated cost:** ~$2.50 per serving.

---

## Make It Even Easier

Want to stop thinking about lunchbox planning entirely? **Aussie Lunchbox Planner** can generate a full week of personalised menus in seconds — complete with a shopping list and estimated costs.

[Try the planner for free →](/en/planner)

---

## Key Takeaways

- Variety is the key to keeping kids interested — rotate between sandwiches, sushi, pasta, and protein boxes.
- Prep ingredients in bulk on Sundays to save time on busy mornings.
- Involve your kids in choosing — even giving them a choice between two options increases the chance they'll eat it.
`,
  },
  "nut-free-school-lunches-australia": {
    title: "Nut-Free School Lunches: A Complete Guide for Australian Parents",
    excerpt:
      "Many Australia schools have nut-free policies. Discover how to pack safe, delicious lunches that comply with school rules without sacrificing nutrition or taste.",
    date: "February 15, 2026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200&q=80",
    category: "Allergy Friendly",
    body: `
## Why Nut-Free Policies Matter

Nut allergies are among the most common and potentially serious food allergies in Australia children. Anaphylaxis — a severe allergic reaction — can be life-threatening, and even trace amounts of nut proteins (through contact or airborne particles in confined spaces) can trigger a reaction in highly sensitive individuals.

Most Australia primary schools now operate under a **nut-free (or "nut-aware") policy** to protect students with allergies. For parents of non-allergic children, this means finding alternatives to nut-containing products like peanut butter, almond milk, and muesli bars.

---

## What to Avoid

When packing a nut-free lunchbox, be vigilant about:

- **Peanut butter** — a common protein staple that must be replaced
- **Trail mix** or dried fruit blends that contain nuts
- **Muesli bars** — many contain nuts or are processed in facilities with nuts; always check the label
- **Nut-based milks** (almond milk, cashew milk)
- **Pesto** — traditional pesto contains pine nuts; look for nut-free alternatives
- **Asian sauces** — satay sauce always contains peanuts
- **Some crackers and biscuits** — check for "may contain traces of nuts" warnings

---

## Great Nut-Free Protein Sources

Replacing peanut butter's protein and healthy fat is easier than you think:

| Alternative | Notes |
|---|---|
| **Sunflower seed butter** | Available at Woolworths and health food stores |
| **Cream cheese** | Great on bagels or wraps |
| **Hummus** | Chickpea-based, no nuts, kids love it as a dip |
| **Boiled eggs** | Easy to prep in bulk |
| **Canned tuna or salmon** | Convenient and affordable |
| **Edamame** | High in protein, fun to eat |
| **Cheese** | Cubes, sticks, or slices |

---

## 5 Nut-Free Lunchbox Ideas

### 1. Tuna Sushi Rolls
Rice, nori, cucumber, and canned tuna — completely nut-free and very popular with kids.

### 2. Hummus & Veggie Dip Box
Carrot sticks, cucumber, capsicum strips, cherry tomatoes, and a pot of hummus. Add GF crackers or a small bread roll.

### 3. Cream Cheese Bagel
A plain or wholegrain bagel with cream cheese, thin cucumber slices, and smoked salmon. No nuts, high in protein.

### 4. Chicken Caesar Wrap
Sliced chicken breast, cos lettuce, parmesan (check it's nut-free), and caesar dressing in a tortilla wrap.

### 5. Pasta with Nut-Free Pesto
Woolworths stocks several nut-free pesto options. Toss with cooked pasta spirals and cherry tomatoes.

---

## Reading Labels Confidently

Australia food labelling requires manufacturers to declare the **top 14 allergens**, including peanuts and tree nuts, on the ingredient list. Look for:

- "Contains: Peanuts / Tree Nuts"
- "May contain traces of peanuts / tree nuts" (indicates shared equipment — risky for severely allergic children)
- The allergen in **bold** within the ingredients list

When in doubt, choose certified nut-free products or contact the manufacturer directly.

---

## Using Aussie Lunchbox Planner

Our **Nut Allergy filter** automatically removes any menus that contain nuts from your weekly plan. Simply tick "Nut Allergy" in the Dietary Preferences section before generating your plan.

[Generate a nut-free meal plan →](/en/planner)
`,
  },
  "gluten-free-lunchbox-tips": {
    title: "Gluten-Free Lunchbox Tips That Kids Will Actually Eat",
    excerpt:
      "Going gluten-free doesn't mean boring lunches. Learn our top strategies for packing gluten-free school lunches that are satisfying, colourful, and easy to prepare.",
    date: "February 10, 2026",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=80",
    category: "Allergy Friendly",
    body: `
## Understanding Coeliac Disease & Gluten Sensitivity

Coeliac disease affects approximately **1 in 70 Australiaers** — though many remain undiagnosed. For children with coeliac disease, consuming even tiny amounts of gluten (a protein found in wheat, barley, rye, and sometimes oats) can trigger intestinal damage and symptoms like stomach pain, fatigue, and poor nutrient absorption.

Non-coeliac gluten sensitivity (NCGS) is even more common and can cause similar digestive discomfort without the autoimmune component.

For parents managing a gluten-free household, school lunches can be one of the trickier meals to plan — but it absolutely doesn't have to mean bland or boring.

---

## Gluten-Free Staples to Stock Up On

**At Woolworths:**
- GF bread (Woolworths Free From range, or Vogel's GF)
- GF pasta (spirals or penne work best in cold salads)
- Rice cakes and GF crackers
- Corn tortillas (check label — plain corn tortillas are usually GF)
- GF soy sauce (Tamari) for sushi

**Naturally gluten-free foods:**
- Rice, potatoes, kumara
- All fresh fruits and vegetables
- Plain meat and fish
- Eggs and cheese
- Legumes (chickpeas, lentils, black beans)

---

## 5 Gluten-Free Lunchbox Ideas

### 1. GF Pasta Salad
Cooked GF spirals, cherry tomatoes, feta, olives, and a drizzle of olive oil and lemon. Can be made the night before.

### 2. Rice Paper Rolls
Rice paper is naturally gluten-free. Fill with vermicelli noodles, cucumber, carrot, avocado, and prawns or tofu. Pack with a GF dipping sauce.

### 3. Sushi with Tamari
Traditional sushi is essentially gluten-free (rice + nori + fillings) — just swap regular soy sauce for **Tamari** (GF soy sauce).

### 4. GF Crackers with Toppings
Rice crackers or GF seed crackers with hummus, cheese slices, and cucumber rounds.

### 5. Fried Rice in a Thermos
If your school allows hot food, leftover fried rice made with GF soy sauce travels beautifully in a thermos.

---

## Cross-Contamination: The Hidden Risk

For children with coeliac disease, cross-contamination is a serious concern. In a school setting:

- **Shared utensils**: Ask the school about canteen procedures if your child eats from there.
- **Crumbs**: Standard bread crumbs can contaminate otherwise GF food — keep GF food in sealed containers.
- **Manufacturing**: Look for certified GF labels (the Australian GF certified symbol) rather than products just labelled "wheat-free."

---

## Label Reading Tips

In Australia, wheat, rye, and barley must be declared on food labels. However, oats require care — while oats themselves don't contain gluten, they're often processed alongside wheat. Look for **certified GF oats** if oats are needed.

---

## Use the Aussie Lunchbox Planner

Select the **Gluten Allergy** filter to instantly exclude all gluten-containing menus from your weekly plan. Every recipe in our database is checked for gluten-containing ingredients.

[Plan your gluten-free week →](/en/planner)
`,
  },
  "budget-friendly-lunchbox-ideas": {
    title: "Budget-Friendly Lunchbox Ideas Under $3 Per Meal",
    excerpt:
      "With grocery prices rising, we've put together practical lunchbox ideas that cost under $3 per serving — without cutting corners on nutrition.",
    date: "February 5, 2026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
    category: "Budget",
    body: `
## The Rising Cost of School Lunches

The average Australia family with two school-age children spends between **$1,500–$2,500 per year** on school lunches. With food prices continuing to rise, many parents are looking for smarter ways to pack nutritious meals without breaking the budget.

The good news is that some of the healthiest lunchbox options are also the most affordable. Here's how to pack a complete, nutritious lunch for under $3 per serving.

---

## The Budget Lunchbox Formula

A good lunchbox covers four bases:

| Component | Budget pick | Cost |
|---|---|---|
| **Carb** | Bread, rice, pasta | $0.30–$0.60 |
| **Protein** | Egg, tuna, chicken, cheese | $0.50–$1.00 |
| **Fruit/Veg** | Seasonal fruit, carrots, cucumber | $0.30–$0.60 |
| **Snack** | Rice crackers, homemade muffin | $0.20–$0.40 |
| **Total** | | **$1.30–$2.60** |

---

## Top Budget Ingredients

### Seasonal Fruit (Australian Autumn/Winter Picks)
- Apples (~$0.40 each in season)
- Feijoas (often free from a neighbour's tree!)
- Mandarins ($0.30–$0.50 each)
- Bananas (~$0.25–$0.35 each)

### Affordable Proteins
- **Eggs**: ~$0.40 per egg (boil a batch on Sundays)
- **Canned tuna**: ~$1.20 per can (2 serves)
- **Cheese**: ~$0.40–$0.60 per 30g serve
- **Chicken**: Buy a whole chicken (~$8–10) and use the breast for 3–4 lunchboxes

---

## 5 Budget Lunches Under $3

### 1. Egg & Cheese Sandwich (~$1.50)
2 slices bread ($0.30) + 1 boiled egg ($0.40) + 1 slice cheese ($0.40) + lettuce ($0.10) + apple ($0.30)

### 2. Tuna Rice Bowl (~$2.00)
½ cup cooked rice ($0.20) + ½ can tuna ($0.60) + 1 tbsp soy sauce ($0.05) + cucumber slices ($0.20) + mandarin ($0.40) + rice crackers ($0.20)

### 3. Pasta Salad (~$1.80)
¾ cup cooked pasta ($0.25) + 2 tbsp pesto ($0.40) + cherry tomatoes ($0.40) + a few olives ($0.20) + banana ($0.30) + crackers ($0.15)

### 4. Cheese & Crackers Box (~$2.20)
GF or standard crackers ($0.30) + 30g cheese ($0.40) + carrot sticks ($0.20) + hummus ($0.30) + apple ($0.40) + homemade muffin ($0.60)

### 5. Chicken Wrap (~$2.50)
1 tortilla ($0.35) + 50g leftover chicken ($0.60) + 1 tbsp mayo ($0.10) + lettuce ($0.10) + tomato ($0.20) + grapes ($0.50) + 2 rice crackers ($0.15)

---

## Money-Saving Strategies

1. **Buy whole chickens** instead of pre-cut breast — significantly cheaper per kilogram.
2. **Batch cook** rice, pasta, and grains at the start of the week.
3. **Buy seasonal produce** — it's 30–50% cheaper and fresher.
4. **Use Coles' own brand** for staples (crackers, pasta, rice, canned tuna).
5. **Freeze bread** and take out slices the night before — reduces waste dramatically.
6. **Make your own muffins or bliss balls** in batches on weekends — they freeze well and cost a fraction of store-bought snacks.

---

## Track Your Spending with Aussie Lunchbox

Our planner uses real Woolworths prices to estimate your weekly lunchbox cost. See the estimated cost per meal before you shop — so there are no budget surprises.

[Generate a budget-friendly plan →](/en/planner)
`,
  },
  "getting-kids-to-eat-healthy-lunches": {
    title: "How to Get Picky Eaters to Enjoy Their Lunchbox",
    excerpt:
      "Does your child come home with an untouched lunchbox? We share tried-and-true strategies for encouraging picky eaters to actually enjoy their school lunches.",
    date: "January 28, 2026",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&q=80",
    category: "Parenting Tips",
    author: "Aussie Lunchbox Team",
    body: `
## The Untouched Lunchbox Problem

If you're a parent, you've probably experienced the sinking feeling of opening your child's lunchbox at the end of a school day to find it largely untouched. You spent time preparing a nutritious meal, and it came home barely touched.

You're not alone. Studies consistently show that a significant proportion of children's school lunches go uneaten — and picky eating is one of the most common concerns parents raise with paediatricians.

The good news is that picky eating is developmentally normal, and there are practical strategies that genuinely help.

---

## Why Kids Don't Eat Their Lunches

Before trying to fix the problem, it helps to understand why it's happening:

- **Social environment**: School lunch is a social time. Kids prioritise talking and playing over eating.
- **Unfamiliar foods**: Children often reject foods at school that they'd eat at home — the change of environment affects perception.
- **Sensory issues**: Temperature, texture, and smell matter a lot to children. A soggy sandwich or warm yoghurt can be off-putting.
- **Too much food**: An overfilled lunchbox can be overwhelming.
- **Lack of autonomy**: Children are more likely to eat food they had a say in choosing.

---

## Strategy 1: Involve Them in the Planning

Children are significantly more likely to eat food they've helped choose or prepare. Try:

- Letting them pick between two options: "Do you want a sandwich or sushi today?"
- Taking them grocery shopping and letting them choose a fruit or snack.
- Letting them help assemble their own lunchbox components.

Even the illusion of choice increases buy-in dramatically.

---

## Strategy 2: Keep It Familiar (and Expand Slowly)

The golden rule of feeding picky eaters is the **"one new, two familiar"** approach:

- Include 1–2 foods you know they love.
- Include 1 food that's similar to something familiar (e.g., if they like carrot sticks, try capsicum strips).
- Keep portions of unfamiliar foods very small — a taste is fine.

Repeated, low-pressure exposure to new foods (researchers say it can take **10–15 exposures** before a child accepts a new food) is far more effective than forcing them to eat.

---

## Strategy 3: Make It Fun

Presentation genuinely matters for young children:

- **Bento-style boxes** with separate compartments for each food are more engaging than everything mixed together.
- **Fun shapes**: A sandwich cut into a star or dinosaur shape gets eaten more readily.
- **Colour variety**: Aim for 3+ colours in the box — colourful lunches look appealing and tend to be more nutritious too.
- **Themed lunches**: "Rainbow day" (one food in each colour), "sushi day," or "dipping day" (everything comes with hummus) create anticipation.

---

## Strategy 4: Solve the Practical Problems

Many lunchbox issues have practical solutions:

| Problem | Solution |
|---|---|
| Sandwich gets soggy | Pack wet ingredients (tomato, cucumber) separately |
| Hot food goes cold | Use an insulated thermos |
| Fruit browns | Spritz with lemon juice or use citrus-adjacent fruit (mandarins don't brown) |
| Too much food | Reduce portions — less is more; kids can ask for more at home |
| Wrong temperature | Use an ice pack for dairy; thermos for hot food |

---

## Strategy 5: Make Lunchtime Low-Pressure

Avoid interrogating your child about what they ate and what they didn't. Neutral, curious questions work better:

- "What did you eat first today?" (not "Why didn't you eat your carrot?")
- "Was there anything you really liked?"

Research on the **Division of Responsibility** (Dr. Ellyn Satter's model) suggests parents decide **what, when, and where** food is offered, and children decide **whether and how much** they eat. This approach, over time, leads to healthier relationships with food.

---

## Strategy 6: Use a Planner

Consistency helps. When kids know what to expect in their lunchbox each week, they adapt better. Our Aussie Lunchbox Planner generates a varied but consistent weekly plan — with the ability to lock in your child's favourites.

[Plan your week now →](/en/planner)

---

## When to Seek Help

If picky eating is extreme (fewer than 20 foods accepted, complete refusal of entire food groups, gagging at most foods), consider speaking with your GP or a paediatric dietitian. ARFID (Avoidant/Restrictive Food Intake Disorder) is a recognised condition that goes beyond typical picky eating and benefits from specialist support.
`,
  },
  "sunday-meal-prep-lunchbox-guide": {
    title: "Sunday Meal Prep: Pack 5 School Lunches in 30 Minutes",
    excerpt: "Spending just 30 minutes on Sunday can mean stress-free school mornings all week. Here's our step-by-step guide to lunchbox meal prep for Australian families.",
    date: "January 20, 2026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80",
    category: "Meal Prep",
    author: "Aussie Lunchbox Team",
    body: `
## Why Sunday Prep Changes Everything

Monday morning chaos is real. Between getting kids dressed, checking homework, packing bags, and making sure everyone eats breakfast, adding lunchbox prep to the mix is stressful. A simple Sunday prep session — just 30 minutes — can make every school morning dramatically calmer.

---

## The 30-Minute Sunday Prep Plan

### Step 1: Cook grains (10 minutes active)
Boil a pot of rice or pasta. While it cooks, you barely need to watch it.

### Step 2: Hard-boil eggs (12 minutes, mostly passive)
Put 6–8 eggs in cold water, bring to boil, cook 10–12 minutes. Done for the week.

### Step 3: Wash and chop vegetables (8 minutes)
Carrot sticks, cucumber slices, cherry tomatoes, capsicum strips — prep a big batch and store in airtight containers.

### Step 4: Portion snacks (5 minutes)
Divide crackers, fruit, and cheese into individual serves. This prevents over-packing and speeds up morning assembly dramatically.

---

## What to Prep Each Sunday

| Food | Storage Life | Notes |
|---|---|---|
| **Cooked rice or pasta** | 3–4 days in fridge | Great base for Monday–Thursday lunches |
| **Hard-boiled eggs** | 5 days in fridge | Don't peel until ready to use |
| **Cut vegetables** | 3–4 days in fridge | Store in water for crispness |
| **Washed fruit** | 3–4 days in fridge | Grapes, berries — ready to grab |
| **Portioned crackers** | All week | In small zip-lock or reusable bags |

---

## Monday–Friday Lunchbox Rotation

**Monday:** Rice bowl with tuna, cucumber, soy sauce + apple + crackers
**Tuesday:** Pasta salad with feta, tomatoes + boiled egg + grapes
**Wednesday:** Sandwich with chicken, lettuce, mayo + carrot sticks + hummus
**Thursday:** Sushi rolls (take 5 mins to roll on Wednesday night) + mandarin
**Friday:** "Snack plate" — crackers, cheese, boiled egg, veggie sticks, fruit

---

## Tips for Efficient Prep

- Use the **biggest pots** you have — cook more than you think you'll need.
- Invest in **5–6 identical containers** so assembly is simply fill-and-go.
- Keep a **"lunchbox station"** in your fridge — one shelf dedicated to prepped components.
- Make double batches of baked goods (muffins, scrolls, bliss balls) and freeze half.

---

## Use the Aussie Lunchbox Planner

Generate a full week's menu instantly and get a shopping list that matches your prep plan — all tailored to your kids' dietary needs.

[Plan your week now →](/en/planner)
`,
  },
  "dairy-free-school-lunches-australia": {
    title: "Dairy-Free School Lunches Australian Kids Will Actually Eat",
    excerpt: "Whether your child has a dairy allergy or intolerance, packing a delicious, dairy-free lunchbox is easier than you think. Here are our top ideas using ingredients from Woolworths and Coles.",
    date: "January 14, 2026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80",
    category: "Allergy Friendly",
    author: "Aussie Lunchbox Team",
    body: `
## Understanding Dairy Allergies vs. Lactose Intolerance

These two conditions are often confused, but they're different:

- **Dairy allergy**: An immune response to milk proteins (casein and whey). Can cause hives, vomiting, or anaphylaxis. Must avoid all dairy strictly.
- **Lactose intolerance**: Difficulty digesting lactose (milk sugar). Causes bloating and discomfort, but isn't dangerous. Some dairy products (hard cheese, yoghurt) are often better tolerated.

Always confirm with your child's GP or allergist which applies to your child.

---

## What to Avoid

| Contains Dairy | Dairy-Free Alternative |
|---|---|
| Butter | Dairy-free spread (Nuttelex) |
| Milk | Oat milk, soy milk, almond milk |
| Cheese | Dairy-free cheese (Sheese, Notzarella) |
| Yoghurt | Coconut yoghurt (Coyo, Activia DF) |
| Cream cheese | Cashew cream cheese |
| Chocolate | Dark chocolate (70%+, check label) |

---

## 5 Dairy-Free Lunchbox Ideas

### 1. Tuna Sushi Rolls
Rice, nori, cucumber, canned tuna — completely dairy-free and popular with kids. Pack with Tamari (GF soy sauce) for dipping.

### 2. Chicken & Avocado Wrap
Corn tortilla with sliced chicken, avocado, lettuce, tomato, and a squeeze of lime. No dairy needed — avocado provides the creamy texture.

### 3. Pasta Salad with Dairy-Free Pesto
Woolworths stocks several nut-free, dairy-free pesto options. Toss with spirals and cherry tomatoes for a crowd-pleaser.

### 4. Hummus & Veggie Box
Hummus is naturally dairy-free. Pair with carrot sticks, cucumber, capsicum, and corn thins for a fun dip-and-eat lunch.

### 5. Rice Paper Rolls
Rice paper, vermicelli noodles, cucumber, carrot, avocado, and prawns or tofu. Serve with sweet chilli or soy dipping sauce — all dairy-free.

---

## Reading Labels for Hidden Dairy

Dairy hides in unexpected places. Check these:

- **Bread** — some contain milk solids
- **Crackers** — many contain butter or milk powder
- **Processed meat** — some sliced meats contain dairy fillers
- **Margarine** — standard margarine contains dairy; choose Nuttelex
- **Cereals and muesli bars** — often contain milk solids or whey

Look for "Contains: Milk" or "May contain milk" on the allergen declaration.

---

## Plan Dairy-Free Weeks Easily

Use the Aussie Lunchbox Planner's **Dairy Allergy** filter to automatically remove all dairy-containing recipes from your weekly plan.

[Generate a dairy-free plan →](/en/planner)
`,
  },
  "vegetarian-lunchbox-ideas-australia": {
    title: "10 Vegetarian Lunchbox Ideas for Australian School Kids",
    excerpt: "Going meat-free at lunchtime? These plant-based lunchbox ideas are protein-rich, filling, and totally kid-approved — perfect for vegetarian families across Australia.",
    date: "January 7, 2026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=80",
    category: "Recipes",
    author: "Aussie Lunchbox Team",
    body: `
## Vegetarian Lunches That Actually Satisfy

The biggest concern with vegetarian school lunches is protein. Without meat, it's easy to end up with a lunchbox that's heavy on carbs but light on the nutrients kids need to concentrate in the afternoon. The key is pairing protein sources strategically.

**Best vegetarian protein sources for lunchboxes:**
- Eggs (boiled, in wraps, or on crackers)
- Legumes (chickpeas, edamame, lentils)
- Cheese and dairy
- Tofu and tempeh
- Seeds (pumpkin seeds, sunflower seeds)
- Nuts (where allowed by school)

---

## 10 Vegetarian Lunchbox Ideas

### 1. Hummus & Veggie Sushi Rolls
Replace fish with hummus, avocado, and roasted red capsicum in nori rolls. High in protein and fibre.

### 2. Caprese Skewers
Cherry tomatoes, fresh mozzarella, and basil on skewers with a drizzle of olive oil. Easy to eat, looks impressive.

### 3. Falafel Wrap
Store-bought or homemade falafel in a wholegrain wrap with tahini, lettuce, tomato, and cucumber. High in protein and fibre.

### 4. Egg & Avo Toast Fingers
Toasted wholegrain bread cut into fingers, topped with smashed avocado and sliced boiled egg. Pack separately to assemble at school.

### 5. Edamame & Rice Bowl
Cooked rice topped with shelled edamame, sliced cucumber, shredded carrot, and soy sauce. Edamame is one of the highest-protein plant foods.

### 6. Cheese & Spinach Scrolls
Homemade or store-bought (Coles bakery), these are crowd-pleasers and easy to eat.

### 7. Lentil Soup in a Thermos
A hearty lentil and vegetable soup travels beautifully in an insulated thermos. Make in bulk on Sunday.

### 8. Greek Salad Box
Cucumber, tomato, Kalamata olives, feta, and wholegrain crackers. Mediterranean flavours kids love.

### 9. Pumpkin & Feta Frittata Slice
Make a big frittata on Sunday, slice into portions. Freezes well and works cold in the lunchbox.

### 10. Chickpea & Avocado Smash Sandwich
Mash chickpeas with avocado, lemon, and cumin. Spread on wholegrain bread — tastes great and packs protein.

---

## Nutrition Checklist for Vegetarian Lunchboxes

- At least one protein source (eggs, legumes, cheese, tofu)
- Complex carbohydrate (wholegrain bread, rice, pasta)
- 1–2 servings of vegetables
- A piece of fruit
- Healthy fat (avocado, olive oil, nuts if permitted)

---

## Plan Vegetarian Weeks Easily

[Generate a vegetarian meal plan →](/en/planner)
`,
  },
  "high-protein-lunchbox-ideas": {
    title: "High-Protein Lunchbox Ideas for Active & Growing Kids",
    excerpt: "Active kids need more protein to fuel their bodies and support healthy growth. Discover easy, high-protein lunchbox ideas that keep kids energised through afternoon sport.",
    date: "December 30, 2025",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=1200&q=80",
    category: "Nutrition",
    author: "Aussie Lunchbox Team",
    body: `
## How Much Protein Do Kids Need?

Protein requirements vary by age and activity level:

| Age | Daily protein (g) | Active kids |
|---|---|---|
| 4–8 years | 20g | 25–30g |
| 9–13 years | 28–34g | 35–45g |
| 14–18 years | 45–52g | 55–70g |

School lunch should ideally provide 30–40% of daily protein needs. For an active 10-year-old, that's roughly 12–18g of protein per lunchbox.

---

## High-Protein Foods for Lunchboxes

| Food | Protein per serve |
|---|---|
| Chicken breast (60g) | 18g |
| Canned tuna (95g can) | 22g |
| Boiled egg | 6g |
| Greek yoghurt (150g) | 15g |
| Cheese (30g) | 7g |
| Edamame (half cup) | 9g |
| Hummus (4 tbsp) | 5g |

---

## 5 High-Protein Lunchbox Ideas

### 1. Tuna & Egg Power Bowl
Canned tuna + 2 boiled eggs + rice + cucumber = approx. 28g protein. Add soy sauce and sesame seeds.

### 2. Chicken & Cheese Wrap
60g sliced chicken + 30g cheese + lettuce + tomato in a tortilla = approx. 25g protein.

### 3. Greek Yoghurt Parfait + Eggs
150g Greek yoghurt with fruit and granola + 1 boiled egg on the side = approx. 21g protein.

### 4. Edamame & Cheese Box
Half cup edamame + 2 cheese slices + wholegrain crackers + cherry tomatoes = approx. 16g protein.

### 5. Smoked Salmon & Cream Cheese Bagel
50g smoked salmon + 2 tbsp cream cheese on a bagel + cucumber = approx. 20g protein.

---

## Tips for Boosting Protein in Any Lunchbox

- Add a hard-boiled egg to any lunch — quick 6g protein boost.
- Choose **Greek yoghurt** over regular yoghurt — double the protein.
- Swap regular crackers for **seed crackers** — higher protein and fibre.
- Add **edamame** as a snack — kids love popping them from the pods.

---

## Plan High-Protein Weeks

[Generate a high-protein meal plan →](/en/planner)
`,
  },
  "waste-free-lunchbox-guide-australia": {
    title: "The Zero-Waste Lunchbox Guide for Australian Families",
    excerpt: "Australia generates thousands of tonnes of lunchbox waste each year. Here's how to pack a delicious, nutritious lunch with zero single-use plastic — and save money doing it.",
    date: "December 22, 2025",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80",
    category: "Sustainability",
    author: "Aussie Lunchbox Team",
    body: `
## The Scale of Australia's Lunchbox Waste Problem

Australian schools generate enormous amounts of food packaging waste. The average school child produces approximately 30kg of packaging waste per year from lunchboxes alone. Multiply that by the 4 million school-age children in Australia, and the scale becomes staggering.

The good news: switching to a waste-free lunchbox system is easier than ever, and it actually saves money in the long run.

---

## The Waste-Free Lunchbox Toolkit

### Containers
- **Bento-style stainless steel or BPA-free plastic boxes** (e.g., Sistema, Pottery Barn, Yumbox)
- **Silicone pouches** for yoghurt, dips, or fruit
- **Small glass or stainless jars** for dressings
- **Fabric sandwich wraps** (beeswax or cotton) instead of cling wrap

### Drinks
- **Reusable drink bottle** — stainless steel keeps drinks cold for 12+ hours
- Avoid single-use juice boxes and pouches

---

## 5 Steps to a Zero-Waste Lunchbox

**Step 1: Audit what you currently throw away**
Spend one week collecting all the packaging from your child's lunchbox. Zip-lock bags, gladwrap, snack wrappers, juice boxes — tally them up.

**Step 2: Replace single-use items one by one**
Start with the highest-volume items: sandwich bags to fabric wraps, juice boxes to reusable bottle.

**Step 3: Buy whole foods instead of pre-packaged snacks**
A bag of crackers + a block of cheese costs less per serve than individual cracker-and-cheese snack packs — and produces far less packaging.

**Step 4: Use leftovers**
Leftover pasta, rice, or curry packed in a thermos or container is the ultimate zero-waste lunch.

**Step 5: Compost food scraps**
Teach kids to bring home apple cores and banana peels for the compost bin.

---

## Cost Comparison: Single-Use vs. Reusable

| Item | Single-use cost (yearly) | Reusable cost (one-off) |
|---|---|---|
| Sandwich bags | $60/year | Fabric wrap: $15 |
| Juice boxes | $200/year | Drink bottle: $25 |
| Snack wrappers | $240/year | Small container: $8 |
| **Total** | **$500/year** | **$48 one-off** |

The reusable system pays for itself within two weeks.

---

## Schools Leading the Way

Many Australian schools participate in **Nude Food** programs — encouraging waste-free lunchboxes. Ask your school if they run such a program.

---

## Pack a Waste-Free Plan

[Generate your waste-free meal plan →](/en/planner)
`,
  },
  "best-lunchbox-containers-australia": {
    title: "Best Lunchbox Containers for Australian Schools in 2026",
    excerpt: "The right container keeps food fresh, prevents leaks, and makes packing easier. We've tested the most popular lunchbox containers available in Australia — here's what we found.",
    date: "December 15, 2025",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=1200&q=80",
    category: "Gear & Tips",
    author: "Aussie Lunchbox Team",
    body: `
## What Makes a Great Lunchbox Container?

- **Leak-proof**: Critical for yoghurt, dips, and saucy dishes
- **Easy to open**: Young kids need to open their own lunchbox without help
- **Durable**: Should survive being dropped on concrete (frequently)
- **Easy to clean**: Dishwasher-safe is ideal
- **Right size**: Not too big (overwhelming) or too small (hungry kids)

---

## Our Top Picks for 2026

### 1. Sistema Bento Lunch (Australia's favourite)
**Price:** ~$15–20 at Woolworths, Coles, or Big W

Sistema is an Australian household name. The clip-lock lid is genuinely leak-proof, the compartments are practical, and they're dishwasher safe.

⭐⭐⭐⭐⭐ **Best overall value**

---

### 2. Yumbox Original
**Price:** ~$55–65 at specialty retailers and Amazon AU

The Yumbox has a leak-proof gasket that seals all compartments individually — yoghurt can't leak onto crackers. Pricier, but beloved by parents.

⭐⭐⭐⭐⭐ **Best for leak prevention**

---

### 3. Bentgo Kids
**Price:** ~$40–50 online

Bright, fun designs appeal to young kids. Five compartments keep food separated. The outer shell is impact-resistant.

⭐⭐⭐⭐ **Best for young kids**

---

### 4. Thermos FUNtainer (for hot food)
**Price:** ~$30–40 at Kmart, Target, or Big W

Keeps food warm for up to 5 hours. Pre-heat by filling with boiling water for 5 minutes before adding food.

⭐⭐⭐⭐⭐ **Best for hot food**

---

### 5. Stainless Steel Tiffin (3-tier)
**Price:** ~$20–35 online

Zero plastic, extremely durable, easy to clean. The stacking design is compact.

⭐⭐⭐⭐ **Best eco option**

---

## Where to Buy in Australia

- **Woolworths/Coles**: Sistema range (great value)
- **Big W/Kmart**: Variety of brands at good prices
- **Amazon Australia**: Yumbox, Bentgo, imported brands
- **Biome/Flora & Fauna**: Eco-friendly stainless options

---

## Pair With a Great Meal Plan

[Generate your weekly lunch plan →](/en/planner)
`,
  },
  "woolworths-vs-coles-lunchbox-budget": {
    title: "Woolworths vs Coles: Which Is Cheaper for School Lunches?",
    excerpt: "We compared the price of a full week's worth of lunchbox ingredients at both major Australian supermarkets. The results might surprise you.",
    date: "December 8, 2025",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1583263086011-8d01b6b2b9c6?w=1200&q=80",
    category: "Budget",
    author: "Aussie Lunchbox Team",
    body: `
## The Great Supermarket Showdown

Woolworths and Coles together account for around 65% of Australia's grocery market. We priced a standard week of lunchbox ingredients at both stores (March 2026 prices, Sydney metro).

---

## The Comparison Basket

| Item | Woolworths | Coles |
|---|---|---|
| Sliced bread (loaf) | $3.50 | $3.00 |
| Sliced chicken breast (200g) | $6.00 | $5.50 |
| Canned tuna (4-pack) | $6.00 | $5.50 |
| Eggs (12-pack) | $5.50 | $5.00 |
| Carrot (1kg) | $1.50 | $1.30 |
| Cherry tomatoes (250g) | $3.50 | $3.00 |
| Cheese block (500g) | $7.00 | $6.50 |
| Apple (1kg) | $3.50 | $3.00 |
| Rice crackers (pack) | $2.80 | $2.50 |
| Hummus (200g) | $3.50 | $3.00 |
| **Total** | **$42.80** | **$38.30** |

**Winner: Coles — $4.50 cheaper per week = ~$160/year saved**

---

## Where Each Store Wins

### Woolworths wins on:
- **Variety**: More brands and specialty items
- **Fresh produce quality**: Marginally better on leafy greens
- **Everyday Rewards**: Points convert to real discounts

### Coles wins on:
- **Own-brand prices**: 10–20% cheaper than Woolworths equivalents
- **Staples pricing**: Bread, eggs, canned goods consistently cheaper
- **Flybuys program**: More straightforward for many families

---

## Smart Shopping Tips

1. **Buy own-brand for staples**: Near-identical quality at significant savings.
2. **Use weekly catalogues**: Both stores' apps show weekly specials.
3. **Buy seasonal produce**: Don't buy mangoes in July.
4. **Freeze bread**: Buy multiple loaves when on special and freeze.
5. **Click & Collect**: Compare prices easily and avoid impulse buys.

---

## The Verdict

For pure price savings, **Coles edges ahead** on lunchbox staples. But the biggest savings come from **buying own-brand products, shopping seasonally, and avoiding pre-packaged snacks**.

---

## Let Us Handle the Planning

[Generate a budget-optimised meal plan →](/en/planner)
`,
  },
  "rainbow-lunchbox-guide": {
    title: "The Rainbow Lunchbox: How to Pack Every Colour",
    excerpt: "Eating a rainbow of colours ensures kids get a wide range of vitamins and minerals. Learn how to build a colourful, nutritious lunchbox that kids love to open.",
    date: "December 1, 2025",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=1200&q=80",
    category: "Nutrition",
    author: "Aussie Lunchbox Team",
    body: `
## Why Colour Matters in Food

Different colours in fruits and vegetables indicate different phytonutrients — plant compounds that support health in various ways.

| Colour | Key nutrients | Examples |
|---|---|---|
| **Red** | Lycopene, Vitamin C | Tomatoes, strawberries, capsicum |
| **Orange** | Beta-carotene, Vitamin A | Carrots, mandarin, pumpkin |
| **Yellow** | Lutein, Vitamin C | Banana, corn, yellow capsicum |
| **Green** | Folate, iron, Vitamin K | Cucumber, spinach, peas, kiwi |
| **Blue/Purple** | Anthocyanins, antioxidants | Blueberries, grapes, beetroot |
| **White** | Allicin, potassium | Apple, pear, cauliflower |

---

## Building a Rainbow Lunchbox

Aim for **3–4 colours** as a realistic daily goal, and the full rainbow across the week.

### Sample Rainbow Lunchbox

- 🔴 **Red**: Cherry tomatoes
- 🟠 **Orange**: Mandarin segments
- 🟡 **Yellow**: Corn on the cob (cut)
- 🟢 **Green**: Cucumber slices + snap peas
- 🟣 **Purple**: A small handful of grapes

Paired with a wholegrain sandwich or sushi rolls, this makes a nutritionally complete lunch.

---

## Kid-Friendly Rainbow Foods by Season

### Summer (Dec–Feb): Strawberries, mango, watermelon, blueberries, cucumber, tomato
### Autumn (Mar–May): Grapes, apple, pear, beetroot, carrot, capsicum
### Winter (Jun–Aug): Orange, mandarin, kiwi fruit, broccoli, spinach
### Spring (Sep–Nov): Strawberries, peas, asparagus, cherries, radishes

---

## Making It Fun

- Let kids **choose one colour** each day to be responsible for.
- Use a **sectioned bento box** so each colour gets its own compartment.
- Make a **weekly colour chart** and tick off colours as they're eaten.
- **"Rainbow challenge"**: see how many different colours they can eat in one week.

---

## The Rainbow Makes Nutrition Easy

[Plan a colourful week of lunches →](/en/planner)
`,
  },
  "thermos-hot-lunch-ideas-australia": {
    title: "Thermos Lunch Ideas: Hot Meals for Cold Australian School Days",
    excerpt: "When the Melbourne cold snap hits or the Canberra frost arrives, a hot thermos lunch can be a game-changer. Here are our favourite warm lunchbox ideas for Australian winters.",
    date: "November 24, 2025",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&q=80",
    category: "Recipes",
    author: "Aussie Lunchbox Team",
    body: `
## The Thermos Method: How It Works

A quality vacuum-insulated thermos keeps food hot (above 60°C for food safety) for 5–7 hours when used correctly. The key is **pre-heating**.

**Pre-heating technique:**
1. Boil a kettle
2. Fill the thermos with boiling water
3. Seal and leave for 5 minutes
4. Pour out water
5. Add piping-hot food immediately
6. Seal tightly

---

## Best Thermos for Australian Schools

The **Thermos FUNtainer** (available at Kmart and Big W for ~$30–40) is the most popular children's thermos in Australia. Its 290ml capacity is ideal for primary school-age children.

---

## 6 Hot Thermos Lunch Ideas

### 1. Minestrone Soup
A chunky minestrone with vegetables, pasta, and beans travels beautifully. Make in bulk and freeze in individual portions.

### 2. Chicken & Corn Soup
A simple Chinese-inspired chicken and corn soup — mild, comforting, and universally liked by kids. Ready in 10 minutes.

### 3. Fried Rice
Leftover fried rice is ideal for a thermos. Pack it hot and it stays perfect until lunchtime.

### 4. Mac & Cheese
Kids' all-time favourite. Make a batch from scratch or use Coles/Woolworths ready-made and heat thoroughly.

### 5. Lentil & Vegetable Soup
Nutritionally dense, cheap to make, and filling. Add bread on the side.

### 6. Pasta in Tomato Sauce
Simple pasta with a good tomato sauce — penne or fusilli work best as they hold heat.

---

## Safety Rules for Thermos Lunches

- Food must be **above 60°C** when packed
- Always **pre-heat the thermos** as described above
- Do not pack foods that have been sitting in the fridge — reheat properly first
- **Do not pack dairy-heavy dishes** unless you can confirm they'll stay hot

---

## Hot Lunch Planning

[Generate a week of lunchbox ideas including hot meals →](/en/planner)
`,
  },
  "multicultural-lunchbox-ideas-australia": {
    title: "Multicultural Lunchbox Ideas Celebrating Australia's Diversity",
    excerpt: "Australia is one of the world's most multicultural nations. Celebrate our rich food culture with lunchbox ideas inspired by Indigenous, Asian, Mediterranean, and Pacific Island flavours.",
    date: "November 17, 2025",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
    category: "Recipes",
    author: "Aussie Lunchbox Team",
    body: `
## Australia's Food Culture Is Our Greatest Asset

With over 200 nationalities represented in Australian schools, our children have access to one of the world's richest food cultures. Multicultural lunchboxes introduce kids to diverse flavours and support cultural identity.

---

## Asian-Inspired Ideas

### Japanese: Sushi & Onigiri
Rice balls (onigiri) with salmon, tuna, or pickled plum filling are easy to make, travel well, and are beloved by kids.

### Chinese: Fried Rice
Leftover egg fried rice with vegetables and soy sauce in a thermos is a classic Chinese school lunch. Add edamame for extra protein.

### Korean: Kimbap
Similar to Japanese maki rolls but with sesame-seasoned rice, ham, egg, carrot, and pickled radish.

### Vietnamese: Fresh Rice Paper Rolls
Rice paper rolls with prawns, vermicelli, mint, cucumber, and sweet chilli sauce. No cooking required — just assembly.

---

## Mediterranean & Middle Eastern Ideas

### Lebanese: Pita & Hummus Box
Wholemeal pita cut into triangles, hummus, cherry tomatoes, cucumber, olives, and feta.

### Greek: Spanakopita Slice
Spinach and feta in flaky pastry — delicious cold. Make a batch on Sunday and slice for the week.

### Turkish: Börek (Cheese Roll)
Filo pastry with white cheese filling — crispy even when cold.

---

## Indigenous Australian Ingredients

Australia's native foods are increasingly available at specialty stores:

- **Quandong** (native peach): Sweet, tart fruit used in jams and desserts
- **Wattleseed**: Nutty flavour used in biscuits and smoothies
- **Lemon myrtle**: Citrus-like flavour for dressings and baked goods
- **Finger lime**: Burst of citrus that kids love

Introducing these ingredients connects children to Australia's oldest food culture.

---

## Celebrate Diversity Every Day

[Generate a multicultural meal plan →](/en/planner)
`,
  },
  "lunchbox-ideas-by-age-australia": {
    title: "Lunchbox Ideas by Age: From 5-Year-Olds to Teenagers",
    excerpt: "A 6-year-old and a 14-year-old have very different nutritional needs and taste preferences. Here's your complete age-by-age guide to packing the right lunchbox for every stage.",
    date: "November 10, 2025",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200&q=80",
    category: "Parenting Tips",
    author: "Aussie Lunchbox Team",
    body: `
## Why Age-Appropriate Lunchboxes Matter

A lunchbox designed for a 5-year-old will leave a teenager unsatisfied. Conversely, a teenage-sized lunch can overwhelm a Prep child. Getting the right balance of portions, textures, and nutritional focus for each age group makes the difference between a lunchbox that gets eaten and one that comes home untouched.

---

## Ages 5–7: Foundation Years

**Developmental considerations:**
- Fine motor skills still developing — easy-to-eat finger foods work best
- Short attention spans — variety in the box is important
- Strong neophobia (fear of new foods) is normal at this age

**Best ideas:**
- Mini sandwiches cut into triangles or fun shapes
- Fruit kebabs on short skewers
- Cheese cubes and crackers
- Vegemite scrolls (a classic Australian staple)
- Boiled egg halves with cherry tomatoes

---

## Ages 8–10: Growing Rapidly

**Developmental considerations:**
- More independent — can open most containers
- Growing quickly, need more calories
- Starting to form opinions about what's "cool" to eat

**Best ideas:**
- Sushi rolls (can help make on weekends)
- Pasta salad with cherry tomatoes and feta
- Hummus and vegetable dip box with pita
- Chicken wrap with salad
- Fruit salad with yoghurt dip

---

## Ages 11–13: Pre-Teen Appetite

**Developmental considerations:**
- Appetite increases significantly, especially in boys
- Peer influence on food choices increases
- May want "cooler" foods that aren't embarrassing at school

**Best ideas:**
- Hearty chicken Caesar wrap
- Fried rice in a thermos
- Large pasta salad with protein
- Homemade sushi platter
- High-protein snack box (boiled eggs, cheese, crackers)

---

## Ages 14–18: Teenage Athletes

**Developmental considerations:**
- Peak growth and development
- High energy needs, especially for sport
- May be making their own food choices — education matters

**Best ideas:**
- Double chicken and avocado sandwiches
- Rice bowl with tuna, edamame, and pickled ginger
- Protein-rich snack boxes (Greek yoghurt, boiled eggs, cheese)
- Leftover dinner in a thermos (curry, stir-fry, pasta)
- Homemade energy balls for afternoon training

---

## Age-Specific Plans in the Planner

[Generate an age-appropriate meal plan →](/en/planner)
`,
  },
  "summer-lunchbox-ideas-australia": {
    title: "Summer Lunchbox Ideas for Hot Australian School Days",
    excerpt: "Australian summers can be brutal, and a warm lunchbox isn't appetising. Here's how to pack fresh, cool, and safe lunches that survive the heat and keep kids energised.",
    date: "November 3, 2025",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=1200&q=80",
    category: "Seasonal",
    author: "Aussie Lunchbox Team",
    body: `
## The Summer Lunchbox Challenge

Australian summer school terms (Terms 1 and 4) bring unique challenges. With temperatures regularly hitting 30°C+ in cities like Sydney, Brisbane, and Perth, lunchboxes can reach dangerous temperatures if not packed correctly.

The food safety danger zone is **5°C–60°C** — bacteria multiply rapidly in this range.

---

## Food Safety First

### Essential summer gear:
- **Insulated lunchbox**: Not just a soft bag — it needs proper insulation
- **Ice brick**: Freeze overnight, place in lunchbox every morning
- **Pre-chilled containers**: Store containers in the fridge overnight

### Foods to avoid in summer:
- Mayonnaise-based salads left at room temperature
- Dairy items without adequate ice bricks
- Rice or pasta that hasn't been refrigerated overnight

---

## 5 Summer Lunchbox Ideas

### 1. Sushi Rolls
Rice, nori, and fillings — stays cool, travels well, kids love it. Make the night before and refrigerate.

### 2. Chicken & Salad Wrap (Chilled)
Pack with an extra ice brick to keep the chicken below 5°C. Prepare the night before and refrigerate assembled.

### 3. Cold Pasta Salad
Cooked pasta chilled overnight + cherry tomatoes + cucumber + feta + olive oil dressing. Refreshing and filling.

### 4. Fresh Rice Paper Rolls
Rice paper + vermicelli + prawns or tofu + cucumber + mint. Naturally refreshing, no heating required.

### 5. Summer Fruit & Protein Box
Watermelon cubes, mango slices, grapes + boiled egg + cheese + crackers. Light but nutritious.

---

## Australian Summer Seasonal Produce (Dec–Feb)

| Fruit | Why it works |
|---|---|
| Watermelon | Hydrating, kids love it |
| Mango | Sweet, nutritious — slice in advance |
| Grapes | No prep, perfect finger food |
| Strawberries | Great with yoghurt dip |
| Stone fruit | Peak season flavour |

---

## Keeping Lunches Cold

1. **Freeze drink bottles**: A frozen water bottle doubles as an ice pack.
2. **Double ice bricks**: On very hot days, use two ice bricks.
3. **Pre-chill the lunchbox**: Keep the whole lunchbox in the fridge overnight.
4. **Choose insulated bags**: Woolworths and Coles sell affordable insulated lunch bags.

---

## Stay Cool This Summer

[Generate a summer-ready meal plan →](/en/planner)
`,
  },
  "kids-make-own-lunchbox": {
    title: "Let Kids Pack Their Own Lunchbox: A Practical Guide",
    excerpt: "When children help pack their own lunches, they're far more likely to actually eat them. Here's how to set up a simple lunchbox station that gives kids independence while keeping nutrition on track.",
    date: "October 27, 2025",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=1200&q=80",
    category: "Parenting Tips",
    author: "Aussie Lunchbox Team",
    body: `
## The Research Behind Kid-Packed Lunchboxes

Studies on children's feeding behaviour consistently show that **autonomy and involvement significantly increase food acceptance**. When children feel ownership over their food choices, they're more invested in eating them.

A 2019 study from Deakin University found that children who were involved in meal preparation were more likely to eat a wider variety of foods and demonstrate positive attitudes toward healthy eating.

---

## Setting Up a Lunchbox Station

The key to success is making the **right choices easy and the wrong choices hard**.

### In the fridge (accessible shelf):
- Washed and cut vegetables in clear containers
- Washed fruit (grapes ready to go, mandarin peeled)
- Individual yoghurt portions
- Cheese cubes or sticks
- Hard-boiled eggs (pre-cooked)
- Leftover cooked rice or pasta

### In the pantry (lunchbox station):
- Individual cracker portions
- Nut-free muesli bar options (checked and approved)
- Rice cakes
- Individual dried fruit portions

---

## The "Build Your Lunchbox" System

Give kids a simple framework to follow:

1. **Pick a "main"** (sandwich, wrap, sushi, pasta, rice)
2. **Pick a "protein"** (egg, cheese, chicken, tuna, hummus)
3. **Pick 2 veggies or salad items**
4. **Pick 1–2 fruits**
5. **Pick 1 snack** (cracker, muesli bar, yoghurt)

Print this framework and stick it on the fridge. Kids as young as 5 can follow it with guidance; by 8–10, most can do it independently.

---

## Age Recommendations

| Age | Level of independence | Your role |
|---|---|---|
| 4–5 years | Pick from 2 options you offer | Full supervision, do the packing |
| 6–7 years | Pick from the station with guidance | Supervise, check at the end |
| 8–10 years | Pack independently using the framework | Review and top up if needed |
| 11+ years | Full independence | Occasional check-in |

---

## Handling the "Only Treats" Problem

Some kids will try to pack only crackers and chocolate. Handle this with structure, not battles:

- **The rule**: Each section of the framework must be filled. No skipping vegetables.
- **The choice**: They choose *which* vegetable, not *whether* there's one.

---

## Build Independence With Our Planner

Generate a weekly menu together with your kids — they choose from options, you approve the final plan.

[Start planning together →](/en/planner)
`,
  },
  "school-canteen-vs-packed-lunch": {
    title: "School Canteen vs Packed Lunch: The Complete Comparison",
    excerpt: "Should you pack lunch every day or let your kids buy from the canteen? We break down the cost, nutrition, and convenience of both options to help Australian parents decide.",
    date: "October 20, 2025",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80",
    category: "Gear & Tips",
    author: "Aussie Lunchbox Team",
    body: `
## The Canteen Debate

Most Australian parents use a mix of both — packed lunch on most days, canteen as an occasional treat or convenience.

---

## Cost Comparison

### School Canteen
The average Australian school canteen lunch costs **$7–12 per day** (main + drink + snack).
Annual cost for a 200-school-day year: **$1,400–$2,400 per child**

### Packed Lunch
A well-planned packed lunch using Woolworths or Coles ingredients costs **$3–5 per day**.
Annual cost: **$600–$1,000 per child**

**Packed lunch saves $800–$1,400 per child per year.**

---

## Nutrition Comparison

### School Canteen
Most Australian school canteens operate under the **Fresh Tastes @ School** or state-equivalent healthy canteen guidelines. In practice, food quality varies widely by school.

### Packed Lunch
Nutrition is entirely in your control — which is both the opportunity and the responsibility. A well-packed lunchbox can be more nutritious than most canteen meals.

**Verdict: Tied** — both can be excellent or poor depending on what's chosen.

---

## Convenience Comparison

### School Canteen Wins:
- Zero prep time on busy mornings
- No containers to wash
- Kids manage their own payment (independence)

### Packed Lunch Wins:
- Consistent — no menu changes or items running out
- Allergy-safe — you control every ingredient
- No cash/card management

---

## When Canteen Makes Sense

- Occasional treat days (Fridays, birthdays, special events)
- When your child's school has an exceptional canteen program
- Emergency days when you've had no time to prep
- For teenagers who can manage their own ordering and budget

---

## The Best of Both Worlds

Most families pack lunch 3–4 days per week and use the canteen 1–2 days. This balances cost savings, nutritional control, and convenience.

---

## Plan Your Packed Days With Us

[Generate your weekly lunchbox plan →](/en/planner)
`,
  },
};

export async function generateStaticParams() {
  return Object.keys(POSTS).flatMap((slug) =>
    ["en", "ko", "zh"].map((locale) => ({ locale, slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = POSTS[slug];
  if (!post) return {};

  const canonical = `${BASE_URL}/${locale}/blog/${slug}`;

  return {
    title: `${post.title} | Aussie Lunchbox Blog`,
    description: post.excerpt,
    alternates: {
      canonical,
      languages: {
        en: `${BASE_URL}/en/blog/${slug}`,
        ko: `${BASE_URL}/ko/blog/${slug}`,
        "zh-CN": `${BASE_URL}/zh/blog/${slug}`,
      },
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: new Date(post.date).toISOString(),
      url: canonical,
      images: [{ url: post.image, width: 1200, height: 630, alt: post.title }],
    },
  };
}

/** Renders inline markdown: **bold** and [text](url) → React elements */
function renderInline(text: string): React.ReactNode[] {
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));

    if (match[1] !== undefined) {
      parts.push(<strong key={key++}>{match[1]}</strong>);
    } else {
      parts.push(
        <a key={key++} href={match[3]} className="text-[#F5A623] underline hover:text-[#D4850A]">
          {match[2]}
        </a>
      );
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function renderBody(body: string) {
  const lines = body.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeader: string[] = [];

  function flushTable() {
    if (!tableRows.length) return;
    elements.push(
      <div key={`table-${elements.length}`} className="overflow-x-auto my-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#7B3F00] text-white">
              {tableHeader.map((h, i) => (
                <th key={i} className="px-4 py-2 text-left font-semibold">{renderInline(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2 border-b border-gray-100">
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    inTable = false;
    tableRows = [];
    tableHeader = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table detection
    if (line.startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => c.match(/^[-:]+$/))) continue; // separator row
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (line === "---") {
      elements.push(<hr key={i} className="my-8 border-gray-200" />);
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-2xl font-bold text-[#7B3F00] mt-10 mb-4">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-xl font-bold text-[#7B3F00] mt-8 mb-3">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={i} className="text-gray-600 ml-4 mb-1 leading-relaxed">
          {renderInline(line.slice(2))}
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="mb-3" />);
    } else {
      elements.push(
        <p key={i} className="text-gray-600 leading-relaxed mb-3">
          {renderInline(line)}
        </p>
      );
    }
  }
  if (inTable) flushTable();
  return elements;
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = POSTS[slug];
  if (!post) notFound();

  const author = post.author ?? "Aussie Lunchbox Team";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.image,
    datePublished: new Date(post.date).toISOString(),
    author: { "@type": "Organization", name: author, url: BASE_URL },
    publisher: {
      "@type": "Organization",
      name: "Aussie Lunchbox",
      url: BASE_URL,
      logo: { "@type": "ImageObject", url: `${BASE_URL}/favicon.ico` },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/${locale}/blog/${slug}`,
    },
  };

  return (
    <main className="min-h-screen bg-[#FDFAF2]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero image */}
      <div className="relative h-64 md:h-96 w-full">
        <Image src={post.image} alt={post.title} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-[#7B3F00]/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <span className="bg-[#F5A623] text-xs font-semibold px-3 py-1 rounded-full mb-4">
            {post.category}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold max-w-3xl leading-tight mb-3">
            {post.title}
          </h1>
          <p className="text-sm opacity-80">
            {post.date} · {post.readTime}
          </p>
        </div>
      </div>

      {/* Article */}
      <article className="max-w-3xl mx-auto bg-white rounded-2xl shadow px-8 py-10 mt-[-2rem] relative z-10 mb-16">
        {/* Author byline */}
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
          <div className="w-9 h-9 rounded-full bg-[#F5A623] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            A
          </div>
          <div>
            <p className="text-sm font-semibold text-[#7B3F00]">{author}</p>
            <p className="text-xs text-gray-400">{post.date} · {post.readTime}</p>
          </div>
        </div>
        <p className="text-lg text-gray-500 leading-relaxed mb-8 border-l-4 border-[#F5A623] pl-4">
          {post.excerpt}
        </p>
        <div className="prose-like">{renderBody(post.body)}</div>
      </article>

      {/* Back link */}
      <div className="text-center pb-12">
        <Link
          href={`/${locale}/blog`}
          className="text-[#F5A623] hover:underline text-sm font-medium"
        >
          ← Back to all articles
        </Link>
      </div>

      {/* Footer */}
      <footer className="bg-[#7B3F00] text-white py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm opacity-75">
            © {new Date().getFullYear()} Aussie Lunchbox — The Lunch Planner for Australian Families.
          </p>
          <div className="flex gap-4 text-sm opacity-75">
            <Link href={`/${locale}/terms`} className="hover:opacity-100">Terms</Link>
            <Link href={`/${locale}/policies`} className="hover:opacity-100">Privacy</Link>
            <Link href={`/${locale}/contact`} className="hover:opacity-100">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
