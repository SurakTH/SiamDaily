// News Component with dynamic categorization, search and local RSS-fallback

class NewsService {
    constructor() {
        this.articles = [];
        this.currentCategory = 'all';
        this.searchQuery = '';
        
        // Premium Curated Fallback News Database (Thai Language)
        this.localDatabase = [
            {
                id: 1,
                title: 'กรมอุตุฯ เตือนมรสุมกำลังแรงพัดผ่านกรุงเทพฯ เตรียมรับมือฝนตกหนักเย็นนี้',
                summary: 'รายงานสภาพอากาศระบุว่ามีกลุ่มฝนขนาดใหญ่กำลังเคลื่อนตัวเข้าสู่กรุงเทพฯ และปริมณฑล คาดว่าช่วงเวลา 17.00 - 20.00 น. จะมีฝนตกหนักในหลายพื้นที่ ส่งผลกระทบต่อสภาพการจราจรช่วงเลิกงาน ขอให้ประชาชนวางแผนการเดินทาง',
                category: 'weather-warning',
                source: 'สำนักพยากรณ์อากาศประเทศไทย',
                date: 'วันนี้',
                img: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=400&q=80',
                link: '#'
            },
            {
                id: 2,
                title: 'กทม. เตรียมพร้อมเปิดตัวสวนสาธารณะลอยน้ำแห่งใหม่ เชื่อมโยงรถไฟฟ้า BTS',
                summary: 'โครงการพัฒนาสีเขียวแห่งใหม่ใจกลางเมือง สวนสาธารณะลอยน้ำที่จะเปิดให้บริการเดินเล่น พักผ่อนหย่อนใจ และเชื่อมทางเชื่อมลอยฟ้า (Skywalk) จากสถานีรถไฟฟ้าบีทีเอส เพื่อให้คนเมืองเดินทางมาสูดอากาศบริสุทธิ์ได้ง่ายขึ้น',
                category: 'general',
                source: 'กทม. อัปเดต',
                date: 'วันนี้',
                img: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=80',
                link: '#'
            },
            {
                id: 3,
                title: 'Gemini 1.5 Pro เปิดใช้งานฟีเจอร์วิเคราะห์ข้อมูลความเร็วสูง รองรับภาษาไทยสมบูรณ์แบบ',
                summary: 'นักพัฒนาชาวไทยได้เฮหลังจากกูเกิลประกาศเปิดตัวโมเดลเอไอเวอร์ชันล่าสุด รองรับความเข้าใจบริบทความยาวพิเศษและการโต้ตอบภาษาไทยได้อย่างลื่นไหลเป็นธรรมชาติ คาดว่าจะช่วยสร้างนวัตกรรมใหม่ในเอเชียตะวันออกเฉียงใต้',
                category: 'technology',
                source: 'TechThailand',
                date: 'เมื่อวานนี้',
                img: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=400&q=80',
                link: '#'
            },
            {
                id: 4,
                title: 'อัตราเงินเฟ้อไทยชะลอตัวลง ส่งสัญญาณธนาคารกลางปรับลดดอกเบี้ยนโยบายปลายปีนี้',
                summary: 'กระทรวงพาณิชย์เปิดเผยตัวเลขดัชนีราคาผู้บริโภคสะท้อนเงินเฟ้ออยู่ในกรอบเป้าหมาย นักวิเคราะห์ชี้เป็นโอกาสดีที่คณะกรรมการนโยบายการเงินจะพิจารณาผ่อนคลายอัตราดอกเบี้ย เพื่อขับเคลื่อนเศรษฐกิจในภาคอสังหาฯ และการลงทุน',
                category: 'business',
                source: 'การเงินการธนาคาร Hub',
                date: '2 วันที่แล้ว',
                img: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=400&q=80',
                link: '#'
            },
            {
                id: 5,
                title: 'กรุงเทพฯ ติดอันดับ 5 เมืองน่าทำงานและท่องเที่ยวที่สุดสำหรับกลุ่ม Digital Nomads ทั่วโลก',
                summary: 'ผลสำรวจจากนิตยสารการท่องเที่ยวชื่อดังระบุว่า กรุงเทพมหานครยังคงครองใจผู้ทำงานทางไกลทั่วโลก เนื่องจากค่าครองชีพที่เหมาะสม บริการอินเทอร์เน็ตความเร็วสูง อาหารการกินที่สมบูรณ์ และมีสถานที่ Co-working space ที่เป็นมิตร',
                category: 'general',
                source: 'Siam Travel Guide',
                date: '2 วันที่แล้ว',
                img: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=400&q=80',
                link: '#'
            },
            {
                id: 6,
                title: 'อุตสาหกรรมยานยนต์ไฟฟ้า (EV) ในไทยเติบโตทุบสถิติ ยอดจดทะเบียนพุ่งสูง 150%',
                summary: 'ความต้องการรถยนต์ไฟฟ้าในกลุ่มผู้ขับขี่ชาวไทยพุ่งสูงอย่างต่อเนื่องจากมาตรการอุดหนุนของภาครัฐและการเปิดตัวแบรนด์ใหม่ๆ สถานีชาร์จเร่งขยายตัวครอบคลุมทุกภูมิภาคเพื่อรองรับปริมาณรถยนต์ไฟฟ้าที่เพิ่มขึ้นในท้องถนน',
                category: 'business',
                source: 'AutoNews Thailand',
                date: '3 วันที่แล้ว',
                img: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=400&q=80',
                link: '#'
            }
        ];

        this.init();
    }

