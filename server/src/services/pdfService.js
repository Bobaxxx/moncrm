import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateInvoicePDF = async (invoice, items) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const filename = `${invoice.type === 'quote' ? 'DEVIS' : 'FACTURE'}_${invoice.number}.pdf`;
      const uploadDir = path.join(__dirname, '../../uploads');
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, filename);
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);

      // --- HEADER ---
      // Logo placeholder (rectangle for now or text)
      doc.fontSize(10).text('JMIND AGENCY', 450, 50, { align: 'right' });
      
      doc.fontSize(12).font('Helvetica-Bold').text('Jules Marcon EI', 300, 75, { align: 'right' });
      doc.fontSize(10).font('Helvetica').text('1 CHEMIN DE L\'ASSEMBLEE, 43700 CHASPINHAC', 300, 90, { align: 'right' });
      doc.text('jules43700@gmail.com', 300, 105, { align: 'right' });
      doc.text('0762100255', 300, 120, { align: 'right' });
      doc.text('SIREN : 93953851800019', 300, 135, { align: 'right' });

      // Client Info
      doc.fontSize(11).font('Helvetica-Bold').text(invoice.client_name.toUpperCase(), 50, 175);
      if (invoice.client_address) {
        doc.fontSize(10).font('Helvetica').text(invoice.client_address, 50, 190);
      }
      if (invoice.client_siren) {
        doc.text(`SIREN : ${invoice.client_siren}`, 50, 205);
      }

      // Invoice Title
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#1e3a8a')
        .text(`${invoice.type === 'quote' ? 'Devis' : 'Facture'} # ${invoice.number}`, 50, 240, { align: 'right' });

      // Dates Section
      doc.fillColor('black');
      doc.rect(50, 280, 500, 40).fill('#f3f4f6');
      doc.fillColor('black').font('Helvetica-Bold').fontSize(10);
      doc.text('Date d\'émission', 60, 285);
      doc.text('Date d\'échéance', 210, 285);
      doc.text('Contact', 360, 285);
      
      doc.font('Helvetica').fontSize(10);
      doc.text(new Date(invoice.date_emission).toLocaleDateString('fr-FR'), 60, 300);
      doc.text(invoice.date_echeance ? new Date(invoice.date_echeance).toLocaleDateString('fr-FR') : '-', 210, 300);
      doc.text('Jules Marcon', 360, 300);

      // --- TABLE HEADER ---
      const tableTop = 350;
      doc.rect(50, tableTop, 500, 20).fill('#1e3a8a');
      doc.fillColor('white').font('Helvetica-Bold').fontSize(10);
      doc.text('Description', 60, tableTop + 5);
      doc.text('Quantité', 350, tableTop + 5, { width: 50, align: 'center' });
      doc.text('Prix Unit. HT', 400, tableTop + 5, { width: 60, align: 'right' });
      doc.text('Montant HT', 470, tableTop + 5, { width: 70, align: 'right' });

      // --- ITEMS ---
      let currentY = tableTop + 25;
      doc.fillColor('black').font('Helvetica');
      
      items.forEach((item, index) => {
        // Stripe rows
        if (index % 2 === 1) {
          doc.rect(50, currentY - 5, 500, 20).fill('#f9fafb');
        }
        
        doc.fillColor('black');
        doc.text(item.description, 60, currentY, { width: 280 });
        doc.text(item.quantity.toString(), 350, currentY, { width: 50, align: 'center' });
        doc.text(`${item.unit_price.toFixed(2)} €`, 400, currentY, { width: 60, align: 'right' });
        doc.text(`${item.total.toFixed(2)} €`, 470, currentY, { width: 70, align: 'right' });
        
        currentY += 25;
      });

      // --- TOTALS ---
      currentY += 10;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Total HT', 350, currentY);
      doc.font('Helvetica').text(`${invoice.total_ht.toFixed(2)} €`, 470, currentY, { width: 70, align: 'right' });
      
      currentY += 20;
      doc.font('Helvetica-Bold').text('TVA (0%)', 350, currentY);
      doc.font('Helvetica').text('0,00 €', 470, currentY, { width: 70, align: 'right' });
      
      currentY += 25;
      doc.rect(340, currentY - 5, 210, 30).fill('#1e3a8a');
      doc.fillColor('white').fontSize(12).font('Helvetica-Bold');
      doc.text('TOTAL TTC', 350, currentY + 5);
      doc.text(`${invoice.total_ht.toFixed(2)} €`, 470, currentY + 5, { width: 70, align: 'right' });

      // --- FOOTER & LEGAL ---
      doc.fillColor('black').font('Helvetica').fontSize(9);
      const footerY = 700;
      doc.text('TVA non applicable, art. 293 B du CGI', 50, footerY);
      doc.text('Conditions de règlement : Règlement immédiat ou selon la date d\'échéance indiquée.', 50, footerY + 15);

      doc.fontSize(9).font('Helvetica').text('Page 1 / 1', 50, 780, { align: 'center' });
      
      doc.end();
      
      stream.on('finish', () => {
        resolve({ filename, filePath, url: `/uploads/${filename}` });
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};
