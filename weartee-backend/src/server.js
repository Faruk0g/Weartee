const http = require("http");
const { URL } = require("url");
const crypto = require("crypto");
const { notifyOrder } = require("./mail");
const {
  readDb,
  writeDb,
  hashPassword,
  verifyPassword,
  signToken,
  readToken,
  nextOrderId,
  STATUS_FLOW,
} = require("./store");

const PORT = Number(process.env.PORT) || 5050;

const IS_PROD =
  process.env.NODE_ENV === "production" || process.env.RENDER === "true";
const ADMIN_KEY = process.env.ADMIN_KEY || (IS_PROD ? "" : "weartee");
if (IS_PROD && ADMIN_KEY.length < 12) {
  throw new Error("Set ADMIN_KEY (12+ characters) in the environment");
}

function isAdmin(req) {
  const given = Buffer.from(String(req.headers["x-admin-key"] || ""));
  const real = Buffer.from(ADMIN_KEY);
  return given.length === real.length && crypto.timingSafeEqual(given, real);
}

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    address: u.address,
    city: u.city,
    state: u.state,
  };
}

function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, x-admin-key, x-cart-id",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function authUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = readToken(token);
  if (!payload || !payload.uid) return null;
  const db = readDb();
  return db.users.find((u) => u.id === payload.uid) || null;
}

function shippingForState(meta, stateName) {
  const subKey = String(stateName || "").trim();
  const map = meta.shippingByState || {};
  if (subKey && map[subKey] != null) return Number(map[subKey]) || 0;
  return Number(meta.defaultShippingFee || meta.shippingFee || 4000);
}

function pricing(items, meta, stateName) {
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  let shippingFee = 0;
  if (subtotal > 0 && subtotal < (meta.freeShippingThreshold || 50000)) {
    shippingFee = shippingForState(meta, stateName);
  }
  return { subtotal, shippingFee, total: subtotal + shippingFee };
}

function sanitizeItems(rawItems, products) {
  if (!Array.isArray(rawItems) || !rawItems.length)
    return { error: "Cart is empty" };
  const items = [];
  for (const line of rawItems) {
    const product = products.find((p) => p.id === line.id);
    if (!product) return { error: `Unknown product: ${line.id}` };
    const qty = Math.max(1, Math.min(99, Number(line.qty) || 1));
    const size = product.sizes.includes(line.size)
      ? line.size
      : product.sizes[0];
    const color = product.colors.includes(line.color)
      ? line.color
      : product.colors[0];
    items.push({
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      category: product.category,
      size,
      color,
      qty,
    });
  }
  return { items };
}

function resolveCartKey(req, url) {
  const user = authUser(req);
  if (user) return "user:" + user.id;
  const fromHeader = String(req.headers["x-cart-id"] || "").trim();
  const fromQuery = String(url.searchParams.get("cartId") || "").trim();
  const id = fromHeader || fromQuery;
  if (id && /^[a-zA-Z0-9_-]{8,64}$/.test(id)) return "guest:" + id;
  return null;
}

function normalizeCartItems(rawItems, products) {
  if (!Array.isArray(rawItems)) return { error: "Items must be an array" };
  const items = [];
  for (const line of rawItems) {
    const product = products.find((p) => p.id === line.id);
    if (!product) continue;
    const qty = Math.max(1, Math.min(99, Number(line.qty) || 1));
    const size = product.sizes.includes(line.size)
      ? line.size
      : product.sizes[0];
    const color = product.colors.includes(line.color)
      ? line.color
      : product.colors[0];
    const existing = items.find(
      (i) => i.id === product.id && i.size === size && i.color === color,
    );
    if (existing) {
      existing.qty = Math.min(99, existing.qty + qty);
    } else {
      items.push({
        id: product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        category: product.category,
        size,
        color,
        qty,
      });
    }
  }
  return { items };
}

