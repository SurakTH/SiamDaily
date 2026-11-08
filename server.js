const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const Parser = require('rss-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const dns = require('dns');

const app = express();
app.set('trust proxy', 1); // Enable trusting X-Forwarded-For headers for reverse proxies

// Global SSRF IP validator covering IPv4, IPv6, and IPv4-mapped IPv6 ranges
const isPrivateIp = (ip) => {
    let normalized = ip.trim().toLowerCase();
    if (normalized.startsWith('::ffff:')) {
        normalized = normalized.substring(7);
    }
    // IPv4 check
    if (normalized === '127.0.0.1' || normalized === 'localhost') return true;
    if (/^192\.168\./.test(normalized)) return true;
    if (/^10\./.test(normalized)) return true;
    if (/^169\.254\./.test(normalized)) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(normalized)) return true;

    // IPv6 check
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fe80:')) return true; // Link-local
    if (normalized.startsWith('fc00:') || normalized.startsWith('fd00:')) return true; // Unique local
    
    return false;
};

const parser = new Parser({ timeout: 6000 });
const PORT = process.env.PORT || 8000;

// Security Middlewares
app.use(helmet({
    contentSecurityPolicy: false // Disabled to support arbitrary external custom user images and links
}));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3000, // Greatly increased to prevent blocking normal heavy dashboard usage
    message: { success: false, message: 'Too many requests, please try again later.' }
});

app.use('/api/', apiLimiter);
const corsOptionsDelegate = function (req, callback) {
    let corsOptions;
    const origin = req.header('Origin');
    if (!origin) {
        corsOptions = { origin: true };
    } else {
        try {
            const originHost = new URL(origin).host;
            const reqHost = req.header('host');
            if (originHost === reqHost) {
                corsOptions = { origin: true };
            } else {
                corsOptions = { origin: false };
            }
        } catch (e) {
            corsOptions = { origin: false };
        }
    }
    callback(null, corsOptions);
};
app.use(cors(corsOptionsDelegate));
app.use(express.json());

const fs = require('fs');

// Server-side view assembly: inject all view HTML into the shell before serving
const VIEW_NAMES = ['dashboard','weather','traffic','oil','news','utilities','emergency','services','monitoring','health','budget','account'];
let assembledHtml = null;

function buildAssembledHtml() {
    let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    for (const name of VIEW_NAMES) {
        const viewPath = path.join(__dirname, 'public', 'views', `${name}.html`);
        try {
            const viewContent = fs.readFileSync(viewPath, 'utf8');
            const placeholder = new RegExp(`(<div id="view-${name}" class="tab-pane[^"]*">)(</div>)`);
            html = html.replace(placeholder, `$1${viewContent}$2`);
        } catch(e) { console.error(`Failed to load view: ${name}`, e); }
    }
    return html;
}

app.get('/', (req, res) => {
    if (!assembledHtml) assembledHtml = buildAssembledHtml();
    res.type('html').send(assembledHtml);
});

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Cache in memory to prevent rate-limiting/over-scraping
let goldCache = { data: null, timestamp: 0 };
let newsCache = { data: null, timestamp: 0 };

const CACHE_DURATION_GOLD = 5 * 60 * 1000; // 5 minutes cache
const CACHE_DURATION_NEWS = 10 * 60 * 1000; // 10 minutes cache

// 1. Gold Price API Scraper (Thai Gold Association)
app.get('/api/gold', async (req, res) => {
    const now = Date.now();
    
    // Return cache if fresh
    if (goldCache.data && (now - goldCache.timestamp < CACHE_DURATION_GOLD)) {
        return res.json(goldCache.data);
    }

    try {
        const response = await axios.get('https://classic.goldtraders.or.th/default.aspx', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 5000
        });

        const $ = cheerio.load(response.data);
        const barBuy = $('#DetailPlace_uc_goldprices1_lblBLBuy').text().trim();
        const barSell = $('#DetailPlace_uc_goldprices1_lblBLSell').text().trim();
        const jewelryBuy = $('#DetailPlace_uc_goldprices1_lblOMBuy').text().trim();
        const jewelrySell = $('#DetailPlace_uc_goldprices1_lblOMSell').text().trim();
        const date = $('#DetailPlace_uc_goldprices1_lblAsTime').text().trim();

        if (!barBuy || !barSell) {
            throw new Error('Gold scraping element matches were empty on classic site');
        }

        const data = {
            success: true,
            barBuy: barBuy,
            barSell: barSell,
            jewelryBuy: jewelryBuy,
            jewelrySell: jewelrySell,
            date: date,
            source: 'สมาคมค้าทองคำ (Gold Traders Association) - ข้อมูลจริง',
            live: true
        };

        goldCache = { data, timestamp: now };
        res.json(data);

    } catch (error) {
        console.error('Gold Scraper Error, falling back to public Vercel Gold API or Mock:', error.message);
        
        // Secondary Fallback: Try Vercel Thai Gold API
        try {
            const fbResponse = await axios.get('https://thai-gold-api.vercel.app/latest', { timeout: 3000 });
            if (fbResponse.data && fbResponse.data.response) {
                const g = fbResponse.data.response;
                const data = {
                    success: true,
                    barBuy: g.gold_bar.buy,
                    barSell: g.gold_bar.sell,
                    jewelryBuy: g.gold_ornament.buy,
                    jewelrySell: g.gold_ornament.sell,
                    date: fbResponse.data.response.date || 'อัปเดตล่าสุดวันนี้',
                    source: 'สมาคมค้าทองคำ (ผ่าน API สำรอง)',
                    live: true
                };
                goldCache = { data, timestamp: now };
                return res.json(data);
            }
        } catch (fbErr) {
            console.error('Secondary Gold API fallback failed:', fbErr.message);
        }

        // Tertiary Fallback: return cached or simulated data if server has absolutely no network access
        if (goldCache.data) {
            return res.json({ ...goldCache.data, live: false, date: goldCache.data.date + ' (ข้อมูลชั่วคราว)' });
        }

        res.json({
            success: true,
            barBuy: '40,500',
            barSell: '40,600',
            jewelryBuy: '39,764',
            jewelrySell: '41,100',
            date: 'ข้อมูลออฟไลน์ชั่วคราว',
            source: 'ระบบจำลองฐานข้อมูล',
            live: false
        });
    }
});

// Return curated static database on failure
const localDatabase = [
    {
        id: 1,
        title: 'กทม. แจ้งเตือนเฝ้าระวังฝนฟ้าคะนองในหลายเขตเย็นนี้ แนะวางแผนหลีกเลี่ยงการจราจรติดขัด',
        summary: 'คาดการณ์มีฝนตกชุกร้อยละ 60 ของพื้นที่ กรุงเทพฯ และปริมณฑล เตรียมรับมือปริมาณน้ำฝนสะสมบริเวณจุดเสี่ยงน้ำท่วมขัง ถนนสายหลักต่างๆ',
        category: 'weather-warning',
        source: 'กรมอุตุฯ ประเทศไทย',
        date: 'วันนี้',
        img: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=400&q=80',
        link: '#'
    },
    {
        id: 2,
        title: 'รัฐบาลส่งสัญญาณกระตุ้นอสังหาฯ และท่องเที่ยว หนุนเศรษฐกิจไตรมาสสองฟื้นตัว',
        summary: 'ความคืบหน้ามาตรการด้านการคลัง ผ่อนปรนข้อจำกัดการลงทุนของต่างชาติและการลดหย่อนค่าจดจำนองคาดดัน GDP เติบโตร้อยละ 3.2 ในช่วงครึ่งปีหลัง',
        category: 'business',
        source: 'Economic Digest',
        date: 'วันนี้',
        img: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=400&q=80',
        link: '#'
    },
    {
        id: 3,
        title: 'เทรนด์ AI Developer ในปี 2026 ขยายตัวพุ่งแรง หลังโมเดลรุ่นใหม่รองรับภาษาไทยเต็มรูปแบบ',
        summary: 'ตลาดแรงงานสายเทคโนโลยีหันมาให้ความสนใจการประยุกต์ใช้งาน AI Agents ในองค์กรมากขึ้น หลังโมเดลปัญญาประดิษฐ์ระดับแนวหน้าเข้าใจบริบทไทยอย่างลึกซึ้ง',
        category: 'technology',
        source: 'TechThailand',
        date: 'เมื่อวานนี้',
        img: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=400&q=80',
        link: '#'
    }
];

