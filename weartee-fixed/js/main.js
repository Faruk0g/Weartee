/* WEARTEE shared engine: chrome, cart, orders, profile, UI helpers */

const Store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

const Cart = {
  all() {
    return Store.get("wt_cart", []);
  },
  save(items) {
    Store.set("wt_cart", items);
    Cart.refreshBadge();
    document.dispatchEvent(new CustomEvent("cart:changed"));
    Cart.syncToServer(items);
  },
  syncToServer(items) {
    if (!window.WearteeAPI) return;
    const payload = {
      items: (items || Cart.all()).map((i) => ({
        id: i.id,
        size: i.size,
        color: i.color,
        qty: i.qty,
      })),
    };
    window.WearteeAPI
      .api("/api/cart", { method: "PUT", body: JSON.stringify(payload) })
      .catch((err) => console.warn("Cart sync failed", err));
  },
  async pullFromServer() {
    if (!window.WearteeAPI) return Cart.all();
    try {
      const res = await window.WearteeAPI.api("/api/cart");
      if (Array.isArray(res.items)) {
        Store.set("wt_cart", res.items);
        Cart.refreshBadge();
        document.dispatchEvent(new CustomEvent("cart:changed"));
        return res.items;
      }
    } catch (err) {
      console.warn("Cart pull failed", err);
    }
    return Cart.all();
  },
  count() {
    return Cart.all().reduce((n, i) => n + i.qty, 0);
  },
  subtotal() {
    return Cart.all().reduce((n, i) => n + i.price * i.qty, 0);
  },
  shipping(stateName) {
    return shippingFeeForState(stateName, Cart.subtotal());
  },
  total() {
    return Cart.subtotal() + Cart.shipping();
  },
  add(id, size, color, qty) {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const items = Cart.all();
    const line = items.find(
      (i) => i.id === id && i.size === size && i.color === color,
    );
    if (line) {
      line.qty += qty;
    } else {
      items.push({
        id,
        name: product.name,
        image: product.image,
        price: product.price,
        category: product.category,
        size,
        color,
        qty,
      });
    }
    Cart.save(items);
  },
  updateQty(index, qty) {
    const items = Cart.all();
    if (!items[index]) return;
    items[index].qty = Math.max(1, Math.min(99, qty));
    Cart.save(items);
  },
  remove(index) {
    const items = Cart.all();
    items.splice(index, 1);
    Cart.save(items);
  },
  clear() {
    Cart.save([]);
  },
  refreshBadge() {
    document.querySelectorAll(".cart-count").forEach((el) => {
      const n = Cart.count();
      el.textContent = n;
      el.style.display = n > 0 ? "flex" : "none";
    });
  },
  lineSubtotal(items) {
    return items.reduce((n, i) => n + i.price * i.qty, 0);
  },
  lineShipping(items, stateName) {
    return shippingFeeForState(stateName, Cart.lineSubtotal(items));
  },
  lineTotal(items, stateName) {
    return Cart.lineSubtotal(items) + Cart.lineShipping(items, stateName);
  },
  pendingCheckout() {
    try {
      const raw = sessionStorage.getItem("wt_buynow");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setPendingCheckout(item) {
    sessionStorage.setItem("wt_buynow", JSON.stringify(item));
  },
  clearPendingCheckout() {
    sessionStorage.removeItem("wt_buynow");
  },
  isBuyNow() {
    return new URLSearchParams(window.location.search).get("buynow") === "1";
  },
  linesForCheckout() {
    if (Cart.isBuyNow()) {
      const pending = Cart.pendingCheckout();
      if (pending) return [pending];
    }
    return Cart.all();
  },
};

const Orders = {
  all() {
    return Store.get("wt_orders", []);
  },
  save(list) {
    Store.set("wt_orders", list);
  },
  add(order) {
    const list = Orders.all().filter((o) => o.id !== order.id);
    list.unshift(order);
    Orders.save(list);
  },
  find(id) {
    return Orders.all().find((o) => o.id === id);
  },
};

const Profile = {
  get() {
    return Store.get("wt_profile", {
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
    });
  },
  save(p) {
    Store.set("wt_profile", p);
  },
  clear() {
    Store.set("wt_profile", {
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
    });
  },
};

/* ---------- UI helpers ---------- */

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#F7DDE3"/>
          <stop offset="0.55" stop-color="#F4EBE4"/>
          <stop offset="1" stop-color="#C4AD9E"/>
        </linearGradient>
      </defs>
      <rect width="600" height="800" fill="url(#g)"/>
      <circle cx="300" cy="330" r="150" fill="none" stroke="#C97B8A" stroke-width="2.5" opacity="0.65"/>
      <path d="M300 236 l31 63 69 10 -50 48 12 69 -62 -33 -62 33 12 -69 -50 -48 69 -10 z" fill="none" stroke="#C97B8A" stroke-width="2.5" opacity="0.65"/>
      <text x="300" y="600" text-anchor="middle" font-family="Georgia, serif" font-size="42" letter-spacing="10" fill="#B76E79">WEARTEE</text>
      <text x="300" y="645" text-anchor="middle" font-family="Georgia, serif" font-size="20" letter-spacing="6" fill="#8A6D5C" opacity="0.8">IMAGE COMING SOON</text>
    </svg>`,
  );

function productImage(product) {
  return product ? product.image : PLACEHOLDER;
}

function guardImages(scope) {
  (scope || document).querySelectorAll("img[data-guard]").forEach((img) => {
    img.addEventListener("error", () => {
      img.src = PLACEHOLDER;
      img.removeAttribute("data-guard");
    });
  });
}

function starHTML(rating) {
  const star = (filled) =>
    `<svg width="14" height="14" viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.6"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.3l-5.8 3.1 1.1-6.4L2.6 9.4l6.5-.9z"/></svg>`;
  const full = Math.floor(rating.star);
  const half = rating.star % 1 >= 0.5;
  let out = "";
  for (let i = 0; i < 5; i++) {
    if (i < full) out += star(true);
    else if (i === full && half) out += star(true);
    else out += star(false);
  }
  return `<span class="stars">${out}</span>`;
}

function categoryLabel(slug) {
  const c = CATEGORIES.find((c) => c.slug === slug);
  return c ? c.label : slug;
}

function productCard(product) {
  const badges = [];
  if (product.isNew) badges.push('<span class="badge badge-new">New</span>');
  return `
  <article class="product-card">
    <div class="pc-media">
      <a href="product.html?id=${product.id}" aria-label="${product.name}">
        <img src="${product.image}" alt="${product.name}" loading="lazy" data-guard>
      </a>
      <div class="pc-badges">${badges.join("")}</div>
    </div>
    <div class="pc-body">
      <span class="pc-cat">${categoryLabel(product.category)}</span>
      <h3 class="pc-name"><a href="product.html?id=${product.id}">${product.name}</a></h3>
      <div class="pc-rating">${starHTML(product.rating)} <span>${product.rating.star} (${product.rating.count})</span></div>
      <div class="pc-foot">
        <span class="pc-price">${formatPrice(product.price)}</span>
        <button class="pc-add" data-add="${product.id}" aria-label="Add ${product.name} to cart" title="Add to cart">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        </button>
      </div>
    </div>
  </article>`;
}

function quickAdd(id) {
  const product = products.find((p) => p.id === id);
  if (!product) return;
  const defaults = {
    size: product.sizes[Math.min(1, product.sizes.length - 1)],
    color: product.colors[0],
  };
  Cart.add(id, defaults.size, defaults.color, 1);
  toast(`Added to cart — ${product.name}`);
}

function statusBadge(status) {
  const slug = (status || "").toLowerCase().replace(/\s+/g, "-");
  return `<span class="badge badge-${slug}">${status}</span>`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initialsOf(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "J";
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

function toast(message) {
  let wrap = document.querySelector(".toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.1V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
    <span></span>`;
  el.querySelector("span").textContent = message;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity 0.35s, transform 0.35s";
    el.style.opacity = "0";
    el.style.transform = "translateY(10px)";
    setTimeout(() => el.remove(), 380);
  }, 2600);
}

