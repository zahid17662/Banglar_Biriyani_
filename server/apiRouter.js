import express from "express"
import { client, checkDbConnection } from "./db.ts"

export const apiRouter = express.Router()
apiRouter.use(express.json())

// Helper: normalize day string to DayOfWeek enum uppercase
function normalizeDay(day) {
  if (!day) return "SATURDAY"
  const upper = day.toUpperCase().trim()
  const valid = ["SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
  return valid.includes(upper) ? upper : "SATURDAY"
}

// 1. Health check & database connection status
apiRouter.get("/health", async (req, res) => {
  try {
    const status = await checkDbConnection()
    res.json(status)
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// 2. GET /api/menu (Optional ?day=SATURDAY)
// Purpose: Fetches full 7-day menu grouped by day (SATURDAY .. FRIDAY) for instant tab switching
apiRouter.get("/menu", async (req, res) => {
  try {
    if (!client) return res.status(500).json({ error: "Database not configured" })

    const targetDay = req.query.day ? normalizeDay(req.query.day) : null

    // Fetch categories
    const categories = await client`
      SELECT id, name, slug, sort_order as "sortOrder"
      FROM categories
      ORDER BY sort_order ASC
    `

    // Fetch all menu items with category info and schedule mappings
    const rawItems = await client`
      SELECT 
        m.id,
        m.category_id as "categoryId",
        c.name as "categoryName",
        c.slug as "categorySlug",
        m.name,
        m.description,
        m.base_price_bdt as "basePriceBdt",
        m.image_url as "imageUrl",
        m.portion_size as "portionSize",
        m.spice_level as "spiceLevel",
        m.rating,
        m.is_everyday as "isEveryday",
        m.is_available as "isAvailable",
        m.created_at as "createdAt",
        COALESCE(
          json_agg(
            json_build_object(
              'dayOfWeek', s.day_of_week,
              'specialPriceBdt', s.special_price_bdt,
              'isFeatured', s.is_featured,
              'dailyQuota', s.daily_quota
            )
          ) FILTER (WHERE s.day_of_week IS NOT NULL),
          '[]'::json
        ) as schedules
      FROM menu_items m
      JOIN categories c ON m.category_id = c.id
      LEFT JOIN daily_menu_schedules s ON m.id = s.menu_item_id
      WHERE m.is_available = true
      GROUP BY m.id, c.id
      ORDER BY m.is_everyday ASC, m.id ASC
    `

    // Format items with computed effective price & schedule days
    const items = rawItems.map((item) => {
      const scheduleDays = (item.schedules || []).map((s) => s.dayOfWeek)
      const isFeatured = (item.schedules || []).some((s) => s.isFeatured)
      return {
        id: item.id,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        categorySlug: item.categorySlug,
        name: item.name,
        description: item.description,
        basePriceBdt: item.basePriceBdt,
        price: item.basePriceBdt, // Compatibility alias
        imageUrl: item.imageUrl,
        image: item.imageUrl, // Compatibility alias
        portionSize: item.portionSize,
        portion: item.portionSize, // Compatibility alias
        spiceLevel: item.spiceLevel,
        rating: item.rating,
        isEveryday: item.isEveryday,
        isAvailable: item.isAvailable,
        availableDays: scheduleDays,
        isFeatured,
        schedules: item.schedules,
      }
    })

    const currentDay = targetDay || "SATURDAY"

    // If day was requested, filter items scheduled for that day + everyday items
    const filteredItems = targetDay
      ? items.filter((i) => i.isEveryday || i.availableDays.includes(targetDay))
      : items

    res.json({
      day: currentDay,
      items: filteredItems,
      categories,
    })
  } catch (error) {
    console.error("Error fetching menu:", error)
    res.status(500).json({ error: error.message })
  }
})

// 3. GET /api/menu/:day
// Purpose: Fetches items scheduled for :day (SATURDAY - FRIDAY) plus isEveryday: true items
apiRouter.get("/menu/:day", async (req, res) => {
  try {
    if (!client) return res.status(500).json({ error: "Database not configured" })

    const dayUpper = normalizeDay(req.params.day)

    const items = await client`
      SELECT 
        m.id,
        m.category_id as "categoryId",
        c.name as "categoryName",
        c.slug as "categorySlug",
        m.name,
        m.description,
        COALESCE(s.special_price_bdt, m.base_price_bdt) as "effectivePriceBdt",
        m.base_price_bdt as "basePriceBdt",
        m.image_url as "imageUrl",
        m.portion_size as "portionSize",
        m.spice_level as "spiceLevel",
        m.rating,
        m.is_everyday as "isEveryday",
        m.is_available as "isAvailable",
        COALESCE(s.is_featured, false) as "isFeatured",
        s.day_of_week as "dayOfWeek"
      FROM menu_items m
      JOIN categories c ON m.category_id = c.id
      LEFT JOIN daily_menu_schedules s ON m.id = s.menu_item_id AND s.day_of_week = ${dayUpper}::day_of_week
      WHERE m.is_available = true 
        AND (m.is_everyday = true OR s.day_of_week = ${dayUpper}::day_of_week)
      ORDER BY m.is_everyday ASC, s.is_featured DESC, m.id ASC
    `

    const formatted = items.map((i) => ({
      id: i.id,
      categoryId: i.categoryId,
      categoryName: i.categoryName,
      name: i.name,
      description: i.description,
      basePriceBdt: i.basePriceBdt,
      effectivePriceBdt: i.effectivePriceBdt,
      price: i.effectivePriceBdt,
      imageUrl: i.imageUrl,
      image: i.imageUrl,
      portionSize: i.portionSize,
      spiceLevel: i.spiceLevel,
      rating: i.rating,
      isEveryday: i.isEveryday,
      isFeatured: i.isFeatured,
      scheduledDay: dayUpper,
    }))

    res.json({
      day: dayUpper,
      items: formatted,
    })
  } catch (error) {
    console.error("Error fetching daily menu:", error)
    res.status(500).json({ error: error.message })
  }
})

// In-memory rate limiting map for orders (max 10 orders per IP per 15 minutes)
const orderRateLimitMap = new Map()
function expressOrderRateLimiter(req, res, next) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1"
  const now = Date.now()
  const windowMs = 15 * 60 * 1000
  const max = 10

  let record = orderRateLimitMap.get(ip)
  if (!record || now - record.firstRequestTime > windowMs) {
    record = { count: 1, firstRequestTime: now }
    orderRateLimitMap.set(ip, record)
  } else {
    record.count += 1
  }

  if (record.count > max) {
    const retryAfterSeconds = Math.ceil((record.firstRequestTime + windowMs - now) / 1000)
    res.setHeader("Retry-After", retryAfterSeconds.toString())
    return res.status(429).json({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many order submissions. Maximum 10 orders per 15 minutes per IP.",
        details: { retryAfterSeconds },
      },
    })
  }
  next()
}

function sanitizeInputString(val) {
  if (typeof val !== "string") return ""
  return val
    .replace(/\0/g, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim()
}

// 4. POST /api/orders
// Purpose: Validates item IDs & server-side prices, inserts into orders and order_items
apiRouter.post("/orders", expressOrderRateLimiter, async (req, res) => {
  try {
    if (!client) return res.status(500).json({ error: "Database not configured" })

    const {
      customerName,
      customerPhone,
      customerAddress,
      scheduledDay = "SATURDAY",
      deliverySlot = "ASAP (45-60 mins)",
      paymentMethod = "COD",
      notes = "",
      items,
    } = req.body

    const cleanCustomerName = sanitizeInputString(customerName)
    const cleanCustomerAddress = sanitizeInputString(customerAddress)
    const cleanNotes = notes ? sanitizeInputString(notes) : ""

    // Field Validation
    if (!cleanCustomerName || !customerPhone || !cleanCustomerAddress) {
      return res.status(400).json({
        error: "Customer name, phone, and delivery address are required.",
      })
    }

    if (cleanCustomerName.length < 2) {
      return res.status(400).json({ error: "Customer name must be at least 2 characters." })
    }

    if (cleanCustomerAddress.length < 5) {
      return res.status(400).json({ error: "Customer address must be at least 5 characters." })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order must contain at least one item." })
    }

    // Phone validation (+8801XXXXXXXXX or 01XXXXXXXXX)
    const phoneRegex = /^(?:\+8801|01)[3-9]\d{8}$/
    const cleanPhone = customerPhone.replace(/[\s-]/g, "")
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        error:
          "Please enter a valid Bangladeshi phone number (e.g., 01711223344 or +8801711223344).",
      })
    }

    // Normalize Enums
    const validDay = normalizeDay(scheduledDay)
    const validPayment = ["COD", "BKASH", "NAGAD"].includes((paymentMethod || "").toUpperCase())
      ? paymentMethod.toUpperCase()
      : "COD"

    // Server-Side Price Verification against Neon DB
    const itemIds = items.map((i) => parseInt(i.menuItemId || i.id, 10)).filter(Boolean)
    if (itemIds.length === 0) {
      return res.status(400).json({ error: "Invalid items provided." })
    }

    const dbItems = await client`
      SELECT 
        m.id, 
        m.name, 
        m.base_price_bdt as "basePriceBdt", 
        COALESCE(s.special_price_bdt, m.base_price_bdt) as "effectivePriceBdt",
        m.is_available as "isAvailable"
      FROM menu_items m
      LEFT JOIN daily_menu_schedules s ON m.id = s.menu_item_id AND s.day_of_week = ${validDay}::day_of_week
      WHERE m.id = ANY(${itemIds})
    `

    const dbMap = new Map(dbItems.map((dbI) => [dbI.id, dbI]))

    let calculatedSubtotal = 0
    const verifiedOrderItems = []

    for (const item of items) {
      const id = parseInt(item.menuItemId || item.id, 10)
      const matched = dbMap.get(id)

      if (!matched) {
        return res.status(400).json({ error: `Menu item #${id} does not exist.` })
      }
      if (!matched.isAvailable) {
        return res.status(400).json({ error: `Dish "${matched.name}" is currently sold out.` })
      }

      const qty = Math.max(1, parseInt(item.quantity || 1, 10))
      const unitPrice = matched.effectivePriceBdt
      const lineTotal = unitPrice * qty
      calculatedSubtotal += lineTotal

      verifiedOrderItems.push({
        menuItemId: matched.id,
        itemNameSnapshot: matched.name,
        quantity: qty,
        unitPriceBdt: unitPrice,
        lineTotalBdt: lineTotal,
      })
    }

    const deliveryFeeBdt = 60
    const totalBdt = calculatedSubtotal + deliveryFeeBdt

    // Unique Order Number (e.g. BB-20261028-1042)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const randCode = Math.floor(1000 + Math.random() * 9000)
    const orderNumber = `BB-${dateStr}-${randCode}`

    // Single Database Transaction in Neon PostgreSQL
    const insertedOrder = await client`
      INSERT INTO orders (
        order_number, customer_name, customer_phone, customer_address,
        scheduled_day, delivery_slot, payment_method, subtotal_bdt, delivery_fee_bdt,
        total_bdt, status, notes
      ) VALUES (
        ${orderNumber}, ${cleanCustomerName}, ${cleanPhone}, ${cleanCustomerAddress},
        ${validDay}::day_of_week, ${deliverySlot}, ${validPayment}::payment_method,
        ${calculatedSubtotal}, ${deliveryFeeBdt}, ${totalBdt}, 'PENDING'::order_status, ${cleanNotes}
      )
      RETURNING id, order_number, total_bdt, status, created_at;
    `

    const orderId = insertedOrder[0].id

    for (const oi of verifiedOrderItems) {
      await client`
        INSERT INTO order_items (
          order_id, menu_item_id, scheduled_day, item_name_snapshot,
          quantity, unit_price_bdt, line_total_bdt
        ) VALUES (
          ${orderId}, ${oi.menuItemId}, ${validDay}::day_of_week, ${oi.itemNameSnapshot},
          ${oi.quantity}, ${oi.unitPriceBdt}, ${oi.lineTotalBdt}
        );
      `
    }

    res.status(201).json({
      success: true,
      orderNumber,
      customerName: cleanCustomerName,
      customerPhone: cleanPhone,
      customerAddress: cleanCustomerAddress,
      scheduledDay: validDay,
      deliverySlot,
      paymentMethod: validPayment,
      subtotalBdt: calculatedSubtotal,
      deliveryFeeBdt,
      totalBdt,
      status: "PENDING",
      createdAt: insertedOrder[0].created_at,
      items: verifiedOrderItems,
    })
  } catch (error) {
    console.error("Error creating order:", error)
    res.status(500).json({ error: error.message })
  }
})

