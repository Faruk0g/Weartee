const STATUS_FLOW = ["Confirmed", "Shipped", "Out for Delivery", "Delivered"];

const state = {
  apiBase: localStorage.getItem("wt_admin_api") || "http://localhost:5050",
  key: sessionStorage.getItem("wt_admin_key") || "",
  orders: [],
  products: [],
  current: null,
};

function $(id) {
  return document.getElementById(id);
}

function money(n) {
  return "₦" + Number(n || 0).toLocaleString("en-NG");
}

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 2800);
}

function badgeClass(status) {
  return "badge " + String(status || "").replace(/\s+/g, "");
}

async function adminApi(path, options = {}) {
  const headers = Object.assign(
    { "Content-Type": "application/json", "x-admin-key": state.key },
    options.headers || {},
  );
  const res = await fetch(state.apiBase.replace(/\/$/, "") + path, {
    ...options,
    headers,
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    throw new Error((body && body.error) || res.statusText || "Request failed");
  }
  return body;
}

function showView(name) {
  $("viewOrders").classList.toggle("hidden", name !== "orders");
  $("viewDetail").classList.toggle("hidden", name !== "detail");
  $("viewProducts").classList.toggle("hidden", name !== "products");
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === name);
  });
}

function renderStats() {
  const counts = { all: state.orders.length };
  STATUS_FLOW.forEach((s) => (counts[s] = 0));
  state.orders.forEach((o) => {
    if (counts[o.status] !== undefined) counts[o.status] += 1;
  });
  $("orderStats").innerHTML = `
    <div class="stat"><b>${counts.all}</b><span>Total orders</span></div>
    ${STATUS_FLOW.map((s) => `<div class="stat"><b>${counts[s] || 0}</b><span>${s}</span></div>`).join("")}
  `;
}

function filteredOrders() {
  const q = ($("orderSearch").value || "").trim().toLowerCase();
  const st = $("statusFilter").value;
  return state.orders.filter((o) => {
    if (st && o.status !== st) return false;
    if (!q) return true;
    const blob = [
      o.id,
      o.shipping?.name,
      o.shipping?.email,
      o.shipping?.phone,
      o.status,
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(q);
  });
}

function renderOrdersTable() {
  const list = filteredOrders();
  if (!list.length) {
    $("ordersTableWrap").innerHTML = `<div class="empty">No orders match your filters.</div>`;
    return;
  }
  $("ordersTableWrap").innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Order</th>
          <th>Customer</th>
          <th>Date</th>
          <th>Status</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${list
          .map((o) => {
            const d = o.date ? new Date(o.date).toLocaleString("en-NG") : "—";
            return `
            <tr data-id="${o.id}">
              <td><b>#${o.id}</b><div class="item-meta">${(o.items || []).length} line(s)</div></td>
              <td>${o.shipping?.name || "—"}<div class="item-meta">${o.shipping?.email || ""}</div></td>
              <td>${d}</td>
              <td><span class="${badgeClass(o.status)}">${o.status}</span></td>
              <td><b>${money(o.total)}</b></td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>`;
  $("ordersTableWrap").querySelectorAll("tr[data-id]").forEach((row) => {
    row.addEventListener("click", () => openOrder(row.dataset.id));
  });
}

async function loadOrders() {
  $("ordersTableWrap").innerHTML = `<div class="empty">Loading orders…</div>`;
  const res = await adminApi("/api/admin/orders");
  state.orders = res.orders || [];
  const flow = res.statusFlow || STATUS_FLOW;
  $("statusFilter").innerHTML =
    `<option value="">All statuses</option>` +
    flow.map((s) => `<option value="${s}">${s}</option>`).join("");
  $("detailStatus").innerHTML = flow.map((s) => `<option value="${s}">${s}</option>`).join("");
  renderStats();
  renderOrdersTable();
}

function openOrder(id) {
  const order = state.orders.find((o) => o.id === id);
  if (!order) return;
  state.current = JSON.parse(JSON.stringify(order));
  $("navDetail").disabled = false;
  $("detailTitle").textContent = `Order #${order.id}`;
  $("detailStatus").value = order.status;
  $("detailShipping").value = order.shippingFee ?? 0;
  $("emailMessage").value = "";
  $("detailCustomer").innerHTML = `
    <div><b>${order.shipping?.name || ""}</b></div>
    <div>${order.shipping?.email || ""} · ${order.shipping?.phone || ""}</div>
    <div style="margin-top:8px;">${order.shipping?.address || ""}, ${order.shipping?.city || ""} — ${order.shipping?.state || ""}</div>
    ${order.shipping?.note ? `<div style="margin-top:8px;"><em>Note: ${order.shipping.note}</em></div>` : ""}
    <div style="margin-top:8px;">Payment: ${order.payment || "—"}</div>
  `;
  renderDetailItems();
  renderDetailTotals();
  showView("detail");
}

function renderDetailItems() {
  const order = state.current;
  if (!order) return;
  $("detailItems").innerHTML = (order.items || [])
    .map((item, idx) => {
      return `
      <div class="item-row" data-idx="${idx}">
        <div>
          <div class="item-name">${item.name}</div>
          <div class="item-meta">${item.size || "-"} · ${item.color || "-"}</div>
        </div>
        <input type="number" min="1" max="99" data-field="qty" value="${item.qty}" title="Quantity" />
        <input type="number" min="0" step="100" data-field="price" value="${item.price}" title="Unit price" />
        <button class="btn btn-danger" data-remove="${idx}" title="Remove line" type="button">×</button>
      </div>`;
    })
    .join("");

  $("detailItems").querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      const row = input.closest(".item-row");
      const idx = Number(row.dataset.idx);
      const field = input.dataset.field;
      let val = Number(input.value);
      if (field === "qty") val = Math.max(1, Math.min(99, val || 1));
      if (field === "price") val = Math.max(0, val || 0);
      state.current.items[idx][field] = val;
      input.value = val;
      renderDetailTotals();
    });
  });
  $("detailItems").querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.remove);
      if (state.current.items.length <= 1) {
        toast("Keep at least one item");
        return;
      }
      state.current.items.splice(idx, 1);
      renderDetailItems();
      renderDetailTotals();
    });
  });
}