async function handle(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, x-admin-key, x-cart-id",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;
  const method = req.method;

  try {
    if (method === "GET" && path === "/api/health") {
      return send(res, 200, {
        ok: true,
        service: "weartee",
        time: new Date().toISOString(),
      });
    }

    if (method === "GET" && path === "/api/shipping") {
      const db = readDb();
      const stateName = url.searchParams.get("state") || "";
      const subtotal = Number(url.searchParams.get("subtotal") || 0);
      const fee =
        subtotal <= 0
          ? 0
          : subtotal >= (db.meta.freeShippingThreshold || 50000)
            ? 0
            : shippingForState(db.meta, stateName);
      return send(res, 200, {
        state: stateName,
        subtotal,
        shippingFee: fee,
        freeShippingThreshold: db.meta.freeShippingThreshold || 50000,
        shippingByState: db.meta.shippingByState || {},
      });
    }

    if (method === "GET" && path === "/api/meta") {
      const db = readDb();
      return send(res, 200, { ...db.meta, statusFlow: STATUS_FLOW });
    }

    if (method === "GET" && path === "/api/products") {
      const db = readDb();
      let list = db.products.slice();
      const categories = url.searchParams.getAll("category").filter(Boolean);
      if (categories.length)
        list = list.filter((p) => categories.includes(p.category));
      const search = url.searchParams.get("search");
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(
          (p) => p.name.toLowerCase().includes(q) || p.category.includes(q),
        );
      }
      return send(res, 200, { products: list });
    }

    if (method === "GET" && path.startsWith("/api/products/")) {
      const id = decodeURIComponent(path.slice("/api/products/".length));
      const db = readDb();
      const product = db.products.find((p) => p.id === id);
      if (!product) return send(res, 404, { error: "Product not found" });
      return send(res, 200, { product });
    }

    if (method === "POST" && path === "/api/auth/register") {
      const body = await readBody(req);
      const cleanEmail = String(body.email || "")
        .trim()
        .toLowerCase();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return send(res, 400, { error: "Valid email required" });
      }
      if (!body.password || String(body.password).length < 6) {
        return send(res, 400, {
          error: "Password must be at least 6 characters",
        });
      }
      const db = readDb();
      if (db.users.some((u) => u.email === cleanEmail)) {
        return send(res, 409, {
          error: "An account with that email already exists",
        });
      }
      const user = {
        id: crypto.randomUUID(),
        name: String(body.name || "").trim(),
        email: cleanEmail,
        phone: String(body.phone || "").trim(),
        address: String(body.address || "").trim(),
        city: String(body.city || "").trim(),
        state: String(body.state || "").trim(),
        passwordHash: hashPassword(String(body.password)),
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);
      writeDb(db);
      return send(res, 201, {
        token: signToken({ uid: user.id }),
        user: publicUser(user),
      });
    }

    if (method === "POST" && path === "/api/auth/login") {
      const body = await readBody(req);
      const cleanEmail = String(body.email || "")
        .trim()
        .toLowerCase();
      const password = String(body.password || "");
      const db = readDb();
      const user = db.users.find((u) => u.email === cleanEmail);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return send(res, 401, { error: "Invalid email or password" });
      }
      return send(res, 200, {
        token: signToken({ uid: user.id }),
        user: publicUser(user),
      });
    }

    if (method === "GET" && path === "/api/me") {
      const user = authUser(req);
      if (!user) return send(res, 401, { error: "Sign in required" });
      return send(res, 200, { user: publicUser(user) });
    }

    if (method === "PUT" && path === "/api/me") {
      const user = authUser(req);
      if (!user) return send(res, 401, { error: "Sign in required" });
      const body = await readBody(req);
      const db = readDb();
      const row = db.users.find((u) => u.id === user.id);
      for (const key of ["name", "phone", "address", "city", "state"]) {
        if (body[key] !== undefined) row[key] = String(body[key] || "").trim();
      }
      if (body.email) {
        const email = String(body.email).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return send(res, 400, { error: "Valid email required" });
        }
        if (db.users.some((u) => u.email === email && u.id !== row.id)) {
          return send(res, 409, { error: "Email already in use" });
        }
        row.email = email;
      }
      writeDb(db);
      return send(res, 200, { user: publicUser(row) });
    }

    if (method === "POST" && path === "/api/orders") {
      const body = await readBody(req);
      const db = readDb();
      const user = authUser(req);
      const shipping = body.shipping || {};
      const name = String(shipping.name || user?.name || "").trim();
      const email = String(shipping.email || user?.email || "")
        .trim()
        .toLowerCase();
      const phone = String(shipping.phone || user?.phone || "").trim();
      const address = String(shipping.address || "").trim();
      const city = String(shipping.city || "").trim();
      const state = String(shipping.state || "").trim();

      if (name.length < 2)
        return send(res, 400, { error: "Full name required" });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return send(res, 400, { error: "Valid email required" });
      }
      if (phone.length < 7) return send(res, 400, { error: "Phone required" });
      if (address.length < 4 || city.length < 2 || !state) {
        return send(res, 400, { error: "Complete shipping address required" });
      }

      const payment = ["Card", "Bank Transfer", "Pay on Delivery"].includes(
        body.payment,
      )
        ? body.payment
        : "Pay on Delivery";

      const packed = sanitizeItems(body.items, db.products);
      if (packed.error) return send(res, 400, { error: packed.error });

      const money = pricing(packed.items, db.meta, state);
      const order = {
        id: nextOrderId(db),
        date: new Date().toISOString(),
        status: "Confirmed",
        userId: user?.id || null,
        items: packed.items,
        shipping: {
          name,
          email,
          phone,
          address,
          city,
          state,
          note: String(shipping.note || "").slice(0, 400),
        },
        payment,
        subtotal: money.subtotal,
        shippingFee: money.shippingFee,
        total: money.total,
      };

      db.orders.unshift(order);
      if (user) {
        const u = db.users.find((x) => x.id === user.id);
        u.name = name;
        u.email = email;
        u.phone = phone;
        u.address = address;
        u.city = city;
        u.state = state;
      }
      writeDb(db);
      return send(res, 201, { order });
    }

    if (method === "GET" && path === "/api/orders") {
      const db = readDb();
      const user = authUser(req);
      const email = String(url.searchParams.get("email") || user?.email || "")
        .trim()
        .toLowerCase();
      if (!user && !email)
        return send(res, 400, { error: "Email or sign-in required" });
      const list = db.orders.filter(
        (o) => (user && o.userId === user.id) || o.shipping.email === email,
      );
      return send(res, 200, { orders: list });
    }

    if (method === "GET" && path.startsWith("/api/orders/")) {
      const id = decodeURIComponent(path.slice("/api/orders/".length));
      const db = readDb();
      const order = db.orders.find((o) => o.id === id);
      if (!order) return send(res, 404, { error: "Order not found" });
      return send(res, 200, { order });
    }

    if (method === "GET" && path === "/api/admin/orders") {
      if (!isAdmin(req)) {
        return send(res, 401, { error: "Admin key required" });
      }
      const db = readDb();
      return send(res, 200, { orders: db.orders, statusFlow: STATUS_FLOW });
    }

    if (method === "GET" && path.startsWith("/api/admin/orders/")) {
      if (!isAdmin(req)) {
        return send(res, 401, { error: "Admin key required" });
      }
      const id = decodeURIComponent(path.slice("/api/admin/orders/".length));
      const db = readDb();
      const order = db.orders.find((o) => o.id === id);
      if (!order) return send(res, 404, { error: "Order not found" });
      return send(res, 200, { order });
    }

    if (
      method === "PATCH" &&
      path.startsWith("/api/admin/orders/") &&
      !path.endsWith("/notify")
    ) {
      if (!isAdmin(req)) {
        return send(res, 401, { error: "Admin key required" });
      }
      const id = decodeURIComponent(path.slice("/api/admin/orders/".length));
      const body = await readBody(req);
      const db = readDb();
      const order = db.orders.find((o) => o.id === id);
      if (!order) return send(res, 404, { error: "Order not found" });

      const prevStatus = order.status;
      if (body.status !== undefined) {
        const status = String(body.status || "");
        if (!STATUS_FLOW.includes(status)) {
          return send(res, 400, {
            error: `Status must be one of: ${STATUS_FLOW.join(", ")}`,
          });
        }
        order.status = status;
      }

      if (Array.isArray(body.items)) {
        const nextItems = [];
        for (const line of body.items) {
          const qty = Math.max(0, Math.min(99, Number(line.qty) || 0));
          if (qty <= 0) continue;
          const price = Math.max(0, Number(line.price) || 0);
          nextItems.push({
            id: line.id,
            name: line.name || line.id,
            image: line.image || "",
            price,
            category: line.category || "",
            size: line.size || "",
            color: line.color || "multi",
            qty,
          });
        }
        if (!nextItems.length) {
          return send(res, 400, { error: "Order must keep at least one item" });
        }
        order.items = nextItems;
        const money = pricing(order.items, db.meta);
        if (body.shippingFee !== undefined) {
          order.shippingFee = Math.max(0, Number(body.shippingFee) || 0);
          order.subtotal = money.subtotal;
          order.total = order.subtotal + order.shippingFee;
        } else {
          order.subtotal = money.subtotal;
          order.shippingFee = money.shippingFee;
          order.total = money.total;
        }
      } else if (body.shippingFee !== undefined) {
        order.shippingFee = Math.max(0, Number(body.shippingFee) || 0);
        order.total = (order.subtotal || 0) + order.shippingFee;
      }

      order.updatedAt = new Date().toISOString();
      writeDb(db);

      let emailResult = null;
      if (body.sendEmail) {
        emailResult = await notifyOrder(order, {
          status: order.status,
          message: body.emailMessage || "",
        });
      }

      return send(res, 200, {
        order,
        email: emailResult,
        statusChanged: prevStatus !== order.status,
      });
    }

    if (
      method === "POST" &&
      path.match(/^\/api\/admin\/orders\/[^/]+\/notify$/)
    ) {
      if (!isAdmin(req)) {
        return send(res, 401, { error: "Admin key required" });
      }
      const id = decodeURIComponent(path.split("/")[4]);
      const body = await readBody(req);
      const db = readDb();
      const order = db.orders.find((o) => o.id === id);
      if (!order) return send(res, 404, { error: "Order not found" });
      if (body.status && STATUS_FLOW.includes(String(body.status))) {
        order.status = String(body.status);
        order.updatedAt = new Date().toISOString();
        writeDb(db);
      }
      const emailResult = await notifyOrder(order, {
        status: order.status,
        message: body.message || body.emailMessage || "",
      });
      return send(res, 200, { order, email: emailResult });
    }

    if (method === "GET" && path === "/api/admin/products") {
      if (!isAdmin(req)) {
        return send(res, 401, { error: "Admin key required" });
      }
      const db = readDb();
      return send(res, 200, { products: db.products });
    }

    if (method === "PATCH" && path.startsWith("/api/admin/products/")) {
      if (!isAdmin(req)) {
        return send(res, 401, { error: "Admin key required" });
      }
      const id = decodeURIComponent(path.slice("/api/admin/products/".length));
      const body = await readBody(req);
      const db = readDb();
      const product = db.products.find((p) => p.id === id);
      if (!product) return send(res, 404, { error: "Product not found" });
      if (body.price !== undefined)
        product.price = Math.max(0, Number(body.price) || 0);
      if (body.name !== undefined)
        product.name = String(body.name).trim() || product.name;
      if (body.category !== undefined)
        product.category = String(body.category).trim() || product.category;
      writeDb(db);
      return send(res, 200, { product });
    }

    if (method === "GET" && path === "/api/cart") {
      const key = resolveCartKey(req, url);
      if (!key)
        return send(res, 400, {
          error: "Missing cart id (send x-cart-id header) or sign in",
        });
      const db = readDb();
      const items = (db.carts[key] && db.carts[key].items) || [];
      return send(res, 200, {
        cartId: key.startsWith("guest:") ? key.slice(6) : null,
        items,
      });
    }

    if (method === "PUT" && path === "/api/cart") {
      let key = resolveCartKey(req, url);
      const body = await readBody(req);
      if (!key) {
        const newId = crypto.randomBytes(12).toString("hex");
        key = "guest:" + newId;
      }
      const db = readDb();
      const packed = normalizeCartItems(body.items || [], db.products);
      if (packed.error) return send(res, 400, { error: packed.error });
      db.carts[key] = {
        items: packed.items,
        updatedAt: new Date().toISOString(),
      };
      writeDb(db);
      return send(res, 200, {
        cartId: key.startsWith("guest:") ? key.slice(6) : null,
        items: packed.items,
      });
    }

    if (method === "DELETE" && path === "/api/cart") {
      const key = resolveCartKey(req, url);
      if (!key) return send(res, 400, { error: "Missing cart id or sign in" });
      const db = readDb();
      db.carts[key] = { items: [], updatedAt: new Date().toISOString() };
      writeDb(db);
      return send(res, 200, {
        cartId: key.startsWith("guest:") ? key.slice(6) : null,
        items: [],
      });
    }

    // Serve frontend (shop + admin) from weartee-fixed when present
    if (method === "GET" && !path.startsWith("/api")) {
      const fs = require("fs");
      const pathMod = require("path");
      const FRONTEND_DIR =
        process.env.FRONTEND_DIR ||
        pathMod.join(__dirname, "..", "..", "weartee-fixed");
      let rel = path === "/" ? "index.html" : path.replace(/^\//, "");
      rel = rel.split("?")[0];
      if (rel.includes("..")) return send(res, 400, { error: "Invalid path" });
      const full = pathMod.join(FRONTEND_DIR, rel);
      if (!full.startsWith(pathMod.resolve(FRONTEND_DIR))) {
        return send(res, 403, { error: "Forbidden" });
      }
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        const ext = pathMod.extname(full).toLowerCase();
        const types = {
          ".html": "text/html; charset=utf-8",
          ".js": "application/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".json": "application/json",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".webp": "image/webp",
          ".svg": "image/svg+xml",
          ".ico": "image/x-icon",
          ".woff2": "font/woff2",
        };
        const data = fs.readFileSync(full);
        res.writeHead(200, {
          "Content-Type": types[ext] || "application/octet-stream",
          "Content-Length": data.length,
          "Access-Control-Allow-Origin": "*",
        });
        res.end(data);
        return;
      }
      // SPA-style fallback for missing asset
      if (!rel.includes(".")) {
        const index = pathMod.join(FRONTEND_DIR, "index.html");
        if (fs.existsSync(index)) {
          const data = fs.readFileSync(index);
          res.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Length": data.length,
          });
          res.end(data);
          return;
        }
      }
    }

    return send(res, 404, { error: "Not found" });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: err.message || "Server error" });
  }
}

const server = http.createServer((req, res) => {
  handle(req, res);
});

server.listen(PORT, "0.0.0.0", () => {
  readDb();
  console.log(`WEARTEE API listening on http://localhost:${PORT}`);
  console.log(`Shop:    http://localhost:${PORT}/`);
  console.log(`Admin:   http://localhost:${PORT}/admin.html`);
  console.log(`Health:  http://localhost:${PORT}/api/health`);
});
