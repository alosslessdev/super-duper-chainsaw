// services/googleCalendar.ts

import { getGoogleAccessToken } from '../awsKeyStore'; // Import to get the stored token

// Base URL for the Google Calendar API (version 3)
const GOOGLE_CALENDAR_API_BASE_URL = 'https://www.googleapis.com/calendar/v3';

/**
 * Interface defining the structure of a Google Calendar event.
 * Refer to Google Calendar API documentation for full details:
 * https://developers.google.com/calendar/api/v3/reference/events#resource
 */
interface CalendarEvent {
  summary: string; // Title of the event (e.g., "My Workout Session")
  location?: string; // Location of the event
  description?: string; // Detailed description of the event
  start: {
    dateTime: string; // Start time in ISO 8601 format (e.g., '2023-10-27T10:00:00-07:00')
    timeZone: string; // Timezone of the start time (e.g., 'America/New_York')
  };
  end: {
    dateTime: string; // End time in ISO 8601 format
    timeZone: string; // Timezone of the end time
  };
  recurrence?: string[]; // Optional: Array of recurrence rules (e.g., ['RRULE:FREQ=DAILY;COUNT=2'])
  attendees?: Array<{ email: string }>; // Optional: Array of attendees' emails
  reminders?: {
    useDefault: boolean; // Whether to use the user's default reminders
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>; // Custom reminders
  };
}

/**
 * Adds an event to the specified Google Calendar.
 *
 * @param calendarId The ID of the calendar to add the event to. 'primary' refers to the user's default calendar.
 * @param event The event object conforming to the CalendarEvent interface.
 * @returns A Promise that resolves with the created event data from the Google API.
 * @throws An error if no access token is available or if the API call fails.
 */
export const addEventToCalendar = async (
  calendarId: string = 'primary', // Default to the user's primary calendar
  event: CalendarEvent
): Promise<any> => {
  const accessToken = getGoogleAccessToken();

  // Ensure an access token is available before making the API call
  if (!accessToken) {
    console.error('No Google access token available. Please log in with Google first.');
    throw new Error('No Google access token.');
  }

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API_BASE_URL}/calendars/${calendarId}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`, // Use the access token for authorization
          'Content-Type': 'application/json', // Indicate that the body is JSON
        },
        body: JSON.stringify(event), // Convert the event object to a JSON string
      }
    );

    // Check if the response was successful (status code 2xx)
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error adding event to Google Calendar:', errorData);
      // Throw an error with a more descriptive message
      throw new Error(
        `Failed to add event: ${errorData.error?.message || response.statusText}`
      );
    }

    // Parse the successful response JSON
    const data = await response.json();
    console.log('Event successfully added to Google Calendar:', data);
    return data;
  } catch (error) {
    console.error('Network or API error when adding event:', error);
    throw error; // Re-throw the error for the calling function to handle
  }
};

/*
// Example of how to use addEventToCalendar:
// This would typically be called after a user has successfully logged in with Google
// and you have their access token.

const exampleEvent: CalendarEvent = {
  summary: 'My Daily Workout',
  location: 'Home Gym',
  description: 'Strength training and cardio session.',
  start: {
    dateTime: '2025-07-28T10:00:00-05:00', // Example: July 28, 2025, 10 AM EST
    timeZone: 'America/New_York', // Adjust timezone as needed for your users
  },
  end: {
    dateTime: '2025-07-28T11:00:00-05:00', // Example: July 28, 2025, 11 AM EST
    timeZone: 'America/New_York',
  },
  reminders: {
    useDefault: false, // Don't use default reminders
    overrides: [
      { method: 'popup', minutes: 15 }, // Pop-up reminder 15 minutes before
      { method: 'email', minutes: 60 }, // Email reminder 1 hour before
    ],
  },
};

// To use this function in your app (e.g., after a button press):
// import { addEventToCalendar } from '../services/googleCalendar';
// import { getGoogleAccessToken } from '../utils/awsKeyStore'; // To check if token exists

// async function handleAddWorkoutEvent() {
//   if (!getGoogleAccessToken()) {
//     console.warn('Google not logged in. Cannot add event.');
//     // Show a message to the user to log in with Google first
//     return;
//   }
//   try {
//     const eventData = await addEventToCalendar('primary', exampleEvent);
//     console.log('Event created:', eventData.htmlLink); // Link to the event in Google Calendar
//     // Show success message to user
//   } catch (error) {
//     console.error('Failed to add workout event:', error);
//     // Show error message to user
//   }
// }
*/
