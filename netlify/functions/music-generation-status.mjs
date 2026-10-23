import { json, env } from "./_shared.mjs";

export default async (event) => {
if (event.httpMethod !== "GET") {
return json(405, {
success: false,
message: "Use GET."
});
}

const token = env("HF_TOKEN");
const endpoint = env("HF_MUSIC_ENDPOINT");

let validEndpoint = false;

if (endpoint) {
try {
const parsed = new URL(endpoint);
validEndpoint = parsed.protocol === "https:";
} catch {
validEndpoint = false;
}
}

const configured = Boolean(token && validEndpoint);

return json(200, {
success: true,
application: "GODIA PRIME MUSIC AI",
service: "Music Generation",
status: configured ? "configured" : "needs_configuration",
checks: {
tokenPresent: Boolean(token),
endpointPresent: Boolean(endpoint),
endpointUsesHttps: validEndpoint
},
message: configured
? "Required music-generation settings are present. The actual model connection has not been tested."
: "Add a valid HF_TOKEN and HTTPS HF_MUSIC_ENDPOINT in Netlify environment variables.",
timestamp: new Date().toISOString()
});
};
