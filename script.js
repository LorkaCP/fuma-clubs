document.addEventListener('DOMContentLoaded', () => {
    let allClubs = [];
    let allPlayers = []; // Stockage pour la recherche de joueurs
    
    // --- 1. CONFIGURATION & URLS ---
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=252630071&single=true&output=csv';
    const PLAYERS_SHEET_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=';
    const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzieuE-AiE2XSwE7anpAeDzLhe-rHpgA8eV7TMS3RRbUuzESLt40zBmIDqi9N6mxbdkqA/exec'; 
    const CLIENT_ID = '1473807551329079408'; 
    const REDIRECT_URI = encodeURIComponent('https://fuma-clubs-official.vercel.app/api/auth/callback');
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify%20guilds`;

    // Avatars par défaut
    const DEFAULT_AVATAR = "https://i.ibb.co/4wPqLKzf/profile-picture-icon-png-people-person-profile-4.png";
    const PLACEHOLDER_AVATAR = "https://i.ibb.co/KcQsBkmB/3715527-image-profil-icon-male-icon-human-or-people-sign-and-symbol-vector-vectoriel-removebg-previe.png";

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
        const nav = document.getElementById('main-nav');
        if (!nav) return;

        const discordServerLink = 'https://discord.gg/xPz9FBkdtm';

        nav.innerHTML = `
            <div class="nav-container">
                <a href="index.html" class="fuma-logo">FUMA<span>CLUBS</span></a>
                
                <div class="fuma-burger" id="burger-menu">
                    <span></span><span></span><span></span>
                </div>

                <div class="nav-links" id="nav-links-container">
                    <a href="index.html">Home</a>
                    <a href="clubs.html">Clubs</a>
                    <a href="players.html">Players</a>
                    <a href="#">League</a>
                    <a href="#">Rules</a>
                    <a href="${discordServerLink}" target="_blank" style="color: #5865F2;">
                        <i class="fab fa-discord"></i> Discord
                    </a>
                </div>
            </div>
        `;

        const currentPage = window.location.pathname.split("/").pop() || 'index.html';
        const allLinks = nav.querySelectorAll('.nav-links a');

        allLinks.forEach(link => {
            const linkHref = link.getAttribute('href');
            if (currentPage === linkHref) {
                link.classList.add('active');
            }
        });

        // Liaison du bouton profile si présent
        const myProfileBtn = document.getElementById('btn-my-profile');
        if (myProfileBtn) {
            myProfileBtn.setAttribute('href', authUrl);
        }

        // Menu Burger
        const burger = document.getElementById('burger-menu');
        const linksContainer = document.getElementById('nav-links-container');
        
        if (burger && linksContainer) {
            burger.onclick = function() {
                burger.classList.toggle('active');
                linksContainer.classList.toggle('active');
            };
        }
    }

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
                checkExistingProfile(discordId);
                // Nettoyage de l'URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }

    async function checkExistingProfile(discordId) {
        const loader = document.getElementById('fuma-loader');
        const form = document.getElementById('profile-form');
        const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

        if (loader) loader.style.display = 'flex';
        if (form) form.style.display = 'none';

        try {
            const response = await fetch(`${APP_SCRIPT_URL}?discord_id=${discordId}&t=${Date.now()}`);
            if (!response.ok) throw new Error('Erreur serveur');
            
            const data = await response.json();

            if (data && data.result === "success") {
                const fill = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) el.value = (val !== undefined && val !== null) ? val : "";
                };

                fill('id-game', data.game_tag);
                fill('country', data.country);
                fill('avatar', data.avatar);
                fill('team', data.current_team);
                fill('main-archetype', data.main_archetype);
                fill('main-position', data.main_position);

                if (submitBtn) submitBtn.innerText = "Update Existing Profile";
            } else {
                if (submitBtn) submitBtn.innerText = "Create My Profile";
            }
        } catch (e) {
            console.error(e);
        } finally {
            setTimeout(() => {
                if (loader) loader.style.display = 'none';
                if (form) form.style.display = 'grid';
            }, 300);
        }
    }

    // --- 5. ENVOI DU FORMULAIRE ---
    function setupFormSubmission() {
        const profileForm = document.getElementById('profile-form');
        if (!profileForm) return;

        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = profileForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            
            submitBtn.disabled = true;
            submitBtn.innerText = "Updating...";

            const avatarInput = document.getElementById('avatar')?.value.trim();
            const finalAvatar = (avatarInput === "" || avatarInput.toLowerCase() === "none") ? DEFAULT_AVATAR : avatarInput;

            const formData = new URLSearchParams();
            formData.append('game_tag', document.getElementById('id-game')?.value || "");
            formData.append('discord_id', document.getElementById('id-discord')?.value || "");
            formData.append('discord_name', document.getElementById('discord-name')?.value || "");
            formData.append('country', document.getElementById('country')?.value || "");
            formData.append('avatar', finalAvatar);
            formData.append('current_team', document.getElementById('team')?.value || "Free Agent");
            formData.append('main_archetype', document.getElementById('main-archetype')?.value || "");
            formData.append('main_position', document.getElementById('main-position')?.value || "");

            try {
                // Utilisation de mode: 'no-cors' pour éviter les erreurs de redirection Google Apps Script
                await fetch(APP_SCRIPT_URL, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    mode: 'no-cors'
                });
                alert("Profile update sent! Check back in a few moments.");
            } catch (error) {
                console.error("Submission error:", error);
                alert("Update sent (please check your profile in a few moments).");
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
            clubContainer.innerHTML = "Error loading clubs.";
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
            
            // Extraction et nettoyage des headers (insensible à la casse et aux espaces)
            const headers = lines[0].split(",").map(h => h.trim().toUpperCase());

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

            const clubLine = lines.slice(1).find(line => {
                const columns = parseCSVLine(line);
                return columns[idx.team] === clubName;
            });

            if (clubLine) {
                const v = parseCSVLine(clubLine);
                
                // Formatage de l'historique (gestion des sauts de ligne)
                const formattedHistory = v[idx.history] 
                    ? v[idx.history].split('\n').map(p => `<p style="margin-bottom:15px;">${p}</p>`).join('') 
                    : "No history available.";
                
                // --- LOGIQUE DU ROSTER AVEC LIENS CLIQUABLES ---
                const rawPlayers = v[idx.players];
                let playersList = "<li>Roster is empty.</li>";

                if (rawPlayers && rawPlayers.trim() !== "" && rawPlayers.toLowerCase() !== "none") {
                    playersList = rawPlayers.split(',')
                        .map(p => p.trim())
                        .filter(p => p.length > 0)
                        .map(p => {
                            // On crée un lien vers la page player.html en passant le tag en paramètre
                            return `
                                <li style="margin-bottom: 8px;">
                                    <i class="fas fa-user-circle" style="font-size:0.8rem; margin-right:10px; color:var(--fuma-primary);"></i>
                                    <a href="player.html?tag=${encodeURIComponent(p)}" style="color: var(--fuma-text-main); text-decoration: none; transition: 0.2s;" onmouseover="this.style.color='var(--fuma-primary)'" onmouseout="this.style.color='var(--fuma-text-main)'">
                                        ${p}
                                    </a>
                                </li>`;
                        })
                        .join('');
                }
                // ----------------------------------------------

                const isActive = v[idx.active]?.toUpperCase() === 'YES';
                const statusHTML = `
                    <span style="color: ${isActive ? '#4caf50' : '#f44336'}; font-weight: bold; font-size: 0.9rem; letter-spacing:1px;">
                        <i class="fas fa-circle" style="font-size: 10px; vertical-align: middle; margin-right:5px;"></i> 
                        ${isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>`;

                let streamHTML = '';
                if (v[idx.stream] && v[idx.stream].toLowerCase() !== "none") {
                    const isTwitch = v[idx.stream].includes('twitch.tv');
                    streamHTML = `
                        <h3 class="sidebar-title" style="margin-top:25px; font-size:0.9rem; color:var(--fuma-primary);">
                            <i class="fas fa-broadcast-tower"></i> LIVE STREAM
                        </h3>
                        <a href="${v[idx.stream]}" target="_blank" class="fuma-cta" style="display:block; text-align:center; background:#6441a5; font-size: 0.75rem; padding: 10px; margin-top:10px;">
                            <i class="${isTwitch ? 'fab fa-twitch' : 'fab fa-youtube'}"></i> WATCH NOW
                        </a>`;
                }

                let trophiesHTML = ''; 
                if (v[idx.trophies] && v[idx.trophies] !== "0" && v[idx.trophies].toLowerCase() !== "none") {
                    trophiesHTML = `
                        <div class="trophy-section" style="margin-bottom: 30px;">
                            <h3 class="sidebar-title" style="border:none; margin-bottom:15px; font-size:1rem;">
                                <i class="fas fa-trophy" style="color:var(--fuma-primary)"></i> ACHIEVEMENTS
                            </h3>
                            <div class="trophy-grid" style="display: flex; flex-wrap: wrap; gap: 10px;">
                                ${v[idx.trophies].split(',').map(t => `
                                    <div class="trophy-badge" style="background: rgba(212,175,55,0.1); padding: 6px 15px; border-radius: 20px; border: 1px solid var(--fuma-primary); font-size: 0.75rem; color: var(--fuma-primary); font-weight:600;">
                                        🏆 ${t.trim()}
                                    </div>`).join('')}
                            </div>
                        </div>`;
                }

                detailContainer.innerHTML = `
                    <div class="club-profile-header" style="text-align: center; margin-bottom: 60px;">
                        <img src="${v[idx.crest] || ''}" style="width: 160px; height: 160px; object-fit: contain; margin-bottom: 25px;" alt="Crest">
                        <h1 style="font-size: 3.5rem; color: var(--fuma-primary); margin-bottom:10px; font-weight:800; text-transform:uppercase;">${v[idx.team]}</h1>
                        <div class="status-badge">${statusHTML}</div>
                    </div>
                    
                    <div class="club-grid-layout" style="display: grid; grid-template-columns: 2fr 1fr; gap: 40px;">
                        <div class="club-main-info">
                            ${trophiesHTML}
                            <section>
                                <h2 style="color:var(--fuma-primary); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 20px; font-size: 1.2rem; letter-spacing:1px;">HISTORY</h2>
                                <div style="font-style: italic; color: var(--fuma-text-dim); line-height: 1.8; font-size: 0.95rem;">${formattedHistory}</div>
                            </section>
                            
                            <div class="stats-bar" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; background: var(--fuma-bg-card); padding: 25px; border-radius: 15px; margin-top: 40px; border: var(--fuma-border);">
                                <div class="stat-item" style="text-align: center;"><strong style="display: block; font-size: 1.8rem;">${v[idx.gp] || 0}</strong><span style="font-size: 0.65rem; color: var(--fuma-text-dim); text-transform: uppercase; letter-spacing:1px;">Games</span></div>
                                <div class="stat-item" style="text-align: center; color: #4caf50;"><strong style="display: block; font-size: 1.8rem;">${v[idx.win] || 0}</strong><span style="font-size: 0.65rem; color: var(--fuma-text-dim); text-transform: uppercase; letter-spacing:1px;">Win</span></div>
                                <div class="stat-item" style="text-align: center; color: #ffeb3b;"><strong style="display: block; font-size: 1.8rem;">${v[idx.draw] || 0}</strong><span style="font-size: 0.65rem; color: var(--fuma-text-dim); text-transform: uppercase; letter-spacing:1px;">Draw</span></div>
                                <div class="stat-item" style="text-align: center; color: #f44336;"><strong style="display: block; font-size: 1.8rem;">${v[idx.lost] || 0}</strong><span style="font-size: 0.65rem; color: var(--fuma-text-dim); text-transform: uppercase; letter-spacing:1px;">Lost</span></div>
                            </div>
                        </div>
                        
                        <div class="club-sidebar">
                            <div class="sidebar-box" style="background: var(--fuma-bg-card); padding: 30px; border-radius: 15px; border: var(--fuma-border); position: sticky; top: 20px;">
                                <h3 class="sidebar-title" style="color: var(--fuma-primary); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 15px; font-size: 0.9rem; letter-spacing:1px;">MANAGER</h3>
                                <p style="margin-bottom:30px; font-weight: 600; font-size: 1.1rem;">${v[idx.manager] || 'N/A'}</p>
                                
                                <h3 class="sidebar-title" style="color: var(--fuma-primary); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 15px; font-size: 0.9rem; letter-spacing:1px;">ROSTER</h3>
                                <ul class="roster-list" style="list-style: none; padding: 0; margin: 0; font-size: 0.95rem;">
                                    ${playersList}
                                </ul>
                                ${streamHTML}
                            </div>
                        </div>
                    </div>`;
            } else {
                detailContainer.innerHTML = "<div style='text-align:center; padding: 50px;'><h2 style='color:var(--fuma-primary)'>Club not found</h2><p>Please check the URL or return to the clubs list.</p></div>";
            }
        } catch (e) { 
            console.error("Error loading club profile:", e);
            detailContainer.innerHTML = "<p style='text-align:center; color:red; padding: 50px;'>Error loading club data. Please try again later.</p>";
        }
    }

    // --- 8. LOGIQUE LISTE DES JOUEURS (players.html) ---
   async function fetchFumaPlayers(gid = "1342244083") {
    const playerContainer = document.getElementById('fuma-js-players');
    if (!playerContainer) return;

    playerContainer.innerHTML = `
        <div class="fuma-loading-wrapper" style="grid-column: 1/-1; text-align: center; padding: 50px;">
            <div class="fuma-spinner" style="margin: 0 auto 15px;"></div>
            <p style="color: var(--fuma-primary); letter-spacing: 2px; text-transform: uppercase;">Loading season data...</p>
        </div>`;

    try {
        const resp = await fetch(`${PLAYERS_SHEET_BASE}${gid}`);
        const text = await resp.text();
        const lines = text.trim().split("\n");
        const headers = lines[0].split(",");

        const idx = {
            tag: headers.indexOf('GAME_TAG'),
            pos: headers.indexOf('MAIN_POSITION'),
            team: headers.indexOf('CURRENT_TEAM'),
            logo: headers.indexOf('LOGO'),
            rating: headers.indexOf('RATING'),
            avatar: headers.indexOf('AVATAR'),
            arch: headers.indexOf('MAIN_ARCHETYPE'),
            flag: headers.indexOf('FLAG')
        };

        allPlayers = lines.slice(1).map(line => {
            const v = parseCSVLine(line);
            const rawAvatar = v[idx.avatar] ? v[idx.avatar].trim() : "";
            const isValidAvatar = rawAvatar !== "" && rawAvatar.toLowerCase() !== "none" && rawAvatar.startsWith('http');
            
            return {
                tag: v[idx.tag] || "Unknown", 
                pos: v[idx.pos] || "N/A", 
                team: v[idx.team] || "Free Agent",
                logo: v[idx.logo] || "",
                rating: v[idx.rating] || "0.0", 
                avatar: isValidAvatar ? rawAvatar : DEFAULT_AVATAR,
                arch: v[idx.arch] || "Standard", 
                flag: v[idx.flag] || ""
            };
        }).filter(p => p.tag && p.tag !== "Unknown");

        // Mise à jour du filtre équipe en conservant la sélection si possible
        const teamFilter = document.getElementById('filter-team');
        if (teamFilter) {
            const currentSelectedTeam = teamFilter.value; // On mémorise le choix actuel
            const teams = [...new Set(allPlayers.map(p => p.team))].sort();
            teamFilter.innerHTML = '<option value="">All Teams</option>';
            teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team;
                option.textContent = team;
                teamFilter.appendChild(option);
            });
            teamFilter.value = currentSelectedTeam; // On restaure si l'équipe existe dans la nouvelle saison
        }

        // --- LA MODIFICATION CLÉ ---
        applyPlayerFilters(); 
        
    } catch (e) {
        playerContainer.innerHTML = "<p style='grid-column:1/-1; text-align:center; color:red;'>Error loading players.</p>";
    }
}
    function renderPlayers(list) {
    const container = document.getElementById('fuma-js-players');
    if (!container) return;

    container.innerHTML = list.map(p => {
        // --- ÉTAPE CRUCIALE : On définit l'ID à envoyer ---
        // On cherche p.id, sinon p.GAME_ID (nom CSV), sinon le pseudo (tag)
        const playerId = p.id || p.GAME_ID || p.tag; 

        const isFreeAgent = !p.team || p.team.toLowerCase().includes("free agent") || p.team === "";
        const teamBadge = isFreeAgent 
            ? `<div style="position: absolute; top: 0; left: 0; font-size: 1.2rem; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.8));" title="Free Agent">🆓</div>` 
            : `<div style="position: absolute; top: 2px; left: 2px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
                <img src="${p.logo}" alt="${p.team}" title="${p.team}" style="width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.7));">
               </div>`;

        return `
            <a href="player.html?id=${encodeURIComponent(playerId)}" class="player-link-wrapper" style="text-decoration: none; color: inherit; display: block; transition: transform 0.3s ease;">
                <div class="club-card" style="text-align:center; padding: 25px; position: relative; height: 100%;">
                    <div style="position: relative; width: 90px; height: 90px; margin: 0 auto 15px auto;">
                        <img src="${p.avatar}" alt="${p.tag}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid var(--fuma-primary);" onerror="this.src='${PLACEHOLDER_AVATAR}'">
                        ${teamBadge}
                        <div style="position: absolute; bottom: 0; right: 0; font-size: 1.1rem; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.7));">${p.flag}</div>
                    </div>
                    <h3 style="margin:0; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 1px;">${p.tag}</h3>
                    <p style="font-size: 0.75rem; color: var(--fuma-text-dim); margin: 5px 0;">${p.pos} | ${p.arch}</p>
                    <div style="position: absolute; top: 10px; right: 10px; background: var(--fuma-primary); color: black; font-weight: 800; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">${p.rating}</div>
                </div>
            </a>`;
    }).join('');
}


    async function fetchPlayerData(playerId, gid = "1342244083") {
    const headerContainer = document.getElementById('player-header');
    const statsContainer = document.getElementById('player-stats-container');
    const PLAYERS_SHEET_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=';

    try {
        const resp = await fetch(`${PLAYERS_SHEET_BASE}${gid}`);
        const text = await resp.text();
        const lines = text.trim().split("\n");
        const headers = lines[0].split(",");
        
        // On cherche la ligne du joueur
        const rows = lines.slice(1).map(line => {
            const v = parseCSVLine(line);
            let obj = {};
            headers.forEach((h, i) => obj[h.trim()] = v[i]);
            return obj;
        });

        const player = rows.find(p => p.GAME_ID === playerId || p.GAME_TAG === playerId);

        if (!player) {
            headerContainer.innerHTML = `<p style="text-align:center;">Joueur introuvable pour cette saison.</p>`;
            statsContainer.innerHTML = "";
            return;
        }

        // --- AFFICHAGE HEADER ---
        headerContainer.innerHTML = `
            <div class="player-profile-card" style="background: var(--fuma-bg-card); padding: 40px; border-radius: 20px; border: var(--fuma-border); text-align: center; position: relative; overflow: hidden;">
                <img src="${player.AVATAR || 'https://i.ibb.co/4wPqLKzf/profile-picture-icon-png-people-person-profile-4.png'}" style="width: 150px; height: 150px; border-radius: 50%; border: 3px solid var(--fuma-primary); object-fit: cover; margin-bottom: 20px;">
                <h1 style="font-size: 2.5rem; margin: 0;">${player.GAME_TAG} ${player.FLAG || ''}</h1>
                <p style="color: var(--fuma-primary); letter-spacing: 3px; font-weight: 600;">${player.MAIN_POSITION} | ${player.MAIN_ARCHETYPE}</p>
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-top: 20px;">
                    <img src="${player.LOGO}" style="height: 40px;" alt="Club">
                    <span style="font-size: 1.2rem;">${player.CURRENT_TEAM}</span>
                </div>
            </div>
        `;

        // --- AFFICHAGE STATS ---
        statsContainer.style.display = "grid";
        statsContainer.style.gridTemplateColumns = "repeat(auto-fit, minmax(250px, 1fr))";
        statsContainer.style.gap = "20px";
        statsContainer.style.marginTop = "30px";

        statsContainer.innerHTML = `
            ${renderStatCard("GÉNÉRAL", [
                { label: "Matchs Joués", val: player.GAME_PLAYED },
                { label: "Note Moyenne", val: player.RATING, color: "var(--fuma-primary)" },
                { label: "Cartons", val: player.CARDS }
            ])}
            ${renderStatCard("ATTAQUE", [
                { label: "Buts", val: player.GOALS },
                { label: "Passes D.", val: player.ASSISTS },
                { label: "Tirs", val: player.SHOTS }
            ])}
            ${renderStatCard("DISTRIBUTION", [
                { label: "Passes Réussies", val: player.SUCCESSFUL_PASSES },
                { label: "% Précision", val: player['%SUCCESSFUL_PASSES'] }
            ])}
            ${renderStatCard("DÉFENSE", [
                { label: "Tacles Réussis", val: player.SUCCESSFUL_TACKLES },
                { label: "% Tacles", val: player['%SUCCESSFUL_TACKLES'] }
            ])}
        `;

    } catch (e) {
        console.error(e);
        headerContainer.innerHTML = "Erreur de chargement.";
    }
}

function renderStatCard(title, stats) {
    return `
        <div class="stat-box" style="background: var(--fuma-bg-card); border: var(--fuma-border); padding: 20px; border-radius: 12px;">
            <h3 style="color: var(--fuma-primary); font-size: 0.9rem; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 15px;">${title}</h3>
            ${stats.map(s => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: var(--fuma-text-dim);">${s.label}</span>
                    <span style="font-weight: bold; color: ${s.color || 'white'}">${s.val || '0'}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// Écouteur pour le changement de saison
document.getElementById('season-selector')?.addEventListener('change', (e) => {
    const params = new URLSearchParams(window.location.search);
    const playerId = params.get('id');
    if (playerId) fetchPlayerData(playerId, e.target.value);
});

  // --- 9. INITIALISATION ---
    injectNavigation();
    handleProfilePage();
    setupFormSubmission();

    // --- LOGIQUE DES FILTRES JOUEURS ---
    const applyPlayerFilters = () => {
        const searchTerm = document.getElementById('player-search')?.value.toLowerCase() || "";
        const posFilter = document.getElementById('filter-position')?.value || "";
        const teamFilterVal = document.getElementById('filter-team')?.value || "";

        const filtered = allPlayers.filter(p => {
            const matchName = p.tag.toLowerCase().includes(searchTerm);
            const matchPos = posFilter === "" || p.pos === posFilter;
            const matchTeam = teamFilterVal === "" || p.team === teamFilterVal;
            return matchName && matchPos && matchTeam;
        });
        renderPlayers(filtered);
    };

    // Écouteurs pour les filtres joueurs
    document.getElementById('player-search')?.addEventListener('input', applyPlayerFilters);
    document.getElementById('filter-position')?.addEventListener('change', applyPlayerFilters);
    document.getElementById('filter-team')?.addEventListener('change', applyPlayerFilters);
    
    // Filtre de Saison
    document.getElementById('filter-season')?.addEventListener('change', (e) => {
        fetchFumaPlayers(e.target.value);
    });

    // Recherche clubs
    document.getElementById('fuma-search')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        renderClubs(allClubs.filter(c => c.name.toLowerCase().includes(term)));
    });

    // Retour en haut (Scroll button)
    const backBtn = document.getElementById('backTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) backBtn?.classList.add('visible');
        else backBtn?.classList.remove('visible');
    });
    backBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // --- DÉCLENCHEMENT DES CHARGEMENTS SELON LA PAGE ---

    // Page Liste des Clubs
    if (document.getElementById('fuma-js-clubs')) fetchFumaClubs();

    // Page Liste des Joueurs
    if (document.getElementById('fuma-js-players')) fetchFumaPlayers();

    // Page Détails Club
    if (document.getElementById('club-details')) loadClubProfile();

    // Page Profil Joueur (Avec Loader)
    if (document.getElementById('player-header')) {
        const params = new URLSearchParams(window.location.search);
        const playerId = params.get('id') || params.get('tag');
        
        if (playerId) {
            // ON AFFICHE LE LOADER AVANT DE CHARGER
            document.getElementById('player-header').innerHTML = `
                <div class="fuma-loading-wrapper" style="text-align: center; padding: 100px;">
                    <div class="fuma-spinner" style="margin: 0 auto 15px;"></div>
                    <p style="color: var(--fuma-primary); letter-spacing: 2px; text-transform: uppercase;">Loading Player Profile...</p>
                </div>`;
            
            fetchPlayerData(playerId);
        } else {
            document.getElementById('player-header').innerHTML = "<h2 style='text-align:center;margin-top:50px;'>No player specified.</h2>";
        }
    }

}); // FIN DU DOMContentLoaded











