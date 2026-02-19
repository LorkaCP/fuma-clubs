// --- 1. CONFIGURATION & URLS ---

    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=252630071&single=true&output=csv';

    

    // Configuration Discord

    const CLIENT_ID = '1473807551329079408'; 

    const REDIRECT_URI = encodeURIComponent('https://fuma-clubs-official.vercel.app/api/auth/callback');

    // SCOPE guilds ajouté pour la restriction d'accès

    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify%20guilds`;



    // --- 2. INJECTION DU MENU ---

    function injectNavigation() {

        const navElement = document.getElementById('main-nav');

        if (!navElement) return;



        const path = window.location.pathname;

        const page = path.split("/").pop() || 'index.html';



        navElement.innerHTML = `

            <div class="nav-container">

                <a href="index.html" class="nav-logo">FUMA CLUBS</a>

                <button class="fuma-burger" id="burger">

                    <span></span><span></span><span></span>

                </button>

                <div class="nav-links" id="navLinks">

                    <a href="index.html" class="${page === 'index.html' ? 'active' : ''}">Home</a>

                    <a href="clubs.html" class="${page === 'clubs.html' ? 'active' : ''}">Clubs</a>

                    <a href="#">League</a>

                    <a href="#">Rules</a>

                    <a href="https://discord.gg/xPz9FBkdtm" target="_blank">

                        <i class="fab fa-discord"></i> Discord

                    </a>

                    <a href="${authUrl}" class="${page === 'profile.html' ? 'active' : ''}">Profile</a>

                </div>

            </div>

        `;

        setupBurger();

    }



    function setupBurger() {

        const burger = document.getElementById('burger');

        const navLinks = document.getElementById('navLinks');

        if (burger && navLinks) {

            burger.addEventListener('click', () => {

                burger.classList.toggle('active');

                navLinks.classList.toggle('active');

            });

        }

    }



    // --- 3. LOGIQUE PAGE PROFIL ---

    function handleProfilePage() {

        if (!window.location.pathname.includes('profile.html')) return;



        const params = new URLSearchParams(window.location.search);

        const discordUsername = params.get('username');

        const discordId = params.get('id');



        if (discordUsername && discordUsername !== "undefined" && discordId && discordId !== "undefined") {

            const nameInput = document.getElementById('discord-name');

            const idInput = document.getElementById('id-discord');



            if (nameInput && idInput) {

                nameInput.value = decodeURIComponent(discordUsername);

                idInput.value = discordId;

                window.history.replaceState({}, document.title, window.location.pathname);

            } else {

                setTimeout(handleProfilePage, 100);

            }

        }

    }



    // --- 4. LOGIQUE LISTE DES CLUBS ---

    async function fetchFumaClubs() {

        const clubContainer = document.getElementById('fuma-js-clubs');

        if (!clubContainer) return;



        const parseCSVLine = (line) => {

            const result = [];

            let cell = '';

            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {

                let char = line[i];

                if (char === '"') inQuotes = !inQuotes;

                else if (char === ',' && !inQuotes) { result.push(cell); cell = ''; }

                else cell += char;

            }

            result.push(cell);

            return result.map(v => v.replace(/^"|"$/g, '').trim());

        };



        try {

            const resp = await fetch(SHEET_URL);

            const text = await resp.text();

            const lines = text.trim().split("\n");

            const headers = lines[0].split(",");

            

            const teamIdx = headers.indexOf('TEAMS');

            const crestIdx = headers.indexOf('CREST');



            allClubs = lines.slice(1).map(line => {

                const values = parseCSVLine(line);

                return {

                    name: values[teamIdx] || "",

                    logo: values[crestIdx] || ""

                };

            }).filter(c => c.name && c.logo && !c.name.toLowerCase().includes('free agent'));



            renderClubs(allClubs);

        } catch (e) {

            clubContainer.innerHTML = "<div class='fuma-loading-wrapper'>Erreur de chargement des clubs.</div>";

        }

    }



    function renderClubs(clubsList) {

        const clubContainer = document.getElementById('fuma-js-clubs');

        if (!clubContainer) return;

        clubContainer.innerHTML = '';



        clubsList.forEach(club => {

            const card = document.createElement('a');

            card.href = `club.html?name=${encodeURIComponent(club.name)}`;

            card.className = 'club-card';

            card.innerHTML = `

                <img src="${club.logo}" alt="${club.name}" loading="lazy" onerror="this.src='https://placehold.co/150x150?text=NO+LOGO'">

                <span class="club-name">${club.name}</span>

            `;

            clubContainer.appendChild(card);

        });

    }



    // --- 5. LOGIQUE DÉTAILS CLUB (VERSION LONGUE RESTAURÉE) ---

    async function loadClubProfile() {

        const detailContainer = document.getElementById('club-details');

        if (!detailContainer) return;



        const params = new URLSearchParams(window.location.search);

        const clubName = params.get('name');

        if (!clubName) return;



        try {

            const resp = await fetch(SHEET_URL);

            const text = await resp.text();

            const lines = text.trim().split("\n");

            const headers = lines[0].split(",");



            const parseCSVLine = (line) => {

                const result = [];

                let cell = '';

                let inQuotes = false;

                for (let i = 0; i < line.length; i++) {

                    let char = line[i];

                    if (char === '"') inQuotes = !inQuotes;

                    else if (char === ',' && !inQuotes) { result.push(cell); cell = ''; }

                    else cell += char;

                }

                result.push(cell);

                return result.map(v => v.replace(/^"|"$/g, '').trim());

            };



            const idx = {

                team: headers.indexOf('TEAMS'),

                crest: headers.indexOf('CREST'),

                history: headers.indexOf('HISTORY'),

                gp: headers.indexOf('GAMES PLAYED'),

                win: headers.indexOf('WIN'),

                draw: headers.indexOf('DRAW'),

                lost: headers.indexOf('LOST'),

                trophies: headers.indexOf('TROPHIES'),

                manager: headers.indexOf('MANAGER'),

                players: headers.indexOf('PLAYERS'),

                active: headers.indexOf('ACTIVE'),

                stream: headers.indexOf('STREAM')

            };



            const clubLine = lines.slice(1).find(line => parseCSVLine(line)[idx.team] === clubName);



            if (clubLine) {

                const v = parseCSVLine(clubLine);

                const formattedHistory = v[idx.history] ? v[idx.history].split('\n').map(p => `<p style="margin-bottom:15px;">${p}</p>`).join('') : "No history available.";

                const playersList = v[idx.players] ? v[idx.players].split(',').map(p => `<li>${p.trim()}</li>`).join('') : "<li>Roster is empty.</li>";

                const isActive = v[idx.active]?.toUpperCase() === 'YES';

                

                // Statut HTML

                const statusHTML = `<span style="color: ${isActive ? '#4caf50' : '#f44336'}; font-weight: bold;">

                    <i class="fas fa-circle" style="font-size: 10px; vertical-align: middle;"></i> ${isActive ? 'ACTIVE' : 'INACTIVE'}

                </span>`;



                // Stream HTML

                const streamUrl = v[idx.stream] || "";

                let streamHTML = '';

                if (streamUrl && streamUrl !== "" && streamUrl.toLowerCase() !== "none") {

                    const isTwitch = streamUrl.includes('twitch.tv');

                    streamHTML = `

                        <h3 class="sidebar-title" style="margin-top:20px;"><i class="fas fa-broadcast-tower"></i> LIVE STREAM</h3>

                        <a href="${streamUrl}" target="_blank" class="fuma-cta" style="display:block; text-align:center; background:#6441a5; font-size: 0.8rem; padding: 10px;">

                            <i class="${isTwitch ? 'fab fa-twitch' : 'fab fa-youtube'}"></i> WATCH NOW

                        </a>`;

                }



                // Trophies HTML

                const trophyValue = v[idx.trophies] || "";

                let trophiesHTML = ''; 

                if (trophyValue !== "" && trophyValue !== "0" && trophyValue.toLowerCase() !== "none") {

                    trophiesHTML = `

                        <div class="trophy-section">

                            <h3 class="sidebar-title" style="border:none; margin-bottom:0;"><i class="fas fa-trophy" style="color:var(--fuma-primary)"></i> ACHIEVEMENTS</h3>

                            <div class="trophy-grid">

                                ${trophyValue.split(',').map(t => `<div class="trophy-badge"><span class="trophy-icon">🏆</span><span class="trophy-text">${t.trim()}</span></div>`).join('')}

                            </div>

                        </div>`;

                }



                detailContainer.innerHTML = `

                    <div class="club-profile-header" style="text-align: center; margin-bottom: 50px;">

                        <img src="${v[idx.crest] || ''}" style="width: 180px; margin-bottom: 20px;" alt="Crest">

                        <h1 style="font-size: 3rem; color: var(--fuma-primary); margin-bottom:5px;">${v[idx.team]}</h1>

                        <div class="status-badge">${statusHTML}</div>

                    </div>

                    <div class="club-grid-layout">

                        <div class="club-main-info">

                            ${trophiesHTML}

                            <section>

                                <h2 style="color:var(--fuma-primary); border-bottom: 1px solid #333; padding-bottom: 10px;">HISTORY</h2>

                                <div style="font-style: italic; color: var(--fuma-text-dim);">${formattedHistory}</div>

                            </section>

                            <div class="stats-bar">

                                <div class="stat-item"><strong>${v[idx.gp] || 0}</strong><br><span>GAMES</span></div>

                                <div class="stat-item" style="color:#4caf50;"><strong>${v[idx.win] || 0}</strong><br><span>WIN</span></div>

                                <div class="stat-item" style="color:#ffeb3b;"><strong>${v[idx.draw] || 0}</strong><br><span>DRAW</span></div>

                                <div class="stat-item" style="color:#f44336;"><strong>${v[idx.lost] || 0}</strong><br><span>LOST</span></div>

                            </div>

                        </div>

                        <div class="club-sidebar">

                            <div class="sidebar-box">

                                <h3 class="sidebar-title">MANAGER</h3>

                                <p style="margin-bottom:20px;">${v[idx.manager] || 'N/A'}</p>

                                <h3 class="sidebar-title">ROSTER</h3>

                                <ul class="roster-list">${playersList}</ul>

                                ${streamHTML}

                            </div>

                        </div>

                    </div>

                `;

            }

        } catch (e) { console.error(e); }

    }



    // --- 6. INITIALISATION ---

    injectNavigation();

    handleProfilePage();



    const searchInput = document.getElementById('fuma-search');

    searchInput?.addEventListener('input', (e) => {

        const term = e.target.value.toLowerCase();

        renderClubs(allClubs.filter(c => c.name.toLowerCase().includes(term)));

    });



    const backBtn = document.getElementById('backTop');

    window.addEventListener('scroll', () => {

        if (window.scrollY > 400) backBtn?.classList.add('visible');

        else backBtn?.classList.remove('visible');

    });

    backBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));



    if (document.getElementById('fuma-js-clubs')) fetchFumaClubs();

    if (document.getElementById('club-details')) loadClubProfile();

});



---

Si nécessaire, le callback :

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
