import { usePostHog } from 'posthog-js/react'
import { useCallback } from 'react'

export type TrackingEvent = 
  | 'page_viewed'
  | 'navigation_clicked'
  | 'location_selected'
  | 'chart_viewed'
  | 'chart_period_changed'
  | 'chart_property_type_changed'
  | 'map_viewed'
  | 'map_city_changed'
  | 'map_neighborhood_clicked'
  | 'map_municipality_clicked'
  | 'language_changed'
  | 'user_signed_up'
  | 'user_signed_in'
  | 'user_signed_out'
  | 'profile_updated'
  | 'admin_data_uploaded'
  | 'search_performed'
  | 'filter_applied'
  | 'contact_widget_opened'
  | 'contact_widget_closed'
  | 'contact_widget_submitted'
  | 'contact_widget_success'
  | 'contact_widget_failure'
  | 'home_top_mover_clicked'
  | 'home_explore_charts_clicked'
  | 'home_explore_calculators_clicked'
  | 'insights_explore_charts_clicked'
  | 'insights_neighborhood_clicked'
  // Conversion funnel events
  | 'signup_button_clicked'
  | 'signup_modal_opened'
  | 'signup_form_started'
  | 'signup_form_submitted'
  | 'signup_form_completed'
  | 'signup_form_abandoned'

export type TrackingPropertyValue = 
  | string 
  | number 
  | boolean 
  | null 
  | undefined 
  | { [key: string]: TrackingPropertyValue }
  | TrackingPropertyValue[]

export interface TrackingProperties {
  [key: string]: TrackingPropertyValue
}

export function useTracking() {
  const posthog = usePostHog()

  const track = useCallback(
    (event: TrackingEvent, properties?: TrackingProperties) => {
      // Only send events to PostHog in production
      if (process.env.NODE_ENV !== 'production' || !posthog) {
        return
      }

      try {
        posthog.capture(event, {
          ...properties,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        // Silently fail in production
      }
    },
    [posthog]
  )

  const identify = useCallback(
    (userId: string, properties?: TrackingProperties) => {
      // Only identify in production
      if (process.env.NODE_ENV !== 'production' || !posthog) return

      try {
        posthog.identify(userId, properties)
      } catch (error) {
        // Silently fail in production
      }
    },
    [posthog]
  )

  const reset = useCallback(() => {
    // Only reset in production
    if (process.env.NODE_ENV !== 'production' || !posthog) return

    try {
      posthog.reset()
    } catch (error) {
      // Silently fail in production
    }
  }, [posthog])

  return { track, identify, reset }
}

