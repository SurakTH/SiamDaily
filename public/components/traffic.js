// Traffic & Bangkok Transit (BTS/MRT/ARL) Calculator Component

class TransitService {
    constructor() {
        // Station Database for Bangkok Rail Transit
        this.transitData = {
            'bts-sukhumvit': {
                name: 'BTS สายสุขุมวิท',
                color: '#65a30d',
                prefix: 'N/E',
                stations: [
                    { id: 'N24', name: 'คูคต' }, { id: 'N23', name: 'แยก คปอ.' }, { id: 'N22', name: 'พิพิธภัณฑ์กองทัพอากาศ' },
                    { id: 'N21', name: 'โรงพยาบาลภูมิพลอดุลยเดช' }, { id: 'N20', name: 'สะพานใหม่' }, { id: 'N19', name: 'สายหยุด' },
                    { id: 'N18', name: 'พหลโยธิน 59' }, { id: 'N17', name: 'วัดพระศรีมหาธาตุ' }, { id: 'N16', name: 'กรมทหารราบที่ 11' },
                    { id: 'N15', name: 'บางบัว' }, { id: 'N14', name: 'กรมป่าไม้' }, { id: 'N13', name: 'มหาวิทยาลัยเกษตรศาสตร์' },
                    { id: 'N12', name: 'เสนานิคม' }, { id: 'N11', name: 'รัชโยธิน' }, { id: 'N10', name: 'พหลโยธิน 24' },
                    { id: 'N9', name: 'ห้าแยกลาดพร้าว' }, { id: 'N8', name: 'หมอชิต' }, { id: 'N7', name: 'สะพานควาย' },
                    { id: 'N5', name: 'อารีย์' }, { id: 'N4', name: 'สนามเป้า' }, { id: 'N3', name: 'อนุสาวรีย์ชัยสมรภูมิ' },
                    { id: 'N2', name: 'พญาไท' }, { id: 'N1', name: 'ราชเทวี' }, { id: 'CEN', name: 'สยาม' },
                    { id: 'E1', name: 'ชิดลม' }, { id: 'E2', name: 'เพลินจิต' }, { id: 'E3', name: 'นานา' },
                    { id: 'E4', name: 'อโศก' }, { id: 'E5', name: 'พร้อมพงษ์' }, { id: 'E6', name: 'ทองหล่อ' },
                    { id: 'E7', name: 'เอกมัย' }, { id: 'E8', name: 'พระโขนง' }, { id: 'E9', name: 'อ่อนนุช' },
                    { id: 'E10', name: 'บางจาก' }, { id: 'E11', name: 'ปุณณวิถี' }, { id: 'E12', name: 'อุดมสุข' },
                    { id: 'E13', name: 'บางนา' }, { id: 'E14', name: 'แบริ่ง' }, { id: 'E15', name: 'สำโรง' },
                    { id: 'E16', name: 'ปู่เจ้า' }, { id: 'E17', name: 'ช้างเอราวัณ' }, { id: 'E18', name: 'โรงเรียนนายเรือ' },
                    { id: 'E19', name: 'ปากน้ำ' }, { id: 'E20', name: 'ศรีนครินทร์' }, { id: 'E21', name: 'แพรกษา' },
                    { id: 'E22', name: 'สายลวด' }, { id: 'E23', name: 'เคหะฯ' }
                ]
            },
            'bts-silom': {
                name: 'BTS สายสีลม',
                color: '#84cc16',
                prefix: 'W/S',
                stations: [
                    { id: 'W1', name: 'สนามกีฬาแห่งชาติ' }, { id: 'CEN', name: 'สยาม' }, { id: 'S1', name: 'ราชดำริ' },
                    { id: 'S2', name: 'ศาลาแดง' }, { id: 'S3', name: 'ช่องนนทรี' }, { id: 'S4', name: 'เซนต์หลุยส์' },
                    { id: 'S5', name: 'สุรศักดิ์' }, { id: 'S6', name: 'สะพานตากสิน' }, { id: 'S7', name: 'กรุงธนบุรี' },
                    { id: 'S8', name: 'วงเวียนใหญ่' }, { id: 'S9', name: 'โพธิ์นิมิตร' }, { id: 'S10', name: 'ตลาดพลู' },
                    { id: 'S11', name: 'วุฒากาศ' }, { id: 'S12', name: 'บางหว้า' }
                ]
            },
            'mrt-blue': {
                name: 'MRT สายสีน้ำเงิน',
                color: '#1d4ed8',
                prefix: 'BL',
                stations: [
                    { id: 'BL01', name: 'ท่าพระ (ชานชาลาบน)' }, { id: 'BL38', name: 'จรัญฯ 13' }, { id: 'BL37', name: 'ไฟฉาย' },
                    { id: 'BL36', name: 'บางขุนนนท์' }, { id: 'BL35', name: 'บางยี่ขัน' }, { id: 'BL34', name: 'สิรินธร' },
                    { id: 'BL33', name: 'บางพลัด' }, { id: 'BL32', name: 'บางอ้อ' }, { id: 'BL31', name: 'บางโพ' },
                    { id: 'BL30', name: 'เตาปูน' }, { id: 'BL11', name: 'บางซื่อ' }, { id: 'BL12', name: 'กำแพงเพชร' },
                    { id: 'BL13', name: 'สวนจตุจักร' }, { id: 'BL14', name: 'พหลโยธิน' }, { id: 'BL15', name: 'ลาดพร้าว' },
                    { id: 'BL16', name: 'รัชดาภิเษก' }, { id: 'BL17', name: 'สุทธิสาร' }, { id: 'BL18', name: 'ห้วยขวาง' },
                    { id: 'BL19', name: 'ศูนย์วัฒนธรรมแห่งประเทศไทย' }, { id: 'BL20', name: 'พระราม 9' }, { id: 'BL21', name: 'เพชรบุรี' },
                    { id: 'BL22', name: 'สุขุมวิท' }, { id: 'BL23', name: 'ศูนย์การประชุมแห่งชาติสิริกิติ์' }, { id: 'BL24', name: 'คลองเตย' },
                    { id: 'BL25', name: 'ลุมพินี' }, { id: 'BL26', name: 'สีลม' }, { id: 'BL27', name: 'สามย่าน' },
                    { id: 'BL28', name: 'หัวลำโพง' }, { id: 'BL29', name: 'วัดมังกร' }, { id: 'BL30-2', name: 'สามยอด' },
                    { id: 'BL31-2', name: 'สนามไชย' }, { id: 'BL32-2', name: 'อิสรภาพ' }, { id: 'BL01-2', name: 'ท่าพระ (ชานชาลาล่าง)' },
                    { id: 'BL34-2', name: 'บางไผ่' }, { id: 'BL35-2', name: 'บางหว้า' }, { id: 'BL36-2', name: 'เพชรเกษม 48' },
                    { id: 'BL37-2', name: 'ภาษีเจริญ' }, { id: 'BL38-2', name: 'บางแค' }, { id: 'BL39', name: 'หลักสอง' }
                ]
            },
            'mrt-purple': {
                name: 'MRT สายสีม่วง',
                color: '#7c3aed',
                prefix: 'PP',
                stations: [
                    { id: 'PP01', name: 'คลองบางไผ่' }, { id: 'PP02', name: 'ตลาดบางใหญ่' }, { id: 'PP03', name: 'สามแยกบางใหญ่' },
                    { id: 'PP04', name: 'บางรักใหญ่' }, { id: 'PP05', name: 'บางรักน้อยท่าอิฐ' }, { id: 'PP06', name: 'ไทรม้า' },
                    { id: 'PP07', name: 'สะพานพระนั่งเกล้า' }, { id: 'PP08', name: 'แยกนนทบุรี 1' }, { id: 'PP09', name: 'ศรีพรสวรรค์' },
                    { id: 'PP10', name: 'ศูนย์ราชการนนทบุรี' }, { id: 'PP11', name: 'กระทรวงสาธารณสุข' }, { id: 'PP12', name: 'แยกติวานนท์' },
                    { id: 'PP13', name: 'วงศ์สว่าง' }, { id: 'PP14', name: 'บางซ่อน' }, { id: 'PP15', name: 'เตาปูน' }
                ]
            },
            'mrt-yellow': {
                name: 'MRT สายสีเหลือง',
                color: '#eab308',
                prefix: 'YL',
                stations: [
                    { id: 'YL01', name: 'ลาดพร้าว' }, { id: 'YL02', name: 'ภาวนา' }, { id: 'YL03', name: 'โชคชัย 4' },
                    { id: 'YL04', name: 'ลาดพร้าว 71' }, { id: 'YL05', name: 'ลาดพร้าว 83' }, { id: 'YL06', name: 'มหาดไทย' },
                    { id: 'YL07', name: 'ลาดพร้าว 101' }, { id: 'YL08', name: 'บางกะปิ' }, { id: 'YL09', name: 'แยกลำสาลี' },
                    { id: 'YL10', name: 'ศรีกรีฑา' }, { id: 'YL11', name: 'หัวหมาก' }, { id: 'YL12', name: 'กลันตัน' },
                    { id: 'YL13', name: 'ศรีนุช' }, { id: 'YL14', name: 'ศรีนครินทร์ 38' }, { id: 'YL15', name: 'สวนหลวง ร.9' },
                    { id: 'YL16', name: 'ศรีอุดม' }, { id: 'YL17', name: 'ศรีเอี่ยม' }, { id: 'YL18', name: 'ศรีลาซาล' },
                    { id: 'YL19', name: 'ศรีแบริ่ง' }, { id: 'YL20', name: 'ศรีด่าน' }, { id: 'YL21', name: 'ศรีเทพา' },
                    { id: 'YL22', name: 'ทิพวัล' }, { id: 'YL23', name: 'สำโรง' }
                ]
            },
            'mrt-pink': {
                name: 'MRT สายสีชมพู',
                color: '#ec4899',
                prefix: 'PK',
                stations: [
                    { id: 'PK01', name: 'ศูนย์ราชการนนทบุรี' }, { id: 'PK02', name: 'แคราย' }, { id: 'PK03', name: 'สนามบินน้ำ' },
                    { id: 'PK04', name: 'สามัคคี' }, { id: 'PK05', name: 'กรมชลประทาน' }, { id: 'PK06', name: 'ปากเกร็ด' },
                    { id: 'PK07', name: 'เลี่ยงเมืองปากเกร็ด' }, { id: 'PK08', name: 'แจ้งวัฒนะ-ปากเกร็ด 28' }, { id: 'PK09', name: 'ศรีรัช' },
                    { id: 'PK10', name: 'เมืองทองธานี' }, { id: 'PK11', name: 'แจ้งวัฒนะ 14' }, { id: 'PK12', name: 'ศูนย์ราชการเฉลิมพระเกียรติ' },
                    { id: 'PK13', name: 'โทรคมนาคมแห่งชาติ' }, { id: 'PK14', name: 'หลักสี่' }, { id: 'PK15', name: 'ราชภัฏพระนคร' },
                    { id: 'PK16', name: 'วัดพระศรีมหาธาตุ' }, { id: 'PK17', name: 'รามอินทรา 3' }, { id: 'PK18', name: 'ลาดปลาเค้า' },
                    { id: 'PK19', name: 'รามอินทรา กม. 4' }, { id: 'PK20', name: 'มัยลาภ' }, { id: 'PK21', name: 'วัชรพล' },
                    { id: 'PK22', name: 'รามอินทรา กม. 6' }, { id: 'PK23', name: 'คู้บอน' }, { id: 'PK24', name: 'รามอินทรา กม. 9' },
                    { id: 'PK25', name: 'วงแหวนรามอินทรา' }, { id: 'PK26', name: 'นพรัตน์' }, { id: 'PK27', name: 'บางชัน' },
                    { id: 'PK28', name: 'เศรษฐบุตรบำเพ็ญ' }, { id: 'PK29', name: 'ตลาดมีนบุรี' }, { id: 'PK30', name: 'มีนบุรี' }
                ]
            },
            'arl': {
                name: 'ARL (Airport Link)',
                color: '#991b1b',
                prefix: 'A',
                stations: [
                    { id: 'A1', name: 'สุวรรณภูมิ' }, { id: 'A2', name: 'ลาดกระบัง' }, { id: 'A3', name: 'บ้านทับช้าง' },
                    { id: 'A4', name: 'หัวหมาก' }, { id: 'A5', name: 'รามคำแหง' }, { id: 'A6', name: 'มักกะสัน (เชื่อมต่อ MRT เพชรบุรี)' },
                    { id: 'A7', name: 'ราชปรารภ' }, { id: 'A8', name: 'พญาไท' }
                ]
            }
        };

        // Interchange nodes mapping for routing calculations
        this.interchanges = [
            { stationName: 'สยาม', lines: ['bts-sukhumvit', 'bts-silom'] },
            { stationName: 'หมอชิต', altName: 'สวนจตุจักร', lines: ['bts-sukhumvit', 'mrt-blue'] },
            { stationName: 'อโศก', altName: 'สุขุมวิท', lines: ['bts-sukhumvit', 'mrt-blue'] },
            { stationName: 'ศาลาแดง', altName: 'สีลม', lines: ['bts-silom', 'mrt-blue'] },
            { stationName: 'พญาไท', lines: ['bts-sukhumvit', 'arl'] },
            { stationName: 'เตาปูน', lines: ['mrt-blue', 'mrt-purple'] },
            { stationName: 'บางซื่อ', altName: 'สถานีกลางกรุงเทพอภิวัฒน์', lines: ['mrt-blue'] }, // MRT to trains
            { stationName: 'สำโรง', lines: ['bts-sukhumvit', 'mrt-yellow'] },
            { stationName: 'ลาดพร้าว', lines: ['mrt-blue', 'mrt-yellow'] },
            { stationName: 'วัดพระศรีมหาธาตุ', lines: ['bts-sukhumvit', 'mrt-pink'] },
            { stationName: 'ศูนย์ราชการนนทบุรี', lines: ['mrt-purple', 'mrt-pink'] }
        ];

        this.graph = this.buildGraph();
        this.init();
    }