// 5. GET /api/orders/:orderNumber
// Purpose: Allows customer to check order status by order number
apiRouter.get("/orders/:orderNumber", async (req, res) => {
  try {
    if (!client) return res.status(500).json({ error: "Database not configured" })

    const { orderNumber } = req.params

    const orderRows = await client`
      SELECT 
        id,
        order_number as "orderNumber",
        customer_name as "customerName",
        customer_phone as "customerPhone",
        customer_address as "customerAddress",
        scheduled_day as "scheduledDay",
        delivery_slot as "deliverySlot",
        payment_method as "paymentMethod",
        subtotal_bdt as "subtotalBdt",
        delivery_fee_bdt as "deliveryFeeBdt",
        total_bdt as "totalBdt",
        status,
        notes,
        created_at as "createdAt"
      FROM orders
      WHERE order_number = ${orderNumber}
      LIMIT 1;
    `

    if (!orderRows.length) {
      return res.status(404).json({ error: `Order #${orderNumber} not found.` })
    }

    const order = orderRows[0]

    const items = await client`
      SELECT 
        id,
        menu_item_id as "menuItemId",
        scheduled_day as "scheduledDay",
        item_name_snapshot as "name",
        quantity,
        unit_price_bdt as "price",
        line_total_bdt as "lineTotal"
      FROM order_items
      WHERE order_id = ${order.id}
      ORDER BY id ASC;
    `

    res.json({
      order,
      items,
    })
  } catch (error) {
    console.error("Error fetching order by orderNumber:", error)
    res.status(500).json({ error: error.message })
  }
})

