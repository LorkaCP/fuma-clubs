/**
 * FUMA CLUBS - INFO MATCH LOGIC
 * Gestion de l'affichage, du bouton retour et du bouton rapport.
 */

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('gid'); 
    const homeName = params.get('home');
    const awayName = params.get('away');

    // 1. Logique du bouton "BACK TO FIXTURES"
    const btnBack = document.getElementById('btn-back-fixtures');
    if (btnBack) {
        btnBack.onclick = () => {
            window.location.href = `league.html?tab=fixtures`;
        };
    }

    if (!gid || !homeName || !awayName) {
        console.error("Paramètres URL manquants");
        return;
    }

    // URL de la source CSV (Onglet Fixtures)
    const TEAM_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=${gid}`;

    fetch(TEAM_URL)
        .then(res => res.text())
        .then(csv => {
            const rows = parseCSV(csv);
            // Recherche du match par noms d'équipes
            const match = rows.find(r => r[6] === homeName && r[7] === awayName);

            if (document.getElementById('loader-container')) 
                document.getElementById('loader-container').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';

            if (match) {
                updateUI(match);
            } else {
                console.error("Match non trouvé");
            }
        })
        .catch(err => console.error("Erreur de chargement :", err));
});

function updateUI(m) {
    const scoreHome = m[9];
    const isPlayed = scoreHome !== "" && scoreHome !== "#REF!" && scoreHome !== undefined;

    const upcoming = document.getElementById('upcoming-section');
    const nav = document.getElementById('match-nav');
    const resume = document.getElementById('resume');
    const joueurs = document.getElementById('joueurs');
    const playedContent = document.getElementById('played-content'); 

    // Infos de base
    document.getElementById('name-home').innerText = m[6];
    document.getElementById('name-away').innerText = m[7];
    document.getElementById('logo-home').src = m[3] || '';
    document.getElementById('logo-away').src = m[4] || '';

    if (!isPlayed) {
        // --- MODE MATCH NON JOUÉ ---
        if(upcoming) upcoming.style.display = 'block';
        if(nav) nav.style.display = 'none';
        if(resume) resume.style.display = 'none';
        if(joueurs) joueurs.style.display = 'none';
        if(playedContent) playedContent.style.display = 'none';

        const btnReport = document.getElementById('btn-send-report');
        if (btnReport) {
            btnReport.onclick = () => {
                const params = new URLSearchParams(window.location.search);
                window.location.href = `report.html?home=${encodeURIComponent(params.get('home'))}&away=${encodeURIComponent(params.get('away'))}&gid=${params.get('gid')}`;
            };
        }
    } else {
        // --- MODE MATCH JOUÉ ---
        if(upcoming) upcoming.style.display = 'none';
        if(nav) nav.style.display = 'flex';
        if(playedContent) playedContent.style.display = 'block';
        
        // On affiche l'onglet résumé par défaut
        switchTab('resume');

        // Score et Buteurs
        document.getElementById('score-home').innerText = m[9];
        document.getElementById('score-away').innerText = m[10];
        document.getElementById('strikers-home').innerHTML = formatStrikers(m[11]);
        document.getElementById('strikers-away').innerHTML = formatStrikers(m[12]);

        // Stats Équipe
        updateBar('possession', m[13], m[14], true);
        updateBar('shots', m[15], m[16], false);
        
        const pH = document.getElementById('val-passes-home');
        const pA = document.getElementById('val-passes-away');
        if(pH) pH.innerText = `${m[17] || 0} (${m[19] || 0}%)`;
        if(pA) pA.innerText = `${m[18] || 0} (${m[20] || 0}%)`;
        updateBar('passes', m[19], m[20], true, true);

        const tH = document.getElementById('val-tackles-home');
        const tA = document.getElementById('val-tackles-away');
        if(tH) tH.innerText = `${m[23] || 0}/${m[21] || 0}`;
        if(tA) tA.innerText = `${m[24] || 0}/${m[22] || 0}`;
        updateBar('tackles', m[23], m[24], false, true);

        // Homme du match
        const motmCont = document.getElementById('motm-container');
        if (motmCont && m[27] && m[27] !== '0') {
            motmCont.innerHTML = `<div class="motm-badge"><i class="fas fa-star"></i> MOTM: ${m[27]}</div>`;
        }

        // CHARGEMENT DES JOUEURS (Utilise l'ID en colonne I / index 8)
        loadPlayerStats(m[8], m[6], m[7]);
    }
}

// GESTION DES ONGLETS (IMPORTANT POUR L'AFFICHAGE)
function switchTab(tabId) {
    // Cacher tous les contenus
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    // Désactiver tous les boutons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    // Afficher l'onglet sélectionné
    const activeContent = document.getElementById(tabId);
    if(activeContent) activeContent.style.display = 'block';
    
    // Activer le bouton correspondant
    const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
    if(btn) btn.classList.add('active');
}

/**
 * Charge les statistiques des joueurs depuis la DATABASE
 */
function loadPlayerStats(matchId, homeTeam, awayTeam) {
    const DB_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=1114945484`;
    
    fetch(DB_URL)
        .then(res => res.text())
        .then(csv => {
            const rows = parseCSV(csv);
            
            // FILTRAGE CORRIGÉ :
            // r[5] = MATCH_ID
            // r[3] = CURRENT_TEAM (L'index était r[1] dans votre ancien code)
            const homePlayers = rows.filter(r => r[5] === matchId && r[3] === homeTeam);
            const awayPlayers = rows.filter(r => r[5] === matchId && r[3] === awayTeam);

            renderPlayers('list-players-home', homePlayers);
            renderPlayers('list-players-away', awayPlayers);
            
            if(document.getElementById('title-home')) document.getElementById('title-home').innerText = homeTeam;
            if(document.getElementById('title-away')) document.getElementById('title-away').innerText = awayTeam;
        })
        .catch(err => console.error("Erreur database joueurs:", err));
}

