// clientKeyStore.ts
let secretKeyId = '';
let secretKey = '';
let sessionCookie = '';
let _googleAccessToken: string | null = null;
let _userEmail: string | null = null; // New variable to store user email
let _userId: number | null = null; // New variable to store user ID

export function setAwsKeys(id: string, key: string, cookie: string, userId: number) {
  secretKeyId = id;
  secretKey = key;
  sessionCookie = cookie;
  _userId = userId; // Store the user ID
  console.log('AWS Keys and User ID Set:', { id, key, cookie, userId });
}

export function getAwsKeys() {
  return { secretKeyId, secretKey, sessionCookie, userId: _userId }; // Export userId, 
                                                                     // inconsistent use of variables it could just be userid
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

/**
 * Sets the user's ID.
 * @param userId The user's ID.
 */
export const setUserId = (userId: number | null) => {
  _userId = userId;
  console.log('User ID Set:', userId);
};

/**
 * Retrieves the user's ID.
 * @returns The user's ID or null if not set.
 */
export const getUserId = () => { 
  return _userId;
};