function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

class LifestyleService {
    constructor() {
        this.todos = [];
        this.lottoData = null;
        this.init();
    }

    init() {
        // Load Todos from localStorage
        const storedTodos = localStorage.getItem('siam_daily_todos');
        if (storedTodos) {
            this.todos = JSON.parse(storedTodos);
        } else {
            // Default welcome tasks
            this.todos = [
                { id: 1, text: 'เช็กสภาพอากาศและค่าฝุ่น PM2.5 เช้าวันนี้', completed: true },
                { id: 2, text: 'สวมหน้ากากอนามัยหากค่าฝุ่นเกินเกณฑ์มาตรฐาน', completed: false },
                { id: 3, text: 'พกร่มติดตัวไปด้วยเนื่องจากกรมอุตุฯ แจ้งเตือนมรสุมเย็นนี้', completed: false }
            ];
            this.saveTodos();
        }

        // Hook Todo Form events
        const btnAddTodo = document.getElementById('btn-add-todo');
        const todoInput = document.getElementById('todo-input');
        if (btnAddTodo && todoInput) {
            btnAddTodo.addEventListener('click', () => this.addTodo('todo-input'));
            todoInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addTodo('todo-input');
            });
        }
        
        const btnDashAddTodo = document.getElementById('btn-dash-add-todo');
        const dashTodoInput = document.getElementById('dash-todo-input');
        if (btnDashAddTodo && dashTodoInput) {
            btnDashAddTodo.addEventListener('click', () => this.addTodo('dash-todo-input'));
            dashTodoInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addTodo('dash-todo-input');
            });
        }

        this.renderTodos();
        this.updateLottoResults();
        this.initLottoChecker();
        this.updateHolidayCalendar();
        this.initRandomFood();
        this.initLuckyNumberGenerator();
        this.initTarotReader();
        this.initMiniGames();
        this.initPackingAssistant();
    }



    // --- TODO LIST SERVICE ---
    saveTodos() {
        localStorage.setItem('siam_daily_todos', JSON.stringify(this.todos));
        if (window.appCoordinator && typeof window.appCoordinator.syncDataToCloud === 'function') {
            window.appCoordinator.syncDataToCloud();
        }
    }

    addTodo(inputId) {
        const todoInput = document.getElementById(inputId);
        if (!todoInput) return;
        const text = todoInput.value.trim();
        if (text === '') return;

        const newTodo = {
            id: Date.now(),
            text: text,
            completed: false
        };

        this.todos.push(newTodo);
        this.saveTodos();
        this.renderTodos();
        
        // Clear all inputs
        const inputs = ['todo-input', 'dash-todo-input'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    }

    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.saveTodos();
            this.renderTodos();
        }
    }

    deleteTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.saveTodos();
        this.renderTodos();
    }

    renderTodos() {
        const containers = [
            document.getElementById('todo-list-container'),
            document.getElementById('dash-todo-list-container')
        ];

        containers.forEach(container => {
            if (!container) return;

            container.innerHTML = '';
            if (this.todos.length === 0) {
                container.innerHTML = `<li style="text-align:center; padding: 1.5rem 0; color: var(--text-muted); font-size: 0.8rem; font-family: var(--font-thai);">ไม่มีสิ่งที่ต้องทำในขณะนี้</li>`;
                return;
            }

            this.todos.forEach(todo => {
                const li = document.createElement('li');
                li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
                
                li.innerHTML = `
                    <div class="todo-item-left">
                        <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                        <span class="todo-item-text">${escapeHtml(todo.text)}</span>
                    </div>
                    <button class="btn-delete-todo" title="ลบงาน"><i data-lucide="trash-2"></i></button>
                `;

                const checkbox = li.querySelector('input[type="checkbox"]');
                checkbox.addEventListener('change', () => this.toggleTodo(todo.id));

                const delBtn = li.querySelector('.btn-delete-todo');
                delBtn.addEventListener('click', () => this.deleteTodo(todo.id));

                container.appendChild(li);
            });
        });

        if (window.lucide) window.lucide.createIcons();
    }



    // --- LOTTERY SERVICE ---
    async updateLottoResults() {
        const lottoDate = document.getElementById('lotto-date-label');
        const prize1 = document.getElementById('lotto-prize-1');
        const suffix2 = document.getElementById('lotto-suffix-2');
        const prefix3 = document.getElementById('lotto-prefix-3');
        const suffix3 = document.getElementById('lotto-suffix-3');

        try {
            const response = await fetch('/api/lottery');
            if (!response.ok) throw new Error('Lottery API request failed');
            this.lottoData = await response.json();

            if (this.lottoData && this.lottoData.success) {
                if (lottoDate) lottoDate.textContent = this.lottoData.drawDate;
                if (prize1) prize1.textContent = this.lottoData.firstPrize;
                if (suffix2) suffix2.textContent = this.lottoData.suffix2;
                if (prefix3) prefix3.textContent = this.lottoData.prefix3.join(', ');
                if (suffix3) suffix3.textContent = this.lottoData.suffix3.join(', ');
            }
        } catch (error) {
            console.error('Error loading lottery results:', error);
        }
    }



    initLottoChecker() {
        const btnCheck = document.getElementById('btn-check-lotto');
        const inputNum = document.getElementById('lotto-check-number');
        const resultEl = document.getElementById('lotto-check-result');

        if (!btnCheck || !inputNum || !resultEl) return;

        btnCheck.addEventListener('click', () => {
            const num = inputNum.value.trim();
            if (num.length !== 6 || isNaN(num)) {
                resultEl.textContent = '❌ กรุณากรอกเลข 6 หลักให้ถูกต้อง';
                resultEl.style.color = 'var(--accent-red)';
                return;
            }

            if (!this.lottoData || !this.lottoData.success) {
                resultEl.textContent = '⚠️ ไม่มีข้อมูลสลากเพื่อตรวจสอบขณะนี้';
                resultEl.style.color = 'var(--accent-amber)';
                return;
            }

            const p1 = this.lottoData.firstPrize;
            const s2 = this.lottoData.suffix2;
            const pr3 = this.lottoData.prefix3;
            const su3 = this.lottoData.suffix3;

            let matches = [];

            if (num === p1) {
                matches.push('🎉 ยินดีด้วย! คุณถูกรางวัลที่ 1 (6,000,000 บาท)');
            }
            if (num.endsWith(s2)) {
                matches.push('🎉 ยินดีด้วย! คุณถูกรางวัลเลขท้าย 2 ตัว (2,000 บาท)');
            }
            if (pr3.includes(num.substring(0, 3))) {
                matches.push('🎉 ยินดีด้วย! คุณถูกรางวัลเลขหน้า 3 ตัว (4,000 บาท)');
            }
            if (su3.includes(num.substring(3, 6))) {
                matches.push('🎉 ยินดีด้วย! คุณถูกรางวัลเลขท้าย 3 ตัว (4,000 บาท)');
            }

            if (matches.length > 0) {
                resultEl.innerHTML = matches.join('<br>');
                resultEl.style.color = 'var(--accent-green)';
            } else {
                resultEl.textContent = 'เสียใจด้วยครับ งวดนี้คุณไม่ถูกรางวัล 😭';
                resultEl.style.color = 'var(--text-muted)';
            }
        });
    }




    // --- HOLIDAYS CALENDAR SERVICE ---
    async updateHolidayCalendar() {
        const container = document.getElementById('holiday-list-container');
        if (!container) return;

        try {
            const response = await fetch('/api/holidays');
            if (!response.ok) throw new Error('Holidays API request failed');
            const data = await response.json();

            if (data && data.success) {
                container.innerHTML = '';
                
                const now = new Date();
                
                const sortedHolidays = data.holidays
                    .map(h => ({ ...h, dateObj: new Date(h.date) }))
                    .filter(h => h.dateObj >= now || h.dateObj.toDateString() === now.toDateString())
                    .sort((a, b) => a.dateObj - b.dateObj);

                if (sortedHolidays.length === 0) {
                    container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 1rem 0;">ไม่มีวันหยุดในเร็วๆ นี้</div>';
                    return;
                }

                sortedHolidays.forEach(h => {
                    const daysDiff = Math.ceil((h.dateObj - now) / (1000 * 60 * 60 * 24));
                    let countdownText = '';
                    if (daysDiff === 0) countdownText = 'วันนี้!';
                    else if (daysDiff === 1) countdownText = 'พรุ่งนี้';
                    else countdownText = `อีก ${daysDiff} วัน`;

                    const dateStr = h.dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                    
                    const item = document.createElement('div');
                    item.style.display = 'flex';
                    item.style.justifyContent = 'space-between';
                    item.style.padding = '0.35rem 0.5rem';
                    item.style.borderBottom = '1px solid var(--border-color)';
                    
                    let typeBadge = '';
                    if (h.type === 'buddhist') {
                        typeBadge = '<span style="color:var(--accent-cyan);margin-right:4px">วันพระ</span>';
                    }

                    item.innerHTML = `
                        <div style="display:flex;flex-direction:column;">
                            <span>${typeBadge}${h.name}</span>
                            <span style="font-size:0.65rem;color:var(--text-muted)">${dateStr}</span>
                        </div>
                        <span style="font-weight:600;color:var(--primary-color)">${countdownText}</span>
                    `;
                    container.appendChild(item);
                });
            }
        } catch (error) {
            console.error('Error loading holiday calendar:', error);
        }
    }


    // --- RANDOM FOOD RECOMMENDER ---
    initRandomFood() {
        const foods = [
            { emoji: '🍜', name: 'ก๋วยเตี๋ยวเรือ', cat: 'อาหารน้ำ', price: '40-60' },
            { emoji: '🍛', name: 'ข้าวแกงกะหรี่ไก่', cat: 'อาหารจานเดียว', price: '50-80' },
            { emoji: '🥘', name: 'ต้มยำกุ้ง', cat: 'อาหารน้ำ', price: '80-150' },
            { emoji: '🍗', name: 'ข้าวมันไก่', cat: 'อาหารจานเดียว', price: '40-60' },
            { emoji: '🥩', name: 'หมูกระทะ', cat: 'ปิ้งย่าง/บุฟเฟ่ต์', price: '199-399' },
            { emoji: '🍲', name: 'สุกี้ยากี้', cat: 'อาหารหม้อไฟ', price: '150-299' },
            { emoji: '🌶️', name: 'ผัดกะเพราหมูสับ', cat: 'อาหารจานเดียว', price: '40-60' },
            { emoji: '🍤', name: 'ผัดไทยกุ้งสด', cat: 'อาหารผัด', price: '50-80' },
            { emoji: '🥗', name: 'ส้มตำไทย', cat: 'อาหารอีสาน', price: '40-60' },
            { emoji: '🍖', name: 'ข้าวขาหมู', cat: 'อาหารจานเดียว', price: '50-70' },
            { emoji: '🐟', name: 'ปลาทอดน้ำปลา + ข้าวสวย', cat: 'อาหารทะเล', price: '80-120' },
            { emoji: '🍳', name: 'ข้าวผัดปู', cat: 'อาหารผัด', price: '60-100' },
            { emoji: '🥟', name: 'เกี๊ยวน้ำหมูสับ', cat: 'อาหารน้ำ', price: '40-60' },
            { emoji: '🍝', name: 'ผัดซีอิ๊วหมูกรอบ', cat: 'อาหารผัด', price: '40-60' },
            { emoji: '🥙', name: 'ข้าวซอยไก่', cat: 'อาหารเหนือ', price: '50-70' },
            { emoji: '🧆', name: 'ลาบหมู', cat: 'อาหารอีสาน', price: '50-70' },
            { emoji: '🐔', name: 'ไก่ทอดหาดใหญ่', cat: 'อาหารทอด', price: '50-80' },
            { emoji: '🍕', name: 'พิซซ่า', cat: 'ฟาสต์ฟู้ด', price: '199-399' },
            { emoji: '🍔', name: 'เบอร์เกอร์เนื้อ', cat: 'ฟาสต์ฟู้ด', price: '99-199' },
            { emoji: '🍣', name: 'ซูชิ / ข้าวหน้าปลาดิบ', cat: 'อาหารญี่ปุ่น', price: '150-350' },
            { emoji: '🍱', name: 'ข้าวกล่องเบนโตะ', cat: 'อาหารญี่ปุ่น', price: '99-189' },
            { emoji: '🥡', name: 'ข้าวหมูแดง', cat: 'อาหารจานเดียว', price: '40-60' },
            { emoji: '🫕', name: 'ชาบูบุฟเฟ่ต์', cat: 'อาหารหม้อไฟ', price: '199-499' },
            { emoji: '🥚', name: 'ข้าวไข่เจียวหมูสับ', cat: 'อาหารจานเดียว', price: '35-50' },
            { emoji: '🌮', name: 'แหนมเนือง', cat: 'อาหารเวียดนาม', price: '80-150' },
        ];

        const btn = document.getElementById('btn-random-food');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const food = foods[Math.floor(Math.random() * foods.length)];
            const emojiEl = document.getElementById('food-emoji');
            const nameEl = document.getElementById('food-name');
            const catEl = document.getElementById('food-category');
            const priceEl = document.getElementById('food-price');
            // Animate spin
            if (emojiEl) { emojiEl.style.transition = 'transform 0.4s'; emojiEl.style.transform = 'rotate(360deg)'; setTimeout(() => emojiEl.style.transform = '', 400); }
            if (emojiEl) emojiEl.textContent = food.emoji;
            if (nameEl) nameEl.textContent = food.name;
            if (catEl) catEl.textContent = `ประเภท: ${food.cat}`;
            if (priceEl) priceEl.textContent = `ราคาประมาณ: ${food.price} บาท`;
        });
    }


    // --- LUCKY NUMBER GENERATOR ---
    initLuckyNumberGenerator() {
        const btnTab2 = document.getElementById('btn-lucky-2');
        const btnTab3 = document.getElementById('btn-lucky-3');
        const btnGen = document.getElementById('btn-gen-lucky');
        const digit1 = document.getElementById('lucky-digit-1');
        const digit2 = document.getElementById('lucky-digit-2');
        const digit3 = document.getElementById('lucky-digit-3');

        if (!btnTab2 || !btnTab3 || !btnGen || !digit1 || !digit2 || !digit3) return;

        let mode = 2;

        btnTab2.addEventListener('click', () => {
            mode = 2;
            btnTab2.classList.add('active');
            btnTab3.classList.remove('active');
            digit3.style.display = 'none';
            digit1.textContent = '?';
            digit2.textContent = '?';
        });

        btnTab3.addEventListener('click', () => {
            mode = 3;
            btnTab3.classList.add('active');
            btnTab2.classList.remove('active');
            digit3.style.display = 'flex';
            digit1.textContent = '?';
            digit2.textContent = '?';
            digit3.textContent = '?';
        });

        btnGen.addEventListener('click', () => {
            btnGen.disabled = true;

            digit1.classList.add('rolling');
            digit2.classList.add('rolling');
            if (mode === 3) digit3.classList.add('rolling');

            let counter = 0;
            const interval = setInterval(() => {
                digit1.textContent = Math.floor(Math.random() * 10);
                digit2.textContent = Math.floor(Math.random() * 10);
                if (mode === 3) digit3.textContent = Math.floor(Math.random() * 10);
                
                counter++;
                if (counter >= 15) {
                    clearInterval(interval);
                    
                    digit1.classList.remove('rolling');
                    digit2.classList.remove('rolling');
                    if (mode === 3) digit3.classList.remove('rolling');

                    digit1.textContent = Math.floor(Math.random() * 10);
                    digit2.textContent = Math.floor(Math.random() * 10);
                    if (mode === 3) {
                        digit3.textContent = Math.floor(Math.random() * 10);
                    }
                    
                    btnGen.disabled = false;
                }
            }, 50);
        });
    }


    // --- DAILY TAROT READER ---
    initTarotReader() {
        const btnDraw = document.getElementById('btn-draw-tarot');
        const cardContainer = document.getElementById('tarot-card-container');
        const cardInner = document.getElementById('tarot-card-inner');
        const cardIcon = document.getElementById('tarot-icon');
        const cardName = document.getElementById('tarot-name');
        const cardMiniDesc = document.getElementById('tarot-mini-desc');
        const fullPred = document.getElementById('tarot-full-prediction');

        if (!btnDraw || !cardContainer || !cardInner || !cardIcon || !cardName || !cardMiniDesc || !fullPred) return;

        const tarotCards = [
            {
                name: 'The Sun',
                icon: 'sun',
                mini: 'ความสำเร็จและก้าวหน้า',
                full: '☀️ วันนี้ดวงชะตาของคุณจะเปี่ยมไปด้วยพลังบวกและความสดใส มีโอกาสได้รับข่าวดีเรื่องงานหรือโครงการที่ทำสำเร็จอย่างดีเด่น แสงอาทิตย์พร้อมเปิดทางให้คุณก้าวหน้าอย่างมั่นใจ!'
            },
            {
                name: 'The Moon',
                icon: 'moon',
                mini: 'การทบทวนภายในและสัญชาตญาณ',
                full: '🌙 วันนี้คุณอาจจะมีความรู้สึกอ่อนไหวหรือกังวลกับความไม่แน่นอน แนะนำให้เชื่อในสัญชาตญาณของตัวเอง ปล่อยใจให้สบาย และหลีกเลี่ยงการด่วนตัดสินใจเรื่องสำคัญค่ะ'
            },
            {
                name: 'The Fool',
                icon: 'compass',
                mini: 'การเริ่มต้นและอิสระใหม่',
                full: '🎒 ถึงเวลาเปิดรับเรื่องราวใหม่ๆ และเริ่มก้าวเดินอย่างไร้ความกังวลแล้ว วันนี้มีเกณฑ์พบโอกาสท้าทายใหม่ๆ หรือได้ลองทำสิ่งนอกกรอบที่ทำให้คุณรู้สึกเป็นอิสระและมีความสุข'
            },
            {
                name: 'The Star',
                icon: 'star',
                mini: 'ความหวังและการเยียวยา',
                full: '⭐ ไพ่แห่งความหวังและการเริ่มต้นใหม่ของจิตใจ หากเผชิญปัญหาอยู่จะได้รับการคลี่คลาย มีความราบรื่นและมีผู้คอยช่วยเหลือเยียวยา เป็นวันที่ดีในการผ่อนคลายและเติมพลังบวก'
            },
            {
                name: 'The World',
                icon: 'globe',
                mini: 'ความสำเร็จและจุดสูงสุด',
                full: '🌍 ยินดีด้วยค่ะ! แผนการต่างๆ ที่คุณพยายามทำมาอย่างเหน็ดเหนื่อยจะสำเร็จลุล่วงด้วยดี เป็นช่วงเวลาแห่งความสุขสมบูรณ์ การบรรลุเป้าหมาย และการเริ่มต้นรอบใหม่ชีวิตที่ดียิ่งขึ้น'
            },
            {
                name: 'The Magician',
                icon: 'wand',
                mini: 'ความสามารถพิเศษและการดลบันดาล',
                full: '🔮 วันนี้เป็นวันที่ศักยภาพในตัวคุณจะพุ่งสูง ปัญญาเฉียบคม แก้ไขปัญหาเฉพาะหน้าได้อย่างมหัศจรรย์ ทุกเป้าหมายที่คุณริเริ่มลงมือทำจะมีโอกาสสำเร็จได้ด้วยทักษะของคุณเอง'
            },
            {
                name: 'The Empress',
                icon: 'crown',
                mini: 'ความอุดมสมบูรณ์และความรัก',
                full: '👑 วันนี้คุณจะได้พบกับความราบรื่น อุดมสมบูรณ์ไปด้วยลาภผลและการดูแลเอาใจใส่จากคนรอบข้าง ความรักเบ่งบาน เหมาะสำหรับงานสร้างสรรค์และดูแลความอบอุ่นในครอบครัว'
            },
            {
                name: 'Strength',
                icon: 'shield',
                mini: 'ความกล้าหาญและพลังใจ',
                full: '🦁 วันนี้คุณจะต้องใช้ความกล้าหาญและความอดทนในการควบคุมสถานการณ์ แต่ด้วยสติและน้ำใจที่นุ่มนวล คุณจะสามารถเอาชนะอุปสรรคหรือเอาชนะใจผู้อื่นได้อย่างสวยงามแน่นอนค่ะ'
            },
            {
                name: 'Wheel of Fortune',
                icon: 'activity',
                mini: 'การเปลี่ยนแปลงและโชคลาภ',
                full: '🎡 วงล้อแห่งโชคชะตากำลังหมุนเวียนเปลี่ยนไปในทิศทางที่ดีขึ้น เรื่องราวแย่ๆ จะเริ่มคลี่คลาย และอาจจะมีโชคลาภลอยหรือจังหวะโอกาสชีวิตที่ดีเข้ามาหาคุณอย่างไม่คาดฝัน'
            },
            {
                name: 'Justice',
                icon: 'scale',
                mini: 'ความถูกต้องและสมดุล',
                full: '⚖️ วันนี้เน้นความซื่อสัตย์ การประเมินผลอย่างยุติธรรม และการมีเหตุผล หากมีการเซ็นสัญญาหรือการเจรจาตกลงใดๆ จะได้ผลลัพธ์ที่เป็นธรรมและโปร่งใสกับทุกฝ่ายค่ะ'
            }
        ];

        let drawing = false;

        const drawCard = () => {
            if (drawing) return;
            drawing = true;

            if (cardContainer.classList.contains('flipped')) {
                cardContainer.classList.remove('flipped');
                setTimeout(() => {
                    performDraw();
                }, 300);
            } else {
                performDraw();
            }
        };

        const performDraw = () => {
            const randomCard = tarotCards[Math.floor(Math.random() * tarotCards.length)];
            
            cardIcon.setAttribute('data-lucide', randomCard.icon);
            cardName.textContent = randomCard.name;
            cardMiniDesc.textContent = randomCard.mini;
            fullPred.textContent = randomCard.full;

            if (window.lucide) window.lucide.createIcons();

            cardContainer.classList.add('flipped');
            
            setTimeout(() => {
                drawing = false;
            }, 800);
        };

        btnDraw.addEventListener('click', drawCard);
        cardContainer.addEventListener('click', drawCard);
    }


    // --- BREAK-TIME MINI GAMES ---
    initMiniGames() {
        const btnSnakeTab = document.getElementById('btn-game-snake');
        const btnPuzzleTab = document.getElementById('btn-game-puzzle');
        const snakeArea = document.getElementById('game-snake-area');
        const puzzleArea = document.getElementById('game-puzzle-area');

        if (!btnSnakeTab || !btnPuzzleTab || !snakeArea || !puzzleArea) return;

        btnSnakeTab.addEventListener('click', () => {
            btnSnakeTab.classList.add('active');
            btnPuzzleTab.classList.remove('active');
            snakeArea.style.display = 'flex';
            puzzleArea.style.display = 'none';
        });

        btnPuzzleTab.addEventListener('click', () => {
            btnPuzzleTab.classList.add('active');
            btnSnakeTab.classList.remove('active');
            puzzleArea.style.display = 'flex';
            snakeArea.style.display = 'none';
            initPuzzleGame();
        });

        const canvas = document.getElementById('snake-canvas');
        const btnStartSnake = document.getElementById('btn-start-snake');
        const scoreVal = document.getElementById('snake-score');
        
        if (!canvas || !btnStartSnake || !scoreVal) return;
        const ctx = canvas.getContext('2d');
        const CELL_SIZE = 10;
        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;
        
        let snake = [];
        let food = { x: 0, y: 0 };
        let dx = CELL_SIZE;
        let dy = 0;
        let score = 0;
        let snakeGameInterval = null;
        let isSnakePlaying = false;
        let changingDirection = false;

        const resetSnake = () => {
            snake = [
                { x: 50, y: 50 },
                { x: 40, y: 50 },
                { x: 30, y: 50 }
            ];
            dx = CELL_SIZE;
            dy = 0;
            score = 0;
            scoreVal.textContent = '0';
            spawnFood();
        };

        const spawnFood = () => {
            const cols = Math.floor(WIDTH / CELL_SIZE);
            const rows = Math.floor(HEIGHT / CELL_SIZE);
            
            let onSnake = true;
            while (onSnake) {
                food.x = Math.floor(Math.random() * cols) * CELL_SIZE;
                food.y = Math.floor(Math.random() * rows) * CELL_SIZE;
                onSnake = snake.some(part => part.x === food.x && part.y === food.y);
            }
        };

        const drawGrid = () => {
            ctx.fillStyle = '#111827';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
        };

        const drawPart = (part) => {
            ctx.fillStyle = 'var(--accent-amber)';
            ctx.strokeStyle = '#111827';
            ctx.fillRect(part.x, part.y, CELL_SIZE, CELL_SIZE);
            ctx.strokeRect(part.x, part.y, CELL_SIZE, CELL_SIZE);
        };

        const drawSnake = () => {
            snake.forEach(drawPart);
        };

        const drawFood = () => {
            ctx.fillStyle = 'var(--accent-red)';
            ctx.fillRect(food.x, food.y, CELL_SIZE, CELL_SIZE);
        };

        const moveSnake = () => {
            const head = { x: snake[0].x + dx, y: snake[0].y + dy };
            
            if (head.x < 0 || head.x >= WIDTH || head.y < 0 || head.y >= HEIGHT) {
                gameOver();
                return;
            }

            if (snake.some(part => part.x === head.x && part.y === head.y)) {
                gameOver();
                return;
            }

            snake.unshift(head);
            
            if (head.x === food.x && head.y === food.y) {
                score += 10;
                scoreVal.textContent = score;
                spawnFood();
            } else {
                snake.pop();
            }
        };

        const gameOver = () => {
            isSnakePlaying = false;
            clearInterval(snakeGameInterval);
            btnStartSnake.textContent = 'เริ่มใหม่';
            btnStartSnake.disabled = false;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            ctx.fillStyle = '#fff';
            ctx.font = '14px var(--font-thai)';
            ctx.textAlign = 'center';
            ctx.fillText('จบเกม! (Game Over)', WIDTH / 2, HEIGHT / 2 - 10);
            ctx.font = '11px var(--font-thai)';
            ctx.fillText(`คะแนนสะสม: ${score} คะแนน`, WIDTH / 2, HEIGHT / 2 + 10);
        };

        const tick = () => {
            changingDirection = false;
            moveSnake();
            if (isSnakePlaying) {
                drawGrid();
                drawFood();
                drawSnake();
            }
        };

        const handleKeys = (e) => {
            if (!isSnakePlaying) return;

            const LEFT_KEY = 37;
            const UP_KEY = 38;
            const RIGHT_KEY = 39;
            const DOWN_KEY = 40;

            if (changingDirection) return;

            const keyPressed = e.keyCode;
            const goingUp = dy === -CELL_SIZE;
            const goingDown = dy === CELL_SIZE;
            const goingRight = dx === CELL_SIZE;
            const goingLeft = dx === -CELL_SIZE;

            if ([LEFT_KEY, UP_KEY, RIGHT_KEY, DOWN_KEY].includes(keyPressed)) {
                e.preventDefault();
            }

            if (keyPressed === LEFT_KEY && !goingRight) {
                dx = -CELL_SIZE;
                dy = 0;
                changingDirection = true;
            }
            if (keyPressed === UP_KEY && !goingDown) {
                dx = 0;
                dy = -CELL_SIZE;
                changingDirection = true;
            }
            if (keyPressed === RIGHT_KEY && !goingLeft) {
                dx = CELL_SIZE;
                dy = 0;
                changingDirection = true;
            }
            if (keyPressed === DOWN_KEY && !goingUp) {
                dx = 0;
                dy = CELL_SIZE;
                changingDirection = true;
            }
        };

        btnStartSnake.addEventListener('click', () => {
            resetSnake();
            isSnakePlaying = true;
            btnStartSnake.textContent = 'กำลังเล่น';
            btnStartSnake.disabled = true;
            
            if (snakeGameInterval) clearInterval(snakeGameInterval);
            snakeGameInterval = setInterval(tick, 100);
        });

        window.addEventListener('keydown', handleKeys);

        const puzzleGrid = document.getElementById('puzzle-grid');
        const puzzleMoves = document.getElementById('puzzle-moves');
        const btnResetPuzzle = document.getElementById('btn-reset-puzzle');

        let tiles = [];
        let moves = 0;

        const initPuzzleGame = () => {
            moves = 0;
            if (puzzleMoves) puzzleMoves.textContent = '0';
            
            tiles = Array.from({ length: 15 }, (_, i) => i + 1);
            tiles.push('');

            shuffleTiles();
            renderPuzzleGrid();
        };

        const shuffleTiles = () => {
            let emptyIdx = 15;
            for (let i = 0; i < 100; i++) {
                const validMoves = getValidMoves(emptyIdx);
                const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
                
                tiles[emptyIdx] = tiles[randomMove];
                tiles[randomMove] = '';
                emptyIdx = randomMove;
            }
        };

        const getValidMoves = (idx) => {
            const row = Math.floor(idx / 4);
            const col = idx % 4;
            const moves = [];

            if (row > 0) moves.push(idx - 4);
            if (row < 3) moves.push(idx + 4);
            if (col > 0) moves.push(idx - 1);
            if (col < 3) moves.push(idx + 1);

            return moves;
        };

        const renderPuzzleGrid = () => {
            if (!puzzleGrid) return;
            puzzleGrid.innerHTML = '';

            tiles.forEach((val, idx) => {
                const tile = document.createElement('div');
                tile.className = 'puzzle-tile';
                if (val === '') {
                    tile.classList.add('empty');
                } else {
                    tile.textContent = val;
                    tile.addEventListener('click', () => handleTileClick(idx));
                }
                puzzleGrid.appendChild(tile);
            });
        };

        const handleTileClick = (idx) => {
            const emptyIdx = tiles.indexOf('');
            const rowClick = Math.floor(idx / 4);
            const colClick = idx % 4;
            const rowEmpty = Math.floor(emptyIdx / 4);
            const colEmpty = emptyIdx % 4;

            const isAdjacent = (Math.abs(rowClick - rowEmpty) + Math.abs(colClick - colEmpty)) === 1;

            if (isAdjacent) {
                tiles[emptyIdx] = tiles[idx];
                tiles[idx] = '';
                
                moves++;
                if (puzzleMoves) puzzleMoves.textContent = moves;

                renderPuzzleGrid();
                checkWinCondition();
            }
        };

        const checkWinCondition = () => {
            let isWon = true;
            for (let i = 0; i < 15; i++) {
                if (tiles[i] !== i + 1) {
                    isWon = false;
                    break;
                }
            }

            if (isWon) {
                setTimeout(() => {
                    alert(`ยินดีด้วย! คุณสามารถจัดเรียงบล็อกตัวเลขสำเร็จใน ${moves} ก้าวค่ะ!`);
                    initPuzzleGame();
                }, 100);
            }
        };

        if (btnResetPuzzle) {
            btnResetPuzzle.addEventListener('click', initPuzzleGame);
        }

        initPuzzleGame();
    }


    // --- SMART TRAVEL PACKING ASSISTANT ---
    initPackingAssistant() {
        const tripSelect = document.getElementById('packing-trip-type');
        const btnGen = document.getElementById('btn-gen-packing');
        const container = document.getElementById('packing-list-container');
        const emptyMsg = document.getElementById('packing-empty-msg');

        if (!tripSelect || !btnGen || !container) return;

        const lists = {
            beach: ['ชุดว่ายน้ำ (Swimwear)', 'ครีมกันแดด (Sunscreen)', 'แว่นตากันแดด (Sunglasses)', 'ผ้าเช็ดตัวชายหาด (Beach Towel)', 'รองเท้าแตะ (Flip Flops)', 'หมวกปีกกว้าง (Wide Hat)', 'ยาประจำตัว/พารา', 'แปรงสีฟันและยาสีฟัน', 'ซองกันน้ำใส่มือถือ'],
            mountain: ['รองเท้าเดินป่า (Hiking Boots)', 'กระบอกน้ำพกพา (Water Bottle)', 'สเปรย์กันยุง/กันทาก', 'ไฟฉาย/ไฟคาดหัว (Flashlight)', 'เสื้อคลุมกันลม/กันฝน', 'ชุดปฐมพยาบาลพกพา', 'พาวเวอร์แบงค์ (Power Bank)', 'ทิชชู่เปียก (Wet Wipes)', 'อาหารแห้ง/ขนมพลังงานสูง'],
            cold: ['เสื้อโค้ทหนา/ขนเป็ด', 'ลองจอห์น (Thermal Wear)', 'ถุงมือหนาและผ้าพันคอ', 'หมวกไหมพรม (Beanie)', 'ลิปบาล์มและโลชั่นทาผิว', 'ถุงเท้าหนาและบูทเดินหิมะ', 'แผ่นแปะร้อน (Heat Packs)', 'ร่มพกพา/เสื้อกันฝน', 'ยาแก้แพ้/แก้หวัด'],
            business: ['เสื้อผ้าสุภาพ/เสื้อเชิ้ตรีดเรียบ', 'สูทหรือเสื้อคลุมทำงาน', 'โน้ตบุ๊กและอแดปเตอร์ชาร์จ', 'สมุดบันทึกและปากกา', 'นามบัตร (Business Cards)', 'แปรงสีฟันและน้ำยาบ้วนปาก', 'ที่โกนหนวด/เครื่องแต่งหน้า', 'พาสปอร์ต/บัตรประชาชน', 'ที่ชาร์จสำรอง (Power Bank)']
        };

        const renderList = () => {
            const tripType = tripSelect.value;
            const items = lists[tripType];
            
            if (!items) return;

            container.innerHTML = '';
            if (emptyMsg) emptyMsg.style.display = 'none';

            const checkedKey = `siam_packing_checked_${tripType}`;
            let checkedItems = [];
            const saved = localStorage.getItem(checkedKey);
            if (saved) {
                checkedItems = JSON.parse(saved);
            }

            items.forEach(itemText => {
                const itemRow = document.createElement('label');
                itemRow.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; cursor: pointer; user-select: none; padding: 0.15rem 0;';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = checkedItems.includes(itemText);
                checkbox.style.cssText = 'cursor: pointer; accent-color: var(--accent-blue);';

                const textSpan = document.createElement('span');
                textSpan.textContent = itemText;
                if (checkbox.checked) {
                    textSpan.style.textDecoration = 'line-through';
                    textSpan.style.color = 'var(--text-muted)';
                }

                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        textSpan.style.textDecoration = 'line-through';
                        textSpan.style.color = 'var(--text-muted)';
                        if (!checkedItems.includes(itemText)) {
                            checkedItems.push(itemText);
                        }
                    } else {
                        textSpan.style.textDecoration = '';
                        textSpan.style.color = '';
                        checkedItems = checkedItems.filter(i => i !== itemText);
                    }
                    localStorage.setItem(checkedKey, JSON.stringify(checkedItems));
                });

                itemRow.appendChild(checkbox);
                itemRow.appendChild(textSpan);
                container.appendChild(itemRow);
            });
        };

        btnGen.addEventListener('click', renderList);
        renderList();
    }

}

window.lifestyleService = new LifestyleService();