    /**
     * Initializes the service and binds necessary DOM events.
     */
    init() {
        // Set listeners for select lines to change station lists
        const lineStartSelect = document.getElementById('select-transit-line-start');
        const lineEndSelect = document.getElementById('select-transit-line-end');
        const stationStartSelect = document.getElementById('select-station-start');
        const stationEndSelect = document.getElementById('select-station-end');

        const savedLineStart = localStorage.getItem('siam_daily_transit_line_start');
        const savedStationStart = localStorage.getItem('siam_daily_transit_station_start');
        const savedLineEnd = localStorage.getItem('siam_daily_transit_line_end');
        const savedStationEnd = localStorage.getItem('siam_daily_transit_station_end');

        if (savedLineStart && lineStartSelect) lineStartSelect.value = savedLineStart;
        if (savedLineEnd && lineEndSelect) lineEndSelect.value = savedLineEnd;

        if (lineStartSelect) {
            lineStartSelect.addEventListener('change', (e) => {
                localStorage.setItem('siam_daily_transit_line_start', e.target.value);
                this.populateStations(e.target.value, 'select-station-start');
                if (stationStartSelect) localStorage.setItem('siam_daily_transit_station_start', stationStartSelect.value);
            });
            this.populateStations(lineStartSelect.value, 'select-station-start', savedStationStart);
        }

        if (lineEndSelect) {
            lineEndSelect.addEventListener('change', (e) => {
                localStorage.setItem('siam_daily_transit_line_end', e.target.value);
                this.populateStations(e.target.value, 'select-station-end');
                if (stationEndSelect) localStorage.setItem('siam_daily_transit_station_end', stationEndSelect.value);
            });
            this.populateStations(lineEndSelect.value, 'select-station-end', savedStationEnd);
        }

        if (stationStartSelect) {
            stationStartSelect.addEventListener('change', (e) => localStorage.setItem('siam_daily_transit_station_start', e.target.value));
        }
        if (stationEndSelect) {
            stationEndSelect.addEventListener('change', (e) => localStorage.setItem('siam_daily_transit_station_end', e.target.value));
        }

        // Map Toggle Buttons
        const longdoBtn = document.getElementById('btn-map-longdo');
        const googleBtn = document.getElementById('btn-map-google');
        if (longdoBtn) longdoBtn.addEventListener('click', () => this.toggleMap('longdo'));
        if (googleBtn) googleBtn.addEventListener('click', () => this.toggleMap('google'));

        // Calc button listener
        const calcBtn = document.getElementById('btn-calc-transit');
        if (calcBtn) {
            calcBtn.addEventListener('click', () => this.calculateFare());
        }
    }

