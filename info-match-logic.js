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
            
            // On cherche le match (TeamHome index 5, TeamAway index 6)
            const match = rows.find(r => r[5] === homeName && r[6] === awayName);

            // --- GESTION DU LOADER ---
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
 * Met à jour l'interface avec les données du match
 */
function updateUI(m) {
    // Infos générales
    document.getElementById('matchday-label').innerText = `Matchday ${m[0]}`;
    document.getElementById('match-date').innerText = m[1];

    // --- LOGOS CLIQUABLES ---
    const logoHomeImg = document.getElementById('logo-home');
    const logoAwayImg = document.getElementById('logo-away');
    
    logoHomeImg.src = m[3];
    logoHomeImg.style.cursor = "pointer";
    logoHomeImg.onclick = () => window.location.href = `club.html?name=${encodeURIComponent(m[5])}`;

    logoAwayImg.src = m[4];
    logoAwayImg.style.cursor = "pointer";
    logoAwayImg.onclick = () => window.location.href = `club.html?name=${encodeURIComponent(m[6])}`;

    // --- NOMS DES CLUBS CLIQUABLES ---
    const styleLink = "color: inherit; text-decoration: none; transition: 0.2s;";
    const hoverEffect = "this.style.color='var(--fuma-primary)'";
    const normalEffect = "this.style.color='inherit'";

    document.getElementById('name-home').innerHTML = `
        <a href="club.html?name=${encodeURIComponent(m[5])}" style="${styleLink}" onmouseover="${hoverEffect}" onmouseout="${normalEffect}">
            ${m[5]}
        </a>`;

    document.getElementById('name-away').innerHTML = `
        <a href="club.html?name=${encodeURIComponent(m[6])}" style="${styleLink}" onmouseover="${hoverEffect}" onmouseout="${normalEffect}">
            ${m[6]}
        </a>`;
    
    // Score
    document.getElementById('score-display').innerText = `${m[7]} : ${m[8]}`;

    // Gestion du bouton REPLAY (Index 20)
    const replayLink = document.getElementById('link-replay');
    if (replayLink) {
        const videoUrl = m[20];
        if (videoUrl && videoUrl !== "#" && videoUrl.trim() !== "") {
            replayLink.href = videoUrl;
            replayLink.style.display = 'inline-flex';
        } else {
            replayLink.style.display = 'none';
        }
    }

    // Barres de stats (Possession, Tirs, Passes, Précision)
    updateBar('poss', m[11], m[12], true);
    updateBar('shots', m[13], m[14], false);
    updateBar('passes', m[15], m[16], false);
    updateBar('acc', m[17], m[18], true);

    // Buteurs
    document.getElementById('strikers-home').innerHTML = formatStrikers(m[9]);
    document.getElementById('strikers-away').innerHTML = formatStrikers(m[10]);
    
    // Homme du Match (Cliquable vers profil joueur)
    const motmContainer = document.getElementById('motm-name');
    const motmName = m[19] || 'N/A';
    
    if (motmName !== 'N/A') {
        motmContainer.innerHTML = `
            <a href="player.html?id=${encodeURIComponent(motmName)}" style="color: var(--fuma-primary); text-decoration: none; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <i class="fas fa-user-check" style="font-size: 0.9rem;"></i> ${motmName}
            </a>`;
    } else {
        motmContainer.innerText = 'N/A';
    }
}

/**
 * Anime les barres de statistiques
 */
function updateBar(id, valH, valA, isPercent) {
    const h = parseFloat(String(valH).replace('%', '').replace(',', '.')) || 0;
    const a = parseFloat(String(valA).replace('%', '').replace(',', '.')) || 0;
    
    const total = h + a;
    const percH = total === 0 ? 50 : (h / total) * 100;

    const labelH = document.getElementById(`val-${id}-home`);
    const labelA = document.getElementById(`val-${id}-away`);
    
    if(labelH) labelH.innerText = isPercent ? (Math.round(h) + '%') : h;
    if(labelA) labelA.innerText = isPercent ? (Math.round(a) + '%') : a;

    const barH = document.getElementById(`bar-${id}-home`);
    const barA = document.getElementById(`bar-${id}-away`);
    
    if(barH) barH.style.width = percH + '%';
    if(barA) barA.style.width = (100 - percH) + '%';
}

/**
 * Formate la liste des buteurs (attend une chaîne séparée par des virgules)
 */
function formatStrikers(str) {
    if (!str || str === '0' || str.trim() === '') return '';
    return str.split(',').map(s => `<div>${s.trim()} <i class="fas fa-futbol" style="font-size: 0.7rem; opacity: 0.6;"></i></div>`).join('');
}
