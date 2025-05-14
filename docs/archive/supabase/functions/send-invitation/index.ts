import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { google } from "npm:googleapis";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET");
const REFRESH_TOKEN = Deno.env.get("GMAIL_REFRESH_TOKEN");

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN
});

const gmail = google.gmail({ version: "v1", auth: oauth2Client });

serve(async (req) => {
  try {
    const { email, nestName, inviterEmail, inviteLink } = await req.json();

    const emailContent = `From: "PocoNest" <${GMAIL_USER}>
To: ${email}
Subject: ${nestName}への招待が届いています
Content-Type: text/html; charset=utf-8

<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>${nestName}への招待</h2>
  <p>${inviterEmail}があなたを${nestName}に招待しました。</p>
  <p>以下のリンクからアプリをインストールして参加してください：</p>
  <a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
    招待を承認
  </a>
  <p style="color: #666; margin-top: 20px;">
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
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}); 