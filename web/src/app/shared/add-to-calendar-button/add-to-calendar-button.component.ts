import { Component, computed, input, signal } from '@angular/core';

type CalendarPlatform = 'apple' | 'android' | 'other';

/** Apple (iOS/macOS) is the only platform whose calendar app opens a
 *  `webcal://` link directly. Android's Google Calendar app has no way
 *  to subscribe by URL at all — it has to be added from
 *  calendar.google.com in a browser, which then syncs to the phone. */
function detectPlatform(): CalendarPlatform {
  if (typeof navigator === 'undefined') {
    return 'other';
  }
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isIOS || /Macintosh/.test(ua)) {
    return 'apple';
  }
  if (/Android/.test(ua)) {
    return 'android';
  }
  return 'other';
}

/**
 * The ways a subscriber can start following a team's calendar, adapted
 * to the platform: a one-tap `webcal://` link on Apple devices, or a
 * "copy URL" + Google Calendar shortcut everywhere else (see
 * `detectPlatform`). Never promises instant sync.
 */
@Component({
  selector: 'app-add-to-calendar-button',
  standalone: true,
  templateUrl: './add-to-calendar-button.component.html',
  styleUrl: './add-to-calendar-button.component.scss',
})
export class AddToCalendarButtonComponent {
  readonly groupId = input.required<string>();
  readonly teamId = input.required<string>();

  readonly copied = signal(false);

  private readonly platform: CalendarPlatform = detectPlatform();
  readonly isApple = this.platform === 'apple';
  readonly isAndroid = this.platform === 'android';

  readonly httpsUrl = computed(
    () => `${window.location.origin}/api/calendar/${encodeURIComponent(this.groupId())}/${encodeURIComponent(this.teamId())}.ics`,
  );

  readonly webcalUrl = computed(() => this.httpsUrl().replace(/^https?:\/\//, 'webcal://'));

  /** No prefill parameter for the target URL is documented/reliable, so
   *  this just opens Google Calendar's "add by URL" screen — the user
   *  still pastes the copied URL there themselves. */
  readonly googleCalendarAddByUrlUrl = 'https://calendar.google.com/calendar/u/0/r/settings/addbyurl';

  async copyUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.httpsUrl());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // The Clipboard API can refuse (permissions, insecure context) —
      // the URL is still visible/selectable below, so this fails soft.
    }
  }
}
