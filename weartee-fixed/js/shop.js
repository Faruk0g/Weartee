const PER_PAGE = 12;

const PRICE_RANGES = [
  { id: "u15", label: "Under ₦15,000", min: 0, max: 14999 },
  { id: "15-20", label: "₦15,000 – ₦20,000", min: 15000, max: 20000 },
  { id: "20-25", label: "₦20,000 – ₦25,000", min: 20001, max: 25000 },
  { id: "25p", label: "₦25,000 & above", min: 25001, max: Infinity },
];

const state = {
  categories: [],
  price: "",
  size: "",
  color: "",
  sort: "featured",
  search: "",
  page: 1,
};

function readParams() {
  const params = new URLSearchParams(window.location.search);
  state.categories = params.getAll("category");
  state.search = (params.get("search") || "").trim();
  state.sort = params.get("sort") || "featured";
  state.page = parseInt(params.get("page"), 10) || 1;
  state.price = params.get("price") || "";
  state.size = params.get("size") || "";
  state.color = params.get("color") || "";
}

function applyFilters() {
  let list = [...products];

  if (state.categories.length) {
    list = list.filter((p) => state.categories.includes(p.category));
  }
  if (state.price) {
    const range = PRICE_RANGES.find((r) => r.id === state.price);
    if (range) list = list.filter((p) => p.price >= range.min && p.price <= range.max);
  }
  if (state.size) {
    list = list.filter((p) => p.sizes.includes(state.size));
  }
  if (state.color) {
    list = list.filter((p) => p.colors.includes(state.color));
  }
  if (state.search) {
    const q = state.search.toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q) || p.category.includes(q));
  }

  switch (state.sort) {
    case "price-asc": list.sort((a, b) => a.price - b.price); break;
    case "price-desc": list.sort((a, b) => b.price - a.price); break;
    case "rating": list.sort((a, b) => b.rating.star - a.rating.star || b.rating.count - a.rating.count); break;
    case "newest":
      list.sort((a, b) => Number(b.isNew) - Number(a.isNew) || (b._index || 0) - (a._index || 0));
      break;
  }
  return list;
}

function renderFilters() {
  document.getElementById("catFilters").innerHTML = CATEGORIES.map((c) => {
    const count = products.filter((p) => p.category === c.slug).length;
    const checked = state.categories.includes(c.slug) ? "checked" : "";
    return `<label class="check-row"><input type="checkbox" value="${c.slug}" ${checked}><span>${c.label}</span><span class="count">${count}</span></label>`;
  }).join("");

  document.getElementById("priceFilters").innerHTML = PRICE_RANGES.map((r) => {
    const count = products.filter((p) => p.price >= r.min && p.price <= r.max).length;
    return `<label><input type="radio" name="price" value="${r.id}" ${state.price === r.id ? "checked" : ""}><span>${r.label} <span style="color:var(--brown-300);font-size:0.8rem;">(${count})</span></span></label>`;
  }).join("");

  const sizes = [...new Set(products.flatMap((p) => p.sizes))];
  document.getElementById("sizeFilters").innerHTML = sizes
    .map((s) => `<button class="size-chip ${state.size === s ? "active" : ""}" data-size="${s}">${s}</button>`)
    .join("");

  const colors = [...new Set(products.flatMap((p) => p.colors))];
  document.getElementById("colorFilters").innerHTML = colors
    .map((c) => {
      const count = products.filter((p) => p.colors.includes(c)).length;
      return `<label class="color-row"><input type="radio" name="color" value="${c}" ${state.color === c ? "checked" : ""}><span class="swatch" style="background:${COLOR_SWATCHES[c] || "#ccc"};"></span><span style="text-transform:capitalize;">${c}</span><span class="count">${count}</span></label>`;
    })
    .join("");
}

function updateURL(push) {
  const params = new URLSearchParams();
  state.categories.forEach((c) => params.append("category", c));
  if (state.price) params.set("price", state.price);
  if (state.size) params.set("size", state.size);
  if (state.color) params.set("color", state.color);
  if (state.sort !== "featured") params.set("sort", state.sort);
  if (state.search) params.set("search", state.search);
  if (state.page > 1) params.set("page", state.page);
  const url = `shop.html${params.toString() ? "?" + params.toString() : ""}`;
  if (push) {
    window.history.pushState({ wt: true }, "", url);
  } else {
    window.history.replaceState({ wt: true }, "", url);
  }
}

