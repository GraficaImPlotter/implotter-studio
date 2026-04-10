import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/hooks/use-cart";

export type CouponDiscountType = "percentage" | "fixed";

export type CouponRow = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_purchase: number | null;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  restricted_categories: string[] | null;
  restricted_products: string[] | null;
  first_purchase_only: boolean | null;
  free_shipping: boolean | null;
};

export type ProgressiveDiscountRule = {
  id: string;
  name: string;
  discount_type: string;
  discount_value: number;
  min_quantity: number | null;
  min_value: number | null;
  is_active: boolean | null;
};

const couponCodeSchema = z
  .string()
  .trim()
  .min(1, "Informe um cupom")
  .max(32, "Cupom muito longo");

const normalizeCouponCode = (code: string) => couponCodeSchema.parse(code).toUpperCase();

const cartSubtotal = (items: CartItem[]) => items.reduce((sum, i) => sum + i.price * i.quantity, 0);

const computeDiscountAmount = (discountType: string, discountValue: number, base: number) => {
  if (base <= 0) return 0;

  const raw = discountType === "percentage" ? (base * Number(discountValue)) / 100 : Number(discountValue);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(base, raw);
};

export async function evaluateCouponForCart(params: {
  code: string;
  items: CartItem[];
  customerId: string | null;
}): Promise<
  | { ok: true; couponId: string; code: string; discount: number; freeShipping: boolean }
  | { ok: false; message: string }
> {
  try {
    if (!params.items.length) return { ok: false, message: "Carrinho vazio" };

    const normalized = normalizeCouponCode(params.code);

    const { data: coupon, error } = await supabase
      .from("coupons")
      .select(
        "id, code, discount_type, discount_value, min_purchase, max_uses, used_count, valid_from, valid_until, restricted_categories, restricted_products, first_purchase_only, free_shipping",
      )
      .eq("code", normalized)
      .eq("is_active", true)
      .maybeSingle();

    if (error) return { ok: false, message: "Erro ao validar cupom" };
    if (!coupon) return { ok: false, message: "Cupom inválido" };

    const now = new Date();
    if (coupon.valid_from) {
      const from = new Date(coupon.valid_from);
      if (!Number.isNaN(from.getTime()) && now < from) return { ok: false, message: "Cupom ainda não está válido" };
    }
    if (coupon.valid_until) {
      const until = new Date(coupon.valid_until);
      if (!Number.isNaN(until.getTime()) && now > until) return { ok: false, message: "Cupom expirado" };
    }

    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return { ok: false, message: "Cupom esgotado" };
    }

    const subtotal = cartSubtotal(params.items);
    if (coupon.min_purchase && subtotal < Number(coupon.min_purchase)) {
      return { ok: false, message: `Compra mínima: R$ ${Number(coupon.min_purchase).toFixed(2)}` };
    }

    if (coupon.first_purchase_only && params.customerId) {
      const { data: previousOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("customer_id", params.customerId)
        .limit(1)
        .maybeSingle();

      if (previousOrder) return { ok: false, message: "Cupom válido apenas para primeira compra" };
    }

    // Eligibility base (supports restrictions by product_id and/or category_id)
    const restrictedProducts = (coupon.restricted_products ?? []).filter(Boolean);
    const restrictedCategories = (coupon.restricted_categories ?? []).filter(Boolean);

    const cartProductIds = Array.from(
      new Set(params.items.map((i) => i.productId).filter((id): id is string => Boolean(id))),
    );

    let productCategoryMap = new Map<string, string | null>();
    if (restrictedCategories.length && cartProductIds.length) {
      const { data: products } = await supabase
        .from("products")
        .select("id, category_id")
        .in("id", cartProductIds);

      (products ?? []).forEach((p: any) => productCategoryMap.set(p.id, p.category_id ?? null));
    }

    const restrictedProductSet = restrictedProducts.length ? new Set(restrictedProducts) : null;
    const restrictedCategorySet = restrictedCategories.length ? new Set(restrictedCategories) : null;

    const eligibleSubtotal = params.items.reduce((sum, item) => {
      if (restrictedProductSet && !restrictedProductSet.has(item.productId)) return sum;

      if (restrictedCategorySet) {
        const catId = productCategoryMap.get(item.productId) ?? null;
        if (!catId || !restrictedCategorySet.has(catId)) return sum;
      }

      return sum + item.price * item.quantity;
    }, 0);

    const hasRestrictions = Boolean(restrictedProductSet || restrictedCategorySet);
    if (hasRestrictions && eligibleSubtotal <= 0) {
      return { ok: false, message: "Cupom não se aplica aos itens do carrinho" };
    }

    const base = hasRestrictions ? eligibleSubtotal : subtotal;
    const discount = computeDiscountAmount(coupon.discount_type, Number(coupon.discount_value), base);

    if (discount <= 0 && !coupon.free_shipping) {
      return { ok: false, message: "Cupom sem desconto" };
    }

    return {
      ok: true,
      couponId: coupon.id,
      code: coupon.code,
      discount,
      freeShipping: Boolean(coupon.free_shipping),
    };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Cupom inválido" };
  }
}

export async function fetchActiveProgressiveDiscountRules(): Promise<ProgressiveDiscountRule[]> {
  const { data } = await supabase
    .from("progressive_discounts")
    .select("id, name, discount_type, discount_value, min_quantity, min_value, is_active")
    .eq("is_active", true)
    .order("min_value", { ascending: true });

  return (data ?? []) as any;
}

export function computeBestProgressiveDiscount(
  items: CartItem[],
  rules: ProgressiveDiscountRule[],
): { discount: number; ruleId: string | null; ruleName: string | null } {
  const subtotal = cartSubtotal(items);
  const qty = items.reduce((sum, i) => sum + i.quantity, 0);

  let best = { discount: 0, ruleId: null as string | null, ruleName: null as string | null };

  for (const r of rules) {
    const minQty = Number(r.min_quantity ?? 0);
    const minValue = Number(r.min_value ?? 0);
    if (qty < minQty) continue;
    if (subtotal < minValue) continue;

    const discount = computeDiscountAmount(r.discount_type, Number(r.discount_value), subtotal);
    if (discount > best.discount) best = { discount, ruleId: r.id, ruleName: r.name };
  }

  return best;
}
