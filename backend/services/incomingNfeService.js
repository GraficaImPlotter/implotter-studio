import { XMLParser } from 'fast-xml-parser';
import { supabaseAdmin } from './supabaseService.js';
import { logger } from './logger.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

/**
 * Service to handle incoming NF-e (Entrada) from suppliers
 */
export const processIncomingXML = async (xmlContent, orderId = null) => {
  try {
    const jsonObj = parser.parse(xmlContent);
    
    // NFe can be inside nfeProc or root NFe
    const nfe = jsonObj.nfeProc ? jsonObj.nfeProc.NFe : jsonObj.NFe;
    if (!nfe) throw new Error('XML de NF-e inválido ou não reconhecido');

    const infNFe = nfe.infNFe;
    const accessKey = infNFe['@_Id']?.replace('NFe', '') || infNFe.ide?.chNFe;
    
    if (!accessKey) throw new Error('Chave de acesso não encontrada no XML');

    const supplierData = infNFe.emit;
    const totalData = infNFe.total?.ICMSTot;
    const ide = infNFe.ide;
    
    // Robust date extraction
    let rawDate = ide.dhEmi || ide.dEmi;
    let issueDate = new Date().toISOString().split('T')[0]; // Default fallback
    
    if (rawDate) {
      // If it's a string like 2024-02-10T... or 2024-02-10
      if (typeof rawDate === 'string') {
        issueDate = rawDate.split('T')[0];
      } else {
        issueDate = rawDate; // Fallback for unexpected types
      }
    }
    
    logger.info(`Data extraída para NF-e ${accessKey}: ${issueDate} (Original: ${rawDate})`);

    const data = {
      accessKey,
      supplierCnpj: supplierData.CNPJ || supplierData.CPF,
      supplierName: supplierData.xNome,
      totalValue: parseFloat(totalData?.vNF || 0),
      issueDate: issueDate,
      dueDate: issueDate, // Always match as requested
      rawXml: xmlContent
    };

    logger.info(`Processando NF-e de entrada: ${accessKey} de ${data.supplierName}`);

    // 1. Upsert Supplier
    const { data: supplier, error: supplierError } = await supabaseAdmin
      .from('suppliers')
      .upsert({
        cnpj: data.supplierCnpj,
        name: data.supplierName,
      }, { onConflict: 'cnpj' })
      .select()
      .single();

    if (supplierError) {
      logger.error('Erro ao salvar fornecedor:', supplierError);
      throw supplierError;
    }

    // 2. Save Incoming Invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('incoming_invoices')
      .upsert({
        access_key: data.accessKey,
        supplier_cnpj: data.supplierCnpj,
        total_value: data.totalValue,
        issue_date: data.issueDate,
        raw_xml: data.rawXml,
        order_id: orderId,
      }, { onConflict: 'access_key' })
      .select()
      .single();

    if (invoiceError) {
      logger.error('Erro ao salvar NF-e de entrada:', invoiceError);
      throw invoiceError;
    }

    // 3. Reconcile or Create Expense
    // Look for a pending expense for the same supplier and value
    const { data: expenses, error: expenseError } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('supplier_id', supplier.id)
      .eq('status', 'pending')
      .eq('amount', data.totalValue);

    if (expenses && expenses.length > 0) {
      // Link to the first matching expense found
      const targetExpense = expenses[0];
      await supabaseAdmin
        .from('expenses')
        .update({ 
          invoice_id: invoice.id,
          order_id: orderId || targetExpense.order_id 
        })
        .eq('id', targetExpense.id);
      
      await supabaseAdmin
        .from('incoming_invoices')
        .update({ status: 'reconciled' })
        .eq('id', invoice.id);
        
      logger.info(`NF-e ${accessKey} reconciliada com despesa existente ${targetExpense.id}`);
    } else {
      // Auto-create expense since no match was found
      const { data: newExpense, error: createError } = await supabaseAdmin
        .from('expenses')
        .insert({
          supplier_id: supplier.id,
          description: `NF-e Entrada ${accessKey.slice(-10)} - ${data.supplierName}`,
          amount: data.totalValue,
          due_date: data.dueDate,
          category: 'producao_externa',
          invoice_id: invoice.id,
          order_id: orderId,
          status: 'pending'
        })
        .select()
        .single();
        
      if (createError) {
        logger.error('Erro ao criar despesa automática:', createError);
        // We don't throw here to at least return the invoice success
      } else {
        await supabaseAdmin
          .from('incoming_invoices')
          .update({ status: 'reconciled' })
          .eq('id', invoice.id);
        logger.info(`Nova despesa criada automaticamente para NF-e ${accessKey}: ${newExpense.id}`);
      }
    }

    return { success: true, invoice, supplier };
  } catch (error) {
    logger.error('Erro crítico no processamento de XML de entrada:', error);
    throw error;
  }
};