// --- BACKGROUND NEWS POLLING ---
async function pollNews() {
    console.log('[Background] Polling News RSS feeds...');
    try {
        const [feedNews, feedTech, feedMoney] = await Promise.all([
            parser.parseURL('http://rssfeeds.sanook.com/rss/feeds/sanook/news.index.xml').catch(err => {
                console.error('Failed to parse Sanook General RSS:', err.message);
                return { items: [] };
            }),
            parser.parseURL('http://rssfeeds.sanook.com/rss/feeds/sanook/hitech.xml').catch(err => {
                console.error('Failed to parse Sanook Hi-Tech RSS:', err.message);
                return { items: [] };
            }),
            parser.parseURL('http://rssfeeds.sanook.com/rss/feeds/sanook/money.xml').catch(err => {
                console.error('Failed to parse Sanook Money RSS:', err.message);
                return { items: [] };
            })
        ]);

        const articles = [];
        const extractImage = (item) => {
            if (item.enclosure && item.enclosure.url) return item.enclosure.url;
            const content = item.content || '';
            const match = content.match(/<img[^>]+src="([^">]+)"/);
            return match ? match[1] : '';
        };

        const processFeed = (feed, defaultCat, fallbackImgURL) => {
            feed.items.forEach((item, index) => {
                const title = item.title || '';
                const link = item.link || '#';
                const pubDate = item.pubDate || '';
                const cleanDesc = item.contentSnippet || '';
                const summary = cleanDesc.substring(0, 160) + (cleanDesc.length > 160 ? '...' : '');

                let formattedDate = 'เมื่อเร็วๆ นี้';
                if (pubDate) {
                    const d = new Date(pubDate);
                    formattedDate = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                }

                let cat = defaultCat;
                if (defaultCat === 'general' && (title.includes('ฝน') || title.includes('พายุ') || title.includes('น้ำท่วม') || title.includes('กรมอุตุ'))) {
                    cat = 'weather-warning';
                }

                const rawImg = extractImage(item);
                const finalImgURL = cat === 'weather-warning' ? 'https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?auto=format&fit=crop&w=400&q=80' : fallbackImgURL;
                const img = rawImg ? `/api/news-image?url=${encodeURIComponent(rawImg)}` : finalImgURL;

                articles.push({
                    id: `${defaultCat}-${index}`,
                    title: title,
                    summary: summary,
                    category: cat,
                    source: `Sanook ${defaultCat}`,
                    date: formattedDate,
                    img: img,
                    link: link,
                    timestamp: pubDate ? new Date(pubDate).getTime() : 0
                });
            });
        };

        processFeed(feedNews, 'general', 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=400&q=80');
        processFeed(feedTech, 'technology', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80');
        processFeed(feedMoney, 'business', 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=400&q=80');

        if (articles.length === 0) throw new Error('Parsed RSS feeds were empty');
        
        articles.sort((a, b) => b.timestamp - a.timestamp);
        newsCache = { data: articles, timestamp: Date.now() };
        console.log(`[Background] News updated successfully. Count: ${articles.length}`);
    } catch (err) {
        console.error('[Background] News Polling failed:', err.message);
    }
}

// Start background polling every 10 minutes
setInterval(pollNews, CACHE_DURATION_NEWS);
pollNews(); // Initial fetch

// Cache for custom RSS feeds to avoid rate-limiting and make loading fast
const customFeedsCache = new Map();
const CACHE_DURATION_CUSTOM_FEED = 5 * 60 * 1000; // 5 minutes cache

async function fetchAndCacheCustomFeed(feedUrl, category, sourceName) {
    const isSafe = await checkSSRFSafe(feedUrl);
    if (!isSafe) {
        console.warn(`Blocked SSRF attempt on custom RSS feed: ${feedUrl}`);
        return [];
    }

    const now = Date.now();
    const cacheKey = `${feedUrl}::${category || 'general'}::${sourceName || ''}`;
    
    if (customFeedsCache.has(cacheKey)) {
        const cached = customFeedsCache.get(cacheKey);
        if (now - cached.timestamp < CACHE_DURATION_CUSTOM_FEED) {
            return cached.data;
        }
    }

    try {
        const feed = await parser.parseURL(feedUrl);
        const articles = [];
        
        const extractImage = (item) => {
            if (item.enclosure && item.enclosure.url) return item.enclosure.url;
            const content = item.content || '';
            const match = content.match(/<img[^>]+src="([^">]+)"/);
            return match ? match[1] : '';
        };

        const feedTitle = sourceName || feed.title || 'RSS Feed';
        
        feed.items.forEach((item, index) => {
            const title = item.title || '';
            const link = item.link || '#';
            const pubDate = item.pubDate || '';
            const cleanDesc = item.contentSnippet || '';
            const summary = cleanDesc.substring(0, 160) + (cleanDesc.length > 160 ? '...' : '');

            let formattedDate = 'เมื่อเร็วๆ นี้';
            if (pubDate) {
                const d = new Date(pubDate);
                formattedDate = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
            }

            let cat = category || 'general';
            if (cat === 'general' && (title.includes('ฝน') || title.includes('พายุ') || title.includes('น้ำท่วม') || title.includes('กรมอุตุ'))) {
                cat = 'weather-warning';
            }

            const rawImg = extractImage(item);
            let fallbackImgURL = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=400&q=80';
            if (cat === 'technology') fallbackImgURL = 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80';
            if (cat === 'business') fallbackImgURL = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=400&q=80';
            if (cat === 'weather-warning') fallbackImgURL = 'https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?auto=format&fit=crop&w=400&q=80';

            const img = rawImg ? `/api/news-image?url=${encodeURIComponent(rawImg)}` : fallbackImgURL;

            articles.push({
                id: `custom-${feedTitle}-${index}`,
                title: title,
                summary: summary,
                category: cat,
                source: feedTitle,
                date: formattedDate,
                img: img,
                link: link,
                timestamp: pubDate ? new Date(pubDate).getTime() : 0
            });
        });

        customFeedsCache.set(cacheKey, { data: articles, timestamp: now });
        return articles;
    } catch (err) {
        console.error(`Failed to parse custom RSS feed (${feedUrl}):`, err.message);
        if (customFeedsCache.has(cacheKey)) {
            return customFeedsCache.get(cacheKey).data;
        }
        return [];
    }
}

// 2. RSS News Feed API Proxy (Supports user custom feeds merge)
app.get('/api/news', async (req, res) => {
    let articles = [];
    if (newsCache.data && newsCache.data.length > 0) {
        articles = [...newsCache.data];
    } else {
        articles = [...localDatabase];
    }

    const { username, token } = req.query;
    if (username && token) {
        const cleanUsername = username.trim().toLowerCase();
        const db = readUserDb();
        const user = Object.prototype.hasOwnProperty.call(db.users, cleanUsername) ? db.users[cleanUsername] : null;

        let isTokenValid = false;
        if (user) {
            if (user.tokens && Array.isArray(user.tokens)) {
                const match = user.tokens.find(t => t.token === token);
                if (match && match.expires > Date.now()) {
                    isTokenValid = true;
                }
            }
            if (!isTokenValid && user.token === token && Date.now() <= user.tokenExpires) {
                isTokenValid = true;
            }
        }

        if (user && isTokenValid && user.data) {
            const customFeedsStr = user.data.siam_news_feeds;
            if (customFeedsStr) {
                try {
                    const customFeeds = JSON.parse(customFeedsStr);
                    if (Array.isArray(customFeeds) && customFeeds.length > 0) {
                        const feedsResults = await Promise.all(
                            customFeeds.map(feed => 
                                fetchAndCacheCustomFeed(feed.url, feed.category, feed.name)
                            )
                        );
                        
                        feedsResults.forEach(feedArticles => {
                            articles = articles.concat(feedArticles);
                        });
                        
                        // Sort combined articles by timestamp descending
                        articles.sort((a, b) => b.timestamp - a.timestamp);
                    }
                } catch (e) {
                    console.error('Error merging custom feeds:', e);
                }
            }
        }
    }

    res.json(articles);
});

// 2.5 News Image Proxy (to bypass hotlinking blocks)
app.get('/api/news-image', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
        return res.status(400).send('Valid HTTP/HTTPS Image URL is required');
    }

    try {
        const response = await secureAxiosGet(imageUrl, {
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.sanook.com/'
            },
            timeout: 5000
        });

        res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        response.data.pipe(res);
    } catch (error) {
        console.error('Failed to proxy image:', imageUrl, error.message);
        res.redirect('https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=400&q=80');
    }
});

// 3. Bangchak Oil Prices API Proxy
app.get('/api/oil', async (req, res) => {
    try {
        const response = await axios.get('https://oil-price.bangchak.co.th/ApiOilPrice2/th', { timeout: 5000 });
        if (response.data && response.data.length > 0) {
            const oilData = response.data[0];
            const parsedList = JSON.parse(oilData.OilList);
            
            const results = parsedList.map(item => ({
                name: item.OilName,
                today: item.PriceToday,
                tomorrow: item.PriceTomorrow,
                yesterday: item.PriceYesterday,
                diffTomorrow: item.PriceDifTomorrow,
                diffYesterday: item.PriceDifYesterday
            }));

            res.json({
                success: true,
                date: oilData.OilDateNow,
                effectiveDate: oilData.OilRemark2.replace('ราคามีผล ณ วันที่ ', ''),
                prices: results
            });
        } else {
            throw new Error('Empty oil data returned from Bangchak');
        }
    } catch (error) {
        console.error('Oil price API error:', error.message);
        res.json({
            success: false,
            message: 'ไม่สามารถดึงข้อมูลราคาน้ำมันได้ในขณะนี้'
        });
    }
});

