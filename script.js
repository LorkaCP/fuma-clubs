document.addEventListener('DOMContentLoaded', () => {
    let allClubs = [];
    
    // --- DÉBOGAGE : Afficher toutes les infos de l'URL ---
    console.log("=== DÉBOGAGE URL ===");
    console.log("URL complète:", window.location.href);
    console.log("Pathname:", window.location.pathname);
    console.log("Search:", window.location.search);
    console.log("Hash:", window.location.hash);
    
    const params = new URLSearchParams(window.location.search);
    console.log("Paramètres trouvés:");
    for (let [key, value] of params.entries()) {
        console.log(`  ${key}: ${value}`);
    }
    
    // Vérifier spécifiquement id et username
    console.log("ID depuis params:", params.get('id'));
    console.log("Username depuis params:", params.get('username'));
    console.log("=== FIN DÉBOGAGE ===\n");
    
    // --- 1. CONFIGURATION & URLS ---
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=252630071&single=true&output=csv';
    
    // Configuration Discord
    const CLIENT_ID = '1473807551329079408'; 
    const REDIRECT_URI = encodeURIComponent('https://fuma-clubs-official.vercel.app/api/auth/callback');
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify`;

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

    // --- 3. LOGIQUE PAGE PROFIL (Réception des données Discord) ---
    function handleProfilePage() {
        // Sécurité : vérifier qu'on est sur la bonne page
        if (!window.location.pathname.includes('profile.html')) {
            console.log("Pas sur la page profile, on ignore");
            return;
        }

        console.log("🔄 handleProfilePage exécuté");
        console.log("URL actuelle:", window.location.href);
        console.log("Search params:", window.location.search);

        const params = new URLSearchParams(window.location.search);
        const discordUsername = params.get('username');
        const discordId = params.get('id');

        console.log("Données Discord extraites:", { 
            discordUsername, 
            discordId,
            typeUsername: typeof discordUsername,
            typeId: typeof discordId
        });

        if (discordUsername || discordId) {
            console.log("✅ Données Discord trouvées, tentative de remplissage...");
            
            // Fonction pour remplir les champs quand ils seront disponibles
            function fillDiscordFields() {
                console.log("Recherche des champs...");
                const nameInput = document.getElementById('discord-name');
                const idInput = document.getElementById('id-discord');

                console.log("Champs trouvés:", { 
                    nameInput: !!nameInput, 
                    idInput: !!idInput 
                });

                if (nameInput && idInput) {
                    if (discordUsername && discordUsername !== "undefined" && discordUsername !== "null") {
                        const decodedName = decodeURIComponent(discordUsername);
                        nameInput.value = decodedName;
                        console.log("✅ Nom Discord rempli:", decodedName);
                    }
                    if (discordId && discordId !== "undefined" && discordId !== "null") {
                        idInput.value = discordId;
                        console.log("✅ ID Discord rempli:", discordId);
                    }
                    
                    // Nettoyer l'URL après avoir récupéré les données
                    if (window.history.replaceState) {
                        const cleanUrl = window.location.pathname;
                        window.history.replaceState({}, document.title, cleanUrl);
                        console.log("URL nettoyée");
                    }
                } else {
                    console.log("❌ Champs Discord non trouvés, nouvelle tentative...");
                    setTimeout(fillDiscordFields, 200);
                }
            }
            
            // Lancer la tentative de remplissage
            setTimeout(fillDiscordFields, 500);
        } else {
            console.log("❌ Aucune donnée Discord dans l'URL");
            
            // Vérifier si on a des paramètres mais avec des noms différents
            console.log("Vérification d'autres noms de paramètres possibles...");
            const allParams = [];
            for (let [key, value] of params.entries()) {
                allParams.push({key, value});
            }
            console.log("Tous les paramètres:", allParams);
        }
    }

    // --- 4. LOGIQUE LISTE DES CLUBS ---
    async function fetchFumaClubs() {
        const clubContainer = document.getElementById('fuma-js-clubs');
        if (!clubContainer) return;

        try {
            const resp = await fetch(SHEET_URL);
            const text = await resp.text();
            const lines = text.trim().split("\n");
            const headers = lines[0].split(",");
            
            const teamIdx = headers.indexOf('TEAMS');
            const crestIdx = headers.indexOf('CREST');

            allClubs = lines.slice(1).map(line => {
                const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(s => s.replace(/^"|"$/g,'')) || [];
                return {
                    name: values[teamIdx]?.trim(),
                    logo: values[crestIdx]?.trim()
                };
            }).filter(c => c.name && c.logo && !c.name.toLowerCase().includes('free agent'));

            renderClubs(allClubs);
        } catch (e) {
            clubContainer.innerHTML = "<div class='fuma-loading-wrapper'>Erreur de chargement des clubs.</div>";
            console.error(e);
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
                <img src="${club.logo}" alt="${club.name}" loading="lazy" onerror="this.parentElement.remove()">
                <span class="club-name">${club.name}</span>
            `;
            clubContainer.appendChild(card);
        });
    }

    // --- 5. LOGIQUE DÉTAILS CLUB ---
    async function loadClubProfile() {
        const detailContainer = document.getElementById('club-details');
        if (!detailContainer) return;

        const params = new URLSearchParams(window.location.search);
        const clubName = params.get('name');
        if (!clubName) {
            detailContainer.innerHTML = "<p>Club non spécifié.</p>";
            return;
        }

        try {
            const resp = await fetch(SHEET_URL);
            const text = await resp.text();
            const lines = text.trim().split("\n");
            const headers = lines[0].split(",");
            
            const idx = {
                team: headers.indexOf('TEAMS'),
                crest: headers.indexOf('CREST'),
                active: headers.indexOf('ACTIVE'),
                history: headers.indexOf('HISTORY'),
                stream: headers.indexOf('STREAM'),
                gp: headers.indexOf('GAMES PLAYED'),
                win: headers.indexOf('WIN'),
                draw: headers.indexOf('DRAW'),
                lost: headers.indexOf('LOST'),
                trophies: headers.indexOf('TROPHIES'),
                manager: headers.indexOf('MANAGER'),
                players: headers.indexOf('PLAYERS')
            };

            const clubData = lines.slice(1).find(line => {
                const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(s => s.replace(/^"|"$/g,'')) || [];
                return values[idx.team]?.trim() === clubName;
            });

            if (clubData) {
                const v = clubData.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(s => s.replace(/^"|"$/g,'')) || [];
                const formattedHistory = v[idx.history] ? v[idx.history].split('\n').map(p => `<p style="margin-bottom:15px;">${p}</p>`).join('') : "Aucun historique disponible.";
                const playersList = v[idx.players] ? v[idx.players].split(',').map(p => `<li>${p.trim()}</li>`).join('') : "Effectif non renseigné.";

                const trophiesRaw = v[idx.trophies];
                let trophiesHTML = '';
                if (trophiesRaw && trophiesRaw.toLowerCase() !== 'none' && trophiesRaw.trim() !== '') {
                    const trophyArray = trophiesRaw.split(',');
                    trophiesHTML = `
                        <div class="trophy-shelf" style="margin-bottom: 30px;">
                            <h3 class="sidebar-title">HONOURS</h3>
                            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                                ${trophyArray.map(t => `<span class="trophy-badge">${t.trim()}</span>`).join('')}
                            </div>
                        </div>
                    `;
                }

                detailContainer.innerHTML = `
                    <div class="club-profile-header" style="text-align: center; margin-bottom: 50px;">
                        <img src="${v[idx.crest]}" style="width: 180px; margin-bottom: 20px;" alt="Logo ${v[idx.team]}">
                        <h1 style="font-size: 3rem; color: var(--fuma-primary);">${v[idx.team]}</h1>
                        <div style="display:flex; justify-content:center; gap:15px; align-items:center;">
                             <span class="status-badge">${v[idx.active] === 'YES' ? '● ACTIVE' : '○ INACTIVE'}</span>
                             ${(v[idx.stream] && v[idx.stream] !== 'None') ? `<a href="${v[idx.stream]}" target="_blank" style="color:#ff0000; text-decoration:none; font-weight:bold;"><i class="fab fa-youtube"></i> LIVE</a>` : ''}
                        </div>
                    </div>

                    <div class="club-grid-layout">
                        <div class="club-main-info">
                            ${trophiesHTML}
                            <section style="margin-bottom: 40px;">
                                <h2 style="color:var(--fuma-primary); border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px;">HISTORY</h2>
                                <div style="font-style: italic; color: var(--fuma-text-dim); line-height: 1.8; text-align: justify;">
                                    ${formattedHistory}
                                </div>
                            </section>

                            <div class="stats-bar">
                                <div class="stat-item"><strong>${v[idx.gp] || 0}</strong><span>GAMES</span></div>
                                <div class="stat-item" style="color:#4caf50;"><strong>${v[idx.win] || 0}</strong><span>WIN</span></div>
                                <div class="stat-item" style="color:#ffeb3b;"><strong>${v[idx.draw] || 0}</strong><span>DRAW</span></div>
                                <div class="stat-item" style="color:#f44336;"><strong>${v[idx.lost] || 0}</strong><span>LOST</span></div>
                            </div>
                        </div>

                        <div class="club-sidebar">
                            <div class="sidebar-box">
                                <h3 class="sidebar-title">MANAGER</h3>
                                <p style="font-size: 1.1rem; font-weight: bold;">${v[idx.manager] || 'N/A'}</p>
                            </div>
                            <div class="sidebar-box">
                                <h3 class="sidebar-title">ROSTER</h3>
                                <ul class="roster-list">${playersList}</ul>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                detailContainer.innerHTML = "<p>Club introuvable dans la base de données.</p>";
            }
        } catch (e) {
            console.error(e);
            detailContainer.innerHTML = "<p>Erreur lors de la récupération des données.</p>";
        }
    }

    // --- 6. ÉVÉNEMENTS & INITIALISATION ---
    const searchInput = document.getElementById('fuma-search');
    searchInput?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allClubs.filter(c => c.name.toLowerCase().includes(term));
        renderClubs(filtered);
    });

    const backBtn = document.getElementById('backTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) backBtn?.classList.add('visible');
        else backBtn?.classList.remove('visible');
    });
    backBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // Lancement
    injectNavigation();
    
    // Appeler handleProfilePage avec un délai plus long pour être sûr
    setTimeout(() => {
        console.log("Appel de handleProfilePage après délai");
        handleProfilePage();
    }, 1000);

    if (document.getElementById('fuma-js-clubs')) fetchFumaClubs();
    if (document.getElementById('club-details')) loadClubProfile();
});
