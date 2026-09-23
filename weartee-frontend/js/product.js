let product = null;
let selectedSize = "";
let selectedColor = "";
let qty = 1;

function updateQtyDisplay() {
  document.getElementById("qtyNum").textContent = qty;
}

function selectSize(size) {
  selectedSize = size;
  document.querySelectorAll("#pdSizes .size-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.size === size);
    chip.classList.remove("error");
  });
  document.getElementById("sizeHint").textContent = size ? `— ${size}` : "";
}

function selectColor(color) {
  selectedColor = color;
  document.querySelectorAll("#pdColors .pd-color").forEach((dot) => {
    dot.classList.toggle("active", dot.dataset.color === color);
  });
  document.getElementById("pdColorName").textContent = color ? `— ${color}` : "";
}

function addToCart(buyNow) {
  if (!product) return;
  const sizeChips = document.querySelectorAll("#pdSizes .size-chip");
  if (sizeChips.length && !selectedSize) {
    sizeChips.forEach((chip) => chip.classList.add("error"));
    document.getElementById("sizeHint").textContent = "— please pick a size";
    toast("Please select a size first");
    return;
  }
  if (buyNow) {
    Cart.setPendingCheckout({
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      category: product.category,
      size: selectedSize,
      color: selectedColor,
      qty,
    });
    window.location.href = "checkout.html?buynow=1";
    return;
  }
  Cart.add(product.id, selectedSize, selectedColor, qty);
  toast(`Added to cart — ${product.name}`);
}

document.addEventListener("DOMContentLoaded", () => {
  const id = new URLSearchParams(window.location.search).get("id");
  product = products.find((p) => p.id === id);
  if (!product) {
    window.location.replace("shop.html");
    return;
  }

  document.title = `${product.name} — WEARTEE`;

  const img = document.getElementById("pdImage");
  img.src = product.image;
  img.alt = product.name;

  document.getElementById("pdName").textContent = product.name;
  document.getElementById("pdPrice").textContent = formatPrice(product.price);
  document.getElementById("pdRating").innerHTML = `${starHTML(product.rating)} <span>${product.rating.star} · ${product.rating.count} reviews</span>`;
  document.getElementById("pdCat").textContent = categoryLabel(product.category);
  document.getElementById("pdCat").href = `shop.html?category=${product.category}`;
  document.getElementById("crumbCat").textContent = categoryLabel(product.category);
  document.getElementById("crumbCat").href = `shop.html?category=${product.category}`;
  document.getElementById("crumbName").textContent = product.name;

  // Colors
  const colorWrap = document.getElementById("pdColors");
  selectedColor = product.colors[0] || "";
  if (product.colors.length > 1) {
    colorWrap.innerHTML = product.colors
      .map((c, i) => `<button class="pd-color${i === 0 ? " active" : ""}" data-color="${c}" style="background:${COLOR_SWATCHES[c] || "#ccc"};" title="${c}" aria-label="Color ${c}"></button>`)
      .join("");
    colorWrap.addEventListener("click", (e) => {
      const dot = e.target.closest("[data-color]");
      if (dot) selectColor(dot.dataset.color);
    });
  } else {
    document.getElementById("pdColorOption").style.display = "none";
  }

  // Sizes
  document.getElementById("pdSizes").innerHTML = product.sizes
    .map((s) => `<button class="size-chip pd" data-size="${s}">${s}</button>`)
    .join("");
  document.getElementById("pdSizes").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-size]");
    if (chip) selectSize(chip.dataset.size);
  });

  document.getElementById("qtyMinus").addEventListener("click", () => {
    qty = Math.max(1, qty - 1);
    updateQtyDisplay();
  });
  document.getElementById("qtyPlus").addEventListener("click", () => {
    qty = Math.min(99, qty + 1);
    updateQtyDisplay();
  });

  document.getElementById("addBtn").addEventListener("click", () => addToCart(false));
  document.getElementById("buyBtn").addEventListener("click", () => addToCart(true));

  // Related products from the same category
  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .sort((a, b) => b.rating.count - a.rating.count)
    .slice(0, 8);
  const fallback = products.filter((p) => p.id !== product.id).slice(0, 8);
  document.getElementById("relCarousel").innerHTML = (related.length ? related : fallback).map(productCard).join("");

  document.querySelectorAll("[data-car]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const el = document.getElementById(btn.dataset.car);
      const step = el.clientWidth * 0.8;
      el.scrollBy({ left: btn.classList.contains("next") ? step : -step, behavior: "smooth" });
    });
  });

  guardImages(document);
});
