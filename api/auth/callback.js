export default async function handler(req, res) {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Missing connection code.');
    }

    // --- CONFIGURATION ---
    const MY_GUILD_ID = '882539898953949204'; // FUMA Server ID
    const clientID = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = 'https://fuma-clubs-official.vercel.app/api/auth/callback';

    try {
        // 1. EXCHANGE CODE FOR ACCESS TOKEN
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: clientID,
                client_secret: clientSecret,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
                scope: 'identify guilds',
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            console.error("Discord Token Error:", tokenData);
            return res.status(500).send("Unable to obtain access token.");
        }

        const accessToken = tokenData.access_token;

        // 2. FETCH USER GUILDS
        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        const guilds = await guildsResponse.json();

        if (!Array.isArray(guilds)) {
            return res.status(500).send("Error while retrieving your Discord servers.");
        }

        // 3. MEMBERSHIP VERIFICATION
        const isMember = guilds.some(guild => guild.id === MY_GUILD_ID);

        if (!isMember) {
            // Display clean Access Denied page if user is not in the server
            return res.send(`
                <html>
                    <head>
                        <title>Access Denied - FUMA CLUBS</title>
                        <meta charset="UTF-8">
                        <style>
                            body { background: #0f0f0f; color: white; font-family: 'Poppins', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                            .card { background: #1a1a1a; padding: 40px; border-radius: 15px; border: 1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.5); max-width: 400px; }
                            h1 { color: #f44336; margin-bottom: 10px; }
                            p { color: #aaa; line-height: 1.6; }
                            .btn { display: inline-block; background: #5865F2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; transition: 0.3s; }
                            .btn:hover { background: #4752c4; transform: translateY(-2px); }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <h1>ACCESS DENIED</h1>
                            <p>Sorry, you must be a member of the <strong>FUMA CLUBS</strong> Discord server to create a profile.</p>
                            <a href="https://discord.gg/xPz9FBkdtm" class="btn">JOIN OUR DISCORD</a>
                            <p style="font-size: 0.8rem; margin-top: 15px; color: #555;">Once you've joined, try logging in again.</p>
                        </div>
                    </body>
                </html>
            `);
        }

        // 4. FETCH USER INFO (IF MEMBER)
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        const userData = await userResponse.json();
        const discordId = userData.id || "";
        const discordName = userData.username || "Player";

        // 5. FINAL REDIRECT TO PROFILE WITH DATA
        res.redirect(`/profile.html?id=${discordId}&username=${encodeURIComponent(discordName)}`);

    } catch (error) {
        console.error("Callback Error:", error);
        res.status(500).send('Error communicating with Discord');
    }
}
