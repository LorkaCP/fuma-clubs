export default async function handler(req, res) {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Code de connexion manquant.');
    }

    const clientID = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = 'https://fuma-clubs-official.vercel.app/api/auth/callback';

    try {
        // 1. Échange du CODE contre un TOKEN
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: clientID,
                client_secret: clientSecret,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
                scope: 'identify',
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            console.error("Erreur Token Discord:", tokenData);
            return res.status(500).send("Impossible d'obtenir le token d'accès.");
        }

        // 2. Récupération des infos de l'utilisateur
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        const userData = await userResponse.json();

        // Sécurité sur les variables pour éviter le "undefined"
        const discordId = userData.id || "";
        const discordName = userData.username || userData.global_name || "Joueur";

        // 3. Redirection vers le profil
        // On utilise encodeURIComponent pour protéger les caractères spéciaux du pseudo
        res.redirect(`/profile.html?id=${discordId}&username=${encodeURIComponent(discordName)}`);

    } catch (error) {
        console.error("Erreur Callback:", error);
        res.status(500).send('Erreur lors de la communication avec Discord');
    }
}
