/**
 * FUMA CLUBS - LOGIC OPTIMISÉE (Version Finale avec masquage automatique)
 */

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('gid'); 
    const homeName = params.get('home');
    const awayName = params.get('away');

    const btnBack = document.getElementById('btn-back-fixtures');
    if (btnBack) {
        btnBack.onclick = () => window.location.href = `league.html?tab=fixtures`;
    }

    if (!gid || !homeName || !awayName) {
        console.error("Paramètres URL manquants");
        return;
    }

    const TEAM_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=${gid}`;

    fetch(TEAM_URL)
        .then(res => res.text())
        .then(csv => {
            const rows = parseCSV(csv);
            const match = rows.find(r => r[6] === homeName && r[7] === awayName);

            if (document.getElementById('loader-container')) 
                document.getElementById('loader-container').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';

            if (match) {
                updateUI(match);
            }
        }).catch(err => console.error("Erreur de chargement Fixtures:", err));
});

function updateUI(m) {
    const scoreHome = m[9];
    // Un match est considéré comme "joué" si le score n'est pas vide, pas 0 et pas une erreur #REF!
    const isPlayed = scoreHome !== "" && scoreHome !== "#REF!" && scoreHome !== undefined && scoreHome !== "0";

    // Récupération des éléments de structure
    const resumeTab = document.getElementById('resume');
    const joueursTab = document.getElementById('joueurs');
    const matchNav = document.getElementById('match-nav');
    const upcomingSection = document.getElementById('upcoming-section');
    
    // Récupération des éléments de score
    const elScoreHome = document.getElementById('score-home');
    const elScoreAway = document.getElementById('score-away');

    // 1. Mise à jour des infos de base (toujours visibles)
    document.getElementById('name-home').innerText = m[6];
    document.getElementById('name-away').innerText = m[7];
    document.getElementById('logo-home').src = m[3] || '';
    document.getElementById('logo-away').src = m[4] || '';

    // Nettoyage systématique des classes de score au début
    elScoreHome.classList.remove('score-loser');
    elScoreAway.classList.remove('score-loser');

    if (!isPlayed) {
        // --- MODE MATCH NON JOUÉ ---
        // Masquer la navigation et les onglets de statistiques
        if (resumeTab) resumeTab.style.display = 'none';
        if (joueursTab) joueursTab.style.display = 'none';
        if (matchNav) matchNav.style.display = 'none';
        
        // Afficher la section d'attente avec le bouton rapport
        if (upcomingSection) upcomingSection.style.display = 'block';

        // Afficher un score neutre
        elScoreHome.innerText = "-";
        elScoreAway.innerText = "-";
        
        // Configuration du bouton de rapport
        const btnReport = document.getElementById('btn-send-report');
        if (btnReport) {
            btnReport.onclick = () => {
                const p = new URLSearchParams(window.location.search);
                window.location.href = `report.html?home=${encodeURIComponent(p.get('home'))}&away=${encodeURIComponent(p.get('away'))}&gid=${p.get('gid')}`;
            };
        }
    } else {
        // --- MODE MATCH JOUÉ ---
        // Afficher la navigation et masquer la section d'attente
        if (matchNav) matchNav.style.display = 'flex';
        if (upcomingSection) upcomingSection.style.display = 'none';
        
        // Activer l'onglet Résumé par défaut pour l'affichage
        switchTab('resume');

        // Affichage des scores
        elScoreHome.innerText = m[9];
        elScoreAway.innerText = m[10];

        // Logique pour griser le score du perdant
        const sH = parseInt(m[9]) || 0;
        const sA = parseInt(m[10]) || 0;
        if (sH < sA) {
            elScoreHome.classList.add('score-loser');
        } else if (sA < sH) {
            elScoreAway.classList.add('score-loser');
        }

        // Buteurs
        document.getElementById('strikers-home').innerHTML = formatStrikers(m[11]);
        document.getElementById('strikers-away').innerHTML = formatStrikers(m[12]);

        // Statistiques d'équipe (Barres de progression)
        updateBar('possession', m[13], m[14], true);
        updateBar('shots', m[15], m[16], false);
        
        // Statistiques de Passes
        const pH = document.getElementById('val-passes-home');
        const pA = document.getElementById('val-passes-away');
        if(pH) pH.innerText = `${m[17] || 0} (${m[19] || 0}%)`;
        if(pA) pA.innerText = `${m[18] || 0} (${m[20] || 0}%)`;
        updateBar('passes', m[19], m[20], true, true);

        // Statistiques de Tacles
        const tH = document.getElementById('val-tackles-home');
        const tA = document.getElementById('val-tackles-away');
        if(tH) tH.innerText = `${m[23] || 0}/${m[21] || 0}`;
        if(tA) tA.innerText = `${m[24] || 0}/${m[22] || 0}`;
        updateBar('tackles', m[23], m[24], false, true);

        // Affichage de l'Homme du Match (MOTM)
        const motmCont = document.getElementById('motm-container');
        if (motmCont && m[27] && m[27] !== '0' && m[27] !== '#REF!') {
            motmCont.innerHTML = `<div class="motm-badge"><i class="fas fa-star"></i> MOTM: ${m[27]}</div>`;
        } else if (motmCont) {
            motmCont.innerHTML = ""; // Vide le container si pas de MOTM
        }

        // Chargement des statistiques individuelles des joueurs
        loadPlayerStats(m[8], m[6], m[7]);
    }
}
async function loadPlayerStats(matchId, homeName, awayName) {
    const PLAYER_GID = "2074996595"; // GID Vérifié
    const URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=${PLAYER_GID}`;

    try {
        const res = await fetch(URL);
        const csv = await res.text();
        const rows = parseCSV(csv);

        // Filtrage par Match ID (Index 5)
        const players = rows.filter(p => p[5] === matchId);

        let hHtml = '', aHtml = '';
        players.forEach(p => {
            const note = p[6] || '6.0';
            const row = `
                <div class="player-row">
                    <div style="font-weight:600;">${p[1]}</div>
                    <div class="p-note" style="background:${getNoteColor(note)}">${note}</div>
                    <div style="text-align:center">${p[7] > 0 ? p[7]+'⚽' : '-'}</div>
                    <div style="text-align:center">${p[12] || 0}%</div>
                    <div style="text-align:center">${p[15] || 0}%</div>
                </div>`;
            
            if (p[3] === homeName) hHtml += row; 
            else if (p[3] === awayName) aHtml += row;
        });

        document.getElementById('list-players-home').innerHTML = hHtml || "Aucune donnée";
        document.getElementById('list-players-away').innerHTML = aHtml || "Aucune donnée";
        document.getElementById('title-home').innerText = homeName;
        document.getElementById('title-away').innerText = awayName;

    } catch (e) { console.error("Erreur Stats Joueurs:", e); }
}

// --- UTILITAIRES ---

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
    if (v >= 8) return '#11a85d';
    if (v >= 7) return '#91ba33';
    if (v >= 6) return '#e2b01b';
    return '#f85757';
}

function formatStrikers(s) {
    if (!s || s === '0' || s === '#REF!') return '';
    return s.split('|').map(x => `<div>${x.trim()} <i class="fas fa-futbol"></i></div>`).join('');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none'); // Changé en display none/block pour compatibilité script 1
    
    const targetBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => btn.getAttribute('onclick').includes(tabId));
    if(targetBtn) targetBtn.classList.add('active');
    
    const targetContent = document.getElementById(tabId);
    if(targetContent) targetContent.style.display = 'block';
}