// 3.1. PTT SOAP Retail Oil Prices API
app.get('/api/ptt-oil', async (req, res) => {
    const url = 'https://orapiweb.pttor.com/oilservice/OilPrice.asmx';
    const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <CurrentOilPrice xmlns="http://www.pttor.com">
      <Language>thai</Language>
    </CurrentOilPrice>
  </soap:Body>
</soap:Envelope>`;

    try {
        const response = await axios.post(url, xmlPayload, {
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': 'http://www.pttor.com/CurrentOilPrice'
            },
            timeout: 5000
        });
        
        const $ = cheerio.load(response.data, { xmlMode: true });
        const resultXml = $('CurrentOilPriceResult').text();
        const $result = cheerio.load(resultXml, { xmlMode: true });
        
        const prices = [];
        $result('FUEL').each((i, el) => {
            const product = $result(el).find('PRODUCT').text().trim();
            const priceStr = $result(el).find('PRICE').text().trim();
            const price = priceStr ? parseFloat(priceStr) : null;
            const date = $result(el).find('PRICE_DATE').text().trim();
            if (product && price !== null && !isNaN(price)) {
                prices.push({ product, price, date });
            }
        });

        res.json({
            success: true,
            prices: prices
        });
    } catch (error) {
        console.error('PTT Oil price SOAP error:', error.message);
        res.json({
            success: false,
            message: 'ไม่สามารถดึงข้อมูลราคาน้ำมัน ปตท. ได้ในขณะนี้'
        });
    }
});

// 3.2. Thai Lottery Scraping API
app.get('/api/lottery', async (req, res) => {
    try {
        const response = await axios.get('https://news.sanook.com/lotto/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 5000
        });

        const $ = cheerio.load(response.data);
        const numbers = [];
        $('.lotto__number').each((i, el) => {
            numbers.push($(el).text().trim());
        });

        const title = $('h1').text().replace('ตรวจหวย', '').trim() || 'งวดล่าสุด';

        if (numbers.length >= 6) {
            res.json({
                success: true,
                drawDate: title,
                firstPrize: numbers[0],
                prefix3: [numbers[1], numbers[2]],
                suffix3: [numbers[3], numbers[4]],
                suffix2: numbers[5]
            });
        } else {
            throw new Error('Not enough lotto numbers parsed');
        }
    } catch (error) {
        console.error('Lottery Scraping Error:', error.message);
        res.json({
            success: true,
            drawDate: 'งวดล่าสุดประจำปี',
            firstPrize: '173770',
            prefix3: ['848', '415'],
            suffix3: ['410', '938'],
            suffix2: '95',
            offline: true
        });
    }
});

// 3.3. Crypto Binance Prices API
app.get('/api/crypto', async (req, res) => {
    try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT"]', { timeout: 3000 });
        const rates = {};
        const changes = {};
        
        if (Array.isArray(response.data)) {
            response.data.forEach(item => {
                const sym = item.symbol.replace('USDT', '');
                rates[sym] = parseFloat(item.lastPrice);
                changes[sym] = parseFloat(item.priceChangePercent);
            });
        }

        res.json({
            success: true,
            rates: rates,
            changes: changes
        });
    } catch (error) {
        console.error('Crypto Binance error:', error.message);
        res.json({
            success: false,
            message: 'ไม่สามารถดึงข้อมูลคริปโตได้ในขณะนี้'
        });
    }
});

// 3.4. Thai Holidays Calendar API
app.get('/api/holidays', (req, res) => {
    const holidays = [
        { date: '2026-01-01', name: 'วันขึ้นปีใหม่', type: 'public' },
        { date: '2026-03-03', name: 'วันมาฆบูชา', type: 'buddhist' },
        { date: '2026-04-06', name: 'วันจักรี', type: 'public' },
        { date: '2026-04-13', name: 'วันสงกรานต์ (วันผู้สูงอายุ)', type: 'public' },
        { date: '2026-04-14', name: 'วันสงกรานต์ (วันครอบครัว)', type: 'public' },
        { date: '2026-04-15', name: 'วันสงกรานต์', type: 'public' },
        { date: '2026-05-01', name: 'วันแรงงานแห่งชาติ', type: 'public' },
        { date: '2026-05-04', name: 'วันฉัตรมงคล', type: 'public' },
        { date: '2026-06-01', name: 'วันวิสาขบูชา', type: 'buddhist' },
        { date: '2026-06-03', name: 'วันเฉลิมพระชนมพรรษาพระบรมราชินี', type: 'public' },
        { date: '2026-07-28', name: 'วันเฉลิมพระชนมพรรษา ร.10', type: 'public' },
        { date: '2026-07-30', name: 'วันอาสาฬหบูชา', type: 'buddhist' },
        { date: '2026-07-31', name: 'วันเข้าพรรษา', type: 'buddhist' },
        { date: '2026-08-12', name: 'วันเฉลิมฯ พระพันปีหลวง (วันแม่)', type: 'public' },
        { date: '2026-10-13', name: 'วันนวมินทรมหาราช (ร.9)', type: 'public' },
        { date: '2026-10-23', name: 'วันปิยมหาราช', type: 'public' },
        { date: '2026-12-05', name: 'วันคล้ายวันประสูติ ร.9 (วันพ่อ)', type: 'public' },
        { date: '2026-12-10', name: 'วันรัฐธรรมนูญ', type: 'public' },
        { date: '2026-12-31', name: 'วันสิ้นปี', type: 'public' }
    ];
    res.json({
        success: true,
        holidays: holidays
    });
});

// 3.5. Commodities & Agricultural Rates API
app.get('/api/commodities', async (req, res) => {
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
        const [brentResp, wtiResp] = await Promise.all([
            axios.get('https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1d&range=1d', { headers, timeout: 3000 }),
            axios.get('https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=1d&range=1d', { headers, timeout: 3000 })
        ]);

        const brent = brentResp.data.chart.result[0].meta.regularMarketPrice;
        const wti = wtiResp.data.chart.result[0].meta.regularMarketPrice;

        res.json({
            success: true,
            brent: brent,
            wti: wti,
            agricultural: {
                rubber: 78.50,
                rice: 15500,
                palm: 5.40
            }
        });
    } catch (error) {
        console.error('Commodities API error:', error.message);
        res.json({
            success: true,
            brent: 82.45,
            wti: 78.12,
            agricultural: {
                rubber: 78.50,
                rice: 15500,
                palm: 5.40
            },
            offline: true
        });
    }
});

// 4. VPS Server Status API
const os = require('os');
const { execFile } = require('child_process');
let lastCpuStats = null;

// --- DIAGNOSTICS & SPEEDTEST API ENDPOINTS ---
const net = require('net');
const crypto = require('crypto');

// A. Ping Test
app.get('/api/diagnostics/ping', (req, res) => {
    const host = req.query.host;
    if (!host || !/^[a-zA-Z0-9.-]+$/.test(host)) {
        return res.json({ success: false, error: 'ที่อยู่โฮสต์ไม่ถูกต้อง (Invalid Hostname/IP)' });
    }
    
    dns.lookup(host, (err, address) => {
        if (err) {
            return res.json({ success: false, error: 'ไม่สามารถค้นหาที่อยู่โฮสต์นี้ได้: ' + err.message });
        }
        if (isPrivateIp(address)) {
            return res.json({ success: false, error: 'ไม่อนุญาตให้เชื่อมต่อโฮสต์ภายในเครือข่ายส่วนตัว (SSRF Blocked)' });
        }
        
        const isWin = os.platform() === 'win32';
        const pingCmd = isWin ? 'ping' : 'ping';
        const args = isWin ? ['-n', '3', address] : ['-c', '3', address];
        
        execFile(pingCmd, args, (error, stdout, stderr) => {
            if (error) {
                return res.json({ success: false, error: error.message, details: stderr || stdout });
            }
            res.json({ success: true, output: stdout });
        });
    });
});

// B. DNS Lookup
app.get('/api/diagnostics/dns', (req, res) => {
    const host = req.query.host;
    if (!host || !/^[a-zA-Z0-9.-]+$/.test(host)) {
        return res.json({ success: false, error: 'ที่อยู่โฮสต์ไม่ถูกต้อง' });
    }
    
    dns.lookup(host, { all: true }, (err, addresses) => {
        if (err) {
            return res.json({ success: false, error: err.message });
        }
        res.json({ success: true, addresses });
    });
});

// C. Port Check
app.get('/api/diagnostics/port', (req, res) => {
    const host = req.query.host;
    const port = parseInt(req.query.port);
    
    if (!host || !/^[a-zA-Z0-9.-]+$/.test(host)) {
        return res.json({ success: false, error: 'ที่อยู่โฮสต์ไม่ถูกต้อง' });
    }
    if (isNaN(port) || port < 1 || port > 65535) {
        return res.json({ success: false, error: 'พอร์ตไม่ถูกต้อง (ต้องอยู่ระหว่าง 1-65535)' });
    }

    dns.lookup(host, (err, address) => {
        if (err) {
            return res.json({ success: false, error: 'ไม่สามารถระบุโฮสต์นี้ได้: ' + err.message });
        }
        if (isPrivateIp(address)) {
            return res.json({ success: false, error: 'ไม่อนุญาตให้ตรวจสอบพอร์ตของโฮสต์ภายในเครือข่ายส่วนตัว (SSRF Blocked)' });
        }

        const socket = net.createConnection(port, address);
        socket.setTimeout(3000);
        
        socket.on('connect', () => {
            socket.end();
            res.json({ success: true, open: true });
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            res.json({ success: true, open: false, reason: 'connection timed out (3000ms)' });
        });
        
        socket.on('error', (err) => {
            res.json({ success: true, open: false, reason: err.message });
        });
    });
});

// D. Speedtest Download Endpoint (asynchronous & non-blocking)
app.get('/api/speedtest/download', (req, res) => {
    const size = parseInt(req.query.size) || 5 * 1024 * 1024; // Default 5MB
    const safeSize = Math.min(size, 20 * 1024 * 1024); // Limit max size to 20MB
    
    // Generate random bytes asynchronously to keep the main event loop responsive
    crypto.randomBytes(safeSize, (err, buffer) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.type('application/octet-stream');
        res.setHeader('Content-Encoding', 'identity');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.send(buffer);
    });
});

// E. Speedtest Upload Endpoint (stream-based receiver to avoid RAM exhaust)
app.post('/api/speedtest/upload', (req, res) => {
    let receivedBytes = 0;
    let limitExceeded = false;
    
    req.on('data', (chunk) => {
        if (limitExceeded) return;
        receivedBytes += chunk.length;
        
        // Block payloads larger than 25MB to prevent memory exhaustion DoS
        if (receivedBytes > 25 * 1024 * 1024) {
            limitExceeded = true;
            req.destroy(); // Terminate incoming upload stream immediately
        }
    });

    req.on('end', () => {
        if (limitExceeded) {
            return res.status(413).json({ success: false, error: 'Payload too large (limit 25MB)' });
        }
        res.json({ success: true, received: receivedBytes });
    });

    req.on('error', (err) => {
        res.status(500).json({ success: false, error: err.message });
    });
});

// F. VPS-to-Internet Speedtest (runs a download test using cloudflare)
app.get('/api/speedtest/server', async (req, res) => {
    const testFileUrl = 'https://speed.cloudflare.com/__down?bytes=10000000'; // 10MB test file
    const startTime = Date.now();
    const controller = new AbortController();

    req.on('close', () => {
        controller.abort();
    });

    try {
        const response = await axios({
            method: 'get',
            url: testFileUrl,
            responseType: 'stream',
            timeout: 10000,
            signal: controller.signal
        });
        
        let downloadedBytes = 0;
        let isResponded = false;

        response.data.on('data', (chunk) => {
            downloadedBytes += chunk.length;
        });
        
        response.data.on('end', () => {
            if (isResponded) return;
            isResponded = true;
            const durationSec = (Date.now() - startTime) / 1000;
            const speedMbps = ((downloadedBytes * 8) / (1024 * 1024)) / durationSec;
            res.json({
                success: true,
                downloadSpeedMbps: speedMbps.toFixed(2),
                bytes: downloadedBytes,
                duration: durationSec.toFixed(2)
            });
        });
        
        response.data.on('error', (err) => {
            if (isResponded) return;
            isResponded = true;
            res.json({ success: false, error: err.message });
        });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.get('/api/server-status', async (req, res) => {
    try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        
        const systemUptime = os.uptime();
        const loadAvg = os.loadavg();

        // Calculate CPU usage percentage dynamically
        const cpus = os.cpus();
        let totalIdle = 0, totalTick = 0;
        if (cpus) {
            cpus.forEach(cpu => {
                for (const type in cpu.times) {
                    totalTick += cpu.times[type];
                }
                totalIdle += cpu.times.idle;
            });
        }
        
        let cpuPercent = 0;
        if (lastCpuStats) {
            const idleDifference = totalIdle - lastCpuStats.idle;
            const totalDifference = totalTick - lastCpuStats.total;
            if (totalDifference > 0) {
                cpuPercent = 100 - (100 * idleDifference / totalDifference);
            }
        }
        lastCpuStats = { idle: totalIdle, total: totalTick };

        // Run df -h / to get root partition disk space (using execFile for safety)
        execFile('df', ['-h', '/'], (error, stdout, stderr) => {
            let diskSize = 'N/A';
            let diskUsed = 'N/A';
            let diskAvail = 'N/A';
            let diskPercent = 'N/A';

            try {
                if (!error && stdout) {
                    const lines = stdout.trim().split('\n');
                    if (lines.length > 1) {
                        const parts = lines[1].split(/\s+/);
                        if (parts.length >= 5) {
                            diskSize = parts[1];
                            diskUsed = parts[2];
                            diskAvail = parts[3];
                            diskPercent = parts[4];
                        }
                    }
                }
            } catch (dfErr) {
                console.error('Failed to parse disk status:', dfErr);
            }

            // Run docker ps to get containers (using execFile for safety)
            execFile('docker', ['ps', '--format', '{{.Names}}||{{.Status}}||{{.RunningFor}}'], (docErr, docStdout, docStderr) => {
                let containers = [];
                try {
                    if (!docErr && docStdout) {
                        const lines = docStdout.trim().split('\n');
                        lines.forEach(line => {
                            if (line.trim()) {
                                const parts = line.split('||');
                                if (parts.length >= 2) {
                                    containers.push({
                                        name: parts[0],
                                        status: parts[1],
                                        uptime: parts[2] || 'N/A'
                                    });
                                }
                            }
                        });
                    }
                } catch (docParseErr) {
                    console.error('Failed to parse docker status:', docParseErr);
                }

                res.json({
                    success: true,
                    cpuLoad: loadAvg[0].toFixed(2),
                    cpuPercent: cpuPercent.toFixed(1),
                    ram: {
                        total: (totalMem / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
                        used: (usedMem / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
                        percent: ((usedMem / totalMem) * 100).toFixed(1) + '%'
                    },
                    disk: {
                        size: diskSize,
                        used: diskUsed,
                        avail: diskAvail,
                        percent: diskPercent
                    },
                    uptime: formatUptime(systemUptime),
                    containers: containers
                });
            });
        });

    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    
    let result = '';
    if (d > 0) result += `${d} วัน `;
    if (h > 0) result += `${h} ชั่วโมง `;
    result += `${m} นาที`;
    return result;
}

app.get('/api/services/ping', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ success: false, error: 'URL is required' });
    }

    try {
        const parsedUrl = new URL(url);
        
        // Resolve domain to IP addresses to prevent DNS Rebinding SSRF bypasses against metadata
        let ips = [];
        try {
            ips = await new Promise((resolve) => {
                dns.lookup(parsedUrl.hostname, { all: true }, (err, addresses) => {
                    if (err) resolve([]);
                    else resolve(addresses.map(val => val.address));
                });
            });
        } catch (dnsErr) {}

        const isMetadataIp = (ip) => {
            return ip === '169.254.169.254' || ip === '192.0.0.192';
        };

        // SSRF Protection: Block cloud provider instance metadata URL targets (direct or resolved)
        if (ips.some(isMetadataIp) || isMetadataIp(parsedUrl.hostname) ||
            parsedUrl.hostname.includes('metadata.google.internal') || 
            parsedUrl.hostname.includes('instance-data')) {
            return res.status(403).json({ success: false, error: 'Forbidden URL target' });
        }

        // Hardened SSRF check: Block other private IP ranges unless they are explicit loopback/docker-host entries
        const allowedHosts = ['localhost', '127.0.0.1', 'host.docker.internal'];
        const isAllowedHost = allowedHosts.includes(parsedUrl.hostname.toLowerCase());
        if (!isAllowedHost) {
            for (const ip of ips) {
                if (isPrivateIp(ip)) {
                    return res.status(403).json({ success: false, error: 'Forbidden URL target (SSRF Blocked)' });
                }
            }
        }
    } catch (e) {
        return res.status(400).json({ success: false, error: 'Invalid URL format' });
    }

    let pingUrl = url;
    if (pingUrl.includes('localhost')) {
        pingUrl = pingUrl.replace('localhost', 'host.docker.internal');
    } else if (pingUrl.includes('127.0.0.1')) {
        pingUrl = pingUrl.replace('127.0.0.1', 'host.docker.internal');
    }

    const start = Date.now();
    try {
        const response = await axios.head(pingUrl, {
            timeout: 2000,
            headers: { 'User-Agent': 'Mozilla/5.0 UptimeMonitor/1.0' },
            validateStatus: () => true
        });
        const latency = Date.now() - start;
        res.json({
            success: true,
            online: true,
            status: response.status,
            latency
        });
    } catch (err) {
        try {
            const response = await axios.get(pingUrl, {
                timeout: 2000,
                headers: { 'User-Agent': 'Mozilla/5.0 UptimeMonitor/1.0' },
                validateStatus: () => true
            });
            const latency = Date.now() - start;
            res.json({
                success: true,
                online: true,
                status: response.status,
                latency
            });
        } catch (getErr) {
            res.json({
                success: true,
                online: false,
                error: getErr.message,
                latency: Date.now() - start
            });
        }
    }
});

// 5. Radio Stream Proxy API (to bypass Mixed Content blocking)
app.get('/api/radio-proxy', async (req, res) => {
    const streamUrl = req.query.url;
    if (!streamUrl || (!streamUrl.startsWith('http://rstream.mcot.net:8000/') && !streamUrl.startsWith('http://rstream.mcot.net/'))) {
        return res.status(400).send('Invalid stream URL');
    }
    
    try {
        const response = await axios({
            method: 'get',
            url: streamUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        res.setHeader('Content-Type', response.headers['content-type'] || 'audio/mpeg');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // Disable caching
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        response.data.pipe(res);
        
        req.on('close', () => {
            if (response.data && typeof response.data.destroy === 'function') {
                response.data.destroy();
            }
        });
    } catch (err) {
        console.error('Radio proxy error:', err.message);
        res.status(500).send('Streaming error');
    }
});

// --- CLOUD SYNC & AUTHENTICATION ENDPOINTS ---
const USER_DB_PATH = path.join(__dirname, 'data', 'users.json');

const REGISTRATION_OPEN = process.env.REGISTRATION_OPEN !== 'false';
const REGISTRATION_KEY = process.env.REGISTRATION_KEY || '';

// Helper to read database
function readUserDb() {
    try {
        const dir = path.dirname(USER_DB_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(USER_DB_PATH)) {
            fs.writeFileSync(USER_DB_PATH, JSON.stringify({ users: {} }), 'utf8');
        }
        return JSON.parse(fs.readFileSync(USER_DB_PATH, 'utf8'));
    } catch (e) {
        console.error('Failed to read user database:', e);
        return { users: {} };
    }
}

// Helper to write database atomically to prevent file corruption
function writeUserDb(db) {
    try {
        const tempPath = USER_DB_PATH + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf8');
        fs.renameSync(tempPath, USER_DB_PATH);
        return true;
    } catch (e) {
        console.error('Failed to write user database:', e);
        return false;
    }
}

// Config endpoint to query registration settings
app.get('/api/auth/config', (req, res) => {
    res.json({
        registrationOpen: REGISTRATION_OPEN,
        registrationKeyRequired: REGISTRATION_KEY !== ''
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    try {
        if (fs.existsSync(USER_DB_PATH)) {
            fs.accessSync(USER_DB_PATH, fs.constants.R_OK | fs.constants.W_OK);
        }
        res.json({ status: 'OK', uptime: process.uptime() });
    } catch (e) {
        res.status(500).json({ status: 'ERROR', error: 'Database file not readable/writable' });
    }
});

// 1. Register
app.post('/api/auth/register', (req, res) => {
    const { username, password, regKey } = req.body;
    if (!REGISTRATION_OPEN) {
        return res.json({ success: false, message: 'การสมัครสมาชิกใหม่ถูกปิดใช้งานโดยผู้ดูแลระบบค่ะ' });
    }
    if (REGISTRATION_KEY !== '' && regKey !== REGISTRATION_KEY) {
        return res.json({ success: false, message: 'รหัสลับการสมัครสมาชิก (Registration Key) ไม่ถูกต้องค่ะ' });
    }

    if (!username || !password) {
        return res.json({ success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วนด้วยค่ะ' });
    }
    const cleanUsername = username.trim().toLowerCase();
    const reservedNames = ['__proto__', 'constructor', 'prototype', 'tostring', 'valueof'];
    if (reservedNames.includes(cleanUsername)) {
        return res.json({ success: false, message: 'ชื่อผู้ใช้นี้ไม่สามารถใช้งานได้ค่ะ' });
    }
    if (cleanUsername.length < 3 || cleanUsername.length > 20 || !/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        return res.json({ success: false, message: 'ชื่อผู้ใช้ต้องมีความยาว 3-20 ตัวอักษร และมีเฉพาะภาษาอังกฤษ ตัวเลข หรือขีดล่างเท่านั้นค่ะ' });
    }
    if (password.length < 6) {
        return res.json({ success: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษรค่ะ' });
    }

    const db = readUserDb();
    if (Object.prototype.hasOwnProperty.call(db.users, cleanUsername)) {
        return res.json({ success: false, message: 'ชื่อผู้ใช้นี้ถูกใช้งานไปแล้วค่ะ กรุณาใช้ชื่ออื่น' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    // Upgrade Hashing to secure PBKDF2 (100,000 iterations, 64-byte key)
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');

    db.users[cleanUsername] = {
        username: username.trim(),
        salt: salt,
        passwordHash: hash,
        algo: 'pbkdf2', // Mark as PBKDF2 hashed
        token: null,
        tokenExpires: null,
        tokens: [], // Store multiple concurrent device sessions
        data: {}
    };

    writeUserDb(db);
    res.json({ success: true, message: 'สมัครสมาชิกสำเร็จแล้วค่ะ! คุณสามารถเข้าสู่ระบบได้แล้ว' });
});

// 2. Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.json({ success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านด้วยค่ะ' });
    }
    const cleanUsername = username.trim().toLowerCase();
    const db = readUserDb();
    const user = Object.prototype.hasOwnProperty.call(db.users, cleanUsername) ? db.users[cleanUsername] : null;

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown Device';

    if (!user) {
        return res.json({ success: false, message: 'ไม่พบชื่อผู้ใช้นี้ หรือรหัสผ่านไม่ถูกต้องค่ะ' });
    }

    let isValid = false;
    if (user.algo === 'pbkdf2') {
        const hash = crypto.pbkdf2Sync(password, user.salt, 100000, 64, 'sha512').toString('hex');
        if (hash === user.passwordHash) {
            isValid = true;
        }
    } else {
        // Fallback backward compatibility: Legacy SHA-256 verify
        const hash = crypto.createHash('sha256').update(password + user.salt).digest('hex');
        if (hash === user.passwordHash) {
            isValid = true;
            // Transparently upgrade legacy hash to secure PBKDF2
            const newSalt = crypto.randomBytes(16).toString('hex');
            const newHash = crypto.pbkdf2Sync(password, newSalt, 100000, 64, 'sha512').toString('hex');
            user.salt = newSalt;
            user.passwordHash = newHash;
            user.algo = 'pbkdf2';
            writeUserDb(db);
        }
    }

    // Initialize login history
    if (!user.loginHistory) {
        user.loginHistory = [];
    }

    if (!isValid) {
        user.loginHistory.unshift({
            timestamp: Date.now(),
            ip: ip,
            userAgent: userAgent,
            success: false
        });
        if (user.loginHistory.length > 20) {
            user.loginHistory.pop();
        }
        writeUserDb(db);
        return res.json({ success: false, message: 'รหัสผ่านไม่ถูกต้องค่ะ' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpires = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    // Ensure tokens array exists
    if (!user.tokens) {
        user.tokens = [];
    }
    // Clean up expired tokens to save space
    user.tokens = user.tokens.filter(t => t.expires > Date.now());
    
    // Add new session token with metadata
    const sessionId = crypto.randomBytes(8).toString('hex');
    user.tokens.push({
        id: sessionId,
        token: token,
        expires: tokenExpires,
        ip: ip,
        userAgent: userAgent,
        lastActive: Date.now()
    });
    
    // Limit to maximum 10 active devices/sessions to prevent abuse
    if (user.tokens.length > 10) {
        user.tokens.shift();
    }

    // Log successful login
    user.loginHistory.unshift({
        timestamp: Date.now(),
        ip: ip,
        userAgent: userAgent,
        success: true
    });
    if (user.loginHistory.length > 20) {
        user.loginHistory.pop();
    }

    // Update legacy single token fields for backward compatibility
    user.token = token;
    user.tokenExpires = tokenExpires;
    
    writeUserDb(db);

    res.json({
        success: true,
        message: 'เข้าสู่ระบบสำเร็จแล้วค่ะ',
        token: token,
        username: user.username,
        data: user.data || {}
    });
});

// 3. Sync Up & Down
app.post('/api/auth/sync', (req, res) => {
    const { username, token, data } = req.body;
    if (!username || !token) {
        return res.json({ success: false, message: 'เซสชันไม่สมบูรณ์ กรุณาเข้าสู่ระบบอีกครั้งค่ะ' });
    }
    const cleanUsername = username.trim().toLowerCase();
    const db = readUserDb();
    const user = Object.prototype.hasOwnProperty.call(db.users, cleanUsername) ? db.users[cleanUsername] : null;

    let isTokenValid = false;
    if (user) {
        // 1. Check inside active tokens list
        if (user.tokens && Array.isArray(user.tokens)) {
            const match = user.tokens.find(t => t.token === token);
            if (match && match.expires > Date.now()) {
                isTokenValid = true;
            }
        }
        // 2. Legacy fallback check
        if (!isTokenValid && user.token === token && Date.now() <= user.tokenExpires) {
            isTokenValid = true;
        }
    }

    if (!user || !isTokenValid) {
        return res.json({ success: false, message: 'เซสชันหมดอายุหรือผิดพลาด กรุณาเข้าสู่ระบบอีกครั้งค่ะ' });
    }

    if (data) {
        // Save client state to cloud
        user.data = data;
        writeUserDb(db);
        return res.json({ success: true, message: 'ซิงก์ข้อมูลไปที่ Cloud สำเร็จแล้วค่ะ' });
    } else {
        // Fetch cloud state to client
        return res.json({ success: true, data: user.data || {} });
    }
});

// Helper to authenticate user from body or headers
function authenticateUser(req, db) {
    const username = req.body.username || req.query.username || req.headers['x-auth-username'];
    const token = req.body.token || req.query.token || req.headers['x-auth-token'];
    if (!username || !token) return null;
    
    const cleanUsername = username.trim().toLowerCase();
    const user = Object.prototype.hasOwnProperty.call(db.users, cleanUsername) ? db.users[cleanUsername] : null;
    if (!user) return null;
    
    let isTokenValid = false;
    if (user.tokens && Array.isArray(user.tokens)) {
        const match = user.tokens.find(t => t.token === token);
        if (match && match.expires > Date.now()) {
            isTokenValid = true;
        }
    }
    if (!isTokenValid && user.token === token && Date.now() <= user.tokenExpires) {
        isTokenValid = true;
    }
    
    return isTokenValid ? user : null;
}

// 4. Change Password
app.post('/api/auth/change-password', (req, res) => {
    const { username, token, currentPassword, newPassword } = req.body;
    if (!username || !token || !currentPassword || !newPassword) {
        return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วนด้วยค่ะ' });
    }
    if (newPassword.length < 6) {
        return res.json({ success: false, message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษรค่ะ' });
    }
    
    const db = readUserDb();
    const user = authenticateUser(req, db);
    if (!user) {
        return res.json({ success: false, message: 'เซสชันหมดอายุหรือผิดพลาด กรุณาเข้าสู่ระบบอีกครั้งค่ะ' });
    }
    
    let isValid = false;
    if (user.algo === 'pbkdf2') {
        const hash = crypto.pbkdf2Sync(currentPassword, user.salt, 100000, 64, 'sha512').toString('hex');
        if (hash === user.passwordHash) {
            isValid = true;
        }
    } else {
        const hash = crypto.createHash('sha256').update(currentPassword + user.salt).digest('hex');
        if (hash === user.passwordHash) {
            isValid = true;
        }
    }
    
    if (!isValid) {
        return res.json({ success: false, message: 'รหัสผ่านปัจจุบันไม่ถูกต้องค่ะ' });
    }
    
    // Update password
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = crypto.pbkdf2Sync(newPassword, newSalt, 100000, 64, 'sha512').toString('hex');
    user.salt = newSalt;
    user.passwordHash = newHash;
    user.algo = 'pbkdf2';
    
    // Revoke other session tokens, keeping only current token
    if (user.tokens && Array.isArray(user.tokens)) {
        user.tokens = user.tokens.filter(t => t.token === token);
    }
    
    writeUserDb(db);
    res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จแล้วค่ะ เซสชันอื่นถูกบังคับให้ออกจากระบบเพื่อความปลอดภัย' });
});

// 5. Get Active Sessions
app.get('/api/auth/sessions', (req, res) => {
    const db = readUserDb();
    const user = authenticateUser(req, db);
    if (!user) {
        return res.json({ success: false, message: 'เซสชันหมดอายุหรือผิดพลาด กรุณาเข้าสู่ระบบอีกครั้งค่ะ' });
    }
    
    const token = req.query.token || req.headers['x-auth-token'];
    
    // Self-healing: generate IDs for existing legacy sessions that don't have one
    let dbChanged = false;
    if (user.tokens && Array.isArray(user.tokens)) {
        user.tokens = user.tokens.map(t => {
            if (!t.id) {
                t.id = crypto.randomBytes(8).toString('hex');
                dbChanged = true;
            }
            return t;
        });
    }
    if (dbChanged) {
        writeUserDb(db);
    }
    
    // Return sessions (omit token secrets)
    const sessions = (user.tokens || []).map(t => ({
        id: t.id,
        ip: t.ip || 'Unknown IP',
        userAgent: t.userAgent || 'Unknown Device',
        expires: t.expires,
        lastActive: t.lastActive || Date.now(),
        isCurrent: t.token === token
    }));
    
    res.json({ success: true, sessions });
});

// 6. Revoke Specific Session
app.post('/api/auth/sessions/revoke', (req, res) => {
    const { sessionId, token } = req.body;
    if (!sessionId) {
        return res.json({ success: false, message: 'กรุณาระบุไอดีเซสชันที่จะยกเลิกด้วยค่ะ' });
    }
    
    const db = readUserDb();
    const user = authenticateUser(req, db);
    if (!user) {
        return res.json({ success: false, message: 'เซสชันหมดอายุหรือผิดพลาด กรุณาเข้าสู่ระบบอีกครั้งค่ะ' });
    }
    
    // Verify current token
    const clientToken = token || req.body.token || req.headers['x-auth-token'];
    
    // Don't allow revoking current session via this endpoint
    const target = (user.tokens || []).find(t => t.id === sessionId);
    if (target && target.token === clientToken) {
        return res.json({ success: false, message: 'ไม่สามารถยกเลิกเซสชันปัจจุบันของคุณได้ค่ะ กรุณาใช้ปุ่มออกจากระบบปกติ' });
    }
    
    if (user.tokens && Array.isArray(user.tokens)) {
        user.tokens = user.tokens.filter(t => t.id !== sessionId);
    }
    
    writeUserDb(db);
    res.json({ success: true, message: 'ยกเลิกเซสชันของอุปกรณ์สำเร็จแล้วค่ะ' });
});

// 7. Get Login Audit History
app.get('/api/auth/login-history', (req, res) => {
    const db = readUserDb();
    const user = authenticateUser(req, db);
    if (!user) {
        return res.json({ success: false, message: 'เซสชันหมดอายุหรือผิดพลาด กรุณาเข้าสู่ระบบอีกครั้งค่ะ' });
    }
    
    res.json({ success: true, history: user.loginHistory || [] });
});

// ============================================================================
// SYSTEM MONITORING & SECURITY AUDITOR / WEB SCRAPER ENDPOINTS
// ============================================================================

const SCRAPERS_FILE = path.join(__dirname, 'data', 'scrapers.json');
const GEO_CACHE_FILE = path.join(__dirname, 'data', 'geo_cache.json');
const AUTH_LOG_PATH = '/app/host-logs/auth.log';

const dnsPromises = dns.promises;
const urlModule = require('url');

// Helper: Read and write JSON safely
function readJsonFile(filePath, defaultVal = {}) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (e) {
        console.error(`Error reading ${filePath}:`, e);
    }
    return defaultVal;
}

function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error(`Error writing ${filePath}:`, e);
        return false;
    }
}

// Load GeoIP cache on startup
let geoCache = readJsonFile(GEO_CACHE_FILE, {});

// Function to resolve IP coordinates using FreeIPAPI

// Function to resolve IP coordinates using FreeIPAPI
async function geolocateIp(ip) {
    if (isPrivateIp(ip)) {
        return { ip, country: 'Local Network', city: 'Internal', lat: 13.7946, lon: 100.3242 }; // Defaults to Mahidol
    }
    if (geoCache[ip]) {
        return geoCache[ip];
    }
    try {
        const response = await axios.get(`https://freeipapi.com/api/json/${ip}`, { timeout: 3000 });
        if (response.data) {
            const result = {
                ip,
                country: response.data.countryName || 'Unknown',
                city: response.data.cityName || 'Unknown',
                lat: response.data.latitude || 0,
                lon: response.data.longitude || 0
            };
            geoCache[ip] = result;
            writeJsonFile(GEO_CACHE_FILE, geoCache);
            return result;
        }
    } catch (e) {
        console.error(`Failed to geolocate IP ${ip}:`, e.message);
    }
    // Fallback: Return empty coordinates but don't save to cache so we can retry later
    return { ip, country: 'Unknown', city: 'Unknown', lat: 0, lon: 0 };
}

