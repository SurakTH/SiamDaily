# Siam Daily Hub - API Specification

This document lists and defines all backend proxy and scraping endpoints served by `server.js` (Node/Express). This spec helps future AI agents and developers quickly understand API payloads without reading the implementation code.

All routes are **GET** requests.

---

## 1. Gold Prices (`/api/gold`)
Scrapes the Thai Gold Traders Association web page or falls back to a Vercel-based backup API.
- **Response Format**:
  ```json
  {
    "success": true,
    "barBuy": "40,500",
    "barSell": "40,600",
    "jewelryBuy": "39,769.80",
    "jewelrySell": "41,100",
    "date": "10/06/2026 - 15:30",
    "source": "สมาคมค้าทองคำ (Gold Traders Association) - ข้อมูลจริง",
    "live": true
  }
  ```

## 2. RSS News (`/api/news`)
Fetches and aggregates RSS feeds from multiple Thai news websites, with optional integration of user custom feeds.
- **Parameters**:
  - `category` (optional, default: `all`, values: `general`, `technology`, `business`, `weather-warning`)
  - `username` (optional, for custom feeds authentication)
  - `token` (optional, for custom feeds authentication)
- **Response Format**: Array of news items:
  ```json
  [
    {
      "id": "custom-MyFeed-0", // Or default hash ID
      "title": "News Title Here",
      "link": "https://example.com/news/123",
      "pubDate": "Wed, 10 Jun 2026 15:00:00 +0700",
      "contentSnippet": "Short snippet of the news content...",
      "source": "Thairath",
      "category": "general",
      "timestamp": 1781168400000
    }
  ]
  ```

## 3. News Image Proxy (`/api/news-image`)
Proxies or scrapes the main image link for a news URL (since RSS feeds often lack direct image URLs in items).
- **Parameters**: `url` (required, news page URL)
- **Response Format**:
  ```json
  {
    "success": true,
    "imageUrl": "https://example.com/images/news-123.jpg"
  }
  ```

## 4. Bangchak Oil Prices (`/api/oil`)
Fetches daily retail oil prices from Bangchak.
- **Response Format**:
  ```json
  {
    "success": true,
    "E20": "36.54",
    "E85": "34.29",
    "Gasohol91": "37.88",
    "Gasohol95": "38.15",
    "Diesel": "32.94",
    "DieselPremium": "44.24",
    "source": "Bangchak Corporation",
    "date": "10 Jun 2026"
  }
  ```

## 5. PTT Oil Prices (`/api/ptt-oil`)
Fetches daily retail oil prices from PTT OR.
- **Response Format**: Similar to `/api/oil` but covers PTT fuel naming and values.

## 6. Thai Lottery Results (`/api/lottery`)
Scrapes or retrieves lottery draw numbers.
- **Response Format**:
  ```json
  {
    "success": true,
    "date": "16 มิถุนายน 2569",
    "first": "123456",
    "firstThree": ["123", "456"],
    "lastThree": ["789", "012"],
    "lastTwo": "56"
  }
  ```

## 7. Cryptocurrency Prices (`/api/crypto`)
Fetches the prices and 24h changes of major cryptocurrencies (BTC, ETH, BNB, SOL) using the Binance API.
- **Response Format**:
  ```json
  {
    "success": true,
    "rates": {
      "BTC": 68500.5,
      "ETH": 3750.2,
      "BNB": 580.4,
      "SOL": 150.2
    },
    "changes": {
      "BTC": -1.24,
      "ETH": 2.15,
      "BNB": 0.45,
      "SOL": -3.12
    }
  }
  ```

## 8. Thai Public Holidays (`/api/holidays`)
Returns a list of Thai public holidays for the current year.
- **Response Format**: Array of holiday structures.

## 9. Global Commodities (`/api/commodities`)
Fetches global market commodity prices (Gold Spot, Brent Crude, Silver, etc.).
- **Response Format**:
  ```json
  {
    "success": true,
    "goldSpot": "2350.40",
    "brentCrude": "82.50",
    "silver": "29.40"
  }
  ```

