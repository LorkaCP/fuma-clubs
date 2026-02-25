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
            
            // On cherche maintenant l'équipe domicile en colonne 6 et extérieur en colonne 7
            const match = rows.find(r => r[6] === homeName && r[7] === awayName);

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
/**
 * Met à jour l'interface avec les données du match (Structure 2026)
 */
function updateUI(m) {
    // Éléments de l'interface
    const statsContainer = document.querySelector('.stats-container');
    const scoreDisplay = document.getElementById('score-display');
    const replayLink = document.getElementById('link-replay');

    // Vérification si le match a été joué (Colonnes ScoreHome index 9 et ScoreAway index 10)
    // On vérifie si la cellule est vide ou contient un caractère non numérique
    const isPlayed = m[9] !== "" && m[10] !== "" && m[9] !== null;

    // Infos générales : Matchday (0), StartDate (1)
    document.getElementById('matchday-label').innerText = `Matchday ${m[0]}`;
    document.getElementById('match-date').innerText = m[1];

    // Logos et Noms (Cliquables) - TeamHome (6), TeamAway (7), Crests (3,4)
    const logoHomeImg = document.getElementById('logo-home');
    const logoAwayImg = document.getElementById('logo-away');
    logoHomeImg.src = m[3];
    logoAwayImg.src = m[4];
    
    logoHomeImg.onclick = () => window.location.href = `club.html?name=${encodeURIComponent(m[6])}`;
    logoAwayImg.onclick = () => window.location.href = `club.html?name=${encodeURIComponent(m[7])}`;

    const styleLink = "color: inherit; text-decoration: none; transition: 0.2s;";
    document.getElementById('name-home').innerHTML = `<a href="club.html?name=${encodeURIComponent(m[6])}" style="${styleLink}">${m[6]}</a>`;
    document.getElementById('name-away').innerHTML = `<a href="club.html?name=${encodeURIComponent(m[7])}" style="${styleLink}">${m[7]}</a>`;

    // --- LOGIQUE D'AFFICHAGE CONDITIONNELLE ---
    if (!isPlayed) {
        // Affichage pour match non joué
        scoreDisplay.innerText = "VS";
        if (replayLink) replayLink.style.display = 'none';
        
        // Remplace le contenu des stats par un message d'attente
        statsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--fuma-text-dim);">
                <i class="far fa-calendar-alt" style="font-size: 2rem; margin-bottom: 15px; color: var(--fuma-primary);"></i>
                <p style="font-weight: 600; letter-spacing: 1px;">THIS MATCH HAS NOT BEEN PLAYED YET</p>
            </div>
        `;
        return; // Arrête la fonction ici
    }

    // --- SI LE MATCH EST JOUÉ ---
    // Score : ScoreHome (9), ScoreAway (10)
    scoreDisplay.innerText = `${m[9]} : ${m[10]}`;

    // Lien Replay (Colonne index 5)
    if (replayLink) {
        if (m[5] && m[5] !== "" && m[5] !== "#") {
            replayLink.href = m[5];
            replayLink.style.display = 'inline-flex';
        } else {
            replayLink.style.display = 'none';
        }
    }

    // 1) Possession (13, 14)
    updateBar('poss', m[13], m[14], true);

    // 2) Tirs (15, 16)
    updateBar('shots', m[15], m[16], false);

    // 3) Passes Tentées (17, 18) avec Précision % (19, 20)
    const passHome = m[17];
    const accHome = m[19];
    const passAway = m[18];
    const accAway = m[20];
    document.getElementById('val-passes-home').innerText = `${passHome} (${accHome}%)`;
    document.getElementById('val-passes-away').innerText = `${passAway} (${accAway}%)`;
    updateBar('passes', passHome, passAway, false, true);

    // 4) Tacles Tentés (21, 22) avec Tacles Réussis (23, 24)
    const tackAttHome = m[21];
    const tackMadeHome = m[23];
    const tackAttAway = m[22];
    const tackMadeAway = m[24];
    document.getElementById('val-tackles-home').innerText = `${tackMadeHome}/${tackAttHome}`;
    document.getElementById('val-tackles-away').innerText = `${tackMadeAway}/${tackAttAway}`;
    updateBar('tackles', tackMadeHome, tackMadeAway, false, true);

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
}

/**
 * Anime les barres de statistiques et met à jour les labels textuels
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
