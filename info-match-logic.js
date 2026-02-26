document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('gid');
    const homeName = params.get('home');
    const awayName = params.get('away');

    if (!gid || !homeName || !awayName) {
        console.error("Paramètres manquants dans l'URL");
        return;
    }

    const BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=";
    const FINAL_URL = BASE_URL + gid;

    fetch(FINAL_URL)
        .then(response => response.text())
        .then(csvText => {
            const rows = parseCSV(csvText);
            // On cherche le match (Home=Col 6, Away=Col 7)
            const match = rows.find(r => r[6] === homeName && r[7] === awayName);

            const loader = document.getElementById('loader-container');
            const mainContent = document.getElementById('main-content');
            
            if (loader) loader.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';

            if (match) {
                console.log("Match trouvé:", match);
                updateUI(match);
            } else {
                console.error("Match non trouvé dans le CSV");
            }
        })
        .catch(err => console.error("Erreur Fetch:", err));
});

const PLAYERS_DB_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=420142588&single=true&output=csv";

async function updateUI(m) {
    // 1. Détection de l'état (m[9] est le Score Domicile)
    const isPlayed = m[9] !== "#REF!" && m[9] !== "" && m[9] !== null && m[9] !== "ScoreHome";

    const upcomingSection = document.getElementById('upcoming-section');
    const playedContent = document.getElementById('played-content');
    const matchNav = document.getElementById('match-nav');

    // Noms et Logos
    document.getElementById('name-home').innerText = m[6];
    document.getElementById('name-away').innerText = m[7];
    document.getElementById('logo-home').src = m[3] || '';
    document.getElementById('logo-away').src = m[4] || '';

    if (!isPlayed) {
        // MODE NON JOUÉ
        upcomingSection.style.display = 'block';
        playedContent.style.display = 'none';
        matchNav.style.display = 'none';
        
        document.getElementById('score-home').innerText = "-";
        document.getElementById('score-away').innerText = "-";

        const params = new URLSearchParams(window.location.search);
        document.getElementById('btn-report-link').href = `report.html?home=${encodeURIComponent(m[6])}&away=${encodeURIComponent(m[7])}&gid=${params.get('gid')}`;
    } else {
        // MODE JOUÉ
        upcomingSection.style.display = 'none';
        playedContent.style.display = 'block';
        matchNav.style.display = 'flex';

        // Score et Buteurs
        document.getElementById('score-home').innerText = m[9];
        document.getElementById('score-away').innerText = m[10];
        
        const strH = document.getElementById('strikers-home');
        const strA = document.getElementById('strikers-away');
        const strCont = document.getElementById('strikers-container');
        if(strH && strA) {
            strH.innerHTML = formatStrikers(m[11]);
            strA.innerHTML = formatStrikers(m[12]);
            strCont.style.display = 'grid';
        }

        // Stats Équipe (Barres)
        updateBar('possession', m[13], m[14], true);
        updateBar('shots', m[15], m[16], false);
        
        // Stats Passes
        updateBar('passes', m[19], m[20], true);
        const pLHome = document.getElementById('val-passes-home');
        const pLAway = document.getElementById('val-passes-away');
        if(pLHome) pLHome.innerText = `${m[17]} (${m[19]}%)`;
        if(pLAway) pLAway.innerText = `${m[18]} (${m[20]}%)`;

        // Stats Tacles
        updateBar('tackles', m[23], m[24], false);
        const tLHome = document.getElementById('val-tackles-home');
        const tLAway = document.getElementById('val-tackles-away');
        if(tLHome) tLHome.innerText = `${m[23]}/${m[21]}`;
        if(tLAway) tLAway.innerText = `${m[24]}/${m[22]}`;

        // MOTM
        if (m[27] && m[27] !== '0' && m[27] !== '#REF!') {
            document.getElementById('motm-container').innerHTML = `
                <div style="margin-top:10px; color:var(--fuma-primary); font-size:0.8rem; font-weight:800;">
                    <i class="fas fa-star"></i> MOTM: ${m[27]}
                </div>`;
        }

        // Joueurs
        document.getElementById('title-home').innerText = m[6];
        document.getElementById('title-away').innerText = m[7];
        loadPlayerStats(m[8]); // IDMatch
    }
}

async function loadPlayerStats(matchId) {
    try {
        const response = await fetch(PLAYERS_DB_URL);
        const csvText = await response.text();
        const players = parseCSV(csvText);
        
        // Filtrer par MatchID (colonne 5 de DATABASE)
        const matchPlayers = players.filter(p => p[5] === matchId);
        matchPlayers.sort((a, b) => parseFloat(b[6]) - parseFloat(a[6]));

        const homeName = document.getElementById('name-home').innerText;
        let hHtml = '', aHtml = '';

        matchPlayers.forEach(p => {
            const row = `
                <div class="player-row">
                    <div style="font-weight:600; overflow:hidden; text-overflow:ellipsis;">${p[1]}</div>
                    <div class="p-note" style="background:${getNoteColor(p[6])}">${p[6]}</div>
                    <div style="text-align:center">${p[7] > 0 ? p[7]+'⚽' : '-'}</div>
                    <div style="text-align:center">${p[12]}%</div>
                    <div style="text-align:center">${p[15]}%</div>
                </div>`;
            if (p[3] === homeName) hHtml += row; else aHtml += row;
        });

        document.getElementById('list-players-home').innerHTML = hHtml || "Données indisponibles";
        document.getElementById('list-players-away').innerHTML = aHtml || "Données indisponibles";
    } catch (e) { console.error(e); }
}

function updateBar(id, valH, valA, isPercent) {
    const h = parseFloat(String(valH).replace(',', '.')) || 0;
    const a = parseFloat(String(valA).replace(',', '.')) || 0;
    const total = h + a;
    const percH = total === 0 ? 50 : (h / total) * 100;

    const bH = document.getElementById(`bar-${id}-home`);
    const bA = document.getElementById(`bar-${id}-away`);
    if(bH) bH.style.width = percH + '%';
    if(bA) bA.style.width = (100 - percH) + '%';
    
    if (id === 'possession' || id === 'shots') {
        const lH = document.getElementById(`val-${id}-home`);
        const lA = document.getElementById(`val-${id}-away`);
        if(lH) lH.innerText = isPercent ? Math.round(h) + '%' : h;
        if(lA) lA.innerText = isPercent ? Math.round(a) + '%' : a;
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    const btn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if(btn) btn.classList.add('active');
    
    const content = document.getElementById(tabId);
    if(content) content.classList.add('active');
}

function getNoteColor(n) {
    const v = parseFloat(n);
    if (v >= 8) return '#11a85d';
    if (v >= 7) return '#91ba33';
    if (v >= 6) return '#e2b01b';
    return '#f85757';
}

function formatStrikers(s) {
    if (!s || s === '0' || s === '#REF!') return '';
    return s.split('|').map(x => `<div>${x.trim()} <i class="fas fa-futbol" style="font-size:0.6rem; opacity:0.5;"></i></div>`).join('');
}

function parseCSV(t) {
    return t.split('\n').map(l => {
        let res = [], cur = '', q = false;
        for (let c of l) {
            if (c === '"') q = !q;
            else if (c === ',' && !q) { res.push(cur.trim()); cur = ''; }
            else cur += c;
        }
        res.push(cur.trim());
        return res;
    });
}
