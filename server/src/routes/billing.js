import { Router } from 'express';
import { supabase } from '../db/database.js';
import { createInvoice } from '../services/billingService.js';
import { checkRecurrentBilling } from '../services/subscriptionService.js';

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
  try {
    const result = await createInvoice(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/billing/process-recurring - Lancer manuellement la génération des abonnements
router.post('/process-recurring', async (req, res) => {
  try {
    await checkRecurrentBilling();
    res.json({ success: true, message: 'Facturation récurrente traitée.' });
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
