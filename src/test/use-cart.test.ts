import { useCart } from "@/hooks/use-cart";

// Mock do supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({}),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    }),
  },
}));

// Mock do uuid
vi.mock("@/lib/uuid", () => ({
  generateUUID: vi.fn().mockReturnValue("test-uuid-123"),
}));

describe("useCart", () => {
  beforeEach(() => {
    // Limpar o estado do carrinho antes de cada teste
    const { clearCart } = useCart.getState();
    clearCart();
  });

  it("deve inicializar com carrinho vazio", () => {
    const state = useCart.getState();
    expect(state.items).toEqual([]);
    expect(state.couponCode).toBeNull();
    expect(state.discount).toBe(0);
  });

  it("deve adicionar um item ao carrinho", () => {
    const { addItem } = useCart.getState();

    addItem({
      productId: "prod-1",
      name: "Produto Teste",
      price: 100,
      quantity: 1,
      pricingType: "fixed",
    });

    const state = useCart.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].name).toBe("Produto Teste");
    expect(state.items[0].price).toBe(100);
  });

  it("deve incrementar quantidade se produto já existe", () => {
    const { addItem } = useCart.getState();

    addItem({
      productId: "prod-1",
      name: "Produto Teste",
      price: 100,
      quantity: 1,
      pricingType: "fixed",
    });

    addItem({
      productId: "prod-1",
      name: "Produto Teste",
      price: 100,
      quantity: 2,
      pricingType: "fixed",
    });

    const state = useCart.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(3);
  });

  it("deve adicionar itens per_sqm como novas linhas", () => {
    const { addItem } = useCart.getState();

    addItem({
      productId: "prod-1",
      name: "Produto por m²",
      price: 50,
      quantity: 1,
      pricingType: "per_sqm",
    });

    addItem({
      productId: "prod-1",
      name: "Produto por m²",
      price: 50,
      quantity: 1,
      pricingType: "per_sqm",
    });

    const state = useCart.getState();
    expect(state.items).toHaveLength(2);
  });

  it("deve remover um item do carrinho", () => {
    const { addItem, removeItem } = useCart.getState();

    addItem({
      productId: "prod-1",
      name: "Produto Teste",
      price: 100,
      quantity: 1,
      pricingType: "fixed",
    });

    const itemId = useCart.getState().items[0].id;
    removeItem(itemId);

    const state = useCart.getState();
    expect(state.items).toHaveLength(0);
  });

  it("deve atualizar a quantidade de um item", () => {
    const { addItem, updateQuantity } = useCart.getState();

    addItem({
      productId: "prod-1",
      name: "Produto Teste",
      price: 100,
      quantity: 1,
      pricingType: "fixed",
    });

    const itemId = useCart.getState().items[0].id;
    updateQuantity(itemId, 5);

    const state = useCart.getState();
    expect(state.items[0].quantity).toBe(5);
  });

  it("deve remover item se quantidade for zero ou menor", () => {
    const { addItem, updateQuantity } = useCart.getState();

    addItem({
      productId: "prod-1",
      name: "Produto Teste",
      price: 100,
      quantity: 3,
      pricingType: "fixed",
    });

    const itemId = useCart.getState().items[0].id;
    updateQuantity(itemId, 0);

    const state = useCart.getState();
    expect(state.items).toHaveLength(0);
  });

  it("deve calcular o subtotal corretamente", () => {
    const { addItem } = useCart.getState();

    addItem({
      productId: "prod-1",
      name: "Produto 1",
      price: 100,
      quantity: 2,
      pricingType: "fixed",
    });
    addItem({
      productId: "prod-2",
      name: "Produto 2",
      price: 50,
      quantity: 3,
      pricingType: "fixed",
    });

    const state = useCart.getState();
    const subtotal = state.getSubtotal();
    expect(subtotal).toBe(350); // (100 * 2) + (50 * 3)
  });

  it("deve calcular o total com desconto", () => {
    const { addItem, setCoupon } = useCart.getState();

    addItem({
      productId: "prod-1",
      name: "Produto 1",
      price: 100,
      quantity: 1,
      pricingType: "fixed",
    });

    setCoupon({ code: "DESC10", id: "coupon-1", discount: 10, freeShipping: false });

    const state = useCart.getState();
    const total = state.getTotal();
    expect(total).toBe(90); // 100 - 10
  });

  it("deve aplicar cupom de desconto", () => {
    const { setCoupon } = useCart.getState();

    setCoupon({ code: "DESC10", id: "coupon-1", discount: 10, freeShipping: false });

    const state = useCart.getState();
    expect(state.couponCode).toBe("DESC10");
    expect(state.discount).toBe(10);
    expect(state.discountSource).toBe("coupon");
  });

  it("deve limpar cupom", () => {
    const { setCoupon, clearCoupon } = useCart.getState();

    setCoupon({ code: "DESC10", id: "coupon-1", discount: 10, freeShipping: false });
    clearCoupon();

    const state = useCart.getState();
    expect(state.couponCode).toBeNull();
    expect(state.discount).toBe(0);
  });

  it("deve limpar o carrinho completamente", () => {
    const { addItem, clearCart } = useCart.getState();

    addItem({
      productId: "prod-1",
      name: "Produto Teste",
      price: 100,
      quantity: 1,
      pricingType: "fixed",
    });

    clearCart();

    const state = useCart.getState();
    expect(state.items).toHaveLength(0);
    expect(state.couponCode).toBeNull();
    expect(state.discount).toBe(0);
  });

  it("deve aplicar desconto progressivo sem sobrescrever cupom", () => {
    const { setCoupon, setProgressiveDiscount } = useCart.getState();

    // Aplicar cupom primeiro
    setCoupon({ code: "DESC10", id: "coupon-1", discount: 10, freeShipping: false });

    // Tentar aplicar desconto progressivo (não deve sobrescrever)
    setProgressiveDiscount({ discount: 5, ruleName: "Progressivo" });

    const state = useCart.getState();
    expect(state.discountSource).toBe("coupon");
    expect(state.discount).toBe(10);
  });
});
