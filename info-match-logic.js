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
 * Parse le CSV en gérant les guillemets et les virgules internes
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
 * Met à jour l'interface avec les données (Index basés sur votre nouvelle liste)
 */
function updateUI(m) {
    // Infos générales
    document.getElementById('matchday-label').innerText = `Matchday ${m[0]}`;
    document.getElementById('match-date').innerText = m[1]; // StartDate

    // Logos
    const logoHomeImg = document.getElementById('logo-home');
    const logoAwayImg = document.getElementById('logo-away');
    logoHomeImg.src = m[3]; // CrestHome
    logoAwayImg.src = m[4];  // CrestAway

    // Noms des Clubs (Cliquables)
    const teamHome = m[5];
    const teamAway = m[6];
    document.getElementById('name-home').innerHTML = `<a href="club.html?name=${encodeURIComponent(teamHome)}" class="team-link">${teamHome}</a>`;
    document.getElementById('name-away').innerHTML = `<a href="club.html?name=${encodeURIComponent(teamAway)}" class="team-link">${teamAway}</a>`;
    
    // Score (ScoreHome: m[8], ScoreAway: m[9])
    document.getElementById('score-display').innerText = `${m[8]} : ${m[9]}`;

    // Buteurs (StrikerHome: m[10], StrikerAway: m[11])
    document.getElementById('strikers-home').innerHTML = formatStrikers(m[10]);
    document.getElementById('strikers-away').innerHTML = formatStrikers(m[11]);

    // --- Statistiques ---
    updateBar('poss',    m[12], m[13], true);  // Possession
    updateBar('shots',   m[14], m[15], false); // Shots
    updateBar('passes',  m[16], m[17], false); // Passes Attempted
    updateBar('acc',     m[18], m[19], true);  // Accuracy
    updateBar('tackles', m[20], m[21], false); // Tackles
    updateBar('reds',    m[22], m[23], false); // Red Cards

    // Man of the Match (MotM: m[24])
    const motmContainer = document.getElementById('motm-name');
    const motmName = m[24] || 'N/A';
    if (motmName !== 'N/A' && motmName.trim() !== '') {
        motmContainer.innerHTML = `
            <a href="player.html?id=${encodeURIComponent(motmName)}" style="color: var(--fuma-primary); text-decoration: none; font-weight: bold;">
                <i class="fas fa-user-check"></i> ${motmName}
            </a>`;
    } else {
        motmContainer.innerText = 'N/A';
    }

    // Lien Replay (LinkHome: m[25])
    const replayLink = document.getElementById('link-replay');
    if (replayLink) {
        const videoUrl = m[25];
        if (videoUrl && videoUrl !== "#" && videoUrl.trim() !== "") {
            replayLink.href = videoUrl;
            replayLink.style.display = 'inline-flex';
        } else {
            replayLink.style.display = 'none';
        }
    }
}

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

function formatStrikers(str) {
    if (!str || str === '0' || str.trim() === '') return '';
    return str.split(',').map(s => `<div>${s.trim()} <i class="fas fa-futbol" style="font-size: 0.7rem; opacity: 0.6;"></i></div>`).join('');
}
