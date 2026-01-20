// Frontier API authentication logic will go here.

const AUTH_API = 'https://auth.frontierstore.net';
const CLIENT_ID = 'tbd0ddee3-eba2-48ac-8425-10ccf1dba92d'; // User-provided Client ID
const CALLBACK_URL = 'https://cockpitcontrols.edfm.space';

// Generate a random string for the code verifier
function generateCodeVerifier() {
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    return base64urlEncode(randomBytes);
}

// Base64URL encode a byte array
function base64urlEncode(bytes) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(bytes)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Generate the code challenge from the code verifier
async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return base64urlEncode(digest);
}

// Redirect the user to the Frontier login page
async function loginWithFrontier() {
    const codeVerifier = generateCodeVerifier();
    sessionStorage.setItem('code_verifier', codeVerifier);

    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: CALLBACK_URL,
        scope: 'auth capi',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        audience: 'all'
    });

    window.location.href = `${AUTH_API}/auth?${params.toString()}`;
}

// Exchange the authorization code for an access token
async function handleAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const codeVerifier = sessionStorage.getItem('code_verifier');

    if (code && codeVerifier) {
        try {
            const response = await fetch(`${AUTH_API}/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: CLIENT_ID,
                    redirect_uri: CALLBACK_URL,
                    code: code,
                    code_verifier: codeVerifier
                })
            });

            if (response.ok) {
                const data = await response.json();
                // For now, we'll just log the data.
                // In a real app, you would store the access and refresh tokens.
                console.log('Authentication successful:', data);

                // You can now fetch user details
                await fetchUserDetails(data.access_token);

                // Remove the code from the URL
                window.history.replaceState({}, document.title, window.location.pathname);
                return data.access_token;
            } else {
                console.error('Failed to exchange authorization code for token:', await response.text());
            }
        } catch (error) {
            console.error('Error during token exchange:', error);
        }
    }
    return null;
}

async function fetchUserDetails(accessToken) {
    try {
        const response = await fetch(`${AUTH_API}/me`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.ok) {
            const user = await response.json();
            console.log('User details:', user);
            return user;
        } else {
            console.error('Failed to fetch user details:', await response.text());
        }
    } catch (error) {
        console.error('Error fetching user details:', error);
    }
    return null;
}
