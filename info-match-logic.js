/**
 * FUMA CLUBS - INFO MATCH LOGIC
 * Liaison : FIXTURES (Col I / index 8) <-> DATABASE (Col F / index 5)
 */

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('gid'); 
    const homeName = params.get('home');
    const awayName = params.get('away');

    if (!gid || !homeName || !awayName) return;

    // 1. CHARGEMENT INITIAL (FEUILLE EQUIPE / FIXTURES)
    const TEAM_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=${gid}`;

    fetch(TEAM_URL)
        .then(res => res.text())
        .then(csv => {
            const rows = parseCSV(csv);
            // On cherche le match (Home index 6, Away index 7)
            const match = rows.find(r => r[6] === homeName && r[7] === awayName);

            if (document.getElementById('loader-container')) 
                document.getElementById('loader-container').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';

            if (match) {
                console.log("Match trouvé dans Fixtures ! ID (Col I):", match[8]);
                updateUI(match);
            }
        }).catch(err => console.error("Erreur Fetch Equipe:", err));
});

function updateUI(m) {
    const scoreHome = m[9];
    const isPlayed = scoreHome !== "" && scoreHome !== "#REF!" && scoreHome !== undefined;

    const upcoming = document.getElementById('upcoming-section');
    const played = document.getElementById('played-content');
    const nav = document.getElementById('match-nav');

    // Noms et Logos
    document.getElementById('name-home').innerText = m[6];
    document.getElementById('name-away').innerText = m[7];
    document.getElementById('logo-home').src = m[3] || '';
    document.getElementById('logo-away').src = m[4] || '';

    if (!isPlayed) {
        if(upcoming) upcoming.style.display = 'block';
        if(played) played.style.display = 'none';
        if(nav) nav.style.display = 'none';
    } else {
        if(upcoming) upcoming.style.display = 'none';
        if(played) played.style.display = 'block';
        if(nav) nav.style.display = 'flex';

        // Score et Buteurs
        document.getElementById('score-home').innerText = m[9];
        document.getElementById('score-away').innerText = m[10];
        document.getElementById('strikers-home').innerHTML = formatStrikers(m[11]);
        document.getElementById('strikers-away').innerHTML = formatStrikers(m[12]);

        // --- STATS RÉSUMÉ (Index basés sur FIXTURES) ---
        updateBar('possession', m[13], m[14], true);
        updateBar('shots', m[15], m[16], false);
        
        // Passes (17/18=Tentées, 19/20=%)
        const pH = document.getElementById('val-passes-home');
        const pA = document.getElementById('val-passes-away');
        if(pH) pH.innerText = `${m[17] || 0} (${m[19] || 0}%)`;
        if(pA) pA.innerText = `${m[18] || 0} (${m[20] || 0}%)`;
        updateBar('passes', m[19], m[20], true, true);

        // Tacles (21/22=Tentés, 23/24=Réussis)
        const tH = document.getElementById('val-tackles-home');
        const tA = document.getElementById('val-tackles-away');
        if(tH) tH.innerText = `${m[23] || 0}/${m[21] || 0}`;
        if(tA) tA.innerText = `${m[24] || 0}/${m[22] || 0}`;
        updateBar('tackles', m[23], m[24], false, true);

        // Liaison DATABASE via match[8] (Colonne I)
        loadPlayerStats(m[8], m[6], m[7]);
    }
}

async function loadPlayerStats(matchId, homeName, awayName) {
    // GID DATABASE JOUEURS
    const PLAYER_GID = "2074996595";
    const URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=${PLAYER_GID}`;

    try {
        const res = await fetch(URL);
        const csv = await res.text();
        const rows = parseCSV(csv);

        // Filtrer : MATCH_ID est en Colonne F (index 5)
        const players = rows.filter(p => p[5] === matchId);
        console.log("Joueurs trouvés pour l'ID " + matchId + " :", players.length);

        let hHtml = '', aHtml = '';
        players.forEach(p => {
            // Index : Tag(1), Team(3), Note(6), But(7), %Pass(12), %Tac(15)
            const row = `
                <div class="player-row">
                    <div style="font-weight:600;">${p[1]}</div>
                    <div class="p-note" style="background:${getNoteColor(p[6])}">${p[6] || '6.0'}</div>
                    <div style="text-align:center">${p[7] > 0 ? p[7]+'⚽' : '-'}</div>
                    <div style="text-align:center">${p[12] || 0}%</div>
                    <div style="text-align:center">${p[15] || 0}%</div>
                </div>`;
            if (p[3] === homeName) hHtml += row; else aHtml += row;
        });

        document.getElementById('list-players-home').innerHTML = hHtml || "Aucun joueur trouvé";
        document.getElementById('list-players-away').innerHTML = aHtml || "Aucun joueur trouvé";
    } catch (e) { console.error("Erreur Stats Joueurs:", e); }
}

// --- UTILITAIRES ---

function switchTab(tabId) {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(b => b.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    // On cherche le bouton qui a le onclick vers ce tabId
    const targetBtn = Array.from(tabs).find(btn => btn.getAttribute('onclick').includes(tabId));
    if(targetBtn) targetBtn.classList.add('active');
    
    const targetContent = document.getElementById(tabId);
    if(targetContent) targetContent.classList.add('active');
}

function updateBar(id, valH, valA, isPercent, onlyBar = false) {
    const clean = (v) => parseFloat(String(v).replace('%','').replace(',','.')) || 0;
    const h = clean(valH); const a = clean(valA);
    const total = h + a;
    const percH = total === 0 ? 50 : (h / total) * 100;

    const bH = document.getElementById(`bar-${id}-home`);
    const bA = document.getElementById(`bar-${id}-away`);
    if(bH) bH.style.width = percH + '%';
    if(bA) bA.style.width = (100 - percH) + '%';
    
    if(!onlyBar) {
        const lH = document.getElementById(`val-${id}-home`);
        const lA = document.getElementById(`val-${id}-away`);
        if(lH) lH.innerText = isPercent ? Math.round(h) + '%' : h;
        if(lA) lA.innerText = isPercent ? Math.round(a) + '%' : a;
    }
}

function getNoteColor(n) {
    const v = parseFloat(n) || 6.0;
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

function formatStrikers(s) {
    if (!s || s === '0' || s === '#REF!') return '';
    return s.split('|').map(x => `<div>${x.trim()} <i class="fas fa-futbol"></i></div>`).join('');
}
