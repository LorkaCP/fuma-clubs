/**
 * FUMA CLUBS - LEAGUE LOGIC SYSTEM
 * Classement historique, Tendances et Indice de retard (Matchs en moins)
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
            mSel.className = 'division-selector';
            mSel.style.marginLeft = "10px";
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

        const display = document.getElementById('current-league-display');
        if(display) display.innerText = `Saison ${s.replace('S','')} - Division ${d.replace('D','')}`;
        
        await fetchAndProcess(gid);
    }

    async function fetchAndProcess(gid) {
        const fixturesList = document.getElementById('fixtures-list');
        fixturesList.innerHTML = '<div class="fuma-spinner" style="margin:20px auto;"></div>';

        try {
            const resp = await fetch(`${BASE_CSV_URL}${gid}`);
            const text = await resp.text();
            const rows = text.split('\n').map(parseCSVLine);
            const headers = rows[0].map(h => h.trim());
            currentMatchesData = rows.slice(1);

            col = {
                day: headers.indexOf('Matchday'),
                start: headers.indexOf('StartDate'),
                end: headers.indexOf('EndDate'),
                h: headers.indexOf('TeamHome'),
                a: headers.indexOf('TeamAway'),
                sh: headers.indexOf('ScoreHome'),
                sa: headers.indexOf('ScoreAway'),
                lh: headers.indexOf('CrestHome'),
                la: headers.indexOf('CrestAway')
            };

            initMatchdaySelect();

        } catch (e) {
            console.error("Erreur:", e);
            fixturesList.innerHTML = "<p>Erreur de chargement.</p>";
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
            const startDate = new Date(row[col.start]);
            const endDate = new Date(row[col.end]);
            if (now >= startDate && now <= endDate) {
                autoDay = row[col.day];
                break;
            }
        }

        mSel.value = autoDay;
        filterMatchesByDay();
    }

    function filterMatchesByDay() {
        const selectedDay = parseInt(document.getElementById('matchday-select').value);
        
        // 1. Calendrier
        const matchesToDisplay = currentMatchesData.filter(r => parseInt(r[col.day]) === selectedDay);
        renderMatches(matchesToDisplay);

        // 2. Classement Actuel
        const currentStandings = calculateStandingsData(currentMatchesData.filter(r => parseInt(r[col.day]) <= selectedDay));
        
        // 3. Classement Précédent (pour tendance)
        const previousStandings = (selectedDay > 1) 
            ? calculateStandingsData(currentMatchesData.filter(r => parseInt(r[col.day]) <= (selectedDay - 1)))
            : null;

        renderStandingsTable(currentStandings, previousStandings);
    }

    function calculateStandingsData(matches) {
        const stats = {};
        matches.forEach(row => {
            const h = row[col.h], a = row[col.a];
            const sh = parseInt(row[col.sh]), sa = parseInt(row[col.sa]);
            if (h && a) {
                [h, a].forEach(t => { if (!stats[t]) stats[t] = { name: t, mj:0, v:0, n:0, d:0, bp:0, bc:0, pts:0 }; });
                if (!isNaN(sh) && !isNaN(sa)) {
                    stats[h].mj++; stats[a].mj++;
                    stats[h].bp += sh; stats[h].bc += sa;
                    stats[away] ? null : null; // Safety check
                    stats[h].bp += sh; // BP
                    if (sh > sa) { stats[h].v++; stats[h].pts += 3; stats[a].d++; }
                    else if (sh < sa) { stats[a].v++; stats[a].pts += 3; stats[h].d++; }
                    else { stats[h].n++; stats[a].n++; stats[h].pts += 1; stats[a].pts += 1; }
                }
            }
        });
        return Object.values(stats).sort((a,b) => b.pts - a.pts || (b.bp-b.bc) - (a.bp-a.bc) || b.bp - a.bp);
    }

    function renderStandingsTable(current, previous) {
        const tbody = document.getElementById('league-table-body');
        if (!tbody) return;

        // On trouve le nombre max de matchs joués pour l'indice de retard
        const maxMJ = Math.max(...current.map(t => t.mj));

        tbody.innerHTML = current.map((team, index) => {
            // Logique Tendance
            let trendHtml = '<span style="color:gray; opacity:0.3; font-size:0.7rem;">-</span>';
            if (previous) {
                const oldPos = previous.findIndex(t => t.name === team.name);
                if (oldPos !== -1) {
                    if (index < oldPos) trendHtml = '<i class="fas fa-caret-up" style="color:#00ff88;"></i>';
                    else if (index > oldPos) trendHtml = '<i class="fas fa-caret-down" style="color:#ff4d4d;"></i>';
                }
            }

            // Logique Indice Retard (-1, -2...)
            let delayHtml = "";
            const delay = maxMJ - team.mj;
            if (delay > 0) {
                delayHtml = `<span style="color:#ffae00; font-size:0.7rem; margin-left:5px; font-weight:800;">(-${delay})</span>`;
            }

            return `
                <tr class="${index < 2 ? 'pos-up' : (index >= current.length - 2 ? 'pos-down' : '')}">
                    <td style="text-align:center;">
                        <div style="display:flex; flex-direction:column; align-items:center;">
                            ${trendHtml}
                            <span style="font-weight:800; font-size:1.1rem;">${index + 1}</span>
                        </div>
                    </td>
                    <td style="color:var(--fuma-primary); font-weight:800;">${team.name}</td>
                    <td>${team.mj}${delayHtml}</td>
                    <td class="fuma-hide-mobile">${team.v}</td>
                    <td class="fuma-hide-mobile">${team.n}</td>
                    <td class="fuma-hide-mobile">${team.d}</td>
                    <td>${team.bp - team.bc}</td>
                    <td style="color:white; font-weight:800; background: rgba(0,255,136,0.1);">${team.pts}</td>
                </tr>`;
        }).join('');
    }

    function renderMatches(data) {
        const container = document.getElementById('fixtures-list');
        if (data.length === 0) {
            container.innerHTML = "<p style='text-align:center; padding:20px; color:var(--fuma-text-dim);'>Aucun match.</p>";
            return;
        }
        container.innerHTML = data.map(row => {
            if(!row[col.h]) return '';
            const played = !isNaN(parseInt(row[col.sh]));
            return `
            <div class="match-card" style="opacity: ${played ? '1' : '0.6'}">
                <div class="match-team" style="justify-content:flex-end; text-align:right;">
                    ${row[col.h]} <img src="${row[col.lh]}" style="width:25px; height:25px; object-fit:contain; margin-left:10px;">
                </div>
                <div class="match-score" style="min-width:70px; text-align:center;">
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
