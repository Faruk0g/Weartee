function renderCart() {
  const items = Cart.all();
  const list = document.getElementById("cartList");

  if (items.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="es-ico">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        </div>
        <h3>Your cart is empty</h3>
        <p>Fill it with pieces that tell your story.</p>
        <a href="shop.html" class="btn btn-primary btn-sm">Start Shopping</a>
      </div>`;
    document.getElementById("checkoutBtn").style.display = "none";
  } else {
    document.getElementById("checkoutBtn").style.display = "";
    list.innerHTML = items
      .map(
        (item, i) => `
      <div class="cart-item">
        <a class="ci-media" href="product.html?id=${item.id}"><img src="${item.image}" alt="${item.name}" data-guard></a>
        <div class="ci-body">
          <a class="ci-name" href="product.html?id=${item.id}">${item.name}</a>
          <span class="ci-meta">${item.size ? "Size " + item.size : ""}${item.color && item.color !== "multi" ? " · " + item.color : ""}</span>
          <span class="ci-price">${formatPrice(item.price)}</span>
          <div class="ci-row">
            <div class="qty-stepper">
              <button class="qty-btn" data-minus="${i}" aria-label="Decrease quantity">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></svg>
              </button>
              <span class="qty-num">${item.qty}</span>
              <button class="qty-btn" data-plus="${i}" aria-label="Increase quantity">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            </div>
            <button class="ci-remove" data-remove="${i}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              Remove
            </button>
          </div>
        </div>
        <div class="ci-right">
          <span class="ci-line-total">${formatPrice(item.price * item.qty)}</span>
        </div>
      </div>`
      )
      .join("");
  }

  const count = Cart.count();
  document.getElementById("cartSub").textContent =
    count === 0 ? "Nothing here yet." : `${count} item${count === 1 ? "" : "s"} in your cart`;

  const subtotal = Cart.subtotal();
  const shipping = Cart.shipping();
  document.getElementById("sumSubtotal").textContent = formatPrice(subtotal);
  document.getElementById("sumShipping").textContent = shipping === 0 ? "Free" : formatPrice(shipping);
  document.getElementById("sumTotal").textContent = formatPrice(subtotal + shipping);

  const bar = document.getElementById("freeShipBar");
  if (subtotal === 0) {
    bar.style.display = "none";
  } else if (subtotal >= FREE_SHIPPING_THRESHOLD) {
    bar.style.display = "";
    bar.textContent = "You've unlocked free shipping.";
  } else {
    bar.style.display = "";
    bar.textContent = `Add ${formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} more for free shipping.`;
  }

  guardImages(document);
}

document.addEventListener("DOMContentLoaded", () => {
  renderCart();

  document.getElementById("cartList").addEventListener("click", (e) => {
    const minus = e.target.closest("[data-minus]");
    const plus = e.target.closest("[data-plus]");
    const remove = e.target.closest("[data-remove]");
    if (minus) {
      const items = Cart.all();
      Cart.updateQty(parseInt(minus.dataset.minus, 10), items[parseInt(minus.dataset.minus, 10)].qty - 1);
      renderCart();
    } else if (plus) {
      const items = Cart.all();
      Cart.updateQty(parseInt(plus.dataset.plus, 10), items[parseInt(plus.dataset.plus, 10)].qty + 1);
      renderCart();
    } else if (remove) {
      Cart.remove(parseInt(remove.dataset.remove, 10));
      toast("Item removed from cart");
      renderCart();
    }
  });

  document.addEventListener("cart:changed", renderCart);

  const checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => Cart.clearPendingCheckout());
  }
});
