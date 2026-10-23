import { json, readJson, env } from "./_shared.mjs";

export default async (event) => {
if (event.httpMethod !== "POST") {
return json(405, {
success: false,
message: "Method not allowed. Use POST."
});
}

const input = readJson(event);

const songId = String(input?.songId || "").trim();
const purchaseReference = String(
input?.purchaseReference || ""
).trim();

if (!songId || songId.length > 200) {
return json(400, {
success: false,
message: "A valid song ID is required."
});
}

if (!purchaseReference || purchaseReference.length > 300) {
return json(400, {
success: false,
message: "A valid purchase reference is required."
});
}

const serviceUrl = env("MUSIC_DOWNLOAD_API_URL");
const serviceKey = env("MUSIC_DOWNLOAD_API_KEY");

if (!serviceUrl || !serviceKey) {
return json(503, {
success: false,
message:
"Download service is not configured. Please configure MUSIC_DOWNLOAD_API_URL and MUSIC_DOWNLOAD_API_KEY."
});
}

let endpoint;

try {
endpoint = new URL(serviceUrl);

if (endpoint.protocol !== "https:") {
  throw new Error("HTTPS required");
}

} catch {
return json(503, {
success: false,
message:
"The download service must use a valid HTTPS URL."
});
}

try {
const response = await fetch(endpoint.toString(), {
method: "POST",
headers: {
Authorization: "Bearer ${serviceKey}",
"Content-Type": "application/json",
Accept: "application/json"
},
body: JSON.stringify({
action: "authorize_download",
songId,
purchaseReference
})
});

if (!response.ok) {
  return json(502, {
    success: false,
    message:
      "The download service could not verify this purchase."
  });
}

const data = await response.json();

if (
  data.paid !== true ||
  data.authorized !== true ||
  typeof data.downloadUrl !== "string"
) {
  return json(403, {
    success: false,
    message:
      "Payment has not been verified, or this download is not authorized."
  });
}

let downloadUrl;

try {
  downloadUrl = new URL(data.downloadUrl);

  if (downloadUrl.protocol !== "https:") {
    throw new Error("HTTPS required");
  }
} catch {
  return json(502, {
    success: false,
    message:
      "The download service returned an invalid download link."
  });
}

return json(200, {
  success: true,
  message: "Download authorized.",
  songId,
  downloadUrl: downloadUrl.toString()
});

} catch {
return json(502, {
success: false,
message:
"Unable to connect to the secure download service."
});
}
};
