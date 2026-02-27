/**
 * FUMA CLUBS - INFO MATCH LOGIC
 * Liaison : FIXTURES (Col I / index 8) <-> DATABASE (Col F / index 5)
 */

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('gid'); 
    const homeName = params.get('home');
    const awayName = params.get('away');

    if (!gid || !homeName || !awayName) {
        console.error("Paramètres URL manquants");
        return;
    }

    // URL de l'onglet Fixtures (Performance Équipe)
    const TEAM_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=${gid}`;

    fetch(TEAM_URL)
        .then(res => res.text())
        .then(csv => {
            const rows = parseCSV(csv);
            // Recherche du match : Domicile (index 6), Extérieur (index 7)
            const match = rows.find(r => r[6] === homeName && r[7] === awayName);

            if (document.getElementById('loader-container')) 
                document.getElementById('loader-container').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';

            if (match) {
                console.log("Match trouvé ! ID Match (Col I):", match[8]);
                updateUI(match);
            } else {
                console.error("Impossible de trouver le match dans le CSV");
            }
        }).catch(err => console.error("Erreur de chargement Fixtures:", err));
});

function updateUI(m) {
    const scoreHome = m[9];
    // Un match est joué si le score n'est pas vide et pas #REF!
    const isPlayed = scoreHome !== "" && scoreHome !== "#REF!" && scoreHome !== undefined;

    const upcoming = document.getElementById('upcoming-section');
    const played = document.getElementById('played-content'); // Note: Assurez-vous que cette ID englobe le résumé et le nav dans votre HTML
    const nav = document.getElementById('match-nav');

    // Noms et Logos
    document.getElementById('name-home').innerText = m[6];
    document.getElementById('name-away').innerText = m[7];
    document.getElementById('logo-home').src = m[3] || '';
    document.getElementById('logo-away').src = m[4] || '';

    if (!isPlayed) {
        // --- LOGIQUE MATCH NON JOUÉ ---
        if(upcoming) upcoming.style.display = 'block';
        if(played) played.style.display = 'none';
        if(nav) nav.style.display = 'none';

        // Gestion du bouton de redirection vers report.html
        const btnReport = document.getElementById('btn-send-report');
        if (btnReport) {
            btnReport.onclick = () => {
                const params = new URLSearchParams(window.location.search);
                const gid = params.get('gid');
                const home = params.get('home');
                const away = params.get('away');
                
                // Redirection avec les paramètres URL pour pré-remplir le rapport
                window.location.href = `report.html?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}&gid=${gid}`;
            };
        }
    } else {
        // --- LOGIQUE MATCH JOUÉ ---
        if(upcoming) upcoming.style.display = 'none';
        if(played) played.style.display = 'block';
        if(nav) nav.style.display = 'flex';

        // Score et Buteurs
        document.getElementById('score-home').innerText = m[9];
        document.getElementById('score-away').innerText = m[10];
        document.getElementById('strikers-home').innerHTML = formatStrikers(m[11]);
        document.getElementById('strikers-away').innerHTML = formatStrikers(m[12]);

        // --- SECTION RÉSUMÉ (STATS ÉQUIPE) ---
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

        // Homme du match (index 27)
        const motmCont = document.getElementById('motm-container');
        if (motmCont && m[27] && m[27] !== '0' && m[27] !== '#REF!') {
            motmCont.innerHTML = `<div class="motm-badge"><i class="fas fa-star"></i> MOTM: ${m[27]}</div>`;
        }

        // --- SECTION JOUEURS (Liaison Col F / index 5) ---
        loadPlayerStats(m[8], m[6], m[7]);
    }
}

async function loadPlayerStats(matchId, homeName, awayName) {
    // GID de l'onglet DATABASE JOUEURS
    const PLAYER_GID = "2074996595";
    const URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=${PLAYER_GID}`;

    try {
        const res = await fetch(URL);
        const csv = await res.text();
        const rows = parseCSV(csv);

        // Filtrer : MATCH_ID est en Colonne F (index 5)
        const players = rows.filter(p => p[5] === matchId);

        let hHtml = '', aHtml = '';
        players.forEach(p => {
            // Index DATABASE : Tag(1), Team(3), Note(6), But(7), %Passes(12), %Tacles(15)
            const row = `
                <div class="player-row">
                    <div style="font-weight:600;">${p[1]}</div>
                    <div class="p-note" style="background:${getNoteColor(p[6])}">${p[6] || '6.0'}</div>
                    <div style="text-align:center">${p[7] > 0 ? p[7]+'⚽' : '-'}</div>
                    <div style="text-align:center">${p[12] || 0}%</div>
                    <div style="text-align:center">${p[15] || 0}%</div>
                </div>`;
            
            if (p[3] === homeName) hHtml += row; 
            else if (p[3] === awayName) aHtml += row;
        });

        document.getElementById('list-players-home').innerHTML = hHtml || "Aucun joueur trouvé";
        document.getElementById('list-players-away').innerHTML = aHtml || "Aucun joueur trouvé";
        
        // Mise à jour des titres des colonnes joueurs
        document.getElementById('title-home').innerText = homeName;
        document.getElementById('title-away').innerText = awayName;

    } catch (e) { console.error("Erreur Stats Joueurs:", e); }
}

// --- UTILITAIRES DE CALCUL ET PARSING ---

function updateBar(id, valH, valA, isPercent, onlyBar = false) {
    const clean = (v) => {
        if (!v || v === "#REF!" || v === "0") return 0;
        let n = parseFloat(String(v).replace('%','').replace(',','.'));
        return isNaN(n) ? 0 : n;
    };
    
    const h = clean(valH);
    const a = clean(valA);
    const total = h + a;
    let percH = 50; 
    if (total > 0) percH = (h / total) * 100;

    const barH = document.getElementById(`bar-${id}-home`);
    const barA = document.getElementById(`bar-${id}-away`);
    if(barH) barH.style.width = percH + '%';
    if(barA) barA.style.width = (100 - percH) + '%';
    
    if(!onlyBar) {
        const labelH = document.getElementById(`val-${id}-home`);
        const labelA = document.getElementById(`val-${id}-away`);
        if(labelH) labelH.innerText = isPercent ? Math.round(h) + '%' : h;
        if(labelA) labelA.innerText = isPercent ? Math.round(a) + '%' : a;
    }
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

function getNoteColor(n) {
    const v = parseFloat(n) || 6.0;
    if (v >= 8) return '#11a85d'; // Vert
    if (v >= 7) return '#91ba33'; // Vert clair
    if (v >= 6) return '#e2b01b'; // Jaune/Orange
    return '#f85757'; // Rouge
}

function formatStrikers(s) {
    if (!s || s === '0' || s === '#REF!') return '';
    return s.split('|').map(x => `<div>${x.trim()} <i class="fas fa-futbol"></i></div>`).join('');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    const targetBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => btn.getAttribute('onclick').includes(tabId));
    if(targetBtn) targetBtn.classList.add('active');
    
    const targetContent = document.getElementById(tabId);
    if(targetContent) targetContent.classList.add('active');
}
