import { Component, inject } from '@angular/core';
import { SeoService } from '../../core/services/seo.service';
import { SITE_BASE_URL } from '../../core/seo.config';

@Component({
  selector: 'app-service-discontinued-page',
  standalone: true,
  templateUrl: './service-discontinued.page.html',
  styleUrl: './service-discontinued.page.scss',
})
export class ServiceDiscontinuedPage {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.update({
      title: 'Servei aturat — Partits al Calendari',
      description:
        "Partits al Calendari ha deixat de sincronitzar partits de la Federació Catalana de Futbol (FCF), que no autoritza l'ús de les seves dades per part de tercers.",
      url: `${SITE_BASE_URL}/`,
    });
  }
}