export const resyncAllInvoices = async () => {
  logger.info('Iniciando re-sincronização de datas de todas as NF-e...');
  const { data: invoices, error } = await supabaseAdmin
    .from('incoming_invoices')
    .select('id, raw_xml, access_key');
  
  if (error) {
    logger.error('Erro ao buscar notas para sincronização:', error);
    throw error;
  }

  let fixedCount = 0;
  let totalCount = invoices?.length || 0;
  
  logger.info(`Encontradas ${totalCount} notas para processar.`);

  for (const inv of invoices) {
    try {
      if (!inv.raw_xml) {
        logger.warn(`Nota ${inv.access_key} não possui conteúdo XML. Pulando.`);
        continue;
      }

      const jsonObj = parser.parse(inv.raw_xml);
      const nfe = jsonObj.nfeProc ? jsonObj.nfeProc.NFe : jsonObj.NFe;
      
      if (!nfe || !nfe.infNFe || !nfe.infNFe.ide) {
        logger.warn(`Estrutura ide não encontrada no XML da nota ${inv.access_key}. Pulando.`);
        continue;
      }

      const ide = nfe.infNFe.ide;
      const rawDate = ide.dhEmi || ide.dEmi;
      
      if (!rawDate) {
        logger.warn(`Data de emissão não encontrada no XML da nota ${inv.access_key}. Pulando.`);
        continue;
      }

      const issueDate = typeof rawDate === 'string' ? rawDate.split('T')[0] : rawDate;

      // Garantir que a data é válida (formato YYYY-MM-DD)
      if (issueDate && typeof issueDate === 'string' && issueDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        // Update Invoice
        const { error: invErr } = await supabaseAdmin
          .from('incoming_invoices')
          .update({ issue_date: issueDate })
          .eq('id', inv.id);
        
        if (invErr) logger.error(`Erro ao atualizar data da nota ${inv.access_key}:`, invErr);
        
        // Update associated Expense
        const { error: expErr } = await supabaseAdmin
          .from('expenses')
          .update({ due_date: issueDate })
          .eq('invoice_id', inv.id);
          
        if (expErr) logger.error(`Erro ao atualizar data da despesa vinculada à nota ${inv.access_key}:`, expErr);
        
        fixedCount++;
      } else {
        logger.warn(`Data extraída inválida para nota ${inv.access_key}: ${issueDate}`);
      }
    } catch (err) {
      logger.error(`Erro crítico ao processar nota ${inv.access_key} durante sincronização:`, err);
    }
  }
  
  logger.info(`Sincronização concluída. ${fixedCount} de ${totalCount} notas atualizadas.`);
  return { success: true, fixedCount, totalCount };
};

/**
 * List all incoming invoices with supplier data
 */
export const listIncomingInvoices = async () => {
  const { data, error } = await supabaseAdmin
    .from('incoming_invoices')
    .select('*, supplier:suppliers!inner(*)');
    
  if (error) throw error;
  return data;
};

/**
 * List all expenses with supplier data
 */
export const listExpenses = async () => {
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .select('*, supplier:suppliers(*)');
    
  if (error) throw error;
  return data;
};

/**
 * Create a new expense
 */
export const createExpense = async (expenseData) => {
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .insert(expenseData)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};
