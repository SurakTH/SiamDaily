// Main Siam Daily Hub Coordinator and State Manager

class AppCoordinator {
    constructor() {
        this.activeTab = 'dashboard';
        this.currentLat = 13.7946; // Defaults: Mahidol Salaya
        this.currentLng = 100.3242;

        this.init();
    }

    init() {
        // 1. Setup Navigation Tabs
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const tabName = item.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Setup Mobile Bottom Navigation Bar
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
        mobileNavItems.forEach(item => {
            if (item.id === 'btn-mobile-more') return; // Handled separately
            item.addEventListener('click', () => {
                const tabName = item.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Setup Bottom Sheet Drawer
        const btnMore = document.getElementById('btn-mobile-more');
        const bottomSheet = document.getElementById('mobile-more-bottom-sheet');
        const btnCloseSheet = document.getElementById('btn-close-bottom-sheet');
        
        if (btnMore && bottomSheet) {
            btnMore.addEventListener('click', () => {
                bottomSheet.style.display = 'flex';
                // Trigger transition reflow
                setTimeout(() => bottomSheet.classList.add('active'), 10);
            });

            const closeSheet = () => {
                bottomSheet.classList.remove('active');
                setTimeout(() => bottomSheet.style.display = 'none', 300);
            };

            if (btnCloseSheet) btnCloseSheet.addEventListener('click', closeSheet);
            bottomSheet.addEventListener('click', (e) => {
                if (e.target === bottomSheet) closeSheet();
            });

            // Bind click handlers for bottom sheet grid items
            const sheetItems = bottomSheet.querySelectorAll('.bottom-sheet-item');
            sheetItems.forEach(item => {
                item.addEventListener('click', () => {
                    const tabName = item.getAttribute('data-tab');
                    this.switchTab(tabName);
                    closeSheet();
                });
            });

            // Move sidebar footer (Clock, Radio, Theme, Cloud Sync) dynamically on mobile vs desktop
            const handleFooterRelocation = () => {
                const sidebarFooter = document.querySelector('.sidebar-footer');
                const sidebar = document.querySelector('.sidebar');
                const settingsContainer = bottomSheet.querySelector('.bottom-sheet-settings');
                
                if (window.innerWidth <= 768) {
                    if (sidebarFooter && settingsContainer && !settingsContainer.contains(sidebarFooter)) {
                        settingsContainer.appendChild(sidebarFooter);
                        settingsContainer.style.display = 'block';
                    }
                } else {
                    if (sidebarFooter && sidebar && !sidebar.contains(sidebarFooter)) {
                        sidebar.appendChild(sidebarFooter);
                        if (settingsContainer) settingsContainer.style.display = 'none';
                    }
                }
            };

            window.addEventListener('resize', handleFooterRelocation);
            handleFooterRelocation(); // Run once initially
        }

        // Add support for sub-navigation links (e.g. view-all-news)
        window.switchTab = (tabName) => this.switchTab(tabName);

        // Fetch and run news ticker
        this.initNewsTicker();

        // 2. Setup Sticky Notes
        this.initStickyNotesWidget();

        // 3. Setup Clock & Greetings
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);

        // 4. Geolocation GPS Button
        const gpsBtn = document.getElementById('btn-gps-sync');
        if (gpsBtn) {
            gpsBtn.addEventListener('click', () => this.syncUserLocation());
        }

        // 5. Settings Controls
        const btnSaveSettings = document.getElementById('btn-save-settings');
        const btnResetSettings = document.getElementById('btn-reset-settings');
        if (btnSaveSettings) {
            btnSaveSettings.addEventListener('click', () => this.saveCustomCoordinates());
        }
        if (btnResetSettings) {
            btnResetSettings.addEventListener('click', () => this.resetCoordinates());
        }

        // 5.1 Backup & Sync Controls
        const btnExportBackup = document.getElementById('btn-export-backup');
        const btnImportBackupTrigger = document.getElementById('btn-import-backup-trigger');
        const inputImportBackup = document.getElementById('input-import-backup');

        if (btnExportBackup) {
            btnExportBackup.addEventListener('click', () => {
                const backupData = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    backupData[key] = localStorage.getItem(key);
                }
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `daily-hub-backup-${new Date().toISOString().slice(0,10)}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
            });
        }

        if (btnImportBackupTrigger && inputImportBackup) {
            btnImportBackupTrigger.addEventListener('click', () => inputImportBackup.click());
            inputImportBackup.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importedData = JSON.parse(event.target.result);
                        if (typeof importedData !== 'object' || importedData === null) {
                            throw new Error('Invalid backup file format');
                        }
                        if (confirm('คุณต้องการนำเข้าข้อมูลสำรองใช่ไหม? ข้อมูลปัจจุบันบางส่วนอาจถูกเขียนทับ และหน้าเว็บจะรีโหลดใหม่ค่ะ')) {
                            Object.keys(importedData).forEach(key => {
                                localStorage.setItem(key, importedData[key]);
                            });
                            window.location.reload();
                        }
                    } catch (err) {
                        alert('เกิดข้อผิดพลาดในการอ่านไฟล์สำรองข้อมูล! กรุณาตรวจสอบว่าไฟล์ถูกต้องและไม่เสียหายค่ะ');
                    }
                };
                reader.readAsText(file);
            });
        }

        // Load custom coordinates if saved
        const savedLat = localStorage.getItem('siam_custom_lat');
        const savedLng = localStorage.getItem('siam_custom_lng');
        if (savedLat && savedLng) {
            this.currentLat = parseFloat(savedLat);
            this.currentLng = parseFloat(savedLng);
            
            // update form values
            document.getElementById('setting-lat').value = this.currentLat;
            document.getElementById('setting-lng').value = this.currentLng;
            document.getElementById('current-location-name').textContent = 'พิกัดที่กำหนดเอง';
        }

        // 6. Theme Switcher (Dark/Light mode & custom presets)
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const themes = ['dark-theme', 'light-theme', 'theme-amethyst', 'theme-emerald', 'theme-amber'];
            // Load saved theme
            const savedTheme = localStorage.getItem('siam_theme') || 'dark-theme';
            document.body.className = savedTheme;
            this.updateThemeToggleText(savedTheme);

            themeToggle.addEventListener('click', () => {
                const currentTheme = document.body.className;
                let currentIndex = themes.indexOf(currentTheme);
                if (currentIndex === -1) currentIndex = 0;
                const nextIndex = (currentIndex + 1) % themes.length;
                const newTheme = themes[nextIndex];
                
                document.body.className = newTheme;
                localStorage.setItem('siam_theme', newTheme);
                this.updateThemeToggleText(newTheme);
                
                // Re-render chart to adjust axis colors
                if (window.weatherService) {
                    window.weatherService.renderHourlyForecast(window.weatherService.hourlyDataCache);
                }
            });
        }

        // 7. Initial loading trigger for components
        this.loadInitialData();

        // 8. Auto fluctuations/polling intervals
        setInterval(() => {
            if (window.financeService) {
                window.financeService.updateGoldPrices();
                window.financeService.updateCryptoPrices();
                window.financeService.updateCommodityPrices();
            }
        }, 15000); // fluctuations every 15s

        // 9. Weather and AQI Auto Refresh (Every 5 minutes)
        setInterval(() => {
            if (window.weatherService) {
                window.weatherService.fetchAndRenderAll();
            }
        }, 5 * 60 * 1000);

        // 10. VPS Server Status Auto Refresh (Every 10 seconds)
        setInterval(() => this.updateServerStatus(), 10000);

        // 11. Command Palette (Cmd+K / Ctrl+K)
        this.initCommandPalette();
        
        // 12. Restore last active tab
        const lastTab = localStorage.getItem('siam_daily_active_tab') || 'dashboard';
        if (lastTab !== 'dashboard') {
            this.switchTab(lastTab);
        }

        // 13. Init Drag & Drop Dashboard
        this.initDashboardDraggable();
        this.initWidgetManager();
        
        // 14. Init Dashboard Extra Widgets
        this.initDashboardExtras();

        // 15. Init User Auth & Cloud Sync
        this.initAuth();

        // 16. Init Wallpaper Engine
        this.initWallpaperEngine();

        // 17. Init Focus Mode
        this.initFocusMode();
    }

    async updateServerStatus() {
        const cpuLoadEl = document.getElementById('vps-cpu-load');
        const ramUsedEl = document.getElementById('vps-ram-used');
        const diskUsedEl = document.getElementById('vps-disk-used');
        const uptimeEl = document.getElementById('vps-uptime');
        const refreshTimeEl = document.getElementById('vps-refresh-time');
        const onlineStatus = document.getElementById('vps-online-status');

        // SVG circles
        const cpuCircle = document.getElementById('vps-cpu-circle');
        const cpuPctTxt = document.getElementById('vps-cpu-pct');
        const ramCircle = document.getElementById('vps-ram-circle');
        const ramPctTxt = document.getElementById('vps-ram-pct');
        const diskCircle = document.getElementById('vps-disk-circle');
        const diskPctTxt = document.getElementById('vps-disk-pct');

        try {
            const response = await fetch('/api/server-status');
            if (!response.ok) throw new Error('Server status API error');
            const data = await response.json();

            if (data && data.success) {
                if (onlineStatus) {
                    onlineStatus.className = 'badge-online';
                    onlineStatus.innerHTML = '<span class="dot"></span> Online';
                }

                // Update CPU SVG Gauge
                const cpuPercent = parseFloat(data.cpuPercent) || 0;
                if (cpuCircle) {
                    const offset = 157.08 - (cpuPercent / 100) * 157.08;
                    cpuCircle.style.strokeDashoffset = offset;
                    
                    // Dynamic color accents based on load levels
                    if (cpuPercent > 80) cpuCircle.style.stroke = 'var(--accent-red)';
                    else if (cpuPercent > 50) cpuCircle.style.stroke = 'var(--accent-amber)';
                    else cpuCircle.style.stroke = 'var(--accent-purple)';
                }
                if (cpuPctTxt) cpuPctTxt.textContent = `${Math.round(cpuPercent)}%`;
                if (cpuLoadEl) cpuLoadEl.textContent = `${cpuPercent.toFixed(1)}% (${data.cpuLoad} load)`;

                // Update RAM SVG Gauge
                const ramPercent = parseFloat(data.ram.percent) || 0;
                if (ramCircle) {
                    const offset = 157.08 - (ramPercent / 100) * 157.08;
                    ramCircle.style.strokeDashoffset = offset;
                    
                    if (ramPercent > 85) ramCircle.style.stroke = 'var(--accent-red)';
                    else if (ramPercent > 60) ramCircle.style.stroke = 'var(--accent-amber)';
                    else ramCircle.style.stroke = 'var(--accent-cyan)';
                }
                if (ramPctTxt) ramPctTxt.textContent = `${Math.round(ramPercent)}%`;
                if (ramUsedEl) ramUsedEl.textContent = `${data.ram.used} / ${data.ram.total} (${data.ram.percent})`;

                // Update Disk SVG Gauge
                const diskPercent = parseFloat(data.disk.percent) || 0;
                if (diskCircle) {
                    const offset = 157.08 - (diskPercent / 100) * 157.08;
                    diskCircle.style.strokeDashoffset = offset;
                    
                    if (diskPercent > 90) diskCircle.style.stroke = 'var(--accent-red)';
                    else if (diskPercent > 75) diskCircle.style.stroke = 'var(--accent-amber)';
                    else diskCircle.style.stroke = 'var(--accent-amber)'; // keep default amber
                }
                if (diskPctTxt) diskPctTxt.textContent = `${Math.round(diskPercent)}%`;
                if (diskUsedEl) {
                    diskUsedEl.textContent = `${data.disk.used} / ${data.disk.size} (${data.disk.percent})`;
                }

                if (uptimeEl) {
                    uptimeEl.innerHTML = `<i data-lucide="clock" style="display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:2px"></i> เปิดใช้งานแล้ว: ${data.uptime}`;
                }

                if (refreshTimeEl) {
                    const now = new Date();
                    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
                    refreshTimeEl.textContent = `อัปเดตเมื่อ: ${timeStr}`;
                }

                // Update Docker containers status
                const dockerCountEl = document.getElementById('vps-docker-count');
                const dockerListEl = document.getElementById('vps-docker-list');
                if (dockerCountEl && dockerListEl) {
                    const containers = data.containers || [];
                    dockerCountEl.textContent = containers.length;
                    
                    if (containers.length === 0) {
                        dockerListEl.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 0.25rem 0; font-family: var(--font-thai);">ไม่มีคอนเทนเนอร์ทำงานอยู่</div>';
                    } else {
                        dockerListEl.innerHTML = containers.map(c => {
                            const isUp = c.status.toLowerCase().includes('up');
                            const statusColor = isUp ? 'var(--accent-green)' : 'var(--accent-red)';
                            const statusText = isUp ? 'Active' : 'Stopped';
                            return `
                                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 0.25rem 0.5rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.03); margin-bottom: 2px;">
                                    <span style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px; color: var(--text-main);">${c.name}</span>
                                    <div style="display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0;">
                                        <span style="font-size: 0.6rem; color: var(--text-muted);">${c.uptime}</span>
                                        <span style="color: ${statusColor}; font-size: 0.65rem; font-weight: 600; display: flex; align-items: center; gap: 2px;">
                                            <span style="width: 5px; height: 5px; background: ${statusColor}; border-radius: 50%; display: inline-block;"></span>
                                            ${statusText}
                                        </span>
                                    </div>
                                </div>
                            `;
                        }).join('');
                    }
                }
                
                if (window.lucide) window.lucide.createIcons();
            } else {
                throw new Error('Backend failed to read metrics');
            }
        } catch (err) {
            console.error('Failed to update server status:', err);
            if (onlineStatus) {
                onlineStatus.className = 'badge-offline';
                onlineStatus.innerHTML = '<span class="dot" style="background-color:#ef4444"></span> Offline';
            }
        }
    }

    updateThemeToggleText(themeName) {
        const span = document.querySelector('#theme-toggle span');
        if (span) {
            let label = 'ธีมกลางคืน';
            switch (themeName) {
                case 'dark-theme':
                    label = 'ธีมกลางคืน (Cyber)';
                    break;
                case 'light-theme':
                    label = 'ธีมกลางวัน (Light)';
                    break;
                case 'theme-amethyst':
                    label = 'ธีม Amethyst (ม่วง)';
                    break;
                case 'theme-emerald':
                    label = 'ธีม Emerald (เขียว)';
                    break;
                case 'theme-amber':
                    label = 'ธีม Solar (ส้ม)';
                    break;
            }
            span.textContent = label;
        }
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        localStorage.setItem('siam_daily_active_tab', tabName);

        // Toggle nav buttons
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-tab') === tabName);
        });

        // Toggle mobile nav buttons
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-tab') === tabName);
        });

        // Toggle view containers (only outer view-* divs, not inner sections)
        document.querySelectorAll('[id^="view-"]').forEach(pane => {
            pane.classList.toggle('active', pane.id === `view-${tabName}`);
        });

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Ensure Chart.js resizes correctly if it was rendered while hidden
        if (tabName === 'weather' && window.weatherService && window.weatherService.hourlyChart) {
            window.weatherService.hourlyChart.resize();
        }
    }

    async initNewsTicker() {
        const tickerText = document.getElementById('news-ticker-text');
        if (!tickerText) return;

        try {
            const response = await fetch('/api/news');
            if (!response.ok) throw new Error('News fetch failed');
            
            const data = await response.json();
            if (data && data.length > 0) {
                // Take top 8 headlines and join them
                const headlines = data.slice(0, 8).map(item => item.title).join('   •   ');
                tickerText.textContent = headlines;
                
                // Add click listener to switch to news tab
                tickerText.addEventListener('click', () => {
                    this.switchTab('news');
                });
            } else {
                tickerText.textContent = 'ไม่มีอัปเดตข่าวสารในขณะนี้';
            }
        } catch (err) {
            console.error('Failed to load breaking news ticker:', err);
            tickerText.textContent = 'ไม่สามารถดึงข้อมูลข่าวสารด่วนได้ในขณะนี้';
        }
    }

    updateClock() {
        const timeElem = document.getElementById('sidebar-time');
        const dateElem = document.getElementById('sidebar-date');
        const welcomeElem = document.getElementById('welcome-msg');
        
        if (!timeElem || !dateElem) return;

        const now = new Date();
        
        // Format Time
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        timeElem.textContent = `${hh}:${mm}:${ss}`;

        // Format Date in Thai (Buddhist Era)
        const days = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
        const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        
        const dayName = days[now.getDay()];
        const dateNum = now.getDate();
        const monthName = months[now.getMonth()];
        const yearBE = now.getFullYear() + 543;
        
        dateElem.textContent = `${dayName}ที่ ${dateNum} ${monthName} พ.ศ. ${yearBE}`;

        // Greet Msg
        if (welcomeElem) {
            const hour = now.getHours();
            let greet = 'สวัสดีตอนดึก';
            if (hour >= 5 && hour < 12) greet = 'สวัสดีตอนเช้า';
            else if (hour >= 12 && hour < 16) greet = 'สวัสดีตอนบ่าย';
            else if (hour >= 16 && hour < 20) greet = 'สวัสดีตอนเย็น';
            
            welcomeElem.textContent = `${greet}, คุณผู้ใช้ 👋`;
        }
    }

    async syncUserLocation() {
        const locName = document.getElementById('current-location-name');
        if (!navigator.geolocation) {
            alert('เบราว์เซอร์ของคุณไม่รองรับการขอพิกัดจีพีเอส');
            return;
        }

        if (locName) locName.textContent = 'กำลังขอพิกัด GPS...';

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                this.currentLat = position.coords.latitude;
                this.currentLng = position.coords.longitude;

                // Save to state/fields
                document.getElementById('setting-lat').value = this.currentLat.toFixed(4);
                document.getElementById('setting-lng').value = this.currentLng.toFixed(4);
                
                // Update Name
                if (locName) locName.textContent = 'พิกัด GPS ของคุณ';

                // Propagate to WeatherService
                if (window.weatherService) {
                    await window.weatherService.updateCoordinates(this.currentLat, this.currentLng);
                }
            },
            (error) => {
                console.error('GPS Geolocation error:', error);
                alert('ไม่สามารถระบุพิกัดของคุณได้ ระบบจะยังคงใช้พิกัดกรุงเทพฯ เป็นค่าตั้งต้น');
                if (locName) locName.textContent = 'กรุงเทพมหานคร';
            }
        );
    }

    async saveCustomCoordinates() {
        const latVal = parseFloat(document.getElementById('setting-lat').value);
        const lngVal = parseFloat(document.getElementById('setting-lng').value);

        if (isNaN(latVal) || isNaN(lngVal)) {
            alert('กรุณากรอกตัวเลขพิกัดที่ถูกต้อง');
            return;
        }

        this.currentLat = latVal;
        this.currentLng = lngVal;

        localStorage.setItem('siam_custom_lat', this.currentLat);
        localStorage.setItem('siam_custom_lng', this.currentLng);

        document.getElementById('current-location-name').textContent = 'พิกัดที่กำหนดเอง';

        if (window.weatherService) {
            await window.weatherService.updateCoordinates(this.currentLat, this.currentLng);
        }
        alert('บันทึกพิกัดใหม่และอัปเดตสภาพอากาศเรียบร้อยแล้ว!');
    }

    async resetCoordinates() {
        this.currentLat = 13.7946;
        this.currentLng = 100.3242;

        localStorage.removeItem('siam_custom_lat');
        localStorage.removeItem('siam_custom_lng');

        document.getElementById('setting-lat').value = this.currentLat;
        document.getElementById('setting-lng').value = this.currentLng;
        document.getElementById('current-location-name').textContent = 'ม.มหิดล (ศาลายา)';

        if (window.weatherService) {
            await window.weatherService.updateCoordinates(this.currentLat, this.currentLng);
        }
    }

    async loadInitialData() {
        // Fetch server status
        this.updateServerStatus();

        // Connect Weather Component
        if (window.weatherService) {
            // Inject cached variables
            window.weatherService.currentLat = this.currentLat;
            window.weatherService.currentLng = this.currentLng;
            
            // fetch weather
            await window.weatherService.fetchAndRenderAll();
        }

        // Connect News Component
        if (window.newsService) {
            await window.newsService.fetchLiveNews();
        }
        
        // Initial setup for icons
        if (window.lucide) window.lucide.createIcons();
    }

    initCommandPalette() {
        const overlay = document.getElementById('cmd-palette-overlay');
        const input = document.getElementById('cmd-palette-input');
        const list = document.getElementById('cmd-palette-list');
        if (!overlay || !input || !list) return;

        let activeIndex = -1;
        let items = [];

        const togglePalette = (show) => {
            overlay.style.display = show ? 'flex' : 'none';
            if (show) {
                input.value = '';
                renderResults('');
                input.focus();
            }
        };

        // Close on clicking outside
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) togglePalette(false);
        });
        
        // Listen for shortcuts: Cmd+K / Ctrl+K and ESC
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || e.code === 'KeyK')) {
                e.preventDefault();
                const isVisible = overlay.style.display === 'flex';
                togglePalette(!isVisible);
            }
            if (e.key === 'Escape') togglePalette(false);
        });

        // Search database
        const searchDatabase = [
            { type: 'tab', name: 'แดชบอร์ดสรุปรายวัน (Dashboard)', keywords: 'dashboard home overview summary หน้าแรก แดชบอร์ด', action: () => this.switchTab('dashboard') },
            { type: 'tab', name: 'พยากรณ์อากาศ & ฝุ่น (Weather & PM2.5)', keywords: 'weather rain forecast pm2.5 aqi dust ฝน อากาศ ฝุ่น', action: () => this.switchTab('weather') },
            { type: 'tab', name: 'การเดินทาง & จราจร (Transit & Traffic)', keywords: 'traffic transit camera bts mrt road ทางด่วน รถไฟฟ้า รถติด', action: () => this.switchTab('traffic') },
            { type: 'tab', name: 'ราคาน้ำมันวันนี้ (Oil Prices)', keywords: 'oil fuel price gas ptt bangchak ราคาน้ำมัน แก๊สโซฮอล์ ดีเซล', action: () => this.switchTab('oil') },
            { type: 'tab', name: 'ข่าวสารวันนี้ (Daily News)', keywords: 'news rss feed article update ข่าวสาร ข่าววันนี้ การเมือง กีฬา', action: () => this.switchTab('news') },
            { type: 'tab', name: 'เครื่องมือช่วยเหลือ (Helper Utilities)', keywords: 'utilities tool calc lotto convert gold เครื่องมือ ตัวแปลง คำนวณ หวย', action: () => this.switchTab('utilities') },
            { type: 'tab', name: 'บริการ & ลิงก์ภายใน (Services & Links)', keywords: 'services link home assistant nginx immich docker portainer บุ๊กมาร์ก ลิงก์ บริการ', action: () => this.switchTab('services') },
            { type: 'tab', name: 'เบอร์โทรฉุกเฉิน (Emergency Contacts)', keywords: 'emergency phone call police hospital fire rescue สายด่วน เบอร์โทร ตำรวจ โรงพยาบาล ดับเพลิง', action: () => this.switchTab('emergency') }
        ];

        const renderResults = (query) => {
            list.innerHTML = '';
            activeIndex = -1;
            
            const cleanQuery = query.toLowerCase().trim();
            if (!cleanQuery) {
                items = searchDatabase.filter(d => d.type === 'tab');
            } else {
                items = searchDatabase.filter(d => {
                    return d.name.toLowerCase().includes(cleanQuery) || d.keywords.toLowerCase().includes(cleanQuery);
                }).slice(0, 10);
            }

            if (items.length === 0) {
                list.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 1.5rem 0; font-size: 0.85rem;">ไม่พบสิ่งที่คุณค้นหา ลองใช้คำอื่นดูนะ...</div>';
                return;
            }

            list.innerHTML = items.map((d, index) => {
                let icon = 'layout';
                let typeText = 'เมนูหลัก';
                let color = 'var(--primary-color)';

                if (d.type === 'utility') {
                    icon = 'wrench';
                    typeText = 'เครื่องมือ';
                    color = 'var(--accent-amber)';
                } else if (d.type === 'emergency') {
                    icon = 'phone';
                    typeText = 'สายด่วน';
                    color = 'var(--accent-red)';
                }

                return `
                    <div class="cmd-palette-item" data-index="${index}" style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; border-radius: 10px; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; background: rgba(255,255,255,0.01);">
                        <div style="display: flex; align-items: center; gap: 0.65rem;">
                            <i data-lucide="${icon}" style="width: 14px; height: 14px; color: ${color};"></i>
                            <span style="font-size: 0.85rem; color: var(--text-main); font-weight: 500;">${d.name}</span>
                        </div>
                        <span style="font-size: 0.65rem; background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 12px; color: var(--text-muted); border: 1px solid var(--border-color);">${typeText}</span>
                    </div>
                `;
            }).join('');

            list.querySelectorAll('.cmd-palette-item').forEach(el => {
                el.addEventListener('click', () => {
                    const idx = parseInt(el.getAttribute('data-index'), 10);
                    items[idx].action();
                    togglePalette(false);
                });
            });

            if (window.lucide) window.lucide.createIcons();
        };

        input.addEventListener('input', (e) => {
            renderResults(e.target.value);
        });

        input.addEventListener('keydown', (e) => {
            const listItems = list.querySelectorAll('.cmd-palette-item');
            if (listItems.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % listItems.length;
                updateActiveItem(listItems);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + listItems.length) % listItems.length;
                updateActiveItem(listItems);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < items.length) {
                    items[activeIndex].action();
                    togglePalette(false);
                } else if (items.length > 0) {
                    items[0].action();
                    togglePalette(false);
                }
            }
        });

        const updateActiveItem = (listItems) => {
            listItems.forEach(el => el.classList.remove('active'));
            if (activeIndex >= 0 && activeIndex < listItems.length) {
                listItems[activeIndex].classList.add('active');
                listItems[activeIndex].scrollIntoView({ block: 'nearest' });
            }
        };
    }

    initDashboardDraggable() {
        const container = document.getElementById('dashboard-draggable-grid');
        if (!container) return;

        const draggables = container.querySelectorAll('.draggable-card');
        const resetBtn = document.getElementById('btn-reset-dashboard');

        // Apply visibility state of hidden widgets immediately
        const savedHidden = localStorage.getItem('siam_daily_hidden_widgets');
        if (savedHidden) {
            try {
                const hiddenWidgets = JSON.parse(savedHidden);
                draggables.forEach(card => {
                    if (hiddenWidgets.includes(card.id)) {
                        card.style.display = 'none';
                    }
                });
            } catch(e) {
                console.error(e);
            }
        }

        // Restore layout from localStorage
        const savedLayout = localStorage.getItem('siam_daily_dashboard_layout');
        if (savedLayout) {
            try {
                const order = JSON.parse(savedLayout);
                order.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) container.appendChild(el);
                });
            } catch (e) {
                console.error("Failed to parse saved layout", e);
            }
        }

        let placeholder = document.createElement('div');
        placeholder.className = 'draggable-placeholder';

        draggables.forEach(draggable => {
            const dragHandle = draggable.querySelector('.drag-handle');
            if (dragHandle) {
                // Default to false so text/inputs inside can be selected/clicked freely
                draggable.setAttribute('draggable', 'false');

                // Enable dragging only when interacting with the handle
                dragHandle.addEventListener('mousedown', () => {
                    draggable.setAttribute('draggable', 'true');
                });
                dragHandle.addEventListener('mouseup', () => {
                    draggable.setAttribute('draggable', 'false');
                });
                dragHandle.addEventListener('mouseleave', () => {
                    draggable.setAttribute('draggable', 'false');
                });

                // Touch support for mobile
                dragHandle.addEventListener('touchstart', () => {
                    draggable.setAttribute('draggable', 'true');
                });
                dragHandle.addEventListener('touchend', () => {
                    draggable.setAttribute('draggable', 'false');
                });
            } else {
                draggable.setAttribute('draggable', 'false');
            }

            // Limit dragging start to the handle ONLY
            draggable.addEventListener('dragstart', (e) => {
                const dragHandle = draggable.querySelector('.drag-handle');
                if (dragHandle) {
                    const isHandle = e.target.classList.contains('drag-handle') || e.target.closest('.drag-handle');
                    if (!isHandle) {
                        e.preventDefault();
                        return;
                    }
                }
                draggable.classList.add('dragging');
                if (draggable.classList.contains('widget-wide')) {
                    placeholder.classList.add('widget-wide');
                } else {
                    placeholder.classList.remove('widget-wide');
                }
            });

            draggable.addEventListener('dragend', () => {
                draggable.classList.remove('dragging');
                draggable.setAttribute('draggable', 'false'); // Disable dragging again
                if (placeholder.parentNode) {
                    placeholder.parentNode.removeChild(placeholder);
                }
                
                // Save layout
                const currentOrder = Array.from(container.querySelectorAll('.draggable-card')).map(card => card.id);
                localStorage.setItem('siam_daily_dashboard_layout', JSON.stringify(currentOrder));

                // Auto sync to cloud
                if (typeof this.syncDataToCloud === 'function') {
                    this.syncDataToCloud();
                }
            });
        });

        container.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(container, e.clientY, e.clientX);
            const draggable = document.querySelector('.dragging');
            if (!draggable) return;
            
            if (afterElement == null) {
                container.appendChild(placeholder);
                container.appendChild(draggable);
            } else {
                container.insertBefore(placeholder, afterElement);
                container.insertBefore(draggable, afterElement);
            }
        });

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                localStorage.removeItem('siam_daily_dashboard_layout');
                localStorage.removeItem('siam_daily_hidden_widgets');
                window.location.reload();
            });
        }
    }

    initWidgetManager() {
        const btnManage = document.getElementById('btn-manage-widgets');
        const modal = document.getElementById('widget-manager-modal');
        const btnClose = document.getElementById('btn-close-widget-modal');
        const btnSave = document.getElementById('btn-save-widgets');
        const listContainer = document.getElementById('widget-manager-list');
        const gridContainer = document.getElementById('dashboard-draggable-grid');

        if (!btnManage || !modal || !listContainer || !gridContainer) return;

        const widgetConfig = {
            'widget-greeting': { name: 'เวลาและคำทักทาย (Clock & Greeting)', icon: 'sun' },
            'widget-weather': { name: 'สภาพอากาศปัจจุบัน (Weather)', icon: 'cloud-sun' },
            'widget-pm25': { name: 'ค่าฝุ่น PM2.5 (Air Quality)', icon: 'wind' },
            'widget-traffic': { name: 'การเดินทางและจราจร (Transit)', icon: 'navigation' },
            'widget-vps': { name: 'สถานะเซิร์ฟเวอร์ VPS (Server)', icon: 'hard-drive' },
            'widget-notes': { name: 'สมุดบันทึกด่วน (Notes)', icon: 'sticky-note' },
            'widget-expense': { name: 'บันทึกรายจ่ายย่อย (Expenses)', icon: 'wallet' },
            'widget-news': { name: 'เกาะติดข่าววันนี้ (News Snippet)', icon: 'newspaper' },
            'widget-checklist': { name: 'สิ่งที่ต้องทำวันนี้ (Todo Checklist)', icon: 'check-square' },
            'widget-habits': { name: 'ตารางติดตามนิสัย (Habit Tracker)', icon: 'calendar-check-2' },
            'widget-radio': { name: 'วิทยุออนไลน์และเสียงพื้นหลัง (Radio & Sound)', icon: 'radio' },
            'widget-shortcuts': { name: 'บุ๊กมาร์กและลิงก์ด่วน (Shortcuts & Bookmarks)', icon: 'bookmark' },
            'widget-pomodoro': { name: 'โฟกัส Pomodoro & เสียงธรรมชาติ (Focus)', icon: 'timer' },
            'widget-finance': { name: 'ตลาดการเงินและราคาทองคำ (Market)', icon: 'trending-up' }
        };

        // Load hidden widgets state
        let hiddenWidgets = [];
        const savedHidden = localStorage.getItem('siam_daily_hidden_widgets');
        if (savedHidden) {
            try {
                hiddenWidgets = JSON.parse(savedHidden);
            } catch(e) {
                console.error(e);
            }
        }

        const applyVisibility = () => {
            Object.keys(widgetConfig).forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    if (hiddenWidgets.includes(id)) {
                        el.style.display = 'none';
                    } else {
                        el.style.display = ''; // Restore default display
                    }
                }
            });
        };
        
        applyVisibility();

        const renderManagerItems = () => {
            listContainer.innerHTML = '';
            const currentCards = Array.from(gridContainer.querySelectorAll('.draggable-card'));
            
            currentCards.forEach((card, index) => {
                const id = card.id;
                const conf = widgetConfig[id];
                if (!conf) return;

                const isHidden = hiddenWidgets.includes(id);

                const row = document.createElement('div');
                row.className = 'widget-manager-row';
                row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); padding: 0.65rem 1rem; border-radius: 12px; gap: 1rem; font-family: var(--font-thai); box-sizing: border-box;';

                row.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0; flex-grow: 1;">
                        <i data-lucide="${conf.icon}" style="width: 16px; height: 16px; color: var(--accent-cyan); flex-shrink: 0;"></i>
                        <span style="font-size: 0.8rem; font-weight: 500; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${conf.name}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
                        <!-- Move Up Button -->
                        <button class="btn-move-up btn-icon" data-id="${id}" style="padding: 2px 6px; cursor: pointer; border-radius: 6px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.02); color: var(--text-main);" ${index === 0 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}>
                            <i data-lucide="arrow-up" style="width: 14px; height: 14px;"></i>
                        </button>
                        <!-- Move Down Button -->
                        <button class="btn-move-down btn-icon" data-id="${id}" style="padding: 2px 6px; cursor: pointer; border-radius: 6px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.02); color: var(--text-main);" ${index === currentCards.length - 1 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}>
                            <i data-lucide="arrow-down" style="width: 14px; height: 14px;"></i>
                        </button>
                        <!-- Toggle Switch -->
                        <label style="position: relative; display: inline-block; width: 34px; height: 20px; margin-left: 0.25rem; cursor: pointer;">
                            <input type="checkbox" class="widget-toggle-checkbox" data-id="${id}" ${!isHidden ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                            <span class="widget-toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.1); border: 1px solid var(--border-color); transition: .3s; border-radius: 20px;"></span>
                        </label>
                    </div>
                `;

                listContainer.appendChild(row);
            });

            if (window.lucide) window.lucide.createIcons();

            // Bind Reordering Events
            listContainer.querySelectorAll('.btn-move-up').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    const el = document.getElementById(id);
                    if (el && el.previousElementSibling) {
                        gridContainer.insertBefore(el, el.previousElementSibling);
                        saveCurrentLayoutOrder();
                        renderManagerItems();
                    }
                });
            });

            listContainer.querySelectorAll('.btn-move-down').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    const el = document.getElementById(id);
                    if (el && el.nextElementSibling) {
                        gridContainer.insertBefore(el.nextElementSibling, el);
                        saveCurrentLayoutOrder();
                        renderManagerItems();
                    }
                });
            });

            // Bind Toggle Visibility Events
            listContainer.querySelectorAll('.widget-toggle-checkbox').forEach(chk => {
                chk.addEventListener('change', () => {
                    const id = chk.getAttribute('data-id');
                    if (chk.checked) {
                        hiddenWidgets = hiddenWidgets.filter(w => w !== id);
                    } else {
                        if (!hiddenWidgets.includes(id)) hiddenWidgets.push(id);
                    }
                    localStorage.setItem('siam_daily_hidden_widgets', JSON.stringify(hiddenWidgets));
                    applyVisibility();
                    
                    if (typeof this.syncDataToCloud === 'function') {
                        this.syncDataToCloud();
                    }
                });
            });
        };

        const saveCurrentLayoutOrder = () => {
            const currentOrder = Array.from(gridContainer.querySelectorAll('.draggable-card')).map(card => card.id);
            localStorage.setItem('siam_daily_dashboard_layout', JSON.stringify(currentOrder));
            
            if (typeof this.syncDataToCloud === 'function') {
                this.syncDataToCloud();
            }
        };

        btnManage.addEventListener('click', () => {
            modal.style.display = 'flex';
            renderManagerItems();
        });

        const closeModal = () => {
            modal.style.display = 'none';
        };

        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnSave) btnSave.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    getDragAfterElement(container, y, x) {
        const draggableElements = [...container.querySelectorAll('.draggable-card:not(.dragging)')];
        let closestElement = null;
        let minDistance = Number.POSITIVE_INFINITY;

        draggableElements.forEach(child => {
            const box = child.getBoundingClientRect();
            const boxCenterX = box.left + box.width / 2;
            const boxCenterY = box.top + box.height / 2;
            const distance = Math.sqrt(Math.pow(x - boxCenterX, 2) + Math.pow(y - boxCenterY, 2));
            
            if (distance < minDistance) {
                minDistance = distance;
                if (y < boxCenterY || (y < box.bottom && y > box.top && x < boxCenterX)) {
                    closestElement = child;
                } else {
                    closestElement = child.nextElementSibling;
                }
            }
        });
        
        return closestElement;
    }

    initDashboardExtras() {
        // --- Greeting & Clock ---
        const clockTime = document.getElementById('dash-clock-time');
        const clockDate = document.getElementById('dash-clock-date');
        const greetingText = document.getElementById('dash-greeting-text');
        const greetingIcon = document.getElementById('dash-greeting-icon');
        const greetingIconBg = document.getElementById('dash-greeting-icon-bg');

        const updateClock = () => {
            const now = new Date();
            if (clockTime) {
                clockTime.textContent = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            }
            if (clockDate) {
                clockDate.textContent = now.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            }
            
            const hour = now.getHours();
            let greeting = "สวัสดี";
            let icon = "sun";
            let color = "var(--primary-color)";
            let bg = "rgba(99,102,241,0.1)";

            if (hour >= 5 && hour < 12) {
                greeting = "สวัสดีตอนเช้า 🌅";
                icon = "sunrise";
                color = "var(--accent-amber)";
                bg = "rgba(245, 158, 11, 0.1)";
            } else if (hour >= 12 && hour < 17) {
                greeting = "สวัสดีตอนบ่าย ☀️";
                icon = "sun";
                color = "var(--accent-amber)";
                bg = "rgba(245, 158, 11, 0.1)";
            } else if (hour >= 17 && hour < 20) {
                greeting = "สวัสดีตอนเย็น 🌆";
                icon = "sunset";
                color = "var(--accent-red)";
                bg = "rgba(239, 68, 68, 0.1)";
            } else {
                greeting = "ราตรีสวัสดิ์ 🌙";
                icon = "moon";
                color = "var(--accent-cyan)";
                bg = "rgba(6, 182, 212, 0.1)";
            }

            const displayName = localStorage.getItem('siam_user_display_name') || '';
            const nameSuffix = displayName ? `, คุณ${displayName}` : '';
            if (greetingText) greetingText.innerHTML = `<i data-lucide="grip-horizontal" class="drag-handle" style="width: 16px; color: var(--text-muted); cursor: grab; margin-right: 0.5rem;"></i>${greeting}${nameSuffix}`;
            
            const customAvatar = localStorage.getItem('siam_user_avatar');
            const avatarGradients = {
                sunset: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                ocean: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                forest: 'linear-gradient(135deg, #10b981, #047857)',
                neon: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                midnight: 'linear-gradient(135deg, #475569, #1e293b)',
                candy: 'linear-gradient(135deg, #fbbf24, #f43f5e)'
            };

            if (greetingIconBg) {
                if (customAvatar && avatarGradients[customAvatar]) {
                    greetingIconBg.style.background = avatarGradients[customAvatar];
                    if (greetingIcon) {
                        greetingIcon.setAttribute('data-lucide', 'user');
                        greetingIcon.style.color = '#ffffff';
                    }
                } else {
                    greetingIconBg.style.background = bg;
                    if (greetingIcon) {
                        greetingIcon.setAttribute('data-lucide', icon);
                        greetingIcon.style.color = color;
                    }
                }
            }
            if (window.lucide) window.lucide.createIcons();
        };

        setInterval(updateClock, 10000); // Update every 10s so time is accurate
        updateClock();

        // --- Mini Expense Tracker ---
        const expAmount = document.getElementById('dash-expense-amount');
        const expNote = document.getElementById('dash-expense-note');
        const btnAddExp = document.getElementById('dash-btn-add-expense');
        const expTotal = document.getElementById('dash-expense-total');
        
        let todayTotal = parseFloat(localStorage.getItem('siam_daily_expense_total')) || 0;
        let lastDate = localStorage.getItem('siam_daily_expense_date');
        let categories = { food: 0, travel: 0, shopping: 0, bills: 0, other: 0 };
        
        const savedCategories = localStorage.getItem('siam_daily_expense_categories');
        if (savedCategories) {
            try {
                categories = JSON.parse(savedCategories);
            } catch (e) {
                console.error(e);
            }
        }

        const todayStr = new Date().toLocaleDateString('th-TH');
        if (lastDate !== todayStr) {
            todayTotal = 0;
            categories = { food: 0, travel: 0, shopping: 0, bills: 0, other: 0 };
            localStorage.setItem('siam_daily_expense_total', 0);
            localStorage.setItem('siam_daily_expense_categories', JSON.stringify(categories));
            localStorage.setItem('siam_daily_expense_date', todayStr);
        }

        const updateExpenseBarUI = () => {
            if (expTotal) {
                expTotal.textContent = todayTotal.toLocaleString('th-TH', {minimumFractionDigits:0, maximumFractionDigits:2});
            }
            
            // Update counts in legend and bar segments
            const keys = ['food', 'travel', 'shopping', 'bills', 'other'];
            keys.forEach(k => {
                const span = document.getElementById(`txt-exp-${k}`);
                if (span) span.textContent = categories[k].toLocaleString('th-TH');
                
                const bar = document.getElementById(`dash-expense-bar-${k}`);
                if (bar) {
                    const pct = todayTotal > 0 ? (categories[k] / todayTotal) * 100 : 0;
                    bar.style.width = `${pct}%`;
                }
            });
        };

        updateExpenseBarUI();

        if (btnAddExp && expAmount) {
            btnAddExp.addEventListener('click', () => {
                const amount = parseFloat(expAmount.value);
                if (isNaN(amount) || amount <= 0) return;
                
                const catSelect = document.getElementById('dash-expense-category');
                const selectedCat = catSelect ? catSelect.value : 'other';

                todayTotal += amount;
                categories[selectedCat] = (categories[selectedCat] || 0) + amount;

                localStorage.setItem('siam_daily_expense_total', todayTotal);
                localStorage.setItem('siam_daily_expense_categories', JSON.stringify(categories));
                localStorage.setItem('siam_daily_expense_date', todayStr);
                
                updateExpenseBarUI();

                if (expTotal) {
                    expTotal.style.transform = "scale(1.3)";
                    setTimeout(() => expTotal.style.transform = "scale(1)", 200);
                }
                
                expAmount.value = '';
                if (expNote) expNote.value = '';
                
                // Sync to cloud
                this.syncDataToCloud();
            });
        }
        


        // Initialize Bookmarks/Shortcuts Widget
        this.initShortcutsWidget();

        // Initialize Pomodoro Focus & Finance Widgets
        this.initPomodoroWidget();
        this.initFinanceWidget();
    }

    initShortcutsWidget() {
        const btnToggleForm = document.getElementById('btn-toggle-add-shortcut');
        const addForm = document.getElementById('shortcut-add-form');
        const btnCancel = document.getElementById('btn-cancel-shortcut');
        const btnSave = document.getElementById('btn-save-shortcut');
        const inputTitle = document.getElementById('shortcut-title');
        const inputUrl = document.getElementById('shortcut-url');
        const grid = document.getElementById('shortcuts-grid');

        if (!grid) return;

        // Load shortcuts from localStorage or set defaults
        let shortcuts = [];
        const savedShortcuts = localStorage.getItem('siam_dashboard_shortcuts');
        if (savedShortcuts) {
            try {
                shortcuts = JSON.parse(savedShortcuts);
            } catch (e) {
                console.error(e);
            }
        } else {
            // Default shortcuts
            shortcuts = [
                { title: 'Google', url: 'https://google.com' },
                { title: 'YouTube', url: 'https://youtube.com' },
                { title: 'GitHub', url: 'https://github.com' }
            ];
            localStorage.setItem('siam_dashboard_shortcuts', JSON.stringify(shortcuts));
        }

        const renderShortcuts = () => {
            grid.innerHTML = '';
            shortcuts.forEach((item, index) => {
                // Get letter representation
                const initial = item.title ? item.title.charAt(0).toUpperCase() : '?';
                
                const link = document.createElement('div');
                link.className = 'shortcut-item-container';
                link.style.cssText = 'position: relative; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 12px; padding: 0.6rem 0.75rem; transition: all 0.2s ease; cursor: pointer; text-decoration: none;';
                
                // Add hover effect via JS for maximum compatibility
                link.addEventListener('mouseenter', () => {
                    link.style.background = 'rgba(255,255,255,0.08)';
                    link.style.borderColor = 'var(--accent-cyan)';
                    const delBtn = link.querySelector('.btn-delete-shortcut');
                    if (delBtn) delBtn.style.opacity = '1';
                });
                link.addEventListener('mouseleave', () => {
                    link.style.background = 'rgba(255,255,255,0.03)';
                    link.style.borderColor = 'var(--border-color)';
                    const delBtn = link.querySelector('.btn-delete-shortcut');
                    if (delBtn) delBtn.style.opacity = '0';
                });

                link.innerHTML = `
                    <a href="${item.url}" target="_blank" style="display: flex; align-items: center; gap: 0.5rem; text-decoration: none; min-width: 0; flex-grow: 1; color: var(--text-main);">
                        <div style="width: 24px; height: 24px; border-radius: 6px; background: rgba(6,182,212,0.15); color: var(--accent-cyan); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink:0; font-family: var(--font-english);">${initial}</div>
                        <span style="font-size: 0.78rem; font-weight: 500; font-family: var(--font-thai); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title}</span>
                    </a>
                    <button class="btn-delete-shortcut" data-index="${index}" style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: rgba(239,68,68,0.15); border: none; color: var(--accent-red); width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: opacity 0.2s ease; padding:0; outline: none;" title="ลบทางลัด">
                        <i data-lucide="x" style="width: 10px; height: 10px;"></i>
                    </button>
                `;

                // Delete click
                link.querySelector('.btn-delete-shortcut').addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
                    shortcuts.splice(idx, 1);
                    localStorage.setItem('siam_dashboard_shortcuts', JSON.stringify(shortcuts));
                    renderShortcuts();
                    this.syncDataToCloud();
                });

                grid.appendChild(link);
            });

            if (window.lucide) window.lucide.createIcons();
        };

        if (btnToggleForm && addForm) {
            btnToggleForm.addEventListener('click', () => {
                if (addForm.style.display === 'none') {
                    addForm.style.display = 'flex';
                    if (inputTitle) inputTitle.focus();
                } else {
                    addForm.style.display = 'none';
                }
            });
        }

        if (btnCancel && addForm) {
            btnCancel.addEventListener('click', () => {
                addForm.style.display = 'none';
                if (inputTitle) inputTitle.value = '';
                if (inputUrl) inputUrl.value = '';
            });
        }

        if (btnSave && addForm && inputTitle && inputUrl) {
            btnSave.addEventListener('click', () => {
                const title = inputTitle.value.trim();
                let url = inputUrl.value.trim();

                if (!title || !url) return;

                // Add protocol if missing
                if (!/^https?:\/\//i.test(url)) {
                    url = 'https://' + url;
                }

                shortcuts.push({ title, url });
                localStorage.setItem('siam_dashboard_shortcuts', JSON.stringify(shortcuts));
                renderShortcuts();
                
                // Clear & hide
                inputTitle.value = '';
                inputUrl.value = '';
                addForm.style.display = 'none';

                this.syncDataToCloud();
            });
        }

        renderShortcuts();
    }

    initPomodoroWidget() {
        const display = document.getElementById('dash-pomo-display');
        const status = document.getElementById('dash-pomo-status');
        const btnStart = document.getElementById('dash-btn-pomo-start');
        const btnReset = document.getElementById('dash-btn-pomo-reset');
        const typeSelect = document.getElementById('dash-pomo-type-select');
        const ambientSelect = document.getElementById('dash-pomo-ambient-select');
        const volContainer = document.getElementById('dash-pomo-ambient-vol-container');
        const volSlider = document.getElementById('dash-pomo-ambient-volume');
        const volLabel = document.getElementById('dash-pomo-ambient-volume-label');
        const startText = document.getElementById('dash-pomo-start-text');
        const playIcon = document.getElementById('dash-pomo-play-icon');

        if (!display) return;

        let timeLeft = parseInt(typeSelect.value) * 60;
        let timerId = null;
        let isRunning = false;
        let ambientAudio = null;

        const ambientUrls = {
            rain: 'https://actions.google.com/sounds/v1/weather/light_rain.ogg',
            waves: 'https://actions.google.com/sounds/v1/water/ocean_waves_crashing.ogg',
            forest: 'https://actions.google.com/sounds/v1/ambiences/spring_day_forest.ogg',
            cafe: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg'
        };

        const updateDisplay = () => {
            const mins = Math.floor(timeLeft / 60);
            const secs = timeLeft % 60;
            display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        };

        const stopTimer = () => {
            if (timerId) {
                clearInterval(timerId);
                timerId = null;
            }
            isRunning = false;
            const currentStartText = document.getElementById('dash-pomo-start-text');
            const currentPlayIcon = document.getElementById('dash-pomo-play-icon');
            if (currentStartText) currentStartText.textContent = 'เริ่มโฟกัส';
            if (currentPlayIcon) currentPlayIcon.setAttribute('data-lucide', 'play');
            if (window.lucide) window.lucide.createIcons();
            
            // Pause ambient audio if playing
            if (ambientAudio && !ambientAudio.paused) {
                ambientAudio.pause();
            }
        };

        const playChime = () => {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g);
                g.connect(ctx.destination);
                o.frequency.setValueAtTime(800, ctx.currentTime);
                g.gain.setValueAtTime(0.5, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
                o.start();
                o.stop(ctx.currentTime + 1.5);
            } catch (e) {
                console.error(e);
            }
        };

        const startTimer = () => {
            if (isRunning) return;
            isRunning = true;
            const currentStartText = document.getElementById('dash-pomo-start-text');
            const currentPlayIcon = document.getElementById('dash-pomo-play-icon');
            if (currentStartText) currentStartText.textContent = 'หยุดชั่วคราว';
            if (currentPlayIcon) currentPlayIcon.setAttribute('data-lucide', 'pause');
            if (window.lucide) window.lucide.createIcons();

            // Play ambient audio if selected
            playAmbient();

            timerId = setInterval(() => {
                timeLeft--;
                updateDisplay();

                if (timeLeft <= 0) {
                    stopTimer();
                    playChime();
                    alert('หมดยกโฟกัสแล้วค่ะ! เก่งมากเลย');
                    // Reset to mode default
                    timeLeft = parseInt(typeSelect.value) * 60;
                    updateDisplay();
                }
            }, 1000);
        };

        const playAmbient = () => {
            const selected = ambientSelect.value;
            if (selected === 'none') {
                if (ambientAudio) {
                    ambientAudio.pause();
                    ambientAudio = null;
                }
                if (volContainer) volContainer.style.display = 'none';
                return;
            }

            if (volContainer) volContainer.style.display = 'flex';
            
            if (isRunning) {
                if (ambientAudio) {
                    ambientAudio.pause();
                }
                ambientAudio = new Audio(ambientUrls[selected]);
                ambientAudio.loop = true;
                ambientAudio.volume = parseFloat(volSlider.value);
                ambientAudio.play().catch(err => console.warn('Ambient autoplay prevented:', err));
            }
        };

        btnStart.addEventListener('click', () => {
            if (isRunning) {
                stopTimer();
            } else {
                startTimer();
            }
        });

        btnReset.addEventListener('click', () => {
            stopTimer();
            timeLeft = parseInt(typeSelect.value) * 60;
            updateDisplay();
            status.textContent = 'พร้อมที่จะตั้งสมาธิหรือยังคะ?';
        });

        typeSelect.addEventListener('change', () => {
            stopTimer();
            timeLeft = parseInt(typeSelect.value) * 60;
            updateDisplay();
            
            if (typeSelect.value === '25') {
                status.textContent = 'ได้เวลาลุยงานแล้วค่ะ!';
            } else if (typeSelect.value === '5') {
                status.textContent = 'พักผ่อนหย่อนใจสั้นๆ โล่งๆ สมอง';
            } else if (typeSelect.value === '15') {
                status.textContent = 'พักยาวสะสมพลัง ชาร์บแบตเต็มที่';
            }
        });

        ambientSelect.addEventListener('change', () => {
            if (ambientSelect.value === 'none') {
                if (ambientAudio) {
                    ambientAudio.pause();
                    ambientAudio = null;
                }
                if (volContainer) volContainer.style.display = 'none';
            } else {
                if (volContainer) volContainer.style.display = 'flex';
                if (isRunning) {
                    playAmbient();
                }
            }
        });

        volSlider.addEventListener('input', () => {
            const vol = parseFloat(volSlider.value);
            if (volLabel) volLabel.textContent = `${Math.round(vol * 100)}%`;
            if (ambientAudio) {
                ambientAudio.volume = vol;
            }
        });
    }

    initFinanceWidget() {
        const goldBuy = document.getElementById('dash-gold-buy');
        const goldSell = document.getElementById('dash-gold-sell');
        const goldDiff = document.getElementById('dash-gold-diff');
        const btcPrice = document.getElementById('dash-crypto-btc');
        const btcChange = document.getElementById('dash-crypto-btc-change');
        const ethPrice = document.getElementById('dash-crypto-eth');
        const ethChange = document.getElementById('dash-crypto-eth-change');
        const updateTime = document.getElementById('dash-finance-update');

        if (!goldBuy) return;

        const fetchFinanceData = async () => {
            try {
                // Fetch gold rates
                const goldRes = await fetch('/api/gold');
                if (goldRes.ok) {
                    const goldData = await goldRes.json();
                    if (goldData && goldData.success) {
                        goldBuy.textContent = `${goldData.barBuy} ฿`;
                        goldSell.textContent = `${goldData.barSell} ฿`;
                        
                        // Calculate gold diff locally if not provided
                        const currentSellNum = parseFloat(String(goldData.barSell || '').replace(/,/g, ''));
                        if (!isNaN(currentSellNum)) {
                            const prevSell = parseFloat(localStorage.getItem('siam_prev_gold_sell'));
                            if (prevSell && prevSell !== currentSellNum) {
                                const diffVal = currentSellNum - prevSell;
                                const diffText = diffVal > 0 ? `+${diffVal.toLocaleString()}` : diffVal.toLocaleString();
                                const diffColor = diffVal > 0 ? 'var(--accent-green)' : 'var(--accent-red)';
                                goldDiff.textContent = diffText;
                                goldDiff.style.color = diffColor;
                            } else {
                                goldDiff.textContent = 'คงที่';
                                goldDiff.style.color = 'var(--text-muted)';
                            }
                            localStorage.setItem('siam_prev_gold_sell', currentSellNum);
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching gold in dashboard widget:', err);
            }

            try {
                // Fetch crypto rates
                const cryptoRes = await fetch('/api/crypto');
                if (cryptoRes.ok) {
                    const cryptoData = await cryptoRes.json();
                    if (cryptoData && cryptoData.success) {
                        const btc = cryptoData.rates.BTC;
                        const eth = cryptoData.rates.ETH;
                        const changes = cryptoData.changes || {};

                        if (btcPrice && btc) {
                            btcPrice.textContent = `$${btc.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
                        }
                        if (btcChange && changes.BTC !== undefined) {
                            const btcChangeVal = parseFloat(changes.BTC);
                            btcChange.textContent = `${btcChangeVal >= 0 ? '+' : ''}${btcChangeVal.toFixed(2)}%`;
                            btcChange.style.color = btcChangeVal >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
                        }

                        if (ethPrice && eth) {
                            ethPrice.textContent = `$${eth.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
                        }
                        if (ethChange && changes.ETH !== undefined) {
                            const ethChangeVal = parseFloat(changes.ETH);
                            ethChange.textContent = `${ethChangeVal >= 0 ? '+' : ''}${ethChangeVal.toFixed(2)}%`;
                            ethChange.style.color = ethChangeVal >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching crypto in dashboard widget:', err);
            }

            if (updateTime) {
                const now = new Date();
                updateTime.textContent = `อัปเดต: ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
            }
        };

        // Fetch immediately and set interval of 60 seconds
        fetchFinanceData();
        setInterval(fetchFinanceData, 60000);
    }

    initStickyNotesWidget() {
        const grid = document.getElementById('sticky-notes-grid');
        const btnAdd = document.getElementById('btn-add-note');
        const btnCopy = document.getElementById('btn-copy-notes');
        const btnExport = document.getElementById('btn-export-notes');
        const btnClear = document.getElementById('btn-clear-notes');

        if (!grid) return;

        let notes = [];

        // Load notes from localStorage
        const saved = localStorage.getItem('siam_daily_sticky_notes');
        if (saved) {
            try {
                notes = JSON.parse(saved);
            } catch(e) {
                console.error(e);
            }
        } else {
            // Migration fallback from old siam_daily_notes (if any)
            const oldNotes = localStorage.getItem('siam_daily_notes');
            if (oldNotes && oldNotes.trim()) {
                notes = [{
                    id: Date.now(),
                    title: 'บันทึกของฉัน',
                    content: oldNotes,
                    color: 'default'
                }];
                localStorage.setItem('siam_daily_sticky_notes', JSON.stringify(notes));
            } else {
                // Default notes
                notes = [{
                    id: Date.now(),
                    title: 'ยินดีต้อนรับสู่สมุดโน้ตด่วน!',
                    content: 'คุณสามารถบันทึกตารางงาน สิ่งที่ต้องทำ หรือโน้ตย่อยที่นี่\n\n💡 ลองกด "+ เพิ่มโน้ต" และเลือกสีกระดาษพาสเทลแยกความสำคัญดูนะคะ',
                    color: 'default'
                }];
                localStorage.setItem('siam_daily_sticky_notes', JSON.stringify(notes));
            }
        }

        const colors = {
            default: { bg: 'var(--note-default-bg)', border: 'var(--note-default-border)', text: 'var(--note-default-text)', glow: 'transparent' },
            yellow: { bg: 'var(--note-yellow-bg)', border: 'var(--note-yellow-border)', text: 'var(--note-yellow-text)', glow: 'var(--note-yellow-glow)' },
            blue: { bg: 'var(--note-blue-bg)', border: 'var(--note-blue-border)', text: 'var(--note-blue-text)', glow: 'var(--note-blue-glow)' },
            pink: { bg: 'var(--note-pink-bg)', border: 'var(--note-pink-border)', text: 'var(--note-pink-text)', glow: 'var(--note-pink-glow)' },
            green: { bg: 'var(--note-green-bg)', border: 'var(--note-green-border)', text: 'var(--note-green-text)', glow: 'var(--note-green-glow)' }
        };

        const saveNotes = () => {
            localStorage.setItem('siam_daily_sticky_notes', JSON.stringify(notes));
            this.syncDataToCloud();
        };

        const renderNotes = () => {
            grid.innerHTML = '';
            
            if (notes.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 2rem 0; color: var(--text-muted); font-family: var(--font-thai);">
                        <span style="font-size: 0.8rem;">ไม่มีโน้ตสะสมในขณะนี้ค่ะ กด "+ เพิ่มโน้ต" ด้านบนได้เลย</span>
                    </div>
                `;
                return;
            }

            notes.forEach((note) => {
                const noteColor = colors[note.color] || colors.default;
                
                const card = document.createElement('div');
                card.style.cssText = `background: ${noteColor.bg}; border: 1px solid ${noteColor.border}; border-radius: 12px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; transition: all 0.25s ease; position: relative; box-shadow: 0 4px 10px rgba(0,0,0,0.1);`;
                
                // Add hover glow
                card.addEventListener('mouseenter', () => {
                    card.style.boxShadow = `0 6px 15px rgba(0,0,0,0.15), 0 0 6px ${noteColor.border}`;
                });
                card.addEventListener('mouseleave', () => {
                    card.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
                });

                card.innerHTML = `
                    <!-- Note Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
                        <input class="note-title-input" type="text" placeholder="หัวข้อ..." style="background: transparent; border: none; border-bottom: 1px dashed transparent; outline: none; font-size: 0.82rem; font-weight: 700; color: ${noteColor.text}; width: 100%; font-family: var(--font-thai); transition: border-color 0.2s;" onfocus="this.style.borderColor='${noteColor.border}'" onblur="this.style.borderColor='transparent'">
                        <button class="btn-delete-note" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; outline: none; display: flex; align-items: center; justify-content: center; padding: 2px; border-radius: 4px; transition: color 0.2s;" title="ลบโน้ต">
                            <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                    <!-- Note Content -->
                    <textarea class="note-content-input" placeholder="เขียนข้อความ..." style="background: transparent; border: none; outline: none; resize: none; font-size: 0.78rem; line-height: 1.4; color: var(--text-main); min-height: 90px; width: 100%; font-family: var(--font-thai); scrollbar-width: none;"></textarea>
                    <!-- Note Footer Toolbar -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 0.4rem; font-family: var(--font-thai);">
                        <!-- Color Palette Picker -->
                        <div style="display: flex; gap: 0.35rem; align-items: center;">
                            <span class="color-dot" data-color="default" style="width: 10px; height: 10px; border-radius: 50%; background: #9ca3af; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; ${note.color === 'default' ? 'transform: scale(1.3); border-color: white;' : ''}" title="สีเทา"></span>
                            <span class="color-dot" data-color="yellow" style="width: 10px; height: 10px; border-radius: 50%; background: var(--accent-amber); cursor: pointer; ${note.color === 'yellow' ? 'transform: scale(1.3); border-color: white;' : ''}" title="สีเหลือง"></span>
                            <span class="color-dot" data-color="blue" style="width: 10px; height: 10px; border-radius: 50%; background: var(--accent-cyan); cursor: pointer; ${note.color === 'blue' ? 'transform: scale(1.3); border-color: white;' : ''}" title="สีฟ้า"></span>
                            <span class="color-dot" data-color="pink" style="width: 10px; height: 10px; border-radius: 50%; background: var(--accent-pink); cursor: pointer; ${note.color === 'pink' ? 'transform: scale(1.3); border-color: white;' : ''}" title="สีชมพู"></span>
                            <span class="color-dot" data-color="green" style="width: 10px; height: 10px; border-radius: 50%; background: var(--accent-green); cursor: pointer; ${note.color === 'green' ? 'transform: scale(1.3); border-color: white;' : ''}" title="สีเขียว"></span>
                        </div>
                    </div>
                `;

                // Handle Input Events
                const titleInput = card.querySelector('.note-title-input');
                const contentInput = card.querySelector('.note-content-input');
                
                titleInput.value = note.title || '';
                contentInput.value = note.content || '';
                
                let syncTimeout;
                const debouncedSave = () => {
                    clearTimeout(syncTimeout);
                    syncTimeout = setTimeout(() => {
                        note.title = titleInput.value.trim();
                        note.content = contentInput.value;
                        saveNotes();
                    }, 500);
                };

                titleInput.addEventListener('input', debouncedSave);
                contentInput.addEventListener('input', debouncedSave);

                // Handle Delete Note
                card.querySelector('.btn-delete-note').addEventListener('click', () => {
                    if (confirm('คุณต้องการลบการ์ดโน้ตย่อยใบนี้ใช่หรือไม่?')) {
                        notes = notes.filter(n => n.id !== note.id);
                        saveNotes();
                        renderNotes();
                    }
                });

                // Handle Color selection
                const dots = card.querySelectorAll('.color-dot');
                dots.forEach(dot => {
                    dot.addEventListener('click', () => {
                        const newColor = dot.dataset.color;
                        note.color = newColor;
                        saveNotes();
                        renderNotes();
                    });
                });

                grid.appendChild(card);
            });

            if (window.lucide) window.lucide.createIcons();
        };

        // Add Note Action
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                notes.push({
                    id: Date.now(),
                    title: 'โน้ตใหม่',
                    content: '',
                    color: 'default'
                });
                saveNotes();
                renderNotes();
            });
        }

        // Copy all notes text
        if (btnCopy) {
            btnCopy.addEventListener('click', () => {
                const text = notes.map(n => `--- ${n.title || 'ไม่มีหัวข้อ'} ---\n${n.content || ''}`).join('\n\n');
                if (!text.trim()) {
                    alert('ไม่มีข้อความให้คัดลอกค่ะ');
                    return;
                }
                navigator.clipboard.writeText(text)
                    .then(() => {
                        const icon = btnCopy.querySelector('i, svg');
                        if (icon) {
                            icon.setAttribute('data-lucide', 'check');
                            if (window.lucide) window.lucide.createIcons();
                            setTimeout(() => {
                                const currentIcon = btnCopy.querySelector('i, svg');
                                if (currentIcon) {
                                    currentIcon.setAttribute('data-lucide', 'copy');
                                    if (window.lucide) window.lucide.createIcons();
                                }
                            }, 2000);
                        }
                    })
                    .catch(err => console.error(err));
            });
        }

        // Export Notes Action
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                const text = notes.map(n => `--- ${n.title || 'ไม่มีหัวข้อ'} ---\n${n.content || ''}`).join('\n\n');
                if (!text.trim()) {
                    alert('ไม่มีข้อความให้ส่งออกค่ะ');
                    return;
                }
                const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `บันทึกด่วนทั้งหมด_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            });
        }

        // Clear Notes Action
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                if (confirm('คุณต้องการลบโน้ตทั้งหมดใช่หรือไม่? (ข้อมูลในคลาวด์จะหายไปด้วยค่ะ)')) {
                    notes = [];
                    saveNotes();
                    renderNotes();
                }
            });
        }

        renderNotes();
    }

    // --- USER AUTH & CLOUD SYNC ---
    initAuth() {
        const btnAuthMenu = document.getElementById('btn-auth-menu');
        const btnAuthMenuSidebar = document.getElementById('btn-auth-menu-sidebar');
        const authModal = document.getElementById('auth-modal');
        const btnCloseAuthModal = document.getElementById('btn-close-auth-modal');
        const tabAuthLogin = document.getElementById('tab-auth-login');
        const tabAuthRegister = document.getElementById('tab-auth-register');
        const btnSubmitAuth = document.getElementById('btn-submit-auth');
        const authUsername = document.getElementById('auth-username');
        const authPassword = document.getElementById('auth-password');
        const authErrorMsg = document.getElementById('auth-error-msg');
        const authSuccessMsg = document.getElementById('auth-success-msg');
        const authFormSection = document.getElementById('auth-form-section');
        const authLoggedInSection = document.getElementById('auth-logged-in-section');
        const loggedInUsername = document.getElementById('loggedIn-username') || document.getElementById('logged-in-username');
        const btnSyncNow = document.getElementById('btn-sync-now');
        const btnLogout = document.getElementById('btn-logout');
        const authStatusText = document.getElementById('auth-status-text');
        const authStatusTextSidebar = document.getElementById('auth-status-text-sidebar');

        if (!btnAuthMenu || !authModal || !btnCloseAuthModal) return;

        let authMode = 'login'; // 'login' or 'register'

        const updateAuthUI = () => {
            const username = localStorage.getItem('siam_daily_auth_username');
            const token = localStorage.getItem('siam_daily_auth_token');

            const cardPwd = document.getElementById('acc-change-password-card');
            const cardSessions = document.getElementById('acc-sessions-card');
            const cardHistory = document.getElementById('acc-login-history-card');

            // Account view elements
            const accStatus = document.getElementById('acc-status-value');
            const accUsername = document.getElementById('acc-username-value');
            const accLastSync = document.getElementById('acc-last-sync');
            const btnAccLogin = document.getElementById('btn-account-login');
            const btnAccLogout = document.getElementById('btn-account-logout');

            // Local backup stats
            const statStickyNotes = document.getElementById('stat-sticky-notes');
            const statBudgetLogs = document.getElementById('stat-budget-logs');

            if (statStickyNotes) {
                try {
                    const notes = JSON.parse(localStorage.getItem('siam_daily_sticky_notes') || '[]');
                    statStickyNotes.textContent = `${notes.length} รายการ`;
                } catch(e) { statStickyNotes.textContent = '0 รายการ'; }
            }
            if (statBudgetLogs) {
                try {
                    const txs = JSON.parse(localStorage.getItem('siam_daily_budget_transactions') || '[]');
                    statBudgetLogs.textContent = `${txs.length} รายการ`;
                } catch(e) { statBudgetLogs.textContent = '0 รายการ'; }
            }

            if (username && token) {
                // Logged in
                const timeStr = this.lastSyncTime ? ` (${this.lastSyncTime})` : '';
                authStatusText.textContent = `คลาวด์: ${username}${timeStr}`;
                if (authStatusTextSidebar) authStatusTextSidebar.textContent = `คลาวด์: ${username}${timeStr}`;
                
                btnAuthMenu.classList.add('logged-in');
                if (btnAuthMenuSidebar) btnAuthMenuSidebar.classList.add('logged-in');
                
                const cloudIcon = btnAuthMenu.querySelector('i');
                if (cloudIcon) cloudIcon.style.color = 'var(--accent-green)';
                
                const sidebarCloudIcon = document.getElementById('sidebar-cloud-icon');
                if (sidebarCloudIcon) sidebarCloudIcon.style.color = 'var(--accent-green)';
                
                authFormSection.style.display = 'none';
                authLoggedInSection.style.display = 'flex';
                if (loggedInUsername) loggedInUsername.textContent = username;

                if (accStatus) {
                    accStatus.textContent = 'เชื่อมต่อระบบคลาวด์แล้ว (Online)';
                    accStatus.style.color = 'var(--accent-green)';
                }
                if (accUsername) accUsername.textContent = username;
                if (accLastSync) accLastSync.textContent = this.lastSyncTime || 'เพิ่งเริ่มต้น';
                if (btnAccLogin) btnAccLogin.style.display = 'none';
                if (btnAccLogout) btnAccLogout.style.display = 'block';

                if (cardPwd) cardPwd.style.display = 'flex';
                if (cardSessions) cardSessions.style.display = 'flex';
                if (cardHistory) cardHistory.style.display = 'flex';

                this.loadAccountSessions();
                this.loadAccountLoginHistory();
            } else {
                // Logged out / Offline
                authStatusText.textContent = 'ใช้แบบออฟไลน์';
                if (authStatusTextSidebar) authStatusTextSidebar.textContent = 'ใช้แบบออฟไลน์';
                
                btnAuthMenu.classList.remove('logged-in');
                if (btnAuthMenuSidebar) btnAuthMenuSidebar.classList.remove('logged-in');
                
                const cloudIcon = btnAuthMenu.querySelector('i');
                if (cloudIcon) cloudIcon.style.color = '';
                
                const sidebarCloudIcon = document.getElementById('sidebar-cloud-icon');
                if (sidebarCloudIcon) sidebarCloudIcon.style.color = 'var(--text-muted)';
                
                authFormSection.style.display = 'flex';
                authLoggedInSection.style.display = 'none';

                if (accStatus) {
                    accStatus.textContent = 'ออฟไลน์ / บันทึกในเครื่องเท่านั้น';
                    accStatus.style.color = 'var(--text-muted)';
                }
                if (accUsername) accUsername.textContent = '-';
                if (accLastSync) accLastSync.textContent = '-';
                if (btnAccLogin) btnAccLogin.style.display = 'block';
                if (btnAccLogout) btnAccLogout.style.display = 'none';

                if (cardPwd) cardPwd.style.display = 'none';
                if (cardSessions) cardSessions.style.display = 'none';
                if (cardHistory) cardHistory.style.display = 'none';
            }
        };

        let registrationOpen = true;
        let registrationKeyRequired = false;

        const fetchAuthConfig = async () => {
            try {
                const res = await fetch('/api/auth/config').then(r => r.json());
                registrationOpen = res.registrationOpen;
                registrationKeyRequired = res.registrationKeyRequired;

                // Adjust register tab visibility
                if (!registrationOpen) {
                    tabAuthRegister.style.display = 'none';
                } else {
                    tabAuthRegister.style.display = 'block';
                }
            } catch (err) {
                console.error('Failed to load signup config:', err);
            }
        };

        const openAuthModal = () => {
            authModal.style.display = 'flex';
            authErrorMsg.style.display = 'none';
            authSuccessMsg.style.display = 'none';
            fetchAuthConfig();
            updateAuthUI();
        };

        btnAuthMenu.addEventListener('click', openAuthModal);
        if (btnAuthMenuSidebar) {
            btnAuthMenuSidebar.addEventListener('click', openAuthModal);
        }
        const btnAccountLogin = document.getElementById('btn-account-login');
        if (btnAccountLogin) {
            btnAccountLogin.addEventListener('click', openAuthModal);
        }

        const closeModal = () => {
            authModal.style.display = 'none';
        };

        btnCloseAuthModal.addEventListener('click', closeModal);
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) closeModal();
        });

        if (tabAuthLogin && tabAuthRegister) {
            tabAuthLogin.addEventListener('click', () => {
                authMode = 'login';
                tabAuthLogin.classList.add('active');
                tabAuthLogin.style.background = 'var(--primary-color)';
                tabAuthLogin.style.color = 'white';
                tabAuthRegister.classList.remove('active');
                tabAuthRegister.style.background = 'transparent';
                tabAuthRegister.style.color = 'var(--text-muted)';
                btnSubmitAuth.textContent = 'เข้าสู่ระบบ';
                document.getElementById('auth-modal-title-text').textContent = 'เข้าสู่ระบบ Cloud Sync';
                authErrorMsg.style.display = 'none';
                
                const regKeyGroup = document.getElementById('auth-regkey-group');
                if (regKeyGroup) regKeyGroup.style.display = 'none';
            });

            tabAuthRegister.addEventListener('click', () => {
                authMode = 'register';
                tabAuthRegister.classList.add('active');
                tabAuthRegister.style.background = 'var(--primary-color)';
                tabAuthRegister.style.color = 'white';
                tabAuthLogin.classList.remove('active');
                tabAuthLogin.style.background = 'transparent';
                tabAuthLogin.style.color = 'var(--text-muted)';
                btnSubmitAuth.textContent = 'สมัครสมาชิก';
                document.getElementById('auth-modal-title-text').textContent = 'สมัครสมาชิก Cloud Sync';
                authErrorMsg.style.display = 'none';

                const regKeyGroup = document.getElementById('auth-regkey-group');
                if (regKeyGroup) {
                    regKeyGroup.style.display = registrationKeyRequired ? 'flex' : 'none';
                }
            });
        }

        btnSubmitAuth.addEventListener('click', async () => {
            const user = authUsername.value.trim();
            const pass = authPassword.value;
            const regKeyInput = document.getElementById('auth-regkey');
            const regKey = regKeyInput ? regKeyInput.value : '';

            if (!user || !pass) {
                authErrorMsg.textContent = 'กรุณากรอกข้อมูลให้ครบถ้วนด้วยค่ะ';
                authErrorMsg.style.display = 'block';
                return;
            }

            const url = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
            authErrorMsg.style.display = 'none';
            authSuccessMsg.style.display = 'none';

            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: user, password: pass, regKey })
                }).then(r => r.json());

                if (res.success) {
                    if (authMode === 'login') {
                        localStorage.setItem('siam_daily_auth_username', res.username);
                        localStorage.setItem('siam_daily_auth_token', res.token);
                        authSuccessMsg.textContent = 'เข้าสู่ระบบสำเร็จแล้วค่ะ! กำลังดึงข้อมูล...';
                        authSuccessMsg.style.display = 'block';
                        
                        // Merge cloud data to local
                        if (res.data) {
                            Object.keys(res.data).forEach(key => {
                                localStorage.setItem(key, res.data[key]);
                            });
                        }
                        
                        setTimeout(() => {
                            closeModal();
                            window.location.reload();
                        }, 1000);
                    } else {
                        authSuccessMsg.textContent = res.message;
                        authSuccessMsg.style.display = 'block';
                        // Switch to login tab
                        setTimeout(() => {
                            tabAuthLogin.click();
                            authPassword.value = '';
                            if (regKeyInput) regKeyInput.value = '';
                        }, 1200);
                    }
                } else {
                    authErrorMsg.textContent = res.message;
                    authErrorMsg.style.display = 'block';
                }
            } catch(e) {
                authErrorMsg.textContent = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ในขณะนี้ค่ะ';
                authErrorMsg.style.display = 'block';
            }
        });

        if (btnSyncNow) {
            btnSyncNow.addEventListener('click', async () => {
                btnSyncNow.disabled = true;
                btnSyncNow.innerHTML = '<i data-lucide="refresh-cw" class="spinning" style="animation: spin 1s infinite linear;"></i> กำลังซิงก์...';
                if (window.lucide) window.lucide.createIcons();
                const ok = await this.syncDataToCloud(true);
                btnSyncNow.disabled = false;
                btnSyncNow.innerHTML = `<i data-lucide="refresh-cw"></i> ${ok ? 'ซิงก์สำเร็จ!' : 'ซิงก์ล้มเหลว'}`;
                if (window.lucide) window.lucide.createIcons();
                setTimeout(() => {
                    btnSyncNow.innerHTML = '<i data-lucide="refresh-cw"></i> ซิงก์ข้อมูลทันที (Sync Now)';
                    if (window.lucide) window.lucide.createIcons();
                }, 2000);
            });
        }

        const handleLogout = () => {
            if (confirm('คุณต้องการออกจากระบบใช่หรือไม่? (ข้อมูลในคลาวด์จะยังคงอยู่ แต่ข้อมูลในเบราว์เซอร์จะไม่ซิงก์เพิ่ม)')) {
                localStorage.removeItem('siam_daily_auth_username');
                localStorage.removeItem('siam_daily_auth_token');
                closeModal();
                window.location.reload();
            }
        };

        if (btnLogout) {
            btnLogout.addEventListener('click', handleLogout);
        }
        const btnAccountLogout = document.getElementById('btn-account-logout');
        if (btnAccountLogout) {
            btnAccountLogout.addEventListener('click', handleLogout);
        }

        this.refreshAuthUI = updateAuthUI;
        updateAuthUI();
        
        // Run initial quiet sync down if logged in
        const storedToken = localStorage.getItem('siam_daily_auth_token');
        if (storedToken) {
            this.syncDataToCloud(false);
        }

        // Setup background auto-sync every 60 seconds if logged in
        setInterval(() => {
            const token = localStorage.getItem('siam_daily_auth_token');
            if (token) {
                this.syncDataToCloud(false);
            }
        }, 60000); // 60 seconds

        this.initAccountExtras();
    }

    async syncDataToCloud(manualAlert = false) {
        const username = localStorage.getItem('siam_daily_auth_username');
        const token = localStorage.getItem('siam_daily_auth_token');
        if (!username || !token) return false;

        const syncData = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('siam_') && !key.includes('auth_')) {
                syncData[key] = localStorage.getItem(key);
            }
        }

        try {
            const res = await fetch('/api/auth/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, token, data: syncData })
            }).then(r => r.json());

            if (res.success) {
                this.lastSyncTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                if (typeof this.refreshAuthUI === 'function') {
                    this.refreshAuthUI();
                }
                if (manualAlert) alert(res.message);
                return true;
            } else {
                // Token invalid/expired
                if (res.message && res.message.includes('หมดอายุ')) {
                    localStorage.removeItem('siam_daily_auth_username');
                    localStorage.removeItem('siam_daily_auth_token');
                    alert('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้งค่ะ');
                    window.location.reload();
                }
            }
        } catch (e) {
            console.error('Quiet cloud sync failed:', e);
        }
        return false;
    }

    // --- WALLPAPER ENGINE ---
    initWallpaperEngine() {
        let wallpaperBg = document.getElementById('body-wallpaper-bg');
        if (!wallpaperBg) {
            wallpaperBg = document.createElement('div');
            wallpaperBg.id = 'body-wallpaper-bg';
            wallpaperBg.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -10; transition: opacity 0.6s ease-in-out, background 0.6s ease-in-out; background-size: cover; background-position: center; opacity: 0;';
            document.body.appendChild(wallpaperBg);
        }

        if (!document.getElementById('mesh-wallpaper-style')) {
            const style = document.createElement('style');
            style.id = 'mesh-wallpaper-style';
            style.textContent = `
                @keyframes meshAnim {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .mesh-active {
                    background-size: 400% 400%;
                    animation: meshAnim 25s infinite alternate ease-in-out;
                }
            `;
            document.head.appendChild(style);
        }

        const presets = {
            default: '',
            mesh: 'linear-gradient(45deg, #090d16, #1e1b4b, #2e0854, #0b1329)',
            forest: 'https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=1600&auto=format&fit=crop',
            cyber: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1600&auto=format&fit=crop',
            space: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1600&auto=format&fit=crop',
            cozy: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1600&auto=format&fit=crop'
        };

        const savedWallpaper = localStorage.getItem('siam_daily_wallpaper') || 'default';
        const savedCustomUrl = localStorage.getItem('siam_daily_wallpaper_custom_url') || '';

        const applyWallpaper = (type, customUrl = '') => {
            // Reset state
            wallpaperBg.style.backgroundImage = 'none';
            wallpaperBg.style.background = 'none';
            wallpaperBg.classList.remove('mesh-active');
            wallpaperBg.style.opacity = '0';
            
            // Show background glow divs
            const glows = document.querySelectorAll('.bg-glow');
            glows.forEach(g => g.style.opacity = '1');

            if (type === 'default') {
                localStorage.setItem('siam_daily_wallpaper', 'default');
            } else if (type === 'mesh') {
                wallpaperBg.style.background = presets.mesh;
                wallpaperBg.classList.add('mesh-active');
                wallpaperBg.style.opacity = '1';
                glows.forEach(g => g.style.opacity = '0.15');
                localStorage.setItem('siam_daily_wallpaper', 'mesh');
            } else if (presets[type]) {
                wallpaperBg.style.backgroundImage = `url('${presets[type]}')`;
                wallpaperBg.style.opacity = '1';
                glows.forEach(g => g.style.opacity = '0.1');
                localStorage.setItem('siam_daily_wallpaper', type);
            } else if (type === 'custom' && customUrl) {
                wallpaperBg.style.backgroundImage = `url('${customUrl}')`;
                wallpaperBg.style.opacity = '1';
                glows.forEach(g => g.style.opacity = '0.1');
                localStorage.setItem('siam_daily_wallpaper', 'custom');
                localStorage.setItem('siam_daily_wallpaper_custom_url', customUrl);
            }

            // Sync to cloud
            this.syncDataToCloud();

            // Update active class on preset buttons
            const buttons = document.querySelectorAll('.btn-wallpaper-preset');
            buttons.forEach(btn => {
                if (btn.dataset.wallpaper === type) {
                    btn.classList.add('active');
                    btn.style.background = 'var(--primary-color)';
                    btn.style.borderColor = 'var(--primary-color)';
                    btn.style.color = 'white';
                } else {
                    btn.classList.remove('active');
                    btn.style.background = 'transparent';
                    btn.style.borderColor = 'var(--border-color)';
                    btn.style.color = 'var(--text-muted)';
                }
            });
        };

        // Hook buttons
        const buttons = document.querySelectorAll('.btn-wallpaper-preset');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.wallpaper;
                applyWallpaper(type);
            });
        });

        const btnCustom = document.getElementById('btn-apply-custom-wallpaper');
        const inputCustom = document.getElementById('input-custom-wallpaper-url');
        if (btnCustom && inputCustom) {
            if (savedCustomUrl) inputCustom.value = savedCustomUrl;
            btnCustom.addEventListener('click', () => {
                const url = inputCustom.value.trim();
                if (url) {
                    applyWallpaper('custom', url);
                } else {
                    alert('กรุณากรอก URL รูปภาพก่อนกดใช้งานค่ะ');
                }
            });
        }

        // Apply saved on startup
        applyWallpaper(savedWallpaper, savedCustomUrl);
    }

    // --- LO-FI FOCUS MODE ---
    initFocusMode() {
        const btnTrigger = document.getElementById('btn-trigger-focus-mode');
        const focusOverlay = document.getElementById('focus-mode-overlay');
        const btnExit = document.getElementById('btn-exit-focus-mode');
        const pomodoroStatus = document.getElementById('focus-pomodoro-status');
        const pomodoroTime = document.getElementById('focus-pomodoro-time');
        const btnStart = document.getElementById('btn-focus-pomodoro-start');
        const btnReset = document.getElementById('btn-focus-pomodoro-reset');
        const canvas = document.getElementById('focus-visualizer-canvas');
        const quoteEl = document.getElementById('focus-quote');
        const quoteAuthor = document.getElementById('focus-quote-author');

        if (!btnTrigger || !focusOverlay || !btnExit) return;

        const focusQuotes = [
            { text: "ความตั้งใจแน่วแน่และสมาธิที่มั่นคง คือจุดเริ่มต้นของความสำเร็จทั้งปวง", author: "นิรนาม" },
            { text: "ความลับของการก้าวไปข้างหน้า คือการเริ่มต้นลงมือทำ", author: "Mark Twain" },
            { text: "ทำงานในความเงียบ แล้วปล่อยให้ความสำเร็จเป็นตัวส่งเสียง", author: "Frank Ocean" },
            { text: "คุณไม่จำเป็นต้องเก่งที่สุดในตอนเริ่มต้น แต่คุณต้องเริ่มต้นเพื่อที่จะกลายเป็นคนที่เก่งที่สุด", author: "Zig Ziglar" },
            { text: "เวลาที่คุ้มค่าที่สุด คือเวลาที่เราทุ่มเทให้กับสิ่งตรงหน้าอย่างเต็มร้อย", author: "นิรนาม" }
        ];

        let timeLeft = 25 * 60;
        let isRunning = false;
        let intervalId = null;
        let mode = 'work'; // 'work' or 'break'

        const updateDisplay = () => {
            const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
            const s = (timeLeft % 60).toString().padStart(2, '0');
            pomodoroTime.textContent = `${m}:${s}`;
        };

        const stopFocusTimer = () => {
            clearInterval(intervalId);
            intervalId = null;
            isRunning = false;
            btnStart.innerHTML = '<i data-lucide="play" style="display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:2px"></i> เริ่มโฟกัส';
            if (window.lucide) window.lucide.createIcons();
        };

        btnStart.addEventListener('click', () => {
            if (isRunning) {
                stopFocusTimer();
            } else {
                isRunning = true;
                btnStart.innerHTML = '<i data-lucide="pause" style="display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:2px"></i> หยุดชั่วคราว';
                if (window.lucide) window.lucide.createIcons();
                intervalId = setInterval(() => {
                    timeLeft--;
                    updateDisplay();
                    if (timeLeft <= 0) {
                        stopFocusTimer();
                        try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(); o.frequency.value = 800; o.connect(ctx.destination); o.start(); setTimeout(() => o.stop(), 350); } catch(e) {}
                        
                        if (mode === 'work') {
                            alert('Session Work สำเร็จแล้ว! ได้เวลาพัก 5 นาทีแล้วค่ะ');
                            mode = 'break';
                            pomodoroStatus.textContent = 'SESSION BREAK';
                            timeLeft = 5 * 60;
                        } else {
                            alert('หมดเวลาพักผ่อนแล้ว กลับมาโฟกัสงานกันต่อเลย!');
                            mode = 'work';
                            pomodoroStatus.textContent = 'SESSION WORK';
                            timeLeft = 25 * 60;
                        }
                        updateDisplay();
                    }
                }, 1000);
            }
        });

        btnReset.addEventListener('click', () => {
            stopFocusTimer();
            timeLeft = mode === 'work' ? 25 * 60 : 5 * 60;
            updateDisplay();
        });

        // Toggle Sound Buttons inside Focus Mode
        const soundBtns = document.querySelectorAll('.focus-sound-btn');
        soundBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const sound = btn.dataset.sound;
                const slider = document.querySelector(`.ambient-slider[data-sound="${sound}"]`);
                if (slider) {
                    const isPlaying = parseFloat(slider.value) > 0;
                    slider.value = isPlaying ? 0 : 0.5;
                    slider.dispatchEvent(new Event('input'));
                    
                    btn.style.background = isPlaying ? 'rgba(255,255,255,0.05)' : 'var(--accent-pink)';
                }
            });
        });

        // Close/Open Focus Mode
        btnTrigger.addEventListener('click', () => {
            focusOverlay.style.display = 'flex';
            
            // Random Quote
            const rand = focusQuotes[Math.floor(Math.random() * focusQuotes.length)];
            quoteEl.textContent = `"${rand.text}"`;
            quoteAuthor.textContent = `— ${rand.author}`;
            
            // Sync sound button states
            soundBtns.forEach(btn => {
                const sound = btn.dataset.sound;
                const slider = document.querySelector(`.ambient-slider[data-sound="${sound}"]`);
                if (slider && parseFloat(slider.value) > 0) {
                    btn.style.background = 'var(--accent-pink)';
                } else {
                    btn.style.background = 'rgba(255,255,255,0.05)';
                }
            });

            // Start Canvas Animation
            this.focusVisualizerActive = true;
            this.drawFocusVisualizer();
        });

        btnExit.addEventListener('click', () => {
            focusOverlay.style.display = 'none';
            stopFocusTimer();
            this.focusVisualizerActive = false;
        });

        if (window.lucide) window.lucide.createIcons();
    }

    drawFocusVisualizer() {
        const canvas = document.getElementById('focus-visualizer-canvas');
        if (!canvas || !this.focusVisualizerActive) return;

        const ctx = canvas.getContext('2d');
        let waveOffset = 0;

        const render = () => {
            if (!this.focusVisualizerActive) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }

            waveOffset += 0.012;
            const baseHeight = canvas.height * 0.7;
            
            // Check if any ambient sounds or radio are currently playing to increase wave height
            let soundsActive = false;
            const sliders = document.querySelectorAll('.ambient-slider');
            sliders.forEach(s => { if (parseFloat(s.value) > 0) soundsActive = true; });
            const radioAudio = document.getElementById('radio-audio-element');
            if (radioAudio && !radioAudio.paused) soundsActive = true;

            const ampMultiplier = soundsActive ? 1.5 : 0.8;

            ctx.lineWidth = 2;
            const waves = [
                { freq: 0.003, amp: 45 * ampMultiplier, speed: 1.0, color: 'rgba(236, 72, 153, 0.15)' },
                { freq: 0.005, amp: 30 * ampMultiplier, speed: 1.4, color: 'rgba(6, 182, 212, 0.12)' },
                { freq: 0.002, amp: 60 * ampMultiplier, speed: 0.6, color: 'rgba(139, 92, 246, 0.08)' }
            ];

            waves.forEach(w => {
                ctx.beginPath();
                ctx.strokeStyle = w.color;
                ctx.shadowColor = w.color;
                ctx.shadowBlur = 15;
                
                for (let x = 0; x < canvas.width; x++) {
                    const y = baseHeight + Math.sin(x * w.freq + waveOffset * w.speed) * w.amp;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            });

            ctx.shadowBlur = 0; // reset
            requestAnimationFrame(render);
        };

        render();
    }

    initAccountExtras() {
        // --- 1. User Profile Setup ---
        const displayNameInput = document.getElementById('acc-display-name-input');
        const btnSaveProfile = document.getElementById('btn-save-profile');
        const avatarPreview = document.getElementById('acc-avatar-preview');
        const avatarOptions = document.querySelectorAll('.avatar-option');

        const avatarGradients = {
            sunset: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            ocean: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            forest: 'linear-gradient(135deg, #10b981, #047857)',
            neon: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            midnight: 'linear-gradient(135deg, #475569, #1e293b)',
            candy: 'linear-gradient(135deg, #fbbf24, #f43f5e)'
        };

        let selectedAvatar = localStorage.getItem('siam_user_avatar') || 'sunset';
        const savedName = localStorage.getItem('siam_user_display_name') || '';

        if (displayNameInput) displayNameInput.value = savedName;

        const updateAvatarSelectionUI = () => {
            if (avatarPreview && avatarGradients[selectedAvatar]) {
                avatarPreview.style.background = avatarGradients[selectedAvatar];
            }
            avatarOptions.forEach(opt => {
                const av = opt.getAttribute('data-avatar');
                if (av === selectedAvatar) {
                    opt.style.border = '2px solid white';
                    opt.style.transform = 'scale(1.15)';
                    opt.style.boxShadow = '0 0 8px var(--accent-pink)';
                } else {
                    opt.style.border = '2px solid transparent';
                    opt.style.transform = '';
                    opt.style.boxShadow = '';
                }
            });
        };

        avatarOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                selectedAvatar = opt.getAttribute('data-avatar');
                updateAvatarSelectionUI();
            });
        });

        if (btnSaveProfile) {
            btnSaveProfile.addEventListener('click', () => {
                const newName = displayNameInput.value.trim();
                localStorage.setItem('siam_user_display_name', newName);
                localStorage.setItem('siam_user_avatar', selectedAvatar);
                
                // Force-update the dashboard greeting clock instantly
                const updateClockEl = document.getElementById('dash-clock-time');
                if (updateClockEl) {
                    const event = new Event('input');
                    updateClockEl.dispatchEvent(event); 
                }
                
                // Trigger sync to cloud
                if (typeof this.syncDataToCloud === 'function') {
                    this.syncDataToCloud();
                }
                
                alert('💾 บันทึกโปรไฟล์เรียบร้อยแล้วค่ะ!');
                window.location.reload();
            });
        }

        updateAvatarSelectionUI();

        // --- 2. Storage Inspector ---
        const keysList = document.getElementById('storage-keys-list');
        const totalSizeEl = document.getElementById('storage-total-size');
        const btnClearAll = document.getElementById('btn-clear-all-storage');

        if (!keysList || !totalSizeEl) return;

        const keyNamesMap = {
            siam_daily_sticky_notes: '📝 บันทึกโน้ตกระดาษด่วน',
            siam_daily_budget_transactions: '💰 บันทึกรายจ่ายรายวัน',
            siam_daily_habits: '🎯 เป้าหมายนิสัยประจำวัน',
            siam_daily_checklist: '✅ งานที่ต้องทำประจำวัน',
            siam_daily_water_intake: '💧 สถิติการดื่มน้ำรายวัน',
            siam_daily_water_date: '📅 วันที่ดื่มน้ำล่าสุด',
            siam_daily_custom_feeds: '📰 ลิงก์ฟีดข่าวสาร RSS',
            siam_custom_lat: '📍 พิกัดตำแหน่ง Latitude',
            siam_custom_lng: '📍 พิกัดตำแหน่ง Longitude',
            siam_theme: '🎨 ธีมบอร์ดหน้าเว็บ',
            siam_user_display_name: '👤 ชื่อเล่นโปรไฟล์คุณ',
            siam_user_avatar: '🖼️ อวาตาร์โปรไฟล์คุณ',
            siam_daily_dashboard_layout: '🎛️ เลย์เอาต์หน้าแรก',
            siam_daily_hidden_widgets: '👁️ การจัดซ่อนวิดเจ็ต'
        };

        const renderStorageStats = () => {
            keysList.innerHTML = '';
            let totalBytes = 0;
            const items = [];

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('siam_') && !key.includes('auth_')) {
                    const val = localStorage.getItem(key) || '';
                    const bytes = val.length * 2; // UTF-16 characters are 2 bytes
                    totalBytes += bytes;
                    items.push({ key, bytes });
                }
            }

            // Sort by size desc
            items.sort((a, b) => b.bytes - a.bytes);

            if (items.length === 0) {
                keysList.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.75rem; padding: 0.5rem 0;">ไม่มีข้อมูลบันทึกในเครื่องขณะนี้</div>';
            } else {
                items.forEach(item => {
                    const friendlyName = keyNamesMap[item.key] || `📦 ${item.key}`;
                    const row = document.createElement('div');
                    row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid rgba(255,255,255,0.02);';
                    
                    row.innerHTML = `
                        <span style="font-size: 0.75rem; color: var(--text-main);">${friendlyName}</span>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="color: var(--accent-purple); font-weight: 600;">${item.bytes.toLocaleString()} B</span>
                            <button class="btn-delete-key" data-key="${item.key}" style="background: none; border: none; color: var(--accent-red); cursor: pointer; padding: 2px; font-size: 0.75rem; opacity: 0.6; transition: opacity 0.2s;" title="ลบข้อมูลหมวดนี้"><i data-lucide="trash-2" style="width: 12px; height: 12px;"></i></button>
                        </div>
                    `;
                    keysList.appendChild(row);
                });
            }

            totalSizeEl.textContent = `${totalBytes.toLocaleString()} Bytes (${(totalBytes / 1024).toFixed(2)} KB)`;
            if (window.lucide) window.lucide.createIcons();

            // Bind individual delete buttons
            keysList.querySelectorAll('.btn-delete-key').forEach(btn => {
                btn.addEventListener('click', () => {
                    const key = btn.getAttribute('data-key');
                    const friendly = keyNamesMap[key] || key;
                    if (confirm(`คุณต้องการลบ "${friendly}" ใช่หรือไม่? ข้อมูลในหมวดนี้ทั้งหมดบนเครื่องจะถูกลบและไม่สามารถเรียกคืนได้`)) {
                        localStorage.removeItem(key);
                        renderStorageStats();
                        alert('ลบข้อมูลเรียบร้อยแล้วค่ะ');
                        window.location.reload();
                    }
                });
            });
        };

        if (btnClearAll) {
            btnClearAll.addEventListener('click', () => {
                if (confirm('⚠️ คำเตือน: คุณต้องการล้างข้อมูลตั้งค่าและประวัติทั้งหมดของแผง Siam Daily Hub บนเครื่องนี้ใช่หรือไม่? บัญชีคลาวด์จะไม่หลุดแต่ข้อมูลที่ไม่ได้ซิงก์จะหายไปค่ะ')) {
                    for (let i = localStorage.length - 1; i >= 0; i--) {
                        const key = localStorage.key(i);
                        if (key.startsWith('siam_') && !key.includes('auth_')) {
                            localStorage.removeItem(key);
                        }
                    }
                    alert('🧹 ล้างข้อมูลแคชและบันทึกย่อยทั้งหมดสำเร็จแล้วค่ะ!');
                    window.location.reload();
                }
            });
        }

        // --- 3. Change Password Setup ---
        const btnChangePassword = document.getElementById('btn-change-password');
        if (btnChangePassword) {
            btnChangePassword.addEventListener('click', async () => {
                const currentPasswordInput = document.getElementById('acc-pwd-current');
                const newPasswordInput = document.getElementById('acc-pwd-new');
                const confirmPasswordInput = document.getElementById('acc-pwd-new-confirm');

                if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) return;

                const currentPassword = currentPasswordInput.value;
                const newPassword = newPasswordInput.value;
                const confirmPassword = confirmPasswordInput.value;

                if (!currentPassword || !newPassword || !confirmPassword) {
                    alert('กรุณากรอกข้อมูลรหัสผ่านให้ครบถ้วนด้วยค่ะ');
                    return;
                }

                if (newPassword.length < 6) {
                    alert('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษรค่ะ');
                    return;
                }

                if (newPassword !== confirmPassword) {
                    alert('การยืนยันรหัสผ่านใหม่ไม่ตรงกันค่ะ กรุณาตรวจสอบอีกครั้ง');
                    return;
                }

                btnChangePassword.disabled = true;
                const username = localStorage.getItem('siam_daily_auth_username');
                const token = localStorage.getItem('siam_daily_auth_token');

                try {
                    const res = await fetch('/api/auth/change-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, token, currentPassword, newPassword })
                    });
                    const data = await res.json();
                    if (data && data.success) {
                        alert('🔑 เปลี่ยนรหัสผ่านสำเร็จแล้วค่ะ เซสชันอื่นๆ ถูกเตะออกเพื่อความปลอดภัยแล้วค่ะ');
                        currentPasswordInput.value = '';
                        newPasswordInput.value = '';
                        confirmPasswordInput.value = '';
                        this.loadAccountSessions();
                    } else {
                        alert(data.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้ค่ะ');
                    }
                } catch(e) {
                    console.error('Failed to change password:', e);
                    alert('เกิดข้อผิดพลาดของระบบในการสื่อสารกับเซิร์ฟเวอร์ค่ะ');
                } finally {
                    btnChangePassword.disabled = false;
                }
            });
        }

        renderStorageStats();
    }

    async loadAccountSessions() {
        const listContainer = document.getElementById('acc-sessions-list');
        if (!listContainer) return;

        const username = localStorage.getItem('siam_daily_auth_username');
        const token = localStorage.getItem('siam_daily_auth_token');
        if (!username || !token) return;

        try {
            const res = await fetch(`/api/auth/sessions?username=${encodeURIComponent(username)}&token=${encodeURIComponent(token)}`);
            const data = await res.json();
            if (data && data.success) {
                if (data.sessions.length === 0) {
                    listContainer.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:1rem; font-size:0.75rem;">ไม่มีประวัติเซสชันอื่น</div>';
                    return;
                }

                listContainer.innerHTML = data.sessions.map(s => {
                    const isCurrent = s.isCurrent;
                    const date = new Date(s.lastActive).toLocaleString('th-TH');
                    const badge = isCurrent ? 
                        `<span style="color:var(--accent-green); background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2); padding:2px 6px; border-radius:10px; font-size:0.65rem; font-weight:bold;">เซสชันนี้</span>` : 
                        `<button class="btn-revoke-session" data-session-id="${s.id}" style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); color:var(--accent-red); padding:2px 8px; border-radius:6px; font-size:0.65rem; cursor:pointer; font-weight:600; transition:all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.2)'" onmouseout="this.style.background='rgba(239,68,68,0.1)'">เตะออก</button>`;

                    let devIcon = 'laptop';
                    let devName = 'Web Browser';
                    const ua = s.userAgent.toLowerCase();
                    if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')) {
                        devIcon = 'smartphone';
                        devName = ua.includes('iphone') ? 'iPhone' : 'Android Mobile';
                    } else if (ua.includes('ipad') || ua.includes('tablet')) {
                        devIcon = 'tablet';
                        devName = 'Tablet';
                    }
                    
                    return `
                        <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border-color); border-radius:8px; padding:0.65rem; display:flex; align-items:center; justify-content:space-between; gap:0.5rem; margin-bottom:0.25rem;">
                            <div style="display:flex; align-items:center; gap:0.75rem;">
                                <div style="color:var(--text-muted); display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:8px; background:rgba(255,255,255,0.03);">
                                    <i data-lucide="${devIcon}" style="width:16px; height:16px;"></i>
                                </div>
                                <div style="display:flex; flex-direction:column; gap:0.1rem; text-align:left;">
                                    <span style="font-size:0.8rem; font-weight:600; color:var(--text-main);">${devName} <span style="font-size:0.7rem; color:var(--text-muted); font-weight:normal;">(${s.ip})</span></span>
                                    <span style="font-size:0.68rem; color:var(--text-muted);">ใช้งานล่าสุด: ${date}</span>
                                </div>
                            </div>
                            <div>
                                ${badge}
                            </div>
                        </div>
                    `;
                }).join('');

                if (window.lucide) window.lucide.createIcons();

                // Bind revoke buttons
                listContainer.querySelectorAll('.btn-revoke-session').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.getAttribute('data-session-id');
                        if (confirm('คุณแน่ใจว่าต้องการบังคับให้อุปกรณ์ดังกล่าวออกจากระบบใช่หรือไม่?')) {
                            btn.disabled = true;
                            try {
                                const res = await fetch('/api/auth/sessions/revoke', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ username, token, sessionId: id })
                                });
                                const r = await res.json();
                                if (r && r.success) {
                                    this.loadAccountSessions();
                                } else {
                                    alert(r.message || 'เกิดข้อผิดพลาดในการยกเลิกเซสชันค่ะ');
                                    btn.disabled = false;
                                }
                            } catch(e) {
                                console.error('Failed to revoke session:', e);
                                btn.disabled = false;
                            }
                        }
                    });
                });
            }
        } catch(e) {
            console.error('Failed to load active sessions:', e);
        }
    }

    async loadAccountLoginHistory() {
        const listContainer = document.getElementById('acc-login-history-list');
        if (!listContainer) return;

        const username = localStorage.getItem('siam_daily_auth_username');
        const token = localStorage.getItem('siam_daily_auth_token');
        if (!username || !token) return;

        try {
            const res = await fetch(`/api/auth/login-history?username=${encodeURIComponent(username)}&token=${encodeURIComponent(token)}`);
            const data = await res.json();
            if (data && data.success) {
                if (data.history.length === 0) {
                    listContainer.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:1rem; font-size:0.75rem;">ไม่มีประวัติการเข้าสู่ระบบ</div>';
                    return;
                }

                listContainer.innerHTML = data.history.map(h => {
                    const date = new Date(h.timestamp).toLocaleString('th-TH');
                    const statusText = h.success ? 
                        `<span style="color:var(--accent-green); font-weight:600;">สำเร็จ</span>` : 
                        `<span style="color:var(--accent-red); font-weight:600;">ล้มเหลว</span>`;
                    const iconColor = h.success ? 'var(--accent-green)' : 'var(--accent-red)';
                    const iconName = h.success ? 'shield-check' : 'shield-alert';

                    let devName = 'Web Browser';
                    const ua = h.userAgent.toLowerCase();
                    if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')) {
                        devName = ua.includes('iphone') ? 'iPhone' : 'Android Mobile';
                    } else if (ua.includes('ipad') || ua.includes('tablet')) {
                        devName = 'Tablet';
                    }

                    return `
                        <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border-color); border-radius:8px; padding:0.55rem; display:flex; align-items:center; gap:0.65rem; border-left:3px solid ${iconColor}; margin-bottom:0.25rem;">
                            <div style="color:${iconColor}; flex-shrink:0;">
                                <i data-lucide="${iconName}" style="width:14px; height:14px;"></i>
                            </div>
                            <div style="display:flex; flex-direction:column; gap:0.1rem; flex-grow:1; text-align:left;">
                                <div style="display:flex; justify-content:space-between; width:100%;">
                                    <span style="font-weight:600; color:var(--text-main); font-size:0.75rem;">เข้าใช้งาน ${statusText}</span>
                                    <span style="font-size:0.68rem; color:var(--text-muted);">${date}</span>
                                </div>
                                <span style="font-size:0.68rem; color:var(--text-muted);">${devName} (${h.ip})</span>
                            </div>
                        </div>
                    `;
                }).join('');

                if (window.lucide) window.lucide.createIcons();
            }
        } catch(e) {
            console.error('Failed to load login history:', e);
        }
    }
}

// Start Siam Daily Hub
window.addEventListener('DOMContentLoaded', () => {
    window.appCoordinator = new AppCoordinator();
});
