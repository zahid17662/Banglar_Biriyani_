import { neon } from "@neondatabase/serverless"
import "dotenv/config"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("DATABASE_URL is missing in .env")
  process.exit(1)
}

const sql = neon(connectionString)

const img = (id, w = 800, h = 600) =>
  `https://images.unsplash.com/${id}?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=${w}&h=${h}`

export const SEED_MENU_ITEMS = [
  // SATURDAY SPECIALS
  {
    id: "sat-kacchi",
    name: "Shahi Mutton Kacchi Biryani",
    banglaName: "শাহী খাসির কাচ্চি বিরিয়ানি",
    description:
      "Slow-cooked marinated mutton layered with aromatic basmati rice, saffron, spiced potato and fried onions, dum-sealed in a copper handi.",
    price: 480,
    category: "biryani",
    isEveryday: false,
    availableDays: ["Saturday"],
    bestseller: true,
    portion: "1:1 (Full)",
    spiceLevel: "Medium",
    image: img("photo-1589302168068-964664d93dc0"),
  },
  {
    id: "sat-tehari",
    name: "Puran Dhaka Chicken Tehari",
    banglaName: "পুরান ঢাকা চিকেন তেহারি",
    description:
      "Fragrant short-grain Chinigura rice tossed with tender baby chicken pieces, pure mustard oil and fiery green chillies.",
    price: 320,
    category: "tehari",
    isEveryday: false,
    availableDays: ["Saturday"],
    bestseller: false,
    portion: "1:1",
    spiceLevel: "Spicy",
    image: img("photo-1563379091339-03b21ab4a4f8"),
  },

  // SUNDAY SPECIALS
  {
    id: "sun-beef-tehari",
    name: "Old Dhaka Special Beef Tehari",
    banglaName: "স্পেশাল বিফ তেহারি",
    description:
      "Old Dhaka-style traditional tehari with succulent beef cubes, whole green chilies, and cold-pressed mustard oil aroma.",
    price: 350,
    category: "tehari",
    isEveryday: false,
    availableDays: ["Sunday"],
    bestseller: true,
    portion: "1:1",
    spiceLevel: "Spicy",
    image: img("photo-1697155406055-2db32d47ca07"),
  },
  {
    id: "sun-chicken-kacchi",
    name: "Dum Chicken Kacchi",
    banglaName: "চিকেন কাচ্চি বিরিয়ানি",
    description:
      "Dum-cooked chicken marinated in yogurt, secret shahi garam masala, layered with saffron basmati and caramelized beresta.",
    price: 380,
    category: "biryani",
    isEveryday: false,
    availableDays: ["Sunday"],
    bestseller: false,
    portion: "1:1",
    spiceLevel: "Medium",
    image: img("photo-1631515243349-e0cb75fb8d3a"),
  },

  // MONDAY SPECIALS
  {
    id: "mon-murgh-biryani",
    name: "Shahi Dum Murgh Biryani",
    banglaName: "শাহী দম মুরগ বিরিয়ানি",
    description:
      "Tender chicken marinated overnight in nut paste & royal spices, slow dum-cooked with fragrant aged long-grain basmati.",
    price: 370,
    category: "biryani",
    isEveryday: false,
    availableDays: ["Monday"],
    bestseller: true,
    portion: "1:1",
    spiceLevel: "Mild",
    image: img("photo-1563379091339-03b21ab4a4f8"),
  },
  {
    id: "mon-mutton-rezala",
    name: "Mutton Kacchi with Rezala Gravy",
    banglaName: "মটন কাচ্চি সাথে স্পেশাল রেজালা",
    description:
      "Fragrant mutton kacchi platter accompanied by a rich cashew-poppy seed rezala gravy and a boiled egg.",
    price: 520,
    category: "biryani",
    isEveryday: false,
    availableDays: ["Monday"],
    bestseller: false,
    portion: "1:1",
    spiceLevel: "Medium",
    image: img("photo-1589302168068-964664d93dc0"),
  },

  // TUESDAY SPECIALS
  {
    id: "tue-beef-khichuri",
    name: "Traditional Beef Bhuna Khichuri",
    banglaName: "ঐতিহ্যবাহী বিফ ভুনা খিচুড়ি",
    description:
      "Roasted moong dal and chinigura rice cooked to aromatic perfection, tossed with slow-fried tender beef bhuna.",
    price: 360,
    category: "khichuri",
    isEveryday: false,
    availableDays: ["Tuesday"],
    bestseller: true,
    portion: "1:1",
    spiceLevel: "Medium",
    image: img("photo-1620894580123-466ad3a0ca06"),
  },
  {
    id: "tue-chicken-khichuri",
    name: "Shahi Chicken Roast Khichuri",
    banglaName: "চিকেন রোস্ট ভুনা খিচুড়ি",
    description:
      "Ghee-infused yellow khichuri served with a rich, mildly sweet wedding-style chicken roast leg piece.",
    price: 340,
    category: "khichuri",
    isEveryday: false,
    availableDays: ["Tuesday"],
    bestseller: false,
    portion: "1:1",
    spiceLevel: "Medium",
    image: img("photo-1532636875304-0c89119d9b4d"),
  },

  // WEDNESDAY SPECIALS
  {
    id: "wed-morog-polao",
    name: "Dhakaiya Shahi Morog Polao",
    banglaName: "ঢাকাইয়া শাহী মোরগ পোলাও",
    description:
      "Heritage Old Dhaka recipe: Whole chicken quarter slow-braised in ghee, yogurt, and mace, folded into fragrant beresta polao.",
    price: 390,
    category: "polao",
    isEveryday: false,
    availableDays: ["Wednesday"],
    bestseller: true,
    portion: "1:1",
    spiceLevel: "Mild",
    image: img("photo-1631515243349-e0cb75fb8d3a"),
  },
  {
    id: "wed-mutton-tehari",
    name: "Royal Mutton Tehari",
    banglaName: "রয়েল খাসির তেহারি",
    description:
      "Tender baby mutton cubes tossed in cold-pressed mustard oil, green chillies, and aromatic Kalijira rice.",
    price: 440,
    category: "tehari",
    isEveryday: false,
    availableDays: ["Wednesday"],
    bestseller: false,
    portion: "1:1",
    spiceLevel: "Spicy",
    image: img("photo-1697155406055-2db32d47ca07"),
  },

  // THURSDAY SPECIALS
  {
    id: "thu-hyderabadi-kacchi",
    name: "Hyderabadi Shahi Mutton Dum Biryani",
    banglaName: "হায়দ্রাবাদী শাহী মাটন দম বিরিয়ানি",
    description:
      "Extra aromatic dum-cooked basmati biryani with tender mutton, caramelized shallots, mint, and saffron milk.",
    price: 490,
    category: "biryani",
    isEveryday: false,
    availableDays: ["Thursday"],
    bestseller: true,
    portion: "1:1",
    spiceLevel: "Spicy",
    image: img("photo-1589302168068-964664d93dc0"),
  },
  {
    id: "thu-chicken-roast-biryani",
    name: "Biye Bari Chicken Roast & Polao",
    banglaName: "বিয়ে বাড়ির চিকেন রোস্ট ও পোলাও",
    description:
      "Authentic Bangladeshi wedding roast with sweet-tangy thick gravy, served with aromatic ghee chinigura polao.",
    price: 380,
    category: "polao",
    isEveryday: false,
    availableDays: ["Thursday"],
    bestseller: false,
    portion: "1:1",
    spiceLevel: "Mild",
    image: img("photo-1532636875304-0c89119d9b4d"),
  },

  // FRIDAY SPECIALS
  {
    id: "fri-jumma-special-kacchi",
    name: "Royal Jumma Special Grand Kacchi",
    banglaName: "জুম্মা স্পেশাল গ্র্যান্ড কাচ্চি ফিস্ট",
    description:
      "Friday signature: Double piece mutton kacchi with saffron potato, boiled egg, served alongside a jali kabab and fresh salad.",
    price: 550,
    category: "biryani",
    isEveryday: false,
    availableDays: ["Friday"],
    bestseller: true,
    portion: "1:1 (Grand Feast)",
    spiceLevel: "Medium",
    image: img("photo-1589302168068-964664d93dc0"),
  },
  {
    id: "fri-shahi-morog-polao",
    name: "Kolkata Style Chicken Biryani with Aloo",
    banglaName: "কলকাতা স্টাইল চিকেন বিরিয়ানি",
    description:
      "Long-grain basmati cooked with mild spices, meetha attar, spiced succulent chicken, boiled egg, and melt-in-mouth aloo.",
    price: 420,
    category: "biryani",
    isEveryday: false,
    availableDays: ["Friday"],
    bestseller: false,
    portion: "1:1",
    spiceLevel: "Mild",
    image: img("photo-1563379091339-03b21ab4a4f8"),
  },

  // EVERYDAY ADD-ONS & SIDES (Available across all 7 days)
  {
    id: "add-borhani",
    name: "Special Traditional Borhani (500ml)",
    banglaName: "ঐতিহ্যবাহী স্পেশাল বোরহানি",
    description:
      "Creamy spiced sour curd beverage whisked with mint, coriander, roasted cumin, black salt and mustard paste.",
    price: 90,
    category: "beverages",
    isEveryday: true,
    availableDays: [
      "Saturday",
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ],
    bestseller: true,
    portion: "500ml Bottle",
    spiceLevel: "Medium",
    image: img("photo-1692620609860-be6717812f71"),
  },
  {
    id: "add-zafrani-sharbat",
    name: "Royal Zafrani Badam Sharbat (350ml)",
    banglaName: "রয়েল জাফরানি বাদাম শরবত",
    description:
      "Rich milk cooler infused with Kashmiri saffron strands, crushed pistachios, cardamom and basil seeds.",
    price: 120,
    category: "beverages",
    isEveryday: true,
    availableDays: [
      "Saturday",
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ],
    bestseller: false,
    portion: "350ml Bottle",
    spiceLevel: "Sweet",
    image: img("photo-1513558161293-cdaf765ed2fd"),
  },
  {
    id: "add-jali-kabab",
    name: "Crispy Shahi Jali Kabab (2 pcs)",
    banglaName: "শাহী জালি কাবাব (২ পিস)",
    description:
      "Minced beef blended with secret herbs, pan-fried with an ethereal golden egg net web. Served with mint-onion relish.",
    price: 110,
    category: "sides",
    isEveryday: true,
    availableDays: [
      "Saturday",
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ],
    bestseller: true,
    portion: "2 Pcs",
    spiceLevel: "Medium",
    image: img("photo-1603360946369-dc9bb6258143"),
  },
  {
    id: "add-chicken-roast",
    name: "Shahi Biye Bari Chicken Roast",
    banglaName: "শাহী চিকেন রোস্ট",
    description:
      "Golden chicken quarter braised in pure ghee, caramelized onion paste, evaporated milk, and whole fragrant spices.",
    price: 190,
    category: "sides",
    isEveryday: true,
    availableDays: [
      "Saturday",
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ],
    bestseller: false,
    portion: "1 Pc Quarter",
    spiceLevel: "Mild",
    image: img("photo-1532636875304-0c89119d9b4d"),
  },
  {
    id: "add-shahi-firni",
    name: "Shahi Badami Firni Cup",
    banglaName: "শাহী বাদামি ফিরনি",
    description:
      "Silky ground chinigura rice pudding cooked in thickened milk, cardamom, rose water, and topped with silver leaf & pistachios.",
    price: 80,
    category: "desserts",
    isEveryday: true,
    availableDays: [
      "Saturday",
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ],
    bestseller: true,
    portion: "1 Clay Cup",
    spiceLevel: "Sweet",
    image: img("photo-1705174299330-939dd03cc864"),
  },
  {
    id: "add-shahi-jorda",
    name: "Biye Bari Shahi Jorda with Sweets",
    banglaName: "বিয়ে বাড়ির শাহী জর্দা",
    description:
      "Traditional sweet saffron rice garnished with miniature gulab jamun, murabba, khoya, and sliced toasted almonds.",
    price: 100,
    category: "desserts",
    isEveryday: true,
    availableDays: [
      "Saturday",
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ],
    bestseller: false,
    portion: "1 Cup",
    spiceLevel: "Sweet",
    image: img("photo-1589778655375-3e622a9fc91c"),
  },
]

