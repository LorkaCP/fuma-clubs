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
        .catch(err => console.error("Erreur fetch :", err));
});

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
            } else { cur += char; }
        }
        result.push(cur.trim());
        return result;
    });
}

function updateUI(m) {
    const isPlayed = m[8] !== "" && m[8] !== undefined;
    const statsContainer = document.querySelector('.stats-container');
    const scoreDisplay = document.getElementById('score-display');
    const replayLink = document.getElementById('link-replay');

    if (!isPlayed) {
        scoreDisplay.innerText = "VS";
        if (replayLink) replayLink.style.display = 'none';
        statsContainer.innerHTML = `<div class="no-match-message"><h3>AUCUNE DONNÉE</h3><p>Match non encore joué.</p></div>`;
        return;
    }

    // Remplissage des données
    scoreDisplay.innerText = `${m[8]} : ${m[9]}`;
    document.getElementById('logo-home').src = m[10];
    document.getElementById('logo-away').src = m[11];
    document.getElementById('name-home').innerText = m[6];
    document.getElementById('name-away').innerText = m[7];
    
    // Matchday et Date (Colonnes 1 et 2)
    document.getElementById('matchday-label').innerText = "Journée " + m[1];
    document.getElementById('match-date').innerText = m[2];

    // Buteurs
    document.getElementById('strikers-home').innerHTML = formatStrikers(m[12]);
    document.getElementById('strikers-away').innerHTML = formatStrikers(m[13]);

    // Stats
    updateBar('poss', m[14], m[15], true);
    updateBar('shots', m[16], m[17], false);
    
    // Passes
    document.getElementById('val-passes-home').innerText = `${m[18]} (${m[20]}%)`;
    document.getElementById('val-passes-away').innerText = `${m[19]} (${m[21]}%)`;
    updateBar('passes', m[20], m[21], false, true);

    // Tacles
    document.getElementById('val-tackles-home').innerText = `${m[24]}/${m[22]}`;
    document.getElementById('val-tackles-away').innerText = `${m[25]}/${m[23]}`;
    updateBar('tackles', m[24], m[25], false, true);

    // Cartons Rouges
    document.getElementById('val-red-home').innerText = m[28] || 0;
    document.getElementById('val-red-away').innerText = m[29] || 0;

    // MOTM
    const motmName = m[27] || 'N/A';
    document.getElementById('motm-name').innerText = motmName;

    // Replay (Colonne 30)
    if (m[30] && m[30].startsWith('http')) {
        replayLink.href = m[30];
        replayLink.style.display = 'inline-flex';
    } else {
        replayLink.style.display = 'none';
    }
}

function updateBar(id, valH, valA, isPercent, onlyBar = false) {
    const h = parseFloat(String(valH).replace('%', '').replace(',', '.')) || 0;
    const a = parseFloat(String(valA).replace('%', '').replace(',', '.')) || 0;
    const total = h + a;
    const percH = total === 0 ? 50 : (h / total) * 100;

    if (!onlyBar) {
        if(document.getElementById(`val-${id}-home`)) document.getElementById(`val-${id}-home`).innerText = isPercent ? (Math.round(h) + '%') : h;
        if(document.getElementById(`val-${id}-away`)) document.getElementById(`val-${id}-away`).innerText = isPercent ? (Math.round(a) + '%') : a;
    }

    const barH = document.getElementById(`bar-${id}-home`);
    const barA = document.getElementById(`bar-${id}-away`);
    if(barH) barH.style.width = percH + '%';
    if(barA) barA.style.width = (100 - percH) + '%';
}

function formatStrikers(str) {
    if (!str || str === '0' || str.trim() === '') return '';
    return str.split(',').map(s => `<div>${s.trim()} <i class="fas fa-futbol"></i></div>`).join('');
}
