document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('gid');
    const homeName = params.get('home');
    const awayName = params.get('away');

    if (!gid) {
        console.error("Aucun GID spécifié");
        return;
    }

    // On construit l'URL spécifique à la saison/division concernée
    const BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=";
    const FINAL_URL = BASE_URL + gid;

    fetch(FINAL_URL)
        .then(response => response.text())
        .then(csvText => {
            const rows = parseCSV(csvText);
            
            // On cherche le match dans la feuille spécifique
            // On utilise TeamHome et TeamAway pour identifier la ligne
            // Adaptez les index (ici 5 et 6) selon votre structure réelle
            const match = rows.find(r => r[5] === homeName && r[6] === awayName);

            if (match) {
                updateUI(match);
            } else {
                document.body.innerHTML = "Match non trouvé dans cette division.";
            }
        });
});

// Fonction pour gérer proprement les virgules dans le CSV
function parseCSV(text) {
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

function updateUI(m) {
    // Mapping basé sur vos colonnes :
    // 0:Matchday, 1:StartDate, 2:EndDate, 3:CrestH, 4:CrestA, 5:TeamH, 6:TeamA...
    document.getElementById('logo-home').src = m[3];
    document.getElementById('logo-away').src = m[4];
    document.getElementById('name-home').innerText = m[5];
    document.getElementById('name-away').innerText = m[6];
    document.getElementById('score-display').innerText = `${m[7]} : ${m[8]}`;

    // Stats (Index à vérifier selon votre sheet)
    // Possession: col 11/12, Tirs: col 13/14
    updateBar('poss', m[11], m[12]);
    updateBar('shots', m[13], m[14]);

    document.getElementById('strikers-home').innerText = m[9] || '-';
    document.getElementById('strikers-away').innerText = m[10] || '-';
    document.getElementById('motm-name').innerText = m[19] || 'N/A';
}

function updateBar(id, valH, valA) {
    const h = parseFloat(valH.replace('%','')) || 0;
    const a = parseFloat(valA.replace('%','')) || 0;
    const total = h + a;
    const percH = total === 0 ? 50 : (h / total) * 100;
    
    document.getElementById(`val-${id}-home`).innerText = id === 'poss' ? h+'%' : h;
    document.getElementById(`val-${id}-away`).innerText = id === 'poss' ? a+'%' : a;
    document.getElementById(`bar-${id}-home`).style.width = percH + '%';
    document.getElementById(`bar-${id}-away`).style.width = (100 - percH) + '%';
}