    /**
     * Initializes the service and binds necessary DOM events.
     */
    init() {
        // News Categories Filters
        const categoryButtons = document.querySelectorAll('#news-categories .cat-btn');
        
        const savedCategory = localStorage.getItem('siam_daily_news_category');
        if (savedCategory) {
            this.currentCategory = savedCategory;
            categoryButtons.forEach(b => {
                if (b.getAttribute('data-category') === savedCategory) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });
        }

        categoryButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                categoryButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.getAttribute('data-category');
                localStorage.setItem('siam_daily_news_category', this.currentCategory);
                this.renderNews();
            });
        });

        // Search Input
        const searchInput = document.getElementById('news-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.renderNews();
            });
        }

        // Initialize Custom Feeds Modal
        this.initCustomFeedsModal();
    }

    /**
     * Initializes the custom feeds modal and its event listeners.
     */
    initCustomFeedsModal() {
        const btnManage = document.getElementById('btn-manage-feeds');
        const modal = document.getElementById('news-feeds-modal');
        const btnClose = document.getElementById('btn-close-news-feeds-modal');
        const btnLogin = document.getElementById('btn-news-feeds-login');
        const btnAdd = document.getElementById('btn-add-news-feed');
        const listContainer = document.getElementById('news-feeds-list');
        
        if (!btnManage || !modal) return;

        btnManage.addEventListener('click', () => {
            modal.style.display = 'flex';
            this.renderCustomFeedsModal();
        });

        const closeModal = () => {
            modal.style.display = 'none';
        };
        
        if (btnClose) btnClose.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        if (btnLogin) {
            btnLogin.addEventListener('click', () => {
                closeModal();
                const authModal = document.getElementById('auth-modal');
                if (authModal) authModal.style.display = 'flex';
            });
        }

        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                const nameInput = document.getElementById('news-feed-input-name');
                const urlInput = document.getElementById('news-feed-input-url');
                const catSelect = document.getElementById('news-feed-input-category');
                
                const name = nameInput.value.trim();
                const url = urlInput.value.trim();
                const category = catSelect.value;

                if (!name || !url) {
                    alert('กรุณากรอกชื่อแหล่งข่าวและ URL ให้ครบถ้วนด้วยค่ะ');
                    return;
                }

                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    alert('URL ของ RSS Feed ต้องเริ่มต้นด้วย http:// หรือ https:// ค่ะ');
                    return;
                }

                const feeds = this.getCustomFeeds();
                if (feeds.some(f => f.url.toLowerCase() === url.toLowerCase())) {
                    alert('มีแหล่งข่าว RSS นี้อยู่ในระบบแล้วค่ะ');
                    return;
                }

                feeds.push({ name, url, category });
                this.saveCustomFeeds(feeds);
                
                nameInput.value = '';
                urlInput.value = '';
                
                this.renderCustomFeedsModal();
                this.fetchLiveNews();
            });
        }

        if (listContainer) {
            listContainer.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.delete-feed-btn');
                if (!deleteBtn) return;
                
                const index = parseInt(deleteBtn.getAttribute('data-index'), 10);
                const feeds = this.getCustomFeeds();
                
                if (index >= 0 && index < feeds.length) {
                    feeds.splice(index, 1);
                    this.saveCustomFeeds(feeds);
                    this.renderCustomFeedsModal();
                    this.fetchLiveNews();
                }
            });
        }
    }

    getCustomFeeds() {
        const feedsStr = localStorage.getItem('siam_news_feeds');
        if (!feedsStr) return [];
        try {
            return JSON.parse(feedsStr) || [];
        } catch (e) {
            return [];
        }
    }

    saveCustomFeeds(feeds) {
        localStorage.setItem('siam_news_feeds', JSON.stringify(feeds));
        if (window.appCoordinator && typeof window.appCoordinator.syncDataToCloud === 'function') {
            window.appCoordinator.syncDataToCloud();
        }
    }

    renderCustomFeedsModal() {
        const username = localStorage.getItem('siam_daily_auth_username');
        const token = localStorage.getItem('siam_daily_auth_token');
        
        const unauthSection = document.getElementById('news-feeds-unauth');
        const authSection = document.getElementById('news-feeds-auth');
        const listContainer = document.getElementById('news-feeds-list');

        if (!unauthSection || !authSection) return;

        if (!username || !token) {
            unauthSection.style.display = 'flex';
            authSection.style.display = 'none';
        } else {
            unauthSection.style.display = 'none';
            authSection.style.display = 'flex';

            const feeds = this.getCustomFeeds();
            if (feeds.length === 0) {
                listContainer.innerHTML = `
                    <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.85rem;">
                        ยังไม่มีแหล่งข่าว RSS ส่วนตัว กดเพิ่มที่ฟอร์มด้านล่างได้เลยค่ะ
                    </div>
                `;
            } else {
                let html = '';
                feeds.forEach((feed, index) => {
                    let catLabel = 'ทั่วไป';
                    let catColor = 'rgba(6, 182, 212, 0.15); color: var(--accent-cyan);';
                    if (feed.category === 'technology') { catLabel = 'เทคโนโลยี'; catColor = 'rgba(59, 130, 246, 0.15); color: var(--primary-color);'; }
                    if (feed.category === 'business') { catLabel = 'การเงิน'; catColor = 'rgba(16, 185, 129, 0.15); color: var(--accent-green);'; }
                    if (feed.category === 'weather-warning') { catLabel = 'เตือนภัย'; catColor = 'rgba(239, 68, 68, 0.15); color: var(--accent-red);'; }

                    html += `
                        <div class="feed-item" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.5rem 0.75rem; gap: 0.5rem;">
                            <div style="display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; flex-grow: 1;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <strong style="font-size: 0.85rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${this.escapeHTML(feed.name)}</strong>
                                    <span style="font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; background: ${catColor}">${catLabel}</span>
                                </div>
                                <span style="font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--font-english);">${this.escapeHTML(feed.url)}</span>
                            </div>
                            <button class="delete-feed-btn" data-index="${index}" style="background: none; border: none; color: var(--accent-red); cursor: pointer; padding: 0.25rem; display: flex; align-items: center; justify-content: center; opacity: 0.7; transition: 0.2s;" title="ลบแหล่งข่าวนี้">
                                <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                            </button>
                        </div>
                    `;
                });
                listContainer.innerHTML = html;
                if (window.lucide) window.lucide.createIcons();
            }
        }
    }

    escapeHTML(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Fetches the latest news RSS feeds via the backend proxy API.
     */
    async fetchLiveNews() {
        try {
            const username = localStorage.getItem('siam_daily_auth_username') || '';
            const token = localStorage.getItem('siam_daily_auth_token') || '';
            let url = '/api/news';
            if (username && token) {
                url += `?username=${encodeURIComponent(username)}&token=${encodeURIComponent(token)}`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error('News API call failed');
            const data = await response.json();
            
            if (data && data.length > 0) {
                this.articles = data;
            } else {
                this.articles = [...this.localDatabase];
            }
        } catch (error) {
            console.warn('API news fetching failed, using high-quality local curated news feed:', error);
            this.articles = [...this.localDatabase];
        }

        this.renderNews();
        this.renderNewsMini();
    }

    /**
     * Executes the renderNews operation.
     */
    renderNews() {
        const container = document.getElementById('news-container-main');
        if (!container) return;

        // Escape HTML to prevent XSS
        const escapeHTML = (str) => {
            if (!str) return '';
            return str.toString()
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        // Filter articles
        let filtered = this.articles.filter(art => {
            const matchesCat = this.currentCategory === 'all' || art.category === this.currentCategory;
            const matchesSearch = art.title.toLowerCase().includes(this.searchQuery) || art.summary.toLowerCase().includes(this.searchQuery);
            return matchesCat && matchesSearch;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--text-muted); font-family: var(--font-thai);">
                    <i data-lucide="info" style="width: 48px; height: 48px; margin-bottom: 1rem; color: var(--text-muted);"></i>
                    <p>ไม่พบข่าวสารที่คุณต้องการในขณะนี้ ลองค้นหาคำอื่นหรือเปลี่ยนหมวดหมู่ดูนะ</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        let html = '';
        filtered.forEach(art => {
            let catName = 'ข่าวทั่วไป';
            let catColorClass = 'text-cyan';
            if (art.category === 'technology') { catName = 'เทคโนโลยี'; catColorClass = 'text-primary'; }
            if (art.category === 'business') { catName = 'เศรษฐกิจ & หุ้น'; catColorClass = 'text-green'; }
            if (art.category === 'weather-warning') { catName = 'เตือนภัยฝนฟ้าอากาศ'; catColorClass = 'text-red'; }

            // Ensure valid URL scheme
            const safeLink = (art.link && art.link.startsWith('http')) ? art.link : '#';

            html += `
                <div class="news-card">
                    <img class="news-card-img" src="${escapeHTML(art.img)}" alt="${escapeHTML(art.title)}" loading="lazy">
                    <div class="news-card-body">
                        <div>
                            <span class="news-card-cat ${catColorClass}">${escapeHTML(catName)}</span>
                            <h3 class="news-card-title">${escapeHTML(art.title)}</h3>
                            <p class="news-card-summary">${escapeHTML(art.summary)}</p>
                        </div>
                        <div class="news-card-footer">
                            <span>${escapeHTML(art.source)} • ${escapeHTML(art.date)}</span>
                            <a class="read-more-btn" href="${escapeHTML(safeLink)}" target="_blank" rel="noopener noreferrer">อ่านข่าวเต็ม <i data-lucide="arrow-up-right"></i></a>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
    }

    /**
     * Executes the renderNewsMini operation.
     */
    renderNewsMini() {
        const miniContainer = document.getElementById('news-mini-container');
        if (!miniContainer) return;

        // Take first 3 news items for the home overview
        const miniArticles = this.articles.slice(0, 3);
        let html = '';

        miniArticles.forEach(art => {
            html += `
                <div class="news-item-mini">
                    <img class="news-img-mini" src="${art.img}" alt="${art.title}">
                    <div class="news-details-mini">
                        <h4>${art.title}</h4>
                        <div class="news-meta-mini">
                            <span>${art.source}</span>
                            <span>${art.date}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        miniContainer.innerHTML = html;
    }
}

// Instantiate Global News Service
window.newsService = new NewsService();
