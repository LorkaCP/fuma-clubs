/**
 * info-match-logic.js - Version corrigée basée sur tes CSV réels
 */
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('gid');
    const homeName = params.get('home');
    const awayName = params.get('away');

    if (!gid || !homeName || !awayName) return;

    // URL Fixtures
    const FINAL_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=${gid}`;

    fetch(FINAL_URL)
        .then(res => res.text())
        .then(csv => {
            const rows = parseCSV(csv);
            // Recherche du match : Home (Col 6), Away (Col 7)
            const match = rows.find(r => r[6] === homeName && r[7] === awayName);

            if (document.getElementById('loader-container')) 
                document.getElementById('loader-container').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';

            if (match) {
                console.log("Match trouvé ID:", match[8]);
                updateUI(match);
            }
        });
});

async function updateUI(m) {
    const scoreHome = m[9];
    // Un match est joué si le score n'est pas #REF! et pas vide
    const isPlayed = scoreHome !== "" && scoreHome !== "#REF!" && scoreHome !== undefined;

    const upcomingSection = document.getElementById('upcoming-section');
    const playedContent = document.getElementById('played-content');
    const matchNav = document.getElementById('match-nav');

    // Logos et Noms
    document.getElementById('name-home').innerText = m[6];
    document.getElementById('name-away').innerText = m[7];
    document.getElementById('logo-home').src = m[3] || '';
    document.getElementById('logo-away').src = m[4] || '';

    if (!isPlayed) {
        upcomingSection.style.display = 'block';
        playedContent.style.display = 'none';
        if(matchNav) matchNav.style.display = 'none';
        
        document.getElementById('score-home').innerText = "-";
        document.getElementById('score-away').innerText = "-";
    } else {
        upcomingSection.style.display = 'none';
        playedContent.style.display = 'block';
        if(matchNav) matchNav.style.display = 'flex';

        // Score
        document.getElementById('score-home').innerText = m[9];
        document.getElementById('score-away').innerText = m[10];

        // Barres de Stats (On s'assure de nettoyer les % et les virgules)
        updateBar('possession', m[13], m[14], true);
        updateBar('shots', m[15], m[16], false);
        
        // Passes : Col 17/18 (Total) et 19/20 (%)
        updateBar('passes', m[19], m[20], true, true); 
        document.getElementById('val-passes-home').innerText = `${m[17]} (${m[19]}%)`;
        document.getElementById('val-passes-away').innerText = `${m[18]} (${m[20]}%)`;

        // Tacles : Col 23/24 (Réussis) et 21/22 (Tentés)
        updateBar('tackles', m[23], m[24], false, true);
        document.getElementById('val-tackles-home').innerText = `${m[23]}/${m[21]}`;
        document.getElementById('val-tackles-away').innerText = `${m[24]}/${m[22]}`;

        // Joueurs (Liaison via IDMatch m[8])
        loadPlayerStats(m[8], m[6], m[7]);
    }
}

async function loadPlayerStats(matchId, homeName, awayName) {
    // URL DATABASE (Gid 420142588 d'après tes fichiers)
    const DB_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=420142588&single=true&output=csv";
    
    try {
        const res = await fetch(DB_URL);
        const csv = await res.text();
        const allPlayers = parseCSV(csv);

        // Filtrage : IDMatch est en colonne 5 (index 5) dans DATABASE
        const matchPlayers = allPlayers.filter(p => p[5] === matchId && (p[3] === homeName || p[3] === awayName));

        let hHtml = '', aHtml = '';
        matchPlayers.forEach(p => {
            // Index DATABASE : Tag(1), Note(6), But(7), %Passes(12), %Tacles(15)
            const row = `
                <div class="player-row">
                    <div style="font-weight:600;">${p[1]}</div>
                    <div class="p-note" style="background:${getNoteColor(p[6])}">${p[6]}</div>
                    <div style="text-align:center">${p[7] > 0 ? p[7]+'⚽' : '-'}</div>
                    <div style="text-align:center">${p[12]}%</div>
                    <div style="text-align:center">${p[15]}%</div>
                </div>`;
            if (p[3] === homeName) hHtml += row; else aHtml += row;
        });

        document.getElementById('list-players-home').innerHTML = hHtml || "Aucun joueur enregistré";
        document.getElementById('list-players-away').innerHTML = aHtml || "Aucun joueur enregistré";
        
        // Titres des sections joueurs
        if(document.getElementById('title-home')) document.getElementById('title-home').innerText = homeName;
        if(document.getElementById('title-away')) document.getElementById('title-away').innerText = awayName;

    } catch(e) { console.error("Erreur chargement joueurs:", e); }
}

function updateBar(id, valH, valA, isPercent, textOnlyCustom = false) {
    const h = parseFloat(String(valH).replace(',', '.')) || 0;
    const a = parseFloat(String(valA).replace(',', '.')) || 0;
    const total = h + a;
    const percH = total === 0 ? 50 : (h / total) * 100;

    const bH = document.getElementById(`bar-${id}-home`);
    const bA = document.getElementById(`bar-${id}-away`);
    if(bH) bH.style.width = percH + '%';
    if(bA) bA.style.width = (100 - percH) + '%';
    
    if(!textOnlyCustom) {
        const lH = document.getElementById(`val-${id}-home`);
        const lA = document.getElementById(`val-${id}-away`);
        if(lH) lH.innerText = isPercent ? Math.round(h) + '%' : h;
        if(lA) lA.innerText = isPercent ? Math.round(a) + '%' : a;
    }
}

function getNoteColor(n) {
    const v = parseFloat(n);
    if (v >= 8) return '#11a85d';
    if (v >= 7) return '#91ba33';
    if (v >= 6) return '#e2b01b';
    return '#f85757';
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

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    const btn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if(btn) btn.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}
