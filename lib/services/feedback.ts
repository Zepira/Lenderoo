/**
 * Feedback Service
 *
 * Handles anonymous user feedback submission. Submissions carry no user
 * identity — device/app info is still captured for debugging context, but
 * nothing traces a row back to who sent it.
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { supabase } from '../supabase';
import { uploadFeedbackScreenshots } from './storage';

export type FeedbackStatus = 'new' | 'in_review' | 'resolved' | 'wont_fix';

export interface Feedback {
  id: string;
  comment: string;
  status: FeedbackStatus;
  response?: string;
  display: boolean;
  screenshotUrls: string[];
  devicePlatform?: string;
  deviceOsVersion?: string;
  deviceModel?: string;
  appVersion?: string;
  createdAt: Date;
}

/**
 * Get device information for feedback context
 */
async function getDeviceInfo() {
  try {
    const platform = Platform.OS;
    const osVersion = Device.osVersion || undefined;
    const deviceModel = Device.modelName || Device.deviceName || undefined;
    const appVersion = Application.nativeApplicationVersion || undefined;

    return {
      platform,
      osVersion,
      deviceModel,
      appVersion,
    };
  } catch (error) {
    return {
      platform: Platform.OS,
      osVersion: undefined,
      deviceModel: undefined,
      appVersion: undefined,
    };
  }
}

function convertFeedbackFromDb(data: any): Feedback {
  return {
    id: data.id,
    comment: data.comment,
    status: data.status,
    response: data.response ?? undefined,
    display: data.display,
    screenshotUrls: data.screenshot_urls ?? [],
    devicePlatform: data.device_platform,
    deviceOsVersion: data.device_os_version,
    deviceModel: data.device_model,
    appVersion: data.app_version,
    createdAt: new Date(data.created_at),
  };
}

/**
 * Submit anonymous user feedback
 *
 * @param comment - The feedback comment
 * @param screenshotUris - Local file URIs of screenshots to attach, if any
 * @returns The created feedback record
 */
export async function submitFeedback(
  comment: string,
  screenshotUris: string[] = [],
): Promise<Feedback> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const deviceInfo = await getDeviceInfo();

  const screenshotUrls = screenshotUris.length
    ? await uploadFeedbackScreenshots(screenshotUris)
    : [];

  // Diagnostic: prove/disprove whether a valid session is actually attached
  // to this request. If accessTokenPresent is false or expiresAt is in the
  // past, the insert below goes out as anon (no Authorization header) and
  // gets rejected by RLS, which reads as this exact error even though the
  // UI believes the user is signed in.
  const { data: { session } } = await supabase.auth.getSession();
  console.log('submitFeedback session check', {
    sessionPresent: !!session,
    accessTokenPresent: !!session?.access_token,
    expiresAt: session?.expires_at,
    nowUnix: Math.floor(Date.now() / 1000),
  });

  const { data, error } = await supabase
    .from('feedback')
    .insert({
      comment: comment.trim(),
      screenshot_urls: screenshotUrls.length ? screenshotUrls : null,
      device_platform: deviceInfo.platform,
      device_os_version: deviceInfo.osVersion,
      device_model: deviceInfo.deviceModel,
      app_version: deviceInfo.appVersion,
    })
    .select()
    .single();

  if (error) {
    // Metro's console collapses Error objects to just .message — the
    // PostgrestError's code/details/hint (which usually explain *why* an
    // RLS policy rejected the row) get silently discarded once wrapped
    // below. Log them explicitly so they're actually visible when
    // diagnosing a submit failure.
    console.error('submitFeedback insert error', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Failed to submit feedback: ${error.message}`);
  }

  return convertFeedbackFromDb(data);
}
