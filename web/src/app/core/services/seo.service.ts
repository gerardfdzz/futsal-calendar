import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoData {
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly image?: string;
}

const DEFAULT_OG_IMAGE = 'https://partitsalcalendari.com/og-image.png';
const JSON_LD_ELEMENT_ID = 'seo-jsonld';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);

  update(data: SeoData): void {
    this.titleService.setTitle(data.title);
    this.meta.updateTag({ name: 'description', content: data.description });
    this.meta.updateTag({ property: 'og:title', content: data.title });
    this.meta.updateTag({ property: 'og:description', content: data.description });
    this.meta.updateTag({ property: 'og:url', content: data.url });
    this.meta.updateTag({ property: 'og:image', content: data.image ?? DEFAULT_OG_IMAGE });
    this.meta.updateTag({ name: 'twitter:title', content: data.title });
    this.meta.updateTag({ name: 'twitter:description', content: data.description });
    this.meta.updateTag({ name: 'twitter:image', content: data.image ?? DEFAULT_OG_IMAGE });
    this.setCanonical(data.url);
  }

  setJsonLd(data: Readonly<Record<string, unknown>>): void {
    const script = this.getOrCreateJsonLdElement();
    script.textContent = JSON.stringify(data);
  }

  clearJsonLd(): void {
    document.getElementById(JSON_LD_ELEMENT_ID)?.remove();
  }

  private setCanonical(url: string): void {
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private getOrCreateJsonLdElement(): HTMLScriptElement {
    let script = document.getElementById(JSON_LD_ELEMENT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = JSON_LD_ELEMENT_ID;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    return script;
  }
}