## 10. VPS Server Status (`/api/server-status`)
Reads system metrics (including dynamic CPU percentage calculation from CPU ticks difference) and queries Docker container info on the host server.
- **Response Format**:
  ```json
  {
    "success": true,
    "cpuLoad": "0.15",
    "cpuPercent": "12.5",
    "ram": {
      "used": "1.45 GB",
      "total": "3.85 GB",
      "pct": "37.6"
    },
    "disk": {
      "used": "12.5 GB",
      "total": "25.0 GB",
      "pct": "50.0"
    },
    "uptime": "12 days, 4 hours",
    "dockerContainers": [
      {
        "names": "siam-daily-hub",
        "image": "utilities-siam-daily-hub",
        "status": "Up 2 hours",
        "ports": "0.0.0.0:8000->8000/tcp"
      }
    ]
  }
  ```

## 11. Radio Stream Proxy (`/api/radio-proxy`)
Proxies live radio streaming URLs to prevent browser mixed-content (HTTP block) or CORS errors on the frontend.
- **Parameters**: `url` (required, source audio stream URL)
- **Response**: Pipes raw audio buffer stream back to client audio player.

## 12. Authentication & Cloud Sync APIs

### A. Auth Config (`/api/auth/config`) [GET]
Queries server registration settings (whether new signups are allowed and if a registration key is required).
- **Response Format**:
  ```json
  {
    "registrationOpen": true,
    "registrationKeyRequired": false
  }
  ```

### B. Register (`/api/auth/register`) [POST]
Creates a new user account on the server.
- **Payload**:
  ```json
  {
    "username": "user123",
    "password": "securepassword",
    "regKey": "optionalSecretKey"
  }
  ```
- **Response Format**:
  ```json
  {
    "success": true,
    "message": "สมัครสมาชิกสำเร็จแล้วค่ะ!..."
  }
  ```

### C. Login (`/api/auth/login`)
Authenticates the user and returns a session token.
- **Payload**:
  ```json
  {
    "username": "user123",
    "password": "securepassword"
  }
  ```
- **Response Format**:
  ```json
  {
    "success": true,
    "message": "เข้าสู่ระบบสำเร็จแล้วค่ะ",
    "token": "a1b2c3d4e5...",
    "username": "user123",
    "data": {
      "siam_daily_todos": "...",
      "siam_daily_notes": "..."
    }
  }
  ```

### D. Cloud Sync (`/api/auth/sync`)
Synchronizes client configuration data with the cloud.
- **Payload** (Write/Upload):
  ```json
  {
    "username": "user123",
    "token": "a1b2c3d4e5...",
    "data": {
      "siam_daily_todos": "...",
      "siam_daily_notes": "...",
      "siam_daily_habits": "..."
    }
  }
  ```
- **Payload** (Read/Fetch - omit "data" field):
  ```json
  {
    "username": "user123",
    "token": "a1b2c3d4e5..."
  }
  ```
- **Response Format**:
  ```json
  {
    "success": true,
    "message": "ซิงก์ข้อมูลไปที่ Cloud สำเร็จแล้วค่ะ",
    "data": {
      "siam_daily_todos": "...",
      "siam_daily_notes": "..."
    }
  }
  ```

### E. Change Password (`/api/auth/change-password`) [POST]
Updates the user password and invalidates other concurrent device sessions.
- **Payload**:
  ```json
  {
    "username": "user123",
    "token": "current_session_token",
    "currentPassword": "oldpassword",
    "newPassword": "newsecurepassword"
  }
  ```
- **Response Format**:
  ```json
  {
    "success": true,
    "message": "เปลี่ยนรหัสผ่านสำเร็จแล้วค่ะ เซสชันอื่นถูกบังคับให้ออกจากระบบเพื่อความปลอดภัย"
  }
  ```

### F. Get Active Sessions (`/api/auth/sessions`) [GET]
Retrieves all active devices currently logged in to the user account.
- **Parameters** (Query/Headers):
  - `username` (optional in header `x-auth-username`)
  - `token` (optional in header `x-auth-token`)
- **Response Format**:
  ```json
  {
    "success": true,
    "sessions": [
      {
        "id": "e3fa871b",
        "ip": "110.171.15.143",
        "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)...",
        "expires": 1783784883762,
        "lastActive": 1781360374673,
        "isCurrent": true
      }
    ]
  }
  ```

