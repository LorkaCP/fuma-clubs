document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('gid');
    const homeName = params.get('home');
    const awayName = params.get('away');

    if (!gid) {
        console.error("Aucun GID spécifié");
        return;
    }

    // URL de base pour les matchs (votre CSV principal)
    const BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=";
    const FINAL_URL = BASE_URL + gid;

    // URL pour les statistiques des joueurs
    const PLAYER_STATS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=2011937196&single=true&output=csv";

    let currentMatchId = null;

    fetch(FINAL_URL)
        .then(response => response.text())
        .then(csvText => {
            const rows = parseCSV(csvText);
            
            // Recherche du match spécifique
            const match = rows.find(r => r[1] === homeName && r[2] === awayName);

            const loader = document.getElementById('loader-container');
            const mainContent = document.getElementById('main-content');
            
            if (loader) loader.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';

            if (match) {
                currentMatchId = match[3]; // Capture de l'IDMatch (index 3 dans Matches.csv)
                updateUI(match);
                setupPlayerToggle(PLAYER_STATS_URL, currentMatchId);
            } else {
                console.error("Match non trouvé dans le CSV");
            }
        })
        .catch(err => console.error("Erreur chargement match:", err));
});

/**
 * Met à jour l'interface principale avec les données du match
 */
function updateUI(m) {
    // Labels et Logos
    document.getElementById('match-date').innerText = m[0].split(' ')[0];
    document.getElementById('name-home').innerText = m[1];
    document.getElementById('name-away').innerText = m[2];
    document.getElementById('logo-home').src = `logos/${m[1]}.png`;
    document.getElementById('logo-away').src = `logos/${m[2]}.png`;

    // Score
    document.getElementById('score-display').innerText = `${m[4]} : ${m[5]}`;

    // Buteurs
    document.getElementById('strikers-home').innerHTML = formatStrikers(m[6]);
    document.getElementById('strikers-away').innerHTML = formatStrikers(m[7]);

    // Barres de statistiques (Possession, Tirs, Passes, Tacles)
    updateBar('poss', m[8], m[9], true);
    updateBar('shots', m[10], m[11], false);
    
    // Pour les passes et tacles, on affiche "Réussis (Précision)"
    const labelPassHome = `${m[13]} (${m[14]}%)`;
    const labelPassAway = `${m[13]} (${m[15]}%)`; 
    updateBar('passes', m[14], m[15], false, true); 
    document.getElementById('val-passes-home').innerText = `${m[12]} (${m[14]}%)`;
    document.getElementById('val-passes-away').innerText = `${m[13]} (${m[15]}%)`;

    // Tacles
    document.getElementById('val-tackles-home').innerText = `${m[18]}/${m[16]}`;
    document.getElementById('val-tackles-away').innerText = `${m[19]}/${m[17]}`;
    updateBar('tackles', m[18], m[19], false, true);

    // Cartons Rouges
    document.getElementById('val-red-home').innerText = m[20];
    document.getElementById('val-red-away').innerText = m[21];

    // Homme du Match
    const motmName = m[22];
    if (motmName) {
        document.getElementById('motm-name').innerText = motmName;
    }
}

/**
 * Initialise le bouton pour afficher/masquer les joueurs
 */
function setupPlayerToggle(url, matchId) {
    const btn = document.getElementById('toggle-player-stats');
    const wrapper = document.getElementById('player-stats-wrapper');
    
    if (!btn) return;

    btn.onclick = () => {
        if (wrapper.classList.contains('hidden')) {
            wrapper.classList.remove('hidden');
            btn.innerHTML = `<i class="fas fa-chevron-up"></i> MASQUER LES STATS`;
            if (document.getElementById('player-stats-body').children.length === 0) {
                fetchPlayerStats(url, matchId);
            }
        } else {
            wrapper.classList.add('hidden');
            btn.innerHTML = `<i class="fas fa-users"></i> VOIR LES STATS JOUEURS`;
        }
    };
}

/**
 * Récupère les stats individuelles et les filtre par IDMatch
 */
function fetchPlayerStats(url, targetId) {
    const tbody = document.getElementById('player-stats-body');
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">Chargement des performances...</td></tr>`;

    fetch(url)
        .then(res => res.text())
        .then(csvText => {
            const rows = parseCSV(csvText);
            const seen = new Set();
            
            // Filtrage par IDMatch (index 1) et nom joueur (index 3) pour éviter les doublons
            const filtered = rows.filter(r => {
                const isMatch = r[1] === targetId;
                if (isMatch && !seen.has(r[3])) {
                    seen.add(r[3]);
                    return true;
                }
                return false;
            });

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">Aucune donnée individuelle.</td></tr>`;
                return;
            }

            tbody.innerHTML = filtered.map(p => {
                const note = parseFloat(p[4]) || 0;
                const noteColor = note >= 7 ? 'var(--fuma-primary)' : (note < 5.5 ? '#ff4d4d' : '#fff');
                
                // Rapport Passes: Réussies (index 9) / Tentées (index 8) + % (index 10)
                const passesDisplay = `${p[9]}/${p[8]} <span style="font-size:0.7rem; color:#777;">(${p[10]}%)</span>`;
                
                return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 12px 8px;">
                        <div style="font-weight: 600;">${p[3]}</div>
                        <div style="font-size: 0.65rem; color: #aaa; text-transform: uppercase;">${p[2]}</div>
                    </td>
                    <td style="text-align:center; font-weight: 800; color: ${noteColor};">${p[4]}</td>
                    <td style="text-align:center;">${p[5]}</td>
                    <td style="text-align:center;">${p[6]}</td>
                    <td style="text-align:center;">${passesDisplay}</td>
                    <td style="text-align:center; font-weight: 600; color: var(--fuma-primary);">${p[12]}</td>
                </tr>`;
            }).join('');
        })
        .catch(err => {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Erreur de chargement.</td></tr>`;
        });
}

/**
 * Anime les barres de statistiques
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

function formatStrikers(str) {
    if (!str || str === '0' || str.trim() === '') return '';
    return str.split('|').map(s => `<div><i class="fas fa-futbol" style="font-size:0.6rem;"></i> ${s.trim()}</div>`).join('');
}

function parseCSV(text) {
    return text.split('\n').map(row => {
        let cells = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
            if (row[i] === '"') inQuotes = !inQuotes;
            else if (row[i] === ',' && !inQuotes) {
                cells.push(current.trim());
                current = '';
            } else current += row[i];
        }
        cells.push(current.trim());
        return cells;
    });
}
