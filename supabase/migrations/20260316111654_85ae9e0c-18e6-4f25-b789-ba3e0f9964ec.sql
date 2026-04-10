
CREATE OR REPLACE FUNCTION public.award_loyalty_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'finalizado' AND (OLD.status IS DISTINCT FROM 'finalizado') AND NEW.customer_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM loyalty_points WHERE order_id = NEW.id AND type = 'earn') THEN
      INSERT INTO loyalty_points (user_id, points, type, order_id, description)
      VALUES (
        NEW.customer_id,
        GREATEST(1, FLOOR(NEW.total)::int),
        'earn',
        NEW.id,
        'Pedido #' || NEW.order_number || ' finalizado'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_loyalty_points
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.award_loyalty_points();
