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
/**
 * Met à jour l'intégralité de l'interface avec les données du match
 * @param {Array} m - La ligne du CSV correspondant au match
 */
/**
 * Met à jour l'intégralité de l'interface avec les données du match (Structure 2026)
 */
function updateUI(m) {
    // 1. ÉLÉMENTS DU DOM
    const statsContainer = document.querySelector('.stats-container');
    const scoreDisplay = document.getElementById('score-display');
    const replayLink = document.getElementById('link-replay');

    // 2. DÉTECTION : Le match est-il déjà joué ?
    // On vérifie si la colonne ScoreHome (index 9) est vide ou nulle
    const isPlayed = m[9] !== "" && m[9] !== undefined && m[9] !== null;

    // 3. INFOS GÉNÉRALES (Toujours affichées)
    document.getElementById('matchday-label').innerText = `Matchday ${m[0]}`;
    document.getElementById('match-date').innerText = m[1];

    // Logos et Noms (index 3 et 4 pour les logos, 6 et 7 pour les noms)
    const logoHomeImg = document.getElementById('logo-home');
    const logoAwayImg = document.getElementById('logo-away');
    logoHomeImg.src = m[3];
    logoAwayImg.src = m[4];
    
    const styleLink = "color: inherit; text-decoration: none; transition: 0.2s;";
    document.getElementById('name-home').innerHTML = `<a href="club.html?name=${encodeURIComponent(m[6])}" style="${styleLink}">${m[6]}</a>`;
    document.getElementById('name-away').innerHTML = `<a href="club.html?name=${encodeURIComponent(m[7])}" style="${styleLink}">${m[7]}</a>`;

    // 4. LOGIQUE D'AFFICHAGE CONDITIONNELLE
    if (!isPlayed) {
        // --- CAS : MATCH NON JOUÉ ---
        scoreDisplay.innerText = "VS";
        if (replayLink) replayLink.style.display = 'none';

        const hName = encodeURIComponent(m[6]);
        const aName = encodeURIComponent(m[7]);
        const currentGid = new URLSearchParams(window.location.search).get('gid');

        // On injecte le bouton d'encodage
        statsContainer.innerHTML = `
            <div style="text-align: center; padding: 50px 20px; background: rgba(212, 175, 55, 0.05); border-radius: 15px; border: 1px dashed var(--fuma-primary); margin: 20px;">
                <i class="fas fa-file-signature" style="font-size: 3rem; color: var(--fuma-primary); margin-bottom: 20px;"></i>
                <h3 style="margin-bottom: 10px; font-weight: 800; letter-spacing: 1px;">MATCH NON ENCODÉ</h3>
                <p style="color: var(--fuma-text-dim); margin-bottom: 25px; font-size: 0.9rem;">Les statistiques de cette rencontre ne sont pas encore disponibles.</p>
                
                <a href="report.html?home=${hName}&away=${aName}&gid=${currentGid}" 
                   style="display: inline-block; padding: 15px 35px; background: var(--fuma-primary); color: #000; text-decoration: none; border-radius: 50px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                   <i class="fas fa-plus-circle"></i> Encoder le score
                </a>
            </div>
        `;
        return; // On arrête là
    }

    // --- CAS : MATCH JOUÉ ---
    // Score (index 9 et 10)
    scoreDisplay.innerText = `${m[9]} : ${m[10]}`;

    // Lien Replay (index 5)
    if (replayLink) {
        if (m[5] && m[5] !== "" && m[5] !== "#") {
            replayLink.href = m[5];
            replayLink.style.display = 'inline-flex';
        } else {
            replayLink.style.display = 'none';
        }
    }

    // Statistiques Barres
    // Possession (13, 14), Tirs (15, 16)
    updateBar('poss', m[13], m[14], true);
    updateBar('shots', m[15], m[16], false);

    // Passes (17, 18) et Précision (19, 20)
    document.getElementById('val-passes-home').innerText = `${m[17]} (${m[19]}%)`;
    document.getElementById('val-passes-away').innerText = `${m[18]} (${m[20]}%)`;
    updateBar('passes', m[17], m[18], false, true);

    // Tacles Tentés (21, 22) et Réussis (23, 24)
    document.getElementById('val-tackles-home').innerText = `${m[23]}/${m[21]}`;
    document.getElementById('val-tackles-away').innerText = `${m[24]}/${m[22]}`;
    updateBar('tackles', m[23], m[24], false, true);

    // Cartons Rouges (25, 26)
    document.getElementById('val-red-home').innerText = m[25] || '0';
    document.getElementById('val-red-away').innerText = m[26] || '0';

    // Buteurs (11, 12)
    document.getElementById('strikers-home').innerHTML = formatStrikers(m[11]);
    document.getElementById('strikers-away').innerHTML = formatStrikers(m[12]);
    
    // Homme du match (27)
    const motmContainer = document.getElementById('motm-name');
    const motmName = m[27] || 'N/A';
    if (motmName !== 'N/A') {
        motmContainer.innerHTML = `
            <a href="player.html?id=${encodeURIComponent(motmName)}" style="color: var(--fuma-primary); text-decoration: none; font-weight: bold;">
                <i class="fas fa-user-check"></i> ${motmName}
            </a>`;
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
