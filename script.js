document.addEventListener('DOMContentLoaded', () => {
    let allClubs = [];
    let allPlayers = []; // Stockage pour la recherche de joueurs
    
    // --- 1. CONFIGURATION & URLS ---
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=252630071&single=true&output=csv';
    const PLAYERS_SHEET_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=';
    const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz-PcJxL7wtGaYMKFV-Cz2tugYbvDBgVR13cj1WQXcqLLho0K6sfLvSYhAQhGgzDLqSBQ/exec'; 
    const CLIENT_ID = '1473807551329079408'; 
    const REDIRECT_URI = encodeURIComponent('https://fuma-clubs-official.vercel.app/api/auth/callback');
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify%20guilds`;

    // Avatars par défaut
    const DEFAULT_AVATAR = "https://i.ibb.co/4wPqLKzf/profile-picture-icon-png-people-person-profile-4.png";
    const PLACEHOLDER_AVATAR = "https://i.ibb.co/4wPqLKzf/profile-picture-icon-png-people-person-profile-4.png";

       
    // --- 2. UTILITAIRES ---
  /**
 * REMPLACE ton ancien parseCSVLine par celui-ci.
 * Il est plus robuste et transforme chaque ligne en OBJET.
 */
function csvToObjects(csvText) {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return [];

    // On récupère les en-têtes (GAME_TAG, Buts, etc.)
    const headers = lines[0].split(",").map(h => h.trim().toUpperCase());
    
    return lines.slice(1).map(line => {
        const result = [];
        let cell = '';
        let inQuotes = false;
        // Logique de lecture caractère par caractère pour gérer les virgules dans les noms
        for (let i = 0; i < line.length; i++) {
            let char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { result.push(cell); cell = ''; }
            else cell += char;
        }
        result.push(cell);

        // On crée l'objet final
        const obj = {};
        headers.forEach((header, index) => {
            let value = result[index] ? result[index].replace(/^"|"$/g, '').trim() : "";
            obj[header] = value;
        });
        return obj;
    });
}

/**
 * 2. Moteur d'agrégation : Calcule les stats cumulées
 */
function aggregateStats(logs, profiles = {}) {
    const stats = {};

    logs.forEach(log => {
        // On gère les deux noms de colonnes possibles (DATABASE vs LOGS MATCHS)
        const tag = log.GAME_TAG || log.Joueur; 
        if (!tag || tag.includes("#REF") || tag === "GAME_TAG") return;

        if (!stats[tag]) {
            const p = profiles[tag] || {};
            stats[tag] = {
                tag: tag,
                avatar: p.AVATAR || 'https://i.ibb.co/4wPqLKzf/profile-picture-icon-png-people-person-profile-4.png',
                team: p.CURRENT_TEAM || log.Equipe || 'Free Agent',
                logo: p.LOGO || '',
                flag: p.FLAG || '🏳️',
                pos: p.MAIN_POSITION || log.Position || 'N/A',
                arch: p.MAIN_ARCHETYPE || 'Standard',
                matches: 0, 
                goals: 0, 
                assists: 0, 
                sumNote: 0
            };
        }

        const s = stats[tag];
        s.matches += 1;
        s.goals += parseInt(log.GOALS || log.Buts || 0);
        s.assists += parseInt(log.ASSISTS || log.Assists || 0);
        // On remplace la virgule par un point pour le calcul mathématique
        const note = parseFloat((log.RATING || log.Note || "0").toString().replace(',', '.'));
        s.sumNote += note;
    });

    return Object.values(stats).map(s => ({
        ...s,
        rating: s.matches > 0 ? (s.sumNote / s.matches).toFixed(2) : "0.00"
    }));
}

/**
 * 3. Chargeur principal (Database + Saison)
 */
async function loadFumaData(gid) {
    const container = document.getElementById('fuma-js-players');
    // On affiche un spinner pendant le calcul
    if (container) container.innerHTML = '<div class="fuma-loading-wrapper" style="grid-column:1/-1; text-align:center; padding:50px;"><div class="fuma-spinner" style="margin:0 auto;"></div><p>Calculating Stats...</p></div>';

    try {
        // A. Charger la DATABASE (pour avoir les avatars/logos fixes)
        const dbResp = await fetch(`${PLAYERS_SHEET_BASE}1342244083&t=${Date.now()}`);
        const dbText = await dbResp.text();
        const dbData = csvToObjects(dbText);
        const profiles = {};
        dbData.forEach(row => { if(row.GAME_TAG) profiles[row.GAME_TAG] = row; });

        // B. Charger la Saison (ou la Database si on veut "All Seasons")
        const sResp = await fetch(`${PLAYERS_SHEET_BASE}${gid}&t=${Date.now()}`);
        const sText = await sResp.text();
        const logs = csvToObjects(sText);

        // C. Lancer l'agrégation
        allPlayers = aggregateStats(logs, profiles);
        
        // D. Envoyer vers l'affichage
        if (container) {
            // Ici, on mettra à jour ton filtre équipe
            const teamFilter = document.getElementById('filter-team');
            if (teamFilter) {
                const teams = [...new Set(allPlayers.map(p => p.team))].sort();
                const current = teamFilter.value;
                teamFilter.innerHTML = '<option value="">All Teams</option>' + 
                    teams.map(t => `<option value="${t}">${t}</option>`).join('');
                teamFilter.value = current;
            }
            applyPlayerFilters(); 
        } else {
            // Pour la page player.html
            renderSinglePlayerProfile(); 
        }
    } catch (e) {
        console.error("Erreur chargement:", e);
        if (container) container.innerHTML = "<p style='grid-column:1/-1; text-align:center; color:red;'>Error calculating data.</p>";
    }
}

    function renderPlayers(list) {
    const container = document.getElementById('fuma-js-players');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--fuma-text-dim);">No players found for this selection.</p>`;
        return;
    }

    container.innerHTML = list.map(p => {
        // Sécurité pour le logo d'équipe
        const teamLogoHTML = p.logo 
            ? `<img src="${p.logo}" alt="${p.team}" style="width: 20px; height: 20px; object-fit: contain; margin-right: 8px;">`
            : `<i class="fas fa-shield-alt" style="margin-right: 8px; font-size: 0.8rem; color: var(--fuma-primary);"></i>`;

        return `
        <div class="fuma-club-card" onclick="window.location.href='player.html?id=${encodeURIComponent(p.tag)}'" style="cursor: pointer;">
            <div style="position: absolute; top: 15px; right: 15px; background: var(--fuma-primary); color: #000; font-weight: 800; padding: 4px 10px; border-radius: 8px; font-size: 0.9rem; box-shadow: 0 4px 10px rgba(255, 215, 0, 0.3);">
                ${p.rating}
            </div>

            <div style="width: 100%; height: 180px; overflow: hidden; border-radius: 12px; margin-bottom: 15px; background: #111;">
                <img src="${p.avatar}" alt="${p.tag}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>

            <h3 style="margin: 0 0 5px 0; font-size: 1.1rem; color: #fff; text-transform: uppercase; letter-spacing: 1px;">
                ${p.flag} ${p.tag}
            </h3>
            
            <p style="font-size: 0.75rem; color: var(--fuma-primary); margin-bottom: 12px; font-weight: 600; letter-spacing: 1px;">
                ${p.pos} • ${p.arch}
            </p>

            <div style="display: flex; align-items: center; margin-bottom: 15px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px;">
                ${teamLogoHTML}
                <span style="font-size: 0.8rem; color: var(--fuma-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${p.team}
                </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; text-align: center;">
                <div>
                    <span style="display: block; font-size: 1rem; font-weight: 700; color: #fff;">${p.matches}</span>
                    <span style="font-size: 0.6rem; color: var(--fuma-text-dim); text-transform: uppercase;">Matches</span>
                </div>
                <div>
                    <span style="display: block; font-size: 1rem; font-weight: 700; color: #fff;">${p.goals}</span>
                    <span style="font-size: 0.6rem; color: var(--fuma-text-dim); text-transform: uppercase;">Goals</span>
                </div>
                <div>
                    <span style="display: block; font-size: 1rem; font-weight: 700; color: #fff;">${p.assists}</span>
                    <span style="font-size: 0.6rem; color: var(--fuma-text-dim); text-transform: uppercase;">Assists</span>
                </div>
            </div>
        </div>`;
    }).join('');
}




    

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
        
        // --- UTILISATION DU NOUVEAU MOTEUR ---
        // On transforme le CSV en tableau d'objets directement
        const rows = csvToObjects(text);

        const teams = rows
            .map(row => {
                // row['TEAMS'] et row['ACTIVE'] sont récupérés par le nom des en-têtes
                return {
                    name: row['TEAMS'],
                    active: row['ACTIVE'] ? row['ACTIVE'].trim().toUpperCase() : ""
                };
            })
            .filter(club => {
                // On garde si : 
                // 1. Le nom existe
                // 2. Ce n'est pas un "Free Agent"
                // 3. La colonne ACTIVE n'est pas égale à "NO"
                return club.name && 
                       club.name.trim() !== "" && 
                       !club.name.toLowerCase().includes('free agent') && 
                       club.active !== "NO";
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        // Ajout des options au menu déroulant
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
        
        // --- UTILISATION DU NOUVEAU MOTEUR ---
        // On transforme le CSV en tableau d'objets
        const rows = csvToObjects(text);

        allClubs = rows.map(row => {
            return { 
                // Accès direct par le nom de l'en-tête
                name: row['TEAMS'] || "", 
                logo: row['CREST'] || "" 
            };
        }).filter(c => 
            c.name && 
            c.logo && 
            !c.name.toLowerCase().includes('free agent')
        );

        renderClubs(allClubs);
    } catch (e) {
        console.error("Erreur lors du chargement des clubs :", e);
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
        
        // --- UTILISATION DU NOUVEAU MOTEUR ---
        const rows = csvToObjects(text);
        
        // Recherche du club par son nom (plus besoin d'index)
        const club = rows.find(r => r['TEAMS'] === clubName);

        if (club) {
            // --- 1. TROPHIES LOGIC ---
            let trophiesHTML = '';
            const rawTrophies = club['TROPHIES'] || "";
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

            // --- 2. SOCIAL MEDIA LOGIC ---
            let mediaIconsHTML = '';
            if (club['MEDIA'] && club['MEDIA'].toLowerCase() !== "none") {
                const links = club['MEDIA'].split(',').map(l => l.trim());
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

            // --- 3. STREAM section ---
            let streamBlockHTML = '';
            const hasStream = club['STREAM'] && club['STREAM'].toLowerCase() !== "none";
            if (hasStream || mediaIconsHTML !== '') {
                streamBlockHTML = `<div style="margin-bottom: 35px;">
                    <h3 class="sidebar-title" style="color: var(--fuma-primary); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 15px; font-size: 0.85rem; letter-spacing:1px;">COMMUNITY</h3>`;
                if (hasStream) {
                    const isTwitch = club['STREAM'].includes('twitch.tv');
                    streamBlockHTML += `
                        <a href="${club['STREAM']}" target="_blank" class="fuma-cta" style="display:block; text-align:center; background:#6441a5; font-size: 0.75rem; padding: 10px; margin-bottom: 10px;">
                            <i class="${isTwitch ? 'fab fa-twitch' : 'fab fa-youtube'}"></i> WATCH LIVE
                        </a>`;
                }
                streamBlockHTML += mediaIconsHTML + `</div>`;
            }

            // --- 4. ROSTER LOGIC ---
            const rawPlayers = club['PLAYERS'] || "";
            let playersListHTML = "<li style='grid-column: 1 / -1; color:var(--fuma-text-dim);'>No players registered.</li>";
            if (rawPlayers.trim() !== "" && rawPlayers.toLowerCase() !== "none") {
                playersListHTML = rawPlayers.split(',').map(p => p.trim()).filter(p => p.length > 0)
                    .map(p => `
                        <li style="display: flex; align-items: center; min-width: 0;">
                            <i class="fas fa-user-circle" style="font-size:0.7rem; margin-right:8px; color:var(--fuma-primary); flex-shrink: 0;"></i>
                            <a href="player.html?id=${encodeURIComponent(p)}" style="color: var(--fuma-text-main); text-decoration: none; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: 0.2s;" onmouseover="this.style.color='var(--fuma-primary)'" onmouseout="this.style.color='var(--fuma-text-main)'">${p}</a>
                        </li>`).join('');
            }

            // --- 5. HISTORY & STATUS ---
            const formattedHistory = club['HISTORY'] ? club['HISTORY'].split('\n').map(line => `<p style="margin-bottom:15px;">${line}</p>`).join('') : "No historical information available.";
            const isActive = club['ACTIVE']?.toUpperCase() === 'YES';

            // --- 6. FINAL RENDER ---
            detailContainer.innerHTML = `
                <div class="club-profile-header" style="text-align: center; margin-bottom: 50px;">
                    <img src="${club['CREST'] || ''}" style="width: 150px; height: 150px; object-fit: contain; margin-bottom: 20px;" alt="Crest">
                    <h1 class="club-title-responsive" style="font-size: 3rem; font-weight: 800; text-transform: uppercase;">${club['TEAMS']}</h1>
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
                            <div style="font-style: italic; color: var(--fuma-text-dim); line-height: 1.8; font-size: 0.95rem;">${formattedHistory}</div>
                        </section>
                        <div class="stats-bar" style="display: flex; justify-content: space-around; background: var(--fuma-bg-card); padding: 25px; border-radius: 15px; border: var(--fuma-border);">
                            <div style="text-align: center;"><strong style="display: block; font-size: 1.8rem;">${club['GAMES PLAYED'] || 0}</strong><span style="font-size: 0.6rem; color: var(--fuma-text-dim); text-transform: uppercase;">Played</span></div>
                            <div style="text-align: center; color: #4caf50;"><strong style="display: block; font-size: 1.8rem;">${club['WIN'] || 0}</strong><span style="font-size: 0.6rem; color: var(--fuma-text-dim); text-transform: uppercase;">Wins</span></div>
                            <div style="text-align: center; color: #ffeb3b;"><strong style="display: block; font-size: 1.8rem;">${club['DRAW'] || 0}</strong><span style="font-size: 0.6rem; color: var(--fuma-text-dim); text-transform: uppercase;">Draws</span></div>
                            <div style="text-align: center; color: #f44336;"><strong style="display: block; font-size: 1.8rem;">${club['LOST'] || 0}</strong><span style="font-size: 0.6rem; color: var(--fuma-text-dim); text-transform: uppercase;">Losses</span></div>
                        </div>
                    </div>
                    <div class="club-sidebar">
                        <div class="sidebar-box" style="background: var(--fuma-bg-card); padding: 30px; border-radius: 15px; border: var(--fuma-border); position: sticky; top: 20px;">
                            ${streamBlockHTML}
                            <h3 class="sidebar-title" style="color: var(--fuma-primary); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 15px; font-size: 0.85rem; letter-spacing:1px;">MANAGER</h3>
                            <p style="margin-bottom:35px; font-weight: 600; font-size: 1.1rem;">${club['MANAGER'] || 'N/A'}</p>
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















    

        // --- EN-TÊTE DU PROFIL (HEADER) ---
        headerContainer.innerHTML = `
            <div class="player-card-header">
               <img src="${p.AVATAR || 'https://i.ibb.co/4wPqLKzf/profile-picture-icon-png-people-person-profile-4.png'}" 
                     class="player-avatar-main" 
                     onerror="this.src='https://i.ibb.co/4wPqLKzf/profile-picture-icon-png-people-person-profile-4.png'">
                <h1 style="font-size: 2.8rem; margin: 0; color: #fff; text-transform: uppercase;">
                    ${p.GAME_TAG} ${p.FLAG || ''}
                </h1>
                <p style="color: var(--fuma-primary); letter-spacing: 4px; font-weight: 600; margin-top: 10px;">
                    ${p.MAIN_POSITION || 'N/A'} | ${p.MAIN_ARCHETYPE || 'Standard'}
                </p>
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-top: 25px;">
                    <img src="${p.LOGO || ''}" style="height: 45px; filter: drop-shadow(0 0 5px rgba(0,0,0,0.5));" onerror="this.style.display='none'">
                    <span style="font-size: 1.3rem; font-weight: 300;">${p.CURRENT_TEAM || 'Free Agent'}</span>
                </div>
            </div>
        `;

        // --- GRILLE DES STATISTIQUES ---
        statsContainer.innerHTML = `
            <div class="stat-block">
                <h3><i class="fas fa-info-circle"></i> General</h3>
                <div class="stat-row">
                    <span class="stat-label">Matches Played</span>
                    <span class="stat-value">${p.GAME_PLAYED || '0'}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Average Rating</span>
                    <span class="stat-value highlight">${p.RATING || '0.0'}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">MOTM</span>
                    <span class="stat-value" style="color: #ffd700;"><i class="fas fa-star"></i> ${p.MOTM || '0'}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Red Cards</span>
                    <span class="stat-value" style="color: #ff4d4d;"><i class="fas fa-square"></i> ${p.RED_CARD || p['RED_CARDS'] || '0'}</span>
                </div>
            </div>

            <div class="stat-block">
                <h3><i class="fas fa-fire"></i> Attack</h3>
                <div class="stat-row">
                    <span class="stat-label">Goals</span>
                    <span class="stat-value highlight">${p.GOALS || '0'}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Assists</span>
                    <span class="stat-value highlight">${p.ASSISTS || '0'}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Shots</span>
                    <span class="stat-value">${p.SHOTS || '0'}</span>
                </div>
            </div>

            <div class="stat-block">
                <h3><i class="fas fa-share-alt"></i> Distribution</h3>
                <div class="stat-row">
                    <span class="stat-label">Successful Passes</span>
                    <span class="stat-value">${p.SUCCESSFUL_PASSES || '0'}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Pass Accuracy</span>
                    <span class="stat-value">${p['%SUCCESSFUL_PASSES'] || '0%'}</span>
                </div>
            </div>

            <div class="stat-block">
                <h3><i class="fas fa-shield-alt"></i> Defense</h3>
                <div class="stat-row">
                    <span class="stat-label">Successful Tackles</span>
                    <span class="stat-value">${p.SUCCESSFUL_TACKLES || '0'}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Tackle Accuracy</span>
                    <span class="stat-value">${p['%SUCCESSFUL_TACKLES'] || '0%'}</span>
                </div>
            </div>
        `;

    } catch (e) {
        console.error("Error fetching player data:", e);
        headerContainer.innerHTML = "<p style='text-align:center; color:red; padding: 50px;'>Error while loading data.</p>";
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





































