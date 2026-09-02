import { Component, computed, input, signal } from '@angular/core';

/**
 * The two ways a subscriber can start following a team's calendar:
 * a `webcal://` link (opens Apple Calendar's native "add subscription"
 * dialog directly on iOS/macOS — see Milestone 4's real-device
 * verification) and a plain HTTPS URL to copy into any other calendar
 * app. Never promises instant sync — see the app's copy below and the
 * project README's "Sincronización" section for why.
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

  readonly httpsUrl = computed(
    () => `${window.location.origin}/api/calendar/${encodeURIComponent(this.groupId())}/${encodeURIComponent(this.teamId())}.ics`,
  );

  readonly webcalUrl = computed(() => this.httpsUrl().replace(/^https?:\/\//, 'webcal://'));

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
