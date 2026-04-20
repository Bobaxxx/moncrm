import { Router } from 'express';
import { supabase } from '../db/database.js';
import { generateInvoicePDF } from '../services/pdfService.js';

const router = Router();

// GET /api/billing - Liste des documents
router.get('/', async (req, res) => {
  const { status, type } = req.query;
  
  let query = supabase.from('invoices').select('*').order('created_at', { ascending: false });
  
  if (status) query = query.eq('status', status);
  if (type) query = query.eq('type', type);
  
  const { data, error } = await query;
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/billing/:id - Détails d'une facture avec ses items
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single();
    
  if (invError) return res.status(500).json({ error: invError.message });
  
  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id);
    
  if (itemsError) return res.status(500).json({ error: itemsError.message });
  
  res.json({ ...invoice, items });
});

// POST /api/billing - Création d'un document
router.post('/', async (req, res) => {
  const { type, prospect_id, client_name, client_address, client_siren, date_emission, date_echeance, date_prestation, items } = req.body;
  
  try {
    // 1. Déterminer le prochain numéro
    const year = new Date().getFullYear();
    const prefix = type === 'quote' ? 'DEV' : 'FAC';
    
    // Récupérer le dernier numéro pour cette année et ce type
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('number')
      .eq('type', type)
      .like('number', `${prefix}-${year}-%`)
      .order('number', { ascending: false })
      .limit(1);
      
    let nextNum = 10; // Valeur par défaut demandée par l'utilisateur
    if (lastInvoice && lastInvoice.length > 0) {
      const parts = lastInvoice[0].number.split('-');
      const lastNum = parseInt(parts[parts.length - 1]);
      nextNum = lastNum + 1;
    }
    
    const invoiceNumber = `${prefix}-${year}-${String(nextNum).padStart(3, '0')}`;
    
    // 2. Calculer le total HT
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
    await supabase.from('invoices').update({ pdf_url: pdfData.url }).eq('id', invoice.id);
    
    res.json({ ...invoice, items: itemsToInsert, pdf_url: pdfData.url });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/billing/:id/status - Changer le statut
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const { data, error } = await supabase
    .from('invoices')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
    
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/billing/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
