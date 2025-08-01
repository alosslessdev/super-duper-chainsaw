// clientKeyStore.ts
let secretKeyId = '';
let secretKey = '';
let sessionCookie = '';
let _googleAccessToken: string | null = null;
let _userEmail: string | null = null; // New variable to store user email

export function setAwsKeys(id: string, key: string, cookie: string) {
  secretKeyId = id;
  secretKey = key;
  sessionCookie = cookie;
  console.log('AWS Keys Set:', { id, key, cookie });
}

export function getAwsKeys() {
  return { secretKeyId, secretKey, sessionCookie };
}

export const setGoogleAccessToken = (token: string) => {
  _googleAccessToken = token;
  console.log('Google Access Token Set:', token ? 'Token available' : 'Token cleared');
};

/**
 * Retrieves the currently stored Google OAuth access token.
 * @returns The Google access token or null if not set.
 */
export const getGoogleAccessToken = () => {
  return _googleAccessToken;
};

/**
 * Sets the user's email.
 * @param email The user's email.
 */
export const setUserEmail = (email: string | null) => {
  _userEmail = email;
  console.log('User Email Set:', email);
};

/**
 * Retrieves the user's email.
 * @returns The user's email or null if not set.
 */
export const getUserEmail = () => {
  return _userEmail;
};
