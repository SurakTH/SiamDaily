class ToolsService {
    constructor() {
        this.init();
    }

    init() {
        this.initWorldClock();
        this.initPasswordGenerator();
        this.initElectricityCalculator();
        this.initUnitConverter();
        this.initQRCodeGenerator();
        this.initNetworkTools();
        this.initTextDevToolbox();
        this.initColorPaletteGenerator();
        this.initKitchenTimer();
        this.initJsonEpochTools();
        this.initPomodoroTimer();
        this.initDataBackup();
    }

    // --- DATA BACKUP / RESTORE ---
    initDataBackup() {
        const btnExport = document.getElementById('btn-backup-export');
        const btnImport = document.getElementById('btn-backup-import');
        const fileInput = document.getElementById('backup-file-input');

        if (!btnExport || !btnImport || !fileInput) return;

        btnExport.addEventListener('click', () => {
            const dataToExport = {};
            // Loop through localStorage and grab everything related to siam_daily
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('siam_daily_')) {
                    dataToExport[key] = localStorage.getItem(key);
                }
            }

            const jsonStr = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const dateStr = new Date().toISOString().split('T')[0]; // e.g. 2026-06-11
            const a = document.createElement('a');
            a.href = url;
            a.download = `siam_daily_backup_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        btnImport.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    let importedCount = 0;
                    for (const key in data) {
                        if (key.startsWith('siam_daily_')) {
                            localStorage.setItem(key, data[key]);
                            importedCount++;
                        }
                    }
                    if (importedCount > 0) {
                        alert(`สำเร็จ! นำเข้าข้อมูลทั้งหมด ${importedCount} รายการ ระบบจะทำการรีเฟรชหน้าจอเพื่ออัปเดตข้อมูล`);
                        window.location.reload();
                    } else {
                        alert('ไม่พบข้อมูล Siam Daily ในไฟล์นี้ หรือรูปแบบไฟล์ไม่ถูกต้อง');
                    }
                } catch (err) {
                    alert('เกิดข้อผิดพลาดในการอ่านไฟล์ JSON: ' + err.message);
                }
            };
            reader.readAsText(file);
            fileInput.value = ''; // Reset input
        });
    }

    // --- POMODORO TIMER ---
    initPomodoroTimer() {
        const display = document.getElementById('pomodoro-display');
        const label = document.getElementById('pomodoro-label');
        const countSpan = document.getElementById('pomodoro-count');
        const btnStart = document.getElementById('btn-pomodoro-start');
        const btnReset = document.getElementById('btn-pomodoro-reset');
        const modeBtns = document.querySelectorAll('.pomodoro-mode-btn');

        if (!display || !btnStart || !btnReset) return;

        const modes = {
            work: { time: 25 * 60, label: 'ทำงาน (25 นาที)' },
            short: { time: 5 * 60, label: 'พักสั้น (5 นาที)' },
            long: { time: 15 * 60, label: 'พักยาว (15 นาที)' }
        };

        let currentMode = 'work';
        let timeLeft = modes.work.time;
        let isRunning = false;
        let timerInterval = null;
        let completedCount = parseInt(localStorage.getItem('siam_daily_pomodoro_count')) || 0;

        if (countSpan) countSpan.textContent = completedCount;

        const formatTime = (seconds) => {
            const m = Math.floor(seconds / 60).toString().padStart(2, '0');
            const s = (seconds % 60).toString().padStart(2, '0');
            return `${m}:${s}`;
        };

        const updateDisplay = () => {
            display.textContent = formatTime(timeLeft);
            if (label) label.textContent = `โหมด: ${modes[currentMode].label}`;
        };

        const setMode = (mode) => {
            if (isRunning) pauseTimer();
            currentMode = mode;
            timeLeft = modes[currentMode].time;
            updateDisplay();

            modeBtns.forEach(btn => {
                btn.style.opacity = btn.dataset.mode === mode ? '1' : '0.6';
            });
        };

        const playAlarm = () => {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                let time = audioCtx.currentTime;
                for (let i = 0; i < 4; i++) {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(1046.50, time); // C6
                    gain.gain.setValueAtTime(0, time);
                    gain.gain.linearRampToValueAtTime(0.5, time + 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
                    osc.start(time);
                    osc.stop(time + 0.3);
                    time += 0.4;
                }
            } catch (e) { console.error('Audio play failed', e); }
        };

        const finishTimer = () => {
            pauseTimer();
            playAlarm();
            if (currentMode === 'work') {
                completedCount++;
                localStorage.setItem('siam_daily_pomodoro_count', completedCount);
                if (countSpan) countSpan.textContent = completedCount;
            }
        };

        const startTimer = () => {
            if (isRunning) return;
            isRunning = true;
            btnStart.innerHTML = `<i data-lucide="pause" style="display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:2px"></i> พัก`;
            if (window.lucide) window.lucide.createIcons();

            timerInterval = setInterval(() => {
                timeLeft--;
                updateDisplay();
                if (timeLeft <= 0) {
                    finishTimer();
                }
            }, 1000);
        };

        const pauseTimer = () => {
            isRunning = false;
            clearInterval(timerInterval);
            btnStart.innerHTML = `<i data-lucide="play" style="display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:2px"></i> เริ่ม`;
            if (window.lucide) window.lucide.createIcons();
        };

        btnStart.addEventListener('click', () => {
            if (isRunning) pauseTimer();
            else startTimer();
        });

        btnReset.addEventListener('click', () => {
            setMode(currentMode);
        });

        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                setMode(btn.dataset.mode);
            });
        });

        updateDisplay();
    }



    // --- WORLD CLOCK ---
    initWorldClock() {
        const container = document.getElementById('worldclock-list');
        if (!container) return;

        const cities = [
            { name: 'กรุงเทพฯ', tz: 'Asia/Bangkok', flag: '🇹🇭' },
            { name: 'โตเกียว', tz: 'Asia/Tokyo', flag: '🇯🇵' },
            { name: 'นิวยอร์ก', tz: 'America/New_York', flag: '🇺🇸' },
            { name: 'ลอนดอน', tz: 'Europe/London', flag: '🇬🇧' },
            { name: 'ซิดนีย์', tz: 'Australia/Sydney', flag: '🇦🇺' },
            { name: 'สิงคโปร์', tz: 'Asia/Singapore', flag: '🇸🇬' },
        ];

        const update = () => {
            container.innerHTML = cities.map(c => {
                const now = new Date();
                const timeStr = now.toLocaleTimeString('th-TH', { timeZone: c.tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                const dateStr = now.toLocaleDateString('th-TH', { timeZone: c.tz, weekday: 'short', day: 'numeric', month: 'short' });
                const hour = parseInt(now.toLocaleTimeString('en-US', { timeZone: c.tz, hour: 'numeric', hour12: false }));
                const isDay = hour >= 6 && hour < 18;
                return `<div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.1rem;">${c.flag}</span>
                        <div>
                            <div style="font-weight: 600; font-size: 0.8rem;">${c.name}</div>
                            <div style="font-size: 0.65rem; color: var(--text-muted);">${dateStr}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1rem; font-weight: 700; font-family: var(--font-english); color: var(--accent-cyan);">${timeStr}</div>
                        <div style="font-size: 0.6rem; color: var(--text-muted);">${isDay ? '☀️ กลางวัน' : '🌙 กลางคืน'}</div>
                    </div>
                </div>`;
            }).join('');
        };

        update();
        setInterval(update, 1000);
    }



    // --- PASSWORD GENERATOR ---
    initPasswordGenerator() {
        const output = document.getElementById('password-output');
        const btnGen = document.getElementById('btn-gen-password');
        const btnCopy = document.getElementById('btn-copy-password');
        const lengthSlider = document.getElementById('password-length');
        const lengthLabel = document.getElementById('password-length-label');
        const strengthEl = document.getElementById('password-strength');

        if (!btnGen || !output) return;

        const generate = () => {
            let chars = '';
            if (document.getElementById('pw-uppercase').checked) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            if (document.getElementById('pw-lowercase').checked) chars += 'abcdefghijklmnopqrstuvwxyz';
            if (document.getElementById('pw-numbers').checked) chars += '0123456789';
            if (document.getElementById('pw-symbols').checked) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
            if (chars.length === 0) { chars = 'abcdefghijklmnopqrstuvwxyz'; }
            const len = parseInt(lengthSlider.value);
            let pw = '';
            const array = new Uint32Array(len);
            crypto.getRandomValues(array);
            for (let i = 0; i < len; i++) { pw += chars[array[i] % chars.length]; }
            output.value = pw;
            // Strength indicator
            const pool = chars.length;
            const entropy = len * Math.log2(pool);
            let strength = '';
            let color = '';
            if (entropy < 40) { strength = 'อ่อนมาก ❌'; color = 'var(--accent-red)'; }
            else if (entropy < 60) { strength = 'ปานกลาง ⚠️'; color = 'var(--accent-amber)'; }
            else if (entropy < 80) { strength = 'แข็งแรง ✅'; color = 'var(--accent-green)'; }
            else { strength = 'แข็งแรงมาก 🛡️'; color = 'var(--accent-cyan)'; }
            if (strengthEl) { strengthEl.textContent = `ความปลอดภัย: ${strength} (${Math.round(entropy)} bits)`; strengthEl.style.color = color; }
        };

        btnGen.addEventListener('click', generate);
        lengthSlider.addEventListener('input', () => { if (lengthLabel) lengthLabel.textContent = lengthSlider.value; generate(); });

        if (btnCopy) {
            btnCopy.addEventListener('click', () => {
                navigator.clipboard.writeText(output.value).then(() => {
                    const origColor = btnCopy.style.color;
                    btnCopy.style.color = 'var(--accent-green)';
                    setTimeout(() => btnCopy.style.color = origColor, 1000);
                });
            });
        }

        generate();
    }



    // --- ELECTRICITY BILL CALCULATOR ---
    initElectricityCalculator() {
        const btn = document.getElementById('btn-calc-elec');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const units = parseFloat(document.getElementById('elec-units').value);
            if (isNaN(units) || units < 0) return;

            // Thai PEA progressive rate schedule (2024)
            let baseCost = 0;
            let remaining = units;
            const tiers = [
                { limit: 15, rate: 0 },       // Free first 15 units (welfare)
                { limit: 10, rate: 2.3488 },   // 16-25
                { limit: 10, rate: 2.9882 },   // 26-35
                { limit: 65, rate: 3.2405 },   // 36-100
                { limit: 50, rate: 3.6237 },   // 101-150
                { limit: 100, rate: 3.7171 },  // 151-250
                { limit: 150, rate: 4.2218 },  // 251-400
                { limit: Infinity, rate: 4.4217 }, // 401+
            ];

            for (const tier of tiers) {
                if (remaining <= 0) break;
                const unitsInTier = Math.min(remaining, tier.limit);
                baseCost += unitsInTier * tier.rate;
                remaining -= unitsInTier;
            }

            const serviceCharge = 38.22; // ค่าบริการรายเดือน
            const ft = units * (-0.0539); // Ft charge (ค่า Ft, อัปเดตตาม กกพ.)
            const subtotal = baseCost + serviceCharge + ft;
            const vat = subtotal * 0.07;
            const total = subtotal + vat;

            document.getElementById('elec-result').textContent = `${total.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})} บาท`;
            document.getElementById('elec-breakdown').textContent = `ค่าพลังงาน ${baseCost.toFixed(2)} + ค่าบริการ ${serviceCharge.toFixed(2)} + Ft ${ft.toFixed(2)} + VAT 7% ${vat.toFixed(2)}`;
        });
    }



    // --- UNIT CONVERTER ---
    initUnitConverter() {
        const catSelect = document.getElementById('unit-category');
        const fromSelect = document.getElementById('unit-from');
        const toSelect = document.getElementById('unit-to');
        const input = document.getElementById('unit-input');
        const result = document.getElementById('unit-result');
        const btnSwap = document.getElementById('btn-unit-swap');

        if (!catSelect || !fromSelect || !toSelect || !input || !result) return;

        const units = {
            length: {
                'กิโลเมตร': 1000, 'เมตร': 1, 'เซนติเมตร': 0.01, 'มิลลิเมตร': 0.001,
                'ไมล์': 1609.344, 'ฟุต': 0.3048, 'นิ้ว': 0.0254, 'วา': 2.0, 'เส้น': 40.0
            },
            weight: {
                'กิโลกรัม': 1, 'กรัม': 0.001, 'ตัน': 1000, 'ปอนด์': 0.453592,
                'ออนซ์': 0.0283495, 'บาท (ทอง)': 0.01518, 'สลึง': 0.003795
            },
            temperature: { '°C (เซลเซียส)': 'c', '°F (ฟาเรนไฮต์)': 'f', 'K (เคลวิน)': 'k' },
            area: {
                'ตร.เมตร': 1, 'ตร.กิโลเมตร': 1e6, 'ไร่': 1600, 'งาน': 400,
                'ตร.วา': 4, 'เอเคอร์': 4046.86, 'ตร.ฟุต': 0.0929, 'เฮกตาร์': 10000
            }
        };

        const populateSelects = () => {
            const cat = catSelect.value;
            const keys = Object.keys(units[cat]);
            fromSelect.innerHTML = keys.map((k, i) => `<option value="${k}" ${i === 0 ? 'selected' : ''}>${k}</option>`).join('');
            toSelect.innerHTML = keys.map((k, i) => `<option value="${k}" ${i === 1 ? 'selected' : ''}>${k}</option>`).join('');
            convert();
        };

        const convert = () => {
            const cat = catSelect.value;
            const val = parseFloat(input.value);
            if (isNaN(val)) { result.textContent = '--'; return; }

            if (cat === 'temperature') {
                const from = units.temperature[fromSelect.value];
                const to = units.temperature[toSelect.value];
                let celsius;
                if (from === 'c') celsius = val;
                else if (from === 'f') celsius = (val - 32) * 5/9;
                else celsius = val - 273.15;

                let out;
                if (to === 'c') out = celsius;
                else if (to === 'f') out = celsius * 9/5 + 32;
                else out = celsius + 273.15;
                result.textContent = `${out.toFixed(4)} ${toSelect.value}`;
            } else {
                const fromFactor = units[cat][fromSelect.value];
                const toFactor = units[cat][toSelect.value];
                const converted = val * fromFactor / toFactor;
                result.textContent = `${converted.toLocaleString('en-US', {maximumFractionDigits: 6})} ${toSelect.value}`;
            }
        };

        catSelect.addEventListener('change', populateSelects);
        fromSelect.addEventListener('change', convert);
        toSelect.addEventListener('change', convert);
        input.addEventListener('input', convert);

        if (btnSwap) {
            btnSwap.addEventListener('click', () => {
                btnSwap.style.transform = btnSwap.style.transform === 'rotate(180deg)' ? 'rotate(0deg)' : 'rotate(180deg)';
                const temp = fromSelect.value;
                fromSelect.value = toSelect.value;
                toSelect.value = temp;
                convert();
            });
        }

        populateSelects();
    }



    // --- QR CODE GENERATOR ---
    initQRCodeGenerator() {
        const typeSelect = document.getElementById('qr-type');
        const textGroup = document.getElementById('qr-text-group');
        const promptpayGroup = document.getElementById('qr-promptpay-group');
        const btnGen = document.getElementById('btn-gen-qr');
        const canvas = document.getElementById('qr-canvas');

        if (!typeSelect || !btnGen || !canvas) return;

        typeSelect.addEventListener('change', () => {
            if (typeSelect.value === 'promptpay') {
                textGroup.style.display = 'none';
                promptpayGroup.style.display = '';
            } else {
                textGroup.style.display = '';
                promptpayGroup.style.display = 'none';
            }
        });

        const generatePromptPayPayload = (id, amount) => {
            // EMV QR Code format for PromptPay
            const sanitized = id.replace(/[^0-9]/g, '');
            let aid = '';
            if (sanitized.length === 10 || sanitized.length === 9) { // Phone
                aid = '00' + ('0066' + sanitized.substring(sanitized.length === 10 ? 1 : 0)).length.toString().padStart(2, '0') + '0066' + sanitized.substring(sanitized.length === 10 ? 1 : 0);
            } else if (sanitized.length === 13) { // ID card
                aid = '02' + sanitized.length.toString().padStart(2, '0') + sanitized;
            } else {
                return sanitized; // fallback
            }
            // Build payload
            let payload = '';
            payload += '000201'; // Payload format
            payload += '010212'; // Point of initiation (dynamic)
            const merchantInfo = 'A00000067701011' + aid;
            payload += '29' + merchantInfo.length.toString().padStart(2, '0') + merchantInfo;
            payload += '5802TH';
            payload += '5303764'; // Currency: THB
            if (amount && amount > 0) {
                const amtStr = amount.toFixed(2);
                payload += '54' + amtStr.length.toString().padStart(2, '0') + amtStr;
            }
            payload += '6304'; // CRC placeholder
            // CRC-16 CCITT
            const crcData = payload;
            let crc = 0xFFFF;
            for (let i = 0; i < crcData.length; i++) {
                crc ^= crcData.charCodeAt(i) << 8;
                for (let j = 0; j < 8; j++) {
                    if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
                    else crc <<= 1;
                    crc &= 0xFFFF;
                }
            }
            payload = crcData + crc.toString(16).toUpperCase().padStart(4, '0');
            return payload;
        };

        btnGen.addEventListener('click', () => {
            let data = '';
            if (typeSelect.value === 'promptpay') {
                const id = document.getElementById('qr-promptpay-id').value.trim();
                const amount = parseFloat(document.getElementById('qr-promptpay-amount').value) || 0;
                if (!id) { alert('กรุณากรอกเบอร์โทรหรือเลขบัตรประชาชน'); return; }
                data = generatePromptPayPayload(id, amount);
            } else {
                data = document.getElementById('qr-text-input').value.trim();
                if (!data) { alert('กรุณากรอกข้อความหรือ URL'); return; }
            }

            if (typeof qrcode !== 'undefined') {
                const qr = qrcode(0, 'M');
                qr.addData(data);
                qr.make();
                
                const size = 180;
                const moduleCount = qr.getModuleCount();
                const cellSize = size / moduleCount;
                
                canvas.width = size;
                canvas.height = size;
                canvas.style.display = 'block';
                canvas.style.margin = '0 auto';
                
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, size, size);
                ctx.fillStyle = '#000000';
                
                for (let row = 0; row < moduleCount; row++) {
                    for (let col = 0; col < moduleCount; col++) {
                        if (qr.isDark(row, col)) {
                            ctx.fillRect(col * cellSize, row * cellSize, cellSize + 0.5, cellSize + 0.5);
                        }
                    }
                }
            }
        });
    }





    // --- MY IP & NETWORK TOOLS ---
    initNetworkTools() {
        const netIp = document.getElementById('net-ip');
        const netIsp = document.getElementById('net-isp');
        const netLocation = document.getElementById('net-location');
        const netPing = document.getElementById('net-ping');
        const btnPing = document.getElementById('btn-ping-test');

        // Tab navigation
        const tabBtns = document.querySelectorAll('#net-card-tabs button');
        const tabContents = document.querySelectorAll('.net-tab-content');
        
        if (tabBtns.length > 0) {
            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    tabBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    const tabId = btn.getAttribute('data-net-tab');
                    tabContents.forEach(content => {
                        if (content.id === `net-tab-${tabId}`) {
                            content.style.setProperty('display', 'flex', 'important');
                        } else {
                            content.style.setProperty('display', 'none', 'important');
                        }
                    });
                });
            });
        }

        // Status tab functionality
        const checkIP = async () => {
            if (!netIp || !netIsp || !netLocation) return;
            netIp.textContent = 'กำลังตรวจ...';
            netIsp.textContent = 'กำลังตรวจ...';
            netLocation.textContent = 'กำลังตรวจ...';

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);

                const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    netIp.textContent = data.ip || 'ไม่พบ IP';
                    netIsp.textContent = data.org || 'ไม่พบ ISP';
                    netLocation.textContent = `${data.city || ''}, ${data.country_name || 'ไม่ทราบพื้นที่'}`;
                } else {
                    throw new Error('ipapi failed');
                }
            } catch (err) {
                try {
                    const response = await fetch('https://api.ipify.org?format=json');
                    if (response.ok) {
                        const data = await response.json();
                        netIp.textContent = data.ip || 'ไม่พบ IP';
                        netIsp.textContent = 'ตรวจด้วยระบบสำรอง';
                        netLocation.textContent = 'ไม่พบข้อมูลพื้นที่';
                    } else {
                        netIp.textContent = 'ตรวจไม่สำเร็จ';
                        netIsp.textContent = '-';
                        netLocation.textContent = '-';
                    }
                } catch (e) {
                    netIp.textContent = 'ตรวจไม่สำเร็จ (ออฟไลน์)';
                    netIsp.textContent = '-';
                    netLocation.textContent = '-';
                }
            }
        };

        const checkPing = async () => {
            if (!netPing) return;
            netPing.textContent = 'กำลังปิง...';
            const start = performance.now();
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                
                await fetch(`/?t=${Date.now()}`, { method: 'HEAD', signal: controller.signal });
                clearTimeout(timeoutId);
                
                const latency = Math.round(performance.now() - start);
                netPing.textContent = `${latency} ms`;
                netPing.style.color = latency < 50 ? 'var(--accent-green)' : (latency < 150 ? 'var(--accent-orange)' : 'var(--accent-red)');
            } catch (err) {
                netPing.textContent = 'ล้มเหลว';
                netPing.style.color = 'var(--accent-red)';
            }
        };

        if (btnPing) {
            btnPing.addEventListener('click', () => {
                checkIP();
                checkPing();
            });
        }

        checkIP();
        checkPing();

        // Speedtest tab functionality
        const btnClientSpeed = document.getElementById('btn-run-client-speed');
        const btnServerSpeed = document.getElementById('btn-run-server-speed');
        const speedValue = document.getElementById('speedtest-value');
        const speedUnit = document.getElementById('speedtest-unit');
        const progressBar = document.getElementById('speedtest-progress-bar');
        const statusArea = document.getElementById('speedtest-status-area');

        let speedtestRunning = false;

        if (btnClientSpeed && btnServerSpeed) {
            // Client speedtest (Download & Upload to VPS)
            btnClientSpeed.addEventListener('click', async () => {
                if (speedtestRunning) return;
                speedtestRunning = true;
                btnClientSpeed.disabled = true;
                btnServerSpeed.disabled = true;
                
                progressBar.style.width = '0%';
                speedValue.textContent = '0.0';
                speedUnit.textContent = 'Mbps';

                try {
                    // Phase 1: Download Test
                    statusArea.textContent = 'กำลังทดสอบความเร็วดาวน์โหลด...';
                    const dlStartTime = performance.now();
                    const response = await fetch('/api/speedtest/download?size=10485760'); // 10MB
                    
                    if (!response.ok) throw new Error('Download request failed');
                    
                    const reader = response.body.getReader();
                    const contentLength = 10485760;
                    let receivedLength = 0;
                    
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        receivedLength += value.length;
                        const progress = (receivedLength / contentLength) * 100;
                        progressBar.style.width = `${progress}%`;
                        
                        const elapsedSec = (performance.now() - dlStartTime) / 1000;
                        if (elapsedSec > 0) {
                            const speedMbps = ((receivedLength * 8) / (1024 * 1024)) / elapsedSec;
                            speedValue.textContent = speedMbps.toFixed(1);
                        }
                    }
                    const totalDlTime = (performance.now() - dlStartTime) / 1000;
                    const finalDlSpeed = ((receivedLength * 8) / (1024 * 1024)) / totalDlTime;
                    const dlResult = finalDlSpeed.toFixed(1);
                    
                    statusArea.textContent = `ดาวน์โหลด: ${dlResult} Mbps | กำลังเตรียมทดสอบอัปโหลด...`;
                    await new Promise(r => setTimeout(r, 1000));
                    
                    // Phase 2: Upload Test
                    statusArea.textContent = 'กำลังทดสอบความเร็วอัปโหลด...';
                    progressBar.style.width = '0%';
                    speedValue.textContent = '0.0';
                    
                    const uploadData = new Uint8Array(5 * 1024 * 1024); // 5MB
                    if (window.crypto && window.crypto.getRandomValues) {
                        window.crypto.getRandomValues(uploadData);
                    }
                    
                    const xhr = new XMLHttpRequest();
                    const ulStartTime = performance.now();
                    
                    const uploadPromise = new Promise((resolve, reject) => {
                        xhr.upload.onprogress = (event) => {
                            if (event.lengthComputable) {
                                const progress = (event.loaded / event.total) * 100;
                                progressBar.style.width = `${progress}%`;
                                
                                const elapsedSec = (performance.now() - ulStartTime) / 1000;
                                if (elapsedSec > 0) {
                                    const speedMbps = ((event.loaded * 8) / (1024 * 1024)) / elapsedSec;
                                    speedValue.textContent = speedMbps.toFixed(1);
                                }
                            }
                        };
                        xhr.onload = () => {
                            const totalUlTime = (performance.now() - ulStartTime) / 1000;
                            const finalUlSpeed = ((5 * 1024 * 1024 * 8) / (1024 * 1024)) / totalUlTime;
                            resolve(finalUlSpeed.toFixed(1));
                        };
                        xhr.onerror = () => reject(new Error('Upload failed'));
                        xhr.open('POST', '/api/speedtest/upload');
                        xhr.send(uploadData);
                    });
                    
                    const ulResult = await uploadPromise;
                    statusArea.innerHTML = `<span style="color: var(--accent-green)">เสร็จสิ้น!</span> ดาวน์โหลด: <strong class="text-cyan">${dlResult}</strong> Mbps | อัปโหลด: <strong class="text-teal">${ulResult}</strong> Mbps`;
                    speedValue.textContent = dlResult;
                    speedUnit.textContent = 'Mbps';
                } catch (err) {
                    console.error('Client speedtest failed:', err);
                    statusArea.textContent = 'การทดสอบความเร็วอินเทอร์เน็ตล้มเหลว';
                } finally {
                    speedtestRunning = false;
                    btnClientSpeed.disabled = false;
                    btnServerSpeed.disabled = false;
                }
            });

            // Server speedtest (VPS download speed)
            btnServerSpeed.addEventListener('click', async () => {
                if (speedtestRunning) return;
                speedtestRunning = true;
                btnClientSpeed.disabled = true;
                btnServerSpeed.disabled = true;
                
                progressBar.style.width = '10%';
                speedValue.textContent = '0.0';
                speedUnit.textContent = 'Mbps';
                statusArea.textContent = 'กำลังทดสอบความเร็วอินเทอร์เน็ตของเครื่อง VPS...';

                let mockProgress = 10;
                const progressInterval = setInterval(() => {
                    if (mockProgress < 90) {
                        mockProgress += 8;
                        progressBar.style.width = `${mockProgress}%`;
                    }
                }, 400);

                try {
                    const response = await fetch('/api/speedtest/server');
                    clearInterval(progressInterval);
                    
                    if (!response.ok) throw new Error('Server Speedtest API error');
                    const data = await response.json();
                    
                    progressBar.style.width = '100%';
                    if (data.success) {
                        const speed = parseFloat(data.downloadSpeedMbps).toFixed(1);
                        speedValue.textContent = speed;
                        statusArea.innerHTML = `<span style="color: var(--accent-green)">VPS เสร็จสิ้น!</span> ความเร็วอินเทอร์เน็ตเฉลี่ย: <strong class="text-cyan">${speed}</strong> Mbps`;
                    } else {
                        throw new Error(data.error);
                    }
                } catch (err) {
                    console.error('Server speedtest failed:', err);
                    statusArea.textContent = `ทดสอบล้มเหลว: ${err.message}`;
                } finally {
                    clearInterval(progressInterval);
                    speedtestRunning = false;
                    btnClientSpeed.disabled = false;
                    btnServerSpeed.disabled = false;
                }
            });
        }

        // Diagnostics tab functionality
        const diagHostInput = document.getElementById('diag-host-input');
        const diagPortInput = document.getElementById('diag-port-input');
        const diagActionBtns = document.querySelectorAll('.diag-action-btn');
        const diagTerminal = document.getElementById('diag-terminal');

        if (diagActionBtns.length > 0 && diagTerminal) {
            diagActionBtns.forEach(btn => {
                btn.addEventListener('click', async () => {
                    const action = btn.getAttribute('data-diag-action');
                    const host = diagHostInput.value.trim();
                    const port = diagPortInput.value.trim();

                    if (!host) {
                        diagTerminal.textContent = 'กรุณาระบุที่อยู่โฮสต์สำหรับตรวจสอบด้วยค่ะ';
                        return;
                    }

                    diagTerminal.textContent = `$ Running ${action} diagnostics for ${host}...\n`;
                    diagActionBtns.forEach(b => b.disabled = true);

                    try {
                        let url = '';
                        if (action === 'ping') {
                            url = `/api/diagnostics/ping?host=${encodeURIComponent(host)}`;
                        } else if (action === 'dns') {
                            url = `/api/diagnostics/dns?host=${encodeURIComponent(host)}`;
                        } else if (action === 'port') {
                            url = `/api/diagnostics/port?host=${encodeURIComponent(host)}&port=${encodeURIComponent(port)}`;
                        }

                        const response = await fetch(url);
                        if (!response.ok) throw new Error('Network error');
                        const data = await response.json();

                        if (data.success) {
                            if (action === 'ping') {
                                diagTerminal.textContent += data.output || 'Ping completed with no stdout';
                            } else if (action === 'dns') {
                                diagTerminal.textContent += `DNS Lookup Results for ${host}:\n`;
                                if (data.addresses && data.addresses.length > 0) {
                                    data.addresses.forEach((addr, i) => {
                                        diagTerminal.textContent += `  [${i+1}] IP: ${addr.address} (Type: IPv${addr.family})\n`;
                                    });
                                } else {
                                    diagTerminal.textContent += '  No IP records found.';
                                }
                            } else if (action === 'port') {
                                diagTerminal.textContent += `Port Check Results for ${host}:${port}:\n`;
                                if (data.open) {
                                    diagTerminal.textContent += `  [+] PORT ${port} is OPEN / LISTEN\n`;
                                } else {
                                    diagTerminal.textContent += `  [-] PORT ${port} is CLOSED (Reason: ${data.reason || 'Connection refused'})\n`;
                                }
                            }
                        } else {
                            diagTerminal.textContent += `Error: ${data.error || 'Unknown diagnostics error'}`;
                        }
                    } catch (err) {
                        diagTerminal.textContent += `Error: Failed to fetch diagnostics response: ${err.message}`;
                    } finally {
                        diagActionBtns.forEach(b => b.disabled = false);
                        diagTerminal.scrollTop = diagTerminal.scrollHeight;
                    }
                });
            });
        }
    }


    // --- SMART TEXT & DEV TOOLBOX ---
    initTextDevToolbox() {
        const textInput = document.getElementById('dev-text-input');
        const wordCountEl = document.getElementById('dev-res-words');
        const charCountEl = document.getElementById('dev-res-chars');
        const actionBtns = document.querySelectorAll('.dev-tool-btn');

        if (!textInput || !wordCountEl || !charCountEl) return;

        const updateStats = () => {
            const text = textInput.value;
            const charCount = text.length;
            
            const cleanText = text.trim();
            const wordCount = cleanText === '' ? 0 : cleanText.split(/\s+/).length;

            charCountEl.textContent = charCount.toLocaleString();
            wordCountEl.textContent = wordCount.toLocaleString();
        };

        textInput.addEventListener('input', updateStats);

        actionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                const val = textInput.value;

                if (!val.trim()) {
                    alert('กรุณากรอกข้อความก่อนเลือกปุ่มเครื่องมือค่ะ');
                    return;
                }

                let result = '';

                try {
                    switch (action) {
                        case 'uppercase':
                            result = val.toUpperCase();
                            break;
                        case 'lowercase':
                            result = val.toLowerCase();
                            break;
                        case 'urlencode':
                            result = encodeURIComponent(val);
                            break;
                        case 'urldecode':
                            result = decodeURIComponent(val);
                            break;
                        case 'base64encode':
                            result = btoa(unescape(encodeURIComponent(val)));
                            break;
                        case 'base64decode':
                            result = decodeURIComponent(escape(atob(val)));
                            break;
                        default:
                            result = val;
                    }
                    textInput.value = result;
                    updateStats();
                } catch (err) {
                    console.error('Text conversion error:', err);
                    alert('เกิดข้อผิดพลาดในการดำเนินการ! กรุณาตรวจสอบความถูกต้องของรูปแบบข้อความอีกครั้งค่ะ');
                }
            });
        });
    }


    // --- HARMONIOUS COLOR PALETTE GENERATOR ---
    initColorPaletteGenerator() {
        const btnGen = document.getElementById('btn-gen-palette');
        const stripContainer = document.getElementById('palette-strip');
        const hexLabels = document.querySelectorAll('.palette-hex-label');

        if (!stripContainer || hexLabels.length === 0) return;

        const generatePalette = () => {
            stripContainer.innerHTML = '';
            
            const baseH = Math.floor(Math.random() * 360);
            const baseS = 65 + Math.floor(Math.random() * 20);
            const baseL = 45 + Math.floor(Math.random() * 15);

            const colors = [];
            for (let i = 0; i < 5; i++) {
                const h = (baseH + (i - 2) * 25 + 360) % 360;
                const s = Math.max(40, Math.min(95, baseS + (i - 2) * 5));
                const l = Math.max(25, Math.min(85, baseL + (i - 2) * 4));
                
                const hex = this.hslToHex(h, s, l);
                colors.push(hex);
            }

            colors.forEach((hex, idx) => {
                const block = document.createElement('div');
                block.style.cssText = `flex: 1; background: ${hex}; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; position: relative;`;
                block.title = `คัดลอกรหัสสี: ${hex}`;
                
                block.addEventListener('mouseenter', () => {
                    block.style.transform = 'scaleY(1.08)';
                    block.style.zIndex = '1';
                    block.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                });
                block.addEventListener('mouseleave', () => {
                    block.style.transform = '';
                    block.style.zIndex = '';
                    block.style.boxShadow = '';
                });

                const copyHex = () => {
                    navigator.clipboard.writeText(hex).then(() => {
                        const label = hexLabels[idx];
                        if (label) {
                            const oldText = label.textContent;
                            label.textContent = 'COPIED!';
                            label.style.color = 'var(--accent-pink)';
                            setTimeout(() => {
                                label.textContent = hex;
                                label.style.color = '';
                            }, 1200);
                        }
                    });
                };

                block.addEventListener('click', copyHex);
                stripContainer.appendChild(block);

                const label = hexLabels[idx];
                if (label) {
                    label.textContent = hex;
                    label.onclick = copyHex;
                }
            });
        };

        if (btnGen) {
            btnGen.addEventListener('click', generatePalette);
        }

        generatePalette();
    }



    // --- KITCHEN MULTI-TIMER ---
    initKitchenTimer() {
        const timers = {
            '1': {
                display: document.getElementById('timer-display-1'),
                toggleBtn: document.querySelector('.btn-timer-toggle[data-timer-id="1"]'),
                resetBtn: document.querySelector('.btn-timer-reset[data-timer-id="1"]'),
                initialTime: 360,
                timeLeft: 360,
                intervalId: null
            },
            '2': {
                display: document.getElementById('timer-display-2'),
                toggleBtn: document.querySelector('.btn-timer-toggle[data-timer-id="2"]'),
                resetBtn: document.querySelector('.btn-timer-reset[data-timer-id="2"]'),
                initialTime: 900,
                timeLeft: 900,
                intervalId: null
            }
        };

        const formatTime = (seconds) => {
            const m = Math.floor(seconds / 60).toString().padStart(2, '0');
            const s = (seconds % 60).toString().padStart(2, '0');
            return `${m}:${s}`;
        };

        const playAlarm = () => {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                let time = audioCtx.currentTime;
                
                for (let i = 0; i < 3; i++) {
                    const osc1 = audioCtx.createOscillator();
                    const gain1 = audioCtx.createGain();
                    osc1.connect(gain1);
                    gain1.connect(audioCtx.destination);
                    osc1.type = 'sine';
                    osc1.frequency.setValueAtTime(880, time);
                    gain1.gain.setValueAtTime(0, time);
                    gain1.gain.linearRampToValueAtTime(0.5, time + 0.05);
                    gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
                    osc1.start(time);
                    osc1.stop(time + 0.25);
                    
                    const osc2 = audioCtx.createOscillator();
                    const gain2 = audioCtx.createGain();
                    osc2.connect(gain2);
                    gain2.connect(audioCtx.destination);
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(880, time + 0.3);
                    gain2.gain.setValueAtTime(0, time + 0.3);
                    gain2.gain.linearRampToValueAtTime(0.5, time + 0.35);
                    gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.55);
                    osc2.start(time + 0.3);
                    osc2.stop(time + 0.55);

                    time += 0.8;
                }
            } catch (err) {
                console.error('Failed to trigger audio alarm:', err);
            }
        };

        const startTimer = (id) => {
            const timer = timers[id];
            if (timer.intervalId) return;

            timer.toggleBtn.textContent = 'หยุด';
            timer.toggleBtn.classList.remove('btn-secondary');
            timer.toggleBtn.classList.add('btn-primary');
            timer.toggleBtn.style.background = 'var(--accent-red)';
            timer.toggleBtn.style.borderColor = 'var(--accent-red)';

            timer.intervalId = setInterval(() => {
                timer.timeLeft--;
                timer.display.textContent = formatTime(timer.timeLeft);

                if (timer.timeLeft <= 0) {
                    clearInterval(timer.intervalId);
                    timer.intervalId = null;
                    timer.timeLeft = timer.initialTime;
                    
                    playAlarm();
                    
                    timer.display.textContent = 'สำเร็จ!';
                    timer.display.style.color = 'var(--accent-red)';
                    
                    setTimeout(() => {
                        timer.display.style.color = '';
                        timer.display.textContent = formatTime(timer.timeLeft);
                    }, 4000);

                    timer.toggleBtn.textContent = 'เริ่ม';
                    timer.toggleBtn.classList.add('btn-secondary');
                    timer.toggleBtn.classList.remove('btn-primary');
                    timer.toggleBtn.style.background = '';
                    timer.toggleBtn.style.borderColor = '';
                }
            }, 1000);
        };

        const pauseTimer = (id) => {
            const timer = timers[id];
            if (!timer.intervalId) return;

            clearInterval(timer.intervalId);
            timer.intervalId = null;

            timer.toggleBtn.textContent = 'เริ่ม';
            timer.toggleBtn.classList.add('btn-secondary');
            timer.toggleBtn.classList.remove('btn-primary');
            timer.toggleBtn.style.background = '';
            timer.toggleBtn.style.borderColor = '';
        };

        const resetTimer = (id) => {
            const timer = timers[id];
            pauseTimer(id);
            timer.timeLeft = timer.initialTime;
            timer.display.textContent = formatTime(timer.timeLeft);
            timer.display.style.color = '';
        };

        Object.keys(timers).forEach(id => {
            const timer = timers[id];
            if (!timer.display || !timer.toggleBtn || !timer.resetBtn) return;

            timer.toggleBtn.addEventListener('click', () => {
                if (timer.intervalId) {
                    pauseTimer(id);
                } else {
                    startTimer(id);
                }
            });

            timer.resetBtn.addEventListener('click', () => {
                resetTimer(id);
            });
            
            timer.display.textContent = formatTime(timer.timeLeft);
        });
    }



    // --- JSON FORMATTER & EPOCH CONVERTER ---
    initJsonEpochTools() {
        const jsonInput = document.getElementById('json-input');
        const btnFormat = document.getElementById('btn-json-format');
        const btnMinify = document.getElementById('btn-json-minify');
        
        const epochInput = document.getElementById('epoch-input');
        const btnEpoch = document.getElementById('btn-epoch-convert');
        const epochOutput = document.getElementById('epoch-output');

        // JSON Format & Minify
        if (jsonInput) {
            if (btnFormat) {
                btnFormat.addEventListener('click', () => {
                    const raw = jsonInput.value.trim();
                    if (!raw) return alert('กรุณากรอกข้อความ JSON ก่อนค่ะ');
                    try {
                        const parsed = JSON.parse(raw);
                        jsonInput.value = JSON.stringify(parsed, null, 4);
                    } catch (err) {
                        alert('รูปแบบ JSON ไม่ถูกต้อง: ' + err.message);
                    }
                });
            }
            if (btnMinify) {
                btnMinify.addEventListener('click', () => {
                    const raw = jsonInput.value.trim();
                    if (!raw) return alert('กรุณากรอกข้อความ JSON ก่อนค่ะ');
                    try {
                        const parsed = JSON.parse(raw);
                        jsonInput.value = JSON.stringify(parsed);
                    } catch (err) {
                        alert('รูปแบบ JSON ไม่ถูกต้อง: ' + err.message);
                    }
                });
            }
        }

        // Epoch Converter
        if (epochInput && btnEpoch && epochOutput) {
            btnEpoch.addEventListener('click', () => {
                const val = epochInput.value.trim();
                if (!val) return alert('กรุณาระบุค่าเวลา (Timestamp หรือ วันที่) ก่อนค่ะ');
                
                // Check if it is numeric (Timestamp)
                if (/^\d+$/.test(val)) {
                    let ts = parseInt(val, 10);
                    // Handle seconds vs milliseconds
                    if (val.length <= 10) {
                        ts = ts * 1000;
                    }
                    try {
                        const date = new Date(ts);
                        if (isNaN(date.getTime())) throw new Error('Invalid Date');
                        epochOutput.innerHTML = `
                            <strong>เวลาท้องถิ่น:</strong> ${date.toLocaleString('th-TH')}<br>
                            <strong>เวลา UTC:</strong> ${date.toUTCString()}<br>
                            <strong>ISO String:</strong> ${date.toISOString()}
                        `;
                    } catch (err) {
                        epochOutput.textContent = 'เกิดข้อผิดพลาดในการแปลงค่า! กรุณาเช็กตัวเลข Timestamp อีกครั้งค่ะ';
                    }
                } else {
                    // Try parsing as text date
                    try {
                        const date = new Date(val);
                        if (isNaN(date.getTime())) throw new Error('Invalid Date');
                        const sec = Math.floor(date.getTime() / 1000);
                        const ms = date.getTime();
                        epochOutput.innerHTML = `
                            <strong>Timestamp (วินาที):</strong> ${sec}<br>
                            <strong>Timestamp (มิลลิวินาที):</strong> ${ms}
                        `;
                    } catch (err) {
                        epochOutput.textContent = 'ไม่สามารถแปลงวันที่ได้! กรุณาใช้รูปแบบสากล เช่น YYYY-MM-DD HH:MM:SS';
                    }
                }
            });
        }
    }



}

window.toolsService = new ToolsService();
