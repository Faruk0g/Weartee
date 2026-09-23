function refreshAccountUI() {
  const profile = Profile.get();
  const name = profile.name || "Guest Shopper";
  document.getElementById("sideAvatar").textContent = initialsOf(profile.name);
  document.getElementById("sideName").textContent = name;
  document.getElementById("sideEmail").textContent = profile.email || "Not set yet";
  document.getElementById("profileAvatar").textContent = initialsOf(profile.name);
  document.getElementById("profileName").textContent = name;
  document.getElementById("profileEmail").textContent = profile.email || "Not set yet";
}

document.addEventListener("DOMContentLoaded", () => {
  const profile = Profile.get();
  const fields = {
    fullName: profile.name || "",
    email: profile.email || "",
    phone: profile.phone || "",
    address: profile.address || "",
    city: profile.city || "",
    stateInput: profile.state || "",
  };
  Object.entries(fields).forEach(([id, value]) => {
    document.getElementById(id).value = value;
  });
  refreshAccountUI();

  document.getElementById("profileForm").addEventListener("submit", (e) => {
    e.preventDefault();

    let ok = true;
    const mark = (id, valid) => {
      document.getElementById(id).closest(".field").classList.toggle("invalid", !valid);
      if (!valid) ok = false;
    };
    mark("fullName", document.getElementById("fullName").value.trim().length >= 2);
    mark("email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(document.getElementById("email").value.trim()));
    mark("phone", document.getElementById("phone").value.trim().length >= 7);
    if (!ok) {
      toast("Please complete the highlighted fields");
      return;
    }

    const next = {
      name: document.getElementById("fullName").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      address: document.getElementById("address").value.trim(),
      city: document.getElementById("city").value.trim(),
      state: document.getElementById("stateInput").value.trim(),
    };
    Profile.save(next);
    if (window.WearteeAPI && window.WearteeAPI.Auth.token()) {
      window.WearteeAPI.api("/api/me", { method: "PUT", body: JSON.stringify(next) }).catch((err) => {
        console.warn("Profile sync failed", err);
      });
    }
    refreshAccountUI();
    toast("Your changes have been saved");
  });

  const logout = document.getElementById("logoutBtn");
  if (logout) {
    logout.addEventListener("click", () => {
      Profile.clear();
      toast("You've been logged out");
      setTimeout(() => window.location.reload(), 500);
    });
  }
});