    /**
     * Executes the populateStations operation.
     * @param {any} lineId
     * @param {any} selectElemId
     * @param {any} savedStation
     */
    populateStations(lineId, selectElemId, savedStation = null) {
        const select = document.getElementById(selectElemId);
        if (!select || !this.transitData[lineId]) return;

        select.innerHTML = '';
        this.transitData[lineId].stations.forEach(station => {
            const opt = document.createElement('option');
            opt.value = station.name;
            opt.textContent = `${station.id} - ${station.name}`;
            select.appendChild(opt);
        });

        if (savedStation) {
            select.value = savedStation;
        }
    }

    /**
     * Executes the toggleMap operation.
     * @param {any} type
     */
    toggleMap(type) {
        const container = document.getElementById('map-iframe-container');
        const longdoBtn = document.getElementById('btn-map-longdo');
        const googleBtn = document.getElementById('btn-map-google');

        if (!container) return;

        if (type === 'longdo') {
            if (longdoBtn) longdoBtn.classList.add('active');
            if (googleBtn) googleBtn.classList.remove('active');
            container.innerHTML = `
                <iframe 
                    id="traffic-iframe"
                    src="https://map.longdo.com/snippet/iframe.php?locale=th&mode=traffic&map=epsg3857&lat=13.7946&long=100.3242&zoom=14" 
                    width="100%" 
                    height="450" 
                    style="border:0;" 
                    allowfullscreen="" 
                    loading="lazy">
                </iframe>
                <div class="traffic-overlay-legend">
                    <span class="legend-item"><span class="color-dot green"></span> สะดวก</span>
                    <span class="legend-item"><span class="color-dot orange"></span> ชะลอตัว</span>
                    <span class="legend-item"><span class="color-dot red"></span> ติดขัด</span>
                    <span class="legend-item" style="color:var(--primary-color)"><i data-lucide="info" style="display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:2px"></i> ซูมเข้า/ออก เพื่อดูสภาพการจราจรบนท้องถนนรอบ ม.มหิดล ศาลายา</span>
                </div>
            `;
        } else {
            if (longdoBtn) longdoBtn.classList.remove('active');
            if (googleBtn) googleBtn.classList.add('active');
            container.innerHTML = `
                <iframe 
                    id="traffic-iframe"
                    src="https://maps.google.com/maps?q=13.7946,100.3242&t=h&z=15&output=embed" 
                    width="100%" 
                    height="450" 
                    style="border:0;" 
                    allowfullscreen="" 
                    loading="lazy">
                </iframe>
                <div class="traffic-overlay-legend">
                    <span class="legend-item" style="color:var(--primary-color)"><i data-lucide="info" style="display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:2px"></i> แผนที่ผ่านดาวเทียม (Google Maps) รอบ ม.มหิดล ศาลายา</span>
                </div>
            `;
        }
        if (window.lucide) window.lucide.createIcons();
    }

