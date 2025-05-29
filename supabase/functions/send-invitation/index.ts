import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { google } from "npm:googleapis";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET");
const REFRESH_TOKEN = Deno.env.get("GMAIL_REFRESH_TOKEN");

// ここで環境変数の値をログ出力
console.log("GMAIL_USER", GMAIL_USER);
console.log("CLIENT_ID", CLIENT_ID);
console.log("CLIENT_SECRET", CLIENT_SECRET);
console.log("REFRESH_TOKEN", REFRESH_TOKEN);

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN
});

const gmail = google.gmail({ version: "v1", auth: oauth2Client });

// === CORSヘッダー共通定義 ===
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // CORSプリフライトリクエスト対応
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, nestName, inviterEmail, inviteLink } = await req.json();

    const emailContent = `From: \"PocoNest\" <${GMAIL_USER}>
To: ${email}
Subject: ${nestName}への招待が届いています
Content-Type: text/html; charset=utf-8

<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto;\">
  <h2>${nestName}への招待</h2>
  <p>${inviterEmail}があなたを${nestName}に招待しました。</p>
  <p>以下のリンクからアプリをインストールして参加してください：</p>
  <a href=\"${inviteLink}\" style=\"display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;\">
    招待を承認
  </a>
  <p style=\"color: #666; margin-top: 20px;\">
    このメールに心当たりがない場合は無視してください。
  </p>
</div>`;

    const encodedEmail = base64Encode(emailContent)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedEmail,
      },
    });

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    try {
      console.log('Edge Function Error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } catch (e) {
      console.log('Edge Function Error (raw):', error);
    }
    return new Response(
      JSON.stringify({
        error: error && (error.stack || error.message || JSON.stringify(error) || String(error))
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});