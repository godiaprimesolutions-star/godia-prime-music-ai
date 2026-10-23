export function json(statusCode, data) {
return {
statusCode,
headers: {
"content-type": "application/json; charset=utf-8",
"cache-control": "no-store"
},
body: JSON.stringify(data)
};
}

export function readJson(event) {
try {
if (!event || !event.body) {
return {};
}

const body = event.isBase64Encoded
  ? Buffer.from(event.body, "base64").toString("utf8")
  : event.body;

return JSON.parse(body);

} catch {
return {};
}
}

export function env(name) {
return process.env[name] || "";
}
