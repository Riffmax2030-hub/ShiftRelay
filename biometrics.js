/**
 * ShiftRelay Enterprise Biometrics Engine (WebAuthn / Passkeys / Device Fingerprint & Face Unlock)
 *
 * Implements FIDO2 / WebAuthn standards for 1-touch recurrent sign-in on any hardware:
 * - Android BiometricPrompt (Fingerprint / Face Unlock)
 * - Apple Touch ID / Face ID
 * - Windows Hello
 *
 * Flow:
 * 1. User logs in with Tri-Factor Auth (Company ID + Work Email + Password).
 * 2. App prompts: "Enable Device Biometric Login?"
 * 3. Browser securely generates cryptographic keypair on device Secure Enclave / TEE.
 * 4. Next time user visits, a single tap triggers fingerprint/face scanner.
 * 5. Sign-in completes in < 1 second with ZERO typing.
 */

(function () {
  const STORAGE_KEY = 'shiftrelay_biometric_credential';

  function isWebAuthnSupported() {
    return (
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    );
  }

  function getStoredCredential() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function saveCredential(cred) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cred));
    } catch (e) {
      console.warn('Could not persist biometric credential locally:', e);
    }
  }

  function clearCredential() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  // Convert Base64 / Base64URL string to Uint8Array
  function bufferFromBase64(base64Str) {
    const binary = atob(base64Str.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // Convert ArrayBuffer to Base64URL string
  function bufferToBase64Url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Enroll the user's device biometric hardware after successful Tri-Factor sign-in.
   */
  async function enrollBiometrics(user) {
    if (!isWebAuthnSupported()) {
      throw new Error('Biometric hardware is not available on this browser or device.');
    }

    const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) {
      throw new Error('No built-in biometric sensor (Fingerprint or Face ID) detected on this device.');
    }

    // Request registration challenge from server
    const optionsRes = await fetch('/api/auth/webauthn/register-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, email: user.email, companyId: user.company_id || '246701' })
    });
    const options = await optionsRes.json();
    if (!optionsRes.ok) throw new Error(options.error || 'Failed to prepare biometric registration');

    const challengeBytes = bufferFromBase64(options.challenge);
    const userIdBytes = new TextEncoder().encode(user.id);

    const createCredentialOptions = {
      publicKey: {
        challenge: challengeBytes,
        rp: {
          name: 'ShiftRelay Enterprise HCM',
          id: window.location.hostname
        },
        user: {
          id: userIdBytes,
          name: user.email,
          displayName: user.name || user.email
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: false
        },
        timeout: 60000,
        attestation: 'none'
      }
    };

    const newCredential = await navigator.credentials.create(createCredentialOptions);
    if (!newCredential) throw new Error('Biometric enrollment cancelled by user.');

    const credentialData = {
      id: newCredential.id,
      rawId: bufferToBase64Url(newCredential.rawId),
      response: {
        clientDataJSON: bufferToBase64Url(newCredential.response.clientDataJSON),
        attestationObject: bufferToBase64Url(newCredential.response.attestationObject)
      },
      type: newCredential.type,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        companyId: user.company_id || '246701'
      }
    };

    // Verify registration on server
    const verifyRes = await fetch('/api/auth/webauthn/register-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentialData)
    });
    const verifyJson = await verifyRes.json();
    if (!verifyRes.ok) throw new Error(verifyJson.error || 'Server rejected biometric registration');

    saveCredential({
      id: newCredential.id,
      userId: user.id,
      email: user.email,
      name: user.name,
      companyId: user.company_id || '246701',
      registeredAt: new Date().toISOString()
    });

    return { ok: true, message: 'Device biometric registration complete!' };
  }

  /**
   * Recurrent 1-Touch Biometric Login
   */
  async function authenticateBiometric() {
    const cred = getStoredCredential();
    if (!cred) {
      throw new Error('No enrolled biometric credential found on this device. Sign in once with Company ID and Password to enable.');
    }

    // Request login challenge from server
    const optionsRes = await fetch('/api/auth/webauthn/login-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cred.email, companyId: cred.companyId })
    });
    const options = await optionsRes.json();
    if (!optionsRes.ok) throw new Error(options.error || 'Failed to initialize biometric challenge');

    const challengeBytes = bufferFromBase64(options.challenge);
    const allowCredId = bufferFromBase64(cred.id);

    const getCredentialOptions = {
      publicKey: {
        challenge: challengeBytes,
        timeout: 60000,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            type: 'public-key',
            id: allowCredId,
            transports: ['internal']
          }
        ],
        userVerification: 'required'
      }
    };

    const assertion = await navigator.credentials.get(getCredentialOptions);
    if (!assertion) throw new Error('Biometric verification cancelled.');

    const verifyPayload = {
      id: assertion.id,
      rawId: bufferToBase64Url(assertion.rawId),
      response: {
        clientDataJSON: bufferToBase64Url(assertion.response.clientDataJSON),
        authenticatorData: bufferToBase64Url(assertion.response.authenticatorData),
        signature: bufferToBase64Url(assertion.response.signature),
        userHandle: assertion.response.userHandle ? bufferToBase64Url(assertion.response.userHandle) : null
      },
      email: cred.email,
      companyId: cred.companyId
    };

    const loginRes = await fetch('/api/auth/webauthn/login-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verifyPayload)
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(loginData.error || 'Biometric authentication rejected');

    return loginData;
  }

  window.ShiftRelayBiometrics = {
    isSupported: isWebAuthnSupported,
    hasEnrolled: () => !!getStoredCredential(),
    getCredential: getStoredCredential,
    enroll: enrollBiometrics,
    authenticate: authenticateBiometric,
    clear: clearCredential
  };
})();
