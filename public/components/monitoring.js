// Siam Daily Hub: System Monitoring Service (SSH Security Auditor & Web Scrapers)

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

class MonitoringService {
    constructor() {
        this.map = null;
        this.markerGroup = null;
        this.activeSubTab = 'security'; // 'security' or 'scraper'
        this.scrapers = [];
        this.isMapInitialized = false;

        this.injectStyles();
        this.init();
    }

    injectStyles() {
        if (document.getElementById('monitoring-styles')) return;
        const style = document.createElement('style');
        style.id = 'monitoring-styles';
        style.textContent = `
            .spin-animation {
                animation: spin-kf 1s infinite linear;
                display: inline-block;
            }
            @keyframes spin-kf {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .glowing-dot {
                width: 10px;
                height: 10px;
                background-color: #ef4444;
                border-radius: 50%;
                box-shadow: 0 0 8px #ef4444, 0 0 15px #ef4444;
                border: 1.5px solid #ffffff;
                animation: pulse-red-marker 2s infinite;
            }
            @keyframes pulse-red-marker {
                0% {
                    transform: scale(0.95);
                    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
                }
                70% {
                    transform: scale(1.15);
                    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
                }
                100% {
                    transform: scale(0.95);
                    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
                }
            }
            .leaflet-popup-content-wrapper {
                background: rgba(16, 22, 42, 0.95) !important;
                color: #f3f4f6 !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                backdrop-filter: blur(10px) !important;
                -webkit-backdrop-filter: blur(10px) !important;
                border-radius: 12px !important;
                font-family: 'Kanit', sans-serif !important;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
            }
            .leaflet-popup-tip {
                background: rgba(16, 22, 42, 0.95) !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
            }
            .failed-log-card {
                background: rgba(255, 255, 255, 0.02);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 0.65rem 0.85rem;
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
                transition: all 0.2s;
            }
            .failed-log-card:hover {
                background: rgba(255, 255, 255, 0.04);
                border-color: rgba(239, 68, 68, 0.3);
                transform: translateX(3px);
            }
            .monitoring-grid {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 1.25rem;
                min-height: 480px;
            }
            @media (max-width: 992px) {
                .monitoring-grid {
                    grid-template-columns: 1fr;
                    min-height: auto;
                }
                #security-map {
                    min-height: 320px !important;
                }
            }
            .scraper-card {
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: 14px;
                padding: 1.25rem;
                display: flex;
                flex-direction: column;
                gap: 1rem;
                position: relative;
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .scraper-card:hover {
                transform: translateY(-4px);
                border-color: var(--primary-color);
                box-shadow: 0 10px 20px rgba(99, 102, 241, 0.1);
            }
            .status-badge {
                padding: 3px 10px;
                border-radius: 12px;
                font-size: 0.7rem;
                font-weight: 600;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            .status-badge.active {
                background: rgba(16, 185, 129, 0.1);
                color: var(--accent-green);
                border: 1px solid rgba(16, 185, 129, 0.2);
            }
            .status-badge.paused {
                background: rgba(156, 163, 175, 0.1);
                color: var(--text-muted);
                border: 1px solid rgba(156, 163, 175, 0.2);
            }
            .status-badge.error {
                background: rgba(239, 68, 68, 0.1);
                color: var(--accent-red);
                border: 1px solid rgba(239, 68, 68, 0.2);
            }
        `;
        document.head.appendChild(style);
    }

