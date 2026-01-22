/**
 * Rate Limiting Test (Live Server)
 *
 * Prerequisites:
 * 1. Start dev server: npm run dev
 * 2. Run this test: node test-rate-limit.mjs
 */

async function test() {
    console.log('🧪 Testing Rate Limiting (Live Server)\n')
    console.log('⚠️  Make sure dev server is running: npm run dev\n')

    const url = 'http://localhost:8787/api/estimate'

    for (let i = 1; i <= 12; i++) {
        try {
            const startTime = Date.now()

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chain: 'tron',
                    asset: 'TRX',
                    amount: '100',
                    from: 'TGrzqMjhZH85X8q3EkUfFdXUB3zSW8oDH7',
                    to: 'TYukBQZ2XXCcRCReAUguyXncCWNY9CEiDQ'
                })
            })

            const duration = Date.now() - startTime

            console.log(`Request ${i}: HTTP ${response.status} (${duration}ms)`)

            if (response.status === 429) {
                const body = await response.json()
                console.log(`  ❌ Rate limited: ${body.message}`)
                console.log(`  Headers:`, {
                    limit: response.headers.get('X-RateLimit-Limit'),
                    remaining: response.headers.get('X-RateLimit-Remaining'),
                    reset: response.headers.get('X-RateLimit-Reset'),
                    retryAfter: response.headers.get('Retry-After')
                })
            } else if (response.status === 200) {
                const body = await response.json()
                console.log(`  ✅ Success - Fee: ${body.totalFeeTrx} TRX`)
            } else {
                const body = await response.json()
                console.log(`  ⚠️  Error: ${body.error}`)
            }
        } catch (error) {
            console.log(`  💥 Failed to connect: ${error.message}`)
            console.log(`  \n⛔ Make sure dev server is running: npm run dev\n`)
            process.exit(1)
        }

        // Задержка 100ms между запросами
        // Лимит: 10 запросов в минуту, должно сработать на 11-м запросе
        await new Promise(r => setTimeout(r, 100))
    }

    console.log('\n✅ Test completed!')
    console.log('\n📊 Expected results:')
    console.log('  - Requests 1-10: HTTP 200 (Success)')
    console.log('  - Request 11+: HTTP 429 (Rate limited - minute limit 10/min)')
}

test()