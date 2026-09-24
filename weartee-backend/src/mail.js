const fs = require("fs");
const path = require("path");
const https = require("https");

const OUTBOX = path.join(__dirname, "..", "data", "outbox");

const STATUS_COPY = {
  Confirmed: {
    subject: "Your WEARTEE order is confirmed",
    body: "We've received your order and started processing it.",
  },
  Shipped: {
    subject: "Your WEARTEE order is on the way",
    body: "Good news — your order has been shipped.",
  },
  "Out for Delivery": {
    subject: "Your WEARTEE order is out for delivery",
    body: "Your package is out for delivery and should arrive soon.",
  },
  Delivered: {
    subject: "Your WEARTEE order has been delivered",
    body: "Your order was marked as delivered. We hope you love it.",
  },
};

function ensureOutbox() {
  if (!fs.existsSync(OUTBOX)) fs.mkdirSync(OUTBOX, { recursive: true });
}

function formatMoney(n) {
  return "₦" + Number(n || 0).toLocaleString("en-NG");
}

function buildEmail(order, status, customMessage) {
  const st = status || order.status;
  const copy = STATUS_COPY[st] || {
    subject: `Update on your WEARTEE order #${order.id}`,
    body: `Your order status is now: ${st}.`,
  };
  const lines = (order.items || [])
    .map(
      (i) =>
        `• ${i.name} (${i.size || "-"} / ${i.color || "-"}) × ${i.qty} — ${formatMoney(i.price * i.qty)}`,
    )
    .join("\n");

  const text = [
    `Hi ${order.shipping?.name || "there"},`,
    "",
    copy.body,
    customMessage ? `\n${customMessage}\n` : "",
    `Order: #${order.id}`,
    `Status: ${st}`,
    `Total: ${formatMoney(order.total)}`,
    "",
    "Items:",
    lines || "(no items)",
    "",
    "Ship to:",
    `${order.shipping?.address || ""}, ${order.shipping?.city || ""} — ${order.shipping?.state || ""}`,
    `Phone: ${order.shipping?.phone || ""}`,
    "",
    "— WEARTEE",
    "weartee.ng@gmail.com · 09012473305",
  ]
    .filter((x) => x !== undefined)
    .join("\n");

  return {
    to: order.shipping?.email,
    subject: `${copy.subject} (#${order.id})`,
    text,
    status: st,
  };
}

function saveOutbox(mail) {
  ensureOutbox();
  const file = path.join(
    OUTBOX,
    `${Date.now()}_${(mail.to || "unknown").replace(/[^a-z0-9@._-]/gi, "_")}.json`,
  );
  const record = {
    ...mail,
    createdAt: new Date().toISOString(),
    delivery: "outbox",
  };
  fs.writeFileSync(file, JSON.stringify(record, null, 2));
  return { file, record };
}

function sendViaResend(mail) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "WEARTEE <onboarding@resend.dev>";
  if (!key) return Promise.resolve(null);

  const payload = JSON.stringify({
    from,
    to: [mail.to],
    subject: mail.subject,
    text: mail.text,
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "api.resend.com",
        path: "/emails",
        method: "POST",
        headers: {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            body: data,
          });
        });
      },
    );
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.write(payload);
    req.end();
  });
}

async function notifyOrder(order, opts = {}) {
  const status = opts.status || order.status;
  const mail = buildEmail(order, status, opts.message || "");
  if (!mail.to) {
    return { sent: false, error: "Order has no customer email", mail };
  }

  let outboxFile = null;
  try {
    outboxFile = path.basename(saveOutbox(mail).file);
  } catch (err) {
    console.warn("Outbox write failed:", err.message);
  }

  let provider = null;
  if (process.env.RESEND_API_KEY) {
    provider = await sendViaResend(mail);
    if (!provider.ok)
      console.warn(
        "Resend failed:",
        provider.status,
        provider.body || provider.error,
      );
  }

  return {
    sent: !!(provider && provider.ok),
    mode: provider ? (provider.ok ? "resend" : "outbox-fallback") : "outbox",
    outboxFile,
    provider,
    mail: { to: mail.to, subject: mail.subject, status: mail.status },
  };
}

module.exports = { notifyOrder, buildEmail, STATUS_COPY };
