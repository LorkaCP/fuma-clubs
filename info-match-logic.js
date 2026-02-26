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
            // Recherche du match : Colonne 6 (Home) et Colonne 7 (Away)
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
        .catch(err => console.error("Erreur lors du fetch :", err));
});

// URL de la base de données des joueurs (déclarée en global pour être accessible partout)
const PLAYERS_DB_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=420142588&single=true&output=csv";

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

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    const clickedBtn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if (clickedBtn) clickedBtn.classList.add('active');
    
    const targetContent = document.getElementById(tabId);
    if (targetContent) targetContent.classList.add('active');
}

async function updateUI(m) {
    // --- PARTIE 1 : STATS ÉQUIPE (Basé sur ton fichier FIXTURES) ---
    // Noms et Logos
    document.getElementById('name-home').innerText = m[6];
    document.getElementById('name-away').innerText = m[7];
    document.getElementById('logo-home').src = m[3] || 'default-logo.png';
    document.getElementById('logo-away').src = m[4] || 'default-logo.png';

    // Score et Buteurs
    document.getElementById('score-home').innerText = m[9] || '0';
    document.getElementById('score-away').innerText = m[10] || '0';
    document.getElementById('strikers-home').innerHTML = formatStrikers(m[11]);
    document.getElementById('strikers-away').innerHTML = formatStrikers(m[12]);

    // Barres de stats (Possession, Tirs, Passes, Tacles)
    updateBar('possession', m[13], m[14], true);
    updateBar('shots', m[15], m[16], false);
    
    // Pour les passes et tacles, on affiche "Réussis (Total)"
    const passHome = `${m[19]}%`; // Précision
    const passAway = `${m[20]}%`;
    updateBar('passes', m[19], m[20], true);
    document.getElementById('val-passes-home').innerText = `${m[17]} (${m[19]}%)`;
    document.getElementById('val-passes-away').innerText = `${m[18]} (${m[20]}%)`;

    // Tacles
    updateBar('tackles', m[23], m[24], false);
    document.getElementById('val-tackles-home').innerText = `${m[23]}/${m[21]}`;
    document.getElementById('val-tackles-away').innerText = `${m[24]}/${m[22]}`;

    // Cartons rouges
    document.getElementById('val-red-home').innerText = m[25] || '0';
    document.getElementById('val-red-away').innerText = m[26] || '0';

    // Homme du Match
    const motmArea = document.getElementById('motm-container');
    if (m[27] && m[27] !== '0') {
        motmArea.innerHTML = `<div class="motm-badge"><i class="fas fa-star"></i> MOTM: ${m[27]}</div>`;
    }

    // --- PARTIE 2 : STATS JOUEURS (Basé sur DATABASE) ---
    document.getElementById('team-name-home-stats').innerText = m[6];
    document.getElementById('team-name-away-stats').innerText = m[7];

    loadPlayerStats(m[8]); // On utilise l'IDMatch (index 8) pour filtrer
}

async function loadPlayerStats(matchId) {
    try {
        const response = await fetch(PLAYERS_DB_URL);
        const csvText = await response.text();
        const players = parseCSV(csvText);
        
        // Filtrer par MATCH_ID (index 5 dans DATABASE.csv)
        const matchPlayers = players.filter(p => p[5] === matchId); 
        renderPlayers(matchPlayers);
    } catch (err) {
        console.error("Erreur stats joueurs:", err);
    }
}

function renderPlayers(players) {
    const homeList = document.getElementById('list-players-home');
    const awayList = document.getElementById('list-players-away');
    const homeName = document.getElementById('name-home').innerText;

    // Trier par note décroissante
    players.sort((a, b) => parseFloat(b[6]) - parseFloat(a[6]));

    let homeHtml = '';
    let awayHtml = '';

    players.forEach(p => {
        // p[1]: Nom, p[6]: Note, p[7]: Buts, p[12]: %Passes, p[15]: %Tacles
        const row = `
            <div class="player-row">
                <div class="p-name">${p[1]}</div>
                <div class="p-note" style="background:${getNoteColor(p[6])}">${p[6]}</div>
                <div style="text-align:center">${p[7] > 0 ? p[7]+' ⚽' : '-'}</div>
                <div style="text-align:center">${p[12]}%</div>
                <div style="text-align:center">${p[15]}%</div>
            </div>
        `;
        
        if (p[3] === homeName) homeHtml += row;
        else awayHtml += row;
    });

    homeList.innerHTML = homeHtml || '<div class="player-row">Aucune donnée</div>';
    awayList.innerHTML = awayHtml || '<div class="player-row">Aucune donnée</div>';
}

// Petite fonction bonus pour colorer les notes comme sur Sofascore
function getNoteColor(note) {
    const n = parseFloat(note);
    if (n >= 8) return '#11a85d'; // Vert foncé
    if (n >= 7) return '#91ba33'; // Vert clair
    if (n >= 6) return '#e2b01b'; // Jaune/Orange
    return '#f85757'; // Rouge
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
    if (!str || str === '0' || str.trim() === '' || str === '#REF!') return '';
    return str.split('|').map(s => {
        const name = s.trim();
        if (!name) return '';
        return `<div>${name} <i class="fas fa-futbol" style="font-size: 0.7rem; opacity: 0.6;"></i></div>`;
    }).join('');
}
