 // Affichage dynamique des saisons
const LEAGUE_CONFIG = {
        "S1": {
            "D1": { fixtures: "414200945", standings: "VOTRE_GID_STANDINGS_S1D1", stats: "VOTRE_GID_STATS_S1D1" },
            "D2": { fixtures: "2124517897", standings: "VOTRE_GID_STANDINGS_S1D2", stats: "VOTRE_GID_STATS_S1D2" }
        },
        "S2": {
            "D1": { fixtures: "2013965123", standings: "VOTRE_GID_STANDINGS_S2D1", stats: "VOTRE_GID_STATS_S2D1" }
        }
    };

    const BASE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?single=true&output=csv&gid=";

function initLeagueSelectors() {
        const seasonSelect = document.getElementById('season-master-select');
        const divisionSelect = document.getElementById('division-master-select');
        
        // Sécurité : on n'exécute ce code que si on est sur la page league.html
        if (!seasonSelect || !divisionSelect) return;

        const seasons = Object.keys(LEAGUE_CONFIG);
        seasonSelect.innerHTML = seasons.map(s => `<option value="${s}">Saison ${s.replace('S','')}</option>`).join('');

        const updateDivOptions = (s) => {
            const divs = Object.keys(LEAGUE_CONFIG[s]);
            divisionSelect.innerHTML = divs.map(d => `<option value="${d}">Division ${d.replace('D','')}</option>`).join('');
        };

        seasonSelect.addEventListener('change', (e) => {
            updateDivOptions(e.target.value);
            loadAllLeagueData();
        });

        divisionSelect.addEventListener('change', () => loadAllLeagueData());

        updateDivOptions(seasons[0]);
        loadAllLeagueData();
    }

    async function loadAllLeagueData() {
        const sSelect = document.getElementById('season-master-select');
        const dSelect = document.getElementById('division-master-select');
        if(!sSelect || !dSelect) return;

        const s = sSelect.value;
        const d = dSelect.value;
        const config = LEAGUE_CONFIG[s][d];

        const display = document.getElementById('current-league-display');
        if(display) display.innerText = `Saison ${s.replace('S','')} - Division ${d.replace('D','')}`;

        if (config.fixtures) fetchFixtures(config.fixtures);
    }

    // On lance l'initialisation de la league
    initLeagueSelectors();
