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
            
            // On cherche le match (TeamHome est à l'index 5, TeamAway à l'index 6)
            const match = rows.find(r => r[5] === homeName && r[6] === awayName);

            if (match) {
                updateUI(match);
            } else {
                document.querySelector('.match-detail-wrapper').innerHTML = "<h2>Match non trouvé.</h2><p>Vérifiez que les noms d'équipes correspondent au calendrier.</p>";
            }
        })
        .catch(err => console.error("Erreur lors de la récupération des données:", err));
});

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
    /* MAPPING BASÉ SUR VOTRE LISTE DE COLONNES :
       0:Matchday, 1:StartDate, 2:EndDate, 3:CrestHome, 4:CrestAway, 
       5:TeamHome, 6:TeamAway, 7:ScoreHome, 8:ScoreAway, 9:StrikerHome, 
       10:StrikerAway, 11:%PossessionHome, 12:%PossessionAway, 13:ShotsHome, 
       14:ShotsAway, 15:PassesAttemptedHome, 16:PassesAttemptedAway, 
       17:%AccuracyHome, 18:%AccuracyAway, 19:MotM, 20:LinkHome
    */

    // Infos Matchday & Date
    document.getElementById('matchday-label').innerText = `Matchday ${m[0]}`;
    document.getElementById('match-date').innerText = m[1];

    // Équipes & Score
    document.getElementById('logo-home').src = m[3];
    document.getElementById('logo-away').src = m[4];
    
    // Nom Domicile + Lien
    const homeLink = document.getElementById('link-home');
    homeLink.innerText = m[5];
    homeLink.href = m[20] || "#"; // LinkHome col 20
    
    document.getElementById('name-away').innerText = m[6];
    document.getElementById('score-display').innerText = `${m[7]} : ${m[8]}`;

    // Mise à jour des barres de statistiques
    updateBar('poss', m[11], m[12], true);  // Possession
    updateBar('shots', m[13], m[14], false); // Tirs
    updateBar('passes', m[15], m[16], false); // Passes
    updateBar('acc', m[17], m[18], true);    // Précision

    // Détails Buteurs & MotM
    document.getElementById('strikers-home').innerText = m[9] || '-';
    document.getElementById('strikers-away').innerText = m[10] || '-';
    document.getElementById('motm-name').innerText = m[19] || 'N/A';
}

/**
 * @param {string} id - Identifiant HTML (poss, shots, passes, acc)
 * @param {string} valH - Valeur Domicile
 * @param {string} valA - Valeur Extérieur
 * @param {boolean} isPercent - Si true, on affiche le symbole %
 */
function updateBar(id, valH, valA, isPercent) {
    // Nettoyage des valeurs (on enlève les % si présents et on convertit en nombre)
    const h = parseFloat(String(valH).replace('%', '').replace(',', '.')) || 0;
    const a = parseFloat(String(valA).replace('%', '').replace(',', '.')) || 0;
    
    const total = h + a;
    const percH = total === 0 ? 50 : (h / total) * 100;

    // Affichage texte
    const labelH = document.getElementById(`val-${id}-home`);
    const labelA = document.getElementById(`val-${id}-away`);
    
    if(labelH) labelH.innerText = isPercent ? h + '%' : h;
    if(labelA) labelA.innerText = isPercent ? a + '%' : a;

    // Animation des barres
    const barH = document.getElementById(`bar-${id}-home`);
    const barA = document.getElementById(`bar-${id}-away`);
    
    if(barH) barH.style.width = percH + '%';
    if(barA) barA.style.width = (100 - percH) + '%';
}
