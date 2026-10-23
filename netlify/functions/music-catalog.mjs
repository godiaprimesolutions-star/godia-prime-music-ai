import { json, env } from "./_shared.mjs";

export default async (event) => {
if (event.httpMethod !== "GET") {
return json(405, {
success: false,
message: "Use GET."
});
}

const catalogUrl = env("MUSIC_LIBRARY_API_URL");
const catalogKey = env("MUSIC_LIBRARY_API_KEY");

if (!catalogUrl || !catalogKey) {
return json(503, {
success: false,
message: "Music catalogue storage is not configured in Netlify."
});
}

let endpoint;

try {
endpoint = new URL(catalogUrl);

if (endpoint.protocol !== "https:") {
  throw new Error("HTTPS required");
}

} catch {
return json(503, {
success: false,
message: "Configure a valid HTTPS MUSIC_LIBRARY_API_URL."
});
}

try {
const response = await fetch(endpoint.toString(), {
method: "GET",
headers: {
Authorization: "Bearer ${catalogKey}",
Accept: "application/json"
}
});

if (!response.ok) {
  return json(502, {
    success: false,
    message: "The music storage service could not return the catalogue.",
    providerStatus: response.status
  });
}

const data = await response.json();

const songs = Array.isArray(data)
  ? data
  : Array.isArray(data.songs)
    ? data.songs
    : [];

const catalogue = songs.map((song) => ({
  id: String(song.id || song.songId || ""),
  title: String(song.title || "Untitled song"),
  artist: String(song.artist || "GODIA PRIME MUSIC AI"),
  price: Number.isFinite(Number(song.price))
    ? Number(song.price)
    : 0,
  currency: String(song.currency || "KES"),
  mimeType: String(song.mimeType || "audio/mpeg")
}));

return json(200, {
  success: true,
  application: "GODIA PRIME MUSIC AI",
  count: catalogue.length,
  songs: catalogue
});

} catch {
return json(502, {
success: false,
message: "Could not connect to the music catalogue service."
});
}
};
