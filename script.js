document.addEventListener('DOMContentLoaded', () => {
    let allClubs = [];
    
    // --- 1. CONFIGURATION & URLS ---
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=252630071&single=true&output=csv';
    const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwoE4XkkU7y0Eab2c6iogt92egehH2-Qafw_yOSspm6lLdZSEc_7q3sqORXbZ0qURgq_w/exec'; 
    const CLIENT_ID = '1473807551329079408'; 
    const REDIRECT_URI = encodeURIComponent('https://fuma-clubs-official.vercel.app/api/auth/callback');
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify%20guilds`;

    // --- 2. UTILITAIRES ---
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

    // --- 3. INJECTION DU MENU ---
    function injectNavigation() {
        const navElement = document.getElementById('main-nav');
        if (!navElement) return;
        const page = window.location.pathname.split("/").pop() || 'index.html';

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
                    <a href="https://discord.gg/xPz9FBkdtm" target="_blank"><i class="fab fa-discord"></i> Discord</a>
                    <a href="${authUrl}" class="${page === 'profile.html' ? 'active' : ''}">Profile</a>
                </div>
            </div>`;
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

    // --- 4. LOGIQUE PAGE PROFIL ---
    // --- 4. LOGIQUE PAGE PROFIL ---
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
                
                // Appel de la vérification du profil existant
                checkExistingProfile(discordId);
                
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }

    async function checkExistingProfile(discordId) {
        console.log("Vérification du profil pour l'ID:", discordId);
        try {
            const resp = await fetch(SHEET_URL);
            const text = await resp.text();
            const lines = text.trim().split("\n");
            
            // Nettoyage agressif des en-têtes : MAJUSCULES et suppression des espaces/_
            const rawHeaders = lines[0].split(",");
            const cleanHeaders = rawHeaders.map(h => h.trim().toUpperCase().replace(/[\s_]/g, ''));
            
            console.log("En-têtes bruts:", rawHeaders);
            console.log("En-têtes nettoyés pour recherche:", cleanHeaders);

            // Fonction pour trouver l'index malgré les variations de noms
            const getIdx = (name) => cleanHeaders.indexOf(name.replace(/[\s_]/g, '').toUpperCase());

            const idx = {
                discord: getIdx('DISCORDID'),
                gameTag: getIdx('GAMETAG'),
                country: getIdx('COUNTRY'),
                avatar: getIdx('AVATAR'),
                pos: getIdx('MAINPOSITION'),
                arch: getIdx('MAINARCHETYPE'),
                team: getIdx('CURRENTTEAM')
            };

            // Si l'index discord n'est pas trouvé, on ne peut pas continuer
            if (idx.discord === -1) {
                console.error("ERREUR : La colonne DISCORD_ID est introuvable dans le Google Sheet.");
                return;
            }

            for (let i = 1; i < lines.length; i++) {
                const values = parseCSVLine(lines[i]);
                
                // Comparaison stricte de l'ID
                if (values[idx.discord] === discordId) {
                    console.log("MATCH TROUVÉ ! Remplissage en cours...");

                    const setVal = (id, val) => {
                        const el = document.getElementById(id);
                        if (el && val !== undefined && val !== null) {
                            el.value = val.trim();
                        }
                    };

                    // On utilise les index trouvés dynamiquement
                    if (idx.gameTag !== -1) setVal('id-game', values[idx.gameTag]);
                    if (idx.country !== -1) setVal('country', values[idx.country]);
                    if (idx.avatar !== -1) setVal('avatar', values[idx.avatar]);
                    if (idx.pos !== -1) setVal('main-position', values[idx.pos]);
                    if (idx.arch !== -1) setVal('main-archetype', values[idx.arch]);
                    if (idx.team !== -1) setVal('team', values[idx.team]);

                    const submitBtn = document.querySelector('#profile-form button[type="submit"]');
                    if (submitBtn) submitBtn.innerText = "Update Existing Profile";
                    
                    return; 
                }
            }
            console.log("Aucun profil correspondant à l'ID Discord dans la base.");
        } catch (e) {
            console.error("Erreur lors de la vérification:", e);
        }
    }

    // --- 5. ENVOI DU FORMULAIRE (CORRIGÉ) ---
    function setupFormSubmission() {
    const profileForm = document.getElementById('profile-form');
    if (!profileForm) return;

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = profileForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerText;
        
        submitBtn.disabled = true;
        submitBtn.innerText = "Updating...";

        // Utilisation de FormData pour éviter les problèmes de CORS JSON
        const formData = new URLSearchParams();
        formData.append('game_id',"");
        formData.append('game_tag', document.getElementById('id-game')?.value || "");
        formData.append('discord_id', document.getElementById('id-discord')?.value || "");
        formData.append('discord_name', document.getElementById('discord-name')?.value || "");
        formData.append('country', document.getElementById('country')?.value || "");
        formData.append('avatar', document.getElementById('avatar')?.value || "");
        formData.append('current_team', document.getElementById('team')?.value || "Free Agent");
        formData.append('main_archetype', document.getElementById('main-archetype')?.value || "");
        formData.append('main_position', document.getElementById('main-position')?.value || "");

        try {
            // On retire 'no-cors' et on laisse le navigateur gérer
            const response = await fetch(APP_SCRIPT_URL, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            alert("Profile successfully updated!");
        } catch (error) {
            console.error('Submission error:', error);
            // Note: Avec Google Script, on tombe souvent en "error" même si ça marche 
            // à cause des redirections. Vérifiez votre feuille !
            alert("Update sent (check your sheet).");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
    });
}

    // --- 6. LOGIQUE LISTE DES CLUBS (clubs.html) ---
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
                const values = parseCSVLine(line);
                return { name: values[teamIdx] || "", logo: values[crestIdx] || "" };
            }).filter(c => c.name && c.logo && !c.name.toLowerCase().includes('free agent'));

            renderClubs(allClubs);
        } catch (e) {
            clubContainer.innerHTML = "<div class='fuma-loading-wrapper'>Erreur de chargement des clubs.</div>";
        }
    }

    function renderClubs(clubsList) {
        const clubContainer = document.getElementById('fuma-js-clubs');
        if (!clubContainer) return;
        clubContainer.innerHTML = clubsList.map(club => `
            <a href="club.html?name=${encodeURIComponent(club.name)}" class="club-card">
                <img src="${club.logo}" alt="${club.name}" loading="lazy" onerror="this.src='https://placehold.co/150x150?text=NO+LOGO'">
                <span class="club-name">${club.name}</span>
            </a>`).join('');
    }

    // --- 7. LOGIQUE DÉTAILS CLUB (club.html) ---
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
                
                const statusHTML = `<span style="color: ${isActive ? '#4caf50' : '#f44336'}; font-weight: bold;">
                    <i class="fas fa-circle" style="font-size: 10px; vertical-align: middle;"></i> ${isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>`;

                let streamHTML = '';
                if (v[idx.stream] && v[idx.stream].toLowerCase() !== "none") {
                    const isTwitch = v[idx.stream].includes('twitch.tv');
                    streamHTML = `<h3 class="sidebar-title" style="margin-top:20px;"><i class="fas fa-broadcast-tower"></i> LIVE STREAM</h3>
                                  <a href="${v[idx.stream]}" target="_blank" class="fuma-cta" style="display:block; text-align:center; background:#6441a5; font-size: 0.8rem; padding: 10px;">
                                  <i class="${isTwitch ? 'fab fa-twitch' : 'fab fa-youtube'}"></i> WATCH NOW</a>`;
                }

                let trophiesHTML = ''; 
                if (v[idx.trophies] && v[idx.trophies] !== "0" && v[idx.trophies].toLowerCase() !== "none") {
                    trophiesHTML = `<div class="trophy-section">
                        <h3 class="sidebar-title" style="border:none; margin-bottom:0;"><i class="fas fa-trophy" style="color:var(--fuma-primary)"></i> ACHIEVEMENTS</h3>
                        <div class="trophy-grid">${v[idx.trophies].split(',').map(t => `<div class="trophy-badge"><span class="trophy-icon">🏆</span><span class="trophy-text">${t.trim()}</span></div>`).join('')}</div>
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
                    </div>`;
            }
        } catch (e) { console.error(e); }
    }

    // --- 8. INITIALISATION ---
    injectNavigation();
    handleProfilePage();
    setupFormSubmission();

    // Recherche
    const searchInput = document.getElementById('fuma-search');
    searchInput?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        renderClubs(allClubs.filter(c => c.name.toLowerCase().includes(term)));
    });

    // Back to top
    const backBtn = document.getElementById('backTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) backBtn?.classList.add('visible');
        else backBtn?.classList.remove('visible');
    });
    backBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    if (document.getElementById('fuma-js-clubs')) fetchFumaClubs();
    if (document.getElementById('club-details')) loadClubProfile();
});







