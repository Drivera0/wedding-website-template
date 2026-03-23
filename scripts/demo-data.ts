/**
 * Seed demo RSVP data into Supabase.
 *
 * Usage:  VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npx tsx scripts/demo-data.ts
 * Clear:  npx tsx scripts/demo-data.ts --clear
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

const headers = {
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

const DEMO_GUESTS = [
  {
    name: "Emma Thompson",
    email: "emma.t@demo.com",
    dietary_restrictions: null,
    plus_ones: [{ name: "James Thompson", dietary_restrictions: "Gluten-free" }],
  },
  {
    name: "Lucas Martinez",
    email: "lucas.m@demo.com",
    dietary_restrictions: "Vegetarian",
    plus_ones: [],
  },
  {
    name: "Sofia Chen",
    email: "sofia.c@demo.com",
    dietary_restrictions: null,
    plus_ones: [
      { name: "David Chen", dietary_restrictions: null },
      { name: "Lily Chen", dietary_restrictions: "Nut allergy" },
    ],
  },
  {
    name: "Oliver Brown",
    email: "oliver.b@demo.com",
    dietary_restrictions: "Vegan",
    plus_ones: [{ name: "Mia Brown", dietary_restrictions: "Vegan" }],
  },
  {
    name: "Isabella Garcia",
    email: "isabella.g@demo.com",
    dietary_restrictions: null,
    plus_ones: [],
  },
  {
    name: "Noah Williams",
    email: "noah.w@demo.com",
    dietary_restrictions: "Halal",
    plus_ones: [{ name: "Ava Williams", dietary_restrictions: null }],
  },
  {
    name: "Charlotte Davis",
    email: "charlotte.d@demo.com",
    dietary_restrictions: null,
    plus_ones: [],
  },
  {
    name: "Ethan Wilson",
    email: "ethan.w@demo.com",
    dietary_restrictions: "Lactose intolerant",
    plus_ones: [{ name: "Harper Wilson", dietary_restrictions: null }],
  },
  {
    name: "Amelia Taylor",
    email: "amelia.t@demo.com",
    dietary_restrictions: null,
    plus_ones: [
      { name: "Liam Taylor", dietary_restrictions: "Pescatarian" },
    ],
  },
  {
    name: "Benjamin Lee",
    email: "benjamin.l@demo.com",
    dietary_restrictions: null,
    plus_ones: [],
  },
  {
    name: "Sophia Anderson",
    email: "sophia.a@demo.com",
    dietary_restrictions: "Kosher",
    plus_ones: [{ name: "Ryan Anderson", dietary_restrictions: "Kosher" }],
  },
  {
    name: "William Moore",
    email: "william.m@demo.com",
    dietary_restrictions: null,
    plus_ones: [],
  },
];

const STATUSES = ["confirmed", "pending", "declined"] as const;

async function clearDemoData() {
  console.log("Clearing demo data...");

  // Delete guests with @demo.com emails (cascades to plus_ones and guest_dietary)
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/guests?email=like.*@demo.com`,
    { method: "DELETE", headers: { ...headers, Prefer: "return=minimal" } }
  );

  if (!res.ok) {
    console.error("Failed to clear:", res.status, await res.text());
    return;
  }

  console.log("Demo data cleared.");
}

async function seedDemoData() {
  console.log("Seeding demo data...");

  for (const guest of DEMO_GUESTS) {
    // 1. Insert guest
    const guestRes = await fetch(`${SUPABASE_URL}/rest/v1/guests`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({
        name: guest.name,
        email: guest.email,
        dietary_restrictions: guest.dietary_restrictions,
      }),
    });

    if (!guestRes.ok) {
      const text = await guestRes.text();
      console.error(`Failed to insert ${guest.name}:`, text);
      continue;
    }

    const [inserted] = await guestRes.json();

    // 2. Assign a random status
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    await fetch(
      `${SUPABASE_URL}/rest/v1/guests?id=eq.${inserted.id}`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ status }),
      }
    );

    // 3. Insert plus-ones
    if (guest.plus_ones.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/plus_ones`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify(
          guest.plus_ones.map((po) => ({
            guest_id: inserted.id,
            name: po.name,
            dietary_restrictions: po.dietary_restrictions,
          }))
        ),
      });
    }

    console.log(`  ✓ ${guest.name} (${status}) +${guest.plus_ones.length}`);
  }

  console.log(`\nSeeded ${DEMO_GUESTS.length} guests.`);
}

const args = process.argv.slice(2);
if (args.includes("--clear")) {
  clearDemoData();
} else {
  seedDemoData();
}
