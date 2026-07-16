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
    throw new Error(`Failed to submit feedback: ${error.message}`);
  }

  return convertFeedbackFromDb(data);
}
