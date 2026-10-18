import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getDatabase,
  queryAll,
  queryOne,
  execute,
  runInsert,
  getDatabaseBinary,
  exportTableToCsv,
  exportAllToJson,
  restoreFromJson,
  resetDemoDatabase
} from './server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// Ensure database is initialized
await getDatabase();

// -------------------------------------------------------------
// Contacts Endpoints
// -------------------------------------------------------------
app.get('/api/contacts', (req, res) => {
  try {
    const { status, search, include_archived } = req.query;
    let sql = `
      SELECT c.*,
        (SELECT COUNT(*) FROM missions m WHERE m.contact_id = c.id AND m.status NOT IN ('clôturée', 'annulée')) as active_missions_count,
        (SELECT COUNT(*) FROM contracts ctr WHERE ctr.contact_id = c.id AND ctr.status = 'actif') as active_contracts_count,
        (SELECT MAX(activity_date) FROM activities a WHERE a.contact_id = c.id) as last_interaction_date,
        (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.contact_id = c.id) as total_collected
      FROM contacts c
      WHERE 1=1
    `;
    const params: any[] = [];

    if (!include_archived || include_archived === 'false') {
      sql += ` AND c.is_archived = 0`;
    }

    if (status && status !== 'tous') {
      sql += ` AND c.status = ?`;
      params.push(status);
    }

    if (search && typeof search === 'string' && search.trim()) {
      sql += ` AND (c.company_name LIKE ? OR c.contact_name LIKE ? OR c.email LIKE ? OR c.city LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ` ORDER BY c.company_name COLLATE NOCASE ASC, c.contact_name COLLATE NOCASE ASC`;
    const contacts = queryAll(sql, params);
    res.json(contacts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contacts', (req, res) => {
  try {
    const {
      company_name,
      contact_name,
      role_title,
      email,
      phone,
      website,
      address,
      postal_code,
      city,
      industry,
      lead_source = 'prospection',
      status = 'prospect',
      next_action,
      follow_up_date,
      notes
    } = req.body;

    if (!contact_name) {
      return res.status(400).json({ error: 'Le nom du contact est obligatoire.' });
    }

    const id = runInsert(`
      INSERT INTO contacts (
        company_name, contact_name, role_title, email, phone, website,
        address, postal_code, city, industry, lead_source, status,
        next_action, follow_up_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      company_name || null,
      contact_name,
      role_title || null,
      email || null,
      phone || null,
      website || null,
      address || null,
      postal_code || null,
      city || null,
      industry || null,
      lead_source,
      status,
      next_action || null,
      follow_up_date || null,
      notes || null
    ]);

    const created = queryOne(`SELECT * FROM contacts WHERE id = ?`, [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/contacts/:id', (req, res) => {
  try {
    const contactId = Number(req.params.id);
    const contact = queryOne(`SELECT * FROM contacts WHERE id = ?`, [contactId]);
    if (!contact) {
      return res.status(404).json({ error: 'Contact introuvable.' });
    }

    // Related details
    const activities = queryAll(`
      SELECT a.*, m.title as mission_title
      FROM activities a
      LEFT JOIN missions m ON m.id = a.mission_id
      WHERE a.contact_id = ?
      ORDER BY a.activity_date DESC, a.activity_time DESC, a.id DESC
    `, [contactId]);

    const missions = queryAll(`
      SELECT m.*,
        (SELECT COALESCE(SUM(a.duration_minutes), 0) / 60.0 FROM activities a WHERE a.mission_id = m.id) as actual_hours_spent,
        (SELECT COALESCE(SUM(i.amount_ttc), 0) FROM invoices i WHERE i.mission_id = m.id) as billed_amount,
        (SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.mission_id = m.id) as paid_amount
      FROM missions m
      WHERE m.contact_id = ?
      ORDER BY m.created_at DESC
    `, [contactId]);

    const contracts = queryAll(`
      SELECT * FROM contracts WHERE contact_id = ? ORDER BY start_date DESC
    `, [contactId]);

    const quotes = queryAll(`
      SELECT q.*, m.title as mission_title
      FROM quotes q
      LEFT JOIN missions m ON m.id = q.mission_id
      WHERE q.contact_id = ?
      ORDER BY q.issue_date DESC
    `, [contactId]);

    const invoices = queryAll(`
      SELECT i.*, m.title as mission_title,
        (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.invoice_id = i.id) as paid_amount
      FROM invoices i
      LEFT JOIN missions m ON m.id = i.mission_id
      WHERE i.contact_id = ?
      ORDER BY i.issue_date DESC
    `, [contactId]);

    const payments = queryAll(`
      SELECT p.*, i.invoice_number
      FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      WHERE p.contact_id = ?
      ORDER BY p.payment_date DESC
    `, [contactId]);

    const tasks = queryAll(`
      SELECT t.*, m.title as mission_title, ctr.title as contract_title
      FROM tasks t
      LEFT JOIN missions m ON m.id = t.mission_id
      LEFT JOIN contracts ctr ON ctr.id = t.contract_id
      WHERE t.contact_id = ?
      ORDER BY CASE WHEN t.status = 'terminée' THEN 1 ELSE 0 END, t.due_date ASC
    `, [contactId]);

    // Financial KPI summary for this contact
    const totalAccepted = missions.reduce((acc: number, m: any) => acc + (m.accepted_amount || 0), 0);
    const totalInvoiced = invoices.reduce((acc: number, inv: any) => acc + (inv.amount_ttc || 0), 0);
    const totalCollected = payments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
    const activeContracts = contracts.filter((c: any) => c.status === 'actif');
    const activeMissions = missions.filter((m: any) => !['clôturée', 'annulée'].includes(m.status));
    const runningMissionsAmount = activeMissions.reduce((acc: number, m: any) => acc + (m.accepted_amount || 0), 0);

    const totalMinutesSpent = activities.reduce((acc: number, a: any) => acc + (a.duration_minutes || 0), 0);

    res.json({
      contact,
      activities,
      missions,
      contracts,
      quotes,
      invoices,
      payments,
      tasks,
      metrics: {
        total_accepted: totalAccepted,
        total_invoiced: totalInvoiced,
        total_collected: totalCollected,
        balance_due: Math.max(0, totalInvoiced - totalCollected),
        active_missions_count: activeMissions.length,
        running_missions_amount: runningMissionsAmount,
        active_contracts_count: activeContracts.length,
        total_hours_spent: Math.round((totalMinutesSpent / 60) * 10) / 10,
        last_interaction: activities[0] || null,
        next_action: contact.next_action,
        follow_up_date: contact.follow_up_date
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/contacts/:id', (req, res) => {
  try {
    const contactId = Number(req.params.id);
    const fields = req.body;

    execute(`
      UPDATE contacts SET
        company_name = ?,
        contact_name = ?,
        role_title = ?,
        email = ?,
        phone = ?,
        website = ?,
        address = ?,
        postal_code = ?,
        city = ?,
        industry = ?,
        lead_source = ?,
        status = ?,
        next_action = ?,
        follow_up_date = ?,
        notes = ?,
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [
      fields.company_name || null,
      fields.contact_name,
      fields.role_title || null,
      fields.email || null,
      fields.phone || null,
      fields.website || null,
      fields.address || null,
      fields.postal_code || null,
      fields.city || null,
      fields.industry || null,
      fields.lead_source,
      fields.status,
      fields.next_action || null,
      fields.follow_up_date || null,
      fields.notes || null,
      contactId
    ]);

    const updated = queryOne(`SELECT * FROM contacts WHERE id = ?`, [contactId]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Conversion prospect -> client sans doublon ni perte
app.post('/api/contacts/:id/convert', (req, res) => {
  try {
    const contactId = Number(req.params.id);
    const contact = queryOne(`SELECT * FROM contacts WHERE id = ?`, [contactId]);
    if (!contact) {
      return res.status(404).json({ error: 'Contact introuvable.' });
    }

    execute(`
      UPDATE contacts SET
        status = 'client',
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [contactId]);

    // Log this important conversion in the activity journal
    runInsert(`
      INSERT INTO activities (
        title, description, activity_date, activity_time, contact_id, category, duration_minutes, status, result
      ) VALUES (?, ?, date('now', 'localtime'), time('now', 'localtime'), ?, 'Administration', 0, 'réalisé', 'Conversion officielle en Client')
    `, [
      `Conversion de ${contact.contact_name} en Client`,
      `Prospect converti en client. L'ensemble de l'historique de prospection, des devis et des échanges est conservé.`,
      contactId
    ]);

    const updated = queryOne(`SELECT * FROM contacts WHERE id = ?`, [contactId]);
    res.json({ success: true, contact: updated, message: 'Prospect converti en client avec succès.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contacts/:id/archive', (req, res) => {
  try {
    const contactId = Number(req.params.id);
    const { is_archived } = req.body;
    execute(`UPDATE contacts SET is_archived = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`, [is_archived ? 1 : 0, contactId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/contacts/:id', (req, res) => {
  try {
    const contactId = Number(req.params.id);
    // Verification: prevent cascade destruction of history
    const missionsCount = queryOne(`SELECT COUNT(*) as count FROM missions WHERE contact_id = ?`, [contactId])?.count || 0;
    const contractsCount = queryOne(`SELECT COUNT(*) as count FROM contracts WHERE contact_id = ?`, [contactId])?.count || 0;
    const invoicesCount = queryOne(`SELECT COUNT(*) as count FROM invoices WHERE contact_id = ?`, [contactId])?.count || 0;

    if (missionsCount > 0 || contractsCount > 0 || invoicesCount > 0) {
      return res.status(400).json({
        error: `Impossible de supprimer définitivement ce contact car il possède des missions (${missionsCount}), contrats (${contractsCount}) ou factures (${invoicesCount}). Privilégiez l'archivage pour conserver l'historique.`
      });
    }

    execute(`DELETE FROM contacts WHERE id = ?`, [contactId]);
    res.json({ success: true, message: 'Contact supprimé.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Activities (Journal de travail) Endpoints
// -------------------------------------------------------------
app.get('/api/activities', (req, res) => {
  try {
    const { contact_id, mission_id, category, status, from, to, search } = req.query;
    let sql = `
      SELECT a.*,
        c.company_name, c.contact_name, c.status as contact_status,
        m.title as mission_title, m.reference as mission_reference
      FROM activities a
      LEFT JOIN contacts c ON c.id = a.contact_id
      LEFT JOIN missions m ON m.id = a.mission_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (contact_id) {
      sql += ` AND a.contact_id = ?`;
      params.push(Number(contact_id));
    }
    if (mission_id) {
      sql += ` AND a.mission_id = ?`;
      params.push(Number(mission_id));
    }
    if (category && category !== 'toutes') {
      sql += ` AND a.category = ?`;
      params.push(category);
    }
    if (status && status !== 'tous') {
      sql += ` AND a.status = ?`;
      params.push(status);
    }
    if (from) {
      sql += ` AND a.activity_date >= ?`;
      params.push(from);
    }
    if (to) {
      sql += ` AND a.activity_date <= ?`;
      params.push(to);
    }
    if (search && typeof search === 'string' && search.trim()) {
      sql += ` AND (a.title LIKE ? OR a.description LIKE ? OR a.result LIKE ? OR c.contact_name LIKE ? OR c.company_name LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term);
    }

    sql += ` ORDER BY a.activity_date DESC, a.activity_time DESC, a.id DESC`;
    const activities = queryAll(sql, params);
    res.json(activities);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/activities', (req, res) => {
  try {
    const {
      title,
      description,
      activity_date = new Date().toISOString().split('T')[0],
      activity_time,
      contact_id,
      mission_id,
      category = 'Développement',
      duration_minutes = 0,
      status = 'réalisé',
      result,
      next_action,
      attachment_url
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Le titre de l'activité est obligatoire." });
    }

    const id = runInsert(`
      INSERT INTO activities (
        title, description, activity_date, activity_time, contact_id,
        mission_id, category, duration_minutes, status, result,
        next_action, attachment_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title,
      description || null,
      activity_date,
      activity_time || null,
      contact_id ? Number(contact_id) : null,
      mission_id ? Number(mission_id) : null,
      category,
      Number(duration_minutes) || 0,
      status,
      result || null,
      next_action || null,
      attachment_url || null
    ]);

    // If next action is specified and a contact exists, also update contact next_action
    if (contact_id && next_action) {
      execute(`UPDATE contacts SET next_action = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`, [next_action, Number(contact_id)]);
    }

    const created = queryOne(`SELECT * FROM activities WHERE id = ?`, [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/activities/:id', (req, res) => {
  try {
    const activityId = Number(req.params.id);
    const {
      title,
      description,
      activity_date,
      activity_time,
      contact_id,
      mission_id,
      category,
      duration_minutes,
      status,
      result,
      next_action,
      attachment_url
    } = req.body;

    execute(`
      UPDATE activities SET
        title = ?,
        description = ?,
        activity_date = ?,
        activity_time = ?,
        contact_id = ?,
        mission_id = ?,
        category = ?,
        duration_minutes = ?,
        status = ?,
        result = ?,
        next_action = ?,
        attachment_url = ?,
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [
      title,
      description || null,
      activity_date,
      activity_time || null,
      contact_id ? Number(contact_id) : null,
      mission_id ? Number(mission_id) : null,
      category,
      Number(duration_minutes) || 0,
      status,
      result || null,
      next_action || null,
      attachment_url || null,
      activityId
    ]);

    const updated = queryOne(`SELECT * FROM activities WHERE id = ?`, [activityId]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/activities/:id', (req, res) => {
  try {
    const activityId = Number(req.params.id);
    execute(`DELETE FROM activities WHERE id = ?`, [activityId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Missions Endpoints
// -------------------------------------------------------------
app.get('/api/missions', (req, res) => {
  try {
    const { contact_id, status, is_archived } = req.query;
    let sql = `
      SELECT m.*,
        c.company_name, c.contact_name, c.email as contact_email,
        (SELECT COALESCE(SUM(a.duration_minutes), 0) / 60.0 FROM activities a WHERE a.mission_id = m.id) as actual_hours_spent,
        (SELECT COALESCE(SUM(i.amount_ttc), 0) FROM invoices i WHERE i.mission_id = m.id) as billed_amount,
        (SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.mission_id = m.id) as paid_amount,
        (SELECT COUNT(*) FROM tasks t WHERE t.mission_id = m.id AND t.status != 'terminée') as pending_tasks_count
      FROM missions m
      JOIN contacts c ON c.id = m.contact_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (!is_archived || is_archived === 'false') {
      sql += ` AND m.is_archived = 0`;
    }

    if (contact_id) {
      sql += ` AND m.contact_id = ?`;
      params.push(Number(contact_id));
    }

    if (status && status !== 'tous') {
      sql += ` AND m.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY m.created_at DESC`;
    const missions = queryAll(sql, params);
    res.json(missions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/missions', (req, res) => {
  try {
    const {
      title,
      contact_id,
      service_category,
      is_recurring = 0,
      description,
      start_date,
      expected_delivery_date,
      status = 'à cadrer',
      estimated_amount = 0,
      accepted_amount = 0,
      time_budget_hours = 0,
      notes
    } = req.body;

    if (!title || !contact_id || !service_category) {
      return res.status(400).json({ error: 'Titre, client et catégorie de prestation sont requis.' });
    }

    // Generate reference code
    const year = new Date().getFullYear();
    const countRes = queryOne(`SELECT COUNT(*) as count FROM missions WHERE reference LIKE ?`, [`MIS-${year}-%`]);
    const nextSeq = String((countRes?.count || 0) + 1).padStart(3, '0');
    const reference = `MIS-${year}-${nextSeq}`;

    const id = runInsert(`
      INSERT INTO missions (
        reference, title, contact_id, service_category, is_recurring,
        description, start_date, expected_delivery_date, status,
        estimated_amount, accepted_amount, time_budget_hours, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      reference,
      title,
      Number(contact_id),
      service_category,
      is_recurring ? 1 : 0,
      description || null,
      start_date || null,
      expected_delivery_date || null,
      status,
      Number(estimated_amount) || 0,
      Number(accepted_amount) || 0,
      Number(time_budget_hours) || 0,
      notes || null
    ]);

    const created = queryOne(`SELECT * FROM missions WHERE id = ?`, [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/missions/:id', (req, res) => {
  try {
    const missionId = Number(req.params.id);
    const {
      title,
      contact_id,
      service_category,
      is_recurring,
      description,
      start_date,
      expected_delivery_date,
      closed_date,
      status,
      estimated_amount,
      accepted_amount,
      time_budget_hours,
      notes,
      is_archived
    } = req.body;

    execute(`
      UPDATE missions SET
        title = ?,
        contact_id = ?,
        service_category = ?,
        is_recurring = ?,
        description = ?,
        start_date = ?,
        expected_delivery_date = ?,
        closed_date = ?,
        status = ?,
        estimated_amount = ?,
        accepted_amount = ?,
        time_budget_hours = ?,
        notes = ?,
        is_archived = ?,
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [
      title,
      Number(contact_id),
      service_category,
      is_recurring ? 1 : 0,
      description || null,
      start_date || null,
      expected_delivery_date || null,
      closed_date || (status === 'clôturée' ? new Date().toISOString().split('T')[0] : null),
      status,
      Number(estimated_amount) || 0,
      Number(accepted_amount) || 0,
      Number(time_budget_hours) || 0,
      notes || null,
      is_archived ? 1 : 0,
      missionId
    ]);

    const updated = queryOne(`SELECT * FROM missions WHERE id = ?`, [missionId]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/missions/:id', (req, res) => {
  try {
    const missionId = Number(req.params.id);
    const invoicesCount = queryOne(`SELECT COUNT(*) as count FROM invoices WHERE mission_id = ?`, [missionId])?.count || 0;
    if (invoicesCount > 0) {
      return res.status(400).json({
        error: `Impossible de supprimer cette mission car des factures y sont rattachées (${invoicesCount}). Modifiez son statut ou archivez-la.`
      });
    }

    execute(`DELETE FROM missions WHERE id = ?`, [missionId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Recurring Contracts & MRR Endpoints
// -------------------------------------------------------------
app.get('/api/contracts', (req, res) => {
  try {
    const contracts = queryAll(`
      SELECT ctr.*,
        c.company_name, c.contact_name, c.email as contact_email
      FROM contracts ctr
      JOIN contacts c ON c.id = ctr.contact_id
      ORDER BY ctr.created_at DESC
    `);

    // Calculate normalized MRR for each contract
    const contractsWithMRR = contracts.map(c => {
      let mrr = 0;
      if (c.status === 'actif') {
        if (c.frequency === 'mensuelle') mrr = c.amount_per_period;
        else if (c.frequency === 'trimestrielle') mrr = c.amount_per_period / 3;
        else if (c.frequency === 'semestrielle') mrr = c.amount_per_period / 6;
        else if (c.frequency === 'annuelle') mrr = c.amount_per_period / 12;
      }
      return {
        ...c,
        normalized_mrr: Math.round(mrr * 100) / 100
      };
    });

    const totalMRR = contractsWithMRR.reduce((sum, c) => sum + (c.normalized_mrr || 0), 0);

    res.json({
      contracts: contractsWithMRR,
      total_mrr: Math.round(totalMRR * 100) / 100
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contracts', (req, res) => {
  try {
    const {
      contact_id,
      title,
      description,
      start_date,
      end_date,
      frequency = 'mensuelle',
      amount_per_period,
      next_renewal_date,
      notice_period_days = 30,
      included_hours_per_month = 0,
      status = 'actif',
      notes
    } = req.body;

    if (!contact_id || !title || !start_date || amount_per_period === undefined) {
      return res.status(400).json({ error: 'Client, intitulé, date de début et montant sont requis.' });
    }

    const year = new Date().getFullYear();
    const countRes = queryOne(`SELECT COUNT(*) as count FROM contracts WHERE reference LIKE ?`, [`CTR-${year}-%`]);
    const nextSeq = String((countRes?.count || 0) + 1).padStart(2, '0');
    const reference = `CTR-${year}-${nextSeq}`;

    const id = runInsert(`
      INSERT INTO contracts (
        reference, contact_id, title, description, start_date, end_date,
        frequency, amount_per_period, next_renewal_date, notice_period_days,
        included_hours_per_month, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      reference,
      Number(contact_id),
      title,
      description || null,
      start_date,
      end_date || null,
      frequency,
      Number(amount_per_period),
      next_renewal_date || null,
      Number(notice_period_days) || 30,
      Number(included_hours_per_month) || 0,
      status,
      notes || null
    ]);

    const created = queryOne(`SELECT * FROM contracts WHERE id = ?`, [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/contracts/:id', (req, res) => {
  try {
    const contractId = Number(req.params.id);
    const {
      contact_id,
      title,
      description,
      start_date,
      end_date,
      frequency,
      amount_per_period,
      next_renewal_date,
      notice_period_days,
      included_hours_per_month,
      status,
      notes
    } = req.body;

    execute(`
      UPDATE contracts SET
        contact_id = ?,
        title = ?,
        description = ?,
        start_date = ?,
        end_date = ?,
        frequency = ?,
        amount_per_period = ?,
        next_renewal_date = ?,
        notice_period_days = ?,
        included_hours_per_month = ?,
        status = ?,
        notes = ?,
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [
      Number(contact_id),
      title,
      description || null,
      start_date,
      end_date || null,
      frequency,
      Number(amount_per_period),
      next_renewal_date || null,
      Number(notice_period_days) || 30,
      Number(included_hours_per_month) || 0,
      status,
      notes || null,
      contractId
    ]);

    const updated = queryOne(`SELECT * FROM contracts WHERE id = ?`, [contractId]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/contracts/:id', (req, res) => {
  try {
    const contractId = Number(req.params.id);
    execute(`DELETE FROM contracts WHERE id = ?`, [contractId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Quotes, Invoices & Payments Endpoints
// -------------------------------------------------------------
app.get('/api/finances', (req, res) => {
  try {
    const quotes = queryAll(`
      SELECT q.*,
        c.company_name, c.contact_name,
        m.title as mission_title
      FROM quotes q
      JOIN contacts c ON c.id = q.contact_id
      LEFT JOIN missions m ON m.id = q.mission_id
      ORDER BY q.issue_date DESC
    `);

    const invoices = queryAll(`
      SELECT i.*,
        c.company_name, c.contact_name,
        m.title as mission_title,
        (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.invoice_id = i.id) as paid_amount
      FROM invoices i
      JOIN contacts c ON c.id = i.contact_id
      LEFT JOIN missions m ON m.id = i.mission_id
      ORDER BY i.issue_date DESC
    `);

    const payments = queryAll(`
      SELECT p.*,
        i.invoice_number,
        c.company_name, c.contact_name
      FROM payments p
      JOIN invoices i ON i.id = p.invoice_id
      JOIN contacts c ON c.id = p.contact_id
      ORDER BY p.payment_date DESC
    `);

    // Financial totals
    const signedAmount = quotes
      .filter((q: any) => q.status === 'accepté')
      .reduce((acc: number, q: any) => acc + (q.amount_ttc || 0), 0);

    const invoicedAmount = invoices.reduce((acc: number, inv: any) => acc + (inv.amount_ttc || 0), 0);
    const collectedAmount = payments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
    const remainingToCollect = Math.max(0, invoicedAmount - collectedAmount);

    const today = new Date().toISOString().split('T')[0];
    const overdueInvoices = invoices.filter((inv: any) => {
      const unpaid = (inv.amount_ttc || 0) - (inv.paid_amount || 0);
      return unpaid > 0.01 && inv.due_date < today;
    });
    const overdueAmount = overdueInvoices.reduce((acc: number, inv: any) => acc + ((inv.amount_ttc || 0) - (inv.paid_amount || 0)), 0);

    res.json({
      quotes,
      invoices,
      payments,
      summary: {
        signed_amount: Math.round(signedAmount * 100) / 100,
        invoiced_amount: Math.round(invoicedAmount * 100) / 100,
        collected_amount: Math.round(collectedAmount * 100) / 100,
        remaining_to_collect: Math.round(remainingToCollect * 100) / 100,
        overdue_amount: Math.round(overdueAmount * 100) / 100,
        overdue_count: overdueInvoices.length
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quotes', (req, res) => {
  try {
    const {
      contact_id,
      mission_id,
      issue_date = new Date().toISOString().split('T')[0],
      validity_date,
      amount_ht,
      tax_rate = 20.0,
      status = 'envoyé',
      document_url,
      notes
    } = req.body;

    if (!contact_id || amount_ht === undefined) {
      return res.status(400).json({ error: 'Client et montant HT sont obligatoires.' });
    }

    const year = new Date().getFullYear();
    const countRes = queryOne(`SELECT COUNT(*) as count FROM quotes WHERE quote_number LIKE ?`, [`DEV-${year}-%`]);
    const nextSeq = String((countRes?.count || 0) + 1).padStart(3, '0');
    const quote_number = `DEV-${year}-${nextSeq}`;

    const numHT = Number(amount_ht);
    const numTax = Number(tax_rate);
    const numTTC = Math.round((numHT * (1 + numTax / 100)) * 100) / 100;

    const id = runInsert(`
      INSERT INTO quotes (
        quote_number, contact_id, mission_id, issue_date, validity_date,
        amount_ht, tax_rate, amount_ttc, status, document_url, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      quote_number,
      Number(contact_id),
      mission_id ? Number(mission_id) : null,
      issue_date,
      validity_date || null,
      numHT,
      numTax,
      numTTC,
      status,
      document_url || null,
      notes || null
    ]);

    const created = queryOne(`SELECT * FROM quotes WHERE id = ?`, [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/quotes/:id', (req, res) => {
  try {
    const quoteId = Number(req.params.id);
    const {
      contact_id,
      mission_id,
      issue_date,
      validity_date,
      amount_ht,
      tax_rate,
      status,
      document_url,
      notes
    } = req.body;

    const numHT = Number(amount_ht);
    const numTax = Number(tax_rate);
    const numTTC = Math.round((numHT * (1 + numTax / 100)) * 100) / 100;

    execute(`
      UPDATE quotes SET
        contact_id = ?,
        mission_id = ?,
        issue_date = ?,
        validity_date = ?,
        amount_ht = ?,
        tax_rate = ?,
        amount_ttc = ?,
        status = ?,
        document_url = ?,
        notes = ?,
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [
      Number(contact_id),
      mission_id ? Number(mission_id) : null,
      issue_date,
      validity_date || null,
      numHT,
      numTax,
      numTTC,
      status,
      document_url || null,
      notes || null,
      quoteId
    ]);

    const updated = queryOne(`SELECT * FROM quotes WHERE id = ?`, [quoteId]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoices', (req, res) => {
  try {
    const {
      contact_id,
      mission_id,
      quote_id,
      issue_date = new Date().toISOString().split('T')[0],
      due_date,
      amount_ht,
      tax_rate = 20.0,
      payment_status = 'à payer',
      document_url,
      notes
    } = req.body;

    if (!contact_id || amount_ht === undefined) {
      return res.status(400).json({ error: 'Client et montant HT sont obligatoires.' });
    }

    const year = new Date().getFullYear();
    const countRes = queryOne(`SELECT COUNT(*) as count FROM invoices WHERE invoice_number LIKE ?`, [`FAC-${year}-%`]);
    const nextSeq = String((countRes?.count || 0) + 1).padStart(3, '0');
    const invoice_number = `FAC-${year}-${nextSeq}`;

    const numHT = Number(amount_ht);
    const numTax = Number(tax_rate);
    const numTTC = Math.round((numHT * (1 + numTax / 100)) * 100) / 100;

    // Default due date is 30 days later
    let calculatedDueDate = due_date;
    if (!calculatedDueDate) {
      const d = new Date(issue_date);
      d.setDate(d.getDate() + 30);
      calculatedDueDate = d.toISOString().split('T')[0];
    }

    const id = runInsert(`
      INSERT INTO invoices (
        invoice_number, contact_id, mission_id, quote_id, issue_date,
        due_date, amount_ht, tax_rate, amount_ttc, payment_status,
        document_url, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoice_number,
      Number(contact_id),
      mission_id ? Number(mission_id) : null,
      quote_id ? Number(quote_id) : null,
      issue_date,
      calculatedDueDate,
      numHT,
      numTax,
      numTTC,
      payment_status,
      document_url || null,
      notes || null
    ]);

    const created = queryOne(`SELECT * FROM invoices WHERE id = ?`, [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments', (req, res) => {
  try {
    const {
      invoice_id,
      amount,
      payment_date = new Date().toISOString().split('T')[0],
      payment_method = 'Virement',
      reference,
      notes
    } = req.body;

    if (!invoice_id || amount === undefined || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Facture et montant positif requis.' });
    }

    const invoice = queryOne(`SELECT * FROM invoices WHERE id = ?`, [Number(invoice_id)]);
    if (!invoice) {
      return res.status(404).json({ error: 'Facture non trouvée.' });
    }

    const id = runInsert(`
      INSERT INTO payments (
        invoice_id, contact_id, amount, payment_date, payment_method, reference, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      Number(invoice_id),
      invoice.contact_id,
      Number(amount),
      payment_date,
      payment_method,
      reference || null,
      notes || null
    ]);

    // Recalculate invoice status
    const totalPaidRes = queryOne(`SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE invoice_id = ?`, [Number(invoice_id)]);
    const totalPaid = totalPaidRes?.paid || 0;

    let newStatus = 'à payer';
    if (totalPaid >= invoice.amount_ttc - 0.01) {
      newStatus = 'payé';
    } else if (totalPaid > 0) {
      newStatus = 'partiellement payé';
    }

    execute(`UPDATE invoices SET payment_status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`, [newStatus, Number(invoice_id)]);

    const created = queryOne(`SELECT * FROM payments WHERE id = ?`, [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Tasks & Follow-ups Endpoints
// -------------------------------------------------------------
app.get('/api/tasks', (req, res) => {
  try {
    const { view, contact_id, mission_id } = req.query;
    const today = new Date().toISOString().split('T')[0];

    let sql = `
      SELECT t.*,
        c.company_name, c.contact_name,
        m.title as mission_title,
        ctr.title as contract_title
      FROM tasks t
      LEFT JOIN contacts c ON c.id = t.contact_id
      LEFT JOIN missions m ON m.id = t.mission_id
      LEFT JOIN contracts ctr ON ctr.id = t.contract_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (contact_id) {
      sql += ` AND t.contact_id = ?`;
      params.push(Number(contact_id));
    }

    if (mission_id) {
      sql += ` AND t.mission_id = ?`;
      params.push(Number(mission_id));
    }

    if (view === 'today') {
      sql += ` AND t.status != 'terminée' AND t.due_date = ?`;
      params.push(today);
    } else if (view === 'overdue') {
      sql += ` AND t.status != 'terminée' AND t.due_date < ?`;
      params.push(today);
    } else if (view === 'this_week') {
      sql += ` AND t.status != 'terminée' AND t.due_date >= ? AND t.due_date <= date(?, '+7 days')`;
      params.push(today, today);
    } else if (view === 'upcoming') {
      sql += ` AND t.status != 'terminée' AND t.due_date > date(?, '+7 days')`;
      params.push(today);
    } else if (view === 'done') {
      sql += ` AND t.status = 'terminée'`;
    }

    sql += ` ORDER BY CASE WHEN t.status = 'terminée' THEN 1 ELSE 0 END, t.due_date ASC, CASE t.priority WHEN 'urgente' THEN 1 WHEN 'haute' THEN 2 WHEN 'normale' THEN 3 ELSE 4 END`;
    const tasks = queryAll(sql, params);
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const {
      title,
      description,
      due_date = new Date().toISOString().split('T')[0],
      priority = 'normale',
      status = 'à faire',
      contact_id,
      mission_id,
      contract_id,
      task_type = 'technique',
      estimated_duration_minutes = 0
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Le titre de la tâche est obligatoire.' });
    }

    const id = runInsert(`
      INSERT INTO tasks (
        title, description, due_date, priority, status, contact_id,
        mission_id, contract_id, task_type, estimated_duration_minutes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title,
      description || null,
      due_date || null,
      priority,
      status,
      contact_id ? Number(contact_id) : null,
      mission_id ? Number(mission_id) : null,
      contract_id ? Number(contract_id) : null,
      task_type,
      Number(estimated_duration_minutes) || 0
    ]);

    const created = queryOne(`SELECT * FROM tasks WHERE id = ?`, [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const {
      title,
      description,
      due_date,
      priority,
      status,
      contact_id,
      mission_id,
      contract_id,
      task_type,
      estimated_duration_minutes,
      actual_duration_minutes
    } = req.body;

    const completedAt = status === 'terminée' ? new Date().toISOString() : null;

    execute(`
      UPDATE tasks SET
        title = ?,
        description = ?,
        due_date = ?,
        priority = ?,
        status = ?,
        contact_id = ?,
        mission_id = ?,
        contract_id = ?,
        task_type = ?,
        estimated_duration_minutes = ?,
        actual_duration_minutes = ?,
        completed_at = COALESCE(?, completed_at),
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `, [
      title,
      description || null,
      due_date || null,
      priority,
      status,
      contact_id ? Number(contact_id) : null,
      mission_id ? Number(mission_id) : null,
      contract_id ? Number(contract_id) : null,
      task_type,
      Number(estimated_duration_minutes) || 0,
      Number(actual_duration_minutes) || 0,
      completedAt,
      taskId
    ]);

    const updated = queryOne(`SELECT * FROM tasks WHERE id = ?`, [taskId]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const taskId = Number(req.params.id);
    execute(`DELETE FROM tasks WHERE id = ?`, [taskId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Dashboard & Analytics Endpoints
// -------------------------------------------------------------
app.get('/api/dashboard', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Counts
    const activeProspects = queryOne(`SELECT COUNT(*) as count FROM contacts WHERE status = 'prospect' AND is_archived = 0`)?.count || 0;
    const activeClients = queryOne(`SELECT COUNT(*) as count FROM contacts WHERE status = 'client' AND is_archived = 0`)?.count || 0;
    const activeMissions = queryOne(`SELECT COUNT(*) as count FROM missions WHERE status NOT IN ('clôturée', 'annulée') AND is_archived = 0`)?.count || 0;

    // Tasks & Follow-ups
    const overdueTasks = queryOne(`SELECT COUNT(*) as count FROM tasks WHERE status != 'terminée' AND due_date < ?`, [today])?.count || 0;
    const todayTasks = queryOne(`SELECT COUNT(*) as count FROM tasks WHERE status != 'terminée' AND due_date = ?`, [today])?.count || 0;
    const pendingQuotes = queryOne(`SELECT COUNT(*) as count FROM quotes WHERE status = 'envoyé'`)?.count || 0;

    // Follow-ups on contacts
    const followUpsNeeded = queryAll(`
      SELECT id, contact_name, company_name, next_action, follow_up_date
      FROM contacts
      WHERE is_archived = 0 AND follow_up_date IS NOT NULL AND follow_up_date <= date('now', '+7 days')
      ORDER BY follow_up_date ASC
      LIMIT 6
    `);

    // Contracts renewals in next 30 days
    const renewingContracts = queryAll(`
      SELECT ctr.*, c.company_name, c.contact_name
      FROM contracts ctr
      JOIN contacts c ON c.id = ctr.contact_id
      WHERE ctr.status = 'actif' AND ctr.next_renewal_date <= date('now', '+30 days')
      ORDER BY ctr.next_renewal_date ASC
    `);

    // Normalized MRR calculation
    const activeContractsList = queryAll(`SELECT frequency, amount_per_period FROM contracts WHERE status = 'actif'`);
    let mrr = 0;
    for (const c of activeContractsList) {
      if (c.frequency === 'mensuelle') mrr += c.amount_per_period;
      else if (c.frequency === 'trimestrielle') mrr += c.amount_per_period / 3;
      else if (c.frequency === 'semestrielle') mrr += c.amount_per_period / 6;
      else if (c.frequency === 'annuelle') mrr += c.amount_per_period / 12;
    }

    // Financial breakdown
    const signedRevenue = queryOne(`SELECT COALESCE(SUM(amount_ttc), 0) as total FROM quotes WHERE status = 'accepté'`)?.total || 0;
    const invoicedRevenue = queryOne(`SELECT COALESCE(SUM(amount_ttc), 0) as total FROM invoices`)?.total || 0;
    const collectedRevenue = queryOne(`SELECT COALESCE(SUM(amount), 0) as total FROM payments`)?.total || 0;
    const remainingRevenue = Math.max(0, invoicedRevenue - collectedRevenue);

    // Overdue payments
    const overdueInvoices = queryAll(`
      SELECT i.*, c.company_name, c.contact_name,
        (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.invoice_id = i.id) as paid_amount
      FROM invoices i
      JOIN contacts c ON c.id = i.contact_id
      WHERE i.due_date < ?
    `, [today]);

    let overdueTotal = 0;
    for (const inv of overdueInvoices) {
      const remaining = inv.amount_ttc - inv.paid_amount;
      if (remaining > 0.01) overdueTotal += remaining;
    }

    // Time spent by category in the last 30 days
    const timeSpentByCategory = queryAll(`
      SELECT category, SUM(duration_minutes) as total_minutes
      FROM activities
      WHERE activity_date >= date('now', '-30 days')
      GROUP BY category
      ORDER BY total_minutes DESC
    `);

    // Time spent by client in the last 30 days
    const timeSpentByClient = queryAll(`
      SELECT COALESCE(c.company_name, c.contact_name, 'Tâches internes') as client_name,
        SUM(a.duration_minutes) as total_minutes
      FROM activities a
      LEFT JOIN contacts c ON c.id = a.contact_id
      WHERE a.activity_date >= date('now', '-30 days')
      GROUP BY client_name
      ORDER BY total_minutes DESC
      LIMIT 5
    `);

    // Recent 5 activities
    const recentActivities = queryAll(`
      SELECT a.*, c.company_name, c.contact_name
      FROM activities a
      LEFT JOIN contacts c ON c.id = a.contact_id
      ORDER BY a.activity_date DESC, a.activity_time DESC
      LIMIT 5
    `);

    res.json({
      active_prospects: activeProspects,
      active_clients: activeClients,
      active_missions: activeMissions,
      overdue_tasks: overdueTasks,
      today_tasks: todayTasks,
      pending_quotes: pendingQuotes,
      renewing_contracts_count: renewingContracts.length,
      renewing_contracts: renewingContracts,
      follow_ups_needed: followUpsNeeded,
      mrr: Math.round(mrr * 100) / 100,
      signed_revenue: Math.round(signedRevenue * 100) / 100,
      invoiced_revenue: Math.round(invoicedRevenue * 100) / 100,
      collected_revenue: Math.round(collectedRevenue * 100) / 100,
      remaining_revenue: Math.round(remainingRevenue * 100) / 100,
      overdue_amount: Math.round(overdueTotal * 100) / 100,
      time_spent_by_category: timeSpentByCategory,
      time_spent_by_client: timeSpentByClient,
      recent_activities: recentActivities
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Global Search Endpoint
// -------------------------------------------------------------
app.get('/api/search', (req, res) => {
  try {
    const q = req.query.q;
    if (!q || typeof q !== 'string' || !q.trim()) {
      return res.json({ contacts: [], missions: [], contracts: [], activities: [], tasks: [], invoices: [] });
    }
    const term = `%${q.trim()}%`;

    const contacts = queryAll(`
      SELECT id, company_name, contact_name, status, email, phone, city
      FROM contacts
      WHERE company_name LIKE ? OR contact_name LIKE ? OR email LIKE ? OR notes LIKE ?
      LIMIT 8
    `, [term, term, term, term]);

    const missions = queryAll(`
      SELECT m.id, m.reference, m.title, m.status, m.accepted_amount, c.company_name, c.contact_name
      FROM missions m
      JOIN contacts c ON c.id = m.contact_id
      WHERE m.reference LIKE ? OR m.title LIKE ? OR m.description LIKE ? OR m.notes LIKE ?
      LIMIT 8
    `, [term, term, term, term]);

    const contracts = queryAll(`
      SELECT ctr.id, ctr.reference, ctr.title, ctr.status, ctr.frequency, ctr.amount_per_period, c.company_name, c.contact_name
      FROM contracts ctr
      JOIN contacts c ON c.id = ctr.contact_id
      WHERE ctr.reference LIKE ? OR ctr.title LIKE ? OR ctr.description LIKE ?
      LIMIT 8
    `, [term, term, term]);

    const activities = queryAll(`
      SELECT a.id, a.title, a.activity_date, a.category, a.duration_minutes, c.company_name, c.contact_name
      FROM activities a
      LEFT JOIN contacts c ON c.id = a.contact_id
      WHERE a.title LIKE ? OR a.description LIKE ? OR a.result LIKE ?
      LIMIT 8
    `, [term, term, term]);

    const tasks = queryAll(`
      SELECT t.id, t.title, t.due_date, t.priority, t.status, c.company_name, c.contact_name
      FROM tasks t
      LEFT JOIN contacts c ON c.id = t.contact_id
      WHERE t.title LIKE ? OR t.description LIKE ?
      LIMIT 8
    `, [term, term]);

    const invoices = queryAll(`
      SELECT i.id, i.invoice_number, i.amount_ttc, i.payment_status, i.issue_date, c.company_name, c.contact_name
      FROM invoices i
      JOIN contacts c ON c.id = i.contact_id
      WHERE i.invoice_number LIKE ? OR i.notes LIKE ?
      LIMIT 8
    `, [term, term]);

    res.json({
      contacts,
      missions,
      contracts,
      activities,
      tasks,
      invoices
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Backup & Export Endpoints
// -------------------------------------------------------------
app.get('/api/backup/sqlite', (req, res) => {
  try {
    const binary = getDatabaseBinary();
    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="matt_konnect_backup_${new Date().toISOString().split('T')[0]}.sqlite"`);
    res.send(binary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/backup/json', (req, res) => {
  try {
    const data = exportAllToJson();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="matt_konnect_backup_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/backup/csv/:table', (req, res) => {
  try {
    const allowed = ['contacts', 'missions', 'contracts', 'activities', 'quotes', 'invoices', 'payments', 'tasks'];
    const table = req.params.table;
    if (!allowed.includes(table)) {
      return res.status(400).json({ error: 'Table non autorisée pour export CSV.' });
    }
    const csv = exportTableToCsv(table);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="export_${table}_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backup/restore', (req, res) => {
  try {
    const result = restoreFromJson(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/backup/reset-demo', (req, res) => {
  try {
    resetDemoDatabase();
    res.json({ success: true, message: 'Base de données réinitialisée avec les données de démonstration.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Frontend Integration (Vite in dev, static in prod)
// -------------------------------------------------------------
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(PORT, () => {
  console.log(`Matt Konnect CRM server running on port ${PORT}`);
});
