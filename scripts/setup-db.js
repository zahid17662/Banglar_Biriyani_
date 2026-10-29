import { neon } from "@neondatabase/serverless"
import "dotenv/config"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("DATABASE_URL is not defined in environment or .env")
  process.exit(1)
}

const sql = neon(connectionString)

const img = (id, w = 800, h = 600) =>
  `https://images.unsplash.com/${id}?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=${w}&h=${h}`

const INITIAL_MENU = [
  {
    id: "m1",
    name: "Signature Kacchi Biryani (Mutton)",
    description:
      "Slow-cooked mutton layered with aromatic basmati, saffron, potato and fried onions, sealed dum-style.",
    price: 450,
    bestseller: true,
    image: img("photo-1589302168068-964664d93dc0"),
    category: "Biryani",
  },
  {
    id: "m2",
    name: "Special Chicken Tehari",
    description:
      "Fragrant short-grain rice tossed with tender chicken, mustard oil and green chillies.",
    price: 320,
    bestseller: false,
    image: img("photo-1563379091339-03b21ab4a4f8"),
    category: "Tehari",
  },
  {
    id: "m3",
    name: "Jali Kabab (2 pcs)",
    description:
      "Crispy egg-laced minced beef patties, pan-fried golden and served with onion salad.",
    price: 100,
    bestseller: false,
    image: img("photo-1603360946369-dc9bb6258143"),
    category: "Sides",
  },
  {
    id: "m4",
    name: "Traditional Borhani (500ml)",
    description:
      "Spiced yoghurt drink with mint and black salt. The perfect biryani partner.",
    price: 80,
    bestseller: false,
    image: img("photo-1692620609860-be6717812f71"),
    category: "Beverages",
  },
  {
    id: "m5",
    name: "Chicken Biryani",
    description:
      "Basmati rice dum-cooked with spiced chicken, boiled egg and a hint of rose water.",
    price: 350,
    bestseller: false,
    image: img("photo-1631515243349-e0cb75fb8d3a"),
    category: "Biryani",
  },
  {
    id: "m6",
    name: "Beef Tehari",
    description:
      "Old Dhaka-style tehari with tender beef chunks and aromatic mustard oil.",
    price: 300,
    bestseller: false,
    image: img("photo-1697155406055-2db32d47ca07"),
    category: "Tehari",
  },
  {
    id: "m7",
    name: "Chicken Roast",
    description:
      "Rich, mildly sweet wedding-style roast with ghee, yoghurt and fried onion.",
    price: 180,
    bestseller: false,
    image: img("photo-1532636875304-0c89119d9b4d"),
    category: "Sides",
  },
  {
    id: "m8",
    name: "Firni Cup",
    description:
      "Chilled ground-rice pudding with cardamom, pistachio and almond.",
    price: 70,
    bestseller: false,
    image: img("photo-1705174299330-939dd03cc864"),
    category: "Desserts",
  },
]

const INITIAL_MEALS = [
  {
    id: "d1",
    name: "Rice & Chicken Curry",
    description:
      "Steamed rice with home-style chicken curry, dal and a fresh salad.",
    price: 220,
    bestseller: false,
    image: img("photo-1679279727895-bd5c9fb9c1a0"),
    category: "Daily Meals",
  },
  {
    id: "d2",
    name: "Rice & Fish Curry",
    description:
      "Steamed rice with rui fish in a light mustard and turmeric gravy.",
    price: 240,
    bestseller: true,
    image: img("photo-1761314037238-e4da5023e844"),
    category: "Daily Meals",
  },
  {
    id: "d3",
    name: "Bengali Thali",
    description:
      "Rice, dal, bhaji, bhorta, chicken curry and chutney on one platter.",
    price: 320,
    bestseller: false,
    image: img("photo-1589778655375-3e622a9fc91c"),
    category: "Daily Meals",
  },
  {
    id: "d4",
    name: "Rice & Beef Bhuna",
    description: "Steamed rice with slow-fried beef bhuna and a side of dal.",
    price: 260,
    bestseller: false,
    image: img("photo-1620894580123-466ad3a0ca06"),
    category: "Daily Meals",
  },
  {
    id: "d5",
    name: "Veg Rice Plate",
    description: "Rice with mixed vegetables, dal and aloo bhorta.",
    price: 160,
    bestseller: false,
    image: img("photo-1588644525273-f37b60d78512"),
    category: "Daily Meals",
  },
  {
    id: "d6",
    name: "Rice & Egg Curry",
    description: "Steamed rice with duck egg curry and crispy fried potatoes.",
    price: 180,
    bestseller: false,
    image: img("photo-1723208841184-3d91ba244c60"),
    category: "Daily Meals",
  },
]

