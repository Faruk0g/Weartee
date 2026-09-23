/* WEARTEE API client. Load before main.js.
   window.WEARTEE_API = "http://localhost:5050";
*/
const API_BASE = (window.WEARTEE_API || localStorage.getItem("wt_api") || "http://localhost:5050").replace(/\/$/, "");

const Auth = {
  token() {
    return localStorage.getItem("wt_token") || "";
  },
  setToken(token) {
    if (token) localStorage.setItem("wt_token", token);
    else localStorage.removeItem("wt_token");
  },
};

const CartId = {
  get() {
    let id = localStorage.getItem("wt_cart_id") || "";
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID().replace(/-/g, "")) ||
        String(Date.now()) + Math.random().toString(16).slice(2);
      localStorage.setItem("wt_cart_id", id);
    }
    return id;
  },
  set(id) {
    if (id) localStorage.setItem("wt_cart_id", id);
  },
};

async function api(path, options = {}) {
  const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
  if (Auth.token()) headers.Authorization = "Bearer " + Auth.token();
  headers["x-cart-id"] = CartId.get();
  const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err = new Error((body && body.error) || res.statusText || "Request failed");
    err.status = res.status;
    err.body = body;
    throw err;
  }
  if (body && body.cartId) CartId.set(body.cartId);
  return body;
}

window.WearteeAPI = { API_BASE, Auth, CartId, api };
