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
function updateUI(m) {
    // 1. DÉTECTION : Le match est-il déjà joué ?
    // On vérifie si la colonne ScoreHome (index 8) contient une valeur
    const isPlayed = m[8] !== "" && m[8] !== undefined && m[8] !== null;

    const statsContainer = document.querySelector('.stats-container');
    const scoreDisplay = document.querySelector('.score');
    const replayLink = document.querySelector('.replay-link');

    if (!isPlayed) {
        // --- CAS : MATCH NON JOUÉ ---
        const hName = encodeURIComponent(m[6]);
        const aName = encodeURIComponent(m[7]);
        const currentGid = new URLSearchParams(window.location.search).get('gid');

        // On ajuste l'affichage du score
        scoreDisplay.innerText = "VS";
        if (replayLink) replayLink.style.display = 'none';

        // On injecte le bouton de rapport à la place des stats vides
        statsContainer.innerHTML = `
            <div style="text-align: center; padding: 50px 20px; background: rgba(212, 175, 55, 0.05); border-radius: 15px; border: 1px dashed var(--fuma-primary); margin: 20px;">
                <i class="fas fa-file-signature" style="font-size: 3rem; color: var(--fuma-primary); margin-bottom: 20px;"></i>
                <h3 style="margin-bottom: 10px; font-weight: 800; letter-spacing: 1px;">AUCUNE DONNÉE ENREGISTRÉE</h3>
                <p style="color: var(--fuma-text-dim); margin-bottom: 25px; font-size: 0.9rem;">Les statistiques de cette rencontre n'ont pas encore été encodées.</p>
                
                <a href="report.html?home=${hName}&away=${aName}&gid=${currentGid}" 
                   style="display: inline-block; padding: 15px 35px; background: var(--fuma-primary); color: #000; text-decoration: none; border-radius: 50px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; transition: transform 0.2s ease;">
                   <i class="fas fa-plus-circle"></i> Encoder le score
                </a>
            </div>
        `;
        return; // On arrête l'exécution ici
    }

    // --- CAS : MATCH JOUÉ (Logique originale) ---
    
    // Mise à jour des scores et logos (colonnes 8, 9, 10, 11)
    scoreDisplay.innerText = `${m[8]} - ${m[9]}`;
    document.getElementById('logo-home').src = m[10];
    document.getElementById('logo-away').src = m[11];
    document.getElementById('name-home').innerText = m[6];
    document.getElementById('name-away').innerText = m[7];

    // Buteurs (colonnes 12 et 13)
    document.getElementById('strikers-home').innerText = m[12] || '';
    document.getElementById('strikers-away').innerText = m[13] || '';

    // Vidéo Replay (colonne 30)
    if (m[30] && m[30].startsWith('http')) {
        replayLink.href = m[30];
        replayLink.style.display = 'inline-block';
    } else {
        replayLink.style.display = 'none';
    }

    // Statistiques Barres (Possession, Tirs, Passes, Tacles)
    updateBar('possession', m[14], m[15], true);
    updateBar('shots', m[16], m[17], false);
    
    // Passes et Précision (colonnes 18, 19, 20, 21)
    const passLabelH = `${m[18]} (${m[20]})`;
    const passLabelA = `${m[19]} (${m[21]})`;
    document.getElementById('val-passes-home').innerText = passLabelH;
    document.getElementById('val-passes-away').innerText = passLabelA;
    updateBar('passes', m[20], m[21], false, true); // onlyBar = true car labels personnalisés

    // Tacles (colonnes 24, 25, 22, 23)
    const tacLabelH = `${m[24]}/${m[22]}`;
    const tacLabelA = `${m[25]}/${m[23]}`;
    document.getElementById('val-tackles-home').innerText = tacLabelH;
    document.getElementById('val-tackles-away').innerText = tacLabelA;
    updateBar('tackles', m[24], m[25], false, true);

    // Cartons Rouges (colonnes 28, 29)
    document.getElementById('val-red-home').innerText = m[28] || 0;
    document.getElementById('val-red-away').innerText = m[29] || 0;

    // Homme du match (index 27)
    const motmContainer = document.getElementById('motm-container');
    const motmName = m[27] || 'N/A';
    if (motmName !== 'N/A') {
        motmContainer.innerHTML = `
            <a href="player.html?id=${encodeURIComponent(motmName)}" 
               style="color: var(--fuma-primary); text-decoration: none; font-weight: bold;">
               <i class="fas fa-user-check"></i> ${motmName}
            </a>`;
    }
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
