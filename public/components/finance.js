class FinanceService {
    constructor() {
        this.goldPrices = { barBuy: 40500, barSell: 40600, jewelryBuy: 39764, jewelrySell: 41100 };
        this.exchangeRates = null;
        this.init();
    }

    init() {
        // Currency exchange events
        const currencyInput = document.getElementById('currency-input-amount');
        const currencySelectSource = document.getElementById('currency-select-source');
        const currencySelectTarget = document.getElementById('currency-select-target');
        const btnCurrencySwap = document.getElementById('btn-currency-swap');

        if (currencyInput && currencySelectSource && currencySelectTarget) {
            currencyInput.addEventListener('input', () => this.convertCurrency());
            currencySelectSource.addEventListener('change', () => this.convertCurrency());
            currencySelectTarget.addEventListener('change', () => this.convertCurrency());
        }

        if (btnCurrencySwap && currencySelectSource && currencySelectTarget) {
            btnCurrencySwap.addEventListener('click', () => {
                btnCurrencySwap.style.transform = btnCurrencySwap.style.transform === 'rotate(180deg)' ? 'rotate(0deg)' : 'rotate(180deg)';
                const temp = currencySelectSource.value;
                currencySelectSource.value = currencySelectTarget.value;
                currencySelectTarget.value = temp;
                this.convertCurrency();
            });
        }

        this.updateOilPrices();
        this.updateGoldPrices();
        this.fetchExchangeRates();
        this.updateCryptoPrices();
        this.updateCommodityPrices();
        this.initTaxCalculator();
        this.initLoanCalculator();
        this.initBudgetTracker();
    }


    // --- OIL PRICE TRACKER SERVICE ---
    async updateOilPrices() {
        const tbody = document.getElementById('oil-comparison-tbody');
        const pageUpdateTime = document.getElementById('oil-page-update-time');
        const nextChangeInfo = document.getElementById('oil-next-change-info');

        if (!tbody) return;

        try {
            const [bcpRes, pttRes] = await Promise.all([
                fetch('/api/oil').then(r => r.json()).catch(err => { console.error(err); return { success: false }; }),
                fetch('/api/ptt-oil').then(r => r.json()).catch(err => { console.error(err); return { success: false }; })
            ]);

            if (bcpRes.success || pttRes.success) {
                tbody.innerHTML = '';
                
                if (pageUpdateTime) {
                    const effectiveStr = bcpRes.success ? bcpRes.effectiveDate : 'วันนี้';
                    pageUpdateTime.textContent = `ข้อมูลจากบางจาก & ปตท. ณ วันที่มีผล: ${effectiveStr}`;
                }

                const productMapping = [
                    { key: 'gsh95', name: 'แก๊สโซฮอล์ 95', bcpName: 'แก๊สโซฮอล์ 95 S EVO', pttName: 'เบนซินแก๊สโซฮอล์ 95', shellPrem: 0.50 },
                    { key: 'gsh91', name: 'แก๊สโซฮอล์ 91', bcpName: 'แก๊สโซฮอล์ 91 S EVO', pttName: 'เบนซินแก๊สโซฮอล์ 91', shellPrem: 0.50 },
                    { key: 'e20', name: 'แก๊สโซฮอล์ E20', bcpName: 'แก๊สโซฮอล์ E20 S EVO', pttName: 'เบนซินแก๊สโซฮอล์ E20', shellPrem: 0.50 },
                    { key: 'e85', name: 'แก๊สโซฮอล์ E85', bcpName: 'แก๊สโซฮอล์ E85 S EVO', pttName: 'เบนซินแก๊สโซฮอล์ E85', shellPrem: null },
                    { key: 'premium95', name: 'แก๊สโซฮอล์ 95 พรีเมียม', bcpName: 'ไฮ พรีเมียม 97 พลัส', pttName: 'Super Power GSH95', shellPrem: -1.15 },
                    { key: 'gasoline95', name: 'เบนซิน 95', bcpName: null, pttName: 'เบนซิน', shellPrem: null },
                    { key: 'diesel', name: 'ดีเซล B7', bcpName: 'ไฮดีเซล S', pttName: 'ดีเซล', shellPrem: 0.00 },
                    { key: 'diesel_b20', name: 'ดีเซล B20', bcpName: 'ดีเซล B20', pttName: 'ดีเซล B20', shellPrem: 0.00 },
                    { key: 'premium_diesel', name: 'ดีเซล พรีเมียม', bcpName: 'ไฮ พรีเมียม ดีเซล พลัส', pttName: 'Super Power Diesel', shellPrem: -7.41 }
                ];

                const getBcpPrice = (bcpName) => {
                    if (!bcpName || !bcpRes.success || !bcpRes.prices) return null;
                    const found = bcpRes.prices.find(p => p.name.trim() === bcpName);
                    return found ? parseFloat(found.tomorrow) : null;
                };

                const getPttPrice = (pttName) => {
                    if (!pttName || !pttRes.success || !pttRes.prices) return null;
                    const found = pttRes.prices.find(p => p.product.trim() === pttName);
                    return found ? parseFloat(found.price) : null;
                };

                productMapping.forEach(item => {
                    const bcpPrice = getBcpPrice(item.bcpName);
                    const pttPrice = getPttPrice(item.pttName);
                    
                    const basePriceForShell = pttPrice !== null ? pttPrice : bcpPrice;
                    let shellPrice = null;
                    if (basePriceForShell !== null && item.shellPrem !== null) {
                        shellPrice = basePriceForShell + item.shellPrem;
                    }

                    const fmt = (val) => val !== null && !isNaN(val) ? `${val.toFixed(2)}` : '-';

                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid var(--border-color)';
                    tr.innerHTML = `
                        <td style="padding: 0.85rem 1rem; font-weight: 500;">${item.name}</td>
                        <td style="padding: 0.85rem 1rem; text-align: right; font-family: var(--font-english); font-weight: 600;">${fmt(pttPrice)}</td>
                        <td style="padding: 0.85rem 1rem; text-align: right; font-family: var(--font-english); font-weight: 600; color: var(--accent-cyan);">${fmt(bcpPrice)}</td>
                        <td style="padding: 0.85rem 1rem; text-align: right; font-family: var(--font-english); font-weight: 600; color: var(--accent-amber);">${fmt(shellPrice)}</td>
                    `;
                    tbody.appendChild(tr);
                });

                if (nextChangeInfo && bcpRes.success && bcpRes.prices) {
                    const diffs = bcpRes.prices.filter(p => parseFloat(p.diffTomorrow) !== 0);
                    if (diffs.length > 0) {
                        const changeType = parseFloat(diffs[0].diffTomorrow) > 0 ? 'ปรับขึ้น' : 'ปรับลด';
                        const changeColor = changeType === 'ปรับขึ้น' ? 'var(--accent-red)' : 'var(--accent-green)';
                        const amt = Math.abs(parseFloat(diffs[0].diffTomorrow)).toFixed(2);
                        nextChangeInfo.innerHTML = `<i data-lucide="info" style="display:inline-block;width:14px;height:14px;vertical-align:middle;margin-right:4px"></i> แจ้งเตือน: ราคาน้ำมันจะ ${changeType} ประมาณ ${amt} บาท/ลิตร ในวันพรุ่งนี้`;
                        nextChangeInfo.style.color = changeColor;
                    } else {
                        nextChangeInfo.textContent = 'ราคาน้ำมันพรุ่งนี้ไม่มีการเปลี่ยนแปลง';
                        nextChangeInfo.style.color = 'var(--text-muted)';
                    }
                }
                
                if (window.lucide) window.lucide.createIcons();
            } else {
                throw new Error('Both PTT and BCP endpoints failed');
            }
        } catch (error) {
            console.error('Error loading compared oil prices:', error);
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem 0; color: var(--accent-red);">ไม่สามารถเชื่อมต่อข้อมูลราคาน้ำมันขายปลีกเปรียบเทียบได้ในขณะนี้</td></tr>`;
        }
    }



    // --- GOLD TRACKER SERVICE ---
    async updateGoldPrices() {
        try {
            const response = await fetch('/api/gold');
            if (!response.ok) throw new Error('Gold API call failed');
            const data = await response.json();

            if (data && data.success) {
                const barBuy = document.getElementById('gold-bar-buy');
                const barSell = document.getElementById('gold-bar-sell');
                const jewelryBuy = document.getElementById('gold-jewelry-buy');
                const jewelrySell = document.getElementById('gold-jewelry-sell');
                const updateTime = document.getElementById('gold-update-time');

                const addBahtSuffix = (str) => str.includes('บาท') ? str : `${str} บาท`;

                if (barBuy) barBuy.textContent = addBahtSuffix(data.barBuy);
                if (barSell) barSell.textContent = addBahtSuffix(data.barSell);
                if (jewelryBuy) jewelryBuy.textContent = addBahtSuffix(data.jewelryBuy);
                if (jewelrySell) jewelrySell.textContent = addBahtSuffix(data.jewelrySell);

                if (updateTime) {
                    updateTime.textContent = `อัปเดตล่าสุด: ${data.date} (${data.source})`;
                }
            }
        } catch (error) {
            console.error('Error updating gold prices from API:', error);
        }
    }



    // --- CURRENCY CONVERTER SERVICE ---
    async fetchExchangeRates() {
        try {
            // Using a completely free API with no keys: Open Exchange Rate API (CORS enabled)
            const response = await fetch('https://open.er-api.com/v6/latest/USD');
            if (!response.ok) throw new Error('Currency API call failed');
            const data = await response.json();
            
            if (data && data.rates) {
                this.exchangeRates = data.rates;
                this.convertCurrency();
            }
        } catch (error) {
            console.error('Error fetching currency rates:', error);
            // Backup static rates if offline/API fails
            this.exchangeRates = { THB: 36.5, USD: 1.0, EUR: 0.92, JPY: 156.4, CNY: 7.25, SGD: 1.35, GBP: 0.78 };
            this.convertCurrency();
        }
    }



    convertCurrency() {
        if (!this.exchangeRates) return;

        const inputAmt = parseFloat(document.getElementById('currency-input-amount').value);
        const sourceCur = document.getElementById('currency-select-source').value;
        const targetCur = document.getElementById('currency-select-target').value;
        const resultAmt = document.getElementById('currency-result-amount');
        const resultUnit = document.getElementById('currency-result-unit');
        const rateInfo = document.getElementById('currency-rate-info');

        if (!resultAmt || !rateInfo || isNaN(inputAmt) || inputAmt <= 0) {
            if (resultAmt) resultAmt.textContent = '0.00';
            return;
        }

        // Conversion formula: From Source -> Target via USD base
        const sourceRate = this.exchangeRates[sourceCur];
        const targetRate = this.exchangeRates[targetCur];
        
        // 1 Source = (1 / sourceRate) * targetRate Target
        const singleRate = (1 / sourceRate) * targetRate;
        const totalConverted = inputAmt * singleRate;

        resultAmt.textContent = totalConverted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (resultUnit) resultUnit.textContent = targetCur;
        rateInfo.textContent = `อัตราแลกเปลี่ยนปัจจุบัน: 1 ${sourceCur} = ${singleRate.toFixed(5)} ${targetCur} (หรือ 1 ${targetCur} = ${(1/singleRate).toFixed(4)} ${sourceCur})`;
    }


    // --- CRYPTO PRICES SERVICE ---
    async updateCryptoPrices() {
        const btcEl = document.getElementById('crypto-price-btc');
        const btcThb = document.getElementById('crypto-thb-btc');
        const ethEl = document.getElementById('crypto-price-eth');
        const ethThb = document.getElementById('crypto-thb-eth');
        const bnbEl = document.getElementById('crypto-price-bnb');
        const bnbThb = document.getElementById('crypto-thb-bnb');

        try {
            const response = await fetch('/api/crypto');
            if (!response.ok) throw new Error('Crypto API request failed');
            const data = await response.json();

            let usdToThb = 36.5;
            if (this.exchangeRates && this.exchangeRates.THB) {
                usdToThb = this.exchangeRates.THB;
            }

            if (data && data.success) {
                const btc = data.rates.BTC;
                const eth = data.rates.ETH;
                const bnb = data.rates.BNB;

                if (btcEl) btcEl.textContent = `$${btc.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
                if (btcThb) btcThb.textContent = `${Math.round(btc * usdToThb).toLocaleString('th-TH')} THB`;

                if (ethEl) ethEl.textContent = `$${eth.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
                if (ethThb) ethThb.textContent = `${Math.round(eth * usdToThb).toLocaleString('th-TH')} THB`;

                if (bnbEl) bnbEl.textContent = `$${bnb.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
                if (bnbThb) bnbThb.textContent = `${Math.round(bnb * usdToThb).toLocaleString('th-TH')} THB`;
            }
        } catch (error) {
            console.error('Error loading crypto prices:', error);
        }
    }


    // --- COMMODITIES PRICES SERVICE ---
    async updateCommodityPrices() {
        const brentEl = document.getElementById('commodity-brent');
        const wtiEl = document.getElementById('commodity-wti');
        const rubberEl = document.getElementById('commodity-rubber');
        const riceEl = document.getElementById('commodity-rice');
        const palmEl = document.getElementById('commodity-palm');

        try {
            const response = await fetch('/api/commodities');
            if (!response.ok) throw new Error('Commodities API request failed');
            const data = await response.json();

            if (data && data.success) {
                if (brentEl) brentEl.textContent = `$${data.brent.toFixed(2)} USD`;
                if (wtiEl) wtiEl.textContent = `$${data.wti.toFixed(2)} USD`;
                
                if (rubberEl) rubberEl.textContent = `${data.agricultural.rubber.toFixed(2)} บาท/กก.`;
                if (riceEl) riceEl.textContent = `${data.agricultural.rice.toLocaleString('th-TH')} บาท/ตัน`;
                if (palmEl) palmEl.textContent = `${data.agricultural.palm.toFixed(2)} บาท/กก.`;
            }
        } catch (error) {
            console.error('Error loading commodities prices:', error);
        }
    }


    // --- TAX CALCULATOR SERVICE ---
    initTaxCalculator() {
        const btnCalc = document.getElementById('btn-calc-tax');
        const inputSalary = document.getElementById('tax-monthly-salary');
        const inputDeductions = document.getElementById('tax-custom-deductions');
        const resultVal = document.getElementById('tax-result-value');
        const bracketInfo = document.getElementById('tax-bracket-info');

        if (!btnCalc || !inputSalary || !inputDeductions || !resultVal || !bracketInfo) return;

        btnCalc.addEventListener('click', () => {
            const monthlySalary = parseFloat(inputSalary.value);
            const extraDeductions = parseFloat(inputDeductions.value) || 0;

            if (isNaN(monthlySalary) || monthlySalary <= 0) {
                alert('กรุณากรอกเงินเดือนสุทธิที่ถูกต้อง');
                return;
            }

            const annualIncome = monthlySalary * 12;
            const standardExpenses = Math.min(annualIncome * 0.5, 100000);
            const personalDeduction = 60000;
            const socialSecurity = 9000;

            const netTaxableIncome = annualIncome - standardExpenses - personalDeduction - socialSecurity - extraDeductions;

            if (netTaxableIncome <= 150000) {
                resultVal.textContent = '0.00 บาท';
                bracketInfo.textContent = 'ฐานภาษีสูงสุด: 0% (ยกเว้นภาษี)';
                resultVal.style.color = 'var(--text-main)';
                return;
            }

            let accumulatedTax = 0;
            let currentBracketRate = 0;
            let tempIncome = netTaxableIncome;

            if (tempIncome > 5000000) {
                accumulatedTax += (tempIncome - 5000000) * 0.35;
                tempIncome = 5000000;
                currentBracketRate = Math.max(currentBracketRate, 35);
            }
            if (tempIncome > 2000000) {
                accumulatedTax += (tempIncome - 2000000) * 0.30;
                tempIncome = 2000000;
                currentBracketRate = Math.max(currentBracketRate, 30);
            }
            if (tempIncome > 1000000) {
                accumulatedTax += (tempIncome - 1000000) * 0.25;
                tempIncome = 1000000;
                currentBracketRate = Math.max(currentBracketRate, 25);
            }
            if (tempIncome > 750000) {
                accumulatedTax += (tempIncome - 750000) * 0.20;
                tempIncome = 750000;
                currentBracketRate = Math.max(currentBracketRate, 20);
            }
            if (tempIncome > 500000) {
                accumulatedTax += (tempIncome - 500000) * 0.15;
                tempIncome = 500000;
                currentBracketRate = Math.max(currentBracketRate, 15);
            }
            if (tempIncome > 300000) {
                accumulatedTax += (tempIncome - 300000) * 0.10;
                tempIncome = 300000;
                currentBracketRate = Math.max(currentBracketRate, 10);
            }
            if (tempIncome > 150000) {
                accumulatedTax += (tempIncome - 150000) * 0.05;
                currentBracketRate = Math.max(currentBracketRate, 5);
            }

            resultVal.textContent = `${accumulatedTax.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
            bracketInfo.textContent = `ฐานภาษีสูงสุดของคุณ: ${currentBracketRate}%`;
            resultVal.style.color = 'var(--accent-amber)';
        });
    }


    // --- LOAN CALCULATOR ---
    initLoanCalculator() {
        const btn = document.getElementById('btn-calc-loan');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const principal = parseFloat(document.getElementById('loan-amount').value);
            const annualRate = parseFloat(document.getElementById('loan-interest').value) / 100;
            const years = parseInt(document.getElementById('loan-years').value);
            if (isNaN(principal) || isNaN(annualRate) || isNaN(years) || principal <= 0 || years <= 0) return;
            
            const monthlyRate = annualRate / 12;
            const numPayments = years * 12;
            let monthly;
            if (monthlyRate === 0) {
                monthly = principal / numPayments;
            } else {
                monthly = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
            }
            const totalPay = monthly * numPayments;
            const totalInterest = totalPay - principal;

            document.getElementById('loan-monthly').textContent = `${monthly.toLocaleString('th-TH', {maximumFractionDigits: 0})} บาท`;
            document.getElementById('loan-total-interest').textContent = `${totalInterest.toLocaleString('th-TH', {maximumFractionDigits: 0})} บาท`;
            document.getElementById('loan-total-pay').textContent = `ยอดชำระรวม: ${totalPay.toLocaleString('th-TH', {maximumFractionDigits: 0})} บาท (${numPayments} งวด)`;
        });
    }


    // --- MINI BUDGET TRACKER ---
    initBudgetTracker() {
        const balanceVal = document.getElementById('budget-balance');
        const incomeVal = document.getElementById('budget-income-total');
        const expenseVal = document.getElementById('budget-expense-total');
        const descInput = document.getElementById('budget-desc');
        const amountInput = document.getElementById('budget-amount');
        
        const btnExpense = document.getElementById('btn-budget-expense');
        const btnIncome = document.getElementById('btn-budget-income');
        const btnAdd = document.getElementById('btn-add-budget');
        const btnClear = document.getElementById('btn-clear-budget');
        const historyContainer = document.getElementById('budget-history');
        const emptyMsg = document.getElementById('budget-empty-msg');

        if (!balanceVal || !incomeVal || !expenseVal || !descInput || !amountInput || !historyContainer) return;

        let chartWrapper = document.getElementById('budget-chart-wrapper');
        if (!chartWrapper) {
            chartWrapper = document.createElement('div');
            chartWrapper.id = 'budget-chart-wrapper';
            chartWrapper.style.cssText = 'display: flex; justify-content: center; align-items: center; margin: 0.5rem 0; gap: 1rem;';
            const balanceDiv = balanceVal.closest('div');
            if (balanceDiv) {
                balanceDiv.parentNode.insertBefore(chartWrapper, balanceDiv.nextSibling);
            }
        }

        let currentType = 'expense';

        if (btnExpense && btnIncome) {
            btnExpense.addEventListener('click', () => {
                currentType = 'expense';
                btnExpense.classList.add('active');
                btnExpense.style.cssText = 'padding: 0.35rem 0; font-size: 0.75rem; background: rgba(239, 68, 68, 0.1); color: var(--accent-red); border-color: rgba(239, 68, 68, 0.2);';
                btnIncome.classList.remove('active');
                btnIncome.style.cssText = 'padding: 0.35rem 0; font-size: 0.75rem;';
            });

            btnIncome.addEventListener('click', () => {
                currentType = 'income';
                btnIncome.classList.add('active');
                btnIncome.style.cssText = 'padding: 0.35rem 0; font-size: 0.75rem; background: rgba(20, 184, 166, 0.1); color: var(--accent-teal); border-color: rgba(20, 184, 166, 0.2);';
                btnExpense.classList.remove('active');
                btnExpense.style.cssText = 'padding: 0.35rem 0; font-size: 0.75rem;';
            });
        }

        let transactions = [];
        const saved = localStorage.getItem('siam_daily_budget_transactions');
        if (saved) {
            try {
                transactions = JSON.parse(saved);
            } catch(e) {
                console.error('Failed to parse budget transactions', e);
            }
        }

        const updateUI = () => {
            historyContainer.innerHTML = '';
            
            let totalIncome = 0;
            let totalExpense = 0;

            const categories = {
                food: { label: '🍔 อาหาร', amount: 0, color: 'var(--accent-orange, #f97316)' },
                travel: { label: '🚗 เดินทาง', amount: 0, color: 'var(--accent-cyan, #06b6d4)' },
                bills: { label: '⚡ ค่าประจำ', amount: 0, color: 'var(--accent-amber, #f59e0b)' },
                shopping: { label: '🛍️ ช็อปปิ้ง', amount: 0, color: 'var(--accent-pink, #ec4899)' },
                other: { label: '🎸 อื่นๆ', amount: 0, color: 'var(--accent-purple, #8b5cf6)' }
            };

            if (transactions.length === 0) {
                emptyMsg.style.display = 'block';
                historyContainer.appendChild(emptyMsg);
            } else {
                emptyMsg.style.display = 'none';
                transactions.forEach((tx, idx) => {
                    if (tx.type === 'income') {
                        totalIncome += tx.amount;
                    } else {
                        totalExpense += tx.amount;
                        const cat = tx.category || 'other';
                        if (categories[cat]) {
                            categories[cat].amount += tx.amount;
                        } else {
                            categories.other.amount += tx.amount;
                        }
                    }

                    const item = document.createElement('div');
                    item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid rgba(255,255,255,0.02);';
                    
                    const descSpan = document.createElement('span');
                    const catEmoji = tx.type === 'income' ? '💰' : (categories[tx.category]?.label.split(' ')[0] || '🎸');
                    descSpan.textContent = `${catEmoji} ${tx.desc}`;
                    descSpan.style.textOverflow = 'ellipsis';
                    descSpan.style.overflow = 'hidden';
                    descSpan.style.whiteSpace = 'nowrap';
                    descSpan.style.maxWidth = '120px';

                    const amountSpan = document.createElement('span');
                    amountSpan.textContent = `${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()} บ.`;
                    amountSpan.style.fontWeight = '600';
                    amountSpan.className = tx.type === 'income' ? 'text-teal' : 'text-red';

                    const deleteBtn = document.createElement('button');
                    deleteBtn.innerHTML = '×';
                    deleteBtn.style.cssText = 'background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.9rem; padding: 0 0.25rem;';
                    deleteBtn.addEventListener('click', () => {
                        transactions.splice(idx, 1);
                        localStorage.setItem('siam_daily_budget_transactions', JSON.stringify(transactions));
                        if (window.appCoordinator && typeof window.appCoordinator.syncDataToCloud === 'function') {
                            window.appCoordinator.syncDataToCloud();
                        }
                        updateUI();
                    });

                    const leftGroup = document.createElement('div');
                    leftGroup.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';
                    leftGroup.appendChild(descSpan);

                    const rightGroup = document.createElement('div');
                    rightGroup.style.cssText = 'display: flex; align-items: center; gap: 0.4rem;';
                    rightGroup.appendChild(amountSpan);
                    rightGroup.appendChild(deleteBtn);

                    item.appendChild(leftGroup);
                    item.appendChild(rightGroup);
                    historyContainer.appendChild(item);
                });
            }

            const balance = totalIncome - totalExpense;
            balanceVal.textContent = `${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
            balanceVal.className = balance >= 0 ? 'text-teal' : 'text-red';

            incomeVal.textContent = totalIncome.toLocaleString();
            expenseVal.textContent = totalExpense.toLocaleString();

            chartWrapper.innerHTML = '';
            
            const total = totalIncome + totalExpense;
            let donutBg = 'var(--border-color)';
            let balancePercentText = '0%';
            
            if (total > 0) {
                const incPercent = (totalIncome / total) * 100;
                donutBg = `conic-gradient(var(--accent-teal) 0% ${incPercent}%, var(--accent-red) ${incPercent}% 100%)`;
                balancePercentText = `${Math.round((totalIncome / total) * 100)}%`;
            }

            const chart = document.createElement('div');
            chart.style.cssText = `width: 70px; height: 70px; border-radius: 50%; background: ${donutBg}; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: background 0.5s ease;`;

            const hole = document.createElement('div');
            hole.style.cssText = `width: 46px; height: 46px; border-radius: 50%; background: var(--bg-card); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 0.65rem; color: var(--text-color); font-weight: 700;`;
            
            const pctLabel = document.createElement('span');
            pctLabel.textContent = balancePercentText;
            pctLabel.className = 'text-teal';
            pctLabel.style.fontSize = '0.75rem';
            
            const subLabel = document.createElement('span');
            subLabel.textContent = 'รายรับ';
            subLabel.style.cssText = 'font-size: 0.5rem; color: var(--text-muted); margin-top: -2px;';

            hole.appendChild(pctLabel);
            hole.appendChild(subLabel);
            chart.appendChild(hole);

            const legend = document.createElement('div');
            legend.style.cssText = 'display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.7rem;';
            
            const incLegend = document.createElement('div');
            incLegend.style.cssText = 'display: flex; align-items: center; gap: 0.35rem;';
            incLegend.innerHTML = `<span style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-teal); display: inline-block;"></span> <span>รายรับ: ${totalIncome.toLocaleString()}</span>`;
            
            const expLegend = document.createElement('div');
            expLegend.style.cssText = 'display: flex; align-items: center; gap: 0.35rem;';
            expLegend.innerHTML = `<span style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-red); display: inline-block;"></span> <span>รายจ่าย: ${totalExpense.toLocaleString()}</span>`;

            legend.appendChild(incLegend);
            legend.appendChild(expLegend);

            chartWrapper.appendChild(chart);
            chartWrapper.appendChild(legend);

            // Category progress breakdown rendering
            let catBreakdown = document.getElementById('budget-category-breakdown');
            if (!catBreakdown) {
                catBreakdown = document.createElement('div');
                catBreakdown.id = 'budget-category-breakdown';
                catBreakdown.style.cssText = 'display: flex; flex-direction: column; gap: 0.45rem; margin-top: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 0.5rem; font-size: 0.75rem;';
                chartWrapper.parentNode.insertBefore(catBreakdown, chartWrapper.nextSibling);
            }

            catBreakdown.innerHTML = '';
            if (totalExpense > 0) {
                const title = document.createElement('div');
                title.style.cssText = 'font-weight: 600; color: var(--text-muted); font-size: 0.7rem; margin-bottom: 0.25rem;';
                title.textContent = 'วิเคราะห์รายจ่ายแยกตามหมวดหมู่:';
                catBreakdown.appendChild(title);

                Object.keys(categories).forEach(key => {
                    const cat = categories[key];
                    if (cat.amount > 0) {
                        const pct = Math.round((cat.amount / totalExpense) * 100);
                        
                        const row = document.createElement('div');
                        row.style.cssText = 'display: flex; flex-direction: column; gap: 3px;';
                        
                        const textRow = document.createElement('div');
                        textRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
                        
                        const labelSpan = document.createElement('span');
                        labelSpan.textContent = cat.label;
                        
                        const valSpan = document.createElement('span');
                        valSpan.innerHTML = `<strong>${cat.amount.toLocaleString()} บ.</strong> (${pct}%)`;
                        valSpan.style.color = cat.color;

                        textRow.appendChild(labelSpan);
                        textRow.appendChild(valSpan);
                        
                        const progressBg = document.createElement('div');
                        progressBg.style.cssText = 'width: 100%; height: 5px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden;';
                        
                        const progressBar = document.createElement('div');
                        progressBar.style.cssText = `width: ${pct}%; height: 100%; background: ${cat.color}; border-radius: 10px; box-shadow: 0 0 5px ${cat.color};`;
                        
                        progressBg.appendChild(progressBar);
                        row.appendChild(textRow);
                        row.appendChild(progressBg);
                        catBreakdown.appendChild(row);
                    }
                });
            }
        };

        btnAdd.addEventListener('click', () => {
            const desc = descInput.value.trim();
            const amount = parseFloat(amountInput.value);
            const categoryEl = document.getElementById('budget-category');
            const category = categoryEl ? categoryEl.value : 'other';

            if (!desc) {
                alert('กรุณากรอกรายละเอียดรายการเงินด้วยค่ะ');
                return;
            }
            if (isNaN(amount) || amount <= 0) {
                alert('กรุณากรอกจำนวนเงินให้ถูกต้องด้วยค่ะ');
                return;
            }

            transactions.unshift({
                id: Date.now(),
                desc,
                amount,
                type: currentType,
                category
            });

            localStorage.setItem('siam_daily_budget_transactions', JSON.stringify(transactions));
            if (window.appCoordinator && typeof window.appCoordinator.syncDataToCloud === 'function') {
                window.appCoordinator.syncDataToCloud();
            }
            
            descInput.value = '';
            amountInput.value = '';

            updateUI();
        });

        btnClear.addEventListener('click', () => {
            if (confirm('คุณต้องการล้างประวัติรายรับ-รายจ่ายทั้งหมดใช่หรือไม่?')) {
                transactions = [];
                localStorage.setItem('siam_daily_budget_transactions', JSON.stringify(transactions));
                if (window.appCoordinator && typeof window.appCoordinator.syncDataToCloud === 'function') {
                    window.appCoordinator.syncDataToCloud();
                }
                updateUI();
            }
        });

        updateUI();
    }

}

window.financeService = new FinanceService();
