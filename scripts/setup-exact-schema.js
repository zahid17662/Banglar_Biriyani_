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

export async function setupExactSchema() {
  console.log(
    "--- Setting up Exact Banglar Biriyani Schema in Neon PostgreSQL ---",
  )

  // 1. Create Enums if not exist
  await sql`
    DO $$ BEGIN
      CREATE TYPE day_of_week AS ENUM ('SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `

  await sql`
    DO $$ BEGIN
      CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `

  await sql`
    DO $$ BEGIN
      CREATE TYPE payment_method AS ENUM ('COD', 'BKASH', 'NAGAD');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `
  console.log("✓ Enums created / verified")

  // 2. Drop legacy tables if migrating to exact serial IDs
  // To ensure clean foreign keys and integer IDs as specified in user's diagram:
  await sql`DROP TABLE IF EXISTS order_items CASCADE;`
  await sql`DROP TABLE IF EXISTS orders CASCADE;`
  await sql`DROP TABLE IF EXISTS daily_menu_schedules CASCADE;`
  await sql`DROP TABLE IF EXISTS menu_items CASCADE;`
  await sql`DROP TABLE IF EXISTS categories CASCADE;`
  console.log("✓ Cleared previous tables for clean architecture setup")

  // 3. Create Categories
  await sql`
    CREATE TABLE categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `
  console.log("✓ Created categories table")

  // 4. Create Menu Items
  await sql`
    CREATE TABLE menu_items (
      id SERIAL PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      base_price_bdt INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      portion_size TEXT NOT NULL DEFAULT '1:1 Regular',
      spice_level TEXT NOT NULL DEFAULT 'Medium',
      rating TEXT NOT NULL DEFAULT '4.9',
      is_everyday BOOLEAN NOT NULL DEFAULT false,
      is_available BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `
  console.log("✓ Created menu_items table")

  // 5. Create Daily Menu Schedules
  await sql`
    CREATE TABLE daily_menu_schedules (
      id SERIAL PRIMARY KEY,
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      day_of_week day_of_week NOT NULL,
      special_price_bdt INTEGER,
      daily_quota INTEGER NOT NULL DEFAULT 100,
      is_featured BOOLEAN NOT NULL DEFAULT false
    );
  `
  await sql`
    CREATE UNIQUE INDEX item_day_unique_idx ON daily_menu_schedules (menu_item_id, day_of_week);
  `
  console.log("✓ Created daily_menu_schedules table with unique index")

  // 6. Create Orders Table
  await sql`
    CREATE TABLE orders (
      id SERIAL PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_address TEXT NOT NULL,
      scheduled_day day_of_week NOT NULL,
      delivery_slot TEXT NOT NULL DEFAULT 'ASAP (45-60 mins)',
      payment_method payment_method NOT NULL DEFAULT 'COD',
      subtotal_bdt INTEGER NOT NULL,
      delivery_fee_bdt INTEGER NOT NULL DEFAULT 60,
      total_bdt INTEGER NOT NULL,
      status order_status NOT NULL DEFAULT 'PENDING',
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `
  console.log("✓ Created orders table")

  // 7. Create Order Items Table
  await sql`
    CREATE TABLE order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
      scheduled_day day_of_week NOT NULL,
      item_name_snapshot TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_bdt INTEGER NOT NULL,
      line_total_bdt INTEGER NOT NULL
    );
  `
  console.log("✓ Created order_items table")

  // 8. Seed Categories
  console.log("Seeding categories...")
  const catRows = await sql`
    INSERT INTO categories (name, slug, sort_order) VALUES
      ('Signature Biriyani', 'signature-biriyani', 1),
      ('Tehari & Khichuri', 'tehari-khichuri', 2),
      ('Kebabs & Sides', 'kebabs-sides', 3),
      ('Beverages & Desserts', 'beverages-desserts', 4)
    RETURNING id, slug;
  `
  const catMap = Object.fromEntries(catRows.map((c) => [c.slug, c.id]))
  console.log("✓ Categories seeded:", catMap)

  // 9. Seed Menu Items
  console.log("Seeding menu items...")
  const itemsToInsert = [
    // Saturday Specials
    {
      catSlug: "signature-biriyani",
      name: "Shahi Mutton Kacchi Biryani",
      description:
        "Slow-cooked marinated mutton layered with aromatic basmati rice, saffron, spiced potato and fried onions, dum-sealed in a copper handi.",
      basePrice: 480,
      imageUrl: img("photo-1589302168068-964664d93dc0"),
      portion: "1:1 Regular",
      spice: "Medium",
      rating: "4.9",
      isEveryday: false,
      schedule: { day: "SATURDAY", featured: true, specialPrice: 460 },
    },
    {
      catSlug: "tehari-khichuri",
      name: "Puran Dhaka Chicken Tehari",
      description:
        "Fragrant short-grain Chinigura rice tossed with tender baby chicken pieces, pure mustard oil and fiery green chillies.",
      basePrice: 320,
      imageUrl: img("photo-1563379091339-03b21ab4a4f8"),
      portion: "1:1 Regular",
      spice: "Spicy",
      rating: "4.8",
      isEveryday: false,
      schedule: { day: "SATURDAY", featured: false },
    },

    // Sunday Specials
    {
      catSlug: "tehari-khichuri",
      name: "Old Dhaka Special Beef Tehari",
      description:
        "Old Dhaka-style traditional tehari with succulent beef cubes, whole green chilies, and cold-pressed mustard oil aroma.",
      basePrice: 350,
      imageUrl: img("photo-1697155406055-2db32d47ca07"),
      portion: "1:1 Regular",
      spice: "Spicy",
      rating: "4.9",
      isEveryday: false,
      schedule: { day: "SUNDAY", featured: true, specialPrice: 330 },
    },
    {
      catSlug: "signature-biriyani",
      name: "Dum Chicken Kacchi",
      description:
        "Dum-cooked chicken marinated in yogurt, secret shahi garam masala, layered with saffron basmati and caramelized beresta.",
      basePrice: 380,
      imageUrl: img("photo-1631515243349-e0cb75fb8d3a"),
      portion: "1:1 Regular",
      spice: "Medium",
      rating: "4.8",
      isEveryday: false,
      schedule: { day: "SUNDAY", featured: false },
    },

    // Monday Specials
    {
      catSlug: "signature-biriyani",
      name: "Shahi Dum Murgh Biryani",
      description:
        "Tender chicken marinated overnight in nut paste & royal spices, slow dum-cooked with fragrant aged long-grain basmati.",
      basePrice: 370,
      imageUrl: img("photo-1563379091339-03b21ab4a4f8"),
      portion: "1:1 Regular",
      spice: "Mild",
      rating: "4.8",
      isEveryday: false,
      schedule: { day: "MONDAY", featured: true },
    },
    {
      catSlug: "signature-biriyani",
      name: "Mutton Kacchi with Rezala Gravy",
      description:
        "Fragrant mutton kacchi platter accompanied by a rich cashew-poppy seed rezala gravy and a boiled egg.",
      basePrice: 520,
      imageUrl: img("photo-1589302168068-964664d93dc0"),
      portion: "1:1 Special",
      spice: "Medium",
      rating: "4.9",
      isEveryday: false,
      schedule: { day: "MONDAY", featured: false },
    },

    // Tuesday Specials
    {
      catSlug: "tehari-khichuri",
      name: "Traditional Beef Bhuna Khichuri",
      description:
        "Roasted moong dal and chinigura rice cooked to aromatic perfection, tossed with slow-fried tender beef bhuna.",
      basePrice: 360,
      imageUrl: img("photo-1620894580123-466ad3a0ca06"),
      portion: "1:1 Regular",
      spice: "Medium",
      rating: "4.9",
      isEveryday: false,
      schedule: { day: "TUESDAY", featured: true, specialPrice: 340 },
    },
    {
      catSlug: "tehari-khichuri",
      name: "Shahi Chicken Roast Khichuri",
      description:
        "Ghee-infused yellow khichuri served with a rich, mildly sweet wedding-style chicken roast leg piece.",
      basePrice: 340,
      imageUrl: img("photo-1532636875304-0c89119d9b4d"),
      portion: "1:1 Regular",
      spice: "Medium",
      rating: "4.7",
      isEveryday: false,
      schedule: { day: "TUESDAY", featured: false },
    },

    // Wednesday Specials
    {
      catSlug: "signature-biriyani",
      name: "Dhakaiya Shahi Morog Polao",
      description:
        "Heritage Old Dhaka recipe: Whole chicken quarter slow-braised in ghee, yogurt, and mace, folded into fragrant beresta polao.",
      basePrice: 390,
      imageUrl: img("photo-1631515243349-e0cb75fb8d3a"),
      portion: "1:1 Regular",
      spice: "Mild",
      rating: "4.9",
      isEveryday: false,
      schedule: { day: "WEDNESDAY", featured: true },
    },
    {
      catSlug: "tehari-khichuri",
      name: "Royal Mutton Tehari",
      description:
        "Tender baby mutton cubes tossed in cold-pressed mustard oil, green chillies, and aromatic Kalijira rice.",
      basePrice: 440,
      imageUrl: img("photo-1697155406055-2db32d47ca07"),
      portion: "1:1 Regular",
      spice: "Spicy",
      rating: "4.8",
      isEveryday: false,
      schedule: { day: "WEDNESDAY", featured: false },
    },

    // Thursday Specials
    {
      catSlug: "signature-biriyani",
      name: "Hyderabadi Shahi Mutton Dum Biryani",
      description:
        "Extra aromatic dum-cooked basmati biryani with tender mutton, caramelized shallots, mint, and saffron milk.",
      basePrice: 490,
      imageUrl: img("photo-1589302168068-964664d93dc0"),
      portion: "1:1 Regular",
      spice: "Spicy",
      rating: "4.9",
      isEveryday: false,
      schedule: { day: "THURSDAY", featured: true },
    },
    {
      catSlug: "signature-biriyani",
      name: "Biye Bari Chicken Roast & Polao",
      description:
        "Authentic Bangladeshi wedding roast with sweet-tangy thick gravy, served with aromatic ghee chinigura polao.",
      basePrice: 380,
      imageUrl: img("photo-1532636875304-0c89119d9b4d"),
      portion: "1:1 Regular",
      spice: "Mild",
      rating: "4.8",
      isEveryday: false,
      schedule: { day: "THURSDAY", featured: false },
    },

    // Friday Specials
    {
      catSlug: "signature-biriyani",
      name: "Royal Jumma Special Grand Kacchi",
      description:
        "Friday signature: Double piece mutton kacchi with saffron potato, boiled egg, served alongside a jali kabab and fresh salad.",
      basePrice: 550,
      imageUrl: img("photo-1589302168068-964664d93dc0"),
      portion: "1:1 Grand Feast",
      spice: "Medium",
      rating: "5.0",
      isEveryday: false,
      schedule: { day: "FRIDAY", featured: true, specialPrice: 530 },
    },
    {
      catSlug: "signature-biriyani",
      name: "Kolkata Style Chicken Biryani with Aloo",
      description:
        "Long-grain basmati cooked with mild spices, meetha attar, spiced succulent chicken, boiled egg, and melt-in-mouth aloo.",
      basePrice: 420,
      imageUrl: img("photo-1563379091339-03b21ab4a4f8"),
      portion: "1:1 Regular",
      spice: "Mild",
      rating: "4.8",
      isEveryday: false,
      schedule: { day: "FRIDAY", featured: false },
    },

    // Everyday Items (Borhani, Firni, Kabab, Roast, etc.)
    {
      catSlug: "beverages-desserts",
      name: "Special Traditional Borhani (500ml)",
      description:
        "Creamy spiced sour curd beverage whisked with mint, coriander, roasted cumin, black salt and mustard paste.",
      basePrice: 90,
      imageUrl: img("photo-1692620609860-be6717812f71"),
      portion: "500ml Bottle",
      spice: "Medium",
      rating: "5.0",
      isEveryday: true,
    },
    {
      catSlug: "beverages-desserts",
      name: "Royal Zafrani Badam Sharbat (350ml)",
      description:
        "Rich milk cooler infused with Kashmiri saffron strands, crushed pistachios, cardamom and basil seeds.",
      basePrice: 120,
      imageUrl: img("photo-1513558161293-cdaf765ed2fd"),
      portion: "350ml Bottle",
      spice: "Sweet",
      rating: "4.9",
      isEveryday: true,
    },
    {
      catSlug: "kebabs-sides",
      name: "Crispy Shahi Jali Kabab (2 pcs)",
      description:
        "Minced beef blended with secret herbs, pan-fried with an ethereal golden egg net web. Served with mint-onion relish.",
      basePrice: 110,
      imageUrl: img("photo-1603360946369-dc9bb6258143"),
      portion: "2 Pcs",
      spice: "Medium",
      rating: "4.9",
      isEveryday: true,
    },
    {
      catSlug: "kebabs-sides",
      name: "Shahi Biye Bari Chicken Roast",
      description:
        "Golden chicken quarter braised in pure ghee, caramelized onion paste, evaporated milk, and whole fragrant spices.",
      basePrice: 190,
      imageUrl: img("photo-1532636875304-0c89119d9b4d"),
      portion: "1 Pc Quarter",
      spice: "Mild",
      rating: "4.8",
      isEveryday: true,
    },
    {
      catSlug: "beverages-desserts",
      name: "Shahi Badami Firni Cup",
      description:
        "Silky ground chinigura rice pudding cooked in thickened milk, cardamom, rose water, and topped with silver leaf & pistachios.",
      basePrice: 80,
      imageUrl: img("photo-1705174299330-939dd03cc864"),
      portion: "1 Clay Cup",
      spice: "Sweet",
      rating: "4.9",
      isEveryday: true,
    },
    {
      catSlug: "beverages-desserts",
      name: "Biye Bari Shahi Jorda with Sweets",
      description:
        "Traditional sweet saffron rice garnished with miniature gulab jamun, murabba, khoya, and sliced toasted almonds.",
      basePrice: 100,
      imageUrl: img("photo-1589778655375-3e622a9fc91c"),
      portion: "1 Cup",
      spice: "Sweet",
      rating: "4.8",
      isEveryday: true,
    },
  ]

  for (const item of itemsToInsert) {
    const categoryId = catMap[item.catSlug]
    const inserted = await sql`
      INSERT INTO menu_items (
        category_id, name, description, base_price_bdt, image_url,
        portion_size, spice_level, rating, is_everyday, is_available
      ) VALUES (
        ${categoryId}, ${item.name}, ${item.description}, ${item.basePrice},
        ${item.imageUrl}, ${item.portion}, ${item.spice}, ${item.rating},
        ${item.isEveryday}, true
      )
      RETURNING id;
    `
    const itemId = inserted[0].id

    // Insert schedule mapping if present
    if (item.schedule) {
      await sql`
        INSERT INTO daily_menu_schedules (
          menu_item_id, day_of_week, special_price_bdt, daily_quota, is_featured
        ) VALUES (
          ${itemId}, ${item.schedule.day}, ${item.schedule.specialPrice || null},
          100, ${item.schedule.featured || false}
        );
      `
    }
  }

  console.log(
    `✓ Seeded ${itemsToInsert.length} menu items and schedule mappings`,
  )

  // 10. Seed Sample Order
  const orderRes = await sql`
    INSERT INTO orders (
      order_number, customer_name, customer_phone, customer_address,
      scheduled_day, delivery_slot, payment_method, subtotal_bdt, delivery_fee_bdt, total_bdt, status, notes
    ) VALUES (
      'BB-20261028-1042', 'Zahid Hassan', '+8801711223344', 'House 24, Road 7, Dhanmondi, Dhaka',
      'SATURDAY', 'ASAP (45-60 mins)', 'COD', 570, 60, 630, 'CONFIRMED', 'Extra salad please'
    )
    RETURNING id;
  `
  const orderId = orderRes[0].id

  // Insert Order Items
  await sql`
    INSERT INTO order_items (
      order_id, menu_item_id, scheduled_day, item_name_snapshot, quantity, unit_price_bdt, line_total_bdt
    ) VALUES 
      (${orderId}, 1, 'SATURDAY', 'Shahi Mutton Kacchi Biryani', 1, 480, 480),
      (${orderId}, 15, 'SATURDAY', 'Special Traditional Borhani (500ml)', 1, 90, 90);
  `
  console.log("✓ Seeded sample order BB-20261028-1042")

  console.log("--- Banglar Biriyani Exact Schema Setup Complete! ---")
}

if (process.argv[1]?.endsWith("setup-exact-schema.js")) {
  setupExactSchema()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Setup failed:", err)
      process.exit(1)
    })
}
