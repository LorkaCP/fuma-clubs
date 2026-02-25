document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('gid');
    const homeName = params.get('home');
    const awayName = params.get('away');

    if (!gid) return console.error("Aucun GID spécifié");

    // URLs Google Sheets
    const BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=";
    const PLAYER_STATS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=158406798&single=true&output=csv";

    let currentMatchId = null;

    fetch(BASE_URL + gid)
        .then(res => res.text())
        .then(csvText => {
            const rows = parseCSV(csvText);
            
            // Dans FIXTURES_S1DIV1.csv : Home=6, Away=7
            const match = rows.find(r => r[6] === homeName && r[7] === awayName);

            document.getElementById('loader-container').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';

            if (match) {
                currentMatchId = match[8]; // IDMatch (Index 8)
                updateUI(match);
                setupPlayerToggle(PLAYER_STATS_URL, currentMatchId);
            } else {
                document.getElementById('main-content').innerHTML = `
                    <div style="text-align:center; padding:50px; color:#aaa;">
                        <i class="fas fa-exclamation-triangle" style="font-size:2rem; color:var(--fuma-primary);"></i>
                        <p>Match non trouvé : <b>${homeName}</b> vs <b>${awayName}</b></p>
                    </div>`;
            }
        });
});

function updateUI(m) {
    // Mapping FIXTURES_S1DIV1.csv
    document.getElementById('match-date').innerText = m[1];
    document.getElementById('name-home').innerText = m[6];
    document.getElementById('name-away').innerText = m[7];
    document.getElementById('logo-home').src = `logos/${m[6]}.png`;
    document.getElementById('logo-away').src = `logos/${m[7]}.png`;
    document.getElementById('score-display').innerText = `${m[9]} : ${m[10]}`;
    document.getElementById('strikers-home').innerHTML = formatStrikers(m[11]);
    document.getElementById('strikers-away').innerHTML = formatStrikers(m[12]);

    // Stats Collectives
    updateBar('poss', m[13], m[14], true);
    updateBar('shots', m[15], m[16], false);
    
    // Passes Collectives (Index 17/18 = Tentees, 19/20 = %)
    document.getElementById('val-passes-home').innerText = `${m[17]} (${m[19]}%)`;
    document.getElementById('val-passes-away').innerText = `${m[18]} (${m[20]}%)`;
    updateBar('passes', m[19], m[20], false, true);

    // Tacles Collectifs (Index 23/24 = Reussis, 21/22 = Tentes)
    document.getElementById('val-tackles-home').innerText = `${m[23]}/${m[21]}`;
    document.getElementById('val-tackles-away').innerText = `${m[24]}/${m[22]}`;
    updateBar('tackles', m[23], m[24], false, true);

    document.getElementById('val-red-home').innerText = m[25];
    document.getElementById('val-red-away').innerText = m[26];
    document.getElementById('motm-name').innerText = m[27] || "N/A";
}

function setupPlayerToggle(url, matchId) {
    const btn = document.getElementById('toggle-player-stats');
    const wrapper = document.getElementById('player-stats-wrapper');

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

function fetchPlayerStats(url, targetId) {
    const tbody = document.getElementById('player-stats-body');
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">Chargement...</td></tr>`;

    fetch(url)
        .then(res => res.text())
        .then(csvText => {
            const rows = parseCSV(csvText);
            const seen = new Set();
            
            // MAPPING Stats_Joueurs (1).csv :
            // Index 1: IDMatch | Index 2: Equipe | Index 3: Joueur | Index 4: Note
            // Index 5: Buts | Index 6: Assists | Index 8: Passes_Tentees
            // Index 9: Passes_Reussies | Index 10: %_Passes | Index 12: Tacles_Reussis
            
            const filtered = rows.filter(r => r[1] === targetId && !seen.has(r[3]) && seen.add(r[3]));

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">Aucune donnée individuelle (ID: ${targetId})</td></tr>`;
                return;
            }

            tbody.innerHTML = filtered.map(p => {
                const note = parseFloat(p[4]) || 0;
                const noteColor = note >= 7 ? 'var(--fuma-primary)' : (note < 5.5 ? '#ff4d4d' : '#fff');
                
                // Format Rapport de passes : Réussies/Tentées (%)
                const passesDisp = `${p[9]}/${p[8]} <span style="font-size:0.7rem; color:#777;">(${p[10]}%)</span>`;
                
                return `
                <tr>
                    <td style="padding: 12px 8px;">
                        <div style="font-weight: 600;">${p[3]}</div>
                        <div style="font-size: 0.65rem; color: #aaa; text-transform: uppercase;">${p[2]}</div>
                    </td>
                    <td style="text-align:center; font-weight: 800; color: ${noteColor};">${p[4]}</td>
                    <td style="text-align:center;">${p[5]}</td>
                    <td style="text-align:center;">${p[6]}</td>
                    <td style="text-align:center;">${passesDisp}</td>
                    <td style="text-align:center; font-weight: 600; color: var(--fuma-primary);">${p[12]}</td>
                </tr>`;
            }).join('');
        });
}

function updateBar(id, valH, valA, isPercent, onlyBar = false) {
    const h = parseFloat(String(valH).replace(',', '.')) || 0;
    const a = parseFloat(String(valA).replace(',', '.')) || 0;
    const total = h + a;
    const percH = total === 0 ? 50 : (h / total) * 100;

    if (!onlyBar) {
        const lh = document.getElementById(`val-${id}-home`);
        const la = document.getElementById(`val-${id}-away`);
        if(lh) lh.innerText = isPercent ? (Math.round(h) + '%') : h;
        if(la) la.innerText = isPercent ? (Math.round(a) + '%') : a;
    }
    const bh = document.getElementById(`bar-${id}-home`);
    const ba = document.getElementById(`bar-${id}-away`);
    if(bh) bh.style.width = percH + '%';
    if(ba) ba.style.width = (100 - percH) + '%';
}

function formatStrikers(str) {
    if (!str || str === '0' || str.trim() === '') return '';
    return str.split('|').map(s => `<div><i class="fas fa-futbol" style="font-size:0.6rem;"></i> ${s.trim()}</div>`).join('');
}

function parseCSV(text) {
    return text.split(/\r?\n/).filter(line => line.trim() !== "").map(line => {
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
