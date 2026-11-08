class HealthService {
    constructor() {
        this.init();
    }

    init() {
        this.initPomodoroTimer();
        this.initWaterTracker();
        this.initHealthCalculator();
        this.initBreathingGuide();
        this.initHabitTracker();
        this.initBinauralBeats();
        this.initPostureReminder();
    }




    // --- POMODORO TIMER ---
    initPomodoroTimer() {
        const display = document.getElementById('pomodoro-display');
        const label = document.getElementById('pomodoro-label');
        const btnStart = document.getElementById('btn-pomodoro-start');
        const btnReset = document.getElementById('btn-pomodoro-reset');
        const countEl = document.getElementById('pomodoro-count');
        const modeBtns = document.querySelectorAll('.pomodoro-mode-btn');

        if (!display || !btnStart) return;

        const modes = { work: { time: 25 * 60, label: 'ทำงาน (25 นาที)' }, short: { time: 5 * 60, label: 'พักสั้น (5 นาที)' }, long: { time: 15 * 60, label: 'พักยาว (15 นาที)' } };
        let currentMode = 'work';
        let timeLeft = modes.work.time;
        let intervalId = null;
        let isRunning = false;
        let completedCount = 0;

        const updateDisplay = () => {
            const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
            const s = (timeLeft % 60).toString().padStart(2, '0');
            display.textContent = `${m}:${s}`;
        };

        const stopTimer = () => {
            clearInterval(intervalId);
            intervalId = null;
            isRunning = false;
            btnStart.innerHTML = '<i data-lucide="play" style="display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:2px"></i> เริ่ม';
            if (window.lucide) window.lucide.createIcons();
        };

        btnStart.addEventListener('click', () => {
            if (isRunning) {
                stopTimer();
            } else {
                isRunning = true;
                btnStart.innerHTML = '<i data-lucide="pause" style="display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:2px"></i> หยุดชั่วคราว';
                if (window.lucide) window.lucide.createIcons();
                intervalId = setInterval(() => {
                    timeLeft--;
                    updateDisplay();
                    if (timeLeft <= 0) {
                        stopTimer();
                        if (currentMode === 'work') completedCount++;
                        if (countEl) countEl.textContent = completedCount;
                        // Play notification sound
                        try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(); o.frequency.value = 800; o.connect(ctx.destination); o.start(); setTimeout(() => o.stop(), 300); } catch(e) {}
                        alert(currentMode === 'work' ? '🎉 ทำงานครบแล้ว! พักผ่อนหน่อยนะ' : '⏰ หมดเวลาพัก กลับมาทำงานต่อเลย!');
                    }
                }, 1000);
            }
        });

        btnReset.addEventListener('click', () => {
            stopTimer();
            timeLeft = modes[currentMode].time;
            updateDisplay();
        });

        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                stopTimer();
                currentMode = btn.dataset.mode;
                timeLeft = modes[currentMode].time;
                updateDisplay();
                if (label) label.textContent = `โหมด: ${modes[currentMode].label}`;
                modeBtns.forEach(b => b.style.opacity = b.dataset.mode === currentMode ? '1' : '0.6');
            });
        });
    }


    // --- DAILY WATER TRACKER ---
    initWaterTracker() {
        const btn250 = document.getElementById('btn-add-water-250');
        const btn600 = document.getElementById('btn-add-water-600');
        const btnReset = document.getElementById('btn-reset-water');
        const progressBar = document.getElementById('water-progress-bar');
        const percentText = document.getElementById('water-percent');
        const mlLabel = document.getElementById('water-ml-label');
        const glassDisplay = document.getElementById('water-glass-display');

        if (!progressBar || !percentText || !mlLabel || !glassDisplay) return;

        const TARGET = 2000;
        let todayStr = new Date().toDateString();

        let savedDate = localStorage.getItem('siam_daily_water_date');
        let currentIntake = 0;

        if (savedDate === todayStr) {
            currentIntake = parseInt(localStorage.getItem('siam_daily_water_intake')) || 0;
        } else {
            localStorage.setItem('siam_daily_water_date', todayStr);
            localStorage.setItem('siam_daily_water_intake', '0');
        }

        const updateUI = () => {
            const percentage = Math.round((currentIntake / TARGET) * 100);
            percentText.textContent = `${percentage}%`;
            mlLabel.textContent = `${currentIntake} / ${TARGET} มล.`;

            const cappedPercent = Math.min(100, percentage);
            const offset = 314.16 - (cappedPercent / 100) * 314.16;
            progressBar.style.strokeDashoffset = offset;

            glassDisplay.innerHTML = '';
            const totalGlasses = 8;
            const filledGlasses = Math.min(totalGlasses, Math.floor(currentIntake / 250));
            
            for (let i = 0; i < totalGlasses; i++) {
                const icon = document.createElement('i');
                icon.setAttribute('data-lucide', 'glass-water');
                if (i < filledGlasses) {
                    icon.classList.add('filled');
                }
                glassDisplay.appendChild(icon);
            }

            if (window.lucide) {
                window.lucide.createIcons();
            }
        };

        const addWater = (amount) => {
            currentIntake += amount;
            localStorage.setItem('siam_daily_water_intake', currentIntake.toString());
            updateUI();
        };

        if (btn250) btn250.addEventListener('click', () => addWater(250));
        if (btn600) btn600.addEventListener('click', () => addWater(600));
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (confirm('คุณต้องการรีเซ็ตการดื่มน้ำวันนี้ใช่หรือไม่?')) {
                    currentIntake = 0;
                    localStorage.setItem('siam_daily_water_intake', '0');
                    updateUI();
                }
            });
        }

        updateUI();
    }



    // --- BMR/TDEE & BMI CALCULATOR ---
    initHealthCalculator() {
        const btnCalc = document.getElementById('btn-calc-health');
        const weightInput = document.getElementById('health-weight');
        const heightInput = document.getElementById('health-height');
        const ageInput = document.getElementById('health-age');
        const genderSelect = document.getElementById('health-gender');
        const activitySelect = document.getElementById('health-activity');

        const resultsDiv = document.getElementById('health-results');
        const resBmi = document.getElementById('health-res-bmi');
        const resBmiStatus = document.getElementById('health-res-bmi-status');
        const bmiIndicator = document.getElementById('health-bmi-indicator');
        const resBmr = document.getElementById('health-res-bmr');
        const resTdee = document.getElementById('health-res-tdee');

        if (!btnCalc || !weightInput || !heightInput || !ageInput || !genderSelect || !activitySelect || !resultsDiv) return;

        btnCalc.addEventListener('click', () => {
            const weight = parseFloat(weightInput.value);
            const height = parseFloat(heightInput.value);
            const age = parseFloat(ageInput.value);
            const gender = genderSelect.value;
            const activity = parseFloat(activitySelect.value);

            if (isNaN(weight) || isNaN(height) || isNaN(age) || weight <= 0 || height <= 0 || age <= 0) {
                alert('กรุณากรอกข้อมูลตัวเลขน้ำหนัก ส่วนสูง และอายุให้ถูกต้องค่ะ');
                return;
            }

            const heightM = height / 100;
            const bmi = weight / (heightM * heightM);

            let bmr = 0;
            if (gender === 'male') {
                bmr = 10 * weight + 6.25 * height - 5 * age + 5;
            } else {
                bmr = 10 * weight + 6.25 * height - 5 * age - 161;
            }

            const tdee = bmr * activity;

            let statusText = '';
            let statusClass = '';
            let indicatorBg = '';

            if (bmi < 18.5) {
                statusText = 'ผอม / น้ำหนักน้อยเกินไป';
                statusClass = 'text-cyan';
                indicatorBg = 'var(--accent-cyan)';
            } else if (bmi >= 18.5 && bmi < 23) {
                statusText = 'สมส่วน / น้ำหนักปกติ (สุขภาพดี)';
                statusClass = 'text-green';
                indicatorBg = 'var(--accent-green)';
            } else if (bmi >= 23 && bmi < 25) {
                statusText = 'น้ำหนักเกิน (ท้วม)';
                statusClass = 'text-orange';
                indicatorBg = 'var(--accent-orange)';
            } else if (bmi >= 25 && bmi < 30) {
                statusText = 'อ้วน / โรคอ้วนระดับ 1';
                statusClass = 'text-red';
                indicatorBg = 'var(--accent-red)';
            } else {
                statusText = 'อ้วนมาก / โรคอ้วนอันตรายระดับ 2';
                statusClass = 'text-red';
                indicatorBg = '#b91c1c';
            }

            resBmi.textContent = bmi.toFixed(1);
            resBmi.className = statusClass;
            resBmiStatus.textContent = statusText;
            resBmiStatus.className = statusClass;

            resBmr.textContent = `${Math.round(bmr).toLocaleString()} kcal`;
            resTdee.textContent = `${Math.round(tdee).toLocaleString()} kcal`;
            resTdee.className = statusClass;

            const percent = Math.max(0, Math.min(100, ((bmi - 15) / 20) * 100));
            bmiIndicator.style.width = `${percent}%`;
            bmiIndicator.style.backgroundColor = indicatorBg;

            resultsDiv.style.display = 'block';
        });
    }





    // --- BREATHING GUIDE ---
    initBreathingGuide() {
        const btnToggle = document.getElementById('btn-toggle-breathing');
        const breathingBall = document.getElementById('breathing-ball');
        const insideText = document.getElementById('breathing-inside-text');
        const tipText = document.getElementById('breathing-tip');

        if (!btnToggle || !breathingBall || !insideText || !tipText) return;

        let breathingInterval = null;
        let isBreathing = false;
        let step = 0;

        const runBreathingCycle = () => {
            if (step === 0) {
                breathingBall.className = '';
                breathingBall.classList.add('inhale');
                insideText.textContent = 'หายใจเข้า';
                tipText.textContent = 'สูดลมหายใจเข้าช้าๆ... (4 วินาที)';
            } else if (step === 1) {
                insideText.textContent = 'กลั้นหายใจ';
                tipText.textContent = 'กลั้นลมหายใจของคุณไว้... (4 วินาที)';
            } else if (step === 2) {
                breathingBall.className = '';
                breathingBall.classList.add('exhale');
                insideText.textContent = 'หายใจออก';
                tipText.textContent = 'ผ่อนลมหายใจออกช้าๆ... (4 วินาที)';
            } else if (step === 3) {
                insideText.textContent = 'กลั้นหายใจ';
                tipText.textContent = 'กลั้นลมหายใจของคุณไว้... (4 วินาที)';
            }

            step = (step + 1) % 4;
        };

        btnToggle.addEventListener('click', () => {
            if (isBreathing) {
                clearInterval(breathingInterval);
                breathingInterval = null;
                isBreathing = false;
                
                breathingBall.className = '';
                insideText.textContent = 'หายใจเข้า';
                tipText.textContent = 'ฝึกสมาธิ Box Breathing 4-4-4';
                btnToggle.innerHTML = '<i data-lucide="play" style="display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:2px"></i> เริ่มต้นฝึกหายใจ';
            } else {
                isBreathing = true;
                step = 0;
                runBreathingCycle();
                breathingInterval = setInterval(runBreathingCycle, 4000);
                
                btnToggle.innerHTML = '<i data-lucide="square" style="display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:2px"></i> หยุดฝึกหายใจ';
            }
            if (window.lucide) window.lucide.createIcons();
        });
    }

    // --- HABIT TRACKER SERVICE ---
    initHabitTracker() {
        const habitSelect = document.getElementById('habit-select');
        const btnComplete = document.getElementById('btn-habit-complete-today');
        const gridContainer = document.getElementById('habit-grid');
        const streakText = document.getElementById('habit-streak-count');

        if (!gridContainer || !habitSelect || !btnComplete) return;

        // Load habits from localStorage
        let habits = {};
        const saved = localStorage.getItem('siam_daily_habits');
        if (saved) {
            try {
                habits = JSON.parse(saved);
            } catch(e) {
                console.error('Failed to parse habits data', e);
            }
        }

        const getHabitDates = (key) => habits[key] || [];

        const saveHabits = () => {
            localStorage.setItem('siam_daily_habits', JSON.stringify(habits));
            // Trigger global sync if user is logged in
            if (window.appCoordinator && typeof window.appCoordinator.syncDataToCloud === 'function') {
                window.appCoordinator.syncDataToCloud();
            }
        };

        const renderGrid = () => {
            gridContainer.innerHTML = '';
            const selectedHabit = habitSelect.value;
            const completedDates = getHabitDates(selectedHabit);
            
            // Generate last 105 days ending at today
            const totalCells = 105;
            let streakCount = 0;

            for (let i = 0; i < totalCells; i++) {
                const dayOffset = (totalCells - 1) - i;
                const d = new Date();
                d.setDate(d.getDate() - dayOffset);
                const dateStr = d.toISOString().slice(0, 10);
                
                const cell = document.createElement('div');
                const isCompleted = completedDates.includes(dateStr);
                
                cell.className = 'habit-cell';
                cell.style.cssText = `
                    width: 12px;
                    height: 12px;
                    border-radius: 2px;
                    cursor: pointer;
                    transition: background 0.2s, box-shadow 0.2s;
                    background: ${isCompleted ? 'var(--accent-green)' : 'rgba(255,255,255,0.05)'};
                    box-shadow: ${isCompleted ? '0 0 6px rgba(16, 185, 129, 0.5)' : 'none'};
                `;
                
                // Formulate tooltip
                const localDateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                cell.title = `${localDateStr}: ${isCompleted ? 'สำเร็จแล้ว' : 'ยังไม่ได้บันทึก'}`;
                
                // Keep track of how many completions in the last 105 days
                if (isCompleted) {
                    streakCount++;
                }

                // Click to toggle cell completion
                cell.addEventListener('click', () => {
                    const currentDates = getHabitDates(selectedHabit);
                    const idx = currentDates.indexOf(dateStr);
                    if (idx > -1) {
                        currentDates.splice(idx, 1);
                    } else {
                        currentDates.push(dateStr);
                    }
                    habits[selectedHabit] = currentDates;
                    saveHabits();
                    renderGrid();
                });

                gridContainer.appendChild(cell);
            }

            if (streakText) {
                streakText.textContent = streakCount;
            }
        };

        // Event listener for dropdown changes
        habitSelect.addEventListener('change', renderGrid);

        // Click handler to complete today's habit
        btnComplete.addEventListener('click', () => {
            const selectedHabit = habitSelect.value;
            const completedDates = getHabitDates(selectedHabit);
            const todayStr = new Date().toISOString().slice(0, 10);

            if (!completedDates.includes(todayStr)) {
                completedDates.push(todayStr);
                habits[selectedHabit] = completedDates;
                saveHabits();
                renderGrid();
            } else {
                alert('คุณได้บันทึกนิสัยนี้สำหรับวันนี้เรียบร้อยแล้วค่ะ!');
            }
        });

        // Initial render
        renderGrid();
    }

    // --- BINAURAL BEATS GENERATOR ---
    initBinauralBeats() {
        const selectPreset = document.getElementById('binaural-preset-select');
        const freqLeftEl = document.getElementById('binaural-freq-left');
        const freqRightEl = document.getElementById('binaural-freq-right');
        const beatLabelEl = document.getElementById('binaural-beat-label');
        const volumeInput = document.getElementById('binaural-volume');
        const volumeDisplay = document.getElementById('binaural-volume-display');
        const btnPlay = document.getElementById('btn-binaural-play');
        const statusText = document.getElementById('binaural-status-text');
        const waveBg = document.getElementById('binaural-wave-bg');

        if (!selectPreset || !freqLeftEl || !freqRightEl || !btnPlay) return;

        // Add dynamic CSS styles to document head for wave animation
        if (!document.getElementById('binaural-wave-style')) {
            const style = document.createElement('style');
            style.id = 'binaural-wave-style';
            style.textContent = `
                @keyframes binauralWave {
                    0%, 100% { transform: scaleY(0.3); }
                    50% { transform: scaleY(1.3); }
                }
                .binaural-bar-active {
                    animation: binauralWave 1.0s ease-in-out infinite;
                }
            `;
            document.head.appendChild(style);
        }

        const presets = {
            alpha: { left: 200, right: 210, beat: 10, name: 'Alpha', typeName: 'Alpha Wave (10Hz) - โหมดโฟกัส' },
            theta: { left: 150, right: 156, beat: 6, name: 'Theta', typeName: 'Theta Wave (6Hz) - นั่งสมาธิลึก' },
            beta: { left: 250, right: 270, beat: 20, name: 'Beta', typeName: 'Beta Wave (20Hz) - ตื่นตัวและจดจ่อ' },
            delta: { left: 100, right: 102.5, beat: 2.5, name: 'Delta', typeName: 'Delta Wave (2.5Hz) - พักผ่อนลึก' },
            'solfeggio-528': { left: 528, right: 528, beat: 0, name: '528Hz', typeName: 'Solfeggio 528Hz - ความรักและการฟื้นฟู' },
            'solfeggio-432': { left: 432, right: 432, beat: 0, name: '432Hz', typeName: 'Solfeggio 432Hz - ความสงบจักรวาล' }
        };

        this.binauralPlaying = false;
        this.binauralAudioCtx = null;
        this.oscL = null;
        this.oscR = null;
        this.gainL = null;
        this.gainR = null;
        this.mainGain = null;
        this.merger = null;

        const updateReadout = () => {
            const preset = presets[selectPreset.value];
            freqLeftEl.textContent = `${preset.left} Hz`;
            freqRightEl.textContent = `${preset.right} Hz`;
            if (preset.beat > 0) {
                beatLabelEl.textContent = `Beat: ${preset.beat} Hz (${preset.name})`;
            } else {
                beatLabelEl.textContent = `${preset.name} (Pure Tone)`;
            }
        };

        const updateVolumeLabel = () => {
            // Display volume as a percentage of max (0.3)
            const percent = Math.round((parseFloat(volumeInput.value) / 0.3) * 100);
            volumeDisplay.textContent = `${percent}%`;
        };

        // Initialize delays for visualizer bars
        const bars = document.querySelectorAll('.binaural-bar');
        bars.forEach((bar, idx) => {
            bar.style.animationDelay = `${idx * 0.12}s`;
            bar.style.transformOrigin = 'center';
        });

        const startBinaural = () => {
            try {
                this.binauralAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
                this.merger = this.binauralAudioCtx.createChannelMerger(2);
                
                this.oscL = this.binauralAudioCtx.createOscillator();
                this.oscR = this.binauralAudioCtx.createOscillator();
                
                this.gainL = this.binauralAudioCtx.createGain();
                this.gainR = this.binauralAudioCtx.createGain();
                this.mainGain = this.binauralAudioCtx.createGain();

                // Connect left
                this.oscL.connect(this.gainL);
                this.gainL.connect(this.merger, 0, 0);

                // Connect right
                this.oscR.connect(this.gainR);
                this.gainR.connect(this.merger, 0, 1);

                // Merger to main gain
                this.merger.connect(this.mainGain);
                this.mainGain.connect(this.binauralAudioCtx.destination);

                // Configure frequencies
                const preset = presets[selectPreset.value];
                this.oscL.frequency.value = preset.left;
                this.oscR.frequency.value = preset.right;
                this.oscL.type = 'sine';
                this.oscR.type = 'sine';

                // Configure volume
                this.mainGain.gain.setValueAtTime(parseFloat(volumeInput.value), this.binauralAudioCtx.currentTime);

                this.oscL.start();
                this.oscR.start();
                this.binauralPlaying = true;

                // Update UI
                btnPlay.innerHTML = '<i data-lucide="square" style="width:14px; height:14px;"></i> หยุดเล่นคลื่นเสียง';
                btnPlay.style.background = 'var(--accent-red)';
                btnPlay.style.borderColor = 'var(--accent-red)';
                statusText.textContent = `⚡ กำลังเล่น: ${preset.typeName}`;
                statusText.style.color = 'var(--accent-purple)';
                
                bars.forEach(bar => bar.classList.add('binaural-bar-active'));
                
                if (window.lucide) window.lucide.createIcons();
            } catch(e) {
                console.error('Binaural beats startup failed:', e);
                alert('เกิดข้อผิดพลาดในการเล่นเสียงบำบัดค่ะ');
            }
        };

        const stopBinaural = () => {
            if (this.oscL) {
                try { this.oscL.stop(); } catch(e) {}
                this.oscL.disconnect();
                this.oscL = null;
            }
            if (this.oscR) {
                try { this.oscR.stop(); } catch(e) {}
                this.oscR.disconnect();
                this.oscR = null;
            }
            if (this.binauralAudioCtx) {
                try { this.binauralAudioCtx.close(); } catch(e) {}
                this.binauralAudioCtx = null;
            }
            this.binauralPlaying = false;

            // Update UI
            btnPlay.innerHTML = '<i data-lucide="play" style="width:14px; height:14px;"></i> เล่นคลื่นเสียงบำบัด';
            btnPlay.style.background = '';
            btnPlay.style.borderColor = '';
            statusText.textContent = '🔊 ปิดเสียงอยู่';
            statusText.style.color = '';
            
            bars.forEach(bar => bar.classList.remove('binaural-bar-active'));
            
            if (window.lucide) window.lucide.createIcons();
        };

        btnPlay.addEventListener('click', () => {
            if (this.binauralPlaying) {
                stopBinaural();
            } else {
                startBinaural();
            }
        });

        selectPreset.addEventListener('change', () => {
            updateReadout();
            if (this.binauralPlaying) {
                const preset = presets[selectPreset.value];
                if (this.oscL && this.oscR && this.binauralAudioCtx) {
                    this.oscL.frequency.setValueAtTime(preset.left, this.binauralAudioCtx.currentTime);
                    this.oscR.frequency.setValueAtTime(preset.right, this.binauralAudioCtx.currentTime);
                    statusText.textContent = `⚡ กำลังเล่น: ${preset.typeName}`;
                }
            }
        });

        volumeInput.addEventListener('input', () => {
            updateVolumeLabel();
            if (this.binauralPlaying && this.mainGain && this.binauralAudioCtx) {
                this.mainGain.gain.setValueAtTime(parseFloat(volumeInput.value), this.binauralAudioCtx.currentTime);
            }
        });

        // Setup initial state
        updateReadout();
        updateVolumeLabel();
    }

    // --- POSTURE & EYE STRAIN REMINDER ---
    initPostureReminder() {
        const progressBar = document.getElementById('posture-progress-bar');
        const timerDisplay = document.getElementById('posture-timer-display');
        const stateLabel = document.getElementById('posture-state-label');
        const btnToggle = document.getElementById('btn-toggle-posture-timer');
        const btnReset = document.getElementById('btn-reset-posture-timer');
        const btnTest = document.getElementById('btn-test-posture-alert');

        if (!progressBar || !timerDisplay || !btnToggle || !btnReset) return;

        const WORK_TIME = 20 * 60; // 20 minutes
        const BREAK_TIME = 20;    // 20 seconds
        
        let timeLeft = WORK_TIME;
        let initialTime = WORK_TIME;
        let isRunning = false;
        let timerInterval = null;
        let mode = 'work'; // 'work' or 'break'

        const formatTime = (seconds) => {
            const m = Math.floor(seconds / 60).toString().padStart(2, '0');
            const s = (seconds % 60).toString().padStart(2, '0');
            return `${m}:${s}`;
        };

        const updateUI = () => {
            timerDisplay.textContent = formatTime(timeLeft);
            
            // Circular progress bar stroke-dashoffset logic
            // Circumference is 314.16
            const offset = 314.16 - (timeLeft / initialTime) * 314.16;
            progressBar.style.strokeDashoffset = offset;

            if (mode === 'work') {
                stateLabel.textContent = 'ทำงาน / โฟกัส';
                stateLabel.style.color = 'var(--text-muted)';
                progressBar.style.stroke = 'var(--accent-amber)';
                timerDisplay.style.color = 'var(--accent-amber)';
            } else {
                stateLabel.textContent = 'ยืดหลัง & มองไกล';
                stateLabel.style.color = 'var(--accent-green)';
                progressBar.style.stroke = 'var(--accent-green)';
                timerDisplay.style.color = 'var(--accent-green)';
            }
        };

        const playAlertSound = () => {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                let time = ctx.currentTime;
                // Double chime
                for (let i = 0; i < 2; i++) {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(660 + (i * 220), time + (i * 0.15));
                    
                    gain.gain.setValueAtTime(0, time + (i * 0.15));
                    gain.gain.linearRampToValueAtTime(0.25, time + (i * 0.15) + 0.04);
                    gain.gain.exponentialRampToValueAtTime(0.001, time + (i * 0.15) + 0.25);
                    
                    osc.start(time + (i * 0.15));
                    osc.stop(time + (i * 0.15) + 0.25);
                }
            } catch (err) {
                console.error('Audio alert failed:', err);
            }
        };

        const triggerNotification = () => {
            if (!("Notification" in window)) return;
            
            if (Notification.permission === "granted") {
                new Notification(mode === 'work' ? "ได้เวลาปรับสรีระและพักสายตา!" : "ได้เวลากลับมาโฟกัสงาน!", {
                    body: mode === 'work' 
                        ? "มองสิ่งที่อยู่ห่างออกไป 20 ฟุต เป็นเวลา 20 วินาที พร้อมทั้งยืดตัวตรงเพื่อสุขภาพที่ดีค่ะ" 
                        : "เสร็จสิ้นการพักแล้วค่ะ ขอให้มีสมาธิกับการทำงานต่ออย่างมีประสิทธิภาพนะ",
                    icon: "/assets/icons/icon-192.png"
                });
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission();
            }
        };

        const stopTimer = () => {
            clearInterval(timerInterval);
            timerInterval = null;
            isRunning = false;
            btnToggle.innerHTML = '<i data-lucide="play" style="width:12px; height:12px;"></i> เริ่มจับเวลา';
            btnToggle.style.background = '';
            btnToggle.style.borderColor = '';
            if (window.lucide) window.lucide.createIcons();
        };

        const startTimer = () => {
            if (isRunning) return;
            isRunning = true;
            btnToggle.innerHTML = '<i data-lucide="pause" style="width:12px; height:12px;"></i> หยุดชั่วคราว';
            btnToggle.style.background = 'var(--accent-red)';
            btnToggle.style.borderColor = 'var(--accent-red)';
            if (window.lucide) window.lucide.createIcons();

            // Request notification permission if not yet decided
            if ("Notification" in window && Notification.permission === "default") {
                Notification.requestPermission();
            }

            timerInterval = setInterval(() => {
                timeLeft--;
                updateUI();

                if (timeLeft <= 0) {
                    playAlertSound();
                    
                    if (mode === 'work') {
                        triggerNotification();
                        alert('🔔 ครบ 20 นาทีแล้ว! ยืดหลังตรง สูดหายใจลึกๆ และพักสายตามองสิ่งที่อยู่ไกลๆ 20 วินาทีนะคะ');
                        mode = 'break';
                        timeLeft = BREAK_TIME;
                        initialTime = BREAK_TIME;
                    } else {
                        triggerNotification();
                        alert('⏰ พักเสร็จสิ้นแล้ว! ยืดหลังตัวตรงแล้วโฟกัสกับงานต่อได้เลยค่ะ');
                        mode = 'work';
                        timeLeft = WORK_TIME;
                        initialTime = WORK_TIME;
                    }
                    updateUI();
                }
            }, 1000);
        };

        btnToggle.addEventListener('click', () => {
            if (isRunning) {
                stopTimer();
            } else {
                startTimer();
            }
        });

        btnReset.addEventListener('click', () => {
            stopTimer();
            mode = 'work';
            timeLeft = WORK_TIME;
            initialTime = WORK_TIME;
            updateUI();
        });

        if (btnTest) {
            btnTest.addEventListener('click', (e) => {
                e.preventDefault();
                playAlertSound();
                alert('🔊 ทดสอบระบบเสียงแจ้งเตือนปรับสรีระ / พักสายตา สำเร็จ!');
            });
        }

        updateUI();
    }

}

window.healthService = new HealthService();
