import { json, readJson, env } from "./_shared.mjs";

export default async (event) => {
if (event.httpMethod !== "POST") {
return json(405, {
success: false,
message: "Use POST."
});
}

const input = readJson(event);

const customerId = String(input?.customerId || "").trim();

if (!customerId || customerId.length > 200) {
return json(400, {
success: false,
message: "A valid customer ID is required."
});
}

/*

* This endpoint must not trust a customer ID supplied by the browser.
* A production implementation must authenticate the customer and
* obtain their identity from a verified session or access token.
  */

const purchasesUrl = env("MUSIC_PURCHASES_API_URL");
const purchasesKey = env("MUSIC_PURCHASES_API_KEY");

if (!purchasesUrl || !purchasesKey) {
return json(503, {
success: false,
message: "Secure purchase history storage is not configured."
});
}

let endpoint;

try {
endpoint = new URL(purchasesUrl);

if (endpoint.protocol !== "https:") {
  throw new Error("HTTPS required");
}

} catch {
return json(503, {
success: false,
message: "Configure a valid HTTPS MUSIC_PURCHASES_API_URL."
});
}

try {
const response = await fetch(endpoint.toString(), {
method: "POST",
headers: {
Authorization: "Bearer ${purchasesKey}",
"Content-Type": "application/json",
Accept: "application/json"
},
body: JSON.stringify({
action: "list_verified_purchases",
customerId
})
});

if (!response.ok) {
  return json(502, {
    success: false,
    message: "The purchase service could not retrieve purchase history."
  });
}

const data = await response.json();

if (!Array.isArray(data.purchases)) {
  return json(502, {
    success: false,
    message: "The purchase service returned an invalid response."
  });
}

const purchases = data.purchases.map((purchase) => ({
  purchaseId: String(purchase.purchaseId || ""),
  songId: String(purchase.songId || ""),
  title: String(purchase.title || "Music purchase"),
  amount: Number(purchase.amount || 0),
  currency: String(purchase.currency || "KES"),
  status: purchase.verified === true ? "verified" : "unverified",
  purchasedAt: purchase.purchasedAt || null
}));

return json(200, {
  success: true,
  count: purchases.length,
  purchases
});

} catch {
return json(502, {
success: false,
message: "Could not connect to the purchase history service."
});
}
};
