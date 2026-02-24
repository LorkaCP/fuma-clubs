document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('gid');
    const homeName = params.get('home');
    const awayName = params.get('away');

    if (!gid) {
        console.error("Aucun GID spécifié");
        return;
    }

    const BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=";
    const FINAL_URL = BASE_URL + gid;

    fetch(FINAL_URL)
        .then(response => response.text())
        .then(csvText => {
            const rows = parseCSV(csvText);
            
            // Recherche du match : TeamHome (index 5) et TeamAway (index 6)
            const match = rows.find(r => r[5] === homeName && r[6] === awayName);

            // GESTION DU LOADER
            const loader = document.getElementById('loader-container');
            const mainContent = document.getElementById('main-content');
            
            if (loader) loader.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';

            if (match) {
                updateUI(match);
            } else {
                console.error("Match non trouvé dans le CSV");
            }
        })
        .catch(err => {
            console.error("Erreur lors du fetch :", err);
        });
});

/**
 * Parse le CSV en gérant les guillemets
 */
function parseCSV(text) {
    const lines = text.split('\n');
    return lines.map(line => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                result.push(cur.trim());
                cur = '';
            } else {
                cur += char;
            }
        }
        result.push(cur.trim());
        return result;
    });
}

/**
 * Met à jour l'interface avec les données du match selon la nouvelle structure
 */
function updateUI(m) {
    // Infos générales : Matchday (0), StartDate (1)
    document.getElementById('matchday-label').innerText = `Matchday ${m[0]}`;
    document.getElementById('match-date').innerText = m[1];

    // Logos et Noms (Cliquables)
    const logoHomeImg = document.getElementById('logo-home');
    const logoAwayImg = document.getElementById('logo-away');
    logoHomeImg.src = m[3];
    logoAwayImg.src = m[4];
    logoHomeImg.onclick = () => window.location.href = `club.html?name=${encodeURIComponent(m[5])}`;
    logoAwayImg.onclick = () => window.location.href = `club.html?name=${encodeURIComponent(m[6])}`;

    const styleLink = "color: inherit; text-decoration: none; transition: 0.2s;";
    document.getElementById('name-home').innerHTML = `<a href="club.html?name=${encodeURIComponent(m[5])}" style="${styleLink}">${m[5]}</a>`;
    document.getElementById('name-away').innerHTML = `<a href="club.html?name=${encodeURIComponent(m[6])}" style="${styleLink}">${m[6]}</a>`;
    
    // Score : ScoreHome (8), ScoreAway (9)
    document.getElementById('score-display').innerText = `${m[8]} : ${m[9]}`;

    // 1) Possession (12,13)
    updateBar('poss', m[12], m[13], true);

    // 2) Tirs (14,15)
    updateBar('shots', m[14], m[15], false);

    // 3) Passes (16,17) avec Accuracy (18,19) affiché à côté
    const passHome = m[16];
    const accHome = m[18];
    const passAway = m[17];
    const accAway = m[19];
    
    document.getElementById('val-passes-home').innerText = `${passHome} (${accHome})`;
    document.getElementById('val-passes-away').innerText = `${passAway} (${accAway})`;
    // On garde la barre basée sur le nombre de passes effectuées
    updateBar('passes', passHome, passAway, false, true); 

    // 4) Tackles (20,21)
    updateBar('tackles', m[20], m[21], false);

    // 5) Red Cards (22,23) - Simple affichage sans barre
    document.getElementById('val-red-home').innerText = m[22] || '0';
    document.getElementById('val-red-away').innerText = m[23] || '0';

    // Buteurs (10,11)
    document.getElementById('strikers-home').innerHTML = formatStrikers(m[10]);
    document.getElementById('strikers-away').innerHTML = formatStrikers(m[11]);
    
    // MotM (24)
    const motmContainer = document.getElementById('motm-name');
    const motmName = m[24] || 'N/A';
    if (motmName !== 'N/A') {
        motmContainer.innerHTML = `<a href="player.html?id=${encodeURIComponent(motmName)}" style="color: var(--fuma-primary); text-decoration: none; font-weight: bold;"><i class="fas fa-user-check"></i> ${motmName}</a>`;
    }

    // Replay (25)
    const replayLink = document.getElementById('link-replay');
    if (replayLink && m[25] && m[25] !== "#") {
        replayLink.href = m[25];
        replayLink.style.display = 'inline-flex';
    } else {
        replayLink.style.display = 'none';
    }
}

/**
 * Anime les barres de statistiques
 * @param {boolean} onlyBar - Si vrai, ne met pas à jour le texte (utile pour les passes fusionnées)
 */
function updateBar(id, valH, valA, isPercent, onlyBar = false) {
    const h = parseFloat(String(valH).replace('%', '').replace(',', '.')) || 0;
    const a = parseFloat(String(valA).replace('%', '').replace(',', '.')) || 0;
    
    const total = h + a;
    const percH = total === 0 ? 50 : (h / total) * 100;

    if (!onlyBar) {
        const labelH = document.getElementById(`val-${id}-home`);
        const labelA = document.getElementById(`val-${id}-away`);
        if(labelH) labelH.innerText = isPercent ? (Math.round(h) + '%') : h;
        if(labelA) labelA.innerText = isPercent ? (Math.round(a) + '%') : a;
    }

    const barH = document.getElementById(`bar-${id}-home`);
    const barA = document.getElementById(`bar-${id}-away`);
    if(barH) barH.style.width = percH + '%';
    if(barA) barA.style.width = (100 - percH) + '%';
}

/**
 * Formate la liste des buteurs
 */
function formatStrikers(str) {
    if (!str || str === '0' || str.trim() === '') return '';
    return str.split(',').map(s => `<div>${s.trim()} <i class="fas fa-futbol" style="font-size: 0.7rem; opacity: 0.6;"></i></div>`).join('');
}
