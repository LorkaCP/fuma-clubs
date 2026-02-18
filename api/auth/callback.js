export default async function handler(req, res) {
    const { code } = req.query; // Récupère le code envoyé par Discord

    if (!code) {
        return res.status(400).send('Code de connexion manquant.');
    }

    // Tes identifiants (on va configurer les "env" sur Vercel juste après)
    const clientID = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = 'https://fuma-clubs-official.vercel.app/api/auth/callback';

    try {
        // 1. Échanger le CODE contre un TOKEN d'accès
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

        // 2. Utiliser le TOKEN pour demander les infos du joueur
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        const userData = await userResponse.json();

        // userData contient maintenant : userData.id, userData.username, etc.
        
        // 3. Rediriger le joueur vers sa page profil avec ses infos
        // On passe l'ID et le nom dans l'URL pour que le script.js puisse les lire
        res.redirect(`/profile.html?id=${userData.id}&username=${encodeURIComponent(userData.username)}`);

    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur lors de la connexion avec Discord');
    }
}
