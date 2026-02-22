import fetch from 'node-fetch'; // If needed for older node, but we have native fetch

async function test() {
    const response = await fetch('http://localhost:3001/api/clawbot-team-chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
            channel_id: 'some-id',
            prompt: 'Hola'
        })
    });
    const body = await response.text();
    console.log('Status:', response.status);
    console.log('Body:', body);
}

test();
