/**
 * FUMA CLUBS - LEAGUE LOGIC SYSTEM
 * Version optimisée : Mobile-friendly & Logo Support
 */

document.addEventListener('DOMContentLoaded', () => {

    const LEAGUE_CONFIG = {
        "S1": {
            "D1": { fixtures: "414200945" },
            "D2": { fixtures: "2124517897" }
        },
        "S2": {
            "D1": { fixtures: "2013965123" }
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
            dSel.innerHTML = Object.keys(LEAGUE_CONFIG[s]).map(d => `<option value="${d}">Division ${d.replace('D','')}</option>`).join('');
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
        
        await fetchAndProcess(gid);
    }

    async function fetchAndProcess(gid) {
        const fixturesList = document.getElementById('fixtures-list');
        fixturesList.innerHTML = '<div class="fuma-spinner"></div>';

        try {
            const resp = await fetch(`${BASE_CSV_URL}${gid}`);
            const text = await resp.text();
            const rows = text.split('\n').filter(r => r.trim() !== "").map(parseCSVLine);
            const headers = rows[0].map(h => h.trim());
            currentMatchesData = rows.slice(1);

            // Mapping dynamique des colonnes
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
                    // Initialisation avec sauvegarde du logo
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
                    <td style="text-align:center;">${trend}<br><b>${index+1}</b></td>
                    <td>
                        <div class="team-cell">
                            <img src="${team.crest}" class="team-crest" onerror="this.style.display='none'">
                            <span class="team-name" title="${team.name}">${team.name}</span>
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
        container.innerHTML = data.map(row => {
            if(!row[col.h]) return '';
            const played = !isNaN(parseInt(row[col.sh]));
            return `
            <div class="match-card" style="opacity: ${played ? '1' : '0.6'}">
                <div class="match-team" style="justify-content:flex-end; text-align:right;">
                    ${row[col.h]} <img src="${row[col.lh]}" style="width:25px; height:25px; object-fit:contain; margin-left:10px;">
                </div>
                <div class="match-score" style="min-width:80px; text-align:center; font-weight:800; color:var(--fuma-primary);">
                    ${row[col.sh] || '-'} : ${row[col.sa] || '-'}
                </div>
                <div class="match-team">
                    <img src="${row[col.la]}" style="width:25px; height:25px; object-fit:contain; margin-right:10px;"> ${row[col.a]}
                </div>
            </div>`;
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