    /**
     * Builds the transit network graph for BFS pathfinding.
     */
    buildGraph() {
        const graph = {};
        
        // Add nodes for all stations
        for (const [lineId, lineInfo] of Object.entries(this.transitData)) {
            const stations = lineInfo.stations;
            for (let i = 0; i < stations.length; i++) {
                const currentName = stations[i].name;
                const currentKey = `${lineId}:${currentName}`;
                
                if (!graph[currentKey]) {
                    graph[currentKey] = [];
                }
                
                // Connect to previous station in the same line
                if (i > 0) {
                    const prevName = stations[i - 1].name;
                    graph[currentKey].push({
                        to: `${lineId}:${prevName}`,
                        type: 'line',
                        lineId: lineId
                    });
                }
                
                // Connect to next station in the same line
                if (i < stations.length - 1) {
                    const nextName = stations[i + 1].name;
                    graph[currentKey].push({
                        to: `${lineId}:${nextName}`,
                        type: 'line',
                        lineId: lineId
                    });
                }
            }
        }
        
        // Add interchange connections
        for (const ic of this.interchanges) {
            const matchingKeys = [];
            for (const lineId of ic.lines) {
                const line = this.transitData[lineId];
                if (line) {
                    const station = line.stations.find(s => s.name === ic.stationName || (ic.altName && s.name === ic.altName));
                    if (station) {
                        matchingKeys.push(`${lineId}:${station.name}`);
                    }
                }
            }
            
            // Connect all matching interchange stations to each other
            for (let i = 0; i < matchingKeys.length; i++) {
                for (let j = 0; j < matchingKeys.length; j++) {
                    if (i !== j) {
                        graph[matchingKeys[i]].push({
                            to: matchingKeys[j],
                            type: 'interchange',
                            stationName: ic.stationName,
                            altName: ic.altName
                        });
                    }
                }
            }
        }
        
        return graph;
    }