/* ---------- Chrome: navbar + footer ---------- */

const ICONS = {
  search: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`,
  cart: `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  user: `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  menu: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
  home: `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>`,
  grid: `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
};

function renderChrome() {
  const page = document.body.dataset.page || "";

  const navLinks = [
    { href: "index.html", label: "Home", key: "home" },
    { href: "shop.html", label: "Shop", key: "shop" },
    ...CATEGORIES.map((c) => ({
      href: `shop.html?category=${c.slug}`,
      label: c.label,
      key: `cat-${c.slug}`,
    })),
  ]
    .map(
      (l) =>
        `<a href="${l.href}" class="${page === l.key ? "active" : ""}">${l.label}</a>`,
    )
    .join("");

  const navbar = `
  <header class="navbar">
    <div class="container navbar-inner">
      <button class="icon-btn menu-btn" id="menuBtn" aria-label="Open menu">${ICONS.menu}</button>
      <a class="brand" href="index.html">WEAR<em>TEE</em></a>
      <nav class="nav-links" aria-label="Main">${navLinks}</nav>
      <div class="nav-actions">
        <form class="nav-search" role="search" action="shop.html" method="get">
          ${ICONS.search}
          <input type="search" name="search" placeholder="Search styles..." aria-label="Search products">
        </form>
        <button class="icon-btn search-toggle" id="searchToggle" aria-label="Search" style="display:none">${ICONS.search}</button>
        <a class="icon-btn" href="cart.html" aria-label="Cart">${ICONS.cart}<span class="cart-count" style="display:none">0</span></a>
        <a class="icon-btn" href="account.html" aria-label="Account">${ICONS.user}</a>
      </div>
    </div>
    <div class="mobile-search" id="mobileSearch">
      <form class="nav-search" role="search" action="shop.html" method="get">
        ${ICONS.search}
        <input type="search" name="search" placeholder="Search styles..." aria-label="Search products">
      </form>
    </div>
  </header>`;

  const socials = [
    {
      label: "Instagram",
      href: "https://www.instagram.com/_weartee.ng",
      svg: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>`,
    },
    {
      label: "TikTok",
      href: "https://www.tiktok.com/@_pharteemah__",
      svg: `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 3c.4 2.2 1.9 3.8 4.4 4v3.1c-1.7 0-3.2-.5-4.4-1.4v6.9A6.3 6.3 0 1 1 10.3 9c.4 0 .7 0 1.1.1v3.2a3.2 3.2 0 1 0 2.2 3V3h3z"/></svg>`,
    },
  ]
    .map(
      (s) =>
        `<a href="${s.href}" target="_blank" rel="noopener" aria-label="${s.label}" title="${s.label}">${s.svg}</a>`,
    )
    .join("");

  const footer = `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <a class="brand" href="index.html">WEAR<em>TEE</em></a>
          <p class="footer-about">Feminine pieces that tell your story — curated two-piece sets, dresses, tops and more, made for every mood.</p>
          <div class="socials">${socials}</div>
        </div>
        <div>
          <h4>Quick Links</h4>
          <ul class="footer-links">
            <li><a href="index.html">Home</a></li>
            <li><a href="shop.html">Shop All</a></li>
            <li><a href="cart.html">My Cart</a></li>
            <li><a href="orders.html">Track Orders</a></li>
            <li><a href="account.html">My Account</a></li>
          </ul>
        </div>
        <div>
          <h4>Categories</h4>
          <ul class="footer-links">
            ${CATEGORIES.map((c) => `<li><a href="shop.html?category=${c.slug}">${c.label}</a></li>`).join("")}
          </ul>
        </div>
        <div>
          <h4>Get In Touch</h4>
          <ul class="footer-contact">
            <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>Lagos, Nigeria</span></li>
            <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></svg><a href="tel:+2349012473305">09012473305</a></li>
            <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg><a href="mailto:weartee.ng@gmail.com">weartee.ng@gmail.com</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; 2026 WEARTEE. All rights reserved.</span>
        <span class="pay-Note">Payments: Card &middot; Transfer &middot; Pay on Delivery</span>
      </div>
    </div>
  </footer>

  <nav class="bottom-nav" aria-label="Mobile">
    <ul>
      <li><a href="index.html" class="${page === "home" ? "active" : ""}">${ICONS.home}<span>Home</span></a></li>
      <li><a href="shop.html" class="${page.startsWith("shop") || page.startsWith("cat-") || page === "product" ? "active" : ""}">${ICONS.grid}<span>Shop</span></a></li>
      <li><a href="cart.html" class="${page === "cart" ? "active" : ""}">${ICONS.cart}<span class="cart-count" style="display:none">0</span><span>Cart</span></a></li>
      <li><a href="account.html" class="${page.startsWith("account") || page.startsWith("orders") ? "active" : ""}">${ICONS.user}<span>Account</span></a></li>
    </ul>
  </nav>`;

  document.body.insertAdjacentHTML("afterbegin", navbar);
  document.body.insertAdjacentHTML("beforeend", footer);

  const menuBtn = document.getElementById("menuBtn");
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      const existing = document.querySelector(".mobile-menu");
      if (existing) {
        existing.remove();
        return;
      }
      const menu = document.createElement("div");
      menu.className = "mobile-menu";
      menu.innerHTML = navLinks;
      document.querySelector(".navbar").appendChild(menu);
    });
  }
  document.addEventListener("click", (e) => {
    const menu = document.querySelector(".mobile-menu");
    if (
      menu &&
      !e.target.closest(".mobile-menu") &&
      !e.target.closest("#menuBtn")
    ) {
      menu.remove();
    }
  });
  const searchToggle = document.getElementById("searchToggle");
  const mobileSearch = document.getElementById("mobileSearch");
  if (searchToggle && mobileSearch) {
    searchToggle.addEventListener("click", () => {
      mobileSearch.classList.toggle("open");
      const input = mobileSearch.querySelector("input");
      if (mobileSearch.classList.contains("open")) input.focus();
    });
  }

  Cart.refreshBadge();
}

/* ---------- Global wiring ---------- */

document.addEventListener("click", (e) => {
  const addBtn = e.target.closest("[data-add]");
  if (addBtn) {
    quickAdd(addBtn.dataset.add);
  }
});

document.addEventListener("cart:changed", () => {
  guardImages(document);
});

document.addEventListener("DOMContentLoaded", async () => {
  renderChrome();
  guardImages(document);
  if (window.WearteeAPI) {
    await Cart.pullFromServer();
  }
});
