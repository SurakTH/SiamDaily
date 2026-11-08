class AmbientService {
    constructor() {
        this.init();
    }

    init() {
        this.initRadioPlayer();
        this.initAmbientMixer();
        this.initAudioVisualizer();
    }





    // --- RADIO PLAYER SERVICE ---
    initRadioPlayer() {
        const audio = document.getElementById('radio-audio-element');
        
        // Sidebar controls
        const selectSidebar = document.getElementById('radio-station-select');
        const btnPlaySidebar = document.getElementById('btn-radio-play');
        const playIconSidebar = document.getElementById('radio-play-icon');
        const stationNameSidebar = document.getElementById('radio-station-name');
        const statusSidebar = document.getElementById('radio-status');
        const liveBadgeSidebar = document.getElementById('radio-live-badge');
        const visualizerSidebar = document.getElementById('radio-visualizer');
        const volumeSliderSidebar = document.getElementById('radio-volume-slider');
        const btnMuteSidebar = document.getElementById('btn-radio-mute');
        const volumeIconSidebar = document.getElementById('radio-volume-icon');
        const volumeLabelSidebar = document.getElementById('radio-volume-label');

        // Dashboard controls
        const selectDash = document.getElementById('dash-radio-station-select');
        const btnPlayDash = document.getElementById('dash-btn-radio-play');
        const playIconDash = document.getElementById('dash-radio-play-icon');
        const statusDash = document.getElementById('dash-radio-status');
        const visualizerDash = document.getElementById('dash-radio-visualizer');
        const volumeSliderDash = document.getElementById('dash-radio-volume-slider');
        const btnMuteDash = document.getElementById('dash-btn-radio-mute');
        const volumeIconDash = document.getElementById('dash-radio-volume-icon');
        const volumeLabelDash = document.getElementById('dash-radio-volume-label');

        if (!audio) return;

        let isPlaying = false;
        let isMuted = false;
        let lastVolume = 0.8;

        // Set initial volume (using whichever slider is available, default 0.8)
        const initialVol = volumeSliderSidebar ? parseFloat(volumeSliderSidebar.value) : (volumeSliderDash ? parseFloat(volumeSliderDash.value) : 0.8);
        audio.volume = initialVol;
        lastVolume = initialVol;

        // Helper to update play/pause state UI
        const updateUI = (state) => {
            if (state === 'playing') {
                isPlaying = true;
                
                // Play Icons
                if (playIconSidebar) playIconSidebar.setAttribute('data-lucide', 'pause');
                if (playIconDash) playIconDash.setAttribute('data-lucide', 'pause');
                
                // Status labels
                if (statusSidebar) statusSidebar.textContent = 'สถานะ: กำลังเล่นสด...';
                if (statusDash) statusDash.textContent = 'สถานะ: กำลังเล่นสด...';
                
                // Badges and visualizers
                if (liveBadgeSidebar) liveBadgeSidebar.style.display = 'inline-block';
                if (visualizerSidebar) visualizerSidebar.classList.add('playing');
                if (visualizerDash) visualizerDash.classList.add('playing');
            } else if (state === 'loading') {
                if (statusSidebar) statusSidebar.textContent = 'สถานะ: กำลังเชื่อมต่อ...';
                if (statusDash) statusDash.textContent = 'สถานะ: กำลังเชื่อมต่อ...';
                
                if (visualizerSidebar) visualizerSidebar.classList.remove('playing');
                if (visualizerDash) visualizerDash.classList.remove('playing');
            } else {
                isPlaying = false;
                
                // Play Icons
                if (playIconSidebar) playIconSidebar.setAttribute('data-lucide', 'play');
                if (playIconDash) playIconDash.setAttribute('data-lucide', 'play');
                
                // Status labels
                if (statusSidebar) statusSidebar.textContent = 'สถานะ: หยุดการทำงาน';
                if (statusDash) statusDash.textContent = 'สถานะ: ปิดอยู่';
                
                // Badges and visualizers
                if (liveBadgeSidebar) liveBadgeSidebar.style.display = 'none';
                if (visualizerSidebar) visualizerSidebar.classList.remove('playing');
                if (visualizerDash) visualizerDash.classList.remove('playing');
            }
            if (window.lucide) window.lucide.createIcons();
        };

        // Helper to synchronize select inputs
        const syncStationSelect = (value) => {
            if (selectSidebar && selectSidebar.value !== value) {
                selectSidebar.value = value;
            }
            if (selectDash && selectDash.value !== value) {
                selectDash.value = value;
            }
            // Update station name text if element exists
            const activeSelect = selectSidebar || selectDash;
            if (activeSelect && stationNameSidebar) {
                const selectedOption = activeSelect.options[activeSelect.selectedIndex];
                stationNameSidebar.textContent = selectedOption.text.split(' (')[0];
            }
        };

        // Play action
        const togglePlay = () => {
            if (isPlaying) {
                audio.pause();
                audio.src = ''; // Clear source to stop download buffer
                updateUI('stopped');
            } else {
                updateUI('loading');
                const activeSelect = selectSidebar || selectDash;
                if (activeSelect) {
                    audio.src = activeSelect.value;
                    audio.load();
                    audio.play()
                        .then(() => {
                            updateUI('playing');
                        })
                        .catch((err) => {
                            console.error('Radio play error:', err);
                            updateUI('stopped');
                            if (statusSidebar) statusSidebar.textContent = 'สถานะ: เชื่อมต่อล้มเหลว';
                            if (statusDash) statusDash.textContent = 'สถานะ: เชื่อมต่อล้มเหลว';
                        });
                }
            }
        };

        // Bind Play/Pause events
        if (btnPlaySidebar) btnPlaySidebar.addEventListener('click', togglePlay);
        if (btnPlayDash) btnPlayDash.addEventListener('click', togglePlay);

        // Bind Station select changes
        const handleStationChange = (e) => {
            const val = e.target.value;
            syncStationSelect(val);
            
            if (isPlaying) {
                audio.pause();
                updateUI('loading');
                audio.src = val;
                audio.load();
                audio.play()
                    .then(() => {
                        updateUI('playing');
                    })
                    .catch((err) => {
                        console.error('Radio change error:', err);
                        updateUI('stopped');
                        if (statusSidebar) statusSidebar.textContent = 'สถานะ: เชื่อมต่อล้มเหลว';
                        if (statusDash) statusDash.textContent = 'สถานะ: เชื่อมต่อล้มเหลว';
                    });
            } else {
                audio.src = val;
            }
        };

        if (selectSidebar) selectSidebar.addEventListener('change', handleStationChange);
        if (selectDash) selectDash.addEventListener('change', handleStationChange);

        // Audio state listeners
        audio.addEventListener('waiting', () => {
            if (isPlaying) updateUI('loading');
        });
        audio.addEventListener('playing', () => {
            updateUI('playing');
        });

        // Helper to update volume UI across all controls
        const updateVolumeUI = (vol) => {
            audio.volume = vol;
            
            // Sync sliders
            if (volumeSliderSidebar) volumeSliderSidebar.value = vol;
            if (volumeSliderDash) volumeSliderDash.value = vol;
            
            // Sync labels
            const percentStr = `${Math.round(vol * 100)}%`;
            if (volumeLabelSidebar) volumeLabelSidebar.textContent = percentStr;
            if (volumeLabelDash) volumeLabelDash.textContent = percentStr;
            
            // Sync icons & mute states
            if (vol === 0) {
                isMuted = true;
                if (volumeIconSidebar) volumeIconSidebar.setAttribute('data-lucide', 'volume-x');
                if (volumeIconDash) volumeIconDash.setAttribute('data-lucide', 'volume-x');
            } else {
                isMuted = false;
                lastVolume = vol;
                const iconName = vol < 0.4 ? 'volume-1' : 'volume-2';
                if (volumeIconSidebar) volumeIconSidebar.setAttribute('data-lucide', iconName);
                if (volumeIconDash) volumeIconDash.setAttribute('data-lucide', iconName);
            }
            if (window.lucide) window.lucide.createIcons();
        };

        // Bind Volume slider changes
        const handleVolumeInput = (e) => {
            updateVolumeUI(parseFloat(e.target.value));
        };

        if (volumeSliderSidebar) volumeSliderSidebar.addEventListener('input', handleVolumeInput);
        if (volumeSliderDash) volumeSliderDash.addEventListener('input', handleVolumeInput);

        // Bind Mute toggle events
        const toggleMute = () => {
            if (isMuted) {
                updateVolumeUI(lastVolume);
            } else {
                isMuted = true;
                lastVolume = audio.volume > 0 ? audio.volume : 0.8;
                updateVolumeUI(0);
            }
        };

        if (btnMuteSidebar) btnMuteSidebar.addEventListener('click', toggleMute);
        if (btnMuteDash) btnMuteDash.addEventListener('click', toggleMute);
    }





    // --- FOCUS AMBIENT SOUND MIXER ---
    initAmbientMixer() {
        const sliders = document.querySelectorAll('.ambient-slider');
        const btnStop = document.getElementById('btn-stop-all-ambient');

        if (sliders.length === 0 || !btnStop) return;

        const urls = {
            rain: 'https://actions.google.com/sounds/v1/weather/light_rain.ogg',
            waves: 'https://actions.google.com/sounds/v1/water/ocean_waves_crashing.ogg',
            forest: 'https://actions.google.com/sounds/v1/ambiences/spring_day_forest.ogg',
            cafe: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg'
        };

        this.ambientSounds = {
            rain: null,
            waves: null,
            forest: null,
            cafe: null
        };

        const updateSound = (soundKey, volume) => {
            let audio = this.ambientSounds[soundKey];
            if (!audio) {
                audio = new Audio(urls[soundKey]);
                audio.loop = true;
                this.ambientSounds[soundKey] = audio;
            }
            
            audio.volume = volume;
            if (volume > 0) {
                if (audio.paused) {
                    audio.play().catch(err => {
                        console.warn('Autoplay prevented. Audio will play upon interaction.', err);
                    });
                }
            } else {
                audio.pause();
            }
        };

        sliders.forEach(slider => {
            slider.addEventListener('input', () => {
                const soundKey = slider.getAttribute('data-sound');
                const volume = parseFloat(slider.value);
                updateSound(soundKey, volume);
            });
        });

        btnStop.addEventListener('click', () => {
            sliders.forEach(slider => {
                slider.value = 0;
                const soundKey = slider.getAttribute('data-sound');
                updateSound(soundKey, 0);
            });
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            if (timerSelect) timerSelect.value = '0';
            if (timerCountdown) timerCountdown.style.display = 'none';
        });

        // Sleep Timer Logic
        const timerSelect = document.getElementById('ambient-timer-select');
        const timerCountdown = document.getElementById('ambient-timer-countdown');
        let timerInterval = null;

        if (timerSelect && timerCountdown) {
            timerSelect.addEventListener('change', () => {
                const minutes = parseInt(timerSelect.value, 10);
                
                // Clear existing timer
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }

                if (minutes === 0) {
                    timerCountdown.style.display = 'none';
                    return;
                }

                let totalSeconds = minutes * 60;
                timerCountdown.style.display = 'inline-block';
                
                const updateCountdown = () => {
                    const m = Math.floor(totalSeconds / 60);
                    const s = totalSeconds % 60;
                    timerCountdown.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                };

                updateCountdown();

                timerInterval = setInterval(() => {
                    totalSeconds--;
                    if (totalSeconds < 0) {
                        clearInterval(timerInterval);
                        timerInterval = null;
                        timerCountdown.style.display = 'none';
                        timerSelect.value = '0';
                        
                        // Stop all sounds
                        sliders.forEach(slider => {
                            slider.value = 0;
                            const soundKey = slider.getAttribute('data-sound');
                            updateSound(soundKey, 0);
                        });
                        alert('หมดเวลาสำหรับเสียงธรรมชาติบำบัดแล้วค่ะ ระบบจะปิดเสียงให้อัตโนมัติค่ะ');
                    } else {
                        updateCountdown();
                    }
                }, 1000);
            });
        }
    }

    // --- WEB AUDIO VISUALIZER ---
    initAudioVisualizer() {
        const audio = document.getElementById('radio-audio-element');
        const canvas = document.getElementById('radio-visualizer-canvas');
        if (!audio || !canvas) return;

        const ctx = canvas.getContext('2d');
        let animationFrameId = null;

        const setupAudioContext = () => {
            if (this.audioCtx) return;
            try {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                this.analyser = this.audioCtx.createAnalyser();
                this.analyser.fftSize = 64;
                
                audio.crossOrigin = "anonymous";
                
                this.audioSource = this.audioCtx.createMediaElementSource(audio);
                this.audioSource.connect(this.analyser);
                this.analyser.connect(this.audioCtx.destination);
            } catch (e) {
                console.error('Failed to initialize Web Audio context:', e);
            }
        };

        const draw = () => {
            if (!this.analyser || !this.audioCtx) return;
            animationFrameId = requestAnimationFrame(draw);
            
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            if (canvas.clientWidth === 0) return;

            if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
            }

            const width = canvas.width;
            const height = canvas.height;

            const bufferLength = this.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            this.analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, width, height);

            const barWidth = (width / bufferLength) * 1.6;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * height * 0.85;

                const percent = i / bufferLength;
                const r = Math.round(236 - (percent * (236 - 6)));
                const g = Math.round(72 + (percent * (182 - 72)));
                const b = Math.round(153 + (percent * (212 - 153)));
                
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
                ctx.shadowBlur = 5;

                const y = height - barHeight;
                ctx.beginPath();
                if (typeof ctx.roundRect === 'function') {
                    ctx.roundRect(x, y, barWidth - 3, barHeight, [4, 4, 0, 0]);
                } else {
                    ctx.rect(x, y, barWidth - 3, barHeight);
                }
                ctx.fill();

                x += barWidth;
            }
            ctx.shadowBlur = 0;
        };

        const startVisualizer = () => {
            setupAudioContext();
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            draw();
        };

        const stopVisualizer = () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };

        audio.addEventListener('play', () => {
            startVisualizer();
        });
        audio.addEventListener('pause', () => {
            stopVisualizer();
        });
        audio.addEventListener('emptied', () => {
            stopVisualizer();
        });

        if (!audio.paused) {
            startVisualizer();
        }
    }

}

window.ambientService = new AmbientService();
