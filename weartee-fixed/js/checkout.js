let currentStep = 1;

function goToStep(step) {
  currentStep = step;
  document.querySelectorAll(".checkout-step").forEach((panel) => {
    panel.hidden = parseInt(panel.dataset.panel, 10) !== step;
  });
  document.querySelectorAll(".step").forEach((el) => {
    const n = parseInt(el.dataset.step, 10);
    el.classList.toggle("active", n === step);
    el.classList.toggle("done", n < step);
    el.querySelector(".step-dot").textContent = n < step ? "✓" : n;
  });
  document.querySelectorAll(".step-line").forEach((line, i, lines) => {
    line.classList.toggle("done", i + 1 < step);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function validateStep(step) {
  let ok = true;
  const mark = (id, valid) => {
    const field = document.getElementById(id).closest(".field");
    field.classList.toggle("invalid", !valid);
    if (!valid) ok = false;
  };
  if (step === 1) {
    mark(
      "fullName",
      document.getElementById("fullName").value.trim().length >= 2,
    );
    mark(
      "email",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        document.getElementById("email").value.trim(),
      ),
    );
    mark("phone", document.getElementById("phone").value.trim().length >= 7);
    mark(
      "address",
      document.getElementById("address").value.trim().length >= 4,
    );
    mark("city", document.getElementById("city").value.trim().length >= 2);
    mark("state", !!document.getElementById("state").value);
  }
  return ok;
}

function getPaymentMethod() {
  const checked = document.querySelector('input[name="payment"]:checked');
  return checked ? checked.value : "Card";
}

function itemsHTML(items) {
  return items
    .map(
      (i) => `
      <div class="review-item">
        <span class="ri-thumb"><img src="${i.image}" alt="${i.name}" data-guard></span>
        <span>
          <span class="ri-name">${i.name}</span><br>
          <span class="ri-meta">${i.size ? "Size " + i.size : ""}${i.color && i.color !== "multi" ? " · " + i.color : ""} · Qty ${i.qty}</span>
        </span>
        <span class="ri-price">${formatPrice(i.price * i.qty)}</span>
      </div>`,
    )
    .join("");
}

function selectedState() {
  const el = document.getElementById("state");
  return el ? el.value : "";
}

function renderSummary() {
  const items = Cart.linesForCheckout();
  document.getElementById("sideItems").innerHTML = itemsHTML(items);
  const subtotal = Cart.lineSubtotal(items);
  const stateName = selectedState();
  const shipping = Cart.lineShipping(items, stateName);
  document.getElementById("sumSubtotal").textContent = formatPrice(subtotal);
  let shipLabel = shipping === 0 ? "Free" : formatPrice(shipping);
  if (shipping > 0 && stateName) shipLabel += ` (${stateName})`;
  if (shipping > 0 && !stateName) shipLabel = "Select state";
  document.getElementById("sumShipping").textContent = shipLabel;
  document.getElementById("sumTotal").textContent = formatPrice(
    subtotal + shipping,
  );

  if (currentStep === 3) {
    document.getElementById("reviewItems").innerHTML = itemsHTML(items);
    const f = (id) => document.getElementById(id).value.trim();
    document.getElementById("reviewShipping").innerHTML =
      `${f("fullName")}<br>${f("address")}, ${f("city")} — ${document.getElementById("state").value}<br>${f("phone")} · ${f("email")}`;
    document.getElementById("reviewPayment").textContent =
      getPaymentMethod() === "Card" ? "Card (via Paystack)" : getPaymentMethod();
  }
  guardImages(document);
}

async function submitOrder(payload, btn, btnLabel) {
  let order = null;
  try {
    if (!window.WearteeAPI)
      throw new Error("Shop is not connected to the server");
    const res = await window.WearteeAPI.api("/api/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    order = res.order;
  } catch (err) {
    console.warn("Order failed", err);
    toast(
      err.status
        ? err.message
        : "Could not reach the server. Please check your connection and try again.",
    );
  }

  if (!order) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = btnLabel;
    }
    return;
  }

  Orders.add(order);

  const profile = Profile.get();
  profile.name = order.shipping.name;
  profile.email = order.shipping.email;
  profile.phone = order.shipping.phone;
  profile.address = order.shipping.address;
  profile.city = order.shipping.city;
  profile.state = order.shipping.state;
  Profile.save(profile);

  const buyNow = Cart.isBuyNow() && Cart.pendingCheckout();
  if (buyNow) Cart.clearPendingCheckout();
  else Cart.clear();
  window.location.href = `order-details.html?id=${order.id}&placed=1`;
}

async function placeOrder() {
  const items = Cart.linesForCheckout();
  if (!items.length) return;
  const btn = document.getElementById("placeOrderBtn");
  const btnLabel = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Placing order…";
  }

  const f = (id) => document.getElementById(id).value.trim();
  const payload = {
    items: items.map((i) => ({
      id: i.id,
      size: i.size,
      color: i.color,
      qty: i.qty,
    })),
    shipping: {
      name: f("fullName"),
      email: f("email"),
      phone: f("phone"),
      address: f("address"),
      city: f("city"),
      state: document.getElementById("state").value,
      note: f("note"),
    },
    payment: getPaymentMethod(),
  };

  if (payload.payment !== "Card") {
    return submitOrder(payload, btn, btnLabel);
  }

  if (!window.PaystackPop || !window.WEARTEE_PAYSTACK_PUBLIC_KEY) {
    toast("Card payment isn't set up yet — please choose another method.");
    if (btn) {
      btn.disabled = false;
      btn.textContent = btnLabel;
    }
    return;
  }

  const subtotal = Cart.lineSubtotal(items);
  const shipping = Cart.lineShipping(items, payload.shipping.state);
  const totalNaira = subtotal + shipping;
  const reference =
    "wt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

  const handler = PaystackPop.setup({
    key: window.WEARTEE_PAYSTACK_PUBLIC_KEY,
    email: payload.shipping.email,
    amount: Math.round(totalNaira * 100), // Paystack expects kobo
    currency: "NGN",
    ref: reference,
    callback: function (response) {
      payload.paystackReference = response.reference;
      submitOrder(payload, btn, btnLabel);
    },
    onClose: function () {
      if (btn) {
        btn.disabled = false;
        btn.textContent = btnLabel;
      }
      toast("Payment window closed — your card was not charged.");
    },
  });
  handler.openIframe();
}

