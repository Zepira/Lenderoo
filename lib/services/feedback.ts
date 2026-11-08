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

/**
 * Submit anonymous user feedback
 *
 * @param comment - The feedback comment
 * @param screenshotUris - Local file URIs of screenshots to attach, if any
 */
export async function submitFeedback(
  comment: string,
  screenshotUris: string[] = [],
): Promise<void> {
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

  // Deliberately no .select() here — new rows default to display = false,
  // and the SELECT policies only allow reading rows where display = true.
  // Asking PostgREST to return the inserted row (the default `.select()`
  // does this via `Prefer: return=representation`) makes Postgres re-check
  // that row against the SELECT policies as part of the same statement,
  // which always fails for a fresh submission — surfacing as the exact
  // same "row-level security policy" error as a genuine auth problem, even
  // though the INSERT itself (governed by a separate, unconditional INSERT
  // policy) was never the issue. Confirmed by reproducing this directly in
  // SQL: identical insert with RETURNING fails RLS, without it succeeds.
  const { error } = await supabase.from('feedback').insert({
    comment: comment.trim(),
    screenshot_urls: screenshotUrls.length ? screenshotUrls : null,
    device_platform: deviceInfo.platform,
    device_os_version: deviceInfo.osVersion,
    device_model: deviceInfo.deviceModel,
    app_version: deviceInfo.appVersion,
  });

  if (error) {
    throw new Error(`Failed to submit feedback: ${error.message}`);
  }
}
