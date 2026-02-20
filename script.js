document.addEventListener('DOMContentLoaded', () => {
    let allClubs = [];
    let allPlayers = []; // Stockage pour la recherche de joueurs
    
    // --- 1. CONFIGURATION & URLS ---
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=252630071&single=true&output=csv';
    const PLAYERS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=1342244083&single=true&output=csv';
    const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzieuE-AiE2XSwE7anpAeDzLhe-rHpgA8eV7TMS3RRbUuzESLt40zBmIDqi9N6mxbdkqA/exec'; 
    const CLIENT_ID = '1473807551329079408'; 
    const REDIRECT_URI = encodeURIComponent('https://fuma-clubs-official.vercel.app/api/auth/callback');
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify%20guilds`;
    const DEFAULT_AVATAR = "https://i.ibb.co/4wPqLKzf/profile-picture-icon-png-people-person-profile-4.png";

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

        const myProfileBtn = document.getElementById('btn-my-profile') || document.querySelector('.players-header .fuma-cta');
        if (myProfileBtn) {
            myProfileBtn.setAttribute('href', authUrl);
        }

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

    // URL de l'image générique par défaut
    const DEFAULT_AVATAR = "https://i.ibb.co/4wPqLKzf/profile-picture-icon-png-people-person-profile-4.png";

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = profileForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerText;
        
        // Verrouillage du bouton pendant l'envoi
        submitBtn.disabled = true;
        submitBtn.innerText = "Updating...";

        // Récupération et vérification de l'avatar
        const avatarInput = document.getElementById('avatar')?.value.trim();
        const finalAvatar = (avatarInput === "" || avatarInput.toLowerCase() === "none") ? DEFAULT_AVATAR : avatarInput;

        const formData = new URLSearchParams();
        // Informations d'identité
        formData.append('game_tag', document.getElementById('id-game')?.value || "");
        formData.append('discord_id', document.getElementById('id-discord')?.value || "");
        formData.append('discord_name', document.getElementById('discord-name')?.value || "");
        formData.append('country', document.getElementById('country')?.value || "");
        
        // Utilisation de l'avatar validé
        formData.append('avatar', finalAvatar);
        
        // Informations de club et style
        formData.append('current_team', document.getElementById('team')?.value || "Free Agent");
        formData.append('main_archetype', document.getElementById('main-archetype')?.value || "");
        formData.append('main_position', document.getElementById('main-position')?.value || "");

        try {
            const response = await fetch(APP_SCRIPT_URL, {
                method: 'POST',
                body: formData,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            if (response.ok) {
                alert("Profile successfully updated!");
            } else {
                throw new Error("Server error");
            }
        } catch (error) {
            console.error("Submission error:", error);
            // Message de secours car Google Apps Script peut parfois déclencher une erreur CORS même si l'envoi réussit
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
            clubContainer.innerHTML = "Erreur de chargement des clubs.";
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
                
                const statusHTML = `<span style="color: ${isActive ? '#4caf50' : '#f44336'}; font-weight: bold; font-size: 0.9rem;">
                    <i class="fas fa-circle" style="font-size: 10px; vertical-align: middle;"></i> ${isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>`;

                // Gestion du Stream
                let streamHTML = '';
                if (v[idx.stream] && v[idx.stream].toLowerCase() !== "none") {
                    const isTwitch = v[idx.stream].includes('twitch.tv');
                    streamHTML = `<h3 class="sidebar-title" style="margin-top:20px;"><i class="fas fa-broadcast-tower"></i> LIVE STREAM</h3>
                                  <a href="${v[idx.stream]}" target="_blank" class="fuma-cta" style="display:block; text-align:center; background:#6441a5; font-size: 0.8rem; padding: 10px;">
                                  <i class="${isTwitch ? 'fab fa-twitch' : 'fab fa-youtube'}"></i> WATCH NOW</a>`;
                }

                // Gestion des Trophées
                let trophiesHTML = ''; 
                if (v[idx.trophies] && v[idx.trophies] !== "0" && v[idx.trophies].toLowerCase() !== "none") {
                    trophiesHTML = `<div class="trophy-section" style="margin-bottom: 30px;">
                        <h3 class="sidebar-title" style="border:none; margin-bottom:10px;"><i class="fas fa-trophy" style="color:var(--fuma-primary)"></i> ACHIEVEMENTS</h3>
                        <div class="trophy-grid" style="display: flex; flex-wrap: wrap; gap: 10px;">
                            ${v[idx.trophies].split(',').map(t => `<div class="trophy-badge" style="background: rgba(212,175,55,0.1); padding: 5px 12px; border-radius: 20px; border: 1px solid var(--fuma-primary); font-size: 0.8rem; color: var(--fuma-primary);"><span class="trophy-icon">🏆</span> ${t.trim()}</div>`).join('')}
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
                                <h2 style="color:var(--fuma-primary); border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px;">HISTORY</h2>
                                <div style="font-style: italic; color: var(--fuma-text-dim); line-height: 1.8;">${formattedHistory}</div>
                            </section>

                            <div class="stats-bar" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: var(--fuma-bg-card); padding: 20px; border-radius: 12px; margin-top: 30px; border: var(--fuma-border);">
                                <div class="stat-item" style="text-align: center;">
                                    <strong style="display: block; font-size: 1.5rem;">${v[idx.gp] || 0}</strong>
                                    <span style="font-size: 0.7rem; color: var(--fuma-text-dim); text-transform: uppercase;">Games</span>
                                </div>
                                <div class="stat-item" style="text-align: center; color: #4caf50;">
                                    <strong style="display: block; font-size: 1.5rem;">${v[idx.win] || 0}</strong>
                                    <span style="font-size: 0.7rem; color: var(--fuma-text-dim); text-transform: uppercase;">Win</span>
                                </div>
                                <div class="stat-item" style="text-align: center; color: #ffeb3b;">
                                    <strong style="display: block; font-size: 1.5rem;">${v[idx.draw] || 0}</strong>
                                    <span style="font-size: 0.7rem; color: var(--fuma-text-dim); text-transform: uppercase;">Draw</span>
                                </div>
                                <div class="stat-item" style="text-align: center; color: #f44336;">
                                    <strong style="display: block; font-size: 1.5rem;">${v[idx.lost] || 0}</strong>
                                    <span style="font-size: 0.7rem; color: var(--fuma-text-dim); text-transform: uppercase;">Lost</span>
                                </div>
                            </div>
                        </div>

                        <div class="club-sidebar">
                            <div class="sidebar-box" style="background: var(--fuma-bg-card); padding: 25px; border-radius: 12px; border: var(--fuma-border);">
                                <h3 class="sidebar-title" style="color: var(--fuma-primary); border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 15px; font-size: 1rem;">MANAGER</h3>
                                <p style="margin-bottom:25px; font-weight: 600;">${v[idx.manager] || 'N/A'}</p>
                                
                                <h3 class="sidebar-title" style="color: var(--fuma-primary); border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 15px; font-size: 1rem;">ROSTER</h3>
                                <ul class="roster-list" style="list-style: none; padding: 0; color: var(--fuma-text-dim); font-size: 0.9rem;">
                                    ${playersList}
                                </ul>
                                
                                ${streamHTML}
                            </div>
                        </div>
                    </div>`;
            }
        } catch (e) { 
            console.error("Erreur chargement club:", e); 
            detailContainer.innerHTML = "<p style='text-align:center; color:red;'>Error loading club details.</p>";
        }
    }

    // --- 8. LOGIQUE LISTE DES JOUEURS (players.html) ---
   async function fetchFumaPlayers() {
    const playerContainer = document.getElementById('fuma-js-players');
    if (!playerContainer) return;

    const DEFAULT_AVATAR = "https://i.ibb.co/4wPqLKzf/profile-picture-icon-png-people-person-profile-4.png";

    try {
        const resp = await fetch(PLAYERS_SHEET_URL);
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

        // Remplissage du filtre équipe
        const teamFilter = document.getElementById('filter-team');
        if (teamFilter) {
            const teams = [...new Set(allPlayers.map(p => p.team))].sort();
            teamFilter.innerHTML = '<option value="">All Teams</option>';
            teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team;
                option.textContent = team;
                teamFilter.appendChild(option);
            });
        }

        renderPlayers(allPlayers);

        // Logique de filtrage combinée
        const applyFilters = () => {
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

        document.getElementById('player-search')?.addEventListener('input', applyFilters);
        document.getElementById('filter-position')?.addEventListener('change', applyFilters);
        document.getElementById('filter-team')?.addEventListener('change', applyFilters);

    } catch (e) {
        console.error("Erreur de chargement:", e);
        playerContainer.innerHTML = "Error loading players.";
    }
}
    function renderPlayers(list) {
    const container = document.getElementById('fuma-js-players');
    if (!container) return;

    const DEFAULT_AVATAR = "https://i.ibb.co/4wPqLKzf/profile-picture-icon-png-people-person-profile-4.png";

    container.innerHTML = list.map(p => {
        const playerImg = (p.avatar && p.avatar !== "none" && p.avatar !== "") ? p.avatar : DEFAULT_AVATAR;
        
        const isFreeAgent = !p.team || p.team.toLowerCase().includes("free agent") || p.team === "";
        const teamDisplay = isFreeAgent 
            ? `<span style="font-size: 1.5rem;" title="Free Agent">🆓</span>` 
            : `<img src="${p.logo}" alt="${p.team}" title="${p.team}" style="height: 35px; width: auto; object-fit: contain;">`;

        return `
            <div class="club-card" style="text-align:center; padding: 25px; position: relative;">
                
                <div style="position: relative; width: 85px; height: 85px; margin: 0 auto 15px auto;">
                    <img src="${playerImg}" 
                         alt="${p.tag}" 
                         style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid var(--fuma-primary);"
                         onerror="this.src='${DEFAULT_AVATAR}'">
                    
                    <div style="position: absolute; bottom: 0; right: 0; font-size: 1.2rem; background: rgba(0,0,0,0.5); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); border: 1px solid rgba(255,255,255,0.1);">
                        ${p.flag}
                    </div>
                </div>
                
                <h3 style="margin:0; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 1px;">${p.tag}</h3>
                
                <p style="font-size: 0.75rem; color: var(--fuma-text-dim); margin: 5px 0 15px 0;">${p.pos} | ${p.arch}</p>
                
                <div style="height: 40px; display: flex; align-items: center; justify-content: center; margin-top: 10px;">
                    ${teamDisplay}
                </div>

                <div style="position: absolute; top: 10px; right: 10px; background: var(--fuma-primary); color: black; font-weight: 800; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">
                    ${p.rating}
                </div>
            </div>
        `;
    }).join('');
}

    // --- 9. INITIALISATION ---
    injectNavigation();
    handleProfilePage();
    setupFormSubmission();

    // Recherche clubs (index/clubs)
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

    // Chargements spécifiques aux pages
    if (document.getElementById('fuma-js-clubs')) fetchFumaClubs();
    if (document.getElementById('fuma-js-players')) fetchFumaPlayers();
    if (document.getElementById('club-details')) loadClubProfile();
});








