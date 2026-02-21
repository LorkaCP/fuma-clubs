/**
 * FUMA CLUBS - LEAGUE LOGIC SYSTEM
 * Calcul automatique du classement à partir des Fixtures
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURATION ---
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

    // --- 2. INITIALISATION DES SÉLECTEURS ---
    function init() {
        const sSel = document.getElementById('season-master-select');
        const dSel = document.getElementById('division-master-select');
        if (!sSel || !dSel) return;

        sSel.innerHTML = Object.keys(LEAGUE_CONFIG).map(s => `<option value="${s}">Saison ${s.replace('S','')}</option>`).join('');
        
        const updateDivs = (s) => {
            dSel.innerHTML = Object.keys(LEAGUE_CONFIG[s]).map(d => `<option value="${d}">Division ${d.replace('D','')}</option>`).join('');
        };

        sSel.addEventListener('change', (e) => { updateDivs(e.target.value); loadData(); });
        dSel.addEventListener('change', loadData);

        updateDivs(Object.keys(LEAGUE_CONFIG)[0]);
        loadData();
    }

    async function loadData() {
        const s = document.getElementById('season-master-select').value;
        const d = document.getElementById('division-master-select').value;
        const gid = LEAGUE_CONFIG[s][d].fixtures;

        document.getElementById('current-league-display').innerText = `Saison ${s.replace('S','')} - Division ${d.replace('D','')}`;
        
        fetchAndProcess(gid);
    }

    // --- 3. RÉCUPÉRATION ET TRAITEMENT ---
    async function fetchAndProcess(gid) {
        const fixturesContainer = document.getElementById('fixtures-list');
        const tableBody = document.getElementById('league-table-body');
        
        fixturesContainer.innerHTML = tableBody.innerHTML = '<div class="fuma-spinner" style="margin:20px auto;"></div>';

        try {
            const resp = await fetch(`${BASE_CSV_URL}${gid}`);
            const text = await resp.text();
            const rows = text.split('\n').map(parseCSVLine);
            const headers = rows[0];
            const data = rows.slice(1);

            const col = {
                day: headers.indexOf('MatchdayStart'),
                h: headers.indexOf('TeamHome'),
                a: headers.indexOf('TeamAway'),
                sh: headers.indexOf('ScoreHome'),
                sa: headers.indexOf('ScoreAway'),
                lh: headers.indexOf('CrestHome'),
                la: headers.indexOf('CrestAway')
            };

            // 1. Afficher les matchs
            renderMatches(data, col);
            
            // 2. Calculer et afficher le classement
            calculateStandings(data, col);

        } catch (e) {
            console.error(e);
        }
    }

    // --- 4. LOGIQUE DE CALCUL DU CLASSEMENT ---
    function calculateStandings(data, col) {
        const stats = {};

        data.forEach(row => {
            const home = row[col.h], away = row[col.a];
            const sh = parseInt(row[col.sh]), sa = parseInt(row[col.sa]);

            if (home && away) {
                [home, away].forEach(t => {
                    if (!stats[t]) stats[t] = { name: t, mj:0, v:0, n:0, d:0, bp:0, bc:0, pts:0 };
                });

                if (!isNaN(sh) && !isNaN(sa)) {
                    stats[home].mj++; stats[away].mj++;
                    stats[home].bp += sh; stats[home].bc += sa;
                    stats[away].bp += sa; stats[away].bc += sh;

                    if (sh > sa) { stats[home].v++; stats[home].pts += 3; stats[away].d++; }
                    else if (sh < sa) { stats[away].v++; stats[away].pts += 3; stats[home].d++; }
                    else { stats[home].n++; stats[away].n++; stats[home].pts += 1; stats[away].pts += 1; }
                }
            }
        });

        const sorted = Object.values(stats).sort((a,b) => b.pts - a.pts || (b.bp-b.bc) - (a.bp-a.bc) || b.bp - a.bp);
        
        document.getElementById('league-table-body').innerHTML = sorted.map((t, i) => `
            <tr class="${i < 2 ? 'pos-up' : (i >= sorted.length-2 ? 'pos-down' : '')}">
                <td>${i+1}</td>
                <td style="color:var(--fuma-primary); font-weight:800;">${t.name}</td>
                <td>${t.mj}</td><td>${t.v}</td><td>${t.n}</td><td>${t.d}</td>
                <td>${t.bp - t.bc}</td><td style="color:white; font-weight:800;">${t.pts}</td>
            </tr>
        `).join('');
    }

    function renderMatches(data, col) {
        document.getElementById('fixtures-list').innerHTML = data.map(row => {
            if(!row[col.h]) return '';
            return `
            <div class="match-card">
                <div class="match-team" style="justify-content:flex-end;">${row[col.h]} <img src="${row[col.lh]}" style="width:25px;"></div>
                <div class="match-score">${row[col.sh] || '-'} : ${row[col.sa] || '-'}</div>
                <div class="match-team"><img src="${row[col.la]}" style="width:25px;"> ${row[col.a]}</div>
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
