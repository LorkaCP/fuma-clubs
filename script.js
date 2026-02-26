document.addEventListener('DOMContentLoaded', () => {
    let allClubs = [];
    let allPlayers = []; // Stockage pour la recherche de joueurs
    
    // --- 1. CONFIGURATION & URLS ---
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=252630071&single=true&output=csv';
    const PLAYERS_SHEET_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=';
    const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxSfK2yON42X5YSlOgk3BsP8_BPJ5oOnMpfPN68IH3sfon1idlCE9ELWYYy1uoP7rUV3Q/exec?action=profile';
    const CLIENT_ID = '1473807551329079408'; 
    const REDIRECT_URI = encodeURIComponent('https://fuma-clubs-official.vercel.app/api/auth/callback');
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify%20guilds`;

    // Avatars par défaut
    const DEFAULT_AVATAR = "https://i.ibb.co/4wPqLKzf/profile-picture-icon-png-people-person-profile-4.png";
    const PLACEHOLDER_AVATAR = "https://i.ibb.co/4wPqLKzf/profile-picture-icon-png-people-person-profile-4.png";

       
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
                    <a href="league.html">League</a>
                    <a href="clubs.html">Clubs</a>
                    <a href="players.html">Players</a>
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
async function loadTeamsList() {
    const teamSelect = document.getElementById('team');
    if (!teamSelect) return;

    try {
        const resp = await fetch(SHEET_URL);
        const text = await resp.text();
        const lines = text.trim().split("\n");
        const headers = lines[0].split(",");
        
        // Identification des index de colonnes
        const teamIdx = headers.indexOf('TEAMS');
        const activeIdx = headers.indexOf('ACTIVE');

        const teams = lines.slice(1)
            .map(line => {
                const columns = parseCSVLine(line);
                return {
                    name: columns[teamIdx],
                    active: columns[activeIdx] ? columns[activeIdx].trim().toUpperCase() : ""
                };
            })
            .filter(club => {
                // On garde si : 
                // 1. Le nom existe
                // 2. Ce n'est pas un "Free Agent" (déjà en dur dans le HTML)
                // 3. La colonne ACTIVE n'est pas égale à "NO"
                return club.name && 
                       club.name.trim() !== "" && 
                       !club.name.toLowerCase().includes('free agent') && 
                       club.active !== "NO";
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        // Ajout des options filtrées au menu déroulant
        teams.forEach(club => {
            const option = document.createElement('option');
            option.value = club.name;
            option.textContent = club.name;
            teamSelect.appendChild(option);
        });
    } catch (e) {
        console.error("Erreur lors du chargement des équipes :", e);
    }
}

    
    async function handleProfilePage() {
    // Vérifie si nous sommes bien sur la page profile.html
    if (!window.location.pathname.includes('profile.html')) return;

    // 1. Charger la liste des clubs dans le menu déroulant
    await loadTeamsList();

    // 2. Récupération des paramètres Discord dans l'URL (après redirection Auth)
    const params = new URLSearchParams(window.location.search);
    const discordUsername = params.get('username');
    const discordId = params.get('id');

    // 3. Si les infos Discord sont présentes, on pré-remplit le formulaire
    if (discordUsername && discordUsername !== "undefined" && discordId && discordId !== "undefined") {
        const nameInput = document.getElementById('discord-name');
        const idInput = document.getElementById('id-discord');
        
        if (nameInput && idInput) {
            nameInput.value = decodeURIComponent(discordUsername);
            idInput.value = discordId;
            
            // On vérifie si ce joueur a déjà un profil enregistré
            checkExistingProfile(discordId);
            
            // Nettoyage de l'URL pour la sécurité et l'esthétique
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
            // Correction : on utilise & pour ajouter un paramètre supplémentaire
const response = await fetch(`${APP_SCRIPT_URL}&discord_id=${discordId}&t=${Date.now()}`);
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
        
        // 1. État visuel de chargement
        submitBtn.disabled = true;
        submitBtn.innerText = "Updating...";

        // 2. Préparation des données
        const avatarInput = document.getElementById('avatar')?.value.trim();
        const DEFAULT_AVATAR = "https://via.placeholder.com/150"; // Assurez-vous que cette variable est définie
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
            // 3. Envoi à Google Apps Script
            await fetch(APP_SCRIPT_URL, {
                method: 'POST',
                body: formData,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                mode: 'no-cors'
            });

            // 4. Succès : Mise à jour de l'interface
            const statusBox = document.getElementById('status-message');
            const statusText = document.getElementById('status-text');

            if (statusBox && statusText) {
                // On affiche le message et on cache le formulaire
                statusText.innerText = "Profile updated! Redirecting to players list in 3 seconds...";
                statusBox.style.display = 'block';
                profileForm.style.display = 'none'; 
                
                // Remonte en haut de page pour que le message soit visible
                window.scrollTo({ top: 0, behavior: 'smooth' });

                // 5. Redirection automatique après 3 secondes
                setTimeout(() => {
                    window.location.href = 'players.html';
                }, 3000);
            }

        } catch (error) {
            console.error("Submission error:", error);
            
            // En cas d'erreur, on avertit l'utilisateur et on réactive le bouton
            alert("An error occurred during update. Please try again.");
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
        
        // Header extraction and normalization
        const headers = lines[0].split(",").map(h => h.trim().toUpperCase());

        const idx = {
            team: headers.indexOf('TEAMS'),
            crest: headers.indexOf('CREST'),
            active: headers.indexOf('ACTIVE'),
            history: headers.indexOf('HISTORY'),
            stream: headers.indexOf('STREAM'),
            media: headers.indexOf('MEDIA'),
            gp: headers.indexOf('GAMES PLAYED'),
            win: headers.indexOf('WIN'),
            draw: headers.indexOf('DRAW'),
            lost: headers.indexOf('LOST'),
            trophies: headers.indexOf('TROPHIES'),
            manager: headers.indexOf('MANAGER'),
            players: headers.indexOf('PLAYERS')
        };

        const clubLine = lines.slice(1).find(line => {
            const columns = parseCSVLine(line);
            return columns[idx.team] === clubName;
        });

        if (clubLine) {
            const v = parseCSVLine(clubLine);
            
            // --- 1. TROPHIES LOGIC ---
            let trophiesHTML = '';
            const rawTrophies = v[idx.trophies] || "";
            if (rawTrophies.trim() !== "" && rawTrophies.toLowerCase() !== "none") {
                const trophyList = rawTrophies.split(',').map(t => t.trim());
                trophiesHTML = `
                    <div style="margin-bottom: 30px; padding: 20px; background: linear-gradient(145deg, rgba(255, 215, 0, 0.1), rgba(0,0,0,0)); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 15px;">
                        <h3 style="color: #ffd700; font-size: 0.75rem; letter-spacing: 2px; margin-bottom: 15px; text-transform: uppercase; font-weight: 800;">
                            <i class="fas fa-trophy" style="margin-right: 8px;"></i> HONOURS & TROPHIES
                        </h3>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                            ${trophyList.map(t => `
                                <span style="background: rgba(255,255,255,0.05); padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; color: #fff; border: 1px solid rgba(255,255,255,0.1); font-weight: 600;">
                                    <i class="fas fa-medal" style="color: #ffd700; margin-right: 5px;"></i>${t}
                                </span>`).join('')}
                        </div>
                    </div>`;
            }

            // --- 2. SOCIAL MEDIA LOGIC (MEDIA) ---
            let mediaIconsHTML = '';
            if (v[idx.media] && v[idx.media].toLowerCase() !== "none") {
                const links = v[idx.media].split(',').map(l => l.trim());
                mediaIconsHTML = `<div style="display: flex; gap: 15px; justify-content: center; margin-top: 15px;">`;
                
                links.forEach(link => {
                    let icon = 'fas fa-link';
                    if (link.includes('twitter.com') || link.includes('x.com')) icon = 'fab fa-x-twitter';
                    if (link.includes('instagram.com')) icon = 'fab fa-instagram';
                    if (link.includes('facebook.com')) icon = 'fab fa-facebook';
                    if (link.includes('discord')) icon = 'fab fa-discord';
                    if (link.includes('tiktok.com')) icon = 'fab fa-tiktok';
                    if (link.includes('youtube.com') && !link.includes('watch')) icon = 'fab fa-youtube';
                    
                    mediaIconsHTML += `
                        <a href="${link}" target="_blank" style="color: var(--fuma-text-dim); font-size: 1.2rem; transition: 0.3s;" onmouseover="this.style.color='var(--fuma-primary)'" onmouseout="this.style.color='var(--fuma-text-dim)'">
                            <i class="${icon}"></i>
                        </a>`;
                });
                mediaIconsHTML += `</div>`;
            }

            // --- 3. STREAM & COMMUNITY SECTION ---
            let streamBlockHTML = '';
            const hasStream = v[idx.stream] && v[idx.stream].toLowerCase() !== "none";
            
            if (hasStream || mediaIconsHTML !== '') {
                streamBlockHTML = `<div style="margin-bottom: 35px;">
                    <h3 class="sidebar-title" style="color: var(--fuma-primary); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 15px; font-size: 0.85rem; letter-spacing:1px;">COMMUNITY</h3>`;
                
                if (hasStream) {
                    const isTwitch = v[idx.stream].includes('twitch.tv');
                    streamBlockHTML += `
                        <a href="${v[idx.stream]}" target="_blank" class="fuma-cta" style="display:block; text-align:center; background:#6441a5; font-size: 0.75rem; padding: 10px; margin-bottom: 10px;">
                            <i class="${isTwitch ? 'fab fa-twitch' : 'fab fa-youtube'}"></i> WATCH LIVE
                        </a>`;
                }
                
                streamBlockHTML += mediaIconsHTML + `</div>`;
            }

            // --- 4. ROSTER LOGIC (2 COLUMNS) ---
            const rawPlayers = v[idx.players] || "";
            let playersListHTML = "<li style='grid-column: 1 / -1; color:var(--fuma-text-dim);'>No players registered.</li>";

            if (rawPlayers.trim() !== "" && rawPlayers.toLowerCase() !== "none") {
                playersListHTML = rawPlayers.split(',')
                    .map(p => p.trim())
                    .filter(p => p.length > 0)
                    .map(p => `
                        <li style="display: flex; align-items: center; min-width: 0;">
                            <i class="fas fa-user-circle" style="font-size:0.7rem; margin-right:8px; color:var(--fuma-primary); flex-shrink: 0;"></i>
                            <a href="player.html?id=${encodeURIComponent(p)}" 
                               style="color: var(--fuma-text-main); text-decoration: none; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: 0.2s;"
                               onmouseover="this.style.color='var(--fuma-primary)'" 
                               onmouseout="this.style.color='var(--fuma-text-main)'">
                                 ${p}
                            </a>
                        </li>`).join('');
            }

            // --- 5. HISTORY & STATUS FORMATTING ---
            const formattedHistory = v[idx.history] 
                ? v[idx.history].split('\n').map(line => `<p style="margin-bottom:15px;">${line}</p>`).join('') 
                : "No historical information available.";

            const isActive = v[idx.active]?.toUpperCase() === 'YES';

            // --- 6. FINAL HTML GENERATION ---
            detailContainer.innerHTML = `
                <div class="club-profile-header" style="text-align: center; margin-bottom: 50px;">
                    <img src="${v[idx.crest] || ''}" style="width: 150px; height: 150px; object-fit: contain; margin-bottom: 20px;" alt="Crest">
                    <h1 class="club-title-responsive" style="font-size: 3rem; font-weight: 800; text-transform: uppercase;">${v[idx.team]}</h1>
                    <div style="margin-top: 10px;">
                        <span style="color: ${isActive ? '#4caf50' : '#f44336'}; font-weight: 600; font-size: 0.9rem; letter-spacing: 1px;">
                            <i class="fas fa-circle" style="font-size: 8px; vertical-align: middle; margin-right: 5px;"></i>
                            ${isActive ? 'ACTIVE CLUB' : 'INACTIVE CLUB'}
                        </span>
                    </div>
                </div>
                
                <div class="club-grid-layout">
                    <div class="club-main-info">
                        
                        ${trophiesHTML}

                        <section style="margin-bottom: 40px;">
                            <h2 style="color:var(--fuma-primary); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 20px; font-size: 1.2rem; letter-spacing:1px;">CLUB HISTORY</h2>
                            <div style="font-style: italic; color: var(--fuma-text-dim); line-height: 1.8; font-size: 0.95rem;">
                                ${formattedHistory}
                            </div>
                        </section>
                        
                        <div class="stats-bar" style="display: flex; justify-content: space-around; background: var(--fuma-bg-card); padding: 25px; border-radius: 15px; border: var(--fuma-border);"> 
                            <div style="text-align: center;"><strong style="display: block; font-size: 1.8rem;">${v[idx.gp] || 0}</strong><span style="font-size: 0.6rem; color: var(--fuma-text-dim); text-transform: uppercase;">Played</span></div>
                            <div style="text-align: center; color: #4caf50;"><strong style="display: block; font-size: 1.8rem;">${v[idx.win] || 0}</strong><span style="font-size: 0.6rem; color: var(--fuma-text-dim); text-transform: uppercase;">Wins</span></div>
                            <div style="text-align: center; color: #ffeb3b;"><strong style="display: block; font-size: 1.8rem;">${v[idx.draw] || 0}</strong><span style="font-size: 0.6rem; color: var(--fuma-text-dim); text-transform: uppercase;">Draws</span></div>
                            <div style="text-align: center; color: #f44336;"><strong style="display: block; font-size: 1.8rem;">${v[idx.lost] || 0}</strong><span style="font-size: 0.6rem; color: var(--fuma-text-dim); text-transform: uppercase;">Losses</span></div>
                        </div>
                    </div>
                    
                    <div class="club-sidebar">
                        <div class="sidebar-box" style="background: var(--fuma-bg-card); padding: 30px; border-radius: 15px; border: var(--fuma-border); position: sticky; top: 20px;">
                            
                            ${streamBlockHTML}

                            <h3 class="sidebar-title" style="color: var(--fuma-primary); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 15px; font-size: 0.85rem; letter-spacing:1px;">MANAGER</h3>
                            <p style="margin-bottom:35px; font-weight: 600; font-size: 1.1rem;">${v[idx.manager] || 'N/A'}</p>
                            
                            <h3 class="sidebar-title" style="color: var(--fuma-primary); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 15px; font-size: 0.85rem; letter-spacing:1px;">ROSTER</h3>
                            <ul class="roster-list" style="list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px 15px;">
                                ${playersListHTML}
                            </ul>

                        </div>
                    </div>
                </div>`;
        } else {
            detailContainer.innerHTML = "<div style='text-align:center; padding: 50px;'><h2 style='color:var(--fuma-primary)'>Club not found</h2></div>";
        }
    } catch (e) { 
        console.error("Error:", e);
        detailContainer.innerHTML = "<p style='text-align:center; color:red; padding: 50px;'>Error loading data.</p>";
    }
}
 /**
 * AGGREGATION LOGIC : Une ligne = Une performance de match
 * Ce script regroupe les données par Player ID (GAME_ID)
 */

// --- FONCTION UTILITAIRE POUR RÉCUPÉRER LE REGISTRE FIXE ---
async function getPlayerRegistry() {
    const REGISTRY_GID = "1342244083"; 
    const url = `${PLAYERS_SHEET_BASE}${REGISTRY_GID}&t=${Date.now()}`;
    try {
        const resp = await fetch(url);
        const text = await resp.text();
        const lines = text.trim().split("\n");
        const headers = lines[0].split(",").map(h => h.trim().toUpperCase());
        
        const registry = {};
        lines.slice(1).forEach(line => {
            const v = parseCSVLine(line);
            const id = v[headers.indexOf('GAME_ID')];
            if (id) {
                registry[id] = {
                    tag: v[headers.indexOf('GAME_TAG')] || "Unknown",
                    avatar: (v[headers.indexOf('AVATAR')] && v[headers.indexOf('AVATAR')].startsWith('http')) 
                            ? v[headers.indexOf('AVATAR')] 
                            : (typeof PLACEHOLDER_AVATAR !== 'undefined' ? PLACEHOLDER_AVATAR : ""),
                    flag: v[headers.indexOf('FLAG')] || "🏳️",
                    discordId: v[headers.indexOf('DISCORD_ID')] || ""
                };
            }
        });
        return registry;
    } catch (e) {
        console.error("Erreur Registry:", e);
        return {};
    }
}

// --- 1. MISE À JOUR : FETCH FUMA PLAYERS ---
async function fetchFumaPlayers(gid = "1342244083") {
    const playerContainer = document.getElementById('fuma-js-players');
    if (!playerContainer) return;

    playerContainer.innerHTML = `
        <div class="fuma-loading-wrapper" style="grid-column: 1/-1; text-align: center; padding: 50px;">
            <div class="fuma-spinner" style="margin: 0 auto 15px;"></div>
            <p style="color: var(--fuma-primary); letter-spacing: 2px; text-transform: uppercase;">Syncing Database...</p>
        </div>`;

    try {
        // A. Récupérer les données fixes (Images/Drapeaux)
        const playerRegistry = await getPlayerRegistry();

        // B. Récupérer les données de la saison (Stats/Clubs/Positions)
        const resp = await fetch(`${PLAYERS_SHEET_BASE}${gid}&t=${Date.now()}`);
        const text = await resp.text();
        const lines = text.trim().split("\n").filter(line => line.trim() !== "");
        const headers = lines[0].split(",").map(h => h.trim().toUpperCase());

        const idx = {
            id: headers.indexOf('GAME_ID'),
            team: headers.indexOf('CURRENT_TEAM'),
            logo: headers.indexOf('LOGO'),
            pos: headers.indexOf('MAIN_POSITION'),
            arch: headers.indexOf('MAIN_ARCHETYPE'),
            rating: headers.indexOf('RATING'),
            goals: headers.indexOf('GOALS'),
            assists: headers.indexOf('ASSISTS')
        };

        const playersMap = {};

        lines.slice(1).forEach(line => {
            const v = parseCSVLine(line);
            const pId = v[idx.id];
            if (!pId || pId === "" || pId.includes("#REF")) return;

            if (!playersMap[pId]) {
                // On fusionne le fixe (Registry) et le dynamique (Saison)
                playersMap[pId] = {
                    id: pId,
                    ...(playerRegistry[pId] || { tag: pId, avatar: PLACEHOLDER_AVATAR, flag: "" }),
                    team: v[idx.team] || "Free Agent",
                    logo: v[idx.logo] || "",
                    pos: v[idx.pos] || "N/A",
                    arch: v[idx.arch] || "Standard",
                    matchCount: 0,
                    totalRating: 0,
                    totalGoals: 0,
                    totalAssists: 0
                };
            }

            playersMap[pId].matchCount += 1;
            playersMap[pId].totalRating += parseFloat(v[idx.rating] || 0);
            playersMap[pId].totalGoals += parseInt(v[idx.goals] || 0);
            playersMap[pId].totalAssists += parseInt(v[idx.assists] || 0);
        });

        allPlayers = Object.values(playersMap).map(p => ({
            ...p,
            rating: (p.totalRating / p.matchCount).toFixed(1),
            goals: p.totalGoals,
            assists: p.totalAssists,
            gp: p.matchCount
        }));

        updateTeamFilter(allPlayers);
        applyPlayerFilters(); 
        
    } catch (e) {
        console.error("Aggregation Error:", e);
        playerContainer.innerHTML = `<p style='grid-column:1/-1; text-align:center; color:red;'>Error: ${e.message}</p>`;
    }
}

// --- 2. MISE À JOUR : RENDER PLAYERS ---
function renderPlayers(list) {
    const container = document.getElementById('fuma-js-players');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--fuma-text-dim);">No players found.</p>`;
        return;
    }

    container.innerHTML = list.map(p => {
        const isFreeAgent = !p.team || p.team.toLowerCase().includes("free agent");
        const teamBadge = isFreeAgent 
            ? `<div style="position: absolute; top: 0; left: 0; font-size: 1.2rem; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.8));">🆓</div>` 
            : `<div style="position: absolute; top: 2px; left: 2px; width: 28px; height: 28px;"><img src="${p.logo}" style="width:100%; object-fit:contain; filter:drop-shadow(0 2px 3px rgba(0,0,0,0.7));" onerror="this.style.display='none'"></div>`;

        return `
            <a href="player.html?id=${encodeURIComponent(p.id)}" class="player-link-wrapper" style="text-decoration: none; color: inherit;">
                <div class="club-card" style="text-align:center; padding: 25px; position: relative; transition: 0.3s; height: 100%;">
                    <div style="position: relative; width: 90px; height: 90px; margin: 0 auto 15px auto;">
                        <img src="${p.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid var(--fuma-primary);" onerror="this.src='${PLACEHOLDER_AVATAR}'">
                        ${teamBadge}
                        <div style="position: absolute; bottom: 0; right: 0; font-size: 1.1rem;">${p.flag}</div>
                    </div>
                    <h3 style="margin:0; text-transform: uppercase; font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.tag}</h3>
                    <p style="font-size: 0.75rem; color: var(--fuma-text-dim); margin: 5px 0;">${p.pos} | ${p.arch}</p>
                    <p style="font-size: 0.7rem; font-weight: 600; color: var(--fuma-primary);">${p.gp} MP | ${p.goals} G | ${p.assists} A</p>
                    <div style="position: absolute; top: 10px; right: 10px; background: var(--fuma-primary); color: black; font-weight: 800; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">${p.rating}</div>
                </div>
            </a>`;
    }).join('');
}

