require("./env");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const IS_PROD =
  process.env.NODE_ENV === "production" || process.env.RENDER === "true";
const SECRET =
  process.env.TOKEN_SECRET || (IS_PROD ? "" : "weartee-dev-secret");
if (IS_PROD && SECRET.length < 32) {
  throw new Error("Set TOKEN_SECRET (32+ characters) in the environment");
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_KEY in the environment",
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const SEED_PATH = path.join(__dirname, "..", "data", "products.seed.json");
const STATUS_FLOW = ["Confirmed", "Shipped", "Out for Delivery", "Delivered"];

function check(error, what) {
  if (error) throw new Error(`${what} failed: ${error.message}`);
}

/* ---------- Seeding (first run only) ---------- */

async function ensureSeeded() {
  const { data, error } = await supabase
    .from("wt_meta")
    .select("key")
    .eq("key", "meta")
    .maybeSingle();
  check(error, "Seed check");
  if (data) return;

  const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));
  const meta = {
    categories: seed.categories,
    colorSwatches: seed.colorSwatches,
    shippingFee: seed.shippingFee,
    freeShippingThreshold: seed.freeShippingThreshold,
    shippingByState: seed.shippingByState || {},
    defaultShippingFee: seed.shippingFee || 4000,
  };

  const { error: pErr } = await supabase
    .from("wt_products")
    .upsert(
      seed.products.map((p, i) => ({ id: p.id, data: { ...p, sortIndex: i } })),
    );
  check(pErr, "Seed products");

  // meta goes last, so a failed seed retries on the next start
  const { error: mErr } = await supabase
    .from("wt_meta")
    .upsert({ key: "meta", value: meta });
  check(mErr, "Seed meta");
  console.log(`Seeded ${seed.products.length} products into Supabase`);
}

/* ---------- Meta ---------- */

async function getMeta() {
  const { data, error } = await supabase
    .from("wt_meta")
    .select("value")
    .eq("key", "meta")
    .maybeSingle();
  check(error, "Load meta");
  const meta = (data && data.value) || {};
  meta.shippingByState = meta.shippingByState || {};
  meta.defaultShippingFee = meta.defaultShippingFee || meta.shippingFee || 4000;
  meta.freeShippingThreshold = meta.freeShippingThreshold || 50000;
  return meta;
}

/* ---------- Products ---------- */

async function listProducts() {
  const { data, error } = await supabase.from("wt_products").select("data");
  check(error, "Load products");
  return (data || [])
    .map((r) => r.data)
    .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));
}

async function getProduct(id) {
  const { data, error } = await supabase
    .from("wt_products")
    .select("data")
    .eq("id", id)
    .maybeSingle();
  check(error, "Load product");
  return data ? data.data : null;
}

async function saveProduct(product) {
  const { error } = await supabase
    .from("wt_products")
    .upsert({ id: product.id, data: product });
  check(error, "Save product");
}

/* ---------- Users ---------- */

function emailTaken() {
  const err = new Error("An account with that email already exists");
  err.status = 409;
  return err;
}

async function getUserById(id) {
  const { data, error } = await supabase
    .from("wt_users")
    .select("data")
    .eq("id", id)
    .maybeSingle();
  check(error, "Load user");
  return data ? data.data : null;
}

async function getUserByEmail(email) {
  const { data, error } = await supabase
    .from("wt_users")
    .select("data")
    .eq("email", email)
    .maybeSingle();
  check(error, "Load user");
  return data ? data.data : null;
}

async function createUser(user) {
  const { error } = await supabase
    .from("wt_users")
    .insert({ id: user.id, email: user.email, data: user });
  if (error && error.code === "23505") throw emailTaken();
  check(error, "Create user");
}

async function saveUser(user) {
  const { error } = await supabase
    .from("wt_users")
    .update({ email: user.email, data: user })
    .eq("id", user.id);
  if (error && error.code === "23505") throw emailTaken();
  check(error, "Save user");
}

/* ---------- Orders ---------- */

async function createOrder(order) {
  for (let i = 0; i < 5; i++) {
    order.id = "WT" + String(Math.floor(10000 + Math.random() * 89999));
    const { error } = await supabase.from("wt_orders").insert({
      id: order.id,
      email: order.shipping.email,
      user_id: order.userId,
      created_at: order.date,
      data: order,
    });
    if (!error) return order;
    if (error.code !== "23505") check(error, "Create order");
  }
  throw new Error("Could not allocate an order id, please try again");
}

async function getOrder(id) {
  const { data, error } = await supabase
    .from("wt_orders")
    .select("data")
    .eq("id", id)
    .maybeSingle();
  check(error, "Load order");
  return data ? data.data : null;
}

async function saveOrder(order) {
  const { error } = await supabase
    .from("wt_orders")
    .update({ email: order.shipping.email, data: order })
    .eq("id", order.id);
  check(error, "Save order");
}

async function listAllOrders() {
  const { data, error } = await supabase
    .from("wt_orders")
    .select("data")
    .order("created_at", { ascending: false });
  check(error, "Load orders");
  return (data || []).map((r) => r.data);
}

async function listOrdersFor({ email, userId }) {
  const found = new Map();
  if (email) {
    const { data, error } = await supabase
      .from("wt_orders")
      .select("data")
      .eq("email", email);
    check(error, "Load orders");
    (data || []).forEach((r) => found.set(r.data.id, r.data));
  }
  if (userId) {
    const { data, error } = await supabase
      .from("wt_orders")
      .select("data")
      .eq("user_id", userId);
    check(error, "Load orders");
    (data || []).forEach((r) => found.set(r.data.id, r.data));
  }
  return [...found.values()].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
}

/* ---------- Carts ---------- */

async function getCart(key) {
  const { data, error } = await supabase
    .from("wt_carts")
    .select("data")
    .eq("key", key)
    .maybeSingle();
  check(error, "Load cart");
  return (data && data.data && data.data.items) || [];
}

async function saveCart(key, items) {
  const { error } = await supabase.from("wt_carts").upsert({
    key,
    updated_at: new Date().toISOString(),
    data: { items },
  });
  check(error, "Save cart");
}

/* ---------- Passwords and tokens ---------- */

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const next = crypto.scryptSync(password, salt, 32).toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(next, "hex"),
  );
}

function signToken(payload) {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 14 }),
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

function readToken(token) {
  if (!token) return null;
  const [body, sig] = String(token).split(".");
  if (!body || !sig) return null;
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(body)
    .digest("base64url");
  if (expected !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

module.exports = {
  ensureSeeded,
  getMeta,
  listProducts,
  getProduct,
  saveProduct,
  getUserById,
  getUserByEmail,
  createUser,
  saveUser,
  createOrder,
  getOrder,
  saveOrder,
  listAllOrders,
  listOrdersFor,
  getCart,
  saveCart,
  hashPassword,
  verifyPassword,
  signToken,
  readToken,
  STATUS_FLOW,
};
