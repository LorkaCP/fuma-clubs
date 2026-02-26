/**
 * FUMA CLUBS - INFO MATCH LOGIC (SOFASCORE STYLE)
 * Gère l'affichage dynamique des stats d'équipe et des joueurs.
 */

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('gid');
    const homeName = params.get('home');
    const awayName = params.get('away');

    if (!gid || !homeName || !awayName) {
        console.error("Paramètres manquants dans l'URL");
        return;
    }

    const BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=";
    const FINAL_URL = BASE_URL + gid;

    fetch(FINAL_URL)
        .then(response => response.text())
        .then(csvText => {
            const rows = parseCSV(csvText);
            // Recherche du match par noms d'équipes (Colonnes 6 et 7 du CSV Fixtures)
            const match = rows.find(r => r[6] === homeName && r[7] === awayName);

            const loader = document.getElementById('loader-container');
            const mainContent = document.getElementById('main-content');
            
            if (loader) loader.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';

            if (match) {
                updateUI(match);
            } else {
                console.error("Match non trouvé");
            }
        })
        .catch(err => console.error("Erreur Fetch:", err));
});

// URL de la base de données globale des joueurs (DATABASE.csv)
const PLAYERS_DB_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=420142588&single=true&output=csv";

/**
 * Met à jour l'interface utilisateur
 */
async function updateUI(m) {
    const scoreHomeRaw = m[9];
    // Un match est considéré comme "joué" si le score n'est pas vide ou égal à #REF!
    const isPlayed = scoreHomeRaw !== "#REF!" && scoreHomeRaw !== "" && scoreHomeRaw !== null;

    // Éléments DOM
    const upcomingSection = document.getElementById('upcoming-section');
    const playedContent = document.getElementById('played-content');
    const matchNav = document.getElementById('match-nav');
    const strikersContainer = document.getElementById('strikers-container');

    // Identité des équipes (Toujours affichée)
    document.getElementById('name-home').innerText = m[6];
    document.getElementById('name-away').innerText = m[7];
    document.getElementById('logo-home').src = m[3] || '';
    document.getElementById('logo-away').src = m[4] || '';

    if (!isPlayed) {
        // --- MODE MATCH NON PUBLIÉ ---
        upcomingSection.style.display = 'block';
        playedContent.style.display = 'none';
        matchNav.style.display = 'none';
        strikersContainer.style.display = 'none';

        document.getElementById('score-home').innerText = "-";
        document.getElementById('score-away').innerText = "-";

        // Configuration du bouton de Report
        const params = new URLSearchParams(window.location.search);
        const reportUrl = `report.html?home=${encodeURIComponent(m[6])}&away=${encodeURIComponent(m[7])}&gid=${params.get('gid')}`;
        document.getElementById('btn-report-link').href = reportUrl;

    } else {
        // --- MODE MATCH JOUÉ ---
        upcomingSection.style.display = 'none';
        playedContent.style.display = 'block';
        matchNav.style.display = 'flex';
        strikersContainer.style.display = 'grid';

        // Score et Buteurs
        document.getElementById('score-home').innerText = m[9];
        document.getElementById('score-away').innerText = m[10];
        document.getElementById('strikers-home').innerHTML = formatStrikers(m[11]);
        document.getElementById('strikers-away').innerHTML = formatStrikers(m[12]);

        // Statistiques d'équipe (Barres)
        updateBar('possession', m[13], m[14], true);
        updateBar('shots', m[15], m[16], false);
        
        // Passes (Affichage "Réussies (Précision%)")
        updateBar('passes', m[19], m[20], true);
        document.getElementById('val-passes-home').innerText = `${m[17]} (${m[19]}%)`;
        document.getElementById('val-passes-away').innerText = `${m[18]} (${m[20]}%)`;

        // Tacles (Affichage "Réussis/Tentés")
        updateBar('tackles', m[23], m[24], false);
        document.getElementById('val-tackles-home').innerText = `${m[23]}/${m[21]}`;
        document.getElementById('val-tackles-away').innerText = `${m[24]}/${m[22]}`;

        // Homme du Match
        if (m[27] && m[27] !== '0') {
            document.getElementById('motm-container').innerHTML = `
                <div style="margin-top:10px; color:var(--fuma-primary); font-size:0.8rem; font-weight:800;">
                    <i class="fas fa-star"></i> MOTM: ${m[27]}
                </div>`;
        }

        // Chargement des joueurs depuis DATABASE
        document.getElementById('title-home').innerText = m[6];
        document.getElementById('title-away').innerText = m[7];
        loadPlayerStats(m[8]); // m[8] est l'IDMatch
    }
}