// Function to parse the SSH auth log
function parseAuthLog() {
    if (!fs.existsSync(AUTH_LOG_PATH)) {
        return { success: true, logs: [], simulated: true, totalFailed: 0, todayFailed: 0 };
    }
    try {
        const stat = fs.statSync(AUTH_LOG_PATH);
        if (stat.size === 0) {
            return { success: true, logs: [], simulated: true, totalFailed: 0, todayFailed: 0 };
        }
        
        // Read up to the last 2MB of auth.log. We scan a much wider window than
        // the old 300KB so the failure counters actually reflect real volume,
        // while still bounding memory/event-loop usage on very large logs.
        const maxBytes = 2 * 1024 * 1024;
        const size = stat.size;
        const bytesToRead = Math.min(size, maxBytes);
        const buffer = Buffer.alloc(bytesToRead);
        const fd = fs.openSync(AUTH_LOG_PATH, 'r');
        try {
            fs.readSync(fd, buffer, 0, bytesToRead, size - bytesToRead);
        } finally {
            fs.closeSync(fd);
        }
        const content = buffer.toString('utf8');
        
        const lines = content.split('\n');
        const parsedLogs = [];
        const FAILED_SSH_REGEX = /(?:Failed password for (?:invalid user )?|(?:Connection closed by|Disconnected from) (?:invalid|authenticating) user |Invalid user )(\S+) (?:from )?(\S+) port (\d+)/i;
        const DATE_REGEX = /^([a-zA-Z]{3}\s+\d+\s+\d{2}:\d{2}:\d{2}|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{2}:\d{2}|Z)?)/;
        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Build a "YYYY-MM-DD" key for today in Bangkok timezone
        const bangkokDateKey = (date) => {
            const parts = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Bangkok',
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).formatToParts(date);
            const vals = parts.filter(p => ['year', 'month', 'day'].includes(p.type)).map(p => p.value);
            return vals.length === 3 ? vals.join('-') : '';
        };
        const todayKey = bangkokDateKey(new Date());

        let totalFailed = 0;
        let todayFailed = 0;

        // Process from end to start (recent first)
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            if (!line) continue;
            const match = line.match(FAILED_SSH_REGEX);
            if (match) {
                // Count EVERY failed attempt in the scanned window, not just the first 100
                totalFailed++;

                const user = match[1];
                const ip = match[2];
                const port = match[3];
                const dateMatch = line.match(DATE_REGEX);

                let timestamp = 'Unknown Time';
                let entryToday = false;
                if (dateMatch) {
                    const rawDate = dateMatch[1];
                    if (rawDate.includes('T')) {
                        // ISO 8601: 2026-06-11T17:45:03(+07:00|Z)
                        const d = new Date(rawDate);
                        if (!isNaN(d.getTime())) {
                            entryToday = bangkokDateKey(d) === todayKey;
                            const formatter = new Intl.DateTimeFormat('en-US', {
                                timeZone: 'Asia/Bangkok',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false
                            });
                            const parts = formatter.formatToParts(d);
                            const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
                            timestamp = `${partMap.month} ${partMap.day} ${partMap.hour.padStart(2, '0')}:${partMap.minute}:${partMap.second}`;
                        } else {
                            timestamp = rawDate;
                        }
                    } else {
                        // Syslog: Jun 11 17:45:03 (no year; assume current year)
                        timestamp = rawDate;
                        const syslogMatch = rawDate.match(/^([A-Za-z]{3})\s+(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})/);
                        if (syslogMatch) {
                            const monthNum = MONTHS.indexOf(syslogMatch[1]) + 1;
                            const dayNum = Number(syslogMatch[2]);
                            const hourNum = Number(syslogMatch[3]);
                            const minNum = Number(syslogMatch[4]);
                            const secNum = Number(syslogMatch[5]);
                            if (monthNum > 0 && dayNum > 0) {
                                const d = new Date(new Date().getFullYear(), monthNum - 1, dayNum, hourNum, minNum, secNum);
                                entryToday = bangkokDateKey(d) === todayKey;
                            }
                        }
                    }
                }
                // (No timestamp parsed) — cannot determine if it happened today

                if (entryToday) todayFailed++;

                // Keep only the most recent 100 entries for the detailed list/map;
                // the full window count is already tracked in totalFailed above.
                if (parsedLogs.length < 100) {
                    parsedLogs.push({
                        user,
                        ip,
                        port,
                        timestamp
                    });
                }
            }
        }
        return { success: true, logs: parsedLogs, simulated: false, totalFailed, todayFailed };
    } catch (err) {
        console.error('Error parsing auth.log:', err);
        return { success: false, error: err.message, logs: [], simulated: true, totalFailed: 0, todayFailed: 0 };
    }
}

