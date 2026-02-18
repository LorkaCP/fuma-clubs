document.addEventListener('DOMContentLoaded', () => {
    let allClubs = [];
    
    // --- 1. INJECTION DU MENU ---
    function injectNavigation() {
        const navElement = document.getElementById('main-nav');
        if (!navElement) return;

        // Détecte le nom du fichier actuel pour mettre le lien en surbrillance
        const path = window.location.pathname;
        const page = path.split("/").pop() || 'index.html';

        navElement.innerHTML = `
            <div class="nav-container">
                <a href="index.html" class="nav-logo">FUMA CLUBS</a>
                <button class="fuma-burger" id="burger">
                    <span></span><span></span><span></span>
                </button>
                <div class="nav-links" id="navLinks">
                    <a href="index.html" class="${page === 'index.html' ? 'active' : ''}">Home</a>
                    <a href="clubs.html" class="${page === 'clubs.html' ? 'active' : ''}">Clubs</a>
                    <a href="#">League</a>
                    <a href="#">Rules</a>
                    <a href="https://discord.gg/xPz9FBkdtm" target="_blank">
                        <i class="fab fa-discord"></i> Discord
                    </a>
                    <a href="#" style="color:var(--fuma-primary)">Profile</a>
                </div>
            </div>
        `;

        // Active le menu burger après l'injection
        setupBurger();
    }

    // --- 2. GESTION DU BURGER MENU ---
    function setupBurger() {
        const burger = document.getElementById('burger');
        const navLinks = document.getElementById('navLinks');
        if (burger && navLinks) {
            burger.addEventListener('click', () => {
                burger.classList.toggle('active');
                navLinks.classList.toggle('active');
            });
        }
    }

    // --- 3. SCROLL & BACK TO TOP ---
    const backBtn = document.getElementById('backTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) backBtn?.classList.add('visible');
        else backBtn?.classList.remove('visible');
    });

    backBtn?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // --- 4. FETCH CLUBS (Google Sheets) ---
    async function fetchFumaClubs() {
        const clubContainer = document.getElementById('fuma-js-clubs');
        if (!clubContainer) return;

        const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=252630071&single=true&output=csv';
        
        try {
            const resp = await fetch(url);
            const text = await resp.text();
            const lines = text.trim().split("\n");
            const headers = lines[0].split(",");
            const teamIdx = headers.indexOf('TEAMS');
            const crestIdx = headers.indexOf('CREST');

            allClubs = lines.slice(1).map(line => {
                const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(s => s.replace(/^"|"$/g,'')) || [];
                return {
                    name: values[teamIdx]?.trim(),
                    logo: values[crestIdx]?.trim()
                };
            }).filter(c => c.name && c.logo && !c.name.toLowerCase().includes('free agent'));

            renderClubs(allClubs);
        } catch (e) {
            clubContainer.innerHTML = "<div class='fuma-loading-wrapper'>Error loading clubs.</div>";
            console.error(e);
        }
    }

    function renderClubs(clubsList) {
        const clubContainer = document.getElementById('fuma-js-clubs');
        if (!clubContainer) return;
        clubContainer.innerHTML = '';

        if (clubsList.length === 0) {
            clubContainer.innerHTML = '<div style="color:var(--fuma-text-dim); grid-column:1/-1; text-align:center;">No clubs found.</div>';
            return;
        }

        clubsList.forEach(club => {
            const card = document.createElement('a');
            card.href = `club.html?name=${encodeURIComponent(club.name)}`;
            card.className = 'club-card';
            card.innerHTML = `
                <img src="${club.logo}" alt="${club.name}" loading="lazy" onerror="this.parentElement.remove()">
                <span class="club-name">${club.name}</span>
            `;
            clubContainer.appendChild(card);
        });
    }

    // --- 5. RECHERCHE ---
    const searchInput = document.getElementById('fuma-search');
    searchInput?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allClubs.filter(c => c.name.toLowerCase().includes(term));
        renderClubs(filtered);
    });

    // --- INITIALISATION ---
    injectNavigation();
    fetchFumaClubs();
});