    /**
     * Executes the findShortestPath operation.
     * @param {any} startKey
     * @param {any} endKey
     */
    findShortestPath(startKey, endKey) {
        if (startKey === endKey) return [startKey];
        if (!this.graph[startKey] || !this.graph[endKey]) return null;
        
        const queue = [[startKey]];
        const visited = new Set([startKey]);
        
        while (queue.length > 0) {
            const path = queue.shift();
            const node = path[path.length - 1];
            
            if (node === endKey) {
                return path;
            }
            
            const neighbors = this.graph[node] || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor.to)) {
                    visited.add(neighbor.to);
                    queue.push([...path, neighbor.to]);
                }
            }
        }
        
        return null;
    }

    /**
     * Executes the getSystemId operation.
     * @param {any} lineId
     */
    getSystemId(lineId) {
        if (lineId === 'bts-sukhumvit' || lineId === 'bts-silom') return 'bts';
        if (lineId === 'mrt-blue' || lineId === 'mrt-purple') return 'mrt-blue-purple';
        if (lineId === 'mrt-yellow') return 'mrt-yellow';
        if (lineId === 'mrt-pink') return 'mrt-pink';
        if (lineId === 'arl') return 'arl';
        return lineId;
    }

    /**
     * Executes the calculateSystemFare operation.
     * @param {any} systemId
     * @param {any} stationsCount
     */
    calculateSystemFare(systemId, stationsCount) {
        if (stationsCount <= 0) return 0;
        
        if (systemId === 'bts') {
            // BTS base: 17 THB + ~3 THB per station, max 47
            return Math.min(17 + (stationsCount * 3), 47);
        } else if (systemId === 'mrt-blue-purple') {
            // MRT Blue/Purple base: 17 THB + ~2.5 THB per station, max 70
            return Math.min(17 + (stationsCount * 2.5), 70);
        } else if (systemId === 'mrt-yellow' || systemId === 'mrt-pink') {
            // MRT Yellow / Pink: 15 THB + 2.5 THB per station, max 45
            return Math.min(15 + (stationsCount * 2.5), 45);
        } else if (systemId === 'arl') {
            // ARL: 15 THB + 5 THB per station, max 45
            return Math.min(15 + (stationsCount * 5), 45);
        }
        return 20 + (stationsCount * 3);
    }

    /**
     * Executes the calculateFare operation.
     */
    calculateFare() {
        const lineStartSelect = document.getElementById('select-transit-line-start');
        const startStation = document.getElementById('select-station-start').value;
        const lineEndSelect = document.getElementById('select-transit-line-end');
        const endStation = document.getElementById('select-station-end').value;

        const lineStart = lineStartSelect.value;
        const lineEnd = lineEndSelect.value;

        const resultBox = document.getElementById('transit-result');
        const fareElem = document.getElementById('res-fare');
        const timeElem = document.getElementById('res-time');
        const stepsElem = document.getElementById('res-route-steps');

        if (!resultBox || !fareElem || !timeElem || !stepsElem) return;

        const startKey = `${lineStart}:${startStation}`;
        const endKey = `${lineEnd}:${endStation}`;

        if (startKey === endKey) {
            fareElem.textContent = '0';
            timeElem.textContent = '0';
            stepsElem.innerHTML = '<li>คุณอยู่ที่สถานีปลายทางแล้ว</li>';
            resultBox.classList.remove('hidden');
            return;
        }

        const path = this.findShortestPath(startKey, endKey);
        if (!path) {
            fareElem.textContent = '-';
            timeElem.textContent = '-';
            stepsElem.innerHTML = '<li>ขออภัย ไม่พบเส้นทางเชื่อมต่อที่ต้องการ</li>';
            resultBox.classList.remove('hidden');
            return;
        }

        // Group path into line segments
        const segments = [];
        let currentSegment = null;

        for (let i = 0; i < path.length; i++) {
            const [lineId, stationName] = path[i].split(':');
            
            if (!currentSegment || currentSegment.lineId !== lineId) {
                if (currentSegment) {
                    segments.push(currentSegment);
                }
                currentSegment = {
                    lineId: lineId,
                    stations: [stationName]
                };
            } else {
                currentSegment.stations.push(stationName);
            }
        }
        if (currentSegment) {
            segments.push(currentSegment);
        }

        // Calculate travel time and fares
        let totalTime = 0;
        let totalFare = 0;
        let systemJourneys = [];
        let currentJourney = null;

        // Group consecutive segments that belong to the same system
        for (const segment of segments) {
            const systemId = this.getSystemId(segment.lineId);
            const stationsCount = segment.stations.length - 1;

            if (!currentJourney || currentJourney.systemId !== systemId) {
                if (currentJourney) {
                    systemJourneys.push(currentJourney);
                }
                currentJourney = {
                    systemId: systemId,
                    stationsCount: stationsCount
                };
            } else {
                currentJourney.stationsCount += stationsCount;
            }

            // Time: 2.5 minutes per station
            totalTime += stationsCount * 2.5;
        }
        if (currentJourney) {
            systemJourneys.push(currentJourney);
        }

        // Add transfer time: 5 minutes per segment transition
        if (segments.length > 1) {
            totalTime += (segments.length - 1) * 5;
        }

        // Calculate total fare
        for (const journey of systemJourneys) {
            totalFare += this.calculateSystemFare(journey.systemId, journey.stationsCount);
        }

        // Round final values
        totalFare = Math.round(totalFare);
        totalTime = Math.round(totalTime);

        // Build route steps instructions
        const routeSteps = [];
        for (let idx = 0; idx < segments.length; idx++) {
            const segment = segments[idx];
            const lineName = this.transitData[segment.lineId]?.name || segment.lineId;
            const count = segment.stations.length - 1;
            const startName = segment.stations[0];
            const endName = segment.stations[segment.stations.length - 1];

            if (idx === 0) {
                routeSteps.push(`ขึ้นรถไฟฟ้า <strong>${lineName}</strong> ที่สถานี <strong>${startName}</strong>`);
            }

            if (count > 0) {
                routeSteps.push(`เดินทางผ่านทั้งหมด <strong>${count} สถานี</strong> มุ่งหน้าไปยังสถานี <strong>${endName}</strong>`);
            }

            if (idx < segments.length - 1) {
                const nextSegment = segments[idx + 1];
                const nextLineName = this.transitData[nextSegment.lineId]?.name || nextSegment.lineId;
                const currentSystem = this.getSystemId(segment.lineId);
                const nextSystem = this.getSystemId(nextSegment.lineId);
                
                // Find interchange text
                let interchangeStation = endName;
                if (endName !== nextSegment.stations[0]) {
                    interchangeStation = `${endName} / ${nextSegment.stations[0]}`;
                }

                if (currentSystem === nextSystem) {
                    routeSteps.push(`เปลี่ยนขบวนรถไฟฟ้าภายในระบบที่สถานีร่วม <strong>${interchangeStation}</strong> เพื่อเดินทางต่อด้วย <strong>${nextLineName}</strong> (ไม่ต้องแตะบัตรออก)`);
                } else {
                    routeSteps.push(`<strong class="text-amber"><i data-lucide="info" style="display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:2px"></i> ต้องแตะบัตรออกจากระบบ</strong> ที่สถานีเชื่อมต่อ <strong>${interchangeStation}</strong> เพื่อเปลี่ยนไปใช้บริการ <strong>${nextLineName}</strong>`);
                }
            }
        }

        routeSteps.push(`ถึงสถานีปลายทาง <strong>${endStation}</strong>`);

        // Render outputs
        fareElem.textContent = totalFare;
        timeElem.textContent = totalTime;

        let stepsHtml = '';
        routeSteps.forEach(step => {
            stepsHtml += `<li>${step}</li>`;
        });
        stepsElem.innerHTML = stepsHtml;

        resultBox.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
    }
}

// Instantiate Global Transit Service
window.transitService = new TransitService();
