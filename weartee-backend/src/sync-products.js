require("./env");
const fs = require("fs");
const path = require("path");
const store = require("./store");

const OVERWRITE = process.argv.includes("--overwrite");
const FILE =
  process.env.PRODUCTS_JS ||
  path.join(__dirname, "..", "..", "weartee-fixed", "js", "products.js");

function loadProducts() {
  const src = fs.readFileSync(FILE, "utf8");
  // products.js is a browser script, so run it in a function and grab the array
  return new Function(src + "\nreturn products;")();
}

(async () => {
  const products = loadProducts();
  const existing = await store.listProducts();
  const byId = new Map(existing.map((p) => [p.id, p]));
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const p of products) {
    const { _index, ...rest } = p;
    const record = { ...rest, sortIndex: _index };
    const current = byId.get(p.id);
    if (!current) {
      await store.saveProduct(record);
      added++;
      console.log("added:", p.name);
    } else if (OVERWRITE) {
      await store.saveProduct({ ...current, ...record });
      updated++;
    } else {
      skipped++;
    }
  }
  console.log(`Done. added ${added}, updated ${updated}, unchanged ${skipped}`);
  process.exit(0);
})().catch((err) => {
  console.error("Sync failed:", err.message);
  process.exit(1);
});
