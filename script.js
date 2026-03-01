document.addEventListener('DOMContentLoaded', () => {
    let allClubs = [];
    let allPlayers = []; // Stockage pour la recherche de joueurs
    
    // --- 1. CONFIGURATION & URLS ---
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=252630071&single=true&output=csv';
    const PLAYERS_SHEET_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=';
    const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzkvEq_gPVk6ooIg0twQy9HnpbzoKetSOiKIpoOlHDYCmcMQmobi5w99krpm-fKEwRFHw/exec?action=profile';
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
    
    // --- FIX: Définition des variables avant usage ---
    const currentUser = getStoredUser();
    const profileLink = currentUser ? `profile.html?id=${currentUser.id}` : authUrl;
    const profileText = currentUser ? `<i class="fas fa-user"></i> ${currentUser.username}` : "Login";

    nav.innerHTML = `
        <div class="nav-container">
            <a href="index.html" class="fuma-logo">FUMA<span>CLUBS</span></a>
            <div class="fuma-burger" id="burger-menu">
                <span></span><span></span><span></span>
            </div>
            <div class="nav-links" id="nav-links-container">
                <a href="index.html">Home</a>
                <a href="league.html">League</a>
                <a href="#">Rules</a>
                <a href="clubs.html">Clubs</a>
                <a href="players.html">Players</a>
                <a href="${profileLink}" class="profile-link">${profileText}</a>
                <a href="${discordServerLink}" target="_blank" style="color: #5865F2;">
                    <i class="fab fa-discord"></i></a>
            </div>
        </div>
    `;

    // ... reste de la fonction (gestion de la classe 'active' et du burger)
   const currentPage = window.location.pathname.split("/").pop() || 'index.html';
    const allLinks = nav.querySelectorAll('.nav-links a');

    allLinks.forEach(link => {
        if (currentPage === link.getAttribute('href')) {
            link.classList.add('active');
        }
    });

    const burger = document.getElementById('burger-menu');
    const linksContainer = document.getElementById('nav-links-container');
    if (burger && linksContainer) {
        burger.onclick = () => {
            burger.classList.toggle('active');
            linksContainer.classList.toggle('active');
        };
    }
}
async function loadTeamsList() {
    const teamSelect = document.getElementById('team');
    if (!teamSelect) return;

    try {
        const resp = await fetch(SHEET_URL);
        const text = await resp.text();
        const lines = text.trim().split("\n");
        const headers = lines[0].split(",");
        
        const teamIdx = headers.indexOf('TEAMS');
        const activeIdx = headers.indexOf('ACTIVE');

        if (teamIdx === -1) {
            console.error("Colonne 'TEAMS' introuvable dans le CSV");
            return;
        }

        const teams = lines.slice(1)
            .map(line => {
                const columns = parseCSVLine(line);
                return {
                    name: columns[teamIdx],
                    active: activeIdx !== -1 && columns[activeIdx] ? columns[activeIdx].trim().toUpperCase() : "YES"
                };
            })
            .filter(club => {
                return club.name && 
                       club.name.trim() !== "" && 
                       !club.name.toLowerCase().includes('free agent') && 
                       club.active !== "NO";
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        // Nettoyage avant ajout (garde l'option par défaut "Free Agent" si elle est dans le HTML)
        // teamSelect.innerHTML = '<option value="Free Agent">Free Agent</option>'; 

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

/**
 * Gestion de la session et de l'affichage initial
 */
function getStoredUser() {
    const user = localStorage.getItem('fuma_user');
    try {
        return user ? JSON.parse(user) : null;
    } catch (e) {
        return null;
    }
}

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem('fuma_user');
        window.location.href = 'index.html';
    }
}
    
async function handleProfilePage() {
    if (!window.location.pathname.includes('profile.html')) return;

    const form = document.getElementById('profile-form');
    const loginPrompt = document.getElementById('login-prompt');
    const params = new URLSearchParams(window.location.search);
    
    // 1. Récupération des infos Discord (URL ou LocalStorage)
    const discordUsername = params.get('username');
    const discordId = params.get('id');
    let currentUser = getStoredUser();

    if (discordUsername && discordId) {
        currentUser = {
            id: discordId,
            username: decodeURIComponent(discordUsername)
        };
        localStorage.setItem('fuma_user', JSON.stringify(currentUser));
        // Nettoyer l'URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 2. Logique d'affichage
    if (currentUser) {
        if (loginPrompt) loginPrompt.style.display = 'none';
        
        // On charge les équipes AVANT de remplir le profil pour que la team soit sélectionnable
        await loadTeamsList();

        // Pré-remplissage technique
        const nameInput = document.getElementById('discord-name');
        const idInput = document.getElementById('id-discord');
        if (nameInput) nameInput.value = currentUser.username;
        if (idInput) idInput.value = currentUser.id;

        // Récupération des données existantes sur le Google Sheet
        await checkExistingProfile(currentUser.id);
    } else {
        if (loginPrompt) loginPrompt.style.display = 'block';
        if (form) form.style.display = 'none';
    }
}

async function checkExistingProfile(discordId) {
    const loader = document.getElementById('fuma-loader') || document.getElementById('profile-loader');
    const form = document.getElementById('profile-form');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

    if (loader) loader.style.display = 'flex';
    if (form) form.style.display = 'none';

    try {
        // Construction propre de l'URL avec les paramètres
        const fetchUrl = new URL(APP_SCRIPT_URL);
        fetchUrl.searchParams.set('discord_id', discordId);
        fetchUrl.searchParams.set('t', Date.now()); // Anti-cache

        const response = await fetch(fetchUrl.toString());
        if (!response.ok) throw new Error('Erreur réseau');
        
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
            
            // Afficher le bouton supprimer si l'utilisateur existe
           const deleteBtn = document.getElementById('btn-delete-profile'); 
if (deleteBtn) {
    deleteBtn.style.display = 'block'; // Ou 'inline-block' selon ton design
}
        } else {
            if (submitBtn) submitBtn.innerText = "Create My Profile";
        }
    } catch (e) {
        console.error("Erreur checkExistingProfile:", e);
    } finally {
        if (loader) loader.style.display = 'none';
        if (form) form.style.display = 'grid';
    }
}

/**
 * Envoi des données vers le Google Sheet
 */
function setupFormSubmission() {
    const profileForm = document.getElementById('profile-form');
    if (!profileForm) return;

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = profileForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerText;
        
        submitBtn.disabled = true;
        submitBtn.innerText = "Sending...";

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
            // Utilisation de POST pour l'envoi
            await fetch(APP_SCRIPT_URL, {
                method: 'POST',
                body: formData,
                headers: { 'Content-Type': 'application/x-form-urlencoded' },
                mode: 'no-cors' // Mode nécessaire pour Google Apps Script sans configuration CORS complexe
            });

            // Succès visuel
            const statusBox = document.getElementById('status-message');
            const statusText = document.getElementById('status-text');

            if (statusBox && statusText) {
                statusText.innerText = "Profile saved! Redirecting...";
                statusBox.style.display = 'block';
                profileForm.style.display = 'none'; 
                window.scrollTo({ top: 0, behavior: 'smooth' });

                setTimeout(() => {
                    window.location.href = 'players.html';
                }, 2000);
            }
        } catch (error) {
            console.error("Submission error:", error);
            alert("An error occurred. Please try again.");
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
    });
}

function logout() {
    localStorage.removeItem('fuma_user');
    window.location.href = 'index.html';
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
 * Ce script regroupe les données par Player ID ou GAME_TAG
 */

// --- 1. RÉCUPÉRER LE REGISTRE FIXE (GAME_DATABASE) ---
// Cette fonction crée un dictionnaire pour lier les IDs aux Avatars, Drapeaux et Logos
async function getPlayerRegistry() {
    const REGISTRY_GID = "1342244083"; 
    const url = `${PLAYERS_SHEET_BASE}${REGISTRY_GID}&t=${Date.now()}`;
    
    try {
        const resp = await fetch(url);
        const text = await resp.text();
        const lines = text.trim().split("\n");
        
        // Normalisation des en-têtes
        const headers = lines[0].split(",").map(h => h.trim().toUpperCase());
        
        const idxGameId = headers.indexOf('GAME_ID');
        const idxGameTag = headers.indexOf('GAME_TAG');
        const idxAvatar = headers.indexOf('AVATAR');
        const idxFlag = headers.indexOf('FLAG');
        const idxTeam = headers.indexOf('CURRENT_TEAM'); // Ajout pour l'équipe (Col H)
        const idxLogo = headers.indexOf('LOGO'); // Ajout pour le logo (Col I)

        const registry = {};

        lines.slice(1).forEach(line => {
            const v = parseCSVLine(line);
            
            // Identification unique (ID ou TAG par défaut) 
            const id = (v[idxGameId] && v[idxGameId] !== "") ? v[idxGameId] : v[idxGameTag];
            
            if (id) {
                registry[id] = {
                    tag: v[idxGameTag] || id,
                    // Récupère l'avatar (Col G)
                    avatar: v[idxAvatar] || 'https://i.ibb.co/4wPqLKzf/profile-picture-icon-png-people-person-profile-4.png',
                    // Récupère le drapeau (Col F)
                    flag: v[idxFlag] || "🏳️",
                    // Récupère l'équipe actuelle (Col H) - C'est ici que "Innocent XI" est récupéré
                    team: v[idxTeam] || "Free Agent",
                    // Récupère le logo du club (Col I)
                    logo: v[idxLogo] || "" 
                };
            }
        });
        
        return registry;
    } catch (e) {
        console.error("Erreur lors du chargement du registre des joueurs :", e);
        return {};
    }
}

// --- 2. RÉCUPÉRER LES STATS ET AGRÉGER LES MATCHS ---
async function fetchFumaPlayers(gid) {
    const container = document.getElementById('fuma-js-players');
    if (!container) return;

    // Affichage du loader pendant le traitement
    container.innerHTML = `
        <div class="loader-container" style="grid-column: 1/-1; min-height: 300px;">
            <div class="fuma-spinner"></div>
            <p>Loading Players...</p>
        </div>
    `;

    try {
        // 1. Récupérer TOUS les joueurs enregistrés dans la base globale
        const playerRegistry = await getPlayerRegistry();
        const playersMap = {};

        // 2. Initialiser la Map avec chaque joueur du registre (0 match par défaut)
        Object.keys(playerRegistry).forEach(pId => {
            const reg = playerRegistry[pId];
            playersMap[pId] = {
                id: pId,
                tag: reg.tag,
                avatar: reg.avatar,
                flag: reg.flag,
                team: reg.team || "Free Agent", // Équipe du registre (Col H)
                logo: reg.logo,
                pos: "N/A",
                gp: 0, 
                totalRating: 0, 
                goals: 0, 
                assists: 0
            };
        });

        // 3. Récupérer les données de la saison (les matchs joués)
        const resp = await fetch(`${PLAYERS_SHEET_BASE}${gid}&t=${Date.now()}`);
        const text = await resp.text();
        
        const lines = text.trim().split("\n").filter(l => l.split(',').length > 5);
        const headers = lines[0].split(",").map(h => h.trim().toUpperCase());

        const idx = {
            id: headers.indexOf('GAME_ID'),
            tag: headers.indexOf('GAME_TAG'),
            team: headers.indexOf('CURRENT_TEAM'),
            pos: headers.indexOf('MAIN_POSITION'),
            rating: headers.indexOf('RATING'),
            goals: headers.indexOf('GOALS'),
            assists: headers.indexOf('ASSISTS')
        };

        // 4. Parcourir les lignes de match pour accumuler les stats
        lines.slice(1).forEach(line => {
            const v = parseCSVLine(line);
            const pId = (v[idx.id] && v[idx.id] !== "") ? v[idx.id] : v[idx.tag];
            
            if (!pId || pId === "#REF!") return;

            // Si le joueur n'était pas dans le registre mais a joué, on le crée (sécurité)
            if (!playersMap[pId]) {
                playersMap[pId] = {
                    id: pId,
                    tag: v[idx.tag] || pId,
                    avatar: PLACEHOLDER_AVATAR,
                    flag: "🏳️",
                    team: v[idx.team] || "Free Agent",
                    logo: "",
                    pos: v[idx.pos] || "N/A",
                    gp: 0, totalRating: 0, goals: 0, assists: 0
                };
            }

            // Mise à jour des statistiques de performance
            playersMap[pId].gp += 1;
            playersMap[pId].totalRating += parseFloat(v[idx.rating] || 0);
            playersMap[pId].goals += parseInt(v[idx.goals] || 0);
            playersMap[pId].assists += parseInt(v[idx.assists] || 0);
            
            // On met à jour la position si elle est renseignée dans le match
            if (v[idx.pos]) playersMap[pId].pos = v[idx.pos];
        });

        // 5. Finalisation : Calcul des moyennes et transformation en tableau
        allPlayers = Object.values(playersMap).map(p => ({
            ...p,
            rating: p.gp > 0 ? (p.totalRating / p.gp).toFixed(1) : "0.0"
        }));

        // 6. Mise à jour des filtres de l'interface et rendu
        updateTeamFilter(allPlayers);
        applyPlayerFilters();

    } catch (e) {
        console.error("Fetch Error:", e);
        container.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:red;">Erreur lors du traitement des données.</p>`;
    }
}
// --- ÉTAPE 3 : AFFICHAGE DES CARTES (RENDER) ---
// --- ÉTAPE 3 : AFFICHAGE DES CARTES (RENDER) ---
function renderPlayers(list) {
    const container = document.getElementById('fuma-js-players');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 50px;">Aucun joueur ne correspond à ces critères.</p>`;
        return;
    }

    container.innerHTML = list.map(p => {
        // Vérification si le logo est valide
        const hasLogo = p.logo && p.logo !== "" && p.logo.toLowerCase() !== "none";
        
        return `
        <a href="player.html?id=${encodeURIComponent(p.id)}" class="player-link-wrapper" style="text-decoration: none; color: inherit;">
            <div class="club-card" style="text-align: center; padding: 20px; position: relative; min-height: 220px;">
                
                <div style="position: absolute; top: 10px; right: 10px; background: var(--fuma-primary); color: #000; font-weight: 800; padding: 4px 8px; border-radius: 6px; font-size: 0.9rem; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                    ${p.rating}
                </div>

                <div style="position: relative; width: 80px; height: 80px; margin: 0 auto 10px;">
                    <img src="${p.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid var(--fuma-primary);" onerror="this.src='${PLACEHOLDER_AVATAR}'">
                    <div style="position: absolute; bottom: 0; right: -5px; font-size: 1.4rem;">${p.flag}</div>
                </div>

                <h3 style="margin: 5px 0; font-size: 1.1rem; color: var(--fuma-text-main);">${p.tag}</h3>
                
                <p style="font-size: 0.8rem; color: var(--fuma-text-dim); margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    ${hasLogo 
                        ? `<img src="${p.logo}" style="width: 20px; height: 20px; object-fit: contain;" onerror="this.style.display='none'">` 
                        : '<i class="fas fa-tshirt" style="font-size: 0.8rem; opacity: 0.5;"></i>'}
                    <span>${p.team}</span>
                </p>

                <div style="display: flex; justify-content: center; gap: 15px; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
                    <div style="text-align: center;">
                        <span style="display: block; font-weight: bold; font-size: 0.9rem;">${p.goals}</span>
                        <span style="font-size: 0.6rem; color: var(--fuma-text-dim); text-transform: uppercase;">Buts</span>
                    </div>
                    <div style="text-align: center;">
                        <span style="display: block; font-weight: bold; font-size: 0.9rem;">${p.assists}</span>
                        <span style="font-size: 0.6rem; color: var(--fuma-text-dim); text-transform: uppercase;">Passes</span>
                    </div>
                    <div style="text-align: center;">
                        <span style="display: block; font-weight: bold; font-size: 0.9rem;">${p.gp}</span>
                        <span style="font-size: 0.6rem; color: var(--fuma-text-dim); text-transform: uppercase;">Matchs</span>
                    </div>
                </div>
            </div>
        </a>
    `}).join('');
}
// --- ÉTAPE 4 : LOGIQUE DES FILTRES ---
function updateTeamFilter(players) {
    const teamSelect = document.getElementById('filter-team');
    if (!teamSelect) return;
    const uniqueTeams = [...new Set(players.map(p => p.team))].sort();
    teamSelect.innerHTML = '<option value="">All Teams</option>' + 
        uniqueTeams.map(team => `<option value="${team}">${team}</option>`).join('');
}

function applyPlayerFilters() {
    const searchQuery = document.getElementById('search-player')?.value.toLowerCase() || "";
    const teamValue = document.getElementById('filter-team')?.value.toLowerCase();
    const posValue = document.getElementById('filter-position')?.value;

    const filtered = allPlayers.filter(p => {
        // 1. Filtre par Nom (Game Tag)
        const matchesSearch = p.tag.toLowerCase().includes(searchQuery);

        // 2. Filtre par Équipe
        const matchesTeam = !teamValue || p.team.toLowerCase() === teamValue;
        
        // 3. Filtre par Position (avec mapping pour GK et ATT)
        let matchesPos = true;
        if (posValue) {
            const playerPos = p.pos.toUpperCase();
            if (posValue === "GK") matchesPos = playerPos.includes("GOAL");
            else if (posValue === "DEF") matchesPos = playerPos.includes("DEF");
            else if (posValue === "MID") matchesPos = playerPos.includes("MID");
            else if (posValue === "ATT") matchesPos = playerPos.includes("FORW");
        }

        // Le joueur doit respecter les 3 conditions
        return matchesSearch && matchesTeam && matchesPos;
    });

    renderPlayers(filtered);

}


async function loadPublicPlayerProfile() {
    const container = document.getElementById('player-header');
    if (!container) return; // Sécurité : on ne s'exécute que sur player.html

    const params = new URLSearchParams(window.location.search);
    const playerId = params.get('id');
    const seasonSelector = document.getElementById('season-selector');

    if (!playerId) {
        container.innerHTML = "<p>Aucun ID de joueur spécifié.</p>";
        return;
    }

    async function runUpdate() {
        const gid = seasonSelector ? seasonSelector.value : "2074996595";
        
        // On récupère le registre pour l'avatar/drapeau/logo
        const registry = await getPlayerRegistry();
        const pInfo = registry[playerId] || { tag: playerId, avatar: '', flag: '🏳️', logo: '' };

        // On charge les stats depuis la feuille de saison
        const url = `${PLAYERS_SHEET_BASE}${gid}&t=${Date.now()}`;
        try {
            const resp = await fetch(url);
            const text = await resp.text();
            const lines = text.trim().split("\n");
            const headers = lines[0].split(",").map(h => h.trim().toUpperCase());
            const idx = {};
            headers.forEach((h, i) => idx[h] = i);

            let stats = { gp: 0, rating: 0, goals: 0, assists: 0, shots: 0, passes: 0, pass_acc: 0, tackles: 0, tackle_acc: 0, motm: 0 };

            lines.slice(1).forEach(line => {
                const v = parseCSVLine(line);
                const rowId = v[idx['GAME_ID']] || v[idx['GAME_TAG']];
                if (rowId === playerId) {
                    stats.gp++;
                    stats.rating += parseFloat(v[idx['RATING']]) || 0;
                    stats.goals += parseInt(v[idx['GOALS']]) || 0;
                    stats.assists += parseInt(v[idx['ASSISTS']]) || 0;
                    stats.shots += parseInt(v[idx['SHOTS']]) || 0;
                    stats.passes += parseInt(v[idx['PASSES']]) || 0;
                    stats.pass_acc += parseFloat(v[idx['%SUCCESSFUL_PASSES']]) || 0;
                    stats.tackles += parseInt(v[idx['TACKLES']]) || 0;
                    stats.tackle_acc += parseFloat(v[idx['%SUCCESSFUL_TACKLES']]) || 0;
                    stats.motm += parseInt(v[idx['MOTM']]) || 0;
                }
            });

            renderDetailedProfile(pInfo, stats);
        } catch (e) { console.error(e); }
    }

    await runUpdate();
    seasonSelector?.addEventListener('change', runUpdate);
}
    

 
function renderDetailedProfile(info, stats) {
    const header = document.getElementById('player-header');
    const statsContainer = document.getElementById('player-stats-container');
    
    // Calculs moyennes
    const avgRating = (stats.rating / stats.gp).toFixed(2);
    const avgPass = (stats.pass_acc / stats.gp).toFixed(1);
    const avgTackle = (stats.tackle_acc / stats.gp).toFixed(1);

    // Calculs des nombres REUSSIS (Total * % Moyen / 100)
    const successPassCount = Math.round((stats.passes * (stats.pass_acc / stats.gp)) / 100) || 0;
    const successTackleCount = Math.round((stats.tackles * (stats.tackle_acc / stats.gp)) / 100) || 0;

    // 1. HEADER (Photo, Team & Logo)
    if (header) {
        header.innerHTML = `
            <div class="player-card-header">
                <img src="${info.avatar}" class="player-avatar-main" onerror="this.src='https://raw.githubusercontent.com/Ashwinvalento/cartoon-avatar/master/lib/images/male/45.png'">
                <h1 style="margin: 10px 0 5px;">${info.tag} ${info.flag}</h1>
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px; color: var(--fuma-primary); font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                    ${info.logo ? `<img src="${info.logo}" class="mini-club-logo" style="width:25px; height:25px; object-fit:contain;">` : '<i class="fas fa-tshirt"></i>'}
                    <span>${stats.team || info.team || "Free Agent"}</span>
                </div>
            </div>
        `;
    }

    // 2. STATS (Utilisation de var(--fuma-primary) pour l'or)
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-card">
                <h3><i class="fas fa-info-circle"></i> General</h3>
                <div class="stat-row"><span>Appearances</span> <strong>${stats.gp}</strong></div>
                <div class="stat-row"><span>Man of the Match</span> <strong>${stats.motm} ⭐</strong></div>
                <div class="stat-row"><span>Avg. Rating</span> <strong style="color:var(--fuma-primary)">${avgRating}</strong></div>
            </div>

            <div class="stat-card">
                <h3><i class="fas fa-bullseye"></i> Attacking</h3>
                <div class="stat-row"><span>Goals</span> <strong>${stats.goals}</strong></div>
                <div class="stat-row"><span>Assists</span> <strong>${stats.assists}</strong></div>
                <div class="stat-row"><span>Goal Participation</span> <strong>${((stats.goals + stats.assists) / (stats.gp || 1)).toFixed(1)} / match</strong></div>
            </div>

            <div class="stat-card">
                <h3><i class="fas fa-share-alt"></i> Passing</h3>
                <div class="stat-row"><span>Total Passes</span> <strong>${stats.passes}</strong></div>
                <div class="stat-row"><span>Successful</span> <strong style="color:var(--fuma-primary)">${successPassCount}</strong></div>
                <div class="stat-row"><span>Accuracy</span> <strong>${avgPass}%</strong></div>
                <div class="progress-bar"><div style="width: ${avgPass}%"></div></div>
            </div>

            <div class="stat-card">
                <h3><i class="fas fa-shield-alt"></i> Defense</h3>
                <div class="stat-row"><span>Total Tackles</span> <strong>${stats.tackles}</strong></div>
                <div class="stat-row"><span>Successful</span> <strong style="color:var(--fuma-primary)">${successTackleCount}</strong></div>
                <div class="stat-row"><span>Success Rate</span> <strong>${avgTackle}%</strong></div>
                <div class="progress-bar"><div style="width: ${avgTackle}%"></div></div>
            </div>
        `;
    }
}


    
// --- INITIALISATION FINALE ---
injectNavigation();
handleProfilePage(); // Garde celle-ci pour le profil utilisateur
loadPublicPlayerProfile(); // AJOUTE CELLE-CI pour la fiche détaillée player.html
setupFormSubmission();
fetchFumaClubs();
loadClubProfile();

// --- INITIALISATION FINALE ---
    injectNavigation();
    handleProfilePage(); 
    loadPublicPlayerProfile(); 
    setupFormSubmission();
    fetchFumaClubs();
    loadClubProfile();

    // Gestion des filtres de la page Players
    const playerSeasonFilter = document.getElementById('filter-season');
    if (playerSeasonFilter) {
        fetchFumaPlayers(playerSeasonFilter.value); 
        playerSeasonFilter.addEventListener('change', (e) => fetchFumaPlayers(e.target.value));
    }

    document.getElementById('search-player')?.addEventListener('input', applyPlayerFilters);
    document.getElementById('filter-team')?.addEventListener('change', applyPlayerFilters);
    document.getElementById('filter-position')?.addEventListener('change', applyPlayerFilters);

 // 1. Gestion de la déconnexion
document.getElementById('btn-logout')?.addEventListener('click', () => {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem('fuma_user');
        window.location.href = 'index.html';
    }
});

// 2. Gestion de la suppression (ID corrigé)
document.getElementById('btn-delete-profile')?.addEventListener('click', async () => {
    const user = getStoredUser(); // Récupère l'utilisateur connecté
    if (!user) return;

    if (confirm("WARNING: Are you sure you want to DELETE your profile? This action is permanent.")) {
        try {
            // On prépare les données exactement comme le App Script les attend
            const formData = new URLSearchParams();
            formData.append('action', 'delete');
            formData.append('discord_id', user.id); // On envoie l'ID Discord

            const response = await fetch(APP_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // Important pour Google Apps Script
                body: formData
            });

            // Note: Avec 'no-cors', on ne peut pas lire la réponse JSON, 
            // on assume que ça a marché si aucune erreur n'est levée.
            alert("Request sent. Your profile will be deleted.");
            
            // Déconnexion locale
            localStorage.removeItem('fuma_user');
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error("Delete error:", error);
            alert("Failed to connect to the server.");
        }
    }
});

}); // Fermeture unique du DOMContentLoaded























































































