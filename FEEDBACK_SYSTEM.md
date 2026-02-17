# Feedback System

A user feedback system that allows users to submit comments and suggestions directly from the app.

## Features

✅ **Easy Access** - Feedback button positioned above the Add Item FAB
✅ **Simple Interface** - Clean modal with textarea for comments
✅ **User Context** - Automatically captures user ID, email, and name
✅ **Character Limit** - Shows character count (max 1000)
✅ **Validation** - Prevents empty submissions
✅ **Unsaved Changes Warning** - Prompts user before discarding feedback
✅ **Loading States** - Shows progress during submission

## Components

### 1. **FeedbackModal** (`components/FeedbackModal.tsx`)
- Modal dialog for entering feedback
- Character counter
- Submit/cancel actions
- Loading and error states
- Unsaved changes protection

### 2. **Feedback Button** (in `app/(tabs)/_layout.tsx`)
- MessageSquare icon
- Positioned 160px above bottom (80px above FAB)
- Matches app theme (light/dark)
- Accessible from all tabs

## Database

### Table: `feedback`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References users table |
| `comment` | TEXT | The feedback text |
| `user_email` | TEXT | User's email (for follow-up) |
| `user_name` | TEXT | User's name (for context) |
| `device_platform` | TEXT | Platform (ios, android, web) |
| `device_os_version` | TEXT | OS version (e.g., "17.0", "Android 13") |
| `device_model` | TEXT | Device model/brand (e.g., "iPhone 15 Pro") |
| `app_version` | TEXT | App version (e.g., "1.0.0") |
| `created_at` | TIMESTAMPTZ | Submission timestamp |

### Row Level Security (RLS)

- **Insert**: Users can only create their own feedback
- **Select**: Users can only view their own feedback
- **Admin access**: Admins need a separate policy to view all feedback (not included)

## Service Functions

### `submitFeedback(comment: string)`
Submits user feedback with automatic user context.

**Parameters:**
- `comment` - The feedback text (required, trimmed)

**Returns:**
- `Feedback` object with id, userId, comment, etc.

**Throws:**
- Error if not authenticated
- Error if submission fails

### `getUserFeedback()`
Retrieves all feedback submitted by the current user.

**Returns:**
- Array of `Feedback` objects, sorted by created_at DESC

## Setup Instructions

### 1. Run the Migration

```bash
# Apply the migration to create the feedback table
npx supabase db push
```

Or manually run the SQL from `supabase/migrations/013_feedback_table.sql`

### 2. Verify Table Creation

Check in Supabase Dashboard:
1. Go to Database → Tables
2. Look for `feedback` table
3. Verify RLS policies are enabled

### 3. Test the Feature

1. Open the app
2. Click the feedback button (above the + FAB)
3. Enter some feedback
4. Submit
5. Check Supabase dashboard → feedback table

## Viewing Feedback (Admin)

To view all user feedback as an admin:

### Option 1: Supabase Dashboard
1. Go to Database → Tables → feedback
2. Click "View all rows"
3. See all feedback with user details

### Option 2: Add Admin Policy (Optional)

```sql
-- Create admin role policy
CREATE POLICY "Admins can view all feedback"
    ON feedback
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );
```

### Option 3: API Endpoint (Future)

Create a server endpoint to fetch all feedback:
- Requires admin authentication
- Returns paginated feedback
- Can filter by date range, user, etc.

## Usage Examples

### Submit Feedback
```typescript
import { submitFeedback } from '@/lib/feedback-service';

try {
  await submitFeedback('Great app! Would love to see dark mode improvements.');
  console.log('Feedback submitted successfully');
} catch (error) {
  console.error('Failed to submit feedback:', error);
}
```

### Get User's Feedback History
```typescript
import { getUserFeedback } from '@/lib/feedback-service';

const history = await getUserFeedback();
console.log(`User has submitted ${history.length} feedback items`);
```

## Future Enhancements

### Potential Features
- [ ] Feedback categories (Bug, Feature Request, General)
- [ ] Attach screenshots
- [ ] Rating system (1-5 stars)
- [ ] Status tracking (New, Reviewed, Resolved)
- [ ] Email notifications when feedback is reviewed
- [ ] In-app feedback history view
- [ ] Admin dashboard for managing feedback
- [ ] Analytics (sentiment analysis, common themes)
- [ ] Reply system (admin responses to users)

### Analytics Ideas
- Track most common feedback topics
- Measure user satisfaction over time
- Identify power users who provide feedback
- Monitor feedback volume trends

## Troubleshooting

### "Failed to submit feedback"
- Check user is authenticated
- Verify feedback table exists in Supabase
- Check RLS policies are enabled
- Review browser console for errors

### Feedback button not visible
- Check tab layout is rendering
- Verify button positioning (should be above FAB)
- Check theme colors are correct

### Character limit issues
- Current limit: 1000 characters
- Modify in FeedbackModal.tsx if needed
- Consider adding database constraint

## Notes

- Feedback is anonymous to other users (only visible to admins)
- Email and name are stored for admin context only
- Consider GDPR/privacy compliance for your region
- Feedback cannot be edited after submission (by design)
- No character minimum (but empty submissions are blocked)
