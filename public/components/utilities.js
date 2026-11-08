// Utilities Component - Gold Price, Currency Exchange Converter, and Todo checklist

class UtilitiesService {
    constructor() {

        this.init();
    }

    init() {


        // Hook Category Filters & Search for Utilities tab
        const filterBtns = document.querySelectorAll('#util-categories .cat-btn');
        
        const savedUtilCat = localStorage.getItem('siam_daily_util_cat');
        if (savedUtilCat && filterBtns.length > 0) {
            filterBtns.forEach(b => {
                if (b.getAttribute('data-util-cat') === savedUtilCat) b.classList.add('active');
                else b.classList.remove('active');
            });
        }

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                localStorage.setItem('siam_daily_util_cat', btn.getAttribute('data-util-cat'));
                this.filterAndSearchUtilities();
            });
        });

        const searchInput = document.getElementById('util-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterAndSearchUtilities());
        }

        // Apply initial filter
        this.filterAndSearchUtilities();

        // Initialize Emergency Contacts Tab search/filter
        this.initEmergencyContactsPage();
    }

    initEmergencyContactsPage() {
        // Hook Category Filters & Search for Emergency tab
        const filterBtns = document.querySelectorAll('#emergency-categories .cat-btn');
        
        const savedEmCat = localStorage.getItem('siam_daily_em_cat');
        if (savedEmCat && filterBtns.length > 0) {
            filterBtns.forEach(b => {
                if (b.getAttribute('data-em-cat') === savedEmCat) b.classList.add('active');
                else b.classList.remove('active');
            });
        }

        if (filterBtns.length > 0) {
            filterBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    filterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    localStorage.setItem('siam_daily_em_cat', btn.getAttribute('data-em-cat'));
                    this.filterEmergencyContacts();
                });
            });
        }

        const searchInput = document.getElementById('emergency-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterEmergencyContacts());
        }

        // Apply initial filter
        this.filterEmergencyContacts();
    }

    filterEmergencyContacts() {
        const searchInput = document.getElementById('emergency-search-input');
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const activeBtn = document.querySelector('#emergency-categories .cat-btn.active');
        const category = activeBtn ? activeBtn.getAttribute('data-em-cat') : 'all';

        const groups = document.querySelectorAll('#emergency-grid .emergency-group-card');
        let totalVisibleContacts = 0;

        groups.forEach(group => {
            const groupCat = group.getAttribute('data-em-group');
            const matchesCat = (category === 'all' || groupCat === category);
            
            const contactItems = group.querySelectorAll('.contact-item');
            let visibleContactsInGroup = 0;

            contactItems.forEach(item => {
                const keywords = item.getAttribute('data-em-keywords') ? item.getAttribute('data-em-keywords').toLowerCase() : '';
                const title = item.querySelector('strong') ? item.querySelector('strong').textContent.toLowerCase() : '';
                const desc = item.querySelector('span:not(.number)') ? item.querySelector('span:not(.number)').textContent.toLowerCase() : '';
                const num = item.querySelector('.number') ? item.querySelector('.number').textContent : '';

                const matchesSearch = !query || 
                                      keywords.includes(query) || 
                                      title.includes(query) || 
                                      desc.includes(query) || 
                                      num.includes(query);

                if (matchesCat && matchesSearch) {
                    item.style.setProperty('display', 'flex', 'important');
                    visibleContactsInGroup++;
                    totalVisibleContacts++;
                } else {
                    item.style.setProperty('display', 'none', 'important');
                }
            });

            // If a group has matching items, show the group, otherwise hide it
            if (visibleContactsInGroup > 0) {
                group.style.display = 'block';
            } else {
                group.style.display = 'none';
            }
        });

        const noResults = document.getElementById('emergency-no-results');
        if (noResults) {
            noResults.style.display = totalVisibleContacts === 0 ? 'block' : 'none';
        }
    }

    filterAndSearchUtilities() {
        const searchInput = document.getElementById('util-search-input');
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const activeBtn = document.querySelector('#util-categories .cat-btn.active');
        const category = activeBtn ? activeBtn.getAttribute('data-util-cat') : 'all';

        const sections = document.querySelectorAll('#utilities-grid .util-section');
        let totalVisibleCount = 0;

        sections.forEach(section => {
            const sectionCat = section.getAttribute('data-util-section');
            const cards = section.querySelectorAll('.dashboard-card');
            let visibleCardsInSection = 0;

            cards.forEach(card => {
                const h3 = card.querySelector('h3');
                const cardTitle = h3 ? h3.textContent.toLowerCase() : '';

                const matchesCat = (category === 'all' || sectionCat === category);
                const matchesSearch = !query || cardTitle.includes(query);

                if (matchesCat && matchesSearch) {
                    card.style.setProperty('display', 'block', 'important');
                    visibleCardsInSection++;
                    totalVisibleCount++;
                } else {
                    card.style.setProperty('display', 'none', 'important');
                }
            });

            // Show section only if category matches (or all) AND it has visible cards
            const sectionMatchesCat = (category === 'all' || sectionCat === category);
            if (sectionMatchesCat && visibleCardsInSection > 0) {
                section.style.setProperty('display', 'block', 'important');
            } else {
                section.style.setProperty('display', 'none', 'important');
            }
        });

        const noResults = document.getElementById('util-no-results');
        if (noResults) {
            noResults.style.setProperty('display', totalVisibleCount === 0 ? 'block' : 'none', 'important');
        }
    }




    hslToHex(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
    }

}

// Instantiate Global Utilities Service
window.utilitiesService = new UtilitiesService();