// 6. GET /api/orders (Recent orders list for modal / viewer)
apiRouter.get("/orders", async (req, res) => {
  try {
    if (!client) return res.status(500).json({ error: "Database not configured" })

    const orderList = await client`
      SELECT 
        o.id,
        o.order_number as "orderNumber",
        o.customer_name as "customerName",
        o.customer_phone as "customerPhone",
        o.customer_address as "customerAddress",
        o.scheduled_day as "scheduledDay",
        o.delivery_slot as "deliverySlot",
        o.payment_method as "paymentMethod",
        o.subtotal_bdt as "subtotalBdt",
        o.delivery_fee_bdt as "deliveryFeeBdt",
        o.total_bdt as "totalBdt",
        o.status,
        o.notes,
        o.created_at as "createdAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'menuItemId', oi.menu_item_id,
              'name', oi.item_name_snapshot,
              'quantity', oi.quantity,
              'unitPriceBdt', oi.unit_price_bdt,
              'price', oi.unit_price_bdt,
              'lineTotalBdt', oi.line_total_bdt
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 50;
    `

    res.json(orderList)
  } catch (error) {
    console.error("Error fetching orders list:", error)
    res.status(500).json({ error: error.message })
  }
})

// 7. PATCH /api/orders/:id (Update order status)
apiRouter.patch("/orders/:id", async (req, res) => {
  try {
    if (!client) return res.status(500).json({ error: "Database not configured" })
    const { id } = req.params
    const { status } = req.body

    const validStatus = [
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ].includes((status || "").toUpperCase())
      ? status.toUpperCase()
      : "CONFIRMED"

    const result = await client`
      UPDATE orders
      SET status = ${validStatus}::order_status
      WHERE id = ${parseInt(id, 10)} OR order_number = ${id}
      RETURNING *;
    `

    if (!result.length) {
      return res.status(404).json({ error: "Order not found" })
    }

    res.json(result[0])
  } catch (error) {
    console.error("Error updating order:", error)
    res.status(500).json({ error: error.message })
  }
})