// --- 3. MISE À JOUR : FETCH PLAYER DATA (Profil individuel) ---
async function fetchPlayerData(playerId, gid = "1342244083") {
    const headerContainer = document.getElementById('player-header');
    const statsContainer = document.getElementById('player-stats-container');

    try {
        const playerRegistry = await getPlayerRegistry();
        const resp = await fetch(`${PLAYERS_SHEET_BASE}${gid}&t=${Date.now()}`);
        const text = await resp.text();
        const lines = text.trim().split("\n");
        const headers = lines[0].split(",").map(h => h.trim().toUpperCase());
        
        const performances = lines.slice(1)
            .map(line => {
                const v = parseCSVLine(line);
                let obj = {};
                headers.forEach((h, i) => obj[h] = v[i]);
                return obj;
            })
            .filter(row => row.GAME_ID === playerId);

        if (performances.length === 0) {
            headerContainer.innerHTML = `<div style="text-align:center; padding:50px;"><h2>Player not found</h2><p>No matches recorded for this season.</p></div>`;
            return;
        }

        const pData = performances[0]; 
        const identity = playerRegistry[playerId] || { tag: pData.GAME_TAG, avatar: PLACEHOLDER_AVATAR, flag: "" };

        const stats = performances.reduce((acc, curr) => {
            acc.goals += parseInt(curr.GOALS || 0);
            acc.assists += parseInt(curr.ASSISTS || 0);
            acc.ratingSum += parseFloat(curr.RATING || 0);
            acc.shots += parseInt(curr.SHOTS || 0);
            acc.passes += parseInt(curr.SUCCESSFUL_PASSES || 0);
            acc.tackles += parseInt(curr.SUCCESSFUL_TACKLES || 0);
            acc.motm += parseInt(curr.MOTM || 0);
            return acc;
        }, { goals: 0, assists: 0, ratingSum: 0, shots: 0, passes: 0, tackles: 0, motm: 0 });

        const avgRating = (stats.ratingSum / performances.length).toFixed(1);

        headerContainer.innerHTML = `
            <div class="player-card-header" style="position: relative;">
               <img src="${identity.avatar}" class="player-avatar-main" onerror="this.src='${PLACEHOLDER_AVATAR}'">
                <h1 style="font-size: 2.5rem; margin: 10px 0;">${identity.tag} ${identity.flag}</h1>
                <p style="color: var(--fuma-primary); letter-spacing: 2px; text-transform: uppercase;">${pData.MAIN_POSITION} | ${pData.MAIN_ARCHETYPE}</p>
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-top: 15px;">
                    <img src="${pData.LOGO || ''}" style="height: 40px;" onerror="this.style.display='none'">
                    <span style="font-size: 1.2rem; font-weight: 600;">${pData.CURRENT_TEAM || 'Free Agent'}</span>
                </div>
                <div class="rating-badge-large" style="position: absolute; top: 20px; right: 30px; font-size: 3rem; background: var(--fuma-primary); color: black; padding: 5px 15px; border-radius: 10px; font-weight: 800;">${avgRating}</div>
            </div>`;

        statsContainer.innerHTML = `
            <div class="stat-block">
                <h3><i class="fas fa-info-circle"></i> Season Summary</h3>
                ${renderStatRow("Matches Played", performances.length)}
                ${renderStatRow("Average Rating", avgRating, "highlight")}
                ${renderStatRow("MOTM", stats.motm)}
            </div>
            <div class="stat-block">
                <h3><i class="fas fa-fire"></i> Offensive</h3>
                ${renderStatRow("Total Goals", stats.goals, "highlight")}
                ${renderStatRow("Total Assists", stats.assists, "highlight")}
                ${renderStatRow("Total Shots", stats.shots)}
            </div>
            <div class="stat-block">
                <h3><i class="fas fa-shield-alt"></i> Contribution</h3>
                ${renderStatRow("Successful Passes", stats.passes)}
                ${renderStatRow("Successful Tackles", stats.tackles)}
            </div>
        `;

    } catch (e) {
        console.error(e);
        headerContainer.innerHTML = `<p style='text-align:center; color:red;'>Error loading player profile.</p>`;
    }
}

