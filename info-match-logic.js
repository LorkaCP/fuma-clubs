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
 * Met à jour l'interface avec les données du match (Structure 2026)
 */
function updateUI(m) {
    // Infos générales : Matchday (0), StartDate (1)
    document.getElementById('matchday-label').innerText = `Matchday ${m[0]}`;
    document.getElementById('match-date').innerText = m[1];

    // Logos et Noms (Cliquables) - TeamHome (5), TeamAway (6), Crests (3,4)
    const logoHomeImg = document.getElementById('logo-home');
    const logoAwayImg = document.getElementById('logo-away');
    logoHomeImg.src = m[3];
    logoAwayImg.src = m[4];
    logoHomeImg.onclick = () => window.location.href = `club.html?name=${encodeURIComponent(m[5])}`;
    logoAwayImg.onclick = () => window.location.href = `club.html?name=${encodeURIComponent(m[6])}`;

    const styleLink = "color: inherit; text-decoration: none; transition: 0.2s;";
    document.getElementById('name-home').innerHTML = `<a href="club.html?name=${encodeURIComponent(m[5])}" style="${styleLink}">${m[5]}</a>`;
    document.getElementById('name-away').innerHTML = `<a href="club.html?name=${encodeURIComponent(m[6])}" style="${styleLink}">${m[6]}</a>`;
    
    // Score : ScoreHome (9), ScoreAway (10)
    document.getElementById('score-display').innerText = `${m[9]} : ${m[10]}`;

    // 1) Possession (13, 14)
    updateBar('poss', m[13], m[14], true);

    // 2) Tirs (15, 16)
    updateBar('shots', m[15], m[16], false);

    // 3) Passes Tentées (17, 18) avec Précision % (19, 20)
    const passHome = m[17];
    const accHome = m[19];
    const passAway = m[18];
    const accAway = m[20];
    
    // Affichage formaté : "Nombre (Précision%)"
    document.getElementById('val-passes-home').innerText = `${passHome} (${accHome}%)`;
    document.getElementById('val-passes-away').innerText = `${passAway} (${accAway}%)`;
    updateBar('passes', passHome, passAway, false, true); 

    // 4) Tacles Tentés (21, 22) avec Tacles Réussis (23, 24)
    const tackAttHome = m[21];
    const tackMadeHome = m[23];
    const tackAttAway = m[22];
    const tackMadeAway = m[24];

    // Affichage formaté : "Réussis/Tentés"
    document.getElementById('val-tackles-home').innerText = `${tackMadeHome}/${tackAttHome}`;
    document.getElementById('val-tackles-away').innerText = `${tackMadeAway}/${tackAttAway}`;
    updateBar('tackles', tackAttHome, tackAttAway, false, true);

    // 5) Red Cards (25, 26)
    document.getElementById('val-red-home').innerText = m[25] || '0';
    document.getElementById('val-red-away').innerText = m[26] || '0';

    // Buteurs (11, 12)
    document.getElementById('strikers-home').innerHTML = formatStrikers(m[11]);
    document.getElementById('strikers-away').innerHTML = formatStrikers(m[12]);
    
    // MotM (27)
    const motmContainer = document.getElementById('motm-name');
    const motmName = m[27] || 'N/A';
    if (motmName !== 'N/A') {
        motmContainer.innerHTML = `<a href="player.html?id=${encodeURIComponent(motmName)}" style="color: var(--fuma-primary); text-decoration: none; font-weight: bold;"><i class="fas fa-user-check"></i> ${motmName}</a>`;
    }

    // Lien Replay (IDMatch à l'index 7)
    const replayLink = document.getElementById('link-replay');
    if (replayLink && m[7]) {
        // Optionnel : Configurer ici l'URL du replay si nécessaire
    }
}

/**
 * Anime les barres de statistiques et met à jour les labels textuels
 */
function updateBar(id, valH, valA, isPercent, onlyBar = false) {
    const h = parseFloat(String(valH).replace('%', '').replace(',', '.')) || 0;
    const a = parseFloat(String(valA).replace('%', '').replace(',', '.')) || 0;
    
    const total = h + a;
    const percH = total === 0 ? 50 : (h / total) * 100;

    // Mise à jour du texte si nécessaire
    if (!onlyBar) {
        const labelH = document.getElementById(`val-${id}-home`);
        const labelA = document.getElementById(`val-${id}-away`);
        if(labelH) labelH.innerText = isPercent ? (Math.round(h) + '%') : h;
        if(labelA) labelA.innerText = isPercent ? (Math.round(a) + '%') : a;
    }

    // Mise à jour visuelle des barres
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
