// app/googleAuthCalendar.ts (or wherever your hook is located)
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

// This is important for Expo AuthSession to work correctly with redirects on web
WebBrowser.maybeCompleteAuthSession();

export const useGoogleAuth = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null); // State to store user email

  // Use the useAuthRequest hook from expo-auth-session/providers/google
  // client ID comes from your app.json -> android.config.googleSignIn.webClientId
  // The scopes below request access to the user's profile, email, and openid for identification.
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com', // Optional, but good practice if you have a specific Android client
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // Only needed if targeting iOS
    webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // MANDATORY: Use the Web client ID here from Google Cloud Console
    scopes: ['profile', 'email', 'openid'], // Request profile and email scopes
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      setAccessToken(authentication?.accessToken || null);
      // Once we have an access token, fetch user info to get the email
      if (authentication?.accessToken) {
        fetchUserInfo(authentication.accessToken);
      }
    } else if (response?.type === 'error') {
      Alert.alert('Google Sign-In Error', response.error?.message || 'Something went wrong during Google sign-in.');
    }
  }, [response]);

  const fetchUserInfo = async (token: string) => {
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userInfo = await userInfoResponse.json();
      if (userInfoResponse.ok) {
        setUserEmail(userInfo.email); // Extract the email
        console.log('User Info:', userInfo); // Log full user info for debugging
      } else {
        console.error('Failed to fetch user info:', userInfo);
        setUserEmail(null);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      setUserEmail(null);
    }
  };

  const signInWithGoogle = async (): Promise<boolean> => {
    try {
      const result = await promptAsync(); // Triggers the Google sign-in flow
      if (result.type === 'success') {
        // The useEffect above will handle setting accessToken and fetching user info
        return true;
      } else if (result.type === 'dismiss') {
        // User dismissed the login prompt
        Alert.alert('Sign-In Cancelled', 'You cancelled the Google sign-in process.');
        return false;
      } else {
        // Other error types from AuthSession
        Alert.alert('Sign-In Failed', 'Could not complete Google sign-in.');
        return false;
      }
    } catch (error) {
      console.error('Error during Google sign-in:', error);
      Alert.alert('Error', 'An unexpected error occurred during Google sign-in.');
      return false;
    }
  };

  return { signInWithGoogle, request, userEmail, accessToken }; // Expose userEmail
};