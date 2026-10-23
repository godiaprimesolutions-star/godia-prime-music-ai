import { json, readJson, env } from "./_shared.mjs";

export default async (event) => {
if (event.httpMethod !== "POST") {
return json(405, { message: "Use POST." });
}

const input = readJson(event);
const phone = String(input?.phone || "").replace(/\s+/g, "");
const amount = Number(input?.amount);
const songId = String(input?.songId || "").trim();

if (!/^254[17]\d{8}$/.test(phone)) {
return json(400, {
message: "Enter a valid Kenyan phone number in the format 2547XXXXXXXX or 2541XXXXXXXX."
});
}

if (!Number.isInteger(amount) || amount < 1 || amount > 150000) {
return json(400, {
message: "Enter a valid payment amount in KES."
});
}

if (!songId || songId.length > 100) {
return json(400, {
message: "A valid song ID is required."
});
}

const consumerKey = env("MPESA_CONSUMER_KEY");
const consumerSecret = env("MPESA_CONSUMER_SECRET");
const shortcode = env("MPESA_SHORTCODE");
const passkey = env("MPESA_PASSKEY");
const callbackUrl = env("MPESA_CALLBACK_URL");
const environment = (env("MPESA_ENVIRONMENT") || "sandbox").toLowerCase();

if (
!consumerKey ||
!consumerSecret ||
!shortcode ||
!passkey ||
!callbackUrl
) {
return json(503, {
message: "M-Pesa is not configured. Add the required Daraja environment variables in Netlify."
});
}

if (!/^https:///i.test(callbackUrl)) {
return json(503, {
message: "MPESA_CALLBACK_URL must be a public HTTPS URL."
});
}

if (!["sandbox", "production"].includes(environment)) {
return json(503, {
message: "MPESA_ENVIRONMENT must be sandbox or production."
});
}

const apiBase = environment === "production"
? "https://api.safaricom.co.ke"
: "https://sandbox.safaricom.co.ke";

try {
const authResponse = await fetch(
"${apiBase}/oauth/v1/generate?grant_type=client_credentials",
{
headers: {
Authorization: "Basic " +
Buffer.from("${consumerKey}:${consumerSecret}").toString("base64")
}
}
);

const authData = await authResponse.json();

if (!authResponse.ok || !authData.access_token) {
  return json(502, {
    message: "Could not authenticate with Safaricom Daraja."
  });
}

const timestamp = new Date()
  .toISOString()
  .replace(/[^0-9]/g, "")
  .slice(0, 14);

const password = Buffer.from(
  `${shortcode}${passkey}${timestamp}`
).toString("base64");

const stkResponse = await fetch(
  `${apiBase}/mpesa/stkpush/v1/processrequest`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authData.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: "GODIAPRIME",
      TransactionDesc: `Music ${songId}`.slice(0, 100)
    })
  }
);

const stkData = await stkResponse.json();

if (!stkResponse.ok || stkData.ResponseCode !== "0") {
  return json(502, {
    message: stkData.errorMessage ||
      stkData.ResponseDescription ||
      "Safaricom could not initiate the payment."
  });
}

return json(200, {
  message: "STK Push request submitted. Check your phone to complete payment.",
  checkoutRequestID: stkData.CheckoutRequestID,
  merchantRequestID: stkData.MerchantRequestID,
  responseCode: stkData.ResponseCode,
  songId,
  amount,
  currency: "KES",
  tillNumber: "1692851"
});

} catch {
return json(502, {
message: "Unable to contact Safaricom. Please try again later."
});
}
};
