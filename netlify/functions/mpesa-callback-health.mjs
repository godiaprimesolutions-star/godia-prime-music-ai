import { json, env } from "./_shared.mjs";

export default async (event) => {
if (event.httpMethod !== "GET") {
return json(405, {
success: false,
message: "Use GET."
});
}

const callbackUrl = env("MPESA_CALLBACK_URL");

let callbackConfigured = false;

if (callbackUrl) {
try {
const parsed = new URL(callbackUrl);
callbackConfigured = parsed.protocol === "https:";
} catch {
callbackConfigured = false;
}
}

return json(200, {
success: true,
application: "GODIA PRIME MUSIC AI",
endpoint: "mpesa-callback-health",
status: "running",
callbackUrlConfigured: callbackConfigured,
timestamp: new Date().toISOString(),
note: "This endpoint checks configuration only. It does not confirm that Safaricom can reach the callback or that any payment has succeeded."
});
};
