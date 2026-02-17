/**
 * Feedback Service
 *
 * Handles user feedback submission
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { supabase } from './supabase';

export interface Feedback {
  id: string;
  userId: string;
  comment: string;
  userEmail?: string;
  userName?: string;
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
    console.warn('Failed to get device info:', error);
    return {
      platform: Platform.OS,
      osVersion: undefined,
      deviceModel: undefined,
      appVersion: undefined,
    };
  }
}

/**
 * Submit user feedback
 *
 * @param comment - The feedback comment
 * @returns The created feedback record
 */
export async function submitFeedback(comment: string): Promise<Feedback> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get user profile for additional context
  const { data: profile } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', user.id)
    .single();

  // Get device information
  const deviceInfo = await getDeviceInfo();

  const { data, error } = await supabase
    .from('feedback')
    .insert({
      user_id: user.id,
      comment: comment.trim(),
      user_email: profile?.email || user.email,
      user_name: profile?.name,
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

  return {
    id: data.id,
    userId: data.user_id,
    comment: data.comment,
    userEmail: data.user_email,
    userName: data.user_name,
    devicePlatform: data.device_platform,
    deviceOsVersion: data.device_os_version,
    deviceModel: data.device_model,
    appVersion: data.app_version,
    createdAt: new Date(data.created_at),
  };
}

/**
 * Get user's feedback history
 *
 * @returns Array of user's feedback
 */
export async function getUserFeedback(): Promise<Feedback[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch feedback: ${error.message}`);
  }

  return (data || []).map((item) => ({
    id: item.id,
    userId: item.user_id,
    comment: item.comment,
    userEmail: item.user_email,
    userName: item.user_name,
    devicePlatform: item.device_platform,
    deviceOsVersion: item.device_os_version,
    deviceModel: item.device_model,
    appVersion: item.app_version,
    createdAt: new Date(item.created_at),
  }));
}
