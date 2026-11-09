export const SERVICE_DISCONTINUED_MESSAGE =
  "Aquest servei s'ha aturat: la Federació Catalana de Futbol no autoritza l'ús de les seves dades per part de tercers, i hem deixat de consultar els seus sistemes.";

export const SERVICE_DISCONTINUED_HEADERS: Readonly<Record<string, string>> = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-store',
};
