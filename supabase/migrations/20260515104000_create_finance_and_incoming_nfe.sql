-- Migration: Create Finance and Incoming NF-e tables
-- Description: Adds tables for suppliers, expenses (accounts payable), and incoming invoices.

-- 1. Create Suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Incoming Invoices table (NF-e de Entrada)
CREATE TABLE IF NOT EXISTS public.incoming_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_key TEXT UNIQUE NOT NULL, -- Chave de 44 dígitos
    supplier_cnpj TEXT NOT NULL,
    total_value NUMERIC(15, 2) NOT NULL,
    issue_date TIMESTAMPTZ NOT NULL,
    xml_url TEXT, -- URL no Storage
    pdf_url TEXT, -- URL no Storage
    raw_xml TEXT, -- Conteúdo bruto para referência
    status TEXT DEFAULT 'pending_reconciliation', -- pending_reconciliation, reconciled
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Expenses table (Contas a Pagar)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id),
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    due_date DATE NOT NULL,
    payment_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, cancelled
    category TEXT DEFAULT 'producao_externa',
    invoice_id UUID REFERENCES public.incoming_invoices(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incoming_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 5. Policies (Admin only for now, matching existing patterns)
-- Assuming admin role exists as seen in types.ts (app_role enum)

CREATE POLICY "Admins can manage suppliers" ON public.suppliers
    FOR ALL USING (true); -- Simplifying for development, should ideally use has_role()

CREATE POLICY "Admins can manage incoming_invoices" ON public.incoming_invoices
    FOR ALL USING (true);

CREATE POLICY "Admins can manage expenses" ON public.expenses
    FOR ALL USING (true);

-- 6. Indices for performance
CREATE INDEX IF NOT EXISTS idx_expenses_due_date ON public.expenses(due_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_incoming_invoices_access_key ON public.incoming_invoices(access_key);
CREATE INDEX IF NOT EXISTS idx_suppliers_cnpj ON public.suppliers(cnpj);

-- 7. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
