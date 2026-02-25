document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('gid');
    const homeName = params.get('home');
    const awayName = params.get('away');

    if (!gid) return console.error("Aucun GID spécifié");

    const BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=";
    const PLAYER_STATS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=2011937196&single=true&output=csv";

    let currentMatchId = null;

    fetch(BASE_URL + gid)
        .then(res => res.text())
        .then(csvText => {
            const rows = parseCSV(csvText);
            const match = rows.find(r => r[6] === homeName && r[7] === awayName);

            document.getElementById('loader-container').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';

            if (match) {
                // On nettoie l'ID de tout ce qui n'est pas un chiffre
                currentMatchId = String(match[8]).replace(/\D/g, '').trim(); 
                updateUI(match);
                setupPlayerToggle(PLAYER_STATS_URL, currentMatchId);
            }
        });
});

function updateUI(m) {
    document.getElementById('match-date').innerText = m[1];
    document.getElementById('name-home').innerText = m[6];
    document.getElementById('name-away').innerText = m[7];
    document.getElementById('logo-home').src = `logos/${m[6]}.png`;
    document.getElementById('logo-away').src = `logos/${m[7]}.png`;
    document.getElementById('score-display').innerText = `${m[9]} : ${m[10]}`;
    document.getElementById('strikers-home').innerHTML = formatStrikers(m[11]);
    document.getElementById('strikers-away').innerHTML = formatStrikers(m[12]);
    updateBar('poss', m[13], m[14], true);
    updateBar('shots', m[15], m[16], false);
    document.getElementById('val-passes-home').innerText = `${m[17]} (${m[19]}%)`;
    document.getElementById('val-passes-away').innerText = `${m[18]} (${m[20]}%)`;
    updateBar('passes', m[19], m[20], false, true);
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
            
            const filtered = rows.filter(r => {
                if (!r[1] || r[1] === "IDMatch") return false;
                
                // NETTOYAGE EXTRÊME : on ne garde que les chiffres
                const cleanRowId = String(r[1]).replace(/\D/g, '').trim();
                const playerName = String(r[3] || "").trim();

                if (cleanRowId === targetId && playerName !== "" && !seen.has(playerName)) {
                    seen.add(playerName);
                    return true;
                }
                return false;
            });

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:orange;">Aucune stat trouvée (ID cherché: ${targetId})</td></tr>`;
                return;
            }

            filtered.sort((a, b) => parseFloat(b[4]) - parseFloat(a[4]));

            tbody.innerHTML = filtered.map(p => {
                const note = parseFloat(p[4]) || 0;
                const noteColor = note >= 7 ? '#d4af37' : (note < 5.5 ? '#ff4d4d' : '#fff');
                return `
                <tr>
                    <td style="padding: 12px 8px;">
                        <div style="font-weight: 600;">${p[3]}</div>
                        <div style="font-size: 0.65rem; color: #aaa;">${p[2]}</div>
                    </td>
                    <td style="text-align:center; font-weight: 800; color: ${noteColor};">${p[4]}</td>
                    <td style="text-align:center;">${p[5]}</td>
                    <td style="text-align:center;">${p[6]}</td>
                    <td style="text-align:center;">${p[9]}/${p[8]} <span style="font-size:0.7rem; color:#777;">(${p[10]}%)</span></td>
                    <td style="text-align:center; font-weight: 600; color: #d4af37;">${p[12]}</td>
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
    // Nettoie les retours à la ligne parasites et divise par ligne
    return text.split(/\r?\n/).filter(l => l.trim() !== "").map(line => {
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