// Generate realistic simulated SSH failed attempts for local development
function generateSimulatedLogs() {
    const MOCK_COUNTRIES = [
        { country: 'China', lat: 39.9042, lon: 116.4074, city: 'Beijing' },
        { country: 'Russia', lat: 55.7558, lon: 37.6173, city: 'Moscow' },
        { country: 'United States', lat: 37.7749, lon: -122.4194, city: 'San Francisco' },
        { country: 'Netherlands', lat: 52.3676, lon: 4.9041, city: 'Amsterdam' },
        { country: 'Germany', lat: 52.5200, lon: 13.4050, city: 'Berlin' },
        { country: 'Ukraine', lat: 50.4501, lon: 30.5234, city: 'Kyiv' },
        { country: 'Brazil', lat: -23.5505, lon: -46.6333, city: 'Sao Paulo' },
        { country: 'India', lat: 19.0760, lon: 72.8777, city: 'Mumbai' },
        { country: 'Singapore', lat: 1.3521, lon: 103.8198, city: 'Singapore' },
        { country: 'Vietnam', lat: 21.0285, lon: 105.8542, city: 'Hanoi' }
    ];
    const MOCK_USERNAMES = ['root', 'admin', 'postgres', 'oracle', 'guest', 'user', 'mysql', 'test', 'git', 'ubuntu'];
    
    const logs = [];
    const now = new Date();
    
    for (let i = 0; i < 35; i++) {
        const countryObj = MOCK_COUNTRIES[Math.floor(Math.random() * MOCK_COUNTRIES.length)];
        const user = MOCK_USERNAMES[Math.floor(Math.random() * MOCK_USERNAMES.length)];
        const o3 = Math.floor(Math.random() * 254) + 1;
        const o4 = Math.floor(Math.random() * 254) + 1;
        const ip = `185.120.${o3}.${o4}`;
        const port = Math.floor(Math.random() * 45000) + 15000;
        
        const logTime = new Date(now.getTime() - i * (15 + Math.floor(Math.random() * 45)) * 60 * 1000);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const pad = (n) => String(n).padStart(2, '0');
        const timestamp = `${months[logTime.getMonth()]} ${logTime.getDate()} ${pad(logTime.getHours())}:${pad(logTime.getMinutes())}:${pad(logTime.getSeconds())}`;
        
        const latVar = (Math.random() - 0.5) * 2.0;
        const lonVar = (Math.random() - 0.5) * 2.0;

        logs.push({
            user,
            ip,
            port,
            timestamp,
            country: countryObj.country,
            city: countryObj.city,
            lat: countryObj.lat + latVar,
            lon: countryObj.lon + lonVar
        });
    }
    return logs;
}

