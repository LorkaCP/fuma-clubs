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

/**
 * Met à jour l'intégralité de l'interface avec les données du match
 * Gère l'affichage des stats équipe, des joueurs et le cas du match non joué.
 */
async function updateUI(m) {
    // 1. Détection de l'état du match
    // On considère le match non joué si le score est vide, nul ou contient "#REF!"
    const scoreHomeRaw = m[9];
    const isPlayed = scoreHomeRaw !== "#REF!" && scoreHomeRaw !== "" && scoreHomeRaw !== null && scoreHomeRaw !== undefined;

    // Éléments d'interface à contrôler
    const tabsContainer = document.querySelector('.match-tabs');
    const teamStatsSection = document.getElementById('team-stats');
    const playerStatsSection = document.getElementById('player-stats');
    const mainContent = document.getElementById('main-content');

    // 2. Mise à jour des éléments communs (Noms et Logos)
    document.getElementById('name-home').innerText = m[6] || "Équipe Dom.";
    document.getElementById('name-away').innerText = m[7] || "Équipe Ext.";
    document.getElementById('logo-home').src = m[3] || 'default-logo.png';
    document.getElementById('logo-away').src = m[4] || 'default-logo.png';

    // Nettoyage des anciens messages "Match à venir" s'ils existent
    const oldUpcoming = document.querySelector('.match-upcoming');
    if (oldUpcoming) oldUpcoming.remove();

    if (!isPlayed) {
        // --- MODE MATCH NON JOUÉ ---
        document.getElementById('score-home').innerText = "-";
        document.getElementById('score-away').innerText = "-";
        document.getElementById('strikers-home').innerHTML = "";
        document.getElementById('strikers-away').innerHTML = "";
        
        // Cacher les onglets et les sections de stats
        if (tabsContainer) tabsContainer.style.display = 'none';
        if (teamStatsSection) teamStatsSection.style.display = 'none';
        if (playerStatsSection) playerStatsSection.style.display = 'none';

        // Affichage du message informatif
        const upcomingHtml = `
            <div class="match-upcoming" style="display: block; text-align: center; padding: 50px 20px;">
                <span class="upcoming-badge" style="background: var(--fuma-primary); color: #000; padding: 5px 15px; border-radius: 20px; font-weight: 800; text-transform: uppercase;">Match à venir</span>
                <div class="match-date-info" style="margin-top: 20px; color: var(--fuma-text-dim);">
                    <i class="far fa-calendar-alt"></i> Semaine du ${m[1]} au ${m[2]}<br>
                    <strong style="color: var(--fuma-primary)">Journée ${m[0]}</strong>
                </div>
            </div>
        `;
        mainContent.insertAdjacentHTML('beforeend', upcomingHtml);

    } else {
        // --- MODE MATCH JOUÉ ---
        // Afficher les onglets
        if (tabsContainer) tabsContainer.style.display = 'flex';
        if (teamStatsSection) teamStatsSection.style.display = 'block';

        // Score et Buteurs
        document.getElementById('score-home').innerText = m[9];
        document.getElementById('score-away').innerText = m[10];
        document.getElementById('strikers-home').innerHTML = formatStrikers(m[11]);
        document.getElementById('strikers-away').innerHTML = formatStrikers(m[12]);

        // Mise à jour des barres de statistiques (Possession, Tirs, etc.)
        // updateBar(id, valeurDom, valeurExt, estUnPourcentage)
        updateBar('possession', m[13], m[14], true);
        updateBar('shots', m[15], m[16], false);
        
        // Passes : On affiche le nombre réussi et le % en libellé
        updateBar('passes', m[19], m[20], true); 
        document.getElementById('val-passes-home').innerText = `${m[17]} (${m[19]}%)`;
        document.getElementById('val-passes-away').innerText = `${m[18]} (${m[20]}%)`;

        // Tacles : On affiche Réussis/Tentés
        updateBar('tackles', m[23], m[24], false);
        document.getElementById('val-tackles-home').innerText = `${m[23]}/${m[21]}`;
        document.getElementById('val-tackles-away').innerText = `${m[24]}/${m[22]}`;

        // Cartons Rouges
        const redH = document.getElementById('val-red-home');
        const redA = document.getElementById('val-red-away');
        if(redH) redH.innerText = m[25] || '0';
        if(redA) redA.innerText = m[26] || '0';

        // Homme du Match (MOTM)
        const motmContainer = document.getElementById('motm-container');
        if (motmContainer && m[27] && m[27] !== '0') {
            motmContainer.innerHTML = `
                <div class="motm-badge" style="background: rgba(212,175,55,0.1); border: 1px solid var(--fuma-primary); color: var(--fuma-primary); padding: 10px; border-radius: 8px; display: inline-block; margin-top: 10px;">
                    <i class="fas fa-star"></i> MOTM : ${m[27]}
                </div>`;
        }

        // Chargement des statistiques individuelles des joueurs
        // On utilise l'ID du match (m[8]) pour filtrer la DATABASE des joueurs
        document.getElementById('team-name-home-stats').innerText = m[6];
        document.getElementById('team-name-away-stats').innerText = m[7];
        
        if (typeof loadPlayerStats === 'function') {
            loadPlayerStats(m[8]);
        }
    }
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
