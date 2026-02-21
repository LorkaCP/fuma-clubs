/**
 * FUMA CLUBS - LEAGUE LOGIC SYSTEM
 * Version stabilisée avec design sobre intégré
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
        const mContainer = document.getElementById('matchday-container');

        if (!sSel || !dSel) return; // Sécurité si éléments absents

        // Nettoyage et création du select Matchday
        if (mContainer) {
            mContainer.innerHTML = '<label>Journée</label>'; // Garde le label
            const mSel = document.createElement('select');
            mSel.id = 'matchday-select';
            mSel.className = 'fuma-search-input'; 
            mContainer.appendChild(mSel);
            mSel.addEventListener('change', filterMatchesByDay);
        }

        const seasons = Object.keys(LEAGUE_CONFIG);
        sSel.innerHTML = seasons.map(s => `<option value="${s}">Saison ${s.replace('S','')}</option>`).join('');
        
        const updateDivs = (s) => {
            dSel.innerHTML = Object.keys(LEAGUE_CONFIG[s]).map(d => `<option value="${d}">Division ${d.replace('D','')}</option>`).join('');
        };

        sSel.addEventListener('change', (e) => { 
            updateDivs(e.target.value); 
            loadData(); 
        });
        dSel.addEventListener('change', loadData);

        updateDivs(seasons[0]);
        loadData();
    }

    async function loadData() {
        const s = document.getElementById('season-master-select').value;
        const d = document.getElementById('division-master-select').value;
        const display = document.getElementById('current-league-display');
        
        if(display) display.innerText = `Saison ${s.replace('S','')} - Division ${d.replace('D','')}`;
        
        const gid = LEAGUE_CONFIG[s][d].fixtures;
        await fetchAndProcess(gid);
    }

    async function fetchAndProcess(gid) {
        const fixturesList = document.getElementById('fixtures-list');
        if(fixturesList) fixturesList.innerHTML = '<div class="loader-container"><div class="fuma-spinner"></div></div>';

        try {
            const resp = await fetch(`${BASE_CSV_URL}${gid}&t=${Date.now()}`); // Cache busting
            const text = await resp.text();
            const rows = text.split('\n').filter(r => r.trim() !== "").map(parseCSVLine);
            
            if (rows.length < 2) throw new Error("CSV Vide");

            const headers = rows[0].map(h => h.trim());
            currentMatchesData = rows.slice(1);

            // Mapping robuste
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
            console.error("Erreur FUMA:", e);
            if(fixturesList) fixturesList.innerHTML = "<p style='text-align:center; color:var(--fuma-text-dim);'>Erreur de chargement des données.</p>";
        }
    }

    function initMatchdaySelect() {
        const mSel = document.getElementById('matchday-select');
        if (!mSel) return;

        const days = [...new Set(currentMatchesData.map(r => r[col.day]))]
                        .filter(d => d && d.trim() !== "")
                        .sort((a, b) => parseInt(a) - parseInt(b));
        
        if (days.length === 0) return;
        mSel.innerHTML = days.map(d => `<option value="${d}">Journée ${d}</option>`).join('');

        // Détection de la journée actuelle par date
        const now = new Date();
        now.setHours(0,0,0,0);
        let autoDay = days[0];

        for (let row of currentMatchesData) {
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
        const mSel = document.getElementById('matchday-select');
        if(!mSel) return;
        
        const selectedDay = parseInt(mSel.value);
        
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
                
                if (h && a) {
                    [h, a].forEach(t => { 
                        if (!stats[t]) stats[t] = { name: t, mj:0, v:0, n:0, d:0, bp:0, bc:0, pts:0 }; 
                    });
                    
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

        const tbody = document.getElementById('league-table-body');
        if (!tbody) return;

        tbody.innerHTML = currentStandings.map((team, index) => {
            let trend = '<span style="opacity:0.2;">-</span>';
            if (prevStandings) {
                const oldIdx = prevStandings.findIndex(t => t.name === team.name);
                if (oldIdx !== -1) {
                    if (index < oldIdx) trend = '<i class="fas fa-caret-up" style="color:var(--fuma-primary);"></i>';
                    else if (index > oldIdx) trend = '<i class="fas fa-caret-down" style="color:#ff4d4d;"></i>';
                }
            }

            return `
                <tr>
                    <td style="text-align:center; font-size:0.8rem;">${trend}<br><b>${index+1}</b></td>
                    <td style="font-weight:600;">${team.name}</td>
                    <td>${team.mj}</td>
                    <td class="fuma-hide-mobile">${team.v}</td>
                    <td class="fuma-hide-mobile">${team.n}</td>
                    <td class="fuma-hide-mobile">${team.d}</td>
                    <td>${team.bp - team.bc}</td>
                    <td style="color:var(--fuma-primary); font-weight:800;">${team.pts}</td>
                </tr>`;
        }).join('');
    }

    function renderMatches(data) {
        const container = document.getElementById('fixtures-list');
        if(!container) return;
        
        container.innerHTML = data.map(row => {
            if(!row[col.h]) return '';
            const played = !isNaN(parseInt(row[col.sh]));
            return `
            <div class="match-card" style="opacity: ${played ? '1' : '0.5'}">
                <div class="match-team" style="justify-content: flex-end; text-align: right; gap:10px;">
                    <span class="fuma-hide-mobile">${row[col.h]}</span>
                    <img src="${row[col.lh]}" style="width:30px; height:30px; object-fit:contain;">
                </div>
                <div class="match-score">
                    ${row[col.sh] !== "" ? row[col.sh] : '-'} : ${row[col.sa] !== "" ? row[col.sa] : '-'}
                </div>
                <div class="match-team" style="gap:10px;">
                    <img src="${row[col.la]}" style="width:30px; height:30px; object-fit:contain;">
                    <span class="fuma-hide-mobile">${row[col.a]}</span>
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
