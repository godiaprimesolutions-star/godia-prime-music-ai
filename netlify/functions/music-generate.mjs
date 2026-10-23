import { json, readJson, env } from "./_shared.mjs";

export default async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { message: "Use POST." });
  }

  const input = readJson(event);
  const prompt = String(input?.prompt || "").trim();

  if (!prompt) {
    return json(400, { message: "A music brief is required." });
  }

  const token = env("HF_TOKEN");
  const endpoint = env("HF_MUSIC_ENDPOINT");

  if (!token || !endpoint) {
    return json(503, {
      message: "Hugging Face is not connected yet. Add HF_TOKEN and a compatible HF_MUSIC_ENDPOINT in Netlify environment variables."
    });
  }

  if (!/^https:\/\//i.test(endpoint)) {
    return json(503, {
      message: "HF_MUSIC_ENDPOINT must be an HTTPS inference endpoint URL."
    });
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
        Accept: "audio/*, application/octet-stream, application/json"
      },
      body: JSON.stringify({ inputs: prompt })
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      return json(res.status === 429 ? 429 : 502, {
        message: `Hugging Face request failed (${res.status}). ${msg.slice(0, 400)}`
      });
    }

    const type = res.headers.get("content-type") || "application/octet-stream";

    if (type.includes("application/json")) {
      const data = await res.json().catch(() => ({}));

      if (data.audioBase64 || data.audioUrl) {
        return json(200, data);
      }

      return json(502, {
        message: "The configured model returned JSON rather than playable audio. Choose an audio-generating endpoint and match its request/response format."
      });
    }

    const bytes = Buffer.from(await res.arrayBuffer());

    if (!bytes.length) {
      return json(502, {
        message: "The configured model returned an empty audio response."
      });
    }

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        "content-type": type,
        "content-disposition": "inline; filename=godia-prime-generated-audio",
        "cache-control": "no-store"
      },
      body: bytes.toString("base64")
    };
  } catch (error) {
    return json(502, {
      message: error.message || "Could not reach the configured Hugging Face endpoint."
    });
  }
};
