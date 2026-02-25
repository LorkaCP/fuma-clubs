document.addEventListener('DOMContentLoaded', () => {
    let allPlayers = []; // Stockage global pour les calculs de saison
    
    // --- 1. CONFIGURATION & URLS ---
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=252630071&single=true&output=csv';
    const PLAYERS_SHEET_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=';
    const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz-PcJxL7wtGaYMKFV-Cz2tugYbvDBgVR13cj1WQXcqLLho0K6sfLvSYhAQhGgzDLqSBQ/exec'; 

    
   // --- 3. INJECTION DU MENU COMPLET ---
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
                    <a href="index.html" id="nav-home">Home</a>
                    <a href="league.html" id="nav-league">League</a>
                    <a href="clubs.html" id="nav-clubs">Clubs</a>
                    <a href="players.html" id="nav-players">Players</a>
                    <a href="rules.html" id="nav-rules">Rules</a>
                    <a href="${discordServerLink}" target="_blank" style="color: #5865F2;">
                        <i class="fab fa-discord"></i> Discord
                    </a>
                </div>
            </div>
        `;

        // Gestion automatique du lien "Active"
        const currentPage = window.location.pathname.split("/").pop() || 'index.html';
        const allLinks = nav.querySelectorAll('.nav-links a');
        allLinks.forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            }
        });

        // Gestion du Menu Burger Mobile
        const burger = document.getElementById('burger-menu');
        const linksContainer = document.getElementById('nav-links-container');
        if (burger && linksContainer) {
            burger.onclick = function() {
                burger.classList.toggle('active');
                linksContainer.classList.toggle('active');
            };
        }
    }

    // On lance l'injection du menu dès le chargement
    injectNavigation();
    
    
    // --- 2. UTILITAIRES (MOTEURS DE CALCUL) ---

    function csvToObjects(csvText) {
        const lines = csvText.trim().split("\n");
        if (lines.length < 2) return [];
        const headers = lines[0].split(",").map(h => h.trim().toUpperCase());
        return lines.slice(1).map(line => {
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
            const obj = {};
            headers.forEach((header, index) => {
                let value = result[index] ? result[index].replace(/^"|"$/g, '').trim() : "";
                obj[header] = value;
            });
            return obj;
        });
    }

    function aggregateStats(logs, profiles = {}) {
        const stats = {};
        logs.forEach(log => {
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
                    matches: 0, goals: 0, assists: 0, sumNote: 0
                };
            }
            const s = stats[tag];
            s.matches += 1;
            s.goals += parseInt(log.GOALS || log.Buts || 0);
            s.assists += parseInt(log.ASSISTS || log.Assists || 0);
            const note = parseFloat((log.RATING || log.Note || "0").toString().replace(',', '.'));
            s.sumNote += note;
        });

        return Object.values(stats).map(s => ({
            ...s,
            rating: s.matches > 0 ? (s.sumNote / s.matches).toFixed(2) : "0.00"
        }));
    }

    // --- 3. CHARGEMENT ET AFFICHAGE ---

    async function loadFumaData(gid) {
        const container = document.getElementById('fuma-js-players');
        if (container) container.innerHTML = '<div class="fuma-loading-wrapper" style="grid-column:1/-1; text-align:center; padding:50px;"><div class="fuma-spinner" style="margin:0 auto;"></div><p>Calculating Stats...</p></div>';

        try {
            const dbResp = await fetch(`${PLAYERS_SHEET_BASE}1342244083&t=${Date.now()}`);
            const dbData = csvToObjects(await dbResp.text());
            const profiles = {};
            dbData.forEach(row => { if(row.GAME_TAG) profiles[row.GAME_TAG] = row; });

            const sResp = await fetch(`${PLAYERS_SHEET_BASE}${gid}&t=${Date.now()}`);
            const logs = csvToObjects(await sResp.text());

            allPlayers = aggregateStats(logs, profiles);
            
            if (container) {
                updateFilters(allPlayers);
                renderPlayers(allPlayers); 
            }
        } catch (e) {
            console.error("Load error:", e);
        }
    }

    function renderPlayers(list) {
        const container = document.getElementById('fuma-js-players');
        if (!container) return;
        if (list.length === 0) {
            container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 50px;">No players found.</p>`;
            return;
        }

        container.innerHTML = list.map(p => `
            <div class="fuma-club-card" onclick="window.location.href='player.html?id=${encodeURIComponent(p.tag)}'" style="cursor: pointer; position: relative;">
                <div style="position: absolute; top: 15px; right: 15px; background: var(--fuma-primary); color: #000; font-weight: 800; padding: 4px 10px; border-radius: 8px; font-size: 0.9rem;">
                    ${p.rating}
                </div>
                <div style="width: 100%; height: 180px; overflow: hidden; border-radius: 12px; margin-bottom: 15px; background: #111;">
                    <img src="${p.avatar}" alt="${p.tag}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <h3 style="margin: 0; font-size: 1.1rem; color: #fff;">${p.flag} ${p.tag}</h3>
                <p style="font-size: 0.75rem; color: var(--fuma-primary); margin-bottom: 10px;">${p.pos} • ${p.arch}</p>
                <div style="display: flex; align-items: center; margin-bottom: 15px; background: rgba(255,255,255,0.03); padding: 5px; border-radius: 5px;">
                    <img src="${p.logo}" style="width: 20px; margin-right: 8px;" onerror="this.style.display='none'">
                    <span style="font-size: 0.8rem; color: var(--fuma-text-dim);">${p.team}</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px; text-align: center;">
                    <div><span style="display: block; font-weight: 700;">${p.matches}</span><small style="font-size: 0.6rem; color: var(--fuma-text-dim);">MATCHES</small></div>
                    <div><span style="display: block; font-weight: 700;">${p.goals}</span><small style="font-size: 0.6rem; color: var(--fuma-text-dim);">GOALS</small></div>
                    <div><span style="display: block; font-weight: 700;">${p.assists}</span><small style="font-size: 0.6rem; color: var(--fuma-text-dim);">ASSISTS</small></div>
                </div>
            </div>`).join('');
    }

    // --- 4. FILTRES ---

    function updateFilters(players) {
        const teamFilter = document.getElementById('filter-team');
        if (!teamFilter) return;
        const teams = [...new Set(players.map(p => p.team))].sort();
        const current = teamFilter.value;
        teamFilter.innerHTML = '<option value="">All Teams</option>' + 
            teams.map(t => `<option value="${t}">${t}</option>`).join('');
        teamFilter.value = current;
    }

    function applyFilters() {
        const team = document.getElementById('filter-team')?.value || "";
        const pos = document.getElementById('filter-position')?.value || "";
        const search = document.getElementById('search-player')?.value.toLowerCase() || "";

        const filtered = allPlayers.filter(p => {
            const matchTeam = team === "" || p.team === team;
            const matchPos = pos === "" || p.pos.includes(pos);
            const matchSearch = p.tag.toLowerCase().includes(search);
            return matchTeam && matchPos && matchSearch;
        });
        renderPlayers(filtered);
    }

    // --- 5. INITIALISATION ---

    // Navigation injection
    const nav = document.getElementById('main-nav');
    if (nav) {
        nav.innerHTML = `<div class="nav-container"><a href="index.html" class="fuma-logo">FUMA<span>CLUBS</span></a><div class="nav-links"><a href="index.html">Home</a><a href="clubs.html">Clubs</a><a href="players.html" class="active">Players</a></div></div>`;
    }

    // Écouteurs d'événements
    const seasonSel = document.getElementById('season-selector');
    if (seasonSel) {
        seasonSel.addEventListener('change', (e) => loadFumaData(e.target.value));
        loadFumaData(seasonSel.value);
    }

    document.getElementById('filter-team')?.addEventListener('change', applyFilters);
    document.getElementById('filter-position')?.addEventListener('change', applyFilters);
    document.getElementById('search-player')?.addEventListener('input', applyFilters);

});