function renderDetailTotals() {
  const order = state.current;
  if (!order) return;
  const subtotal = (order.items || []).reduce((n, i) => n + i.price * i.qty, 0);
  const shipping = Number($("detailShipping").value || 0);
  $("detailTotals").innerHTML = `
    Subtotal: <b>${money(subtotal)}</b><br/>
    Shipping: <b>${money(shipping)}</b><br/>
    Total: <b>${money(subtotal + shipping)}</b>
  `;
}

async function saveItems() {
  if (!state.current) return;
  const btn = $("saveItemsBtn");
  btn.disabled = true;
  try {
    const body = {
      items: state.current.items,
      shippingFee: Number($("detailShipping").value || 0),
    };
    const res = await adminApi(`/api/admin/orders/${encodeURIComponent(state.current.id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    upsertOrder(res.order);
    state.current = JSON.parse(JSON.stringify(res.order));
    $("detailShipping").value = res.order.shippingFee ?? 0;
    renderDetailItems();
    renderDetailTotals();
    toast("Order items saved");
  } catch (err) {
    toast(err.message || "Save failed");
  } finally {
    btn.disabled = false;
  }
}

async function saveStatus(sendEmail) {
  if (!state.current) return;
  const btn = sendEmail ? $("emailCustomerBtn") : $("saveStatusBtn");
  btn.disabled = true;
  try {
    const body = {
      status: $("detailStatus").value,
      shippingFee: Number($("detailShipping").value || 0),
      items: state.current.items,
      sendEmail: !!sendEmail,
      emailMessage: $("emailMessage").value.trim(),
    };
    const res = await adminApi(`/api/admin/orders/${encodeURIComponent(state.current.id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    upsertOrder(res.order);
    state.current = JSON.parse(JSON.stringify(res.order));
    if (sendEmail) {
      const mode = res.email?.mode || "outbox";
      toast(
        res.email?.mail
          ? `Email prepared for ${res.email.mail.to} (${mode})`
          : "Status saved; email result unknown",
      );
    } else {
      toast("Status saved");
    }
    renderDetailTotals();
    renderStats();
  } catch (err) {
    toast(err.message || "Update failed");
  } finally {
    btn.disabled = false;
  }
}

function upsertOrder(order) {
  const i = state.orders.findIndex((o) => o.id === order.id);
  if (i >= 0) state.orders[i] = order;
  else state.orders.unshift(order);
  renderOrdersTable();
}

async function loadProducts() {
  const res = await adminApi("/api/admin/products");
  state.products = res.products || [];
  renderProducts();
}

function renderProducts() {
  const q = ($("productSearch").value || "").trim().toLowerCase();
  const list = state.products.filter((p) => !q || p.name.toLowerCase().includes(q) || p.category.includes(q));
  if (!list.length) {
    $("productsGrid").innerHTML = `<div class="empty">No products found.</div>`;
    return;
  }
  $("productsGrid").innerHTML = list
    .map((p) => {
      return `
      <div class="prod-row" data-id="${p.id}">
        <div>
          <div class="item-name">${p.name}</div>
          <div class="item-meta">${p.category} · ${p.id.slice(0, 8)}…</div>
        </div>
        <input type="number" min="0" step="100" data-price value="${p.price}" />
        <button class="btn btn-primary" data-save>Save</button>
      </div>`;
    })
    .join("");

  $("productsGrid").querySelectorAll("[data-save]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".prod-row");
      const id = row.dataset.id;
      const price = Number(row.querySelector("[data-price]").value || 0);
      btn.disabled = true;
      try {
        const res = await adminApi(`/api/admin/products/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify({ price }),
        });
        const idx = state.products.findIndex((p) => p.id === id);
        if (idx >= 0) state.products[idx] = res.product;
        toast("Price updated");
      } catch (err) {
        toast(err.message || "Update failed");
      } finally {
        btn.disabled = false;
      }
    });
  });
}

async function tryLogin() {
  state.apiBase = $("apiBase").value.trim() || "http://localhost:5050";
  state.key = $("adminKey").value.trim();
  $("loginError").textContent = "";
  if (!state.key) {
    $("loginError").textContent = "Enter the admin key";
    return;
  }
  try {
    await adminApi("/api/admin/orders");
    sessionStorage.setItem("wt_admin_key", state.key);
    localStorage.setItem("wt_admin_api", state.apiBase);
    $("loginView").classList.add("hidden");
    $("appView").classList.remove("hidden");
    await loadOrders();
  } catch (err) {
    $("loginError").textContent = err.message || "Login failed";
  }
}

function wire() {
  $("apiBase").value = state.apiBase;
  if (state.key) $("adminKey").value = state.key;

  $("loginBtn").addEventListener("click", tryLogin);
  $("adminKey").addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryLogin();
  });
  $("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("wt_admin_key");
    state.key = "";
    location.reload();
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      if (btn.dataset.view === "products") {
        showView("products");
        loadProducts().catch((e) => toast(e.message));
      } else if (btn.dataset.view === "detail" && state.current) {
        showView("detail");
      } else {
        showView("orders");
      }
    });
  });

  $("refreshOrders").addEventListener("click", () => loadOrders().catch((e) => toast(e.message)));
  $("orderSearch").addEventListener("input", renderOrdersTable);
  $("statusFilter").addEventListener("change", renderOrdersTable);
  $("backToOrders").addEventListener("click", () => showView("orders"));
  $("saveItemsBtn").addEventListener("click", saveItems);
  $("saveStatusBtn").addEventListener("click", () => saveStatus(false));
  $("emailCustomerBtn").addEventListener("click", () => saveStatus(true));
  $("detailShipping").addEventListener("input", renderDetailTotals);
  $("refreshProducts").addEventListener("click", () => loadProducts().catch((e) => toast(e.message)));
  $("productSearch").addEventListener("input", renderProducts);

  if (state.key) {
    tryLogin();
  }
}

document.addEventListener("DOMContentLoaded", wire);
