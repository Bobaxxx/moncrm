import { supabase } from '../db/database.js';
import { generateInvoicePDF } from './pdfService.js';

export const createInvoice = async (invoiceData) => {
  const { type, prospect_id, client_name, client_address, client_siren, date_emission, date_echeance, date_prestation, items } = invoiceData;

  // 1. Déterminer le prochain numéro
  const year = new Date().getFullYear();
  const prefix = type === 'quote' ? 'DEV' : 'FAC';
  
  const { data: lastInvoice } = await supabase
    .from('invoices')
    .select('number')
    .eq('type', type)
    .like('number', `${prefix}-${year}-%`)
    .order('number', { ascending: false })
    .limit(1);
    
  let nextNum = 10;
  if (lastInvoice && lastInvoice.length > 0) {
    const parts = lastInvoice[0].number.split('-');
    const lastNum = parseInt(parts[parts.length - 1]);
    nextNum = lastNum + 1;
  }
  
  const invoiceNumber = `${prefix}-${year}-${String(nextNum).padStart(3, '0')}`;
  const total_ht = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  
  // 3. Insérer la facture
  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .insert({
      number: invoiceNumber,
      type,
      status: 'a_envoyer',
      prospect_id,
      client_name,
      client_address,
      client_siren,
      date_emission: date_emission || new Date().toISOString().split('T')[0],
      date_echeance,
      date_prestation,
      total_ht
    })
    .select()
    .single();
    
  if (invError) throw invError;
  
  // 4. Insérer les items
  const itemsToInsert = items.map(item => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: item.quantity * item.unit_price
  }));
  
  const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert);
  if (itemsError) throw itemsError;
  
  // 5. Générer le PDF
  const pdfData = await generateInvoicePDF(invoice, itemsToInsert);
  
  // 6. Mettre à jour l'URL du PDF
  const { data: finalInvoice } = await supabase
    .from('invoices')
    .update({ pdf_url: pdfData.url })
    .eq('id', invoice.id)
    .select()
    .single();
    
  return { ...finalInvoice, items: itemsToInsert };
};
