import { json, readJson, env } from "./_shared.mjs";

export default async (event) => {
if (event.httpMethod !== "POST") {
return json(405, {
success: false,
message: "Use POST."
});
}

const input = readJson(event);

const title = String(input?.title || "").trim();
const artist = String(input?.artist || "").trim();
const audioBase64 = String(input?.audioBase64 || "").trim();
const mimeType = String(input?.mimeType || "").trim().toLowerCase();
const price = Number(input?.price ?? 0);

if (!title || title.length > 150) {
return json(400, {
success: false,
message: "Enter a song title of up to 150 characters."
});
}

if (artist.length > 150) {
return json(400, {
success: false,
message: "Artist name must not exceed 150 characters."
});
}

if (!audioBase64) {
return json(400, {
success: false,
message: "Select an audio file to upload."
});
}

if (!Number.isFinite(price) || price < 0 || price > 150000) {
return json(400, {
success: false,
message: "Enter a valid price in Kenyan shillings."
});
}

const allowedTypes = [
"audio/mpeg",
"audio/mp3",
"audio/wav",
"audio/ogg",
"audio/mp4",
"audio/aac",
"audio/x-m4a"
];

if (!allowedTypes.includes(mimeType)) {
return json(400, {
success: false,
message: "Supported formats include MP3, WAV, OGG, M4A and AAC."
});
}

const storageUrl = env("MUSIC_UPLOAD_API_URL");
const storageKey = env("MUSIC_UPLOAD_API_KEY");

if (!storageUrl || !storageKey) {
return json(503, {
success: false,
message: "Configure MUSIC_UPLOAD_API_URL and MUSIC_UPLOAD_API_KEY in Netlify."
});
}

let parsedStorageUrl;

try {
parsedStorageUrl = new URL(storageUrl);
} catch {
return json(503, {
success: false,
message: "MUSIC_UPLOAD_API_URL is not a valid URL."
});
}

if (parsedStorageUrl.protocol !== "https:") {
return json(503, {
success: false,
message: "Music storage must use HTTPS."
});
}

const normalizedBase64 = audioBase64.replace(
/^data:audio/[^;]+;base64,/i,
""
);

if (
!normalizedBase64 ||
!/^[A-Za-z0-9+/]*={0,2}$/.test(normalizedBase64) ||
normalizedBase64.length % 4 !== 0
) {
return json(400, {
success: false,
message: "The audio file is not valid Base64 data."
});
}

const audioBuffer = Buffer.from(normalizedBase64, "base64");

if (!audioBuffer.length) {
return json(400, {
success: false,
message: "The audio file is empty."
});
}

const maxBytes = 5 * 1024 * 1024;

if (audioBuffer.length > maxBytes) {
return json(413, {
success: false,
message: "Audio uploads are limited to 5 MB through this endpoint."
});
}

try {
const response = await fetch(parsedStorageUrl.toString(), {
method: "POST",
headers: {
Authorization: "Bearer ${storageKey}",
"Content-Type": "application/json",
Accept: "application/json"
},
body: JSON.stringify({
title,
artist,
price,
currency: "KES",
mimeType,
audioBase64: audioBuffer.toString("base64")
})
});

const responseText = await response.text();

if (!response.ok) {
  return json(502, {
    success: false,
    message:
      response.status === 401 || response.status === 403
        ? "The storage service rejected authentication. Check the API key and required authentication format in Netlify and your storage provider."
        : `The storage service returned HTTP ${response.status}.`,
    providerStatus: response.status
  });
}

let savedSong;

try {
  savedSong = JSON.parse(responseText);
} catch {
  return json(502, {
    success: false,
    message: "The storage service returned an invalid JSON response."
  });
}

return json(201, {
  success: true,
  message: "The storage service accepted the upload.",
  song: savedSong
});

} catch {
return json(502, {
success: false,
message: "Could not connect to the configured music storage service."
});
}
};
