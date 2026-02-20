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

    if (!clubName) {
        detailContainer.innerHTML = '<p style="text-align:center;">Club non trouvé.</p>';
        return;
    }

    try {
        // 1. RÉCUPÉRATION DES DONNÉES (CLUBS + JOUEURS)
        // On récupère les deux en parallèle pour gagner du temps
        const [respClubs, respPlayers] = await Promise.all([
            fetch(SHEET_URL),
            fetch(`${PLAYERS_SHEET_BASE}1342244083`)
        ]);

        const textClubs = await respClubs.text();
        const textPlayers = await respPlayers.text();

        // 2. PARSING DES CLUBS
        const clubLines = textClubs.trim().split("\n");
        const clubHeaders = clubLines[0].split(",");
        const clubDataRaw = clubLines.slice(1)
            .map(line => parseCSVLine(line))
            .find(row => row[clubHeaders.indexOf('TEAMS')] === clubName);

        if (!clubDataRaw) {
            detailContainer.innerHTML = '<p style="text-align:center;">Détails du club introuvables.</p>';
            return;
        }

        // Mapping des colonnes club
        const club = {
            name: clubDataRaw[clubHeaders.indexOf('TEAMS')],
            crest: clubDataRaw[clubHeaders.indexOf('CREST')] || 'https://via.placeholder.com/150',
            history: clubDataRaw[clubHeaders.indexOf('HISTORY')] || 'No history available.',
            stats: clubDataRaw[clubHeaders.indexOf('STATS')] || '0 W - 0 D - 0 L',
            color: clubDataRaw[clubHeaders.indexOf('COLOR')] || '#d4af37'
        };

        // 3. PARSING ET FILTRAGE DES JOUEURS (LE ROSTER)
        const playerLines = textPlayers.trim().split("\n");
        const pHeaders = playerLines[0].split(",");
        
        // Index des colonnes joueurs
        const idxTag = pHeaders.indexOf('GAME_TAG');
        const idxTeam = pHeaders.indexOf('CURRENT_TEAM');
        const idxPos = pHeaders.indexOf('MAIN_POSITION');
        const idxAvatar = pHeaders.indexOf('AVATAR');
        const idxFlag = pHeaders.indexOf('FLAG');

        const roster = playerLines.slice(1)
            .map(line => parseCSVLine(line))
            .filter(row => row[idxTeam] === clubName); // Filtre dynamique !

        // 4. GÉNÉRATION DU HTML
        const rosterHTML = roster.length > 0 
            ? roster.map(p => `
                <div class="player-member-card">
                    <img src="${p[idxAvatar] || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="${p[idxTag]}">
                    <div class="player-member-info">
                        <a href="player.html?tag=${encodeURIComponent(p[idxTag])}" class="player-member-name">
                            ${p[idxFlag] || ''} ${p[idxTag]}
                        </a>
                        <span class="player-member-pos">${p[idxPos]}</span>
                    </div>
                    <a href="player.html?tag=${encodeURIComponent(p[idxTag])}" class="view-player-btn">
                        <i class="fas fa-chevron-right"></i>
                    </a>
                </div>
            `).join('')
            : '<p style="color:var(--fuma-text-dim);">Aucun joueur enregistré dans ce club pour le moment.</p>';

        detailContainer.innerHTML = `
            <div class="club-profile-header" style="border-bottom: 2px solid ${club.color}">
                <img src="${club.crest}" class="club-profile-logo" alt="${club.name}">
                <div class="club-profile-main-info">
                    <h1 class="club-profile-title">${club.name}</h1>
                    <div class="club-profile-stats">${club.stats}</div>
                </div>
            </div>

            <div class="club-profile-grid" style="display: grid; grid-template-columns: 1fr 350px; gap: 30px; margin-top: 30px;">
                <div class="club-profile-section">
                    <h2 class="fuma-section-title" style="text-align:left; font-size: 1.2rem;">About the Club</h2>
                    <p style="white-space: pre-wrap;">${club.history}</p>
                </div>

                <div class="club-profile-section">
                    <h2 class="fuma-section-title" style="text-align:left; font-size: 1.2rem;">Official Roster</h2>
                    <div class="roster-list">
                        ${rosterHTML}
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error("Erreur loadClubProfile:", error);
        detailContainer.innerHTML = '<p style="text-align:center;">Erreur lors de la synchronisation des données.</p>';
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
            const isFreeAgent = !p.team || p.team.toLowerCase().includes("free agent") || p.team === "";
            const teamBadge = isFreeAgent 
                ? `<div style="position: absolute; top: 0; left: 0; font-size: 1.2rem; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.8));" title="Free Agent">🆓</div>` 
                : `<div style="position: absolute; top: 2px; left: 2px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
                    <img src="${p.logo}" alt="${p.team}" title="${p.team}" style="width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.7));">
                   </div>`;

            return `
                <div class="club-card" style="text-align:center; padding: 25px; position: relative;">
                    <div style="position: relative; width: 90px; height: 90px; margin: 0 auto 15px auto;">
                        <img src="${p.avatar}" alt="${p.tag}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid var(--fuma-primary);" onerror="this.src='${PLACEHOLDER_AVATAR}'">
                        ${teamBadge}
                        <div style="position: absolute; bottom: 0; right: 0; font-size: 1.1rem; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.7));">${p.flag}</div>
                    </div>
                    <h3 style="margin:0; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 1px;">${p.tag}</h3>
                    <p style="font-size: 0.75rem; color: var(--fuma-text-dim); margin: 5px 0;">${p.pos} | ${p.arch}</p>
                    <div style="position: absolute; top: 10px; right: 10px; background: var(--fuma-primary); color: black; font-weight: 800; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">${p.rating}</div>
                </div>`;
        }).join('');
    }

    // --- 9. INITIALISATION ---
    injectNavigation();
    handleProfilePage();
    setupFormSubmission();

    // Filtre de Saison
    document.getElementById('filter-season')?.addEventListener('change', (e) => {
        fetchFumaPlayers(e.target.value);
    });

    // Filtres combinés Joueurs
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

    // Recherche clubs
    document.getElementById('fuma-search')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        renderClubs(allClubs.filter(c => c.name.toLowerCase().includes(term)));
    });

    // Retour en haut
    const backBtn = document.getElementById('backTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) backBtn?.classList.add('visible');
        else backBtn?.classList.remove('visible');
    });
    backBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // Déclenchement des chargements selon l'ID du container présent
    if (document.getElementById('fuma-js-clubs')) fetchFumaClubs();
    if (document.getElementById('fuma-js-players')) fetchFumaPlayers();
    if (document.getElementById('club-details')) loadClubProfile();
});



