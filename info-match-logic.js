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
    const PLAYERS_DB_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=420142588&single=true&output=csv";

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
/**
 * Met à jour l'intégralité de l'interface avec les données du match (Structure 2026)
 */


function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tabId}')"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

// Modifier la fonction updateUI pour inclure le chargement des joueurs
async function updateUI(m) {
    // ... (Gardez votre logique existante pour le score et les stats équipe)

    // Mise à jour des noms dans l'onglet Joueurs
    document.getElementById('team-name-home-stats').innerText = m[6];
    document.getElementById('team-name-away-stats').innerText = m[7];

    // Chargement des statistiques joueurs
    loadPlayerStats(m[2]); // m[2] est le MATCH_ID si présent dans votre CSV principal
}

async function loadPlayerStats(matchId) {
    try {
        const response = await fetch(PLAYERS_DB_URL);
        const csvText = await response.text();
        const players = parseCSV(csvText);
        
        // Filtrer les joueurs de ce match 
        const matchPlayers = players.filter(p => p[5] === matchId); 
        
        renderPlayers(matchPlayers);
    } catch (err) {
        console.error("Erreur stats joueurs:", err);
    }
}

function renderPlayers(players) {
    const homeList = document.getElementById('list-players-home');
    const awayList = document.getElementById('list-players-away');
    
    // Trier par note décroissante 
    players.sort((a, b) => parseFloat(b[6]) - parseFloat(a[6]));

    let homeHtml = '';
    let awayHtml = '';

    players.forEach(p => {
        // Structure de la ligne : Nom | Note | Buts | Pass% | Tacles
        const row = `
            <div class="player-row">
                <div class="p-name">${p[1]}</div>
                <div class="p-note">${p[6]}</div>
                <div style="text-align:center">${p[7] > 0 ? p[7]+'⚽' : '-'}</div>
                <div style="text-align:center">${p[12]}%</div>
                <div style="text-align:center">${p[14]}%</div>
            </div>
        `;
        
        // Séparer selon l'équipe (p[3] est CURRENT_TEAM) 
        if (p[3] === document.getElementById('name-home').innerText) {
            homeHtml += row;
        } else {
            awayHtml += row;
        }
    });

    homeList.innerHTML = homeHtml;
    awayList.innerHTML = awayHtml;
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
    // On vérifie si la chaîne est vide ou nulle
    if (!str || str === '0' || str.trim() === '') return '';
    
    // On divise par "|" au lieu de ","
    return str.split('|').map(s => {
        const name = s.trim();
        if (!name) return ''; // Évite les divs vides si on a des barres en trop
        return `<div>${name} <i class="fas fa-futbol" style="font-size: 0.7rem; opacity: 0.6;"></i></div>`;
    }).join('');
}