### G. Revoke Session (`/api/auth/sessions/revoke`) [POST]
Revokes an active session ID, forcing that device to log out.
- **Payload**:
  ```json
  {
    "username": "user123",
    "token": "current_session_token",
    "sessionId": "target_session_id_to_revoke"
  }
  ```
- **Response Format**:
  ```json
  {
    "success": true,
    "message": "ยกเลิกเซสชันของอุปกรณ์สำเร็จแล้วค่ะ"
  }
  ```

### H. Get Login Audit History (`/api/auth/login-history`) [GET]
Retrieves the 20 most recent login attempt events (success or failure) for auditing.
- **Parameters** (Query/Headers):
  - `username` (optional in header `x-auth-username`)
  - `token` (optional in header `x-auth-token`)
- **Response Format**:
  ```json
  {
    "success": true,
    "history": [
      {
        "timestamp": 1781360374673,
        "ip": "110.171.15.143",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
        "success": true
      }
    ]
  }
  ```

---

## 13. Network Diagnostics APIs

### A. Ping Test (`/api/diagnostics/ping`)
Runs a platform-specific `ping` command (3 packets) to check host connectivity. The `host` parameter is sanitized.
- **Parameters**: `host` (required, hostname or IP)
- **Response Format**:
  ```json
  {
    "success": true,
    "output": "PING google.com (142.250.74.78) 56(84) bytes of data...\n64 bytes from ... time=4.32 ms\n"
  }
  ```
  *On Failure:*
  ```json
  {
    "success": false,
    "error": "Error details",
    "details": "Command stderr/stdout"
  }
  ```

### B. DNS Lookup (`/api/diagnostics/dns`)
Resolves the IP addresses associated with a given host using Node's native `dns.lookup`.
- **Parameters**: `host` (required, hostname)
- **Response Format**:
  ```json
  {
    "success": true,
    "addresses": [
      { "address": "142.250.74.78", "family": 4 }
    ]
  }
  ```

### C. Port Check (`/api/diagnostics/port`)
Checks whether a specific TCP port is open on a host. Has a 3-second connection timeout.
- **Parameters**: `host` (required, hostname or IP), `port` (required, integer 1-65535)
- **Response Format**:
  ```json
  {
    "success": true,
    "open": true
  }
  ```
  *If Closed or Timed Out:*
  ```json
  {
    "success": true,
    "open": false,
    "reason": "connection timed out (3000ms)"
  }
  ```

---

## 14. Network Speedtest APIs

### A. Client Download Test (`/api/speedtest/download`)
Generates a random binary buffer of a given size to measure client download speed.
- **Parameters**: `size` (optional, default: 5MB, max: 20MB in bytes)
- **Response**: Binary stream (`application/octet-stream`)

### B. Client Upload Test (`/api/speedtest/upload`)
Receives a client-uploaded binary payload to measure upload speed.
- **Method**: **POST**
- **Content-Type**: `*/*` (raw binary up to 25MB)
- **Response Format**:
  ```json
  {
    "success": true,
    "received": 5242880
  }
  ```

### C. VPS Server-to-Internet Speedtest (`/api/speedtest/server`)
Runs a server-side download test fetching a 10MB test file from Cloudflare's CDN.
- **Response Format**:
  ```json
  {
    "success": true,
    "downloadSpeedMbps": "184.20",
    "bytes": 10000000,
    "duration": "0.41"
  }
  ```



---

## 15. Bookmark Latency Check (`/api/services/ping`)
Checks the availability, HTTP response status, and latency of a bookmarked URL. Automatically rewrites `localhost` and `127.0.0.1` inside container to `host.docker.internal` to check services running on the host.
- **Parameters**: `url` (required, target URL)
- **Response Format**:
  ```json
  {
    "success": true,
    "online": true,
    "status": 200,
    "latency": 45
  }
  ```
  *On Failure:*
  ```json
  {
    "success": true,
    "online": false,
    "error": "connect ECONNREFUSED 127.0.0.1:8123",
    "latency": 2001
  }
  ```

---

