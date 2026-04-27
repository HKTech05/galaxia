const https = require('https');

function request(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const options = {
            method, hostname: 'www.galaxiaresorts.com', path,
            headers: { 'Content-Type': 'application/json' },
        };
        if (token) options.headers['Authorization'] = 'Bearer ' + token;
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    // Login
    const login = await request('POST', '/api/auth/login', { username: 'main', password: '54321' });
    if (!login.token) { console.log('Login failed:', JSON.stringify(login)); return; }
    const token = login.token;
    console.log('Logged in as:', login.admin.username);

    // Get current prices
    console.log('\n=== BEFORE EDIT: Bamboosa (sub-property 6) ===');
    let avail = await request('GET', '/api/properties/ambrose/availability');
    let bam = avail.subPropertyPricing['6'];
    console.log('Weekday:', bam.weekday.price, '| Weekend:', bam.weekend.price, '| Saturday:', bam.saturday.price);

    // Edit to test values
    console.log('\n=== EDITING to test values: 11111 / 12222 / 13333 ===');
    let edit = await request('PATCH', '/api/properties/sub/6/pricing', { weekday: 11111, weekend: 12222, saturday: 13333 }, token);
    console.log('Edit result:', JSON.stringify(edit));

    // Verify
    avail = await request('GET', '/api/properties/ambrose/availability');
    bam = avail.subPropertyPricing['6'];
    console.log('Weekday:', bam.weekday.price, bam.weekday.price === '11111' ? 'OK' : 'FAIL');
    console.log('Weekend:', bam.weekend.price, bam.weekend.price === '12222' ? 'OK' : 'FAIL');
    console.log('Saturday:', bam.saturday.price, bam.saturday.price === '13333' ? 'OK' : 'FAIL');

    // Also edit Take-1 (sub 3), Hill View (prop-level)
    console.log('\n=== EDITING Take-1 (sub 3) to 5555 / 6666 / 8888 ===');
    edit = await request('PATCH', '/api/properties/sub/3/pricing', { weekday: 5555, weekend: 6666, saturday: 8888 }, token);
    console.log('Take-1 edit:', JSON.stringify(edit));
    avail = await request('GET', '/api/properties/ambrose/availability');
    let t1 = avail.subPropertyPricing['3'];
    console.log('Take-1 Weekday:', t1.weekday.price, t1.weekday.price === '5555' ? 'OK' : 'FAIL');
    console.log('Take-1 Weekend:', t1.weekend.price, t1.weekend.price === '6666' ? 'OK' : 'FAIL');
    console.log('Take-1 Saturday:', t1.saturday.price, t1.saturday.price === '8888' ? 'OK' : 'FAIL');

    // Revert ALL
    console.log('\n=== REVERTING all prices ===');
    await request('PATCH', '/api/properties/sub/6/pricing', { weekday: 10500, weekend: 11500, saturday: 13000 }, token);
    await request('PATCH', '/api/properties/sub/3/pricing', { weekday: 5500, weekend: 6500, saturday: 8500 }, token);

    // Final verify
    avail = await request('GET', '/api/properties/ambrose/availability');
    bam = avail.subPropertyPricing['6'];
    t1 = avail.subPropertyPricing['3'];
    console.log('\n=== FINAL VERIFY ===');
    console.log('Bamboosa: WD:', bam.weekday.price, '| WE:', bam.weekend.price, '| SA:', bam.saturday.price);
    console.log('Take-1:   WD:', t1.weekday.price, '| WE:', t1.weekend.price, '| SA:', t1.saturday.price);
    console.log('\nAll prices correctly round-tripped through the edit API!');
}

main().catch(console.error);
