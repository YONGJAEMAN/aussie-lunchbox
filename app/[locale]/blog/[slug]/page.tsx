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
}

const POSTS: Record<string, PostContent> = {
  "5-healthy-lunchbox-ideas-for-nz-kids": {
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

  return {
    title: `${post.title} | Aussie Lunchbox Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: new Date(post.date).toISOString(),
      url: `${BASE_URL}/${locale}/blog/${slug}`,
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
        <a key={key++} href={match[3]} className="text-[#78B159] underline hover:text-[#5d9040]">
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
            <tr className="bg-[#314A37] text-white">
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
        <h2 key={i} className="text-2xl font-bold text-[#314A37] mt-10 mb-4">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-xl font-bold text-[#314A37] mt-8 mb-3">
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

  return (
    <main className="min-h-screen bg-[#F5F7FA]">
      {/* Hero image */}
      <div className="relative h-64 md:h-96 w-full">
        <Image src={post.image} alt={post.title} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-[#314A37]/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <span className="bg-[#78B159] text-xs font-semibold px-3 py-1 rounded-full mb-4">
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
        <p className="text-lg text-gray-500 leading-relaxed mb-8 border-l-4 border-[#78B159] pl-4">
          {post.excerpt}
        </p>
        <div className="prose-like">{renderBody(post.body)}</div>
      </article>

      {/* Back link */}
      <div className="text-center pb-12">
        <Link
          href={`/${locale}/blog`}
          className="text-[#78B159] hover:underline text-sm font-medium"
        >
          ← Back to all articles
        </Link>
      </div>

      {/* Footer */}
      <footer className="bg-[#314A37] text-white py-8 px-4">
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
