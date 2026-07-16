"use strict";

const http = require("http");
const { OAuth2Client } = require("google-auth-library");

const CLIENT_ID = requiredEnv("DRIVE_OWNER_CLIENT_ID");
const CLIENT_SECRET = requiredEnv("DRIVE_OWNER_CLIENT_SECRET");
const PORT = Number(process.env.OAUTH_REDIRECT_PORT || 8090);
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

const oauth = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [DRIVE_SCOPE],
});

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, REDIRECT_URI);
    if (url.pathname !== "/oauth2callback") {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    const code = url.searchParams.get("code");
    if (!code) {
      throw new Error(url.searchParams.get("error") || "No authorization code returned.");
    }

    const { tokens } = await oauth.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error(
        "Google did not return a refresh token. Re-run this script and make sure prompt=consent is used.",
      );
    }

    res.end("Refresh token created. You can close this tab and return to the terminal.");
    console.log("\nDrive owner refresh token created.\n");
    console.log("Use this value as DRIVE_OWNER_REFRESH_TOKEN:");
    console.log(tokens.refresh_token);
    console.log("\nDo not commit this value or paste it into chat.");
    server.close();
  } catch (error) {
    res.statusCode = 500;
    res.end(error.message || String(error));
    console.error(error);
    server.close();
  }
});

server.listen(PORT, () => {
  console.log(`Listening on ${REDIRECT_URI}`);
  console.log("\nOpen this URL in your browser and sign in as the storage-owner Google account:\n");
  console.log(authUrl);
});

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
