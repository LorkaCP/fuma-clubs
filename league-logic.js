/**
 * FUMA CLUBS - LEAGUE LOGIC SYSTEM
 * Gestion automatique des Matchdays par dates et calcul du classement
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

    let currentMatchesData = []; // Stockage global pour filtrer sans re-fetcher
    let columnIdx = {};

    // --- 2. INITIALISATION ---
    function init() {
        const sSel = document.getElementById('season-master-select');
        const dSel = document.getElementById('division-master-select');
        
        // On crée dynamiquement le sélecteur de Matchday s'il n'existe pas dans le HTML
        if (!document.getElementById('matchday-select')) {
            const container = document.querySelector('.division-filter-container');
            const mSel = document.createElement('select');
            mSel.id = 'matchday-select';
            mSel.className = 'division-selector';
            container.appendChild(mSel);
            mSel.addEventListener('change', filterMatchesByDay);
        }

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
        
        await fetchAndProcess(gid);
    }

    // --- 3. RÉCUPÉRATION ET TRAITEMENT ---
    async function fetchAndProcess(gid) {
        const fixturesContainer = document.getElementById('fixtures-list');
        fixturesContainer.innerHTML = '<div class="fuma-spinner" style="margin:20px auto;"></div>';

        try {
            const resp = await fetch(`${BASE_CSV_URL}${gid}`);
            const text = await resp.text();
            const rows = text.split('\n').map(parseCSVLine);
            const headers = rows[0];
            currentMatchesData = rows.slice(1);

            columnIdx = {
                day: headers.indexOf('MatchdayStart'),
                start: headers.indexOf('DateEndDate'), // Selon ta description Col B
                end: headers.indexOf('CrestHome'),     // Selon ta description Col C
                h: headers.indexOf('TeamHome'),
                a: headers.indexOf('TeamAway'),
                sh: headers.indexOf('ScoreHome'),
                sa: headers.indexOf('ScoreAway'),
                lh: headers.indexOf('CrestHome'),
                la: headers.indexOf('CrestAway')
            };

            // 1. Initialiser le menu déroulant des Matchdays
            initMatchdaySelect();
            
            // 2. Calculer le classement (toujours sur la totalité des données)
            calculateStandings(currentMatchesData, columnIdx);

        } catch (e) {
            console.error(e);
            fixturesContainer.innerHTML = "<p>Erreur de chargement.</p>";
        }
    }

    // --- 4. GESTION DES JOURNÉES (MATCHDAYS) ---
    function initMatchdaySelect() {
        const mSel = document.getElementById('matchday-select');
        const days = [...new Set(currentMatchesData.map(r => r[columnIdx.day]))].filter(d => d);
        
        mSel.innerHTML = days.map(d => `<option value="${d}">Journée ${d}</option>`).join('');

        // LOGIQUE AUTO-SÉLECTION : Trouver la journée en fonction de la date actuelle
        const now = new Date();
        let autoDay = days[0];

        for (let row of currentMatchesData) {
            const startDate = new Date(row[columnIdx.start]);
            const endDate = new Date(row[columnIdx.end]);
            
            if (now >= startDate && now <= endDate) {
                autoDay = row[columnIdx.day];
                break;
            }
        }

        mSel.value = autoDay;
        filterMatchesByDay(); // Afficher les matchs de cette journée
    }

    function filterMatchesByDay() {
        const selectedDay = document.getElementById('matchday-select').value;
        const filtered = currentMatchesData.filter(r => r[columnIdx.day] === selectedDay);
        renderMatches(filtered);
    }

    // --- 5. AFFICHAGE DES MATCHS ---
    function renderMatches(data) {
        const container = document.getElementById('fixtures-list');
        container.innerHTML = data.map(row => {
            if(!row[columnIdx.h]) return '';
            return `
            <div class="match-card">
                <div class="match-team" style="justify-content:flex-end; text-align:right;">
                    ${row[columnIdx.h]} <img src="${row[columnIdx.lh]}" style="width:25px;">
                </div>
                <div class="match-score">${row[columnIdx.sh] || '-'} : ${row[columnIdx.sa] || '-'}</div>
                <div class="match-team">
                    <img src="${row[columnIdx.la]}" style="width:25px;"> ${row[columnIdx.a]}
                </div>
            </div>`;
        }).join('');
    }

    // --- 6. CALCUL DU CLASSEMENT (Identique au précédent) ---
    function calculateStandings(data, col) {
        const stats = {};
        data.forEach(row => {
            const home = row[col.h], away = row[col.a];
            const sh = parseInt(row[col.sh]), sa = parseInt(row[col.sa]);
            if (home && away) {
                [home, away].forEach(t => { if (!stats[t]) stats[t] = { name: t, mj:0, v:0, n:0, d:0, bp:0, bc:0, pts:0 }; });
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
        const sorted = Object.values(stats).sort((a,b) => b.pts - a.pts || (b.bp-b.bc) - (a.bp-a.bc));
        document.getElementById('league-table-body').innerHTML = sorted.map((t, i) => `
            <tr class="${i < 2 ? 'pos-up' : (i >= sorted.length-2 ? 'pos-down' : '')}">
                <td>${i+1}</td>
                <td style="color:var(--fuma-primary); font-weight:800;">${t.name}</td>
                <td>${t.mj}</td><td>${t.v}</td><td>${t.n}</td><td>${t.d}</td>
                <td>${t.bp - t.bc}</td><td style="font-weight:800; color:white;">${t.pts}</td>
            </tr>`).join('');
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
