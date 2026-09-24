require("./env");
const http = require("http");
const { URL } = require("url");
const crypto = require("crypto");
const { notifyOrder } = require("./mail");
const store = require("./store");
const { hashPassword, verifyPassword, signToken, readToken, STATUS_FLOW } =
  store;

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

function sameEmail(a, b) {
  const x = String(a || "")
    .trim()
    .toLowerCase();
  const y = String(b || "")
    .trim()
    .toLowerCase();
  return !!x && x === y;
}

// Basic per-IP limit on order lookups (30 per 10 minutes)
const lookupHits = new Map();
function rateLimited(req, limit = 30, windowMs = 10 * 60 * 1000) {
  const ip = String(
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
  )
    .split(",")[0]
    .trim();
  const now = Date.now();
  const rec = lookupHits.get(ip);
  if (!rec || now > rec.reset) {
    lookupHits.set(ip, { count: 1, reset: now + windowMs });
    return false;
  }
  rec.count++;
  return rec.count > limit;
}
setInterval(
  () => {
    const now = Date.now();
    for (const [k, v] of lookupHits) if (now > v.reset) lookupHits.delete(k);
  },
  10 * 60 * 1000,
).unref();

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
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
        reject(httpError(413, "Body too large"));
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
        reject(httpError(400, "Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

async function authUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = readToken(token);
  if (!payload || !payload.uid) return null;
  return store.getUserById(payload.uid);
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

async function resolveCartKey(req, url) {
  const user = await authUser(req);
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
      const meta = await store.getMeta();
      const stateName = url.searchParams.get("state") || "";
      const subtotal = Number(url.searchParams.get("subtotal") || 0);
      const fee =
        subtotal <= 0
          ? 0
          : subtotal >= meta.freeShippingThreshold
            ? 0
            : shippingForState(meta, stateName);
      return send(res, 200, {
        state: stateName,
        subtotal,
        shippingFee: fee,
        freeShippingThreshold: meta.freeShippingThreshold,
        shippingByState: meta.shippingByState || {},
      });
    }

    if (method === "GET" && path === "/api/meta") {
      const meta = await store.getMeta();
      return send(res, 200, { ...meta, statusFlow: STATUS_FLOW });
    }

    if (method === "GET" && path === "/api/products") {
      let list = await store.listProducts();
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
      const product = await store.getProduct(id);
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
      if (await store.getUserByEmail(cleanEmail)) {
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
      await store.createUser(user);
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
      const user = await store.getUserByEmail(cleanEmail);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return send(res, 401, { error: "Invalid email or password" });
      }
      return send(res, 200, {
        token: signToken({ uid: user.id }),
        user: publicUser(user),
      });
    }

    if (method === "GET" && path === "/api/me") {
      const user = await authUser(req);
      if (!user) return send(res, 401, { error: "Sign in required" });
      return send(res, 200, { user: publicUser(user) });
    }

    if (method === "PUT" && path === "/api/me") {
      const user = await authUser(req);
      if (!user) return send(res, 401, { error: "Sign in required" });
      const body = await readBody(req);
      const row = { ...user };
      for (const key of ["name", "phone", "address", "city", "state"]) {
        if (body[key] !== undefined) row[key] = String(body[key] || "").trim();
      }
      if (body.email) {
        const email = String(body.email).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return send(res, 400, { error: "Valid email required" });
        }
        const other = await store.getUserByEmail(email);
        if (other && other.id !== row.id) {
          return send(res, 409, { error: "Email already in use" });
        }
        row.email = email;
      }
      await store.saveUser(row);
      return send(res, 200, { user: publicUser(row) });
    }

    if (method === "POST" && path === "/api/orders") {
      const body = await readBody(req);
      const user = await authUser(req);
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

      const [products, meta] = await Promise.all([
        store.listProducts(),
        store.getMeta(),
      ]);
      const packed = sanitizeItems(body.items, products);
      if (packed.error) return send(res, 400, { error: packed.error });

      const money = pricing(packed.items, meta, state);
      const order = {
        id: "",
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

      await store.createOrder(order);

      if (user) {
        try {
          await store.saveUser({
            ...user,
            name,
            email,
            phone,
            address,
            city,
            state,
          });
        } catch (err) {
          // the order is already saved, so a profile update problem must not fail it
          console.warn("Could not update profile after order:", err.message);
        }
      }
      return send(res, 201, { order });
    }

    if (method === "GET" && path === "/api/orders") {
      const user = await authUser(req);
      if (!user) return send(res, 401, { error: "Sign in required" });
      const orders = await store.listOrdersFor({
        email: user.email,
        userId: user.id,
      });
      return send(res, 200, { orders });
    }

    if (method === "POST" && path === "/api/orders/lookup") {
      if (rateLimited(req)) {
        return send(res, 429, {
          error: "Too many requests, try again later",
        });
      }
      const body = await readBody(req);
      const refs = Array.isArray(body.orders) ? body.orders.slice(0, 50) : [];
      const results = await Promise.all(
        refs.map(async (ref) => {
          const order = await store.getOrder(String((ref && ref.id) || ""));
          return order && sameEmail(order.shipping.email, ref.email)
            ? order
            : null;
        }),
      );
      return send(res, 200, { orders: results.filter(Boolean) });
    }

    if (method === "GET" && path.startsWith("/api/orders/")) {
      if (rateLimited(req)) {
        return send(res, 429, {
          error: "Too many requests, try again later",
        });
      }
      const id = decodeURIComponent(path.slice("/api/orders/".length));
      const order = await store.getOrder(id);
      const user = await authUser(req);
      const allowed =
        order &&
        ((user && order.userId === user.id) ||
          sameEmail(order.shipping.email, url.searchParams.get("email")));
      if (!allowed) return send(res, 404, { error: "Order not found" });
      return send(res, 200, { order });
    }

    if (method === "GET" && path.startsWith("/api/orders/")) {
      const id = decodeURIComponent(path.slice("/api/orders/".length));
      const order = await store.getOrder(id);
      if (!order) return send(res, 404, { error: "Order not found" });
      return send(res, 200, { order });
    }

    if (method === "GET" && path === "/api/admin/orders") {
      if (!isAdmin(req)) {
        return send(res, 401, { error: "Admin key required" });
      }
      const orders = await store.listAllOrders();
      return send(res, 200, { orders, statusFlow: STATUS_FLOW });
    }

    if (method === "GET" && path.startsWith("/api/admin/orders/")) {
      if (!isAdmin(req)) {
        return send(res, 401, { error: "Admin key required" });
      }
      const id = decodeURIComponent(path.slice("/api/admin/orders/".length));
      const order = await store.getOrder(id);
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
      const order = await store.getOrder(id);
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
        const meta = await store.getMeta();
        const money = pricing(order.items, meta);
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
      await store.saveOrder(order);

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
      const order = await store.getOrder(id);
      if (!order) return send(res, 404, { error: "Order not found" });
      if (body.status && STATUS_FLOW.includes(String(body.status))) {
        order.status = String(body.status);
        order.updatedAt = new Date().toISOString();
        await store.saveOrder(order);
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
      const products = await store.listProducts();
      return send(res, 200, { products });
    }

    if (method === "PATCH" && path.startsWith("/api/admin/products/")) {
      if (!isAdmin(req)) {
        return send(res, 401, { error: "Admin key required" });
      }
      const id = decodeURIComponent(path.slice("/api/admin/products/".length));
      const body = await readBody(req);
      const product = await store.getProduct(id);
      if (!product) return send(res, 404, { error: "Product not found" });
      if (body.price !== undefined)
        product.price = Math.max(0, Number(body.price) || 0);
      if (body.name !== undefined)
        product.name = String(body.name).trim() || product.name;
      if (body.category !== undefined)
        product.category = String(body.category).trim() || product.category;
      await store.saveProduct(product);
      return send(res, 200, { product });
    }

    if (method === "GET" && path === "/api/cart") {
      const key = await resolveCartKey(req, url);
      if (!key)
        return send(res, 400, {
          error: "Missing cart id (send x-cart-id header) or sign in",
        });
      const items = await store.getCart(key);
      return send(res, 200, {
        cartId: key.startsWith("guest:") ? key.slice(6) : null,
        items,
      });
    }

    if (method === "PUT" && path === "/api/cart") {
      let key = await resolveCartKey(req, url);
      const body = await readBody(req);
      if (!key) {
        const newId = crypto.randomBytes(12).toString("hex");
        key = "guest:" + newId;
      }
      const products = await store.listProducts();
      const packed = normalizeCartItems(body.items || [], products);
      if (packed.error) return send(res, 400, { error: packed.error });
      await store.saveCart(key, packed.items);
      return send(res, 200, {
        cartId: key.startsWith("guest:") ? key.slice(6) : null,
        items: packed.items,
      });
    }

    if (method === "DELETE" && path === "/api/cart") {
      const key = await resolveCartKey(req, url);
      if (!key) return send(res, 400, { error: "Missing cart id or sign in" });
      await store.saveCart(key, []);
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

      let rel;
      try {
        rel =
          path === "/"
            ? "index.html"
            : decodeURIComponent(path).replace(/^\/+/, "");
      } catch {
        return send(res, 400, { error: "Invalid path" });
      }
      if (rel.includes("..") || rel.includes("\0")) {
        return send(res, 400, { error: "Invalid path" });
      }

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
    const status = err.status || 500;
    const message =
      status === 500 && IS_PROD
        ? "Server error"
        : err.message || "Server error";
    return send(res, status, { error: message });
  }
}

const server = http.createServer((req, res) => {
  handle(req, res);
});

store
  .ensureSeeded()
  .then(() => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`WEARTEE API listening on http://localhost:${PORT}`);
      console.log(`Shop:    http://localhost:${PORT}/`);
      console.log(`Admin:   http://localhost:${PORT}/admin.html`);
      console.log(`Health:  http://localhost:${PORT}/api/health`);
    });
  })
  .catch((err) => {
    console.error("Startup failed:", err.message);
    process.exit(1);
  });
