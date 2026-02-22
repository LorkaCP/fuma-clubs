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

            // --- IMPORTANT : ON CACHE LE LOADER ICI ---
            const loader = document.getElementById('loader-container');
            const mainContent = document.getElementById('main-content');
            
            if (loader) loader.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';

            if (match) {
                updateUI(match);
            } else {
                if (mainContent) {
                    mainContent.innerHTML = "<h2 style='text-align:center;'>Match non trouvé.</h2>";
                }
            }
        })
        .catch(err => {
            console.error("Erreur lors de la récupération des données:", err);
            const loader = document.getElementById('loader-container');
            if (loader) {
                loader.innerHTML = "<p style='color:red;'>Erreur de connexion. Vérifiez votre lien.</p>";
            }
        });
});

/**
 * Découpe le CSV proprement
 */
function parseCSV(text) {
    if (!text) return [];
    return text.split('\n').map(row => {
        let values = [];
        let current = "";
        let inQuotes = false;
        for (let char of row) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = "";
            } else current += char;
        }
        values.push(current.trim());
        return values;
    });
}

/**
 * Formate les buteurs : Rend chaque nom cliquable avec une icône profil
 */
function formatStrikers(strikerString) {
    if (!strikerString || strikerString === '-' || strikerString.trim() === "") return '';

    const names = strikerString.split(/[,\n;]+/).map(s => s.trim()).filter(s => s !== "");
    
    if (names.length === 0) return '';

    const counts = {};
    names.forEach(name => {
        counts[name] = (counts[name] || 0) + 1;
    });

    return Object.entries(counts)
        .map(([name, count]) => {
            const playerLink = `
                <a href="player.html?id=${encodeURIComponent(name)}" style="color: inherit; text-decoration: none; transition: 0.2s;" onmouseover="this.style.color='var(--fuma-primary)'" onmouseout="this.style.color='inherit'">
                    <i class="fas fa-user" style="font-size: 0.6rem; margin-right: 4px; opacity: 0.7;"></i>${name}
                </a>`;
            return (count > 1 ? `${playerLink} (x${count})` : playerLink);
        })
        .join('<br>');
}

/**
 * Met à jour l'interface
 */
function updateUI(m) {
    // Infos générales
    document.getElementById('matchday-label').innerText = `Matchday ${m[0]}`;
    document.getElementById('match-date').innerText = m[1];

    // Logos et Noms (Texte simple)
    document.getElementById('logo-home').src = m[3];
    document.getElementById('logo-away').src = m[4];
    document.getElementById('name-home').innerText = m[5];
    document.getElementById('name-away').innerText = m[6];
    
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

    // Barres de stats
    updateBar('poss', m[11], m[12], true);
    updateBar('shots', m[13], m[14], false);
    updateBar('passes', m[15], m[16], false);
    updateBar('acc', m[17], m[18], true);

    // Buteurs (Sous les noms d'équipes)
    document.getElementById('strikers-home').innerHTML = formatStrikers(m[9]);
    document.getElementById('strikers-away').innerHTML = formatStrikers(m[10]);
    
    // Homme du Match
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
 * Anime les barres de stats
 */
function updateBar(id, valH, valA, isPercent) {
    const h = parseFloat(String(valH).replace('%', '').replace(',', '.')) || 0;
    const a = parseFloat(String(valA).replace('%', '').replace(',', '.')) || 0;
    
    const total = h + a;
    const percH = total === 0 ? 50 : (h / total) * 100;

    const labelH = document.getElementById(`val-${id}-home`);
    const labelA = document.getElementById(`val-${id}-away`);
    
    if(labelH) labelH.innerText = isPercent ? Math.round(h) + '%' : h;
    if(labelA) labelA.innerText = isPercent ? Math.round(a) + '%' : a;

    const barH = document.getElementById(`bar-${id}-home`);
    const barA = document.getElementById(`bar-${id}-away`);
    
    if(barH) barH.style.width = percH + '%';
    if(barA) barA.style.width = (100 - percH) + '%';
}
