import fs from "fs";
import path from "path";

export interface GoogleOAuthWebCredentials {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
}

/** Load OAuth web client from env or downloaded JSON from Google Console. */
export function loadGoogleOAuthWebCredentials(): GoogleOAuthWebCredentials | null {
  const fromEnv = readEnvPair();
  if (fromEnv) return fromEnv;

  const jsonPath =
    process.env.GMAIL_OAUTH_JSON_PATH ??
    process.env.GOOGLE_OAUTH_JSON_PATH ??
    "gmail-oauth-client.json";

  const resolved = path.isAbsolute(jsonPath)
    ? jsonPath
    : path.join(process.cwd(), jsonPath);

  if (!fs.existsSync(resolved)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(resolved, "utf8")) as {
      web?: {
        client_id?: string;
        client_secret?: string;
        redirect_uris?: string[];
      };
      installed?: {
        client_id?: string;
        client_secret?: string;
        redirect_uris?: string[];
      };
    };

    const block = raw.web ?? raw.installed;
    if (!block?.client_id || !block?.client_secret) return null;

    return {
      clientId: block.client_id,
      clientSecret: block.client_secret,
      redirectUris: block.redirect_uris ?? [],
    };
  } catch {
    return null;
  }
}

function readEnvPair(): GoogleOAuthWebCredentials | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUris: [] };
}
