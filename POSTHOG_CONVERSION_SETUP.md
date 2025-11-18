# PostHog Conversion Rate Tracking Setup

This guide explains how to track sign-up conversion rates using PostHog.

## Events Being Tracked

The following events are automatically tracked for the sign-up conversion funnel:

1. **`signup_button_clicked`** - User clicks "Get Started Free" button
   - Properties: `source` (e.g., "homepage")

2. **`signup_modal_opened`** - Sign-up modal/form is displayed

3. **`signup_form_started`** - User begins filling out the form (first field interaction)

4. **`signup_form_submitted`** - User submits the form (before validation)

5. **`signup_form_completed`** - User successfully completes sign-up
   - Properties: `method` (e.g., "email"), `language` (e.g., "en", "es", "zh")

6. **`signup_form_abandoned`** - User closes modal without completing sign-up
   - Properties: `fields_filled` (object with email, password, name counts)

7. **`user_signed_up`** - Final sign-up event (success or failure)
   - Properties: `success` (boolean), `method`, `language`, `error` (if failed)

## Setting Up Conversion Funnel in PostHog

### Step 1: Create a Funnel

1. Log in to your PostHog dashboard
2. Navigate to **Insights** → **New Insight**
3. Select **Funnel** as the insight type

### Step 2: Define Funnel Steps

Add the following steps in order:

1. **Step 1:** `signup_button_clicked`
   - Description: "User clicked signup button"
   
2. **Step 2:** `signup_modal_opened`
   - Description: "Signup modal opened"
   
3. **Step 3:** `signup_form_started`
   - Description: "User started filling form"
   
4. **Step 4:** `signup_form_submitted`
   - Description: "User submitted form"
   
5. **Step 5:** `signup_form_completed` OR `user_signed_up` (with `success: true`)
   - Description: "User completed signup"

### Step 3: Configure Funnel Settings

- **Conversion Window:** Set to 30 minutes (or your preferred time)
- **Funnel Order:** Sequential (users must complete steps in order)
- **Funnel Type:** Time-based (optional, for time-to-convert analysis)

### Step 4: Add Filters (Optional)

You can filter by:
- **Source:** Filter by `source` property to see conversion from different pages
- **Language:** Filter by `language` property to see conversion by language
- **Method:** Filter by `method` property (email vs Google)

### Step 5: Save and Monitor

1. Save the funnel with a descriptive name (e.g., "Sign-up Conversion Funnel")
2. Add it to your dashboard for easy monitoring
3. Set up alerts for significant drops in conversion rate

## Analyzing Conversion Data

### Key Metrics to Monitor

1. **Overall Conversion Rate:** Percentage of users who complete all steps
2. **Step-by-Step Drop-off:** See where users are leaving the funnel
3. **Time to Convert:** Average time from button click to completion
4. **Abandonment Rate:** Track `signup_form_abandoned` events

### Common Drop-off Points

- **Between Step 1-2:** Users clicking but modal not opening (check for errors)
- **Between Step 2-3:** Users viewing form but not starting (form might be intimidating)
- **Between Step 3-4:** Users starting but not submitting (form too long or confusing)
- **Between Step 4-5:** Users submitting but failing validation or API errors

### Improving Conversion

Use the funnel data to:
1. **Identify bottlenecks:** Focus on steps with highest drop-off
2. **A/B test changes:** Test form length, field order, validation messages
3. **Optimize UX:** Simplify steps with high abandonment
4. **Fix errors:** Monitor `user_signed_up` events with `success: false` to fix issues

## Advanced: Creating Multiple Funnels

### By Source
Create separate funnels filtered by `source` property:
- Homepage signups
- Other page signups

### By Language
Create separate funnels filtered by `language` property:
- English signups
- Spanish signups
- Chinese signups

### By Method
Create separate funnels for:
- Email signups (`method: "email"`)
- Google signups (`method: "google"`)

## Troubleshooting

### Events Not Appearing

1. **Check PostHog Configuration:**
   - Verify `NEXT_PUBLIC_POSTHOG_KEY` is set in production
   - Verify `NEXT_PUBLIC_POSTHOG_HOST` is correct
   - Check that `NODE_ENV=production` (events only track in production)

2. **Check Browser Console:**
   - Look for PostHog errors
   - Verify events are being sent (check Network tab)

3. **Verify Event Names:**
   - Ensure event names match exactly (case-sensitive)
   - Check PostHog → Activity → Live Events to see incoming events

### Low Conversion Rates

1. **Check Abandonment Events:**
   - Review `signup_form_abandoned` events
   - Check `fields_filled` to see how far users got

2. **Review Error Events:**
   - Check `user_signed_up` events with `success: false`
   - Look for common error messages

3. **Analyze Time Between Steps:**
   - Long delays might indicate confusion or technical issues

## Example PostHog Query

For a quick conversion rate calculation:

```
Funnel Steps:
1. signup_button_clicked
2. signup_form_completed

Filter: success = true
Time Range: Last 30 days
```

This will show you the percentage of users who click "Get Started" and actually complete signup.