/**
 * Affiche la liste des joueurs avec les bonnes colonnes
 */
function renderPlayers(containerId, players) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (players.length === 0) {
        container.innerHTML = '<div class="no-data">Aucune donnée joueur disponible</div>';
        return;
    }

    container.innerHTML = players.map(p => {
        // Index basés sur votre fichier CSV :
        // p[1] = GAME_TAG (Nom)
        // p[6] = RATING (Note)
        // p[7] = GOALS (Buts)
        // p[12] = % SUCCESSFUL PASSES
        // p[15] = % SUCCESSFUL TACKLES
        
        const note = parseFloat(p[6]) || 0;
        const color = getNoteColor(note);
        
        return `
            <div class="player-row">
                <span class="p-name">${p[1]}</span>
                <span class="p-note" style="background:${color}">${note.toFixed(1)}</span>
                <span class="p-stat">${p[7]} <i class="fas fa-futbol" style="font-size:10px"></i></span>
                <span class="p-stat">${p[12]}% <small>P.</small></span>
                <span class="p-stat">${p[15]}% <small>T.</small></span>
            </div>
        `;
    }).join('');
}
function getNoteColor(n) {
    if (n >= 8) return '#11a85d';
    if (n >= 7) return '#91ba33';
    if (n >= 6) return '#e2b01b';
    return '#f85757';
}

function updateBar(id, valH, valA, isPercent, isAlreadyRate = false) {
    const h = parseFloat(valH) || 0;
    const a = parseFloat(valA) || 0;
    const total = h + a;
    let percH = 50;
    if (total > 0) percH = (h / total) * 100;

    const barH = document.getElementById(`bar-${id}-home`);
    const barA = document.getElementById(`bar-${id}-away`);
    if (barH && barA) {
        barH.style.width = percH + '%';
        barA.style.width = (100 - percH) + '%';
    }

    if (!isAlreadyRate) {
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

function formatStrikers(s) {
    if (!s || s === '0' || s === '#REF!') return '';
    return s.split('|').map(x => `<div>${x.trim()} <i class="fas fa-futbol"></i></div>`).join('');
}