    init() {
        // Setup MutationObserver to watch when #view-monitoring active status toggles
        const viewElem = document.getElementById('view-monitoring');
        if (viewElem) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class') {
                        const isActive = viewElem.classList.contains('active');
                        if (isActive) {
                            this.onTabActive();
                        }
                    }
                });
            });
            observer.observe(viewElem, { attributes: true });
        }

        // Sub-tabs configuration listeners
        const btnSubtabSecurity = document.getElementById('btn-subtab-security');
        const btnSubtabScraper = document.getElementById('btn-subtab-scraper');
        
        if (btnSubtabSecurity && btnSubtabScraper) {
            btnSubtabSecurity.addEventListener('click', () => this.switchSubTab('security'));
            btnSubtabScraper.addEventListener('click', () => this.switchSubTab('scraper'));
        }

        // Setup notification credential toggle
        const notifyTypeInput = document.getElementById('scraper-notify-type');
        if (notifyTypeInput) {
            notifyTypeInput.addEventListener('change', (e) => this.toggleNotifyCredentials(e.target.value));
        }

        // Scrapers Modal Controls
        const btnAddScraper = document.getElementById('btn-add-scraper-modal');
        const btnCloseScraperModal = document.getElementById('btn-close-scraper-modal');
        const scraperModal = document.getElementById('scraper-form-modal');
        
        if (btnAddScraper && scraperModal) {
            btnAddScraper.addEventListener('click', () => this.openScraperModal());
        }
        if (btnCloseScraperModal && scraperModal) {
            btnCloseScraperModal.addEventListener('click', () => scraperModal.style.display = 'none');
        }
        if (scraperModal) {
            scraperModal.addEventListener('click', (e) => {
                if (e.target === scraperModal) scraperModal.style.display = 'none';
            });
        }

        // Form buttons
        const btnTestScraper = document.getElementById('btn-test-scraper');
        const btnSaveScraper = document.getElementById('btn-save-scraper');
        if (btnTestScraper) {
            btnTestScraper.addEventListener('click', () => this.testScraper());
        }
        if (btnSaveScraper) {
            btnSaveScraper.addEventListener('click', () => this.saveScraper());
        }

        // Refresh Security Logs button
        const btnRefreshSecurity = document.getElementById('btn-refresh-security');
        if (btnRefreshSecurity) {
            btnRefreshSecurity.addEventListener('click', () => {
                const icon = btnRefreshSecurity.querySelector('i');
                if (icon) icon.classList.add('spin-animation');
                this.loadSecurityLogs().finally(() => {
                    if (icon) {
                        setTimeout(() => icon.classList.remove('spin-animation'), 600);
                    }
                });
            });
        }
    }

    onTabActive() {
        // Tab is visible, load current active subtab data
        if (this.activeSubTab === 'security') {
            this.initSecurityMap();
            this.loadSecurityLogs();
        } else {
            this.loadScrapers();
        }
    }

    switchSubTab(tab) {
        this.activeSubTab = tab;
        const btnSubtabSecurity = document.getElementById('btn-subtab-security');
        const btnSubtabScraper = document.getElementById('btn-subtab-scraper');
        const securitySection = document.getElementById('monitoring-security-section');
        const scraperSection = document.getElementById('monitoring-scraper-section');

        if (tab === 'security') {
            btnSubtabSecurity.classList.add('active');
            btnSubtabSecurity.style.background = '';
            btnSubtabSecurity.style.color = '';
            
            btnSubtabScraper.classList.remove('active');
            btnSubtabScraper.style.background = 'transparent';
            btnSubtabScraper.style.color = 'var(--text-muted)';
            
            securitySection.style.display = 'flex';
            scraperSection.style.display = 'none';

            this.initSecurityMap();
            this.loadSecurityLogs();
        } else {
            btnSubtabScraper.classList.add('active');
            btnSubtabScraper.style.background = '';
            btnSubtabScraper.style.color = '';

            btnSubtabSecurity.classList.remove('active');
            btnSubtabSecurity.style.background = 'transparent';
            btnSubtabSecurity.style.color = 'var(--text-muted)';

            securitySection.style.display = 'none';
            scraperSection.style.display = 'flex';

            this.loadScrapers();
        }

        if (window.lucide) window.lucide.createIcons();
    }

    toggleNotifyCredentials(type) {
        const creds1Input = document.getElementById('scraper-notify-creds1');
        const telegramGroup = document.getElementById('scraper-telegram-chatid-group');
        
        if (type === 'discord') {
            creds1Input.placeholder = 'https://discord.com/api/webhooks/...';
            telegramGroup.style.display = 'none';
        } else if (type === 'line') {
            creds1Input.placeholder = 'กรอก LINE Notify Token ของคุณ';
            telegramGroup.style.display = 'none';
        } else if (type === 'telegram') {
            creds1Input.placeholder = 'กรอก Telegram Bot Token (เช่น 123456789:ABC...)';
            telegramGroup.style.display = 'flex';
        }
    }

    initSecurityMap() {
        if (this.isMapInitialized) {
            // Force redraw/resize calculation of map tiles inside a toggled container
            if (this.map) {
                setTimeout(() => this.map.invalidateSize(), 50);
            }
            return;
        }

        const mapContainer = document.getElementById('security-map');
        if (!mapContainer || !window.L) return;

        // Initialize Leaflet Map
        this.map = window.L.map('security-map', {
            zoomControl: true,
            minZoom: 1.5,
            maxZoom: 10
        }).setView([20.0, 0.0], 2);

        // Load premium dark tiles
        window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(this.map);

        this.markerGroup = window.L.layerGroup().addTo(this.map);
        this.isMapInitialized = true;
    }

    async loadSecurityLogs() {
        const totalFailedEl = document.getElementById('sec-total-failed');
        const totalAllEl = document.getElementById('sec-total-failed-all');
        const totalCountriesEl = document.getElementById('sec-total-countries');
        const logStatusEl = document.getElementById('sec-log-status');
        const listContainer = document.getElementById('failed-logins-list');

        if (!listContainer) return;

        listContainer.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:150px; color:var(--text-muted); font-family:var(--font-thai);">
                <div style="text-align:center;">
                    <i data-lucide="loader-2" class="spin-animation" style="width:24px; height:24px; margin-bottom:5px;"></i>
                    <p style="margin:0; font-size:0.85rem;">กำลังโหลดข้อมูล SSH logs...</p>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        try {
            const res = await fetch('/api/monitoring/security-logs');
            if (!res.ok) throw new Error('API server response failed');
            const data = await res.json();

            if (data && data.success) {
                // Update stats counter cards
                if (totalFailedEl) totalFailedEl.textContent = data.stats.totalFailed.toLocaleString();
                if (totalAllEl) totalAllEl.textContent = `รวม ${(data.stats.allRecentFailed ?? data.stats.totalFailed).toLocaleString()} ครั้งที่ตรวจพบ`;
                if (totalCountriesEl) totalCountriesEl.textContent = data.stats.countriesCount.toString();
                
                if (logStatusEl) {
                    if (data.simulated) {
                        logStatusEl.textContent = 'เฝ้าระวังแบบจำลอง (Local/Mac)';
                        logStatusEl.style.color = 'var(--accent-amber)';
                        logStatusEl.parentElement.parentElement.style.borderLeftColor = 'var(--accent-amber)';
                    } else {
                        logStatusEl.textContent = 'กำลังเฝ้าระวังเซิร์ฟเวอร์จริง';
                        logStatusEl.style.color = 'var(--accent-green)';
                        logStatusEl.parentElement.parentElement.style.borderLeftColor = 'var(--accent-green)';
                    }
                }

                // Render Logs List
                const logs = data.logs || [];
                if (logs.length === 0) {
                    listContainer.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:2rem; font-family:var(--font-thai); font-size:0.85rem;">ไม่มีประวัติการเชื่อมต่อที่ล้มเหลว</div>';
                    return;
                }

                listContainer.innerHTML = logs.map(log => {
                    const country = escapeHtml(log.country || 'Unknown');
                    const city = escapeHtml(log.city || 'Unknown');
                    const user = escapeHtml(log.user || 'Unknown');
                    const ip = escapeHtml(log.ip || 'Unknown');
                    
                    return `
                        <div class="failed-log-card">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-weight:600; color:var(--text-main); font-size:0.85rem; font-family:var(--font-english);">${user}</span>
                                <span style="font-size:0.7rem; color:var(--text-muted); font-family:var(--font-english);">${escapeHtml(log.timestamp)}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.72rem; color:var(--text-muted);">
                                <span style="font-family:var(--font-english);">${ip}:${escapeHtml(log.port)}</span>
                                <span style="color:var(--accent-red); font-weight:500;">📍 ${city}, ${country}</span>
                            </div>
                        </div>
                    `;
                }).join('');

                // Render Markers on Map
                if (this.markerGroup) {
                    this.markerGroup.clearLayers();
                    
                    const glowingDotIcon = window.L.divIcon({
                        className: 'glowing-dot-marker',
                        html: '<div class="glowing-dot"></div>',
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                    });

                    // Keep track of unique coordinate points to group duplicates and prevent overlaying popups
                    const pointsMap = {};

                    logs.forEach(log => {
                        const latVal = parseFloat(log.lat);
                        const lonVal = parseFloat(log.lon);
                        if (isNaN(latVal) || isNaN(lonVal) || (latVal === 0 && lonVal === 0)) return;
                        const key = `${latVal.toFixed(3)},${lonVal.toFixed(3)}`;
                        if (!pointsMap[key]) {
                            pointsMap[key] = {
                                lat: latVal,
                                lon: lonVal,
                                country: log.country,
                                city: log.city,
                                attempts: []
                            };
                        }
                        pointsMap[key].attempts.push(log);
                    });

                    // Plot combined coordinates on Map
                    Object.values(pointsMap).forEach(point => {
                        const marker = window.L.marker([point.lat, point.lon], { icon: glowingDotIcon });
                        
                        const country = escapeHtml(point.country || 'Unknown');
                        const city = escapeHtml(point.city || 'Unknown');
                        const attemptsCount = point.attempts.length;
                        
                        let popupHtml = `
                            <div style="padding:4px; font-family:var(--font-thai);">
                                <strong style="color:var(--accent-red); font-size:0.82rem; display:block; margin-bottom:5px;">🚨 บุกรุกรวม ${attemptsCount} ครั้ง</strong>
                                <span style="font-size:0.75rem; color:#d1d5db; display:block;"><b>พิกัด:</b> ${city}, ${country}</span>
                                <div style="margin-top:6px; border-top:1px solid rgba(255,255,255,0.1); padding-top:4px; max-height:80px; overflow-y:auto; font-size:0.7rem; color:#9ca3af; display:flex; flex-direction:column; gap:2px;">
                        `;

                        // List top 3 target users at this IP
                        point.attempts.slice(0, 3).forEach(att => {
                            popupHtml += `<span>• User: <b>${escapeHtml(att.user)}</b> (${escapeHtml(att.timestamp)})</span>`;
                        });
                        if (attemptsCount > 3) {
                            popupHtml += `<span style="font-size:0.65rem; color:var(--text-muted);">และอีก ${attemptsCount - 3} ครั้ง...</span>`;
                        }
                        popupHtml += `</div></div>`;

                        marker.bindPopup(popupHtml);
                        this.markerGroup.addLayer(marker);
                    });
                }

                if (window.lucide) window.lucide.createIcons();
            }
        } catch (e) {
            console.error('Failed to load security logs:', e);
            listContainer.innerHTML = `<div style="color:var(--accent-red); text-align:center; padding:2rem; font-family:var(--font-thai); font-size:0.85rem;">เกิดข้อผิดพลาดในการโหลดข้อมูล: ${escapeHtml(e.message)}</div>`;
        }
    }

    async loadScrapers() {
        const grid = document.getElementById('scrapers-grid');
        if (!grid) return;

        grid.innerHTML = `
            <div style="grid-column: 1 / -1; display:flex; justify-content:center; align-items:center; height:200px; color:var(--text-muted); font-family:var(--font-thai);">
                <div style="text-align:center;">
                    <i data-lucide="loader-2" class="spin-animation" style="width:28px; height:28px; margin-bottom:5px;"></i>
                    <p style="margin:0; font-size:0.9rem;">กำลังโหลดรายการบอตเฝ้าระวัง...</p>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        try {
            const res = await fetch('/api/monitoring/scrapers');
            if (!res.ok) throw new Error('API server response failed');
            const data = await res.json();

            if (data && data.success) {
                this.scrapers = data.scrapers || [];
                
                if (this.scrapers.length === 0) {
                    grid.innerHTML = `
                        <div style="grid-column: 1 / -1; background:rgba(0,0,0,0.15); border:1px dashed var(--border-color); border-radius:12px; padding:3rem; text-align:center; font-family:var(--font-thai); color:var(--text-muted);">
                            <i data-lucide="bot" style="width:40px; height:40px; margin:0 auto 0.75rem; display:block; opacity:0.35;"></i>
                            <h4 style="margin:0 0 5px; color:var(--text-main); font-weight:500;">ยังไม่มีบอตเฝ้าระวัง</h4>
                            <p style="margin:0 0 1rem; font-size:0.8rem;">สร้างบอตเพื่อดึงพิกัดราคาหรือข้อความเว็บเป้าหมาย แล้วแจ้งเตือนเมื่อเปลี่ยนไปทันที</p>
                            <button onclick="window.monitoringService.openScraperModal()" class="btn-primary" style="padding:0.45rem 1.25rem; font-size:0.8rem; border-radius:8px; display:inline-flex; align-items:center; gap:0.35rem; cursor:pointer;"><i data-lucide="plus" style="width:14px; height:14px;"></i> เริ่มเพิ่มบอต</button>
                        </div>
                    `;
                    if (window.lucide) window.lucide.createIcons();
                    return;
                }

                grid.innerHTML = this.scrapers.map(scraper => {
                    let statusClass = 'paused';
                    let statusText = 'ปิดใช้งาน';
                    if (scraper.status === 'active') {
                        statusClass = scraper.error ? 'error' : 'active';
                        statusText = scraper.error ? 'เกิดข้อผิดพลาด' : 'กำลังเฝ้าระวัง';
                    }
                    
                    const ruleLabels = {
                        changed: 'มีค่าเปลี่ยนแปลง',
                        contains: `มีคำว่า: "${escapeHtml(scraper.value)}"`,
                        lt: `มีค่าน้อยกว่า: ${escapeHtml(scraper.value)}`,
                        gt: `มีค่ามากกว่า: ${escapeHtml(scraper.value)}`
                    };
                    const ruleLabel = ruleLabels[scraper.rule] || scraper.rule;
                    
                    const notifyChannelLabels = {
                        discord: 'Discord Webhook',
                        line: 'LINE Notify',
                        telegram: 'Telegram Bot'
                    };
                    const notifyChannel = notifyChannelLabels[scraper.notifyType] || scraper.notifyType;

                    const lastCheckText = scraper.lastChecked > 0 
                        ? new Date(scraper.lastChecked).toLocaleString('th-TH')
                        : 'ยังไม่ได้ตรวจสอบ';

                    const displayedVal = scraper.lastValue 
                        ? escapeHtml(scraper.lastValue.length > 35 ? scraper.lastValue.substring(0, 35) + '...' : scraper.lastValue)
                        : '<ยังไม่มีค่า>';

                    return `
                        <div class="scraper-card">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem;">
                                <div style="min-width:0;">
                                    <h4 style="margin:0; font-size:0.95rem; font-weight:600; color:var(--text-main); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${escapeHtml(scraper.name)}</h4>
                                    <a href="${escapeHtml(scraper.url)}" target="_blank" style="font-size:0.7rem; color:var(--accent-cyan); display:flex; align-items:center; gap:3px; margin-top:3px; word-break:break-all; text-decoration:none;">
                                        <i data-lucide="external-link" style="width:10px; height:10px;"></i> URL หน้าเว็บเป้าหมาย
                                    </a>
                                </div>
                                <span class="status-badge ${statusClass}">
                                    <span style="width:5px; height:5px; background:currentColor; border-radius:50%;"></span>
                                    ${statusText}
                                </span>
                            </div>
                            
                            <div style="background:rgba(0,0,0,0.2); border-radius:10px; border:1px solid var(--border-color); padding:0.75rem; display:flex; flex-direction:column; gap:0.4rem; font-size:0.75rem;">
                                <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">ค่าปัจจุบัน:</span> <strong style="color:white; font-family:var(--font-english); font-size:0.8rem;">${displayedVal}</strong></div>
                                <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);"> HTML Selector:</span> <span style="font-family:monospace; color:#a5b4fc;">${escapeHtml(scraper.selector)}</span></div>
                                <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">เงื่อนไขการเตือน:</span> <span style="color:var(--accent-amber); font-weight:500;">${ruleLabel}</span></div>
                                <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">ความถี่ / เตือนผ่าน:</span> <span>เช็กทุก ${scraper.interval} นาที / ${notifyChannel}</span></div>
                            </div>

                            ${scraper.error ? `
                                <div style="font-size:0.7rem; background:rgba(239, 68, 68, 0.08); border:1px solid rgba(239, 68, 68, 0.2); border-radius:8px; padding:0.5rem; color:var(--accent-red); display:flex; gap:0.35rem; align-items:flex-start;">
                                    <i data-lucide="alert-triangle" style="width:14px; height:14px; flex-shrink:0; margin-top:1px;"></i>
                                    <span><b>บอตรายงานข้อผิดพลาด:</b> ${escapeHtml(scraper.error)}</span>
                                </div>
                            ` : ''}

                            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:0.75rem; margin-top:auto;">
                                <span style="font-size:0.65rem; color:var(--text-muted);">ตรวจล่าสุด: ${lastCheckText}</span>
                                <div style="display:flex; gap:0.4rem;">
                                    <button onclick="window.monitoringService.toggleScraperStatus('${scraper.id}', '${scraper.status}')" class="btn-secondary" style="padding:4px 8px; border-radius:6px; font-size:0.72rem; cursor:pointer; font-family:var(--font-thai);" title="เปิด/ปิดการทำงาน">
                                        <i data-lucide="${scraper.status === 'active' ? 'pause' : 'play'}" style="width:12px; height:12px;"></i>
                                    </button>
                                    <button onclick="window.monitoringService.openScraperModal('${scraper.id}')" class="btn-secondary" style="padding:4px 8px; border-radius:6px; font-size:0.72rem; cursor:pointer; font-family:var(--font-thai);" title="แก้ไขการตั้งค่า">
                                        <i data-lucide="edit-2" style="width:12px; height:12px;"></i>
                                    </button>
                                    <button onclick="window.monitoringService.deleteScraper('${scraper.id}')" class="btn-secondary" style="padding:4px 8px; border-radius:6px; font-size:0.72rem; cursor:pointer; font-family:var(--font-thai); color:var(--accent-red); border-color:rgba(239,68,68,0.2); background:rgba(239,68,68,0.02);" title="ลบถาวร">
                                        <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                if (window.lucide) window.lucide.createIcons();
            }
        } catch (e) {
            console.error('Failed to load scrapers:', e);
            grid.innerHTML = `<div style="grid-column:1 / -1; color:var(--accent-red); text-align:center; padding:2rem; font-family:var(--font-thai); font-size:0.9rem;">เกิดข้อผิดพลาดในการโหลดรายการบอต: ${escapeHtml(e.message)}</div>`;
        }
    }

    openScraperModal(editId = null) {
        const modal = document.getElementById('scraper-form-modal');
        const titleText = document.getElementById('scraper-modal-title-text');
        const testStatus = document.getElementById('scraper-test-status');

        if (!modal) return;

        // Reset form inputs
        document.getElementById('scraper-id-field').value = '';
        document.getElementById('scraper-name-input').value = '';
        document.getElementById('scraper-url-input').value = '';
        document.getElementById('scraper-selector-input').value = '';
        document.getElementById('scraper-interval-input').value = '15';
        document.getElementById('scraper-rule-input').value = 'changed';
        document.getElementById('scraper-value-input').value = '';
        document.getElementById('scraper-notify-type').value = 'discord';
        document.getElementById('scraper-notify-creds1').value = '';
        document.getElementById('scraper-notify-creds2').value = '';
        
        this.toggleNotifyCredentials('discord');
        if (testStatus) testStatus.style.display = 'none';

        if (editId) {
            const scraper = this.scrapers.find(s => s.id === editId);
            if (scraper) {
                document.getElementById('scraper-id-field').value = scraper.id;
                document.getElementById('scraper-name-input').value = scraper.name;
                document.getElementById('scraper-url-input').value = scraper.url;
                document.getElementById('scraper-selector-input').value = scraper.selector;
                document.getElementById('scraper-interval-input').value = scraper.interval;
                document.getElementById('scraper-rule-input').value = scraper.rule;
                document.getElementById('scraper-value-input').value = scraper.value;
                document.getElementById('scraper-notify-type').value = scraper.notifyType;
                document.getElementById('scraper-notify-creds1').value = scraper.notifyCreds1;
                document.getElementById('scraper-notify-creds2').value = scraper.notifyCreds2 || '';
                
                this.toggleNotifyCredentials(scraper.notifyType);
                titleText.textContent = 'แก้ไขรายละเอียดบอตเฝ้าระวัง';
            }
        } else {
            titleText.textContent = 'เพิ่มบอตเฝ้าระวังเว็บใหม่';
        }

        modal.style.display = 'flex';
        if (window.lucide) window.lucide.createIcons();
    }

    async testScraper() {
        const url = document.getElementById('scraper-url-input').value.trim();
        const selector = document.getElementById('scraper-selector-input').value.trim();
        const testStatus = document.getElementById('scraper-test-status');

        if (!url || !selector) {
            alert('กรุณากรอก URL เว็บเป้าหมาย และ HTML Selector ก่อนกดทดสอบค่ะ');
            return;
        }

        testStatus.style.display = 'block';
        testStatus.style.background = 'rgba(255, 255, 255, 0.05)';
        testStatus.style.color = 'var(--text-main)';
        testStatus.innerHTML = '<i data-lucide="loader-2" class="spin-animation" style="width:14px; height:14px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> กำลังเชื่อมต่อเว็บและดึงพิกัด HTML Selector...';
        if (window.lucide) window.lucide.createIcons();

        try {
            const res = await fetch('/api/monitoring/scrapers/test-scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, selector })
            });
            const data = await res.json();

            if (data && data.success) {
                testStatus.style.background = 'rgba(16, 185, 129, 0.1)';
                testStatus.style.color = 'var(--accent-green)';
                testStatus.innerHTML = `<strong>ดึงข้อมูลสำเร็จ!</strong> ค่าที่อ่านได้คือ: <code style="background:rgba(0,0,0,0.3); padding:2px 6px; border-radius:4px; font-family:monospace; margin-left:4px;">"${escapeHtml(data.value)}"</code>`;
            } else {
                testStatus.style.background = 'rgba(239, 68, 68, 0.1)';
                testStatus.style.color = 'var(--accent-red)';
                testStatus.innerHTML = `<strong>ล้มเหลว:</strong> ${escapeHtml(data.message)}`;
            }
        } catch (err) {
            testStatus.style.background = 'rgba(239, 68, 68, 0.1)';
            testStatus.style.color = 'var(--accent-red)';
            testStatus.innerHTML = `<strong>ข้อผิดพลาดของระบบ:</strong> ${escapeHtml(err.message)}`;
        }
    }

    async saveScraper() {
        const id = document.getElementById('scraper-id-field').value;
        const name = document.getElementById('scraper-name-input').value.trim();
        const url = document.getElementById('scraper-url-input').value.trim();
        const selector = document.getElementById('scraper-selector-input').value.trim();
        const interval = document.getElementById('scraper-interval-input').value;
        const rule = document.getElementById('scraper-rule-input').value;
        const value = document.getElementById('scraper-value-input').value.trim();
        const notifyType = document.getElementById('scraper-notify-type').value;
        const notifyCreds1 = document.getElementById('scraper-notify-creds1').value.trim();
        const notifyCreds2 = document.getElementById('scraper-notify-creds2').value.trim();

        if (!name || !url || !selector) {
            alert('กรุณากรอกชื่อบอต, URL, และ HTML Selector ให้ครบถ้วนค่ะ');
            return;
        }

        if (notifyCreds1 === '') {
            alert('กรุณากรอกข้อมูลรับรองช่องทางการแจ้งเตือนด้วยค่ะ');
            return;
        }

        const payload = {
            name,
            url,
            selector,
            interval: parseInt(interval, 10),
            rule,
            value,
            notifyType,
            notifyCreds1,
            notifyCreds2
        };

        const method = id ? 'PUT' : 'POST';
        const endpoint = id ? `/api/monitoring/scrapers/${id}` : '/api/monitoring/scrapers';

        try {
            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data && data.success) {
                alert(data.message);
                document.getElementById('scraper-form-modal').style.display = 'none';
                this.loadScrapers();
            } else {
                alert(`ล้มเหลว: ${data.message}`);
            }
        } catch (e) {
            console.error('Failed to save scraper:', e);
            alert(`เกิดข้อผิดพลาดของระบบ: ${e.message}`);
        }
    }

    async toggleScraperStatus(id, currentStatus) {
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';
        try {
            const res = await fetch(`/api/monitoring/scrapers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data && data.success) {
                this.loadScrapers();
            }
        } catch (e) {
            console.error('Failed to toggle status:', e);
        }
    }

    async deleteScraper(id) {
        if (!confirm('คุณแน่ใจว่าต้องการลบบอตเฝ้าระวังนี้ถาวรใช่หรือไม่? ข้อมูลประวัติและค่าเดิมจะถูกล้างทิ้งทันทีค่ะ')) return;

        try {
            const res = await fetch(`/api/monitoring/scrapers/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data && data.success) {
                alert(data.message);
                this.loadScrapers();
            } else {
                alert(`ล้มเหลว: ${data.message}`);
            }
        } catch (e) {
            console.error('Failed to delete scraper:', e);
            alert(`เกิดข้อผิดพลาดของระบบ: ${e.message}`);
        }
    }
}

// Instantiate
window.monitoringService = new MonitoringService();
