const https = require('https');
const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_SECRET = "galaxia-super-secret-jwt-key-2026";
const token = jwt.sign({ id: 1, username: 'owner', role: 'owner' }, JWT_SECRET, { expiresIn: '1h' });

function fetchBookings(urlStr) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(urlStr);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        const client = urlObj.protocol === 'https:' ? https : http;
        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e + ': ' + data.slice(0, 100));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function main() {
    let bookings = await fetchBookings('https://www.galaxiaresorts.com/api/bookings/staycation');

    const now = new Date();
    // UTC and IST date strings
    const todayUTC = now.toISOString().slice(0, 10);
    const todayIST = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)).toISOString().slice(0, 10);

    console.log('Today (UTC):', todayUTC);
    console.log('Today (IST):', todayIST);

    if (Array.isArray(bookings)) {
        const checkedIn = bookings.filter(b => {
            const st = (b.status || '').toLowerCase();
            return st === 'checked_in' || st === 'checked in';
        });

        console.log(`\nALL ${checkedIn.length} CHECKED-IN BOOKINGS IN THE SYSTEM:`);
        console.log('========================================================================================');

        checkedIn.forEach((b, i) => {
            const cid = b.checkInDate ? b.checkInDate.slice(0, 10) : 'N/A';
            const cod = b.checkOutDate ? b.checkOutDate.slice(0, 10) : 'N/A';
            const propName = b.subProperty ? b.subProperty.name : (b.property ? b.property.name : 'Unknown');
            const unitStr = b.assignedUnit ? ` (Unit: ${b.assignedUnit})` : '';
            
            let statusTag = '';
            if (cod < todayIST) {
                statusTag = '⚠️ OVERDUE (Past Day)';
            } else if (cod === todayIST) {
                statusTag = '📅 DUE TODAY';
            } else {
                statusTag = '⏳ FUTURE CHECKOUT';
            }

            console.log(`${i + 1}. [${b.bookingRef || '#ST-' + b.id}] ${b.customerName} | Phone: ${b.customerPhone || 'No Phone'}`);
            console.log(`   Property   : ${propName}${unitStr}`);
            console.log(`   Check-In   : ${cid}  -->  Check-Out: ${cod}  [${statusTag}]`);
            console.log('----------------------------------------------------------------------------------------');
        });
    }
}

main().catch(console.error);
