const STATUS_FLOW = ["Confirmed", "Shipped", "Out for Delivery", "Delivered"];

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  let order = Orders.find(id);

  if (id && window.WearteeAPI) {
    const email =
      (order && order.shipping && order.shipping.email) ||
      params.get("email") ||
      Profile.get().email ||
      "";
    if (email) {
      try {
        const res = await window.WearteeAPI.api(
          "/api/orders/" +
            encodeURIComponent(id) +
            "?email=" +
            encodeURIComponent(email),
        );
        if (res.order) {
          order = res.order;
          Orders.add(order);
        }
      } catch (err) {
        console.warn("Remote order lookup failed", err);
      }
    }
  }

  if (!order) {
    document.getElementById("odGrid").innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="es-ico">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        </div>
        <h3>Order not found</h3>
        <p>We couldn't find this order. It may have been placed in another browser, or the email doesn't match.</p>
        <a href="orders.html" class="btn btn-primary btn-sm">View My Orders</a>
      </div>`;
    return;
  }

  document.title = `Order #${order.id} — WEARTEE`;
  document.getElementById("crumbOrder").textContent = `#${order.id}`;
  document.getElementById("odTitle").textContent = `Order #${order.id}`;
  document.getElementById("odDate").textContent =
    `Placed ${formatDate(order.date)}`;
  document.getElementById("odStatus").innerHTML = statusBadge(order.status);

  if (params.get("placed") === "1") {
    document.getElementById("successBanner").innerHTML = `
      <div class="success-banner">
        <span class="sb-ico">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.1V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
        </span>
        <div>
          <h3>Thank you — your order is confirmed!</h3>
          <p>We've sent the details to ${order.shipping.email}. You'll get an update as soon as it ships.</p>
        </div>
      </div>`;
  }

  // Timeline
  const currentIndex = Math.max(0, STATUS_FLOW.indexOf(order.status));
  document.querySelectorAll("#timeline .tl-step").forEach((step, i) => {
    step.classList.toggle("done", i < currentIndex);
    step.classList.toggle("current", i === currentIndex);
    const dateEl = document.getElementById("tlDate" + (i + 1));
    if (i <= currentIndex) {
      dateEl.textContent = formatDate(order.date);
    }
  });

  // Items
  document.getElementById("odItems").innerHTML = order.items
    .map(
      (i) => `
      <div class="od-item">
        <a class="oi-thumb" href="product.html?id=${i.id}"><img src="${i.image}" alt="${i.name}" data-guard></a>
        <div>
          <a class="oi-name" href="product.html?id=${i.id}">${i.name}</a>
          <div class="oi-meta">${i.size ? "Size " + i.size : ""}${i.color && i.color !== "multi" ? " · " + i.color : ""} · Qty ${i.qty}</div>
        </div>
        <div class="oi-price"><b>${formatPrice(i.price * i.qty)}</b><span>${formatPrice(i.price)} each</span></div>
      </div>`,
    )
    .join("");

  document.getElementById("odAddress").innerHTML =
    `${order.shipping.name}<br>${order.shipping.address}, ${order.shipping.city} — ${order.shipping.state}<br>${order.shipping.phone}` +
    (order.shipping.note
      ? `<br><em style="color:var(--muted);">Note: ${order.shipping.note}</em>`
      : "");

  document.getElementById("odPayment").textContent =
    order.payment === "Card"
      ? "Card payment (charged on order)"
      : order.payment;

  const itemCount = order.items.reduce((n, i) => n + i.qty, 0);
  document.getElementById("sumItemsLabel").textContent = `Items (${itemCount})`;
  document.getElementById("sumItems").textContent = formatPrice(order.subtotal);
  document.getElementById("sumSubtotal").textContent = formatPrice(
    order.subtotal,
  );
  document.getElementById("sumShipping").textContent =
    order.shippingFee === 0 ? "Free" : formatPrice(order.shippingFee);
  document.getElementById("sumTotal").textContent = formatPrice(order.total);

  guardImages(document);
});