// --- 4. MISE À JOUR : RENDER STAT ROW ---
function renderStatRow(label, value, extraClass = "") {
    const isHighlight = extraClass.includes("highlight") ? "color: var(--fuma-primary); font-weight: 800; font-size: 1.2rem;" : "";
    return `
        <div class="stat-row" style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <span class="stat-label" style="color: var(--fuma-text-dim); font-size: 0.9rem;">${label}</span>
            <span class="stat-value ${extraClass}" style="${isHighlight}">${value}</span>
        </div>`;
}

// --- 5. MISE À JOUR : UPDATE TEAM FILTER ---
function updateTeamFilter(players) {
    const teamFilter = document.getElementById('filter-team');
    if (!teamFilter) return;
    
    const currentSelection = teamFilter.value;
    // Récupérer les noms uniques des équipes présentes dans la saison
    const teams = [...new Set(players.map(p => p.team))]
        .filter(t => t && t.trim() !== "")
        .sort();

    teamFilter.innerHTML = '<option value="">All Teams</option>' + 
        teams.map(t => `<option value="${t}">${t}</option>`).join('');
    
    // Garder la sélection si elle existe toujours
    if (teams.includes(currentSelection)) {
        teamFilter.value = currentSelection;
    }
}
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

    document.getElementById('player-search')?.addEventListener('input', applyPlayerFilters);
    document.getElementById('filter-position')?.addEventListener('change', applyPlayerFilters);
    document.getElementById('filter-team')?.addEventListener('change', applyPlayerFilters);
    document.getElementById('filter-season')?.addEventListener('change', (e) => fetchFumaPlayers(e.target.value));

    document.getElementById('fuma-search')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        renderClubs(allClubs.filter(c => c.name.toLowerCase().includes(term)));
    });

    const backBtn = document.getElementById('backTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) backBtn?.classList.add('visible');
        else backBtn?.classList.remove('visible');
    });
    backBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // --- DÉCLENCHEMENT DES CHARGEMENTS ---
    if (document.getElementById('fuma-js-clubs')) fetchFumaClubs();
    if (document.getElementById('fuma-js-players')) fetchFumaPlayers();
    if (document.getElementById('club-details')) loadClubProfile();

    // --- LOGIQUE PROFIL JOUEUR (VOTRE SOLUTION OPTIMISÉE) ---
    const playerHeader = document.getElementById('player-header');
    if (playerHeader) {
        const params = new URLSearchParams(window.location.search);
        const playerId = params.get('id') || params.get('tag');
        
        if (playerId) {
            // On remplace le contenu par la structure de la carte + la roue
            playerHeader.innerHTML = `
                <div class="player-card-header" style="min-height: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div class="fuma-spinner"></div>
                    <p style="color: var(--fuma-primary); margin-top: 20px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">
                        Loading Profile...
                    </p>
                </div>`;
            
            // Délai pour laisser la roue tourner
            setTimeout(() => {
                fetchPlayerData(playerId);
            }, 1500);

        } else {
            // Si vraiment pas d'ID, on affiche le message d'erreur proprement
            playerHeader.innerHTML = `
                <div class="player-card-header">
                    <h2 style="color: var(--fuma-primary);">No Player Specified</h2>
                    <p>Please return to the database.</p>
                </div>`;
        }
    }

}); // FIN DU DOMContentLoaded














































