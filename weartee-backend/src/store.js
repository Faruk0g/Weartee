const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const SEED_PATH = path.join(DATA_DIR, "products.seed.json");

function emptyDb() {
  return { users: [], sessions: [], orders: [], products: [], carts: {}, meta: {} };
}

function loadSeed() {
  const raw = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));
  return raw;
}

function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    const seed = loadSeed();
    const db = emptyDb();
    db.products = seed.products;
    db.meta = {
      categories: seed.categories,
      colorSwatches: seed.colorSwatches,
      shippingFee: seed.shippingFee,
      freeShippingThreshold: seed.freeShippingThreshold,
    };
    writeDb(db);
    return db;
  }
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  if (!db.carts) db.carts = {};
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.orders)) db.orders = [];
  if (!Array.isArray(db.products)) db.products = [];
  return db;
}

function writeDb(db) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const next = crypto.scryptSync(password, salt, 32).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(next, "hex"));
}

function signToken(payload) {
  const secret = process.env.TOKEN_SECRET || "weartee-dev-secret";
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 14 })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function readToken(token) {
  if (!token) return null;
  const secret = process.env.TOKEN_SECRET || "weartee-dev-secret";
  const [body, sig] = String(token).split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  if (expected !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function nextOrderId(db) {
  let id;
  do {
    id = "WT" + String(Math.floor(10000 + Math.random() * 89999));
  } while (db.orders.some((o) => o.id === id));
  return id;
}

const STATUS_FLOW = ["Confirmed", "Shipped", "Out for Delivery", "Delivered"];

module.exports = {
  readDb,
  writeDb,
  hashPassword,
  verifyPassword,
  signToken,
  readToken,
  nextOrderId,
  STATUS_FLOW,
};