export async function setupDatabase() {
  console.log("--- Initializing Neon Database Schema ---")

  // 1. Create tables
  await sql`
    CREATE TABLE IF NOT EXISTS menu_items (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price NUMERIC(10, 2) NOT NULL,
      bestseller BOOLEAN DEFAULT false,
      image TEXT,
      category VARCHAR(50) DEFAULT 'Biryani',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
  console.log("✓ menu_items table ready")

  await sql`
    CREATE TABLE IF NOT EXISTS meals (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price NUMERIC(10, 2) NOT NULL,
      bestseller BOOLEAN DEFAULT false,
      image TEXT,
      category VARCHAR(50) DEFAULT 'Daily Meals',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
  console.log("✓ meals table ready")

  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(50) PRIMARY KEY,
      customer_name VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(50) NOT NULL,
      customer_address TEXT NOT NULL,
      items JSONB NOT NULL,
      total_amount NUMERIC(10, 2) NOT NULL,
      status VARCHAR(50) DEFAULT 'Pending',
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
  console.log("✓ orders table ready")

  // 2. Seed initial menu items if empty
  const countMenu = await sql`SELECT COUNT(*)::int as count FROM menu_items`
  if (countMenu[0].count === 0) {
    console.log("Seeding initial menu items...")
    for (const item of INITIAL_MENU) {
      await sql`
        INSERT INTO menu_items (id, name, description, price, bestseller, image, category)
        VALUES (${item.id}, ${item.name}, ${item.description}, ${item.price}, ${item.bestseller}, ${item.image}, ${item.category})
        ON CONFLICT (id) DO NOTHING;
      `
    }
    console.log(`✓ Seeded ${INITIAL_MENU.length} menu items`)
  } else {
    console.log(`ℹ menu_items table already has ${countMenu[0].count} items`)
  }

  // 3. Seed initial meals if empty
  const countMeals = await sql`SELECT COUNT(*)::int as count FROM meals`
  if (countMeals[0].count === 0) {
    console.log("Seeding initial daily meals...")
    for (const item of INITIAL_MEALS) {
      await sql`
        INSERT INTO meals (id, name, description, price, bestseller, image, category)
        VALUES (${item.id}, ${item.name}, ${item.description}, ${item.price}, ${item.bestseller}, ${item.image}, ${item.category})
        ON CONFLICT (id) DO NOTHING;
      `
    }
    console.log(`✓ Seeded ${INITIAL_MEALS.length} daily meals`)
  } else {
    console.log(`ℹ meals table already has ${countMeals[0].count} items`)
  }

  // 4. Seed a sample order if orders table is empty
  const countOrders = await sql`SELECT COUNT(*)::int as count FROM orders`
  if (countOrders[0].count === 0) {
    console.log("Seeding sample welcome order...")
    const sampleItems = JSON.stringify([
      {
        id: "m1",
        name: "Signature Kacchi Biryani (Mutton)",
        price: 450,
        quantity: 2,
      },
      { id: "m4", name: "Traditional Borhani (500ml)", price: 80, quantity: 2 },
    ])
    await sql`
      INSERT INTO orders (id, customer_name, customer_phone, customer_address, items, total_amount, status, notes)
      VALUES (
        'ORD-1001',
        'Rafiqul Islam',
        '+8801711223344',
        'House 24, Road 7, Dhanmondi, Dhaka',
        ${sampleItems}::jsonb,
        1060.00,
        'Preparing',
        'Extra green chillies please'
      )
      ON CONFLICT (id) DO NOTHING;
    `
    console.log("✓ Seeded sample order ORD-1001")
  } else {
    console.log(`ℹ orders table already has ${countOrders[0].count} orders`)
  }

  console.log("--- Neon Database Setup Complete ---")
}

// If executed directly:
if (process.argv[1]?.endsWith("setup-db.js")) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Setup failed:", err)
      process.exit(1)
    })
}
