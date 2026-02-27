/**
 * info-match-logic.js 
 * Version optimisée pour les fichiers FIXTURES et DATABASE réels
 */
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('gid');
    const homeName = params.get('home');
    const awayName = params.get('away');

    if (!gid || !homeName || !awayName) return;

    const FINAL_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=${gid}`;

    fetch(FINAL_URL)
        .then(res => res.text())
        .then(csv => {
            const rows = parseCSV(csv);
            // On cherche le match (Home col 6, Away col 7)
            const match = rows.find(r => r[6] === homeName && r[7] === awayName);

            if (document.getElementById('loader-container')) 
                document.getElementById('loader-container').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';

            if (match) {
                updateUI(match);
            }
        })
        .catch(err => console.error("Erreur Fixtures:", err));
});

async function updateUI(m) {
    // Un match est considéré comme joué si le score n'est pas #REF! et pas vide
    const scoreHome = m[9];
    const isPlayed = scoreHome !== "" && scoreHome !== "#REF!" && scoreHome !== undefined;

    const upcomingSection = document.getElementById('upcoming-section');
    const playedContent = document.getElementById('played-content');
    const matchNav = document.getElementById('match-nav');

    // Identité de base
    document.getElementById('name-home').innerText = m[6];
    document.getElementById('name-away').innerText = m[7];
    document.getElementById('logo-home').src = m[3] || '';
    document.getElementById('logo-away').src = m[4] || '';

    if (!isPlayed) {
        if (upcomingSection) upcomingSection.style.display = 'block';
        if (playedContent) playedContent.style.display = 'none';
        if (matchNav) matchNav.style.display = 'none';
        document.getElementById('score-home').innerText = "-";
        document.getElementById('score-away').innerText = "-";
    } else {
        if (upcomingSection) upcomingSection.style.display = 'none';
        if (playedContent) playedContent.style.display = 'block';
        if (matchNav) matchNav.style.display = 'flex';

        // Score et Buteurs
        document.getElementById('score-home').innerText = m[9];
        document.getElementById('score-away').innerText = m[10];
        
        const strH = document.getElementById('strikers-home');
        const strA = document.getElementById('strikers-away');
        if (strH) strH.innerHTML = formatStrikers(m[11]);
        if (strA) strA.innerHTML = formatStrikers(m[12]);

        // --- SECTION RÉSUMÉ (STATS ÉQUIPES) ---
        // Possession (m13/m14)
        updateBar('possession', m[13], m[14], true);
        
        // Tirs (m15/m16)
        updateBar('shots', m[15], m[16], false);
        
        // Passes (m17-20)
        updateBar('passes', m[19], m[20], true);
        const pHome = document.getElementById('val-passes-home');
        const pAway = document.getElementById('val-passes-away');
        if(pHome) pHome.innerText = `${m[17] || 0} (${m[19] || 0}%)`;
        if(pAway) pAway.innerText = `${m[18] || 0} (${m[20] || 0}%)`;

        // Tacles (m21-24)
        updateBar('tackles', m[23], m[24], false);
        const tHome = document.getElementById('val-tackles-home');
        const tAway = document.getElementById('val-tackles-away');
        if(tHome) tHome.innerText = `${m[23] || 0}/${m[21] || 0}`;
        if(tAway) tAway.innerText = `${m[24] || 0}/${m[22] || 0}`;

        // Homme du Match
        const motmCont = document.getElementById('motm-container');
        if (motmCont && m[27] && m[27] !== '0' && m[27] !== '#REF!') {
            motmCont.innerHTML = `<div class="motm-badge"><i class="fas fa-star"></i> MOTM: ${m[27]}</div>`;
        }

        // --- SECTION JOUEURS ---
        loadPlayerStats(m[8], m[6], m[7]);
    }
}

async function loadPlayerStats(matchId, homeName, awayName) {
    // GID de ta DATABASE SEASON1 (420142588 d'après tes fichiers)
    const DB_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=420142588&single=true&output=csv";
    
    try {
        const res = await fetch(DB_URL);
        const csv = await res.text();
        const rows = parseCSV(csv);

        // On filtre les joueurs qui ont le MATCH_ID (colonne 5)
        const players = rows.filter(p => p[5] === matchId);

        let hHtml = '', aHtml = '';
        players.forEach(p => {
            // Index : Tag(1), Team(3), Note(6), But(7), %Pass(12), %Tac(15)
            const row = `
                <div class="player-row">
                    <div class="p-name">${p[1]}</div>
                    <div class="p-note" style="background:${getNoteColor(p[6])}">${p[6] || '6.0'}</div>
                    <div class="p-stat">${p[7] > 0 ? p[7]+'⚽' : '-'}</div>
                    <div class="p-stat">${p[12]}%</div>
                    <div class="p-stat">${p[15]}%</div>
                </div>`;
            
            if (p[3] === homeName) hHtml += row;
            else if (p[3] === awayName) aHtml += row;
        });

        document.getElementById('list-players-home').innerHTML = hHtml || "<p>Données joueurs indisponibles</p>";
        document.getElementById('list-players-away').innerHTML = aHtml || "<p>Données joueurs indisponibles</p>";
        
        if(document.getElementById('team-name-home-stats')) document.getElementById('team-name-home-stats').innerText = homeName;
        if(document.getElementById('team-name-away-stats')) document.getElementById('team-name-away-stats').innerText = awayName;

    } catch (e) {
        console.error("Erreur Stats Joueurs:", e);
    }
}

function updateBar(id, valH, valA, isPercent) {
    // Nettoyage des valeurs (virgules, %, #REF!)
    const clean = (v) => parseFloat(String(v).replace('%','').replace(',','.')) || 0;
    const h = clean(valH);
    const a = clean(valA);
    const total = h + a;
    const percH = total === 0 ? 50 : (h / total) * 100;

    const bH = document.getElementById(`bar-${id}-home`);
    const bA = document.getElementById(`bar-${id}-away`);
    if(bH) bH.style.width = percH + '%';
    if(bA) bA.style.width = (100 - percH) + '%';
    
    // Pour Possession et Tirs, on met à jour les chiffres simples
    if (id === 'possession' || id === 'shots') {
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

function formatStrikers(s) {
    if (!s || s === '0' || s === '#REF!') return '';
    return s.split('|').map(x => `<div>${x.trim()} <i class="fas fa-futbol"></i></div>`).join('');
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
    const targetBtn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if(targetBtn) targetBtn.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}