// Validates URL domain and checks for SSRF
async function checkSSRFSafe(targetUrl) {
    try {
        const parsed = urlModule.parse(targetUrl);
        const hostname = parsed.hostname;
        if (!hostname) return false;
        
        if (hostname.toLowerCase() === 'localhost') return false;
        
        const addresses = await dnsPromises.resolve(hostname).catch(() => []);
        if (addresses.length === 0) {
            const lookup = await dnsPromises.lookup(hostname).catch(() => null);
            if (lookup && lookup.address) {
                addresses.push(lookup.address);
            }
        }
        
        if (addresses.length === 0) {
            return false;
        }
        
        for (const ip of addresses) {
            if (isPrivateIp(ip)) {
                return false;
            }
        }
        return true;
    } catch (e) {
        return false;
    }
}

// Perform a DNS Rebinding-safe and SSRF-hardened GET request using axios
async function secureAxiosGet(targetUrl, options = {}) {
    const parsed = urlModule.parse(targetUrl);
    if (!parsed.hostname) {
        throw new Error('ที่อยู่ URL ไม่ถูกต้อง');
    }
    
    if (parsed.hostname.toLowerCase() === 'localhost') {
        throw new Error('ไม่อนุญาตให้เชื่อมต่อ localhost (SSRF protection)');
    }
    
    // Resolve host to IP addresses
    const addresses = await dnsPromises.resolve(parsed.hostname).catch(() => []);
    if (addresses.length === 0) {
        const lookup = await dnsPromises.lookup(parsed.hostname).catch(() => null);
        if (lookup && lookup.address) {
            addresses.push(lookup.address);
        }
    }
    
    if (addresses.length === 0) {
        throw new Error('ไม่สามารถตรวจสอบชื่อโฮสต์ปลายทางได้ (Failed to resolve hostname)');
    }
    
    // Validate each IP
    for (const ip of addresses) {
        if (isPrivateIp(ip)) {
            throw new Error('ไม่อนุญาตให้ใช้ IP ส่วนตัวหรือระบบเครือข่ายภายใน (SSRF Blocked)');
        }
    }
    
    const safeIp = addresses[0];
    const secureRequestUrl = `${parsed.protocol}//${safeIp}${parsed.path || ''}`;
    
    // Merge headers and override host header to preserve routing/SSL validation
    const headers = {
        ...options.headers,
        'Host': parsed.host
    };
    
    const https = require('https');
    const agentOptions = { servername: parsed.hostname };
    const httpsAgent = new https.Agent(agentOptions);
    
    return axios.get(secureRequestUrl, {
        ...options,
        headers,
        httpsAgent
    });
}

