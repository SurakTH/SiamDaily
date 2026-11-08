// Weather & Air Quality Component using Open-Meteo Free API

class WeatherService {
    constructor() {
        this.currentLat = 13.7946; // Default: Mahidol University Salaya
        this.currentLng = 100.3242;
        this.hourlyChart = null;
        this.currentRainChance = 0;
        this.currentPM25 = 0;
        this.init();
    }

    /**
     * Initializes the service and binds necessary DOM events.
     */
    init() {
        const refreshBtn = document.getElementById('btn-refresh-weather');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.disabled = true;
                const icon = refreshBtn.querySelector('i');
                if (icon) {
                    icon.style.transition = 'transform 1s ease';
                    icon.style.transform = 'rotate(360deg)';
                }
                try {
                    await this.fetchAndRenderAll();
                } catch (err) {
                    console.error('Manual weather refresh failed:', err);
                } finally {
                    setTimeout(() => {
                        refreshBtn.disabled = false;
                        if (icon) {
                            icon.style.transition = 'none';
                            icon.style.transform = 'rotate(0deg)';
                        }
                    }, 1000);
                }
            });
        }

        // Weather Map Selector listeners
        const mapSelectors = document.querySelectorAll('#weather-map-selectors button');
        const mapIframe = document.getElementById('weather-map-iframe');
        if (mapSelectors.length > 0 && mapIframe) {
            mapSelectors.forEach(btn => {
                btn.addEventListener('click', () => {
                    mapSelectors.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const overlay = btn.getAttribute('data-map-overlay');
                    
                    let url = '';
                    if (overlay === 'pm25') {
                        url = `https://embed.windy.com/embed2.html?lat=${this.currentLat}&lon=${this.currentLng}&zoom=6&level=surface&overlay=pm25&product=cams&menu=&message=&marker=&calendar=now&forecast=12&location=coordinates&type=map&metricWind=default&metricTemp=default`;
                    } else {
                        url = `https://embed.windy.com/embed2.html?lat=${this.currentLat}&lon=${this.currentLng}&zoom=6&level=surface&overlay=${overlay}&product=${overlay === 'radar' ? 'radar' : 'wind'}&menu=&message=&marker=&calendar=now&forecast=12&location=coordinates&type=map&metricWind=default&metricTemp=default`;
                    }
                    mapIframe.src = url;
                });
            });
        }
    }

    // Weather Code (WMO) mapper to Icon & Thai description
    /**
     * Maps WMO weather codes to human-readable descriptions and Lucide icons.
     * @param {any} code
     */
    getWeatherDescription(code) {
        const mapping = {
            0: { desc: 'ท้องฟ้าแจ่มใส', icon: 'sun', color: 'text-amber' },
            1: { desc: 'ท้องฟ้าโปร่ง', icon: 'sun-dim', color: 'text-amber' },
            2: { desc: 'มีเมฆบางส่วน', icon: 'cloud-sun', color: 'text-cyan' },
            3: { desc: 'เมฆครึ้ม', icon: 'cloud', color: 'text-muted' },
            45: { desc: 'หมอกหนา', icon: 'cloud-fog', color: 'text-muted' },
            48: { desc: 'มีหมอกน้ำค้างแข็ง', icon: 'cloud-fog', color: 'text-muted' },
            51: { desc: 'ฝนละอองเบาบาง', icon: 'cloud-drizzle', color: 'text-blue' },
            53: { desc: 'ฝนละอองปานกลาง', icon: 'cloud-drizzle', color: 'text-blue' },
            55: { desc: 'ฝนละอองหนาแน่น', icon: 'cloud-drizzle', color: 'text-blue' },
            61: { desc: 'ฝนตกเล็กน้อย', icon: 'cloud-rain', color: 'text-blue' },
            63: { desc: 'ฝนตกปานกลาง', icon: 'cloud-rain', color: 'text-blue' },
            65: { desc: 'ฝนตกหนัก', icon: 'cloud-rain', color: 'text-blue' },
            80: { desc: 'ฝนตกไล่ช้างเบาบาง', icon: 'cloud-rain', color: 'text-blue' },
            81: { desc: 'ฝนตกไล่ช้างปานกลาง', icon: 'cloud-rain', color: 'text-blue' },
            82: { desc: 'ฝนตกไล่ช้างรุนแรง', icon: 'cloud-rain', color: 'text-blue' },
            95: { desc: 'พายุฝนฟ้าคะนอง', icon: 'cloud-lightning', color: 'text-purple' },
            96: { desc: 'พายุฝนฟ้าคะนองร่วมกับลูกเห็บตกเล็กน้อย', icon: 'cloud-lightning', color: 'text-purple' },
            99: { desc: 'พายุฝนฟ้าคะนองร่วมกับลูกเห็บตกหนัก', icon: 'cloud-lightning', color: 'text-purple' }
        };
        return mapping[code] || { desc: 'สภาพอากาศแปรปรวน', icon: 'cloud-sun', color: 'text-cyan' };
    }

    // AQI PM2.5 rating system (Thai Standard)
    /**
     * Determines AQI status, color, and health advice based on PM2.5 levels.
     * @param {any} pm25
     */
    getAQIStatus(pm25) {
        if (pm25 <= 15.0) {
            return {
                status: 'ดีมาก (Excellent)',
                class: 'status-good',
                color: '#10b981',
                advice: 'คุณภาพอากาศดีมาก เหมาะแก่การทำกิจกรรมกลางแจ้งและการท่องเที่ยวพักผ่อน'
            };
        } else if (pm25 <= 25.0) {
            return {
                status: 'ดี (Good)',
                class: 'status-good',
                color: '#34d399',
                advice: 'คุณภาพอากาศดี ประชาชนทั่วไปสามารถทำกิจกรรมกลางแจ้งได้ตามปกติ'
            };
        } else if (pm25 <= 37.5) {
            return {
                status: 'ปานกลาง (Moderate)',
                class: 'status-moderate',
                color: '#f59e0b',
                advice: 'ประชาชนทั่วไปสามารถทำกิจกรรมกลางแจ้งได้ กลุ่มเสี่ยงควรสังเกตอาการผิดปกติ'
            };
        } else if (pm25 <= 75.0) {
            return {
                status: 'เริ่มมีผลต่อสุขภาพ (Unhealthy for Sensitive)',
                class: 'status-unhealthy-sensitive',
                color: '#f97316',
                advice: 'กลุ่มเสี่ยงควรลดระยะเวลาทำกิจกรรมกลางแจ้ง ประชาชนทั่วไปควรใช้อุปกรณ์ป้องกันฝุ่น'
            };
        } else {
            return {
                status: 'มีผลต่อสุขภาพ (Hazardous)',
                class: 'status-unhealthy',
                color: '#ef4444',
                advice: 'ทุกคนควรหลีกเลี่ยงกิจกรรมกลางแจ้ง สวมหน้ากากอนามัยป้องกัน PM2.5 ตลอดเวลา'
            };
        }
    }

    /**
     * Executes the updateCoordinates operation.
     * @param {any} lat
     * @param {any} lng
     */
    async updateCoordinates(lat, lng) {
        this.currentLat = parseFloat(lat);
        this.currentLng = parseFloat(lng);
        await this.fetchAndRenderAll();

        // Update weather map if active
        const activeBtn = document.querySelector('#weather-map-selectors button.active');
        const mapIframe = document.getElementById('weather-map-iframe');
        if (activeBtn && mapIframe) {
            const overlay = activeBtn.getAttribute('data-map-overlay');
            let url = '';
            if (overlay === 'pm25') {
                url = `https://embed.windy.com/embed2.html?lat=${this.currentLat}&lon=${this.currentLng}&zoom=6&level=surface&overlay=pm25&product=cams&menu=&message=&marker=&calendar=now&forecast=12&location=coordinates&type=map&metricWind=default&metricTemp=default`;
            } else {
                url = `https://embed.windy.com/embed2.html?lat=${this.currentLat}&lon=${this.currentLng}&zoom=6&level=surface&overlay=${overlay}&product=${overlay === 'radar' ? 'radar' : 'wind'}&menu=&message=&marker=&calendar=now&forecast=12&location=coordinates&type=map&metricWind=default&metricTemp=default`;
            }
            mapIframe.src = url;
        }
    }

    /**
     * Fetches all required data and triggers rendering methods.
     */
    async fetchAndRenderAll() {
        try {
            await Promise.all([
                this.fetchWeatherData(),
                this.fetchAirQualityData()
            ]);
        } catch (error) {
            console.error('Error fetching meteorological data:', error);
        }
    }

    /**
     * Executes the fetchWeatherData operation.
     */
    async fetchWeatherData() {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${this.currentLat}&longitude=${this.currentLng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max&timezone=Asia%2FBangkok&_cb=${Date.now()}`;
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error('Weather API fetch failed');
            const data = await response.json();
            
            this.hourlyDataCache = data;
            this.renderCurrentWeather(data);
            this.renderHourlyForecast(data);
            this.render7DaysForecast(data);
        } catch (error) {
            console.warn('Weather API failed, using fallback mock data:', error);
            // Fallback Data
            const fallbackData = {
                current: { time: new Date().toISOString(), temperature_2m: 32, relative_humidity_2m: 65, weather_code: 2, wind_speed_10m: 12 },
                daily: { 
                    temperature_2m_max: [34, 35, 33, 34, 35, 34, 33], 
                    temperature_2m_min: [26, 27, 25, 26, 27, 26, 25], 
                    uv_index_max: [8, 9, 7, 8, 9, 8, 7], 
                    precipitation_probability_max: [20, 10, 60, 40, 10, 20, 50],
                    weather_code: [2, 1, 61, 3, 2, 2, 51]
                },
                hourly: {
                    time: Array.from({length: 24}, (_, i) => {
                        let d = new Date(); d.setHours(d.getHours() + i); 
                        return d.toISOString().substring(0, 14) + "00";
                    }),
                    temperature_2m: Array.from({length: 24}, () => 30 + Math.random() * 5),
                    weather_code: Array.from({length: 24}, () => 2)
                }
            };
            this.renderCurrentWeather(fallbackData);
            this.renderHourlyForecast(fallbackData);
            this.render7DaysForecast(fallbackData);
        }
    }

    /**
     * Executes the fetchAirQualityData operation.
     */
    async fetchAirQualityData() {
        const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${this.currentLat}&longitude=${this.currentLng}&current=pm2_5,pm10,ozone,nitrogen_dioxide&timezone=Asia%2FBangkok&_cb=${Date.now()}`;
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error('Air Quality API fetch failed');
            const data = await response.json();
            
            this.renderAirQuality(data);
        } catch (error) {
            console.warn('Air Quality API failed, using fallback mock data:', error);
            const fallbackData = {
                current: { pm2_5: 22.5, pm10: 45, ozone: 60, nitrogen_dioxide: 15 }
            };
            this.renderAirQuality(fallbackData);
        }
    }

    /**
     * Updates the DOM with the current weather conditions.
     * @param {any} data
     */
    renderCurrentWeather(data) {
        const current = data.current;
        const weatherInfo = this.getWeatherDescription(current.weather_code);
        
        // Update home dashboard elements
        const dashTemp = document.getElementById('dash-temp');
        const dashDesc = document.getElementById('dash-weather-desc');
        const dashRain = document.getElementById('dash-rain-chance');
        
        if (dashTemp) dashTemp.textContent = Math.round(current.temperature_2m);
        if (dashDesc) dashDesc.textContent = weatherInfo.desc;
        const rainChance = data.daily.precipitation_probability_max[0] || 0;
        this.currentRainChance = rainChance;
        if (dashRain) {
            dashRain.innerHTML = `<i data-lucide="droplet"></i> โอกาสฝนตกวันนี้: ${rainChance}%`;
        }
        this.checkWeatherAlerts();

        // Update detailed weather tab elements
        const detailTemp = document.getElementById('detail-temp');
        const detailDesc = document.getElementById('detail-weather-desc');
        const detailRange = document.getElementById('detail-temp-range');
        const humidity = document.getElementById('weather-humidity');
        const windspeed = document.getElementById('weather-windspeed');
        const rainChanceDetail = document.getElementById('weather-rain-chance');
        const uvIndex = document.getElementById('weather-uv');
        const updateTime = document.getElementById('weather-update-time');
        const mainIconContainer = document.getElementById('weather-main-icon');

        if (detailTemp) detailTemp.textContent = `${Math.round(current.temperature_2m)}°C`;
        if (detailDesc) detailDesc.textContent = weatherInfo.desc;
        if (detailRange) {
            detailRange.textContent = `สูงสุด: ${data.daily.temperature_2m_max[0]}°C | ต่ำสุด: ${data.daily.temperature_2m_min[0]}°C`;
        }
        if (humidity) humidity.textContent = `${current.relative_humidity_2m}%`;
        if (windspeed) windspeed.textContent = `${current.wind_speed_10m} กม./ชม.`;
        if (rainChanceDetail) rainChanceDetail.textContent = `${data.daily.precipitation_probability_max[0]}%`;
        
        if (uvIndex) {
            const uv = data.daily.uv_index_max[0] || 0;
            let uvText = 'ต่ำ';
            if (uv > 2) uvText = 'ปานกลาง';
            if (uv > 5) uvText = 'สูง';
            if (uv > 7) uvText = 'สูงมาก';
            if (uv > 10) uvText = 'อันตรายสูงสุด';
            uvIndex.textContent = `${uv} (${uvText})`;
        }
        
        if (updateTime) {
            const obsTimeStr = current.time; // e.g. "2026-06-10T18:00"
            const obsTime = new Date(obsTimeStr);
            const formattedObsTime = obsTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            const now = new Date();
            updateTime.textContent = `ข้อมูลตรวจวัด ณ เวลา: ${formattedObsTime} น. (อัปเดตสดเมื่อ: ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)`;
        }

        if (mainIconContainer) {
            mainIconContainer.innerHTML = `<i data-lucide="${weatherInfo.icon}" class="${weatherInfo.color}"></i>`;
        }

        // Refresh icons
        if (window.lucide) window.lucide.createIcons();
    }

    /**
     * Renders the 24-hour temperature forecast chart using Chart.js.
     * @param {any} data
     */
    renderHourlyForecast(data) {
        if (!data || !data.hourly) return;
        const hourly = data.hourly;
        const ctx = document.getElementById('hourlyTempChart');
        if (!ctx) return;

        // Find the index in hourly.time that is closest to the current hour/day in Bangkok
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        
        let startIndex = hourly.time.findIndex(t => t.startsWith(`${year}-${month}-${date}T${hour}:`));
        if (startIndex === -1) {
            startIndex = now.getHours(); // fallback to index of hour
        }

        const labels = [];
        const temperatures = [];
        
        for (let i = 0; i < 24; i++) {
            const index = startIndex + i;
            if (index >= hourly.time.length) break;
            
            const timeStr = hourly.time[index];
            const timeParts = timeStr.split('T')[1];
            const hourPart = timeParts.split(':')[0];
            labels.push(`${hourPart}:00`);
            temperatures.push(hourly.temperature_2m[index]);
        }

        // Check if chart instance exists, destroy it before creating new one
        if (this.hourlyChart) {
            this.hourlyChart.destroy();
        }

        const isDarkTheme = document.body.classList.contains('dark-theme');
        const gridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        const labelColor = isDarkTheme ? '#9ca3af' : '#4b5563';

        this.hourlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'อุณหภูมิ (°C)',
                    data: temperatures,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#06b6d4',
                    pointBorderColor: '#fff',
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: labelColor, font: { family: 'Kanit' } }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: { color: labelColor, font: { family: 'Outfit' } }
                    }
                }
            }
        });
    }

    /**
     * Renders the 7-day forecast summary cards.
     * @param {any} data
     */
    render7DaysForecast(data) {
        const container = document.getElementById('forecast-7days-container');
        if (!container) return;

        const daily = data.daily;
        const daysOfWeek = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
        
        let html = '';
        
        // Loop through 7 days
        for (let i = 0; i < 7; i++) {
            const dateObj = new Date();
            dateObj.setDate(dateObj.getDate() + i);
            const dayName = i === 0 ? 'วันนี้' : daysOfWeek[dateObj.getDay()];
            
            const wCode = daily.weather_code[i];
            const wInfo = this.getWeatherDescription(wCode);
            const maxTemp = Math.round(daily.temperature_2m_max[i]);
            const minTemp = Math.round(daily.temperature_2m_min[i]);
            const rainProb = daily.precipitation_probability_max[i] || 0;

            html += `
                <div class="forecast-day-card">
                    <span class="fc-day">${dayName}</span>
                    <div class="fc-icon">
                        <i data-lucide="${wInfo.icon}" class="${wInfo.color}"></i>
                    </div>
                    <span class="fc-desc">${wInfo.desc}</span>
                    <span class="fc-temp">${maxTemp}° <span>/ ${minTemp}°</span></span>
                    <span class="fc-rain">
                        <i data-lucide="droplet"></i> ${rainProb}%
                    </span>
                </div>
            `;
        }

        container.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
    }

    /**
     * Updates the dashboard and detailed view with PM2.5 and AQI data.
     * @param {any} data
     */
    renderAirQuality(data) {
        const current = data.current;
        const pm25Val = current.pm2_5;
        const pm10Val = current.pm10;
        const o3Val = current.ozone;
        const no2Val = current.nitrogen_dioxide;
        
        const aqiInfo = this.getAQIStatus(pm25Val);

        // Update home dashboard PM2.5 elements
        const dashPM25 = document.getElementById('dash-pm25');
        const dashPM25Status = document.getElementById('dash-pm25-status');
        const dashPM25Advice = document.getElementById('dash-pm25-advice');

        this.currentPM25 = pm25Val;

        if (dashPM25) dashPM25.textContent = Math.round(pm25Val);
        if (dashPM25Status) {
            dashPM25Status.textContent = aqiInfo.status.split(' ')[0]; // Just Thai word
            dashPM25Status.className = `aqi-badge ${aqiInfo.class}`;
        }
        if (dashPM25Advice) dashPM25Advice.textContent = aqiInfo.advice;
        this.checkWeatherAlerts();

        // Update detailed weather tab PM2.5 elements
        const detailPM25Val = document.getElementById('detail-pm25-val');
        const detailAQIRing = document.getElementById('aqi-ring-element');
        const detailAQIStatusText = document.getElementById('detail-aqi-status-text');
        const detailAQIAdvice = document.getElementById('detail-aqi-advice');

        if (detailPM25Val) detailPM25Val.textContent = Math.round(pm25Val);
        if (detailAQIRing) {
            detailAQIRing.style.borderColor = 'rgba(255, 255, 255, 0.05)';
            detailAQIRing.style.borderTopColor = aqiInfo.color;
            detailAQIRing.style.boxShadow = `0 0 25px ${aqiInfo.color}33`; // Add low alpha glow
        }
        if (detailAQIStatusText) {
            detailAQIStatusText.textContent = aqiInfo.status;
            detailAQIStatusText.style.color = aqiInfo.color;
        }
        if (detailAQIAdvice) detailAQIAdvice.textContent = aqiInfo.advice;

        // Update individual pollutant bars
        // Max values based on standards: PM10 (120), O3 (180), NO2 (200)
        this.setPollutantProgress('pm10', pm10Val, 120);
        this.setPollutantProgress('o3', o3Val, 180);
        this.setPollutantProgress('no2', no2Val, 200);
    }

    /**
     * Updates the progress bar and value for a specific air pollutant.
     * @param {any} name
     * @param {any} value
     * @param {any} maxLimit
     */
    setPollutantProgress(name, value, maxLimit) {
        const valElem = document.getElementById(`val-${name}`);
        const barElem = document.getElementById(`bar-${name}`);
        if (!valElem || !barElem) return;

        valElem.textContent = `${Math.round(value)} µg/m³`;
        const percentage = Math.min((value / maxLimit) * 100, 100);
        barElem.style.width = `${percentage}%`;

        // Change color based on safe limits
        if (percentage <= 30) {
            barElem.style.backgroundColor = '#10b981'; // Good
        } else if (percentage <= 60) {
            barElem.style.backgroundColor = '#f59e0b'; // Moderate
        } else {
            barElem.style.backgroundColor = '#ef4444'; // Dangerous
        }
    }

    /**
     * Analyzes stored rain chance and PM2.5 levels to update dashboard alert banner.
     */
    checkWeatherAlerts() {
        const container = document.getElementById('dashboard-weather-alert-container');
        const alertText = document.getElementById('dashboard-weather-alert-text');
        if (!container || !alertText) return;

        const rainChance = this.currentRainChance || 0;
        const pm25Val = this.currentPM25 || 0;

        const isRainHigh = rainChance >= 60;
        const isPM25High = pm25Val >= 37.5;

        if (isRainHigh || isPM25High) {
            let message = '';
            if (isRainHigh && isPM25High) {
                message = `วันนี้โอกาสเกิดฝนตกสูงถึง ${rainChance}% และมีฝุ่น PM2.5 สูงเกินมาตรฐานที่ ${Math.round(pm25Val)} µg/m³ (แนะนำให้พกร่มและสวมหน้ากากป้องกันฝุ่นก่อนออกนอกบ้านค่ะ)`;
            } else if (isRainHigh) {
                message = `วันนี้มีโอกาสเกิดฝนตกสูงถึง ${rainChance}% กรุณาพกร่มหรือเตรียมตัววางแผนการเดินทางด้วยความระมัดระวังค่ะ`;
            } else {
                message = `ค่าฝุ่น PM2.5 ในพื้นที่ขณะนี้สูงถึง ${Math.round(pm25Val)} µg/m³ ซึ่งเริ่มมีผลกระทบต่อสุขภาพ ควรหลีกเลี่ยงกิจกรรมกลางแจ้งหรือสวมหน้ากากอนามัยค่ะ`;
            }

            alertText.textContent = message;
            container.style.display = 'flex';

            const btnCloseAlert = document.getElementById('btn-close-weather-alert');
            if (btnCloseAlert) {
                btnCloseAlert.addEventListener('click', (e) => {
                    e.stopPropagation();
                    container.style.display = 'none';
                });
            }
        } else {
            container.style.display = 'none';
        }
    }
}

// Global weather service instanced
window.weatherService = new WeatherService();
