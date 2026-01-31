/**
 * Auth Error Messages
 *
 * Provides user-friendly error messages for Supabase auth errors
 */

export function getAuthErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred';

  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || error.status;

  // Password-related errors
  if (errorMessage.includes('password')) {
    if (errorMessage.includes('too short') || errorMessage.includes('at least')) {
      return 'Password must be at least 6 characters long';
    }
    if (errorMessage.includes('invalid') || errorMessage.includes('incorrect')) {
      return 'Incorrect email or password';
    }
    if (errorMessage.includes('weak')) {
      return 'Password is too weak. Please use a stronger password';
    }
  }

  // Email-related errors
  if (errorMessage.includes('email')) {
    if (errorMessage.includes('invalid')) {
      return 'Please enter a valid email address';
    }
    if (errorMessage.includes('already') || errorMessage.includes('exists')) {
      return 'An account with this email already exists';
    }
    if (errorMessage.includes('not found')) {
      return 'No account found with this email';
    }
    if (errorMessage.includes('not confirmed') || errorMessage.includes('verify')) {
      return 'Please verify your email address before signing in';
    }
  }

  // Authentication errors
  if (errorMessage.includes('invalid login credentials') ||
      errorMessage.includes('invalid credentials')) {
    return 'Incorrect email or password';
  }

  if (errorMessage.includes('user not found')) {
    return 'No account found with this email';
  }

  if (errorMessage.includes('email not confirmed')) {
    return 'Please verify your email before signing in';
  }

  // Rate limiting
  if (errorMessage.includes('too many requests') || errorCode === 429) {
    return 'Too many login attempts. Please try again in a few minutes';
  }

  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Network error. Please check your connection and try again';
  }

  // Server errors
  if (errorCode >= 500) {
    return 'Server error. Please try again later';
  }

  // Signup-specific errors
  if (errorMessage.includes('user already registered')) {
    return 'This email is already registered';
  }

  // Database errors
  if (errorMessage.includes('database')) {
    return 'Database error. Please try again';
  }

  // Default to the original message if we can't parse it
  // But try to make it more user-friendly
  if (error.message) {
    // Remove technical jargon
    let message = error.message
      .replace(/PGRST\d+/g, '')
      .replace(/\(SQLSTATE \w+\)/g, '')
      .trim();

    // Capitalize first letter
    message = message.charAt(0).toUpperCase() + message.slice(1);

    return message;
  }

  return 'Authentication failed. Please try again';
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < 6) {
    return {
      valid: false,
      message: 'Password must be at least 6 characters long',
    };
  }

  if (password.length > 72) {
    return {
      valid: false,
      message: 'Password must be less than 72 characters',
    };
  }

  return { valid: true };
}

/**
 * Validate name
 */
export function validateName(name: string): {
  valid: boolean;
  message?: string;
} {
  if (!name || name.trim().length === 0) {
    return {
      valid: false,
      message: 'Name is required',
    };
  }

  if (name.trim().length < 2) {
    return {
      valid: false,
      message: 'Name must be at least 2 characters long',
    };
  }

  return { valid: true };
}