// API Routes for Security Logs
app.get('/api/monitoring/security-logs', async (req, res) => {
    const parsed = parseAuthLog();
    let logs = parsed.logs || [];
    let simulated = parsed.simulated;

    // Real source missing / empty / unreadable -> fall back to simulated demo data
    if (logs.length === 0 && simulated) {
        logs = generateSimulatedLogs();
    }

    // Geolocate only the displayed entries (max 100), using the persistent IP cache
    if (!simulated && logs.length > 0) {
        const promises = logs.map(async (log) => {
            const geo = await geolocateIp(log.ip);
            return {
                ...log,
                country: geo.country,
                city: geo.city,
                lat: geo.lat,
                lon: geo.lon
            };
        });
        logs = await Promise.all(promises);
    }

    // Real counts from the entire scanned window (not capped at the 100 displayed logs)
    const totalWindowFailed = parsed.totalFailed || 0;
    const todayFailed = parsed.todayFailed || 0;
    const uniqueCountries = new Set(logs.map(l => l.country).filter(c => c && c !== 'Unknown' && c !== 'Local Network'));

    res.json({
        success: true,
        logs,
        simulated,
        stats: {
            // "วันนี้" counter = failed attempts on the current Bangkok day (accurate)
            totalFailed: simulated ? 1284 : todayFailed,
            // Total failures found in the scanned window (bonus, true volume)
            allRecentFailed: simulated ? 1284 : totalWindowFailed,
            countriesCount: uniqueCountries.size || 5
        }
    });
});;

// API Routes for Web Scraper Bot
app.post('/api/monitoring/scrapers/test-scrape', async (req, res) => {
    const { url, selector } = req.body;
    if (!url || !selector) {
        return res.json({ success: false, message: 'กรุณากรอก URL และ HTML Selector ให้ครบถ้วนค่ะ' });
    }
    
    try {
        const response = await secureAxiosGet(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            },
            timeout: 8000
        });
        
        const $ = cheerio.load(response.data);
        const textVal = $(selector).text().trim();
        
        if (!textVal) {
            return res.json({ 
                success: false, 
                message: 'เชื่อมต่อเว็บได้สำเร็จ แต่ไม่พบข้อความใน HTML Selector ที่กำหนดค่ะ' 
            });
        }
        
        res.json({
            success: true,
            value: textVal.substring(0, 200)
        });
    } catch (err) {
        console.error('Test Scrape error:', err.message);
        res.json({ 
            success: false, 
            message: `เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message}` 
        });
    }
});

app.get('/api/monitoring/scrapers', (req, res) => {
    const db = readJsonFile(SCRAPERS_FILE, { scrapers: [] });
    res.json({ success: true, scrapers: db.scrapers });
});

