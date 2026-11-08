function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

class ServicesService {
    constructor() {
        this.services = [];
        this.activeCategory = 'all'; // Track currently selected category
        this.init();
    }

    init() {
        const btnAdd = document.getElementById('btn-add-service-modal');
        const modal = document.getElementById('service-form-modal');
        const btnClose = document.getElementById('btn-close-service-modal');
        const btnSave = document.getElementById('btn-save-service');
        const categoryFilters = document.querySelectorAll('#services-categories button');
        const searchInput = document.getElementById('services-search-input');

        if (!modal || !btnSave) return;

        // Load services
        const saved = localStorage.getItem('siam_daily_services');
        if (saved) {
            try {
                this.services = JSON.parse(saved);
            } catch(e) {
                console.error('Failed to parse services data', e);
            }
        } else {
            // Default self-hosted presets with logo URLs
            this.services = [
                { id: 1, name: 'Home Assistant', url: 'http://localhost:8123', desc: 'ระบบควบคุมบ้านอัจฉริยะ (Smart Home)', icon: '🏠', imageUrl: 'https://raw.githubusercontent.com/home-assistant/brands/master/logo_only.png', category: 'self-hosted' },
                { id: 2, name: 'Nginx Proxy Manager', url: 'http://localhost:81', desc: 'ตัวจัดการความปลอดภัยและใบรับรอง SSL (Proxy)', icon: '🛡️', imageUrl: 'https://raw.githubusercontent.com/NginxProxyManager/nginx-proxy-manager/master/doc/logo.png', category: 'self-hosted' },
                { id: 3, name: 'Immich', url: 'http://localhost:2283', desc: 'คลังเก็บภาพและวิดีโอส่วนตัวในระบบคลาวด์', icon: '📸', imageUrl: 'https://immich.app/img/immich-logo.svg', category: 'self-hosted' },
                { id: 4, name: 'Portainer', url: 'http://localhost:9000', desc: 'หน้าเว็บควบคุมคอนเทนเนอร์ Docker', icon: '🐳', imageUrl: 'https://raw.githubusercontent.com/portainer/portainer/develop/app/assets/images/logo.png', category: 'self-hosted' }
            ];
            this.saveServices();
        }

        // Add Service Modal trigger
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                document.getElementById('service-id-field').value = '';
                document.getElementById('service-name-input').value = '';
                document.getElementById('service-url-input').value = '';
                document.getElementById('service-desc-input').value = '';
                document.getElementById('service-img-input').value = '';
                document.getElementById('service-icon-input').value = '🏠';
                document.getElementById('service-category-input').value = 'self-hosted';
                document.getElementById('service-modal-title-text').textContent = 'เพิ่มลิงก์บริการใหม่';
                modal.style.display = 'flex';
                this.updatePreview();
            });
        }

        const closeModal = () => {
            modal.style.display = 'none';
        };

        if (btnClose) btnClose.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Save service action
        btnSave.addEventListener('click', () => {
            const id = document.getElementById('service-id-field').value;
            const name = document.getElementById('service-name-input').value.trim();
            const url = document.getElementById('service-url-input').value.trim();
            const desc = document.getElementById('service-desc-input').value.trim();
            const imageUrl = document.getElementById('service-img-input').value.trim();
            const icon = document.getElementById('service-icon-input').value;
            const category = document.getElementById('service-category-input').value;

            if (!name || !url) {
                alert('กรุณากรอกชื่อบริการและที่อยู่ URL ด้วยค่ะ');
                return;
            }

            if (id) {
                // Edit existing
                const svc = this.services.find(s => s.id === parseInt(id));
                if (svc) {
                    svc.name = name;
                    svc.url = url;
                    svc.desc = desc;
                    svc.imageUrl = imageUrl;
                    svc.icon = icon;
                    svc.category = category;
                }
            } else {
                // Add new
                this.services.push({
                    id: Date.now(),
                    name,
                    url,
                    desc,
                    imageUrl,
                    icon,
                    category
                });
            }

            this.saveServices();
            closeModal();
            this.renderServices(this.activeCategory);
        });

        // Category Filter toggles
        categoryFilters.forEach(btn => {
            btn.addEventListener('click', () => {
                categoryFilters.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Styling active filter
                categoryFilters.forEach(b => {
                    if (b.classList.contains('active')) {
                        b.style.background = 'var(--primary-color)';
                        b.style.color = 'white';
                        b.style.borderColor = 'var(--primary-color)';
                    } else {
                        b.style.background = 'transparent';
                        b.style.color = 'var(--text-muted)';
                        b.style.borderColor = 'var(--border-color)';
                    }
                });

                this.activeCategory = btn.dataset.category;
                this.renderServices(this.activeCategory);
            });
        });

        // Set initial category styling
        categoryFilters.forEach(b => {
            if (b.classList.contains('active')) {
                b.style.background = 'var(--primary-color)';
                b.style.color = 'white';
                b.style.borderColor = 'var(--primary-color)';
            } else {
                b.style.background = 'transparent';
                b.style.color = 'var(--text-muted)';
                b.style.borderColor = 'var(--border-color)';
            }
        });

        // Search Input Binding
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.renderServices(this.activeCategory);
            });
        }

        // Live Preview Inputs Binding
        const previewInputs = [
            'service-name-input',
            'service-url-input',
            'service-desc-input',
            'service-img-input',
            'service-icon-input',
            'service-category-input'
        ];
        previewInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.updatePreview());
                el.addEventListener('change', () => this.updatePreview());
            }
        });

        this.renderServices();
    }

    saveServices() {
        localStorage.setItem('siam_daily_services', JSON.stringify(this.services));
        // Auto sync to cloud database
        if (window.appCoordinator && typeof window.appCoordinator.syncDataToCloud === 'function') {
            window.appCoordinator.syncDataToCloud();
        }
    }

    deleteService(id) {
        if (confirm('คุณต้องการลบลิงก์บริการนี้ใช่หรือไม่?')) {
            this.services = this.services.filter(s => s.id !== id);
            this.saveServices();
            this.renderServices(this.activeCategory);
        }
    }

    editService(id) {
        const svc = this.services.find(s => s.id === id);
        if (!svc) return;

        document.getElementById('service-id-field').value = svc.id;
        document.getElementById('service-name-input').value = svc.name;
        document.getElementById('service-url-input').value = svc.url;
        document.getElementById('service-desc-input').value = svc.desc || '';
        document.getElementById('service-img-input').value = svc.imageUrl || '';
        document.getElementById('service-icon-input').value = svc.icon || '🏠';
        document.getElementById('service-category-input').value = svc.category || 'self-hosted';
        
        document.getElementById('service-modal-title-text').textContent = 'แก้ไขข้อมูลลิงก์บริการ';
        document.getElementById('service-form-modal').style.display = 'flex';
        this.updatePreview();
    }

    updatePreview() {
        const previewContainer = document.getElementById('service-card-preview-container');
        if (!previewContainer) return;

        const name = document.getElementById('service-name-input').value.trim() || 'ชื่อบริการของคุณ';
        const url = document.getElementById('service-url-input').value.trim() || 'http://localhost:8080';
        const desc = document.getElementById('service-desc-input').value.trim() || 'รายละเอียดหรือคำอธิบายแบบย่อของบริการนี้';
        const imageUrl = document.getElementById('service-img-input').value.trim();
        const icon = document.getElementById('service-icon-input').value || '🏠';
        const category = document.getElementById('service-category-input').value || 'self-hosted';

        // Styling based on category
        let borderLeftColor = 'var(--accent-green)';
        let badgeText = 'Self-Hosted';
        let badgeBg = 'rgba(16, 185, 129, 0.1)';
        let badgeBorder = 'rgba(16, 185, 129, 0.2)';
        let badgeColor = 'var(--accent-green)';
        let radialGlowColor = 'rgba(16, 185, 129, 0.08)';

        if (category === 'dev') {
            borderLeftColor = 'var(--accent-cyan)';
            badgeText = 'Dev Tool';
            badgeBg = 'rgba(6, 182, 212, 0.1)';
            badgeBorder = 'rgba(6, 182, 212, 0.2)';
            badgeColor = 'var(--accent-cyan)';
            radialGlowColor = 'rgba(6, 182, 212, 0.08)';
        } else if (category === 'general') {
            borderLeftColor = 'var(--accent-purple)';
            badgeText = 'General';
            badgeBg = 'rgba(139, 92, 246, 0.1)';
            badgeBorder = 'rgba(139, 92, 246, 0.2)';
            badgeColor = 'var(--accent-purple)';
            radialGlowColor = 'rgba(139, 92, 246, 0.08)';
        }

        // Media HTML
        let mediaHtml = '';
        if (imageUrl && imageUrl.trim() !== '') {
            mediaHtml = `
                <div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.02); overflow: hidden; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                    <img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: contain; padding: 4px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div style="display: none; font-size: 1.6rem; align-items: center; justify-content: center; width: 100%; height: 100%;">${icon}</div>
                </div>
            `;
        } else {
            mediaHtml = `
                <div style="font-size: 1.8rem; background: rgba(255,255,255,0.03); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid var(--border-color); flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                    ${icon}
                </div>
            `;
        }

        previewContainer.innerHTML = `
            <div class="dashboard-card" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; position: relative; overflow: hidden; border-left: 3px solid ${borderLeftColor}; box-shadow: 0 4px 15px rgba(0,0,0,0.15); pointer-events: none; border-radius: 12px; height: 180px;">
                <div class="card-glow" style="background: radial-gradient(circle at top right, ${radialGlowColor}, transparent 60%);"></div>
                
                <!-- Card Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; position: relative; z-index: 1;">
                    <div style="display: flex; gap: 0.75rem; align-items: center; min-width: 0; flex-grow: 1;">
                        ${mediaHtml}
                        <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0; flex-grow: 1;">
                            <h4 class="service-card-title" style="margin: 0; font-family: var(--font-thai); font-size: 0.95rem; font-weight: 600; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</h4>
                            <span style="font-family: var(--font-english); font-size: 0.65rem; color: var(--accent-cyan); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${url}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Description -->
                <p style="margin: 0; font-family: var(--font-thai); font-size: 0.75rem; color: var(--text-muted); line-height: 1.4; flex-grow: 1; min-height: 2.8rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; position: relative; z-index: 1;">
                    ${desc}
                </p>
                
                <!-- Footer Action -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; position: relative; z-index: 1; gap: 0.5rem;">
                    <div class="service-card-footer" style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: var(--text-muted); font-weight: 500; font-family: var(--font-thai);">
                        <span>เปิดเข้าใช้งานบริการ</span>
                        <i data-lucide="arrow-right" class="arrow-icon" style="width: 13px; height: 13px;"></i>
                    </div>
                    
                    <span style="font-size: 0.55rem; padding: 2px 8px; border-radius: 10px; background: ${badgeBg}; border: 1px solid ${badgeBorder}; color: ${badgeColor}; font-weight: 600; text-transform: uppercase; white-space: nowrap;">
                        ${badgeText}
                    </span>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
    }

    renderServices(filter = 'all') {
        const grid = document.getElementById('services-grid');
        if (!grid) return;

        grid.innerHTML = '';

        // Calculate counts based on ALL services (unfiltered)
        const countAll = this.services.length;
        const countSelfHosted = this.services.filter(s => s.category === 'self-hosted').length;
        const countDev = this.services.filter(s => s.category === 'dev').length;
        const countGeneral = this.services.filter(s => s.category === 'general').length;

        const badgeAll = document.getElementById('count-all');
        const badgeSelf = document.getElementById('count-self-hosted');
        const badgeDev = document.getElementById('count-dev');
        const badgeGeneral = document.getElementById('count-general');

        if (badgeAll) badgeAll.textContent = countAll;
        if (badgeSelf) badgeSelf.textContent = countSelfHosted;
        if (badgeDev) badgeDev.textContent = countDev;
        if (badgeGeneral) badgeGeneral.textContent = countGeneral;

        // Apply filters & search query
        const searchInput = document.getElementById('services-search-input');
        const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

        const list = this.services.filter(s => {
            const matchesCategory = (filter === 'all' || s.category === filter);
            const matchesSearch = !searchQuery || 
                s.name.toLowerCase().includes(searchQuery) || 
                s.url.toLowerCase().includes(searchQuery) || 
                (s.desc && s.desc.toLowerCase().includes(searchQuery));
            return matchesCategory && matchesSearch;
        });

        if (list.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 0; color: var(--text-muted); font-family: var(--font-thai); background: rgba(22, 28, 54, 0.15); border: 1px dashed var(--border-color); border-radius: 16px;">
                    <i data-lucide="info" style="width: 40px; height: 40px; margin: 0 auto 0.75rem; display: block; opacity: 0.5; color: var(--accent-cyan);"></i>
                    <span style="font-size: 0.9rem; font-weight: 500;">ไม่พบรายการบริการที่ตรงกับเงื่อนไข</span>
                    <p style="font-size: 0.75rem; margin: 0.25rem 0 0; color: var(--text-muted);">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "เพิ่มลิงก์บริการ" ด้านบนเพื่อเพิ่มได้เลยค่ะ</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        list.forEach(svc => {
            const card = document.createElement('div');
            card.className = 'dashboard-card';
            
            // Set styles based on category
            let borderLeftColor = 'var(--accent-green)';
            let badgeText = 'Self-Hosted';
            let badgeBg = 'rgba(16, 185, 129, 0.1)';
            let badgeBorder = 'rgba(16, 185, 129, 0.2)';
            let badgeColor = 'var(--accent-green)';
            let radialGlowColor = 'rgba(16, 185, 129, 0.08)';

            if (svc.category === 'dev') {
                borderLeftColor = 'var(--accent-cyan)';
                badgeText = 'Dev Tool';
                badgeBg = 'rgba(6, 182, 212, 0.1)';
                badgeBorder = 'rgba(6, 182, 212, 0.2)';
                badgeColor = 'var(--accent-cyan)';
                radialGlowColor = 'rgba(6, 182, 212, 0.08)';
            } else if (svc.category === 'general') {
                borderLeftColor = 'var(--accent-purple)';
                badgeText = 'General';
                badgeBg = 'rgba(139, 92, 246, 0.1)';
                badgeBorder = 'rgba(139, 92, 246, 0.2)';
                badgeColor = 'var(--accent-purple)';
                radialGlowColor = 'rgba(139, 92, 246, 0.08)';
            }

            card.style.cssText = `padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; position: relative; overflow: hidden; cursor: pointer; transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease, border-color 0.3s ease; border-left: 3px solid ${borderLeftColor}; min-height: 180px; border-radius: 12px;`;
            
            // Build icon or image media HTML
            let mediaHtml = '';
            if (svc.imageUrl && svc.imageUrl.trim() !== '') {
                mediaHtml = `
                    <div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.02); overflow: hidden; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                        <img src="${escapeHtml(svc.imageUrl)}" style="width: 100%; height: 100%; object-fit: contain; padding: 4px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div style="display: none; font-size: 1.6rem; align-items: center; justify-content: center; width: 100%; height: 100%;">${escapeHtml(svc.icon || '🏠')}</div>
                    </div>
                `;
            } else {
                mediaHtml = `
                    <div style="font-size: 1.8rem; background: rgba(255,255,255,0.03); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid var(--border-color); flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                        ${escapeHtml(svc.icon || '🏠')}
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="card-glow" style="background: radial-gradient(circle at top right, ${radialGlowColor}, transparent 60%);"></div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; position: relative; z-index: 1;">
                    <div style="display: flex; gap: 0.75rem; align-items: center; min-width: 0; flex-grow: 1;">
                        ${mediaHtml}
                        <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0; flex-grow: 1;">
                            <div style="display: flex; align-items: center; gap: 0.4rem;">
                                <h4 class="service-card-title" style="margin: 0; font-family: var(--font-thai); font-size: 0.95rem; font-weight: 600; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.2s;">${escapeHtml(svc.name)}</h4>
                                <span class="service-uptime-status" data-id="${svc.id}" style="width: 8px; height: 8px; border-radius: 50%; background: #6b7280; display: inline-block; box-shadow: 0 0 4px #6b7280; flex-shrink: 0;" title="กำลังตรวจสอบ..."></span>
                                <span class="service-uptime-latency" data-id="${svc.id}" style="font-size: 0.62rem; color: var(--text-muted); font-family: var(--font-english); display: none;"></span>
                            </div>
                            <span style="font-family: var(--font-english); font-size: 0.65rem; color: var(--accent-cyan); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(svc.url)}">${escapeHtml(svc.url)}</span>
                        </div>
                    </div>
                    <div class="edit-delete-group" style="display: flex; gap: 0.25rem; flex-shrink: 0; opacity: 0; transition: opacity 0.2s ease;">
                        <button class="btn-edit-svc btn-icon-small" title="แก้ไข" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); cursor: pointer; border-radius: 6px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); transition: all 0.2s;"><i data-lucide="edit" style="width: 12px; height: 12px;"></i></button>
                        <button class="btn-delete-svc btn-icon-small" title="ลบ" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); cursor: pointer; border-radius: 6px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; color: var(--accent-red); transition: all 0.2s;"><i data-lucide="trash-2" style="width: 12px; height: 12px;"></i></button>
                    </div>
                </div>
                
                <p style="margin: 0; font-family: var(--font-thai); font-size: 0.75rem; color: var(--text-muted); line-height: 1.4; flex-grow: 1; min-height: 2.8rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; position: relative; z-index: 1;">
                    ${escapeHtml(svc.desc || 'ไม่มีคำอธิบายสำหรับบริการนี้')}
                </p>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; position: relative; z-index: 1; gap: 0.5rem;">
                    <div class="service-card-footer" style="display: flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; color: var(--text-muted); font-weight: 500; font-family: var(--font-thai); transition: color 0.2s;">
                        <span>เปิดเข้าใช้งานบริการ</span>
                        <i data-lucide="arrow-right" class="arrow-icon" style="width: 13px; height: 13px; transition: transform 0.2s, color 0.2s;"></i>
                    </div>
                    
                    <span style="font-size: 0.55rem; padding: 2px 8px; border-radius: 10px; background: ${badgeBg}; border: 1px solid ${badgeBorder}; color: ${badgeColor}; font-weight: 600; text-transform: uppercase; white-space: nowrap;">
                        ${badgeText}
                    </span>
                </div>
            `;

            // Hover interactions using event listeners
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-4px) scale(1.01)';
                card.style.borderColor = borderLeftColor;
                card.style.boxShadow = `0 10px 25px ${radialGlowColor.replace('0.08', '0.15')}`;
                card.querySelector('.service-card-title').style.color = borderLeftColor;
                card.querySelector('.edit-delete-group').style.opacity = '1';
                card.querySelector('.service-card-footer').style.color = borderLeftColor;
                card.querySelector('.arrow-icon').style.transform = 'translateX(4px)';
                card.querySelector('.arrow-icon').style.color = borderLeftColor;
                
                const btnEdit = card.querySelector('.btn-edit-svc');
                const btnDel = card.querySelector('.btn-delete-svc');
                if (btnEdit) btnEdit.style.background = 'rgba(255,255,255,0.1)';
                if (btnDel) btnDel.style.background = 'rgba(255,255,255,0.1)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
                card.style.borderColor = 'var(--border-color)';
                card.style.boxShadow = 'none';
                card.querySelector('.service-card-title').style.color = 'var(--text-main)';
                card.querySelector('.edit-delete-group').style.opacity = '0';
                card.querySelector('.service-card-footer').style.color = 'var(--text-muted)';
                card.querySelector('.arrow-icon').style.transform = 'translateX(0)';
                card.querySelector('.arrow-icon').style.color = 'var(--text-muted)';
            });

            // Bind click to open URL
            card.addEventListener('click', (e) => {
                // If clicked edit or delete button (or their icons), ignore navigation
                if (e.target.closest('.btn-edit-svc') || e.target.closest('.btn-delete-svc')) {
                    return;
                }
                window.open(svc.url, '_blank');
            });

            // Bind edit/delete events
            card.querySelector('.btn-edit-svc').addEventListener('click', (e) => {
                e.stopPropagation();
                this.editService(svc.id);
            });

            card.querySelector('.btn-delete-svc').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteService(svc.id);
            });

            grid.appendChild(card);
        });

        // Trigger asynchronous uptime monitoring checks
        this.checkUptime(list);

        if (window.lucide) window.lucide.createIcons();
    }

    /**
     * Loops through a list of services and sends ping requests to the server
     * to check if they are online and determine latency.
     * @param {Array} servicesList 
     */
    async checkUptime(servicesList) {
        servicesList.forEach(async (svc) => {
            const statusDot = document.querySelector(`.service-uptime-status[data-id="${svc.id}"]`);
            const latencySpan = document.querySelector(`.service-uptime-latency[data-id="${svc.id}"]`);
            
            if (!statusDot) return;

            // Set to "Checking..." visual style (pulse style)
            statusDot.style.background = '#9ca3af';
            statusDot.style.boxShadow = '0 0 6px #9ca3af';

            try {
                const res = await fetch(`/api/services/ping?url=${encodeURIComponent(svc.url)}`);
                if (!res.ok) throw new Error('API Response not ok');
                const data = await res.json();

                if (data && data.success && data.online) {
                    statusDot.style.background = 'var(--accent-green)';
                    statusDot.style.boxShadow = '0 0 8px var(--accent-green)';
                    statusDot.title = `Online - ${data.latency}ms`;
                    if (latencySpan) {
                        latencySpan.textContent = `${data.latency}ms`;
                        latencySpan.style.color = 'var(--accent-green)';
                        latencySpan.style.display = 'inline';
                    }
                } else {
                    statusDot.style.background = 'var(--accent-red)';
                    statusDot.style.boxShadow = '0 0 8px var(--accent-red)';
                    statusDot.title = `Offline - ${data.error || 'Connection Timeout'}`;
                    if (latencySpan) {
                        latencySpan.textContent = 'Offline';
                        latencySpan.style.color = 'var(--accent-red)';
                        latencySpan.style.display = 'inline';
                    }
                }
            } catch (err) {
                statusDot.style.background = 'var(--accent-red)';
                statusDot.style.boxShadow = '0 0 8px var(--accent-red)';
                statusDot.title = `Error checking status: ${err.message}`;
                if (latencySpan) {
                    latencySpan.textContent = 'Offline';
                    latencySpan.style.color = 'var(--accent-red)';
                    latencySpan.style.display = 'inline';
                }
            }
        });
    }
}

// Instantiate
window.servicesService = new ServicesService();
