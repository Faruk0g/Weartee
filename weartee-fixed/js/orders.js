function renderAccountSide() {
  const profile = Profile.get();
  document.getElementById("userAvatar").textContent = initialsOf(profile.name);
  document.getElementById("userName").textContent = profile.name || "Guest Shopper";
  document.getElementById("userEmail").textContent = profile.email || "Not set yet";
}

function renderOrders() {
  const orders = Orders.all();
  const content = document.getElementById("ordersContent");
  document.getElementById("ordersSub").textContent =
    orders.length === 0 ? "" : `${orders.length} order${orders.length === 1 ? "" : "s"} placed with WEARTEE.`;

  if (orders.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="es-ico">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8V21H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
        </div>
        <h3>No orders yet</h3>
        <p>When you place an order, it will show up here with live status updates.</p>
        <a href="shop.html" class="btn btn-primary btn-sm">Start Shopping</a>
      </div>`;
    return;
  }

  const rows = orders
    .map(
      (o) => `
      <tr>
        <td><a class="order-id-link" href="order-details.html?id=${o.id}">#${o.id}</a></td>
        <td>${formatDate(o.date)}</td>
        <td>${o.items.reduce((n, i) => n + i.qty, 0)} item${o.items.reduce((n, i) => n + i.qty, 0) === 1 ? "" : "s"}</td>
        <td>${statusBadge(o.status)}</td>
        <td style="font-weight:600;">${formatPrice(o.total)}</td>
        <td><a class="btn btn-secondary btn-sm" href="order-details.html?id=${o.id}">View</a></td>
      </tr>`
    )
    .join("");

  const cards = orders
    .map(
      (o) => `
      <div class="order-card">
        <div class="oc-head">
          <span class="oc-id">#${o.id}</span>
          ${statusBadge(o.status)}
        </div>
        <div class="oc-meta">${formatDate(o.date)} · ${o.items.reduce((n, i) => n + i.qty, 0)} items</div>
        <div class="oc-foot">
          <b>${formatPrice(o.total)}</b>
          <a class="btn btn-secondary btn-sm" href="order-details.html?id=${o.id}">View</a>
        </div>
      </div>`
    )
    .join("");

  content.innerHTML = `
    <table class="orders-table">
      <thead>
        <tr><th>Order</th><th>Date</th><th>Items</th><th>Status</th><th>Total</th><th></th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="order-cards">${cards}</div>`;
}

document.addEventListener("DOMContentLoaded", async () => {
  renderAccountSide();
  if (window.WearteeAPI) {
    try {
      const profile = Profile.get();
      const q = profile.email ? ("?email=" + encodeURIComponent(profile.email)) : "";
      const res = await window.WearteeAPI.api("/api/orders" + q);
      if (Array.isArray(res.orders)) Orders.save(res.orders);
    } catch (err) {
      console.warn("Could not load remote orders", err);
    }
  }
  renderOrders();

  const logout = document.getElementById("logoutBtn");
  if (logout) {
    logout.addEventListener("click", () => {
      Profile.clear();
      toast("You've been logged out");
      setTimeout(() => window.location.reload(), 500);
    });
  }
});
