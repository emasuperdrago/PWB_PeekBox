import { Injectable } from '@angular/core';
import { DatabaseService } from './database';

/**
 * ExportService
 * ─────────────────────────────────────────────────────────────
 * Gestisce la generazione di PDF etichette (stampa griglia) e il
 * download dei formati strutturati CSV / JSON dell'inventario.
 *
 * Il PDF viene prodotto interamente nel browser usando l'API
 * window.print() su un documento HTML dedicato, senza dipendenze
 * esterne (nessuna lib PDF aggiuntiva da installare).
 * Per ambienti dove è disponibile jsPDF è possibile sostituire
 * printEtichetteBox() con l'implementazione commentata in fondo.
 */
@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor(private dbService: DatabaseService) {}

  // ─── PDF ETICHETTE ────────────────────────────────────────

  /**
   * Genera e stampa una griglia di etichette per tutti gli oggetti
   * contenuti in una box. Ogni etichetta riporta: nome oggetto,
   * categoria, quantità, flag FRAGILE e il nome della box.
   *
   * @param boxId  ID della box di cui stampare le etichette
   */
  async stampaEtichetteBox(boxId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.dbService.getEtichetteBox(boxId).subscribe({
        next: (data: any) => {
          const { box, oggetti } = data;
          const html = this.buildEtichetteHtml(box, oggetti);
          this.apriFinestraStampa(html);
          resolve();
        },
        error: (err: any) => reject(err)
      });
    });
  }

  /**
   * Costruisce l'HTML della griglia di etichette da stampare.
   * Il CSS è inlined per garantire la corretta resa in fase di print.
   */
  private buildEtichetteHtml(box: any, oggetti: any[]): string {
    const etichette = oggetti.map(ogg => `
      <div class="etichetta">
        <div class="etichetta-header">
          <span class="etichetta-box">${this.esc(box.nome)}</span>
          ${ogg.fragile ? '<span class="fragile-badge">FRAGILE</span>' : ''}
        </div>
        <div class="etichetta-nome">${this.esc(ogg.nome)}</div>
        <div class="etichetta-footer">
          <span class="etichetta-tipo">${this.esc(ogg.tipo || '—')}</span>
          <span class="etichetta-qty">Q.tà: ${ogg.quantita}</span>
        </div>
        ${ogg.descrizione ? `<div class="etichetta-desc">${this.esc(ogg.descrizione)}</div>` : ''}
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Etichette — ${this.esc(box.nome)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      background: #fff;
      padding: 12mm;
    }

    h1 {
      font-size: 14pt;
      margin-bottom: 8mm;
      color: #1a1a2e;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4mm;
    }

    .griglia {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6mm;
    }

    .etichetta {
      border: 1.5px solid #333;
      border-radius: 4mm;
      padding: 4mm 5mm;
      min-height: 32mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-inside: avoid;
    }

    .etichetta-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2mm;
    }

    .etichetta-box {
      font-size: 7pt;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .fragile-badge {
      background: #e53935;
      color: #fff;
      font-size: 6pt;
      font-weight: bold;
      padding: 1px 3px;
      border-radius: 2px;
    }

    .etichetta-nome {
      font-size: 11pt;
      font-weight: 700;
      color: #1a1a2e;
      line-height: 1.2;
      margin: 1mm 0;
      word-break: break-word;
    }

    .etichetta-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 2mm;
    }

    .etichetta-tipo {
      font-size: 7.5pt;
      color: #444;
      font-style: italic;
    }

    .etichetta-qty {
      font-size: 7.5pt;
      font-weight: 600;
      color: #333;
    }

    .etichetta-desc {
      font-size: 6.5pt;
      color: #777;
      margin-top: 2mm;
      border-top: 0.5px dashed #ccc;
      padding-top: 1.5mm;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    @media print {
      body { padding: 8mm; }
      .griglia { gap: 4mm; }
    }
  </style>
</head>
<body>
  <h1>📦 Etichette box — ${this.esc(box.nome)} (${this.esc(box.armadio)})</h1>
  <div class="griglia">
    ${etichette}
  </div>
</body>
</html>`;
  }

  /** Apre una finestra di stampa con l'HTML generato. */
  private apriFinestraStampa(html: string): void {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    // Piccolo delay per assicurarsi che il rendering sia completo
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  }

  // ─── DOWNLOAD CSV ─────────────────────────────────────────

  /**
   * Scarica l'inventario in formato CSV.
   * @param utenteId  ID dell'utente autenticato
   */
  downloadCsv(utenteId: string): void {
    this.dbService.getExportCsv(utenteId).subscribe({
      next: (blob: Blob) => {
        this.triggerDownload(blob, `peekbox-inventario.csv`, 'text/csv;charset=utf-8;');
      },
      error: (err: any) => console.error('Errore export CSV:', err)
    });
  }

  // ─── DOWNLOAD JSON ────────────────────────────────────────

  /**
   * Scarica l'inventario in formato JSON strutturato.
   * @param utenteId  ID dell'utente autenticato
   */
  downloadJson(utenteId: string): void {
    this.dbService.getExportJson(utenteId).subscribe({
      next: (blob: Blob) => {
        this.triggerDownload(blob, `peekbox-inventario.json`, 'application/json');
      },
      error: (err: any) => console.error('Errore export JSON:', err)
    });
  }

  // ─── UTILITY ─────────────────────────────────────────────

  /** Innesca il download di un Blob nel browser. */
  private triggerDownload(blob: Blob, filename: string, mimeType: string): void {
    const url = URL.createObjectURL(new Blob([blob], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /** Escaping HTML di base per prevenire injection nel template PDF. */
  private esc(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
