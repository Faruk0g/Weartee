document.addEventListener("DOMContentLoaded", () => {
  // Hero images: pick two visually strong pieces (falls back to branded placeholder)
  const heroPicks = [
    products.find((p) => p.name.includes("Matching")),
    products.find((p) => p.name.includes("Slitted")),
  ];
  const img1 = document.getElementById("heroImg1");
  const img2 = document.getElementById("heroImg2");
  if (img1) img1.src = heroPicks[0] ? heroPicks[0].image : PLACEHOLDER;
  if (img2) img2.src = heroPicks[1] ? heroPicks[1].image : PLACEHOLDER;
  guardImages(document);

  // Category strip
  const icons = {
    tops: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 6.6 16 4.5a4.4 4.4 0 0 1-8 0L3.6 6.6 2 11l3 1 .8-2.4V20h12.4V9.6L19 12l3-1z"/></svg>`,
    dresses: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l-1 4 3 8 1 6H6l1-6 3-8z"/><path d="M12 7v4"/></svg>`,
    sets: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="7" y="13" width="10" height="7" rx="1.5"/></svg>`,
    skirts: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 18H2z"/><path d="M8 8h8"/></svg>`,
    bottoms: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h8v5l2 13H6L8 8z"/><path d="M9.5 12h5"/></svg>`,
  };
  document.getElementById("catStrip").innerHTML = CATEGORIES.map((c) => {
    const count = products.filter((p) => p.category === c.slug).length;
    return `
      <a class="cat-card" href="shop.html?category=${c.slug}">
        <span class="cat-ico">${icons[c.slug] || ""}</span>
        <b>${c.label}</b>
        <span>${count} styles</span>
      </a>`;
  }).join("");

  const best = [...products].sort((a, b) => b.rating.count - a.rating.count).slice(0, 10);
  const newest = [...products].slice(-10).reverse();
  document.getElementById("bestCarousel").innerHTML = best.map(productCard).join("");
  document.getElementById("newCarousel").innerHTML = newest.map(productCard).join("");

  document.querySelectorAll("[data-car]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const el = document.getElementById(btn.dataset.car);
      const step = el.clientWidth * 0.8;
      el.scrollBy({ left: btn.classList.contains("next") ? step : -step, behavior: "smooth" });
    });
  });
});
