import { Component, computed, input, signal } from '@angular/core';

type CalendarPlatform = 'apple' | 'android' | 'other';

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

  readonly googleCalendarAddByUrlUrl = 'https://calendar.google.com/calendar/u/0/r/settings/addbyurl';

  async copyUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.httpsUrl());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
    }
  }
}
