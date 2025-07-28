// utils/googleAuth.ts
import React from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { setGoogleAccessToken } from './awsKeyStore'; // Import the function to store the token

// This line is important for handling redirects in Expo Go
WebBrowser.maybeCompleteAuthSession();

/**
 * IMPORTANT: Replace 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com'
 * with your actual Web Client ID from Google Cloud Console.
 *
 * Make sure to configure the Authorized redirect URIs in Google Cloud Console:
 * For Expo Go, it's typically 'exp://YOUR_LOCAL_IP:YOUR_PORT'
 * For standalone apps, it's 'https://auth.expo.io/@your-username/your-app-slug'
 */
const CLIENT_ID = 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com';

// Define the scopes required for Google Calendar API access
const SCOPES = [
  'openid', // Required for basic user info
  'profile', // Access to user's profile information
  'email', // Access to user's email address
  'https://www.googleapis.com/auth/calendar.events', // Read/write access to calendar events
  'https://www.googleapis.com/auth/calendar', // Full access to calendars
];

/**
 * Custom hook for Google authentication.
 * Handles the OAuth flow and stores the access token.
 * @returns An object containing `signInWithGoogle` function, `request` object, and `response` object.
 */
export const useGoogleAuth = () => {
  // `useAuthRequest` hook from expo-auth-session/providers/google
  // It manages the state and logic for the OAuth flow.
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: CLIENT_ID,
    scopes: SCOPES,
  });

  // useEffect to handle the response from the Google authentication flow
  // This runs whenever the `response` object changes.
  React.useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        // Store the obtained access token securely
        setGoogleAccessToken(authentication.accessToken);
        console.log('Google Access Token obtained successfully.');
        // You can add further logic here, like navigating to a new screen
        // or showing a success message to the user.
      } else {
        console.error('Google authentication successful, but no access token found.');
      }
    } else if (response?.type === 'error') {
      console.error('Google authentication error:', response.error);
    } else if (response?.type === 'cancel') {
      console.log('Google login cancelled by user.');
    } else if (response?.type === 'dismiss') {
      console.log('Google login dismissed (e.g., user closed browser tab).');
    }
  }, [response]); // Dependency array: runs when 'response' changes

  /**
   * Initiates the Google sign-in process.
   * @returns A Promise that resolves to true if login was successful, false otherwise.
   */
  const signInWithGoogle = async (): Promise<boolean> => {
    try {
      // Ensure the request object is ready before prompting
      if (!request) {
        console.error('Google auth request is not ready. Check client ID and scopes.');
        return false;
      }
      // `promptAsync` opens the browser for the user to authenticate with Google
      const result = await promptAsync();

      // The `useEffect` above will handle the 'success' case and token storage.
      // This function primarily reports the immediate outcome of the prompt.
      if (result.type === 'success') {
        return true;
      } else {
        // Handle other response types like 'cancel', 'dismiss', 'error'
        return false;
      }
    } catch (e) {
      console.error('Error during Google sign-in process:', e);
      return false;
    }
  };

  return { signInWithGoogle, request, response };
};