app.post('/api/monitoring/scrapers', async (req, res) => {
    const { name, url, selector, interval, rule, value, notifyType, notifyCreds1, notifyCreds2 } = req.body;
    
    if (!name || !url || !selector || !interval) {
        return res.json({ success: false, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วนค่ะ' });
    }
    
    const isSafe = await checkSSRFSafe(url);
    if (!isSafe) {
        return res.json({ success: false, message: 'URL ปลายทางมีความเสี่ยงด้านความปลอดภัยและถูกปฏิเสธค่ะ (SSRF Protection)' });
    }

    if (notifyType === 'discord' && notifyCreds1) {
        if (!/^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\//i.test(notifyCreds1)) {
            return res.json({ success: false, message: 'URL ปลายทางสำหรับ Discord Webhook ไม่ถูกต้องค่ะ' });
        }
    }
    
    const db = readJsonFile(SCRAPERS_FILE, { scrapers: [] });
    
    const newScraper = {
        id: require('crypto').randomUUID ? require('crypto').randomUUID() : Math.random().toString(36).substring(2, 15),
        name,
        url,
        selector,
        interval: parseInt(interval, 10) || 15,
        rule: rule || 'changed',
        value: value || '',
        notifyType: notifyType || 'discord',
        notifyCreds1: notifyCreds1 || '',
        notifyCreds2: notifyCreds2 || '',
        lastValue: '',
        lastChecked: 0,
        status: 'active',
        error: null
    };
    
    db.scrapers.push(newScraper);
    writeJsonFile(SCRAPERS_FILE, db);
    
    res.json({ success: true, message: 'เพิ่มบอตเฝ้าระวังเรียบร้อยแล้วค่ะ', scraper: newScraper });
});

app.put('/api/monitoring/scrapers/:id', async (req, res) => {
    const { id } = req.params;
    const { name, url, selector, interval, rule, value, notifyType, notifyCreds1, notifyCreds2, status } = req.body;
    
    if (url) {
        const isSafe = await checkSSRFSafe(url);
        if (!isSafe) {
            return res.json({ success: false, message: 'URL ปลายทางมีความเสี่ยงด้านความปลอดภัยและถูกปฏิเสธค่ะ (SSRF Protection)' });
        }
    }

    if (notifyType === 'discord' && notifyCreds1) {
        if (!/^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\//i.test(notifyCreds1)) {
            return res.json({ success: false, message: 'URL ปลายทางสำหรับ Discord Webhook ไม่ถูกต้องค่ะ' });
        }
    }
    
    const db = readJsonFile(SCRAPERS_FILE, { scrapers: [] });
    const scraperIdx = db.scrapers.findIndex(s => s.id === id);
    if (scraperIdx === -1) {
        return res.json({ success: false, message: 'ไม่พบบอตเฝ้าระวังที่กำหนด' });
    }
    
    const scraper = db.scrapers[scraperIdx];
    if (name !== undefined) scraper.name = name;
    if (url !== undefined) scraper.url = url;
    if (selector !== undefined) scraper.selector = selector;
    if (interval !== undefined) scraper.interval = parseInt(interval, 10) || 15;
    if (rule !== undefined) scraper.rule = rule;
    if (value !== undefined) scraper.value = value;
    if (notifyType !== undefined) scraper.notifyType = notifyType;
    if (notifyCreds1 !== undefined) scraper.notifyCreds1 = notifyCreds1;
    if (notifyCreds2 !== undefined) scraper.notifyCreds2 = notifyCreds2;
    if (status !== undefined) scraper.status = status;
    
    if (url !== undefined || selector !== undefined) {
        scraper.lastValue = '';
        scraper.lastChecked = 0;
        scraper.error = null;
    }
    
    writeJsonFile(SCRAPERS_FILE, db);
    res.json({ success: true, message: 'แก้ไขข้อมูลบอตเฝ้าระวังเรียบร้อยแล้วค่ะ', scraper });
});

app.delete('/api/monitoring/scrapers/:id', (req, res) => {
    const { id } = req.params;
    const db = readJsonFile(SCRAPERS_FILE, { scrapers: [] });
    const initialLen = db.scrapers.length;
    db.scrapers = db.scrapers.filter(s => s.id !== id);
    
    if (db.scrapers.length === initialLen) {
        return res.json({ success: false, message: 'ไม่พบบอตเฝ้าระวังที่กำหนด' });
    }
    
    writeJsonFile(SCRAPERS_FILE, db);
    res.json({ success: true, message: 'ลบบอตเฝ้าระวังเรียบร้อยแล้วค่ะ' });
});

// Helper to send Webhook alerts
async function sendNotification(type, creds1, creds2, message) {
    try {
        if (type === 'discord') {
            if (!creds1 || !creds1.startsWith('http')) return;
            await axios.post(creds1, {
                content: `🔔 **Siam Daily Scraper Bot Alert!**\n${message}`
            }, { timeout: 5000 });
        } else if (type === 'line') {
            if (!creds1) return;
            const qs = require('querystring');
            await axios.post('https://notify-api.line.me/api/notify', qs.stringify({
                message: `\n🔔 Siam Daily Hub:\n${message}`
            }), {
                headers: {
                    'Authorization': `Bearer ${creds1}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 5000
            });
        } else if (type === 'telegram') {
            if (!creds1 || !creds2) return;
            const url = `https://api.telegram.org/bot${creds1}/sendMessage`;
            await axios.post(url, {
                chat_id: creds2,
                text: `🔔 <b>Siam Daily Alert</b>\n${message}`,
                parse_mode: 'HTML'
            }, { timeout: 5000 });
        }
    } catch (e) {
        console.error(`Failed to send alert notification (${type}):`, e.message);
    }
}

// Background Worker for Scrapers (runs every 1 minute)
setInterval(async () => {
    const db = readJsonFile(SCRAPERS_FILE, { scrapers: [] });
    if (!db.scrapers || db.scrapers.length === 0) return;
    
    let dbUpdated = false;
    const now = Date.now();
    
    for (const scraper of db.scrapers) {
        if (scraper.status !== 'active') continue;
        
        const intervalMs = scraper.interval * 60 * 1000;
        if (now - scraper.lastChecked >= intervalMs) {
            scraper.lastChecked = now;
            dbUpdated = true;
            
            try {
                const response = await secureAxiosGet(scraper.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                    },
                    timeout: 10000
                });
                
                const $ = cheerio.load(response.data);
                const textVal = $(scraper.selector).text().trim();
                
                if (!textVal) {
                    scraper.error = 'HTML Selector returned empty value';
                    continue;
                }
                
                let triggerAlert = false;
                let alertReason = '';
                
                const prevVal = scraper.lastValue;
                
                if (scraper.rule === 'changed') {
                    if (prevVal && textVal !== prevVal) {
                        triggerAlert = true;
                        alertReason = `ข้อมูลเปลี่ยนจาก "${prevVal}" เป็น "${textVal}"`;
                    }
                } else if (scraper.rule === 'contains') {
                    const expected = scraper.value.toLowerCase();
                    const current = textVal.toLowerCase();
                    if (current.includes(expected) && (!prevVal || !prevVal.toLowerCase().includes(expected))) {
                        triggerAlert = true;
                        alertReason = `ตรวจพบคำว่า "${scraper.value}" ในข้อความ: "${textVal}"`;
                    }
                } else if (scraper.rule === 'lt' || scraper.rule === 'gt') {
                    const currentNum = parseFloat(textVal.replace(/[^\d.-]/g, ''));
                    const targetNum = parseFloat(scraper.value);
                    const prevNum = prevVal ? parseFloat(prevVal.replace(/[^\d.-]/g, '')) : null;
                    
                    if (!isNaN(currentNum) && !isNaN(targetNum)) {
                        if (scraper.rule === 'lt' && currentNum < targetNum) {
                            if (prevNum === null || prevNum >= targetNum || currentNum !== prevNum) {
                                triggerAlert = true;
                                alertReason = `มูลค่าลดลงต่ำกว่าเกณฑ์! ปัจจุบัน: ${currentNum} (เกณฑ์: < ${targetNum})`;
                            }
                        } else if (scraper.rule === 'gt' && currentNum > targetNum) {
                            if (prevNum === null || prevNum <= targetNum || currentNum !== prevNum) {
                                triggerAlert = true;
                                alertReason = `มูลค่าเพิ่มขึ้นสูงกว่าเกณฑ์! ปัจจุบัน: ${currentNum} (เกณฑ์: > ${targetNum})`;
                            }
                        }
                    }
                }
                
                scraper.lastValue = textVal;
                scraper.error = null;
                
                if (triggerAlert) {
                    const alertMsg = `📢 บอตเฝ้าระวัง: **${scraper.name}** แจ้งเตือนเงื่อนไขสำเร็จ!\n- รายละเอียด: ${alertReason}\n- ลิงก์เข้าดู: ${scraper.url}`;
                    await sendNotification(scraper.notifyType, scraper.notifyCreds1, scraper.notifyCreds2, alertMsg);
                }
            } catch (err) {
                console.error(`Scraper execution error [${scraper.name}]:`, err.message);
                scraper.error = err.message;
            }
        }
    }
    
    if (dbUpdated) {
        writeJsonFile(SCRAPERS_FILE, db);
    }
}, 60 * 1000);

// Wildcard fallback: Send assembled HTML for single page routing
app.get('*', (req, res) => {
    if (!assembledHtml) assembledHtml = buildAssembledHtml();
    res.type('html').send(assembledHtml);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Register global exception and rejection handlers to prevent zombie/crashing process states
process.on('uncaughtException', (err) => {
    console.error('CRITICAL UNCAUGHT EXCEPTION:', err);
    process.exit(1); // Exit cleanly so Docker container auto-recovers
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED PROMISE REJECTION:', reason);
});
