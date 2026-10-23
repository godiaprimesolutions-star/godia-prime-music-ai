import { json, env } from "./_shared.mjs";

export default async (event) => {
if (event.httpMethod !== "GET") {
return json(405, {
success: false,
message: "Use GET."
});
}

const checks = {
musicGenerationConfigured: Boolean(
env("HF_TOKEN") && env("HF_MUSIC_ENDPOINT")
),
mpesaCredentialsConfigured: Boolean(
env("MPESA_CONSUMER_KEY") &&
env("MPESA_CONSUMER_SECRET") &&
env("MPESA_SHORTCODE") &&
env("MPESA_PASSKEY") &&
env("MPESA_CALLBACK_URL")
),
musicUploadConfigured: Boolean(
env("MUSIC_UPLOAD_API_URL") &&
env("MUSIC_UPLOAD_API_KEY")
),
musicDownloadConfigured: Boolean(
env("MUSIC_DOWNLOAD_API_URL") &&
env("MUSIC_DOWNLOAD_API_KEY")
),
musicLibraryConfigured: Boolean(
env("MUSIC_LIBRARY_API_URL") &&
env("MUSIC_LIBRARY_API_KEY")
)
};

return json(200, {
success: true,
application: "GODIA PRIME MUSIC AI",
status: "running",
timestamp: new Date().toISOString(),
checks,
note: "Configuration checks only. These checks do not verify payment processing, audio generation, storage connectivity, or download authorization."
});
};
