/**
 * FUMA CLUBS - INFO MATCH LOGIC
 */

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('gid'); 
    const homeName = params.get('home');
    const awayName = params.get('away');

    // 1. Logique du bouton "BACK TO FIXTURES"
    const btnBack = document.getElementById('btn-back-fixtures');
    if (btnBack) {
        btnBack.onclick = () => {
            window.location.href = `league.html?tab=fixtures`;
        };
    }

    if (!gid || !homeName || !awayName) {
        console.error("Paramètres URL manquants");
        return;
    }

    const TEAM_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=${gid}`;

    fetch(TEAM_URL)
        .then(res => res.text())
        .then(csv => {
            const rows = parseCSV(csv);
            const match = rows.find(r => r[6] === homeName && r[7] === awayName);

            if (document.getElementById('loader-container')) 
                document.getElementById('loader-container').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';

            if (match) {
                updateUI(match);
            } else {
                console.error("Match non trouvé");
            }
        })
        .catch(err => console.error("Erreur de chargement :", err));
});

function updateUI(m) {
    const scoreHome = m[9];
    // Un match est considéré comme non joué si le score est vide, 0, ou contient une erreur
    const isPlayed = scoreHome !== "" && scoreHome !== "#REF!" && scoreHome !== undefined && scoreHome !== "0";

    const upcoming = document.getElementById('upcoming-section'); // Section avec le bouton Report
    const nav = document.getElementById('match-nav');             // Les onglets (Résumé / Joueurs)
    const playedContent = document.getElementById('played-content'); // Les tableaux de stats

    // Infos de base (Toujours visibles)
    document.getElementById('name-home').innerText = m[6];
    document.getElementById('name-away').innerText = m[7];
    document.getElementById('logo-home').src = m[3] || '';
    document.getElementById('logo-away').src = m[4] || '';

    if (!isPlayed) {
        // --- MODE MATCH NON JOUÉ ---
        document.getElementById('score-home').innerText = "-";
        document.getElementById('score-away').innerText = "-";
        
        if(upcoming) upcoming.style.display = 'block'; // Affiche le bouton DATA REPORT
        if(nav) nav.style.display = 'none';           // Cache les onglets
        if(playedContent) playedContent.style.display = 'none'; // Cache les tableaux de stats

        const btnReport = document.getElementById('btn-send-report');
        if (btnReport) {
            btnReport.onclick = () => {
                const params = new URLSearchParams(window.location.search);
                window.location.href = `report.html?home=${encodeURIComponent(params.get('home'))}&away=${encodeURIComponent(params.get('away'))}&gid=${params.get('gid')}`;
            };
        }
    } else {
        // --- MODE MATCH JOUÉ ---
        if(upcoming) upcoming.style.display = 'none';
        if(nav) nav.style.display = 'flex';
        if(playedContent) playedContent.style.display = 'block';
        
        switchTab('resume');

        // Score et Buteurs
        document.getElementById('score-home').innerText = m[9];
        document.getElementById('score-away').innerText = m[10];
        document.getElementById('strikers-home').innerHTML = formatStrikers(m[11]);
        document.getElementById('strikers-away').innerHTML = formatStrikers(m[12]);

        // Stats Équipe
        updateBar('possession', m[13], m[14], true);
        updateBar('shots', m[15], m[16], false);
        
        // ... (Reste de votre logique de stats)
        const pH = document.getElementById('val-passes-home');
        const pA = document.getElementById('val-passes-away');
        if(pH) pH.innerText = `${m[17] || 0} (${m[19] || 0}%)`;
        if(pA) pA.innerText = `${m[18] || 0} (${m[20] || 0}%)`;
        updateBar('passes', m[19], m[20], true, true);

        const tH = document.getElementById('val-tackles-home');
        const tA = document.getElementById('val-tackles-away');
        if(tH) tH.innerText = `${m[23] || 0}/${m[21] || 0}`;
        if(tA) tA.innerText = `${m[24] || 0}/${m[22] || 0}`;
        updateBar('tackles', m[23], m[24], false, true);

        loadPlayerStats(m[8], m[6], m[7]);
    }
}

async function loadPlayerStats(matchId, homeName, awayName) {
    const PLAYER_GID = "2074996595";
    const URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=${PLAYER_GID}`;
    
    try {
        const res = await fetch(URL);
        const csv = await res.text();
        const rows = parseCSV(csv);

        const homePlayers = rows.filter(r => (r[5]||"").trim() === matchId.trim() && (r[3]||"").trim() === homeName.trim());
        const awayPlayers = rows.filter(r => (r[5]||"").trim() === matchId.trim() && (r[3]||"").trim() === awayName.trim());

        renderPlayers('list-players-home', homePlayers);
        renderPlayers('list-players-away', awayPlayers);
    } catch (err) { console.error(err); }
}

// ... (Gardez vos fonctions utilitaires parseCSV, renderPlayers, getNoteColor, updateBar, formatStrikers, switchTab en bas du fichier)