## 16. Server Health Check (`/health`)
Returns the availability and read/write operational health of the backend database and the active Node process uptime.
- **Response Format**:
  ```json
  {
    "status": "OK",
    "uptime": 124.52
  }
  ```
  *On Failure:*
  ```json
  {
    "status": "ERROR",
    "error": "Database file not readable/writable"
  }
  ```

---

## 17. SSH Security Auditor Logs (`/api/monitoring/security-logs`) [GET]
Parses the VPS host SSH authentication log `/app/host-logs/auth.log` to identify failed SSH attempts. Scans a window of the file and counts **every** failed attempt (not capped at the 100 displayed entries). Resolves IP coordinates using a GeoIP lookup cache. Returns mock data if the log file is not found.
- **Response Format**:
  ```json
  {
    "success": true,
    "logs": [
      {
        "user": "root",
        "ip": "185.120.44.89",
        "port": "51234",
        "timestamp": "Jun 13 20:10:05",
        "country": "Germany",
        "city": "Berlin",
        "lat": 52.520,
        "lon": 13.405
      }
    ],
    "simulated": false,
    "stats": {
      "totalFailed": 482,
      "allRecentFailed": 1237,
      "countriesCount": 27
    }
  }
  ```
  - `logs`: the most recent 100 parsed entries (used for the map & list).
  - `stats.totalFailed`: failed attempts on the current Bangkok day (shown on the "วันนี้" card).
  - `stats.allRecentFailed`: total failed attempts in the entire scanned window (real volume).
  - `stats.countriesCount`: unique countries among the displayed entries.

---

## 18. Web Scrapers List (`/api/monitoring/scrapers`) [GET]
Retrieves all configured web scraper alert bots.
- **Response Format**:
  ```json
  {
    "success": true,
    "scrapers": [
      {
        "id": "f5b61e2a-...",
        "name": "Noodle Price",
        "url": "https://example.com/product",
        "selector": ".price-tag",
        "interval": 15,
        "rule": "changed",
        "value": "",
        "notifyType": "discord",
        "notifyCreds1": "https://discord.com/api/webhooks/...",
        "notifyCreds2": "",
        "lastValue": "150 THB",
        "lastChecked": 1774329080000,
        "status": "active",
        "error": null
      }
    ]
  }
  ```

---

## 19. Create Web Scraper (`/api/monitoring/scrapers`) [POST]
Adds a new web scraper alert bot. Input URLs are protected against SSRF.
- **Request Body**:
  ```json
  {
    "name": "Noodle Price",
    "url": "https://example.com/product",
    "selector": ".price-tag",
    "interval": 15,
    "rule": "changed",
    "value": "",
    "notifyType": "discord",
    "notifyCreds1": "https://discord.com/api/webhooks/...",
    "notifyCreds2": ""
  }
  ```
- **Response Format**:
  ```json
  {
    "success": true,
    "message": "เพิ่มบอตเฝ้าระวังเรียบร้อยแล้วค่ะ",
    "scraper": { ... }
  }
  ```

---

## 20. Update Web Scraper (`/api/monitoring/scrapers/:id`) [PUT]
Updates or toggles the active status of a web scraper alert bot.
- **Request Body**: (Allows partial updates or status toggling)
  ```json
  {
    "status": "paused"
  }
  ```
- **Response Format**:
  ```json
  {
    "success": true,
    "message": "แก้ไขรายละเอียดเรียบร้อยแล้วค่ะ"
  }
  ```

---

## 21. Delete Web Scraper (`/api/monitoring/scrapers/:id`) [DELETE]
Deletes a web scraper alert bot.
- **Response Format**:
  ```json
  {
    "success": true,
    "message": "ลบบอตเฝ้าระวังเรียบร้อยแล้วค่ะ"
  }
  ```

---

## 22. Test Scrape Webpage (`/api/monitoring/scrapers/test-scrape`) [POST]
Performs an on-the-fly, secure scrape of a webpage and returns the extracted text contents. Covered by DNS-preflight SSRF protections.
- **Request Body**:
  ```json
  {
    "url": "https://example.com/product",
    "selector": ".price-tag"
  }
  ```
- **Response Format**:
  ```json
  {
    "success": true,
    "value": "150 THB"
  }
  ```
