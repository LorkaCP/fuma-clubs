/**
 * FUMA CLUBS - LEAGUE LOGIC SYSTEM
 * Version : Tableaux, Fixtures, Tendances + Stats Top 5
 */

document.addEventListener('DOMContentLoaded', () => {

    const LEAGUE_CONFIG = {
        "S1": {
            "D1": { fixtures: "414200945" },
            "D2": { fixtures: "2124517897" },
            "stats_gid": "2074996595"
        },
        "S2": {
            "D1": { fixtures: "2013965123" },
            "stats_gid": "1996803561"
        }
    };

    const BASE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=";

    let currentMatchesData = []; 
    let col = {}; 

    function init() {
        const sSel = document.getElementById('season-master-select');
        const dSel = document.getElementById('division-master-select');
        
        if (!document.getElementById('matchday-select')) {
            const container = document.querySelector('.division-filter-container');
            const mSel = document.createElement('select');
            mSel.id = 'matchday-select';
            mSel.className = 'fuma-search-input';
            container.appendChild(mSel);
            mSel.addEventListener('change', filterMatchesByDay);
        }

        const seasons = Object.keys(LEAGUE_CONFIG);
        sSel.innerHTML = seasons.map(s => `<option value="${s}">Saison ${s.replace('S','')}</option>`).join('');
        
        const updateDivs = (s) => {
            // Filtrer pour ne pas afficher "stats_gid" dans le select
            const divs = Object.keys(LEAGUE_CONFIG[s]).filter(k => k !== "stats_gid");
            dSel.innerHTML = divs.map(d => `<option value="${d}">Division ${d.replace('D','')}</option>`).join('');
        };

        sSel.addEventListener('change', (e) => { updateDivs(e.target.value); loadData(); });
        dSel.addEventListener('change', loadData);

        updateDivs(seasons[0]);
        loadData();
    }

    async function loadData() {
        const s = document.getElementById('season-master-select').value;
        const d = document.getElementById('division-master-select').value;
        const gid = LEAGUE_CONFIG[s][d].fixtures;
        const statsGid = LEAGUE_CONFIG[s].stats_gid;
        
        // On charge d'abord les matchs, puis les stats
        await fetchAndProcess(gid);
        if (statsGid) await fetchAndProcessStats(statsGid);
    }

    // Gère la visibilité du selecteur de journée
    window.updateStatsUI = function(isStatsTab) {
        const mSel = document.getElementById('matchday-select');
        if (mSel) mSel.style.display = isStatsTab ? 'none' : 'block';
    };

    async function fetchAndProcess(gid) {
        const fixturesList = document.getElementById('fixtures-list');
        fixturesList.innerHTML = '<div class="fuma-spinner"></div>';

        try {
            const resp = await fetch(`${BASE_CSV_URL}${gid}`);
            const text = await resp.text();
            const rows = text.split('\n').filter(r => r.trim() !== "").map(parseCSVLine);
            const headers = rows[0].map(h => h.trim());
            currentMatchesData = rows.slice(1);

            col = {
                day: headers.indexOf('Matchday') !== -1 ? headers.indexOf('Matchday') : 0,
                start: headers.indexOf('StartDate') !== -1 ? headers.indexOf('StartDate') : 1,
                end: headers.indexOf('EndDate') !== -1 ? headers.indexOf('EndDate') : 2,
                h: headers.indexOf('TeamHome'),
                a: headers.indexOf('TeamAway'),
                sh: headers.indexOf('ScoreHome'),
                sa: headers.indexOf('ScoreAway'),
                lh: headers.indexOf('CrestHome'),
                la: headers.indexOf('CrestAway')
            };

            initMatchdaySelect();
        } catch (e) {
            console.error("Erreur critique:", e);
            fixturesList.innerHTML = "<p>Erreur de liaison avec Google Sheets.</p>";
        }
    }

    async function fetchAndProcessStats(gid) {
    if (!gid) return;

    // 1. Ciblez vos conteneurs de listes
    const containers = [
        'top-scorers-list',
        'top-ratings-list',
        'top-assists-list'
    ];

    // 2. Affichez le spinner FUMA dans chaque conteneur avant de charger les données
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; padding: 40px;">
                    <div class="fuma-spinner"></div>
                </div>
            `;
        }
    });

    try {
        const response = await fetch(BASE_CSV_URL + gid);
        const data = await response.text();
        const rows = data.split('\n').map(parseCSVLine);
        const headers = rows[0];
        const players = rows.slice(1);

        // Définition des index de colonnes (assurez-vous que GAME_TAG est le bon nom)
        const c = {
            name: headers.indexOf('GAME_TAG'), // Utilisation de GAME_TAG comme convenu
            team: headers.indexOf('CURRENT_TEAM'),
            avatar: headers.indexOf('AVATAR'),
            goals: headers.indexOf('GOALS'),
            assists: headers.indexOf('ASSISTS'),
            rating: headers.indexOf('RATING')
        };

        // 3. Le rendu final remplacera automatiquement le spinner
        renderTopList(players, c.goals, 'top-scorers-list', c, 'Buts');
        renderTopList(players, c.rating, 'top-ratings-list', c, 'Note', true);
        renderTopList(players, c.assists, 'top-assists-list', c, 'Passes');

    } catch (error) {
        console.error("Erreur stats:", error);
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<p style="color:red; font-size:0.8rem;">Erreur de chargement</p>`;
        });
    }
}

    function renderTopList(players, colIdx, containerId, c, label, isFloat = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const top5 = players
        .map(p => ({
            name: p[c.name],
            team: p[c.team],
            avatar: p[c.avatar],
            // Utilisation du nom/discord_name comme identifiant pour le lien si l'ID unique n'est pas dispo
            id: p[c.name], 
            value: isFloat ? parseFloat(p[colIdx].replace(',', '.')) : parseInt(p[colIdx])
        }))
        .filter(p => !isNaN(p.value) && p.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    container.innerHTML = top5.map((p, i) => `
        <a href="player.html?id=${encodeURIComponent(p.id)}" style="text-decoration: none; color: inherit; display: block; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
            <div style="display: flex; align-items: center; gap: 12px; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <span style="font-weight: 800; color: var(--fuma-primary); width: 20px;">${i+1}</span>
                <img src="${p.avatar}" style="width: 35px; height: 35px; border-radius: 50%; border: 1px solid var(--fuma-primary);" onerror="this.src='https://via.placeholder.com/35'">
                <div style="flex-grow: 1;">
                    <div style="font-weight: 600; font-size: 0.9rem;">${p.name}</div>
                    <div style="font-size: 0.7rem; color: var(--fuma-text-dim);">${p.team}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 800; color: #fff;">${p.value}</div>
                    <div style="font-size: 0.6rem; text-transform: uppercase; color: var(--fuma-primary);">${label}</div>
                </div>
            </div>
        </a>
    `).join('') || '<p style="font-size:0.8rem; color:gray; padding:10px;">Aucune donnée</p>';
}

    function initMatchdaySelect() {
        const mSel = document.getElementById('matchday-select');
        const days = [...new Set(currentMatchesData.map(r => r[col.day]))]
                        .filter(d => d && d.trim() !== "")
                        .sort((a, b) => parseInt(a) - parseInt(b));
        
        if (days.length === 0) return;
        mSel.innerHTML = days.map(d => `<option value="${d}">Journée ${d}</option>`).join('');

        const now = new Date();
        now.setHours(0,0,0,0);
        let autoDay = days[0];

        for (let row of currentMatchesData) {
            if (!row[col.start] || !row[col.end]) continue;
            const sD = new Date(row[col.start]);
            const eD = new Date(row[col.end]);
            if (!isNaN(sD) && !isNaN(eD) && now >= sD && now <= eD) {
                autoDay = row[col.day];
                break;
            }
        }

        mSel.value = autoDay;
        filterMatchesByDay();
    }

    function filterMatchesByDay() {
        const selectedDay = parseInt(document.getElementById('matchday-select').value);
        const dayMatches = currentMatchesData.filter(r => parseInt(r[col.day]) === selectedDay);
        renderMatches(dayMatches);

        const standingsMatches = currentMatchesData.filter(r => parseInt(r[col.day]) <= selectedDay);
        const prevStandingsMatches = currentMatchesData.filter(r => parseInt(r[col.day]) <= (selectedDay - 1));

        calculateAndRenderStandings(standingsMatches, prevStandingsMatches, selectedDay);
    }

    function calculateAndRenderStandings(currentData, prevData, currentDay) {
        const compute = (matches) => {
            const stats = {};
            matches.forEach(row => {
                const h = row[col.h], a = row[col.a];
                const sh = parseInt(row[col.sh]), sa = parseInt(row[col.sa]);
                const lh = row[col.lh], la = row[col.la];

                if (h && a) {
                    if (!stats[h]) stats[h] = { name: h, crest: lh, mj:0, v:0, n:0, d:0, bp:0, bc:0, pts:0 };
                    if (!stats[a]) stats[a] = { name: a, crest: la, mj:0, v:0, n:0, d:0, bp:0, bc:0, pts:0 };
                    
                    if (!isNaN(sh) && !isNaN(sa)) {
                        stats[h].mj++; stats[a].mj++;
                        stats[h].bp += sh; stats[h].bc += sa;
                        stats[a].bp += sa; stats[a].bc += sh;
                        if (sh > sa) { stats[h].v++; stats[h].pts += 3; stats[a].d++; }
                        else if (sh < sa) { stats[a].v++; stats[a].pts += 3; stats[h].d++; }
                        else { stats[h].n++; stats[a].n++; stats[h].pts += 1; stats[a].pts += 1; }
                    }
                }
            });
            return Object.values(stats).sort((a,b) => b.pts - a.pts || (b.bp-b.bc) - (a.bp-a.bc) || b.bp - a.bp);
        };

        const currentStandings = compute(currentData);
        const prevStandings = currentDay > 1 ? compute(prevData) : null;
        const maxMJ = Math.max(...currentStandings.map(t => t.mj), 0);

        const tbody = document.getElementById('league-table-body');
        if (!tbody) return;

        tbody.innerHTML = currentStandings.map((team, index) => {
            let trend = '<span style="color:gray; opacity:0.3;">-</span>';
            if (prevStandings) {
                const oldIdx = prevStandings.findIndex(t => t.name === team.name);
                if (oldIdx !== -1) {
                    if (index < oldIdx) trend = '<i class="fas fa-caret-up" style="color:#00ff88;"></i>';
                    else if (index > oldIdx) trend = '<i class="fas fa-caret-down" style="color:#ff4d4d;"></i>';
                }
            }

            const delay = maxMJ - team.mj;
            const delayHtml = delay > 0 ? `<span style="color:#ffae00; font-size:0.7rem; font-weight:800;"> (-${delay})</span>` : "";

            return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 5px;">
                        <span style="width: 15px; display: flex; justify-content: center;">${trend}</span>
                        <b style="min-width: 20px;">${index+1}</b>
                    </div>
                </td>
                <td>
                    <div class="team-cell">
                        <img src="${team.crest}" class="team-crest" onerror="this.style.display='none'">
                        <a href="club.html?name=${encodeURIComponent(team.name)}" 
                           class="team-name" 
                           title="${team.name}" 
                           style="text-decoration: none; color: inherit;">
                           ${team.name} ${delayHtml}
                        </a>
                    </div>
                </td>
                <td>${team.mj}</td>
                <td>${team.v}</td>
                <td>${team.n}</td>
                <td>${team.d}</td>
                <td class="fuma-hide-mobile">${team.bp}</td>
                <td class="fuma-hide-mobile">${team.bc}</td>
                <td>${team.bp - team.bc}</td>
                <td style="color:var(--fuma-primary); font-weight:800;">${team.pts}</td>
            </tr>`;
        }).join('');
    }

    function renderMatches(data) {
        const container = document.getElementById('fixtures-list');
        if (!container) return;

        const sSel = document.getElementById('season-master-select').value;
        const dSel = document.getElementById('division-master-select').value;
        const currentGid = LEAGUE_CONFIG[sSel][dSel].fixtures;

        container.innerHTML = data.map(row => {
            if(!row[col.h]) return '';
            const scoreHome = (row[col.sh] !== "" && !isNaN(row[col.sh])) ? row[col.sh] : "-";
            const scoreAway = (row[col.sa] !== "" && !isNaN(row[col.sa])) ? row[col.sa] : "-";
            const played = scoreHome !== "-";
            const detailsUrl = `info-match.html?gid=${currentGid}&home=${encodeURIComponent(row[col.h])}&away=${encodeURIComponent(row[col.a])}`;

            return `
            <a href="${detailsUrl}" class="match-card" style="opacity: ${played ? '1' : '0.7'}">
                <div class="match-teams-container">
                    <div class="match-team home">
                        <img src="${row[col.lh]}" style="width:28px; height:28px; object-fit:contain;">
                        <span>${row[col.h]}</span>
                        <span class="mobile-score">${scoreHome}</span>
                    </div>
                    <div class="match-score-box">${scoreHome} : ${scoreAway}</div>
                    <div class="match-team away">
                        <img src="${row[col.la]}" style="width:28px; height:28px; object-fit:contain;">
                        <span>${row[col.a]}</span>
                        <span class="mobile-score">${scoreAway}</span>
                    </div>
                </div>
            </a>`;
        }).join('');
    }

    function parseCSVLine(l) {
        let v=[], c="", q=false;
        for (let char of l) {
            if (char==='"') q=!q;
            else if (char===',' && !q) { v.push(c.trim()); c=""; }
            else c+=char;
        }
        v.push(c.trim()); return v;
    }

    init();
});
