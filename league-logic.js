/**
 * FUMA CLUBS - LEAGUE LOGIC SYSTEM
 * Calcul du classement + Gestion automatique des Matchdays par dates
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

    let currentMatchesData = []; 
    let col = {}; // Index des colonnes

    // --- 2. INITIALISATION ---
    function init() {
        const sSel = document.getElementById('season-master-select');
        const dSel = document.getElementById('division-master-select');
        
        // Création dynamique du sélecteur de Matchday s'il n'existe pas
        if (!document.getElementById('matchday-select')) {
            const container = document.querySelector('.division-filter-container');
            const mSel = document.createElement('select');
            mSel.id = 'matchday-select';
            mSel.className = 'division-selector';
            mSel.style.marginLeft = "10px";
            container.appendChild(mSel);
            mSel.addEventListener('change', filterMatchesByDay);
        }

        // Remplissage Saisons
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

    // --- 3. RÉCUPÉRATION ET TRAITEMENT ---
    async function fetchAndProcess(gid) {
        const fixturesList = document.getElementById('fixtures-list');
        fixturesList.innerHTML = '<div class="fuma-spinner" style="margin:20px auto;"></div>';

        try {
            const resp = await fetch(`${BASE_CSV_URL}${gid}`);
            const text = await resp.text();
            const rows = text.split('\n').map(parseCSVLine);
            const headers = rows[0].map(h => h.trim());
            currentMatchesData = rows.slice(1);

            // Mapping précis des colonnes
            col = {
                day: headers.indexOf('MatchdayStart'),    // Col A
                start: headers.indexOf('DateEndDate'),    // Col B
                end: headers.indexOf('CrestHome'),        // Col C (Selon ton fichier)
                h: headers.indexOf('TeamHome'),
                a: headers.indexOf('TeamAway'),
                sh: headers.indexOf('ScoreHome'),
                sa: headers.indexOf('ScoreAway'),
                lh: headers.indexOf('CrestHome'),         // Attention: vérifie si CrestHome est utilisé deux fois dans tes headers
                la: headers.indexOf('CrestAway')
            };

            initMatchdaySelect();
            calculateStandings(currentMatchesData, col);

        } catch (e) {
            console.error("Erreur de chargement:", e);
            fixturesList.innerHTML = "<p style='text-align:center; color:red;'>Erreur de liaison Google Sheets.</p>";
        }
    }

    // --- 4. GESTION DES JOURNÉES (MATCHDAYS) ---
    function initMatchdaySelect() {
        const mSel = document.getElementById('matchday-select');
        const days = [...new Set(currentMatchesData.map(r => r[col.day]))].filter(d => d && d.trim() !== "");
        
        mSel.innerHTML = days.map(d => `<option value="${d}">Journée ${d}</option>`).join('');

        // AUTO-SÉLECTION PAR DATE
        const now = new Date();
        let autoDay = days[0];

        for (let row of currentMatchesData) {
            if (!row[col.start] || !row[col.end]) continue;
            
            const startDate = new Date(row[col.start]);
            const endDate = new Date(row[col.end]);
            
            // Si aujourd'hui est entre Start et End
            if (now >= startDate && now <= endDate) {
                autoDay = row[col.day];
                break;
            }
        }

        mSel.value = autoDay;
        filterMatchesByDay();
    }

    function filterMatchesByDay() {
        const selectedDay = document.getElementById('matchday-select').value;
        const filtered = currentMatchesData.filter(r => r[col.day] === selectedDay);
        renderMatches(filtered);
    }

    // --- 5. AFFICHAGE ---
    function renderMatches(data) {
        const container = document.getElementById('fixtures-list');
        container.innerHTML = data.map(row => {
            if(!row[col.h]) return '';
            const scoreH = row[col.sh] || '-';
            const scoreA = row[col.sa] || '-';
            return `
            <div class="match-card">
                <div class="match-team" style="justify-content:flex-end; text-align:right;">
                    ${row[col.h]} <img src="${row[col.lh]}" style="width:25px; height:25px; object-fit:contain;">
                </div>
                <div class="match-score">${scoreH} : ${scoreA}</div>
                <div class="match-team">
                    <img src="${row[col.la]}" style="width:25px; height:25px; object-fit:contain;"> ${row[col.a]}
                </div>
            </div>`;
        }).join('');
    }

    function calculateStandings(data, c) {
        const stats = {};
        data.forEach(row => {
            const h = row[c.h], a = row[c.a];
            const sh = parseInt(row[c.sh]), sa = parseInt(row[c.sa]);

            if (h && a) {
                [h, a].forEach(t => { if (!stats[t]) stats[t] = { name: t, mj:0, v:0, n:0, d:0, bp:0, bc:0, pts:0 }; });
                
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

        const sorted = Object.values(stats).sort((a,b) => b.pts - a.pts || (b.bp-b.bc) - (a.bp-a.bc) || b.bp - a.bp);
        
        const tbody = document.getElementById('league-table-body');
        if (tbody) {
            tbody.innerHTML = sorted.map((t, i) => `
                <tr class="${i < 2 ? 'pos-up' : (i >= sorted.length - 2 ? 'pos-down' : '')}">
                    <td>${i+1}</td>
                    <td style="color:var(--fuma-primary); font-weight:800;">${t.name}</td>
                    <td>${t.mj}</td><td>${t.v}</td><td>${t.n}</td><td>${t.d}</td>
                    <td>${t.bp - t.bc}</td><td style="color:white; font-weight:800;">${t.pts}</td>
                </tr>`).join('');
        }
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
