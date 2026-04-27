const https = require('https');
function request(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const options = { method, hostname: 'www.galaxiaresorts.com', path, headers: { 'Content-Type': 'application/json' } };
        if (token) options.headers['Authorization'] = 'Bearer ' + token;
        const req = https.request(options, (res) => { let data = ''; res.on('data', c => data += c); res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } }); });
        req.on('error', reject); if (body) req.write(JSON.stringify(body)); req.end();
    });
}
async function main() {
    const login = await request('POST', '/api/auth/login', { username: 'main', password: '54321' });
    const token = login.token;
    // Set test prices for Bamboosa
    console.log('Setting Bamboosa to 11111/12222/13333...');
    await request('PATCH', '/api/properties/sub/6/pricing', { weekday: 11111, weekend: 12222, saturday: 13333 }, token);
    console.log('Done. Check frontend now.');
}
main().catch(console.error);
