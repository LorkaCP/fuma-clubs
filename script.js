document.addEventListener('DOMContentLoaded', () => {
    let allClubs = [];
    
    // --- 1. INJECTION DU MENU ---
    function injectNavigation() {
        const navElement = document.getElementById('main-nav');
        if (!navElement) return;

        // Détecte le nom du fichier actuel pour mettre le lien en surbrillance
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
                    <a href="#">Cup</a>
                    <a href="#">Rules</a>
                    <a href="https://discord.gg/xPz9FBkdtm" target="_blank">
                        <i class="fab fa-discord"></i> Discord
                    </a>
                    <a href="#" style="color:var(--fuma-primary)">Profile</a>
                </div>
            </div>
        `;

        // Active le menu burger après l'injection
        setupBurger();
    }

    // --- 2. GESTION DU BURGER MENU ---
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

    // --- 3. SCROLL & BACK TO TOP ---
    const backBtn = document.getElementById('backTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) backBtn?.classList.add('visible');
        else backBtn?.classList.remove('visible');
    });

    backBtn?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // --- 4. FETCH CLUBS (Google Sheets) ---
    async function fetchFumaClubs() {
        const clubContainer = document.getElementById('fuma-js-clubs');
        if (!clubContainer) return;

        const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=252630071&single=true&output=csv';
        
        try {
            const resp = await fetch(url);
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
            clubContainer.innerHTML = "<div class='fuma-loading-wrapper'>Error loading clubs.</div>";
            console.error(e);
        }
    }

    function renderClubs(clubsList) {
        const clubContainer = document.getElementById('fuma-js-clubs');
        if (!clubContainer) return;
        clubContainer.innerHTML = '';

        if (clubsList.length === 0) {
            clubContainer.innerHTML = '<div style="color:var(--fuma-text-dim); grid-column:1/-1; text-align:center;">No clubs found.</div>';
            return;
        }

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

    // --- 5. RECHERCHE ---
    const searchInput = document.getElementById('fuma-search');
    searchInput?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allClubs.filter(c => c.name.toLowerCase().includes(term));
        renderClubs(filtered);
    });

    // --- 6. PAGE PROFIL CLUB DYNAMIQUE ---
    async function loadClubProfile() {
        const detailContainer = document.getElementById('club-details');
        if (!detailContainer) return;

        const params = new URLSearchParams(window.location.search);
        const clubName = params.get('name');
        if (!clubName) {
            detailContainer.innerHTML = "<p>Club non trouvé.</p>";
            return;
        }

        const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=252630071&single=true&output=csv';

        try {
            const resp = await fetch(url);
            const text = await resp.text();
            const lines = text.trim().split("\n");
            const headers = lines[0].split(",");
            
            // Indexation dynamique selon tes colonnes
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
                
                // Formater l'historique (remplace les retours à la ligne ou crée des paragraphes)
                const formattedHistory = v[idx.history] ? v[idx.history].split('\n').map(p => `<p style="margin-bottom:15px;">${p}</p>`).join('') : "No history available.";
                
                // Formater la liste des joueurs
                const playersList = v[idx.players] ? v[idx.players].split(',').map(p => `<li>${p.trim()}</li>`).join('') : "No roster.";

                detailContainer.innerHTML = `
                    <div class="club-profile-header" style="text-align: center; margin-bottom: 50px;">
                        <img src="${v[idx.crest]}" style="width: 180px; margin-bottom: 20px;">
                        <h1 style="font-size: 3rem; color: var(--fuma-primary);">${v[idx.team]}</h1>
                        <div style="display:flex; justify-content:center; gap:15px; align-items:center;">
                             <span class="status-badge">${v[idx.active] === 'YES' ? '● ACTIVE' : '○ INACTIVE'}</span>
                             ${v[idx.stream] !== 'None' ? `<a href="${v[idx.stream]}" target="_blank" style="color:#ff0000; text-decoration:none;"><i class="fab fa-youtube"></i> LIVE</a>` : ''}
                        </div>
                    </div>

                    <div class="club-grid-layout" style="display: grid; grid-template-columns: 2fr 1fr; gap: 40px;">
                        
                        <div class="club-main-info">
                            <section style="margin-bottom: 40px;">
                                <h2 style="color:var(--fuma-primary); border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px;">HISTORY</h2>
                                <div style="font-style: italic; color: var(--fuma-text-dim); line-height: 1.8; text-align: justify;">
                                    ${formattedHistory}
                                </div>
                            </section>

                            <div class="stats-bar" style="display: flex; justify-content: space-between; background: var(--fuma-bg-card); padding: 20px; border-radius: 10px; border: var(--fuma-border);">
                                <div class="stat-item"><strong>${v[idx.gp]}</strong><span>GAMES</span></div>
                                <div class="stat-item" style="color:#4caf50;"><strong>${v[idx.win]}</strong><span>WIN</span></div>
                                <div class="stat-item" style="color:#ffeb3b;"><strong>${v[idx.draw]}</strong><span>DRAW</span></div>
                                <div class="stat-item" style="color:#f44336;"><strong>${v[idx.lost]}</strong><span>LOST</span></div>
                            </div>
                        </div>

                        <div class="club-sidebar">
                            <div style="background: var(--fuma-bg-card); padding: 20px; border-radius: 10px; border: var(--fuma-border); margin-bottom: 20px;">
                                <h3 style="font-size: 0.7rem; color: var(--fuma-primary); margin-bottom: 5px;">MANAGER</h3>
                                <p style="font-size: 1.1rem; font-weight: bold;">${v[idx.manager] || 'N/A'}</p>
                            </div>

                            <div style="background: var(--fuma-bg-card); padding: 20px; border-radius: 10px; border: var(--fuma-border);">
                                <h3 style="font-size: 0.7rem; color: var(--fuma-primary); margin-bottom: 15px;">ROSTER</h3>
                                <ul style="list-style: none; padding: 0; font-size: 0.9rem; color: var(--fuma-text-dim); line-height: 2;">
                                    ${playersList}
                                </ul>
                            </div>
                        </div>
                    </div>
                `;
            }
        } catch (e) { console.error(e); }
    }

    // --- INITIALISATION ---
    injectNavigation();
    fetchFumaClubs();
});