export async function setupDrizzleSchema() {
  console.log(
    "--- Setting up Neon PostgreSQL Schema (Drizzle ORM compatible) ---",
  )

  // Create menu_items table
  await sql`
    CREATE TABLE IF NOT EXISTS menu_items (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      bangla_name VARCHAR(255),
      description TEXT NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'biryani',
      is_everyday BOOLEAN NOT NULL DEFAULT false,
      available_days JSONB NOT NULL,
      bestseller BOOLEAN DEFAULT false,
      portion VARCHAR(50) DEFAULT '1:1',
      spice_level VARCHAR(50) DEFAULT 'Medium',
      image TEXT NOT NULL,
      is_available BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
  console.log("✓ menu_items table initialized")

  // Ensure columns exist if table was already created
  await sql`
    ALTER TABLE menu_items 
      ADD COLUMN IF NOT EXISTS bangla_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'biryani',
      ADD COLUMN IF NOT EXISTS is_everyday BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS available_days JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS bestseller BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS portion VARCHAR(50) DEFAULT '1:1',
      ADD COLUMN IF NOT EXISTS spice_level VARCHAR(50) DEFAULT 'Medium',
      ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
  `

  // Create orders table
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(50) PRIMARY KEY,
      order_number VARCHAR(50) NOT NULL UNIQUE,
      customer_name VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(50) NOT NULL,
      customer_address TEXT NOT NULL,
      scheduled_day VARCHAR(50) NOT NULL DEFAULT 'Saturday',
      delivery_slot VARCHAR(100) NOT NULL DEFAULT 'Instant',
      payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash on Delivery',
      notes TEXT,
      total_amount NUMERIC(10, 2) NOT NULL,
      delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
      status VARCHAR(50) NOT NULL DEFAULT 'Pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
  await sql`
    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS order_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS scheduled_day VARCHAR(50) DEFAULT 'Saturday',
      ADD COLUMN IF NOT EXISTS delivery_slot VARCHAR(100) DEFAULT 'Instant',
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Cash on Delivery',
      ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) DEFAULT 50.00;
  `
  try {
    await sql`ALTER TABLE orders ALTER COLUMN items DROP NOT NULL`
  } catch (e) {
    // column items might not have not-null or might not exist
  }
  console.log("✓ orders table initialized")

  // Create order_items table
  await sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      subtotal NUMERIC(10, 2) NOT NULL
    );
  `
  console.log("✓ order_items table initialized")

  // Seed menu items
  console.log("Upserting 7-Day rotation items into Neon database...")
  for (const item of SEED_MENU_ITEMS) {
    const daysJson = JSON.stringify(item.availableDays)
    await sql`
      INSERT INTO menu_items (
        id, name, bangla_name, description, price, category, is_everyday,
        available_days, bestseller, portion, spice_level, image, is_available
      ) VALUES (
        ${item.id}, ${item.name}, ${item.banglaName}, ${item.description}, ${item.price},
        ${item.category}, ${item.isEveryday}, ${daysJson}::jsonb, ${item.bestseller},
        ${item.portion}, ${item.spiceLevel}, ${item.image}, true
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        bangla_name = EXCLUDED.bangla_name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        category = EXCLUDED.category,
        is_everyday = EXCLUDED.is_everyday,
        available_days = EXCLUDED.available_days,
        bestseller = EXCLUDED.bestseller,
        portion = EXCLUDED.portion,
        spice_level = EXCLUDED.spice_level,
        image = EXCLUDED.image,
        is_available = EXCLUDED.is_available;
    `
  }
  console.log(
    `✓ Upserted ${SEED_MENU_ITEMS.length} items with 7-Day tags & Everyday add-ons`,
  )

  // Insert a sample order if empty
  const orderCount = await sql`SELECT COUNT(*)::int as count FROM orders`
  if (orderCount[0].count === 0) {
    const sampleOrderId = "ord-" + Date.now()
    const orderNumber = "BB-20261028-0001"
    await sql`
      INSERT INTO orders (
        id, order_number, customer_name, customer_phone, customer_address,
        scheduled_day, delivery_slot, payment_method, notes, total_amount, delivery_fee, status
      ) VALUES (
        ${sampleOrderId}, ${orderNumber}, 'Zahid Hassan', '+8801711223344',
        'House 24, Road 7, Dhanmondi, Dhaka', 'Saturday', 'Instant (Within 45 mins)',
        'Cash on Delivery', 'Please send extra onion salad', 570.00, 50.00, 'Confirmed'
      );
    `
    await sql`
      INSERT INTO order_items (order_id, menu_item_id, name, price, quantity, subtotal)
      VALUES 
        (${sampleOrderId}, 'sat-kacchi', 'Shahi Mutton Kacchi Biryani', 480.00, 1, 480.00),
        (${sampleOrderId}, 'add-borhani', 'Special Traditional Borhani (500ml)', 90.00, 1, 90.00);
    `
    console.log(`✓ Seeded sample order ${orderNumber}`)
  }

  console.log("--- Neon Database Setup & Seed Completed Successfully ---")
}

if (process.argv[1]?.endsWith("seed-drizzle.js")) {
  setupDrizzleSchema()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error during Drizzle setup:", err)
      process.exit(1)
    })
}
