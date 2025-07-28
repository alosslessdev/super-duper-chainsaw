let secretKeyId = '';
let secretKey = '';
let sessionCookie = '';
let _googleAccessToken: string | null = null;


export function setAwsKeys(id: string, key: string, cookie: string) {
  secretKeyId = id;
  secretKey = key;
  sessionCookie = cookie;
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
