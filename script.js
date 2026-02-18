document.addEventListener('DOMContentLoaded', () => {
    let allClubs = [];
    
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

    // --- 3. LOGIQUE PAGE PROFIL (Solution anti-undefined) ---
    function handleProfilePage() {
        if (!window.location.pathname.includes('profile.html')) return;

        const params = new URLSearchParams(window.location.search);
        const discordUsername = params.get('username');
        const discordId = params.get('id');

        // On vérifie que les données sont PRÉSENTES et ne sont pas la chaîne "undefined"
        if (discordUsername && discordUsername !== "undefined" && discordId && discordId !== "undefined") {
            
            const nameInput = document.getElementById('discord-name');
            const idInput = document.getElementById('id-discord');

            if (nameInput && idInput) {
                // Remplissage des champs
                nameInput.value = decodeURIComponent(discordUsername);
                idInput.value = discordId;
                
                console.log("✅ Champs remplis :", discordUsername);

                // NETTOYAGE URL : On ne le fait qu'ici, une fois le remplissage réussi
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                // Si les champs HTML ne sont pas encore créés, on retente vite
                setTimeout(handleProfilePage, 100);
            }
        } else {
            console.log("⚠️ Aucune donnée Discord valide à injecter (ou valeurs 'undefined')");
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
                players: headers.indexOf('PLAYERS')
            };

            const clubData = lines.slice(1).find(line => {
                const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(s => s.replace(/^"|"$/g,'')) || [];
                return values[idx.team]?.trim() === clubName;
            });

            if (clubData) {
                const v = clubData.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(s => s.replace(/^"|"$/g,'')) || [];
                
                const formattedHistory = v[idx.history] ? v[idx.history].split('\n').map(p => `<p style="margin-bottom:15px;">${p}</p>`).join('') : "No history available.";
                const playersList = v[idx.players] ? v[idx.players].split(',').map(p => `<li>${p.trim()}</li>`).join('') : "Roster is empty.";

                // --- LOGIQUE DE SUPPRESSION ACHIEVEMENTS ---
                const trophyRaw = v[idx.trophies] ? v[idx.trophies].trim() : "";
                let trophiesHTML = ''; // Par défaut, rien n'est affiché
                
                // On vérifie si la cellule contient du texte et n'est pas juste un "0"
                if (trophyRaw !== "" && trophyRaw !== "0") {
                    const trophyData = trophyRaw.split(',');
                    trophiesHTML = `
                        <div class="trophy-section">
                            <h3 class="sidebar-title" style="border:none; margin-bottom:0;"><i class="fas fa-trophy" style="color:var(--fuma-primary)"></i> ACHIEVEMENTS</h3>
                            <div class="trophy-grid">
                                ${trophyData.map(t => `
                                    <div class="trophy-badge">
                                        <span class="trophy-icon">🏆</span>
                                        <span class="trophy-text">${t.trim()}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }

                detailContainer.innerHTML = `
                    <div class="club-profile-header" style="text-align: center; margin-bottom: 50px;">
                        <img src="${v[idx.crest]}" style="width: 180px; margin-bottom: 20px;" alt="Crest">
                        <h1 style="font-size: 3rem; color: var(--fuma-primary);">${v[idx.team]}</h1>
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
                            </div>
                        </div>
                    </div>
                `;
            }
        } catch (e) { console.error(e); }
    }

    // --- 6. INITIALISATION & ÉVÉNEMENTS ---
    injectNavigation();
    handleProfilePage(); // Appel direct au chargement

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

    if (document.getElementById('fuma-js-clubs')) fetchFumaClubs();
    if (document.getElementById('club-details')) loadClubProfile();
});



