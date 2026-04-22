import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  async downloadGuide(): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const left = 52;
    let y = 72;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('Guía de Autores - Revista Huellas', left, y);

    y += 28;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);

    const lineas = [
      '1. Verifique que su manuscrito cumpla la estructura solicitada por la revista.',
      '2. Incluya resumen, palabras clave, referencias completas y afiliación institucional.',
      '3. Adjunte carta de originalidad y datos de contacto de los autores.',
      '4. Revise los requisitos técnicos de formato antes de enviar su artículo.',
      '5. Consulte las directrices completas en la sección Envíos del portal.',
    ];

    lineas.forEach((linea) => {
      const wrapped = pdf.splitTextToSize(linea, 490);
      pdf.text(wrapped, left, y);
      y += wrapped.length * 16;
    });

    y += 8;
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(10);
    pdf.text('Documento generado desde la plataforma Revista Huellas.', left, y);
    pdf.save('guia-autores-huellas.pdf');
  }
}