/**
 * Récupère et affiche les statistiques individuelles des joueurs
 */
async function loadPlayerStats(matchId) {
    try {
        const response = await fetch(PLAYERS_DB_URL);
        const csvText = await response.text();
        const players = parseCSV(csvText);
        
        // Filtrer les joueurs appartenant à ce MATCH_ID (colonne 5 de DATABASE)
        const matchPlayers = players.filter(p => p[5] === matchId);
        
        // Trier par note (colonne 6)
        matchPlayers.sort((a, b) => parseFloat(b[6]) - parseFloat(a[6]));

        const homeName = document.getElementById('name-home').innerText;
        let homeHtml = '', awayHtml = '';

        matchPlayers.forEach(p => {
            const row = `
                <div class="player-row">
                    <div style="font-weight:600;">${p[1]}</div>
                    <div class="p-note" style="background:${getNoteColor(p[6])}">${p[6]}</div>
                    <div style="text-align:center">${p[7] > 0 ? p[7]+'⚽' : '-'}</div>
                    <div style="text-align:center">${p[12]}%</div>
                    <div style="text-align:center">${p[15]}%</div>
                </div>`;
            
            if (p[3] === homeName) homeHtml += row;
            else awayHtml += row;
        });

        document.getElementById('list-players-home').innerHTML = homeHtml || "Aucune donnée";
        document.getElementById('list-players-away').innerHTML = awayHtml || "Aucune donnée";

    } catch (err) {
        console.error("Erreur Joueurs:", err);
    }
}

/**
 * Fonctions utilitaires
 */

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tabId}')"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function updateBar(id, valH, valA, isPercent) {
    const h = parseFloat(String(valH).replace(',', '.')) || 0;
    const a = parseFloat(String(valA).replace(',', '.')) || 0;
    const total = h + a;
    const percH = total === 0 ? 50 : (h / total) * 100;

    const barH = document.getElementById(`bar-${id}-home`);
    const barA = document.getElementById(`bar-${id}-away`);
    if(barH) barH.style.width = percH + '%';
    if(barA) barA.style.width = (100 - percH) + '%';
    
    // Libellés par défaut si non gérés spécifiquement dans updateUI
    if (id === 'possession' || id === 'shots') {
        document.getElementById(`val-${id}-home`).innerText = isPercent ? Math.round(h) + '%' : h;
        document.getElementById(`val-${id}-away`).innerText = isPercent ? Math.round(a) + '%' : a;
    }
}

function getNoteColor(note) {
    const n = parseFloat(note);
    if (n >= 8) return '#11a85d';
    if (n >= 7) return '#91ba33';
    if (n >= 6) return '#e2b01b';
    return '#f85757';
}

function formatStrikers(str) {
    if (!str || str === '0' || str === '#REF!') return '';
    return str.split('|').map(s => `<div>${s.trim()} <i class="fas fa-futbol" style="font-size:0.6rem; opacity:0.5;"></i></div>`).join('');
}

function parseCSV(text) {
    const lines = text.split('\n');
    return lines.map(line => {
        const result = [];
        let cur = '', inQuotes = false;
        for (let char of line) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { result.push(cur.trim()); cur = ''; }
            else cur += char;
        }
        result.push(cur.trim());
        return result;
    });
}
