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

        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = profileForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            
            submitBtn.disabled = true;
            submitBtn.innerText = "Updating...";

            const formData = new URLSearchParams();
            formData.append('game_tag', document.getElementById('id-game')?.value || "");
            formData.append('discord_id', document.getElementById('id-discord')?.value || "");
            formData.append('discord_name', document.getElementById('discord-name')?.value || "");
            formData.append('country', document.getElementById('country')?.value || "");
            formData.append('avatar', document.getElementById('avatar')?.value || "");
            formData.append('current_team', document.getElementById('team')?.value || "Free Agent");
            formData.append('main_archetype', document.getElementById('main-archetype')?.value || "");
            formData.append('main_position', document.getElementById('main-position')?.value || "");

            try {
                await fetch(APP_SCRIPT_URL, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });
                alert("Profile successfully updated!");
            } catch (error) {
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
                team: headers.indexOf('TEAMS'), crest: headers.indexOf('CREST'),
                history: headers.indexOf('HISTORY'), gp: headers.indexOf('GAMES PLAYED'),
                win: headers.indexOf('WIN'), draw: headers.indexOf('DRAW'),
                lost: headers.indexOf('LOST'), trophies: headers.indexOf('TROPHIES'),
                manager: headers.indexOf('MANAGER'), players: headers.indexOf('PLAYERS'),
                active: headers.indexOf('ACTIVE'), stream: headers.indexOf('STREAM')
            };

            const clubLine = lines.slice(1).find(line => parseCSVLine(line)[idx.team] === clubName);

            if (clubLine) {
                const v = parseCSVLine(clubLine);
                const playersList = v[idx.players] ? v[idx.players].split(',').map(p => `<li>${p.trim()}</li>`).join('') : "<li>Roster is empty.</li>";
                
                detailContainer.innerHTML = `
                    <div class="club-profile-header" style="text-align: center; margin-bottom: 50px;">
                        <img src="${v[idx.crest] || ''}" style="width: 180px; margin-bottom: 20px;" alt="Crest">
                        <h1 style="font-size: 3rem; color: var(--fuma-primary);">${v[idx.team]}</h1>
                    </div>
                    <div class="club-grid-layout">
                        <div class="club-main-info">
                            <section>
                                <h2 style="color:var(--fuma-primary);">HISTORY</h2>
                                <p>${v[idx.history] || "No history available."}</p>
                            </section>
                            <div class="stats-bar">
                                <div class="stat-item"><strong>${v[idx.gp] || 0}</strong><br>GAMES</div>
                                <div class="stat-item"><strong>${v[idx.win] || 0}</strong><br>WIN</div>
                            </div>
                        </div>
                        <div class="club-sidebar">
                            <div class="sidebar-box">
                                <h3 class="sidebar-title">MANAGER</h3>
                                <p>${v[idx.manager] || 'N/A'}</p>
                                <h3 class="sidebar-title">ROSTER</h3>
                                <ul class="roster-list">${playersList}</ul>
                            </div>
                        </div>
                    </div>`;
            }
        } catch (e) { console.error(e); }
    }

    // --- 8. LOGIQUE LISTE DES JOUEURS (players.html) ---
    async function fetchFumaPlayers() {
        const playerContainer = document.getElementById('fuma-js-players');
        if (!playerContainer) return;

        try {
            const resp = await fetch(PLAYERS_SHEET_URL);
            const text = await resp.text();
            const lines = text.trim().split("\n");
            const headers = lines[0].split(",");

            const idx = {
                tag: headers.indexOf('GAME_TAG'), pos: headers.indexOf('MAIN_POSITION'),
                team: headers.indexOf('CURRENT_TEAM'), rating: headers.indexOf('RATING'),
                avatar: headers.indexOf('AVATAR'), arch: headers.indexOf('MAIN_ARCHETYPE'),
                flag: headers.indexOf('FLAG')
            };

            allPlayers = lines.slice(1).map(line => {
                const v = parseCSVLine(line);
                return {
                    tag: v[idx.tag], pos: v[idx.pos], team: v[idx.team] || "Free Agent",
                    rating: v[idx.rating] || "0.0", avatar: v[idx.avatar] || "https://placehold.co/150x150?text=PLAYER",
                    arch: v[idx.arch] || "Standard", flag: v[idx.flag] || ""
                };
            }).filter(p => p.tag);

            renderPlayers(allPlayers);

            // Filtres
            document.getElementById('player-search')?.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                renderPlayers(allPlayers.filter(p => p.tag.toLowerCase().includes(term)));
            });

            document.getElementById('filter-position')?.addEventListener('change', (e) => {
                const pos = e.target.value;
                renderPlayers(pos === "" ? allPlayers : allPlayers.filter(p => p.pos === pos));
            });

        } catch (e) {
            playerContainer.innerHTML = "Erreur de chargement des joueurs.";
        }
    }

    function renderPlayers(list) {
        const container = document.getElementById('fuma-js-players');
        if (!container) return;
        container.innerHTML = list.map(p => `
            <div class="club-card" style="text-align:center; padding: 25px; position: relative;">
                <img src="${p.avatar}" alt="${p.tag}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--fuma-primary); margin-bottom:10px;">
                <h3 style="margin:0;">${p.tag} ${p.flag}</h3>
                <p style="font-size: 0.8rem; color: var(--fuma-text-dim);">${p.pos} | ${p.arch}</p>
                <p style="margin-top:10px; font-weight:bold; color:var(--fuma-primary);">${p.team}</p>
                <div style="position: absolute; top: 10px; right: 10px; background: var(--fuma-primary); color: black; font-weight: 800; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem;">${p.rating}</div>
            </div>
        `).join('');
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
