document.addEventListener('DOMContentLoaded', () => {
    let allClubs = [];
    let allPlayers = []; 
    
    // --- 1. CONFIGURATION & URLS ---
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=252630071&single=true&output=csv';
    const PLAYERS_SHEET_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=';
    const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzieuE-AiE2XSwE7anpAeDzLhe-rHpgA8eV7TMS3RRbUuzESLt40zBmIDqi9N6mxbdkqA/exec'; 
    const CLIENT_ID = '1473807551329079408'; 
    const REDIRECT_URI = encodeURIComponent('https://fuma-clubs-official.vercel.app/api/auth/callback');

    const STATS_CONFIG = [
        { name: "All Seasons", gid: "1342244083" },
        { name: "Saison 1", gid: "2074996595" },
        { name: "Saison 2", gid: "1996803561" }
    ];

    // --- 2. NAVIGATION ---
    const renderNav = () => {
        const nav = document.getElementById('main-nav');
        if (!nav) return;
        nav.innerHTML = `
            <div class="fuma-nav-container">
                <a href="index.html" class="fuma-logo">FUMA <span>CLUBS</span></a>
                <div class="fuma-burger" id="fuma-burger"><span></span><span></span><span></span></div>
                <div class="nav-links" id="nav-links">
                    <a href="index.html">HOME</a>
                    <a href="clubs.html">CLUBS</a>
                    <a href="players.html">PLAYERS</a>
                    <a href="profile.html" class="nav-highlight">MY PROFILE</a>
                </div>
            </div>
        `;
        const burger = document.getElementById('fuma-burger');
        const links = document.getElementById('nav-links');
        burger?.addEventListener('click', () => {
            burger.classList.toggle('active');
            links.classList.toggle('active');
        });
    };
    renderNav();

    // --- 3. DISCORD ---
    const btnMyProfile = document.getElementById('btn-my-profile');
    if (btnMyProfile) {
        btnMyProfile.href = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify%20guilds`;
    }

    // --- 4. CLUBS (LISTE) ---
    async function fetchFumaClubs() {
        try {
            const response = await fetch(SHEET_URL);
            const data = await response.text();
            const rows = data.split('\n').slice(1);
            allClubs = rows.map(row => {
                const cols = row.split(',');
                return {
                    id: cols[0]?.trim(),
                    name: cols[1]?.trim(),
                    logo: cols[3]?.trim() || 'https://via.placeholder.com/100',
                    flag: cols[4]?.trim() || ''
                };
            }).filter(c => c.name);
            renderClubs(allClubs);
        } catch (err) { console.error("Clubs Error:", err); }
    }

    function renderClubs(clubs) {
        const grid = document.getElementById('fuma-js-clubs');
        if (!grid) return;
        grid.innerHTML = clubs.map(c => `
            <div class="fuma-club-card" onclick="window.location.href='club.html?id=${c.id}'">
                <img src="${c.logo}" alt="${c.name}" class="club-logo-main">
                <div class="club-info">
                    <h3>${c.name}</h3>
                    <img src="${c.flag}" class="club-flag" alt="pays">
                </div>
            </div>
        `).join('');
    }

    // --- 5. JOUEURS (DATABASE & FILTRES) ---
    async function fetchFumaPlayers() {
        try {
            const response = await fetch(`${PLAYERS_SHEET_BASE}${STATS_CONFIG[0].gid}`);
            const data = await response.text();
            const rows = data.split('\n');
            if (rows.length < 2) return;

            const headers = rows[0].split(',').map(h => h.trim().toUpperCase());
            const idx = {
                id: headers.indexOf('ID'),
                tag: headers.indexOf('PSN_ID'),
                nick: headers.indexOf('NICKNAME'),
                pos: headers.indexOf('POSITION'),
                team: headers.indexOf('TEAM'),
                ava: headers.indexOf('AVATAR'),
                arch: headers.indexOf('ARCHETYPE')
            };

            allPlayers = rows.slice(1).map(row => {
                const c = row.split(',');
                return {
                    id: c[idx.id]?.trim(),
                    tag: c[idx.tag]?.trim() || c[idx.nick]?.trim() || 'Unknown',
                    pos: c[idx.pos]?.trim() || 'N/A',
                    team: c[idx.team]?.trim() || 'Free Agent',
                    avatar: c[idx.ava]?.trim() || 'https://via.placeholder.com/80',
                    archetype: c[idx.arch]?.trim() || 'N/A'
                };
            }).filter(p => p.id);

            renderPlayers(allPlayers);
            populateTeamFilter(allPlayers);
        } catch (err) { console.error("Players Error:", err); }
    }

    function renderPlayers(players) {
        const grid = document.getElementById('fuma-js-players');
        if (!grid) return;
        if (players.length === 0) {
            grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; opacity:0.5;">No players found.</p>`;
            return;
        }
        grid.innerHTML = players.map(p => `
            <div class="fuma-club-card" onclick="window.location.href='player.html?id=${p.id}'" style="text-align: center; padding: 25px;">
                <div class="player-avatar-wrapper" style="position:relative; width:90px; height:90px; margin:0 auto 15px;">
                    <img src="${p.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; border:2px solid var(--fuma-primary);">
                </div>
                <h3 style="margin: 0 0 5px 0; font-size:1.1rem;">${p.tag}</h3>
                <div style="color: var(--fuma-primary); font-weight:600; font-size:0.85rem; text-transform:uppercase; margin-bottom:5px;">${p.pos}</div>
                <div style="font-size: 0.75rem; opacity: 0.6; margin-bottom:12px;">${p.team}</div>
                <div style="display:inline-block; font-size: 0.65rem; background: rgba(212,175,55,0.1); color: var(--fuma-primary); padding: 4px 10px; border-radius: 12px; border: 1px solid rgba(212,175,55,0.2);">
                    ${p.archetype}
                </div>
            </div>
        `).join('');
    }

    // --- 6. CLUB DETAILS (Roster complet) ---
    async function fetchClubDetails(clubId) {
        const container = document.getElementById('club-details');
        if (!container) return;
        try {
            const [resC, resP] = await Promise.all([
                fetch(SHEET_URL),
                fetch(`${PLAYERS_SHEET_BASE}${STATS_CONFIG[0].gid}`)
            ]);
            const dataC = await resC.text();
            const clubRow = dataC.split('\n').find(r => r.split(',')[0].trim() === clubId);
            if (!clubRow) return;

            const cCols = clubRow.split(',');
            const cName = cCols[1].trim();
            const dataP = await resP.text();
            const pRows = dataP.split('\n').slice(1);
            
            const teamPlayers = pRows.filter(r => {
                const cols = r.split(',');
                return cols[4]?.trim().toLowerCase() === cName.toLowerCase();
            });

            container.innerHTML = `
                <div class="fuma-card" style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid var(--fuma-primary);">
                    <img src="${cCols[3]}" style="width: 150px; margin-bottom: 20px;">
                    <h1 style="font-size: 2.5rem; margin-bottom: 10px;">${cName}</h1>
                    <img src="${cCols[4]}" style="width: 30px;" alt="country">
                </div>
                <h2 class="fuma-section-title">OFFICIAL ROSTER</h2>
                <div class="fuma-club-grid">
                    ${teamPlayers.length > 0 ? teamPlayers.map(r => {
                        const p = r.split(',');
                        return `
                            <div class="fuma-club-card" onclick="window.location.href='player.html?id=${p[0]}'">
                                <img src="${p[5] || 'https://via.placeholder.com/80'}" style="width:70px; height:70px; border-radius:50%; object-fit:cover; margin-bottom:10px; border:1px solid var(--fuma-primary);">
                                <h3>${p[1]}</h3>
                                <p style="color:var(--fuma-primary); font-size:0.8rem;">${p[3]}</p>
                            </div>
                        `;
                    }).join('') : '<p style="grid-column:1/-1; text-align:center;">No players registered for this club.</p>'}
                </div>
            `;
        } catch (err) { console.error(err); }
    }

    // --- 7. PLAYER PROFILE (Multi-saisons) ---
    async function fetchPlayerData(playerId) {
        const head = document.getElementById('player-header');
        const stats = document.getElementById('player-stats-container');
        if (!head || !stats) return;

        try {
            const res = await fetch(`${PLAYERS_SHEET_BASE}${STATS_CONFIG[0].gid}`);
            const data = await res.text();
            const rows = data.split('\n').map(r => r.split(','));
            const headers = rows[0].map(h => h.trim().toUpperCase());
            const pRow = rows.find(r => r[0].trim() === playerId);

            if (!pRow) { head.innerHTML = "<h2>Player not found</h2>"; return; }
            
            const p = {};
            headers.forEach((h, i) => p[h] = pRow[i]?.trim());

            head.innerHTML = `
                <div class="fuma-card" style="display:flex; align-items:center; gap:40px; padding:40px; flex-wrap:wrap; justify-content:center;">
                    <img src="${p.AVATAR || 'https://via.placeholder.com/150'}" style="width:180px; height:180px; border-radius:50%; border:4px solid var(--fuma-primary); object-fit:cover; box-shadow: 0 0 20px rgba(212,175,55,0.2);">
                    <div style="flex:1; min-width:300px; text-align:left;">
                        <h1 style="font-size:3rem; margin:0; line-height:1;">${p.PSN_ID || p.NICKNAME}</h1>
                        <div style="margin:15px 0; font-size:1.3rem; color:var(--fuma-primary);">
                            <i class="fas fa-tshirt"></i> ${p.POSITION} &nbsp; | &nbsp; <i class="fas fa-shield-halved"></i> ${p.TEAM}
                        </div>
                        <div style="display:inline-block; background:var(--fuma-primary); color:black; padding:6px 20px; border-radius:25px; font-weight:800; text-transform:uppercase; letter-spacing:1px;">
                            ${p.ARCHETYPE}
                        </div>
                    </div>
                </div>
            `;

            stats.innerHTML = "";
            for (const conf of STATS_CONFIG) {
                const sRes = await fetch(`${PLAYERS_SHEET_BASE}${conf.gid}`);
                const sData = await sRes.text();
                const sRows = sData.split('\n').map(r => r.split(','));
                const sHeaders = sRows[0].map(h => h.trim());
                const sRow = sRows.find(r => r[0].trim() === playerId);

                if (sRow) {
                    let html = `
                        <div class="fuma-card" style="margin-bottom:30px; border-left:5px solid var(--fuma-primary); padding:30px;">
                            <h3 style="color:var(--fuma-primary); font-size:1.5rem; margin-bottom:25px; display:flex; align-items:center; gap:10px;">
                                <i class="fas fa-chart-bar"></i> ${conf.name}
                            </h3>
                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap:20px;">
                    `;
                    const exclude = ['ID','PSN_ID','NICKNAME','AVATAR','TEAM','LOGO','FLAG','ARCHETYPE','POSITION','GAME_ID'];
                    sHeaders.forEach((h, i) => {
                        if (!exclude.includes(h.toUpperCase()) && sRow[i] !== undefined) {
                            html += `
                                <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:12px; text-align:center; border:1px solid rgba(255,255,255,0.05);">
                                    <div style="font-size:0.7rem; color:var(--fuma-text-dim); text-transform:uppercase; margin-bottom:8px; letter-spacing:1px;">${h}</div>
                                    <div style="font-size:1.6rem; font-weight:800;">${sRow[i] || '0'}</div>
                                </div>
                            `;
                        }
                    });
                    stats.innerHTML += html + `</div></div>`;
                }
            }
        } catch (e) { console.error(e); }
    }

    // --- 8. PROFILE FORM & FILTERS ---
    const populateTeamFilter = (players) => {
        const select = document.getElementById('filter-team');
        if (!select) return;
        const teams = [...new Set(players.map(p => p.team))].sort();
        teams.forEach(t => {
            if(t && t !== 'Free Agent'){
                const opt = document.createElement('option');
                opt.value = t; opt.textContent = t;
                select.appendChild(opt);
            }
        });
    };

    const applyFilters = () => {
        const s = document.getElementById('player-search')?.value.toLowerCase() || "";
        const p = document.getElementById('filter-position')?.value || "";
        const t = document.getElementById('filter-team')?.value || "";
        const filtered = allPlayers.filter(player => {
            return player.tag.toLowerCase().includes(s) && (p==="" || player.pos===p) && (t==="" || player.team===t);
        });
        renderPlayers(filtered);
    };

    const profileForm = document.getElementById('fuma-profile-form');
    if (profileForm) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('id')) {
            document.getElementById('game-id-hidden').value = params.get('id');
            document.getElementById('psn-id').value = params.get('username') || '';
        }
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = profileForm.querySelector('button');
            btn.innerText = "UPDATING..."; btn.disabled = true;
            try {
                await fetch(APP_SCRIPT_URL, {
                    method: 'POST', mode: 'no-cors',
                    body: JSON.stringify(Object.fromEntries(new FormData(profileForm)))
                });
                alert('Success!'); window.location.href = 'players.html';
            } catch (err) { alert('Error'); btn.innerText = "UPDATE PROFILE"; btn.disabled = false; }
        });
    }

    // --- 9. EVENTS ---
    document.getElementById('player-search')?.addEventListener('input', applyFilters);
    document.getElementById('filter-position')?.addEventListener('change', applyFilters);
    document.getElementById('filter-team')?.addEventListener('change', applyFilters);
    document.getElementById('fuma-search')?.addEventListener('input', (e) => {
        renderClubs(allClubs.filter(c => c.name.toLowerCase().includes(e.target.value.toLowerCase())));
    });

    // --- 10. INIT ---
    if (document.getElementById('fuma-js-clubs')) fetchFumaClubs();
    if (document.getElementById('fuma-js-players')) fetchFumaPlayers();
    const urlP = new URLSearchParams(window.location.search);
    const id = urlP.get('id');
    if (id) {
        fetchClubDetails(id);
        fetchPlayerData(id);
    }
});
