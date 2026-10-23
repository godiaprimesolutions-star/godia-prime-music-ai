import { json, readJson, env } from "./_shared.mjs";

export default async (event) => {
if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
return json(405, {
success: false,
message: "Use GET or POST."
});
}

const storageUrl = env("MUSIC_LIBRARY_API_URL");
const storageKey = env("MUSIC_LIBRARY_API_KEY");

if (!storageUrl || !storageKey) {
return json(503, {
success: false,
message:
"Music library storage is not configured. Add MUSIC_LIBRARY_API_URL and MUSIC_LIBRARY_API_KEY to Netlify environment variables."
});
}

if (!/^https:///i.test(storageUrl)) {
return json(503, {
success: false,
message: "The music library API URL must use HTTPS."
});
}

try {
const url = new URL(storageUrl);

if (url.protocol !== "https:") {
  return json(503, {
    success: false,
    message: "The music library API URL must use HTTPS."
  });
}

if (event.httpMethod === "GET") {
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${storageKey}`,
      Accept: "application/json"
    }
  });

  const text = await response.text();

  if (!response.ok) {
    return json(502, {
      success: false,
      message: "Could not retrieve the music library."
    });
  }

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    return json(502, {
      success: false,
      message: "The music storage service returned invalid JSON."
    });
  }

  return json(200, {
    success: true,
    songs: Array.isArray(data) ? data : data.songs || []
  });
}

const input = readJson(event);

const title = String(input?.title || "").trim();
const artist = String(input?.artist || "").trim();
const audioUrl = String(input?.audioUrl || "").trim();
const price = Number(input?.price);

if (!title || !audioUrl || !Number.isFinite(price) || price < 0) {
  return json(400, {
    success: false,
    message: "Provide a song title, audio URL, and valid price."
  });
}

let parsedAudioUrl;

try {
  parsedAudioUrl = new URL(audioUrl);
} catch {
  return json(400, {
    success: false,
    message: "Enter a valid audio URL."
  });
}

if (parsedAudioUrl.protocol !== "https:") {
  return json(400, {
    success: false,
    message: "The audio URL must use HTTPS."
  });
}

const response = await fetch(url.toString(), {
  method: "POST",
  headers: {
    Authorization: `Bearer ${storageKey}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  },
  body: JSON.stringify({
    title,
    artist,
    audioUrl: parsedAudioUrl.toString(),
    price,
    currency: "KES"
  })
});

if (!response.ok) {
  return json(502, {
    success: false,
    message: "The music storage service could not save the song."
  });
}

const result = await response.json().catch(() => ({}));

return json(201, {
  success: true,
  message: "Song submitted to the configured music storage service.",
  song: result
});

} catch {
return json(502, {
success: false,
message: "Could not connect to the music storage service."
});
}
};