document.addEventListener("DOMContentLoaded", () => {
  if (Cart.linesForCheckout().length === 0) {
    window.location.replace("cart.html");
    return;
  }

  const profile = Profile.get();
  ["fullName", "email", "phone", "address", "city"].forEach((id) => {
    const key = { fullName: "name" }[id] || id;
    if (profile[key]) document.getElementById(id).value = profile[key];
  });
  if (profile.state) document.getElementById("state").value = profile.state;

  document.getElementById("payOptions").addEventListener("change", () => {
    document.querySelectorAll(".pay-option").forEach((opt) => {
      opt.classList.toggle("active", opt.querySelector("input").checked);
    });
  });

  document.querySelectorAll("[data-next]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const from = parseInt(btn.dataset.next, 10);
      if (!validateStep(from)) {
        toast("Please complete the highlighted fields");
        return;
      }
      goToStep(from + 1);
      renderSummary();
    });
  });

  document.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", () =>
      goToStep(parseInt(btn.dataset.back, 10) - 1),
    );
  });

  document.querySelectorAll("[data-edit]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      goToStep(parseInt(link.dataset.edit, 10));
    });
  });

  document.getElementById("checkoutForm").addEventListener("submit", (e) => {
    e.preventDefault();
    placeOrder();
  });

  const stateEl = document.getElementById("state");
  if (stateEl) {
    stateEl.addEventListener("change", renderSummary);
  }

  goToStep(1);
  renderSummary();
});
