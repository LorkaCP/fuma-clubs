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
                    <a href="#">Cup</a>
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

    // --- 6. PAGE PROFIL CLUB DYNAMIQUE ---
    async function loadClubProfile() {
        const detailContainer = document.getElementById('club-details');
        if (!detailContainer) return;

        // Récupérer le nom du club dans l'URL
        const params = new URLSearchParams(window.location.search);
        const clubName = params.get('name');

        if (!clubName) {
            detailContainer.innerHTML = "<p>Club non trouvé.</p>";
            return;
        }

        const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjnFfFWUPpHaWofmJ6UUEfw9VzAaaqTnS2WGm4pDSZxfs7FfEOOEfMprH60QrnWgROdrZU-s5VI9rR/pub?gid=252630071&single=true&output=csv';

        try {
            const resp = await fetch(url);
            const text = await resp.text();
            const lines = text.trim().split("\n");
            const headers = lines[0].split(",");
            
            // Trouver les index des colonnes
            const teamIdx = headers.indexOf('TEAMS');
            const crestIdx = headers.indexOf('CREST');
            const managerIdx = headers.indexOf('MANAGER'); // Exemple si vous avez cette colonne

            // Chercher le club spécifique
            const clubData = lines.slice(1).find(line => {
                const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(s => s.replace(/^"|"$/g,'')) || [];
                return values[teamIdx]?.trim() === clubName;
            });

            if (clubData) {
                const v = clubData.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(s => s.replace(/^"|"$/g,'')) || [];
                
                detailContainer.innerHTML = `
                    <div style="text-align: center; animation: fadeIn 0.8s ease;">
                        <img src="${v[crestIdx]}" alt="${v[teamIdx]}" style="width: 150px; height: 150px; object-fit: contain; margin-bottom: 20px;">
                        <h1 style="font-size: 2.5rem; color: var(--fuma-primary); text-transform: uppercase; letter-spacing: 4px;">${v[teamIdx]}</h1>
                        <p style="color: var(--fuma-text-dim);">Official FUMA Pro League Member</p>
                        
                        <div style="margin-top: 40px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                            <div style="background: var(--fuma-bg-card); padding: 20px; border-radius: 10px; border: var(--fuma-border);">
                                <h3 style="color: var(--fuma-primary); font-size: 0.8rem; text-transform: uppercase;">Manager</h3>
                                <p>${v[managerIdx] || 'Non renseigné'}</p>
                            </div>
                            <div style="background: var(--fuma-bg-card); padding: 20px; border-radius: 10px; border: var(--fuma-border);">
                                <h3 style="color: var(--fuma-primary); font-size: 0.8rem; text-transform: uppercase;">Statut</h3>
                                <p>Actif</p>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                detailContainer.innerHTML = "<p>Détails du club introuvables.</p>";
            }
        } catch (e) {
            console.error(e);
            detailContainer.innerHTML = "<p>Erreur lors du chargement des données.</p>";
        }
    }

    // Appeler la fonction au chargement
    loadClubProfile();

    // --- INITIALISATION ---
    injectNavigation();
    fetchFumaClubs();
});