function renderHeading(list) {
  const total = list.length;
  const activeCats = state.categories.map(categoryLabel);
  let title = "Shop All";
  let sub = "Every piece, curated for you.";
  if (state.search) {
    title = "Search";
    sub = `${total} result${total === 1 ? "" : "s"} for “${state.search}”`;
  } else if (activeCats.length === 1) {
    title = activeCats[0];
    sub = `${total} style${total === 1 ? "" : "s"} in ${activeCats[0]}`;
  } else if (activeCats.length > 1) {
    title = "Shop";
    sub = `${total} styles across ${activeCats.join(" & ")}`;
  }
  document.querySelector(".page-title").textContent = title;
  document.getElementById("shopSub").textContent = sub;
  document.getElementById("crumbHere").textContent = title;

  const from = total === 0 ? 0 : (state.page - 1) * PER_PAGE + 1;
  const to = total === 0 ? 0 : Math.min(state.page * PER_PAGE, total);
  document.getElementById("shopCount").innerHTML = `Showing <b>${from}–${to}</b> of <b>${total}</b> products`;
}

function renderPagination(total) {
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const el = document.getElementById("pagination");
  if (pages <= 1) {
    el.innerHTML = "";
    return;
  }
  let html = `<button class="page-btn" data-page="${state.page - 1}" ${state.page <= 1 ? "disabled" : ""} aria-label="Previous page">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>`;

  const windowPages = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - state.page) <= 1) windowPages.push(i);
  }
  let prev = 0;
  windowPages.forEach((i) => {
    if (i - prev > 1) html += `<span class="page-dots">…</span>`;
    html += `<button class="page-btn ${i === state.page ? "active" : ""}" data-page="${i}">${i}</button>`;
    prev = i;
  });

  html += `<button class="page-btn" data-page="${state.page + 1}" ${state.page >= pages ? "disabled" : ""} aria-label="Next page">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>`;
  el.innerHTML = html;
}

function render() {
  const list = applyFilters();
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  if (state.page > pages) state.page = pages;

  const start = (state.page - 1) * PER_PAGE;
  const slice = list.slice(start, start + PER_PAGE);

  const grid = document.getElementById("productGrid");
  grid.innerHTML = slice.map(productCard).join("");

  const empty = document.getElementById("emptyState");
  if (list.length === 0) {
    grid.innerHTML = "";
    empty.innerHTML = `
      <div class="empty-state">
        <div class="es-ico">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <h3>No pieces found</h3>
        <p>Try adjusting your filters or search for something else.</p>
        <button class="btn btn-primary btn-sm" id="resetSearch">Clear filters</button>
      </div>`;
    document.getElementById("resetSearch").addEventListener("click", clearAll);
  } else {
    empty.innerHTML = "";
  }

  renderHeading(list);
  renderPagination(list.length);
  renderFilters();
  updateURL(false);
  guardImages(document);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearAll() {
  state.categories = [];
  state.price = "";
  state.size = "";
  state.color = "";
  state.search = "";
  state.sort = "featured";
  state.page = 1;
  updateURL(true);
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  readParams();

  document.getElementById("catFilters").addEventListener("change", (e) => {
    if (e.target.type === "checkbox") {
      state.categories = [...document.querySelectorAll("#catFilters input:checked")].map((i) => i.value);
      state.page = 1;
      updateURL(true);
      render();
    }
  });

  document.getElementById("priceFilters").addEventListener("change", (e) => {
    state.price = e.target.value;
    state.page = 1;
    updateURL(true);
    render();
  });

  document.getElementById("sizeFilters").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-size]");
    if (!chip) return;
    state.size = state.size === chip.dataset.size ? "" : chip.dataset.size;
    state.page = 1;
    updateURL(true);
    render();
  });

  document.getElementById("colorFilters").addEventListener("change", (e) => {
    state.color = e.target.value;
    state.page = 1;
    updateURL(true);
    render();
  });

  document.getElementById("sortSelect").value = state.sort;
  document.getElementById("sortSelect").addEventListener("change", (e) => {
    state.sort = e.target.value;
    state.page = 1;
    updateURL(true);
    render();
  });

  document.getElementById("clearFilters").addEventListener("click", clearAll);

  document.getElementById("pagination").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-page]");
    if (!btn || btn.disabled) return;
    state.page = parseInt(btn.dataset.page, 10);
    updateURL(true);
    render();
  });

  const filterToggle = document.getElementById("filterToggle");
  if (filterToggle) {
    filterToggle.addEventListener("click", () => {
      document.getElementById("filters").classList.toggle("open");
    });
  }

  window.addEventListener("popstate", () => {
    readParams();
    document.getElementById("sortSelect").value = state.sort;
    render();
  });

  render();
});
