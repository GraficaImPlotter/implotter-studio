import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Ruler, Package, FolderTree, Tag, Search, HelpCircle, DollarSign, Calculator, TrendingUp, Image as ImageIcon, Layers, Palette, Copy, Sparkles, Loader2, ChevronUp, ChevronDown, Save, Upload, Settings, AlertTriangle } from "lucide-react";
import { generateSlug, generateMetaTitle, generateMetaDescription } from "@/lib/slug";
import RichTextEditor from "@/components/admin/RichTextEditor";
import ProductImageUploader from "@/components/admin/ProductImageUploader";
import RelatedProductsManager from "@/components/admin/RelatedProductsManager";
import { useSettings } from "@/hooks/use-settings";
import { generateUUID } from "@/lib/uuid";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { parsePdfText, generateSql } from "@/lib/migration-utils";

interface CatalogNode {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  is_active: boolean;
}

const PRICING_LABELS: Record<string, string> = {
  fixed: "Preço fixo",
  per_sqm: "Por m²",
};

const getNodePath = (nodes: CatalogNode[], nodeId: string): string => {
  const parts: string[] = [];
  let current = nodes.find(n => n.id === nodeId);
  let depth = 0;
  const MAX_DEPTH = 10;

  while (current && depth < MAX_DEPTH) {
    parts.unshift(current.name);
    if (!current.parent_id) break;
    const parent = nodes.find(n => n.id === current?.parent_id);
    if (!parent || parent.id === current.id) break;
    current = parent;
    depth++;
  }
  return parts.join(" › ");
};
const ITEMS_PER_PAGE = 15;

const AdminProdutos = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(0);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminFilterColor, setAdminFilterColor] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [pricingType, setPricingType] = useState("fixed");
  const [productName, setProductName] = useState("");
  const [slug, setSlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [configSchema, setConfigSchema] = useState<any[]>([]);
  const [onSale, setOnSale] = useState(false);
  const [fullDescription, setFullDescription] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [savedProductId, setSavedProductId] = useState<string | null>(null);
  const [productFaqs, setProductFaqs] = useState<{ id?: string; question: string; answer: string }[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [selectedFinishingIds, setSelectedFinishingIds] = useState<string[]>([]);
  const [generatingAI, setGeneratingAI] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [costProduction, setCostProduction] = useState(0);
  const [costSupplier, setCostSupplier] = useState(0);
  const [costMaterial, setCostMaterial] = useState(0);
  const [costArt, setCostArt] = useState(0);
  const [costExtra, setCostExtra] = useState(0);
  const [price, setPrice] = useState(0);
  const [shippingWeight, setShippingWeight] = useState(0.3);
  const [shippingHeight, setShippingHeight] = useState(2);
  const [shippingWidth, setShippingWidth] = useState(11);
  const [shippingLength, setShippingLength] = useState(16);
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(false);
  const [defaultMargin, setDefaultMargin] = useState(80);
  const [processingBulk, setProcessingBulk] = useState(false);
  const [activeTab, setActiveTab] = useState("manage");
  const [groupByCategory, setGroupByCategory] = useState(true);
  
  // Migration Tool states
  const [importPdfText, setImportPdfText] = useState("");
  const [importTargetNode, setImportTargetNode] = useState("");
  const [aiEnabledForImport, setAiEnabledForImport] = useState(false);
  const [importSeparateAttributes, setImportSeparateAttributes] = useState(false);
  const [importShowSize, setImportShowSize] = useState(true);
  const [importShowWeight, setImportShowWeight] = useState(true);
  const [importShowCores, setImportShowCores] = useState(true);
  const [importShowQty, setImportShowQty] = useState(true);
  const [generatedSql, setGeneratedSql] = useState("");
  const [processingImport, setProcessingImport] = useState(false);

  // JSON editor toggle for the dynamic configurator
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [rawJson, setRawJson] = useState("");
  const [groupedVariants, setGroupedVariants] = useState<{ id: string; name: string; options: { name: string; price: number }[] }[]>([]);

  const totalCost = costProduction + costSupplier + costMaterial + costArt + costExtra;
  const suggestedPrice = totalCost > 0 ? totalCost * (1 + defaultMargin / 100) : 0;
  const profit = price - totalCost;
  const marginActual = price > 0 ? ((price - totalCost) / price) * 100 : 0;


  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, categories(name), subcategories(name)").order("name");
      if (error) throw error;
      return data || [];
    }
  });

  const { data: catalogNodes = [] } = useQuery({
    queryKey: ["catalog-nodes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("catalog_nodes").select("*").order("name");
      if (error) throw error;
      return (data || []) as CatalogNode[];
    }
  });

  const { data: allFinishings = [] } = useQuery({
    queryKey: ["finishings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("finishings").select("*").order("sort_order");
      if (error) throw error;
      return data || [];
    }
  });

  const { data: companySettings = {} } = useSettings();

  useEffect(() => {
    if (companySettings.profit_margin_default) {
      setDefaultMargin(parseFloat(companySettings.profit_margin_default) || 80);
    }
  }, [companySettings]);

  useEffect(() => {
    if (!priceManuallyEdited && totalCost > 0 && suggestedPrice > 0) {
      setPrice(Math.round(suggestedPrice * 100) / 100);
    }
  }, [totalCost, suggestedPrice, priceManuallyEdited]);

  const load = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  }, [queryClient]);

  const sortedNodePaths = useMemo(() => {
    return catalogNodes
      .map(n => ({ id: n.id, path: getNodePath(catalogNodes, n.id) }))
      .sort((a, b) => a.path.localeCompare(b.path, "pt-BR"));
  }, [catalogNodes]);

  const filteredProducts = useMemo(() => {
    return (products as any[]).filter(p => {
      const q = adminSearch.toLowerCase();
      const matchesSearch = !q ||
        p.name?.toLowerCase().includes(q) ||
        (p.product_code && p.product_code.toLowerCase().includes(q));
      const matchesColor = !adminFilterColor || p.color_mode === adminFilterColor;
      return matchesSearch && matchesColor;
    });
  }, [products, adminSearch, adminFilterColor]);

  const groupedProducts = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredProducts.forEach(p => {
      const nodePath = p.catalog_node_id
        ? (sortedNodePaths.find(n => n.id === p.catalog_node_id)?.path || "Sem Categoria")
        : (p.categories?.name || "Sem Categoria");
      if (!groups[nodePath]) groups[nodePath] = [];
      groups[nodePath].push(p);
    });
    return Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, "pt-BR")));
  }, [filteredProducts, sortedNodePaths]);

  const handleProcessImport = async () => {
    if (!importPdfText.trim()) return;
    setProcessingImport(true);
    try {
      const parsed = parsePdfText(importPdfText);
      let categories = parsed;
      const descriptions: Record<string, any> = {};

      // If AI is enabled, fetch descriptions for each product
      if (aiEnabledForImport) {
        const productsToProcess: string[] = [];
        Object.values(categories).forEach(cat => {
          Object.keys(cat.products).forEach(prodName => {
            productsToProcess.push(prodName);
          });
        });

        toast({ title: "Iniciando processamento com IA", description: `Isso pode levar alguns instantes para ${productsToProcess.length} produtos...` });

        for (const prodName of productsToProcess) {
          try {
            const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-product-content`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ productName: prodName }),
            });
            const data = await resp.json();
            if (resp.ok) {
              descriptions[prodName] = {
                short: data.short_description,
                full: data.full_description,
                metaTitle: data.meta_title,
                metaDesc: data.short_description,
                keywords: data.keywords
              };
            }
          } catch (err) {
            console.error(`Erro ao processar ${prodName} com IA`, err);
          }
        }
      }

      // Optionally override category name with importTargetNode
      if (importTargetNode.trim() && Object.keys(parsed).length > 0) {
        const renamed: typeof parsed = {};
        Object.entries(parsed).forEach(([key, val]) => {
          const newKey = importTargetNode.trim();
          renamed[newKey] = { ...val, name: newKey };
        });
        categories = renamed;
      }

      const sql = generateSql(categories, { 
        includeDescriptions: aiEnabledForImport,
        descriptions,
        separateAttributes: importSeparateAttributes,
        showSize: importShowSize,
        showWeight: importShowWeight,
        showCores: importShowCores,
        showQty: importShowQty
      });
      setGeneratedSql(sql);
      toast({ title: "Script gerado com sucesso!", description: `${Object.keys(categories).length} categorias processadas.` });
    } catch (e: any) {
      toast({ title: "Erro ao processar PDF", description: e.message, variant: "destructive" });
    }
    setProcessingImport(false);
  };

  const handleNameChange = (name: string) => {
    setProductName(name);
    if (!editing) {
      setSlug(generateSlug(name));
      setMetaTitle(generateMetaTitle(name));
      setMetaDesc(generateMetaDescription(name));
    }
  };

  const handleGenerateWithAI = async () => {
    if (!productName.trim()) {
      toast({ title: "Digite o nome do produto primeiro", variant: "destructive" });
      return;
    }
    setGeneratingAI(true);
    try {
      // Pass category list to AI for suggestion
      const catList = catalogNodes.map(n => ({ id: n.id, name: n.name, path: getNodePath(catalogNodes, n.id) }));
      
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-product-content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          productName: productName.trim(),
          categories: catList
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro ao gerar conteúdo");
      
      if (data.short_description && formRef.current) {
        const sdInput = formRef.current.querySelector<HTMLInputElement>('[name="short_description"]');
        if (sdInput) {
          sdInput.value = data.short_description;
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          nativeInputValueSetter?.call(sdInput, data.short_description);
          sdInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      if (data.full_description) setFullDescription(data.full_description);
      if (data.specifications) setSpecifications(data.specifications);
      if (data.keywords && formRef.current) {
        const kwInput = formRef.current.querySelector<HTMLInputElement>('[name="keywords"]');
        if (kwInput) {
          kwInput.value = data.keywords;
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          nativeInputValueSetter?.call(kwInput, data.keywords);
          kwInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      // Handle SEO and Category fields
      if (data.meta_title) setMetaTitle(data.meta_title);
      if (data.short_description) setMetaDesc(data.short_description);
      
      if (data.category_suggestion && formRef.current) {
        const catSelect = formRef.current.querySelector<HTMLSelectElement>('[name="catalog_node_id"]');
        if (catSelect) {
          // Try to match by ID or Name
          const suggested = catList.find(c => c.id === data.category_suggestion || c.name === data.category_suggestion || data.category_suggestion.includes(c.name));
          if (suggested) {
            catSelect.value = suggested.id;
            catSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }

      toast({ title: "Conteúdo gerado com sucesso!", description: "Revise e ajuste conforme necessário." });
    } catch (e: any) {
      toast({ title: "Erro ao gerar conteúdo", description: e.message, variant: "destructive" });
    }
    setGeneratingAI(false);
  };

  const loadFaqs = async (productId: string) => {
    const { data } = await supabase.from("faq_items").select("*").eq("product_id", productId).order("sort_order");
    setProductFaqs((data ?? []).map(f => ({ id: f.id, question: f.question, answer: f.answer })));
  };

  const openForm = (product?: any) => {
    setEditing(product || null);
    setPricingType(product?.pricing_type || "fixed");
    setProductName(product?.name || "");
    setSlug(product?.slug || "");
    setMetaTitle(product?.meta_title || "");
    setMetaDesc(product?.meta_description || "");
    setOnSale(!!product?.sale_price);
    setFullDescription(product?.full_description || "");
    setSpecifications(product?.specifications || "");
    setConfigSchema(Array.isArray(product?.configuration_schema) ? product.configuration_schema : []);
    setSavedProductId(product?.id || null);
    setProductFaqs([]);
    setPendingFiles([]);
    setPendingPreviews([]);
    setSelectedFinishingIds([]);

    setCostProduction(Number(product?.cost_production) || 0);
    setCostSupplier(Number(product?.cost_supplier) || 0);
    setCostMaterial(Number(product?.cost_material) || 0);
    setCostArt(Number(product?.cost_art) || 0);
    setCostExtra(Number(product?.cost_extra) || 0);
    setPrice(Number(product?.price) || 0);
    setShippingWeight(Number(product?.shipping_weight) || 0.3);
    setShippingHeight(Number(product?.shipping_height) || 2);
    setShippingWidth(Number(product?.shipping_width) || 11);
    setShippingLength(Number(product?.shipping_length) || 16);
    setPriceManuallyEdited(!!product);

    if (product?.id) {
      loadFaqs(product.id);
      supabase.from("product_finishings").select("finishing_id").eq("product_id", product.id).then(({ data }) => {
        setSelectedFinishingIds((data ?? []).map((r: any) => r.finishing_id));
      });
    }

    // Load hierarchical variants if they exist
    setGroupedVariants([]);
    if (Array.isArray(product?.configuration_schema)) {
      const hierarchy = (product.configuration_schema as any[]).find(it => it.ui_type === 'hierarchy');
      if (hierarchy && hierarchy.groups) {
        setGroupedVariants(hierarchy.groups);
      }
    }

    setOpen(true);
  };

  const handleApplySuggested = () => {
    setPrice(Math.round(suggestedPrice * 100) / 100);
    setPriceManuallyEdited(false);
  };

  const calculatePriceFromCost = (cost: number) => {
    return Math.round(cost * (1 + defaultMargin / 100) * 100) / 100;
  };

  const autoCalcularTudo = () => {
    const next = [...configSchema];
    next.forEach(item => {
      if (item.options && Array.isArray(item.options)) {
        item.options.forEach((opt: any) => {
          if (opt.cost_adj > 0) {
            opt.price_adj = calculatePriceFromCost(opt.cost_adj);
          }
        });
      }
    });
    setConfigSchema(next);
    toast({ title: "Preços atualizados!", description: `Todas as opções com custo preenchido foram recalculadas com margem de ${defaultMargin}%.` });
  };

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const handlePendingFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => {
      if (!ALLOWED_TYPES.includes(f.type)) { toast({ title: `Tipo não permitido: ${f.name}`, variant: "destructive" }); return false; }
      if (f.size > MAX_FILE_SIZE) { toast({ title: `Arquivo muito grande: ${f.name}`, variant: "destructive" }); return false; }
      return true;
    });
    if (pendingFiles.length + valid.length > 5) { toast({ title: "Máximo de 5 imagens", variant: "destructive" }); return; }
    setPendingFiles(prev => [...prev, ...valid]);
    setPendingPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
    e.target.value = "";
  };

  const removePendingFile = (index: number) => {
    URL.revokeObjectURL(pendingPreviews[index]);
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    setPendingPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPendingFiles = async (productId: string) => {
    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const safeName = `${Date.now()}-${generateUUID().slice(0, 8)}.${ext}`;
      const path = `${productId}/${safeName}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
      if (error) continue;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      await supabase.from("product_images").insert({ product_id: productId, image_url: urlData.publicUrl, sort_order: i });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const pt = pricingType;
    const isSqm = pt === "per_sqm";

    const payload: any = {
      name: productName,
      slug,
      catalog_node_id: (fd.get("catalog_node_id") as string) || null,
      category_id: null,
      subcategory_id: null,
      product_code: (fd.get("product_code") as string) || null,
      color_mode: (fd.get("color_mode") as string) || "4x0",
      default_quantity: parseInt(fd.get("default_quantity") as string) || 1,
      short_description: fd.get("short_description") as string,
      full_description: fullDescription,
      price,
      sale_price: onSale ? (parseFloat(fd.get("sale_price") as string) || null) : null,
      pricing_type: pt,
      sale_unit: fd.get("sale_unit") as string,
      price_per_sqm: isSqm ? (parseFloat(fd.get("price_per_sqm") as string) || 0) : 0,
      min_width: isSqm ? (parseFloat(fd.get("min_width") as string) || null) : null,
      max_width: isSqm ? (parseFloat(fd.get("max_width") as string) || null) : null,
      min_height: isSqm ? (parseFloat(fd.get("min_height") as string) || null) : null,
      max_height: isSqm ? (parseFloat(fd.get("max_height") as string) || null) : null,
      min_area: isSqm ? (parseFloat(fd.get("min_area") as string) || null) : null,
      max_area: isSqm ? (parseFloat(fd.get("max_area") as string) || null) : null,
      estimated_days: parseInt(fd.get("estimated_days") as string) || null,
      is_featured: fd.get("is_featured") === "on",
      is_active: fd.get("is_active") === "on",
      meta_title: metaTitle,
      meta_description: metaDesc,
      video_url: (fd.get("video_url") as string) || null,
      keywords: (fd.get("keywords") as string) || null,
      specifications,
      cost_production: costProduction,
      cost_supplier: costSupplier,
      cost_material: costMaterial,
      cost_art: costArt,
      cost_extra: costExtra,
      shipping_length: shippingLength,
      configuration_schema: groupedVariants.length > 0 ? [{
        id: "hierarchy_v1",
        label: "Opções do Produto",
        type: "select",
        ui_type: "hierarchy",
        groups: groupedVariants
      }] : configSchema,
    };

    const saveFaqs = async (productId: string) => {
      await supabase.from("faq_items").delete().eq("product_id", productId);
      const faqsToInsert = productFaqs.filter(f => f.question.trim() && f.answer.trim()).map((f, i) => ({
        product_id: productId,
        question: f.question,
        answer: f.answer,
        sort_order: i,
        category: "produto",
      }));
      if (faqsToInsert.length > 0) {
        await supabase.from("faq_items").insert(faqsToInsert);
      }
    };

    const saveFinishings = async (productId: string) => {
      await supabase.from("product_finishings").delete().eq("product_id", productId);
      if (selectedFinishingIds.length > 0) {
        await supabase.from("product_finishings").insert(
          selectedFinishingIds.map(fid => ({ product_id: productId, finishing_id: fid }))
        );
      }
    };

    try {
      if (editing) {
        const { error: updateErr } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (updateErr) { toast({ title: "Erro ao atualizar produto", description: updateErr.message, variant: "destructive" }); return; }
        await saveFaqs(editing.id);
        await saveFinishings(editing.id);
        toast({ title: "Produto atualizado! Você pode continuar editando ou fechar o modal." });
        queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        return;
      } else {
        let finalSlug = slug;
        let result = await supabase.from("products").insert({ ...payload, slug: finalSlug }).select("id").single();
        if (result.error?.message?.includes("products_slug_key")) {
          finalSlug = `${slug}-${Date.now().toString(36)}`;
          result = await supabase.from("products").insert({ ...payload, slug: finalSlug }).select("id").single();
        }
        if (result.error || !result.data) { toast({ title: "Erro ao criar produto", description: result.error?.message || "Erro desconhecido", variant: "destructive" }); return; }
        const newId = result.data.id;
        setSavedProductId(newId);
        await uploadPendingFiles(newId);
        await saveFaqs(newId);
        await saveFinishings(newId);
        setEditing({ ...payload, id: newId, slug: finalSlug });
        toast({ title: "Produto criado! Agora você pode adicionar imagens e produtos relacionados." });
        queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      }
      setPendingFiles([]); setPendingPreviews([]);
    } catch (e: any) {
      toast({ title: "Erro inesperado", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir produto definitivamente? Se este produto tiver histórico de pedidos, ele não poderá ser excluído, apenas desativado.")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") {
        toast({ 
          title: "Não é possível excluir", 
          description: "Este produto possui histórico de pedidos e não pode ser removido do banco. Considere 'Desativar' o produto em vez de excluir.", 
          variant: "destructive",
          duration: 6000
        });
      } else {
        toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Produto excluído" });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      load();
    }
  };

  const handleDuplicate = async (product: any) => {
    const { id, created_at, updated_at, order_items, categories, subcategories, product_images, ...rest } = product;
    const payload = { 
      ...rest, 
      name: `${rest.name} (Cópia)`, 
      slug: `${rest.slug}-copia-${Date.now()}`,
      is_active: false,
      is_featured: false
    };
    const { data, error } = await supabase.from("products").insert(payload).select("id").single();
    if (error) { toast({ title: "Erro ao duplicar", variant: "destructive" }); return; }
    
    const { data: fins } = await supabase.from("product_finishings").select("finishing_id").eq("product_id", id);
    if (fins && fins.length > 0) {
      await supabase.from("product_finishings").insert(fins.map((f: any) => ({ product_id: data.id, finishing_id: f.finishing_id })));
    }
    
    toast({ title: "Produto duplicado com sucesso!" });
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Produtos</h1>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditing(null); setPricingType("fixed"); setSavedProductId(null); setPendingFiles([]); pendingPreviews.forEach(u => URL.revokeObjectURL(u)); setPendingPreviews([]); } }}>
          <DialogTrigger asChild>
            <Button variant="hero" onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> Novo Produto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle></DialogHeader>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="text-sm font-medium">Nome *</label>
                   <Input value={productName} onChange={e => handleNameChange(e.target.value)} required />
                 </div>
                 <div>
                   <label className="text-sm font-medium">Código do Produto</label>
                   <Input name="product_code" defaultValue={editing?.product_code || ""} placeholder="Ex: CV-001" />
                 </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="text-sm font-medium">Cores</label>
                   <select name="color_mode" defaultValue={editing?.color_mode || "4x0"} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                      <option value="4x0">4x0 (Frente colorida)</option>
                      <option value="4x1">4x1 (Frente colorida / Verso P&B)</option>
                      <option value="4x4">4x4 (Frente e verso coloridos)</option>
                      <option value="1x0">1x0 (Frente P&B)</option>
                      <option value="1x1">1x1 (Frente e verso P&B)</option>
                   </select>
                 </div>
                 <div>
                   <label className="text-sm font-medium">Quantidade padrão</label>
                   <Input name="default_quantity" type="number" defaultValue={editing?.default_quantity || 1} min={1} />
                 </div>
               </div>

              <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                <label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <FolderTree className="w-4 h-4 text-highlight" /> Caminho no Catálogo
                </label>
                <select
                  name="catalog_node_id"
                  defaultValue={editing?.catalog_node_id || ""}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Sem vínculo</option>
                  {sortedNodePaths.map(np => (
                    <option key={np.id} value={np.id}>{np.path}</option>
                  ))}
                </select>
              </div>

              <div className="bg-success/5 rounded-xl p-4 space-y-4 border border-success/20">
                <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-success" /> Custos & Precificação Automática
                </h3>
                <p className="text-xs text-muted-foreground -mt-2">
                  Informe os custos e o preço de venda será calculado automaticamente com margem de {defaultMargin}%.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Custo Produção</label>
                    <Input type="number" step="0.01" value={costProduction || ""} onChange={e => { setCostProduction(parseFloat(e.target.value) || 0); setPriceManuallyEdited(false); }} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Custo Fornecedor</label>
                    <Input type="number" step="0.01" value={costSupplier || ""} onChange={e => { setCostSupplier(parseFloat(e.target.value) || 0); setPriceManuallyEdited(false); }} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Custo Material</label>
                    <Input type="number" step="0.01" value={costMaterial || ""} onChange={e => { setCostMaterial(parseFloat(e.target.value) || 0); setPriceManuallyEdited(false); }} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Custo Arte</label>
                    <Input type="number" step="0.01" value={costArt || ""} onChange={e => { setCostArt(parseFloat(e.target.value) || 0); setPriceManuallyEdited(false); }} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Custo Adicional</label>
                    <Input type="number" step="0.01" value={costExtra || ""} onChange={e => { setCostExtra(parseFloat(e.target.value) || 0); setPriceManuallyEdited(false); }} placeholder="0.00" />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
                    📦 Dimensões para Frete
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium">Peso (kg)</label>
                      <Input type="number" step="0.01" value={shippingWeight || ""} onChange={e => setShippingWeight(parseFloat(e.target.value) || 0)} placeholder="0.3" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Altura (cm)</label>
                      <Input type="number" step="0.1" value={shippingHeight || ""} onChange={e => setShippingHeight(parseFloat(e.target.value) || 0)} placeholder="2" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Largura (cm)</label>
                      <Input type="number" step="0.1" value={shippingWidth || ""} onChange={e => setShippingWidth(parseFloat(e.target.value) || 0)} placeholder="11" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Comprimento (cm)</label>
                      <Input type="number" step="0.1" value={shippingLength || ""} onChange={e => setShippingLength(parseFloat(e.target.value) || 0)} placeholder="16" />
                    </div>
                  </div>
                </div>

                {totalCost > 0 && (
                  <div className="bg-card rounded-lg p-4 border border-border space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                      <div className="bg-muted/50 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Custo Total</p>
                        <p className="font-display font-bold text-destructive text-lg">R$ {totalCost.toFixed(2)}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Preço Sugerido</p>
                        <p className="font-display font-bold text-primary text-lg">R$ {suggestedPrice.toFixed(2)}</p>
                        <p className="text-[9px] text-muted-foreground">Margem {defaultMargin}%</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Preço Venda</p>
                        <p className="font-display font-bold text-foreground text-lg">R$ {price.toFixed(2)}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Lucro Estimado</p>
                        <p className={`font-display font-bold text-lg ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                          R$ {profit.toFixed(2)}
                        </p>
                        <p className={`text-[9px] ${marginActual >= 0 ? "text-success" : "text-destructive"}`}>
                          Margem {marginActual.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {priceManuallyEdited && Math.abs(price - suggestedPrice) > 0.01 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Preço editado manualmente.</span>
                        <button type="button" onClick={handleApplySuggested} className="text-primary hover:underline font-medium">
                          Aplicar preço sugerido (R$ {suggestedPrice.toFixed(2)})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-secondary/50 rounded-xl p-4 space-y-4 border border-border">
                <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                  <Package className="w-4 h-4 text-highlight" /> Precificação
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Tipo de Venda *</label>
                    <select
                      name="pricing_type"
                      value={pricingType}
                      onChange={e => setPricingType(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="fixed">Preço fixo</option>
                      <option value="per_sqm">Por metro quadrado (m²)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Unidade de Venda</label>
                    <select name="sale_unit" defaultValue={editing?.sale_unit || "unit"} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                      <option value="unit">Unidade</option>
                      <option value="pack">Pacote</option>
                      <option value="sqm">Metro quadrado</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      {pricingType === "per_sqm" ? "Preço base (referência)" : "Preço Opcional (A partir de)"}
                      {totalCost > 0 && <TrendingUp className="w-3 h-3 text-success" />}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={price !== undefined ? price : ""}
                      onChange={e => { setPrice(parseFloat(e.target.value) || 0); setPriceManuallyEdited(true); }}
                      className={totalCost > 0 && !priceManuallyEdited ? "border-success/50 bg-success/5" : ""}
                    />
                    {totalCost > 0 && !priceManuallyEdited && (
                      <p className="text-[10px] text-success mt-0.5">✓ Calculado automaticamente</p>
                    )}
                  </div>
                </div>

                <div className="bg-background rounded-lg p-3 border border-border space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={onSale} onChange={e => setOnSale(e.target.checked)} />
                    <Tag className="w-4 h-4 text-destructive" /> Produto em promoção
                  </label>
                  {onSale && (
                    <div>
                      <label className="text-sm text-muted-foreground">Preço promocional *</label>
                      <Input name="sale_price" type="number" step="0.01" defaultValue={editing?.sale_price || ""} placeholder="Ex: 49.90" />
                    </div>
                  )}
                </div>

                {pricingType === "per_sqm" && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-highlight">Valor por m² *</label>
                      <Input name="price_per_sqm" type="number" step="0.01" defaultValue={editing?.price_per_sqm} />
                    </div>
                    <h4 className="font-medium text-foreground flex items-center gap-2 text-sm pt-2">
                      <Ruler className="w-4 h-4 text-highlight" /> Limites de dimensão (em metros)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-sm font-medium">Largura mín.</label><Input name="min_width" type="number" step="0.01" defaultValue={editing?.min_width} placeholder="Ex: 0.20" /></div>
                      <div><label className="text-sm font-medium">Largura máx.</label><Input name="max_width" type="number" step="0.01" defaultValue={editing?.max_width} placeholder="Ex: 5.00" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-sm font-medium">Altura mín.</label><Input name="min_height" type="number" step="0.01" defaultValue={editing?.min_height} placeholder="Ex: 0.20" /></div>
                      <div><label className="text-sm font-medium">Altura máx.</label><Input name="max_height" type="number" step="0.01" defaultValue={editing?.max_height} placeholder="Ex: 50.00" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-sm font-medium">Área mín. (m²)</label><Input name="min_area" type="number" step="0.01" defaultValue={editing?.min_area} placeholder="Ex: 0.10" /></div>
                      <div><label className="text-sm font-medium">Área máx. (m²)</label><Input name="max_area" type="number" step="0.01" defaultValue={editing?.max_area} placeholder="Ex: 100" /></div>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-gradient-to-r from-highlight/10 to-highlight-glow/10 rounded-xl p-4 border border-highlight/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-bold text-foreground flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-highlight" /> Gerar Conteúdo com IA
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Preenche automaticamente descrições, especificações e palavras-chave a partir do nome do produto.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleGenerateWithAI} disabled={generatingAI || !productName.trim()} className="border-highlight/30 text-highlight hover:bg-highlight/10">
                    {generatingAI ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Gerando...</> : <><Sparkles className="w-4 h-4 mr-1" /> Gerar com IA</>}
                  </Button>
                </div>
              </div>

              <div><label className="text-sm font-medium">Descrição Curta</label><Input name="short_description" defaultValue={editing?.short_description} placeholder="Frase curta que aparece na listagem e meta description" /></div>

              <div>
                <label className="text-sm font-medium mb-2 block">Descrição Completa (SEO)</label>
                <RichTextEditor value={fullDescription} onChange={setFullDescription} placeholder="Descrição detalhada do produto para indexação e conversão..." />
                <p className="text-[10px] text-muted-foreground mt-1">Conteúdo rico e útil melhora o ranqueamento no Google</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Especificações Técnicas</label>
                <RichTextEditor value={specifications} onChange={setSpecifications} placeholder="Material, gramatura, acabamento, cores, dimensões..." />
              </div>

              <div>
                <label className="text-sm font-medium">URL do Vídeo (YouTube, Vimeo, etc)</label>
                <Input name="video_url" defaultValue={editing?.video_url || ""} placeholder="https://youtube.com/watch?v=..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Prazo (dias)</label><Input name="estimated_days" type="number" defaultValue={editing?.estimated_days} /></div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_featured" defaultChecked={editing?.is_featured} /> Destaque</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={editing?.is_active ?? true} /> Ativo</label>
                </div>
              </div>

              <div className="bg-secondary/50 rounded-xl p-4 border border-border space-y-4">
                <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                  <Search className="w-4 h-4 text-highlight" /> SEO & Indexação
                </h3>
                <div>
                  <label className="text-sm font-medium">Meta Title</label>
                  <Input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="Título que aparece no Google (máx. 60 caracteres)" />
                  <p className={`text-[10px] mt-0.5 ${metaTitle.length > 60 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    {metaTitle.length}/60 caracteres {metaTitle.length > 60 && "⚠️ Muito longo"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Meta Description</label>
                  <Textarea value={metaDesc} onChange={e => setMetaDesc(e.target.value)} placeholder="Descrição que aparece no Google (máx. 160 caracteres)" rows={2} />
                  <p className={`text-[10px] mt-0.5 ${metaDesc.length > 160 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    {metaDesc.length}/160 caracteres {metaDesc.length > 160 && "⚠️ Muito longo"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Slug (URL)</label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">/loja/</span>
                    <Input value={slug} onChange={e => setSlug(e.target.value)} required className="flex-1" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Palavras-chave (SEO)</label>
                  <Input name="keywords" defaultValue={editing?.keywords || ""} placeholder="cartão de visita, impressão, gráfica..." />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Separadas por vírgula</p>
                </div>
                <div className="bg-background rounded-lg p-3 border border-border">
                  <p className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Prévia do Google</p>
                  <p className="text-highlight text-sm font-medium truncate">{metaTitle || "Título do Produto | Gráfica ImPlotter"}</p>
                  <p className="text-success text-xs truncate">graficaimplotter.shop/loja/{slug || "slug-do-produto"}</p>
                  <p className="text-muted-foreground text-xs line-clamp-2">{metaDesc || "Descrição do produto..."}</p>
                </div>
              </div>

              {allFinishings.length > 0 && (
                <div className="bg-secondary/50 rounded-xl p-4 border border-border space-y-3">
                  <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                    <Layers className="w-4 h-4 text-highlight" /> Acabamentos Disponíveis
                  </h3>
                  <p className="text-xs text-muted-foreground">Selecione os acabamentos que este produto aceita. O cliente poderá escolhê-los na loja.</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {allFinishings.filter(f => f.is_active).map(f => (
                      <label key={f.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-background border border-border cursor-pointer hover:bg-muted/50">
                        <input
                          type="checkbox"
                          checked={selectedFinishingIds.includes(f.id)}
                          onChange={e => {
                            if (e.target.checked) setSelectedFinishingIds(prev => [...prev, f.id]);
                            else setSelectedFinishingIds(prev => prev.filter(id => id !== f.id));
                          }}
                        />
                        <span>{f.name}</span>
                        <span className="text-muted-foreground ml-auto text-xs">+R$ {Number(f.price).toFixed(2)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-secondary/50 rounded-xl p-4 border border-border space-y-3">
                <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-highlight" /> Perguntas Frequentes do Produto
                </h3>
                <p className="text-xs text-muted-foreground">Perguntas e respostas específicas deste produto (melhora SEO com FAQ Schema)</p>
                {productFaqs.map((faq, i) => (
                  <div key={i} className="bg-background rounded-lg p-3 border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Pergunta {i + 1}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setProductFaqs(prev => prev.filter((_, j) => j !== i))}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <Input
                      value={faq.question}
                      onChange={e => setProductFaqs(prev => prev.map((f, j) => j === i ? { ...f, question: e.target.value } : f))}
                      placeholder="Ex: Qual o prazo de entrega deste produto?"
                    />
                    <Textarea
                      value={faq.answer}
                      onChange={e => setProductFaqs(prev => prev.map((f, j) => j === i ? { ...f, answer: e.target.value } : f))}
                      placeholder="Resposta detalhada..."
                      rows={2}
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setProductFaqs(prev => [...prev, { question: "", answer: "" }])}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar Pergunta
                </Button>
              </div>

              <div className="bg-primary/5 rounded-2xl p-6 border border-primary/20 space-y-6">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                         <Layers className="w-5 h-5 text-primary" /> Variações Hierárquicas (Cores › Lista de Preços)
                     </h3>
                     <Button type="button" variant="outline" size="sm" onClick={() => setGroupedVariants(prev => [...prev, { id: generateUUID(), name: "4x0", options: [{ name: "500 UN", price: 0 }] }])}>
                        <Plus className="w-3 h-3 mr-1" /> Adicionar Cor/Grupo
                     </Button>
                  </div>

                  {groupedVariants.length > 0 ? (
                    <div className="space-y-6">
                       {groupedVariants.map((group, groupIdx) => (
                         <div key={group.id} className="bg-background rounded-xl p-4 border border-border space-y-4 shadow-sm relative">
                            <button type="button" className="absolute top-4 right-4 text-destructive hover:scale-110 transition-transform" onClick={() => setGroupedVariants(prev => prev.filter(g => g.id !== group.id))}>
                               <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-3 w-3/4">
                               <Palette className="w-4 h-4 text-primary" />
                               <Input value={group.name} onChange={e => setGroupedVariants(prev => prev.map(g => g.id === group.id ? { ...g, name: e.target.value } : g))} placeholder="Nome do Grupo (ex: 4x0, Couche 300g...)" className="font-bold border-primary/20" />
                            </div>
                            
                            <div className="space-y-2 ml-7">
                               <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase mb-2">Lista de Preços (Quantidades)</p>
                               {group.options.map((opt, optIdx) => (
                                 <div key={optIdx} className="flex gap-3 items-center group">
                                    <Input value={opt.name} onChange={e => {
                                      const next = [...group.options];
                                      next[optIdx].name = e.target.value;
                                      setGroupedVariants(prev => prev.map(g => g.id === group.id ? { ...g, options: next } : g));
                                    }} placeholder="500 UN" className="h-9 text-xs" />
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
                                      <Input type="number" step="0.01" value={opt.price} onChange={e => {
                                        const next = [...group.options];
                                        next[optIdx].price = parseFloat(e.target.value) || 0;
                                        setGroupedVariants(prev => prev.map(g => g.id === group.id ? { ...g, options: next } : g));
                                      }} className="h-9 text-xs pl-8 w-28" />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                                      const next = group.options.filter((_, i) => i !== optIdx);
                                      setGroupedVariants(prev => prev.map(g => g.id === group.id ? { ...g, options: next } : g));
                                    }}>
                                       <Trash2 className="w-3 h-3" />
                                    </Button>
                                 </div>
                               ))}
                               <Button type="button" variant="ghost" size="sm" className="h-8 text-[11px] text-primary" onClick={() => {
                                  const next = [...group.options, { name: "", price: 0 }];
                                  setGroupedVariants(prev => prev.map(g => g.id === group.id ? { ...g, options: next } : g));
                               }}>
                                  <Plus className="w-3 h-3 mr-1" /> Add Opção de Preço
                               </Button>
                            </div>
                         </div>
                       ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center border-2 border-dashed border-border rounded-xl">
                       <Package className="w-10 h-10 mx-auto text-muted-foreground opacity-20 mb-3" />
                       <p className="text-sm text-muted-foreground">Nenhuma variação hierárquica cadastrada.</p>
                       <p className="text-[10px] text-muted-foreground/60 max-w-[200px] mx-auto mt-1">Use esta seção para cadastrar preços diferentes por grupo (ex: Cores).</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t border-border/50">
                     <p className="text-[10px] text-muted-foreground italic max-w-sm">Dica: Ao usar variações hierárquicas, o sistema ignora o "Configurador Dinâmico" padrão abaixo.</p>
                  </div>
              </div>

              <div className="mt-8 opacity-50 pointer-events-none grayscale">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                         <Sparkles className="w-5 h-5 text-primary" /> Configurador Dinâmico (Desabilitado ao usar Hierarquia)
                     </h3>
                  </div>

                <div className="flex gap-2 mb-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setConfigSchema(prev => [...prev, { id: generateUUID(), label: "Novo Atributo", type: "select", ui_type: "pills", options: [{ name: "Opção 1", price_adj: 0 }] }])}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Atributo (Seleção)
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setConfigSchema(prev => [...prev, { id: generateUUID(), label: "Adicional", type: "counter", unit_price: 1.0 }])}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Adicional (Contador)
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground -mt-3 mb-4">
                  Defina os campos que o cliente poderá selecionar.
                </p>

                <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4 flex gap-3 items-start">
                  <Calculator className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="text-[11px] text-primary/80 leading-relaxed">
                    <strong className="text-primary font-bold uppercase tracking-wider">Lógica Aditiva:</strong> O preço final será a soma de todos os acréscimos selecionados. Dica: Se quiser que a primeira opção defina o preço base (ex: 500 un), deixe o preço principal do produto como 0.
                  </div>
                </div>

                <div className="space-y-4">
                    {configSchema.length === 0 ? (
                      <div className="text-center py-6 border-2 border-dashed border-primary/10 rounded-xl">
                        <Package className="w-8 h-8 text-primary/20 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground italic">Nenhum campo personalizado definido.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(configSchema || []).map((item, idx) => (
                          <div key={item.id} className="bg-background rounded-xl p-4 border border-border shadow-sm group">
                            <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="flex flex-col gap-0.5">
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5 text-muted-foreground hover:text-primary disabled:opacity-30"
                                    disabled={idx === 0}
                                    onClick={() => {
                                      const next = [...configSchema];
                                      [next[idx-1], next[idx]] = [next[idx], next[idx-1]];
                                      setConfigSchema(next);
                                    }}
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5 text-muted-foreground hover:text-primary disabled:opacity-30"
                                    disabled={idx === configSchema.length - 1}
                                    onClick={() => {
                                      const next = [...configSchema];
                                      const temp = next[idx];
                                      next[idx] = next[idx+1];
                                      next[idx+1] = temp;
                                      setConfigSchema(next);
                                    }}
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                                <Input 
                                  value={item.label} 
                                  onChange={e => setConfigSchema(prev => prev.map((it, i) => i === idx ? { ...it, label: e.target.value } : it))}
                                  className="w-48 font-bold text-sm bg-secondary/30 h-8"
                                  placeholder="Ex: Material"
                                />
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 py-0.5 bg-muted rounded">
                                  {item.type === "select" ? (
                                    <select 
                                      value={item.ui_type || "select"}
                                      onChange={e => setConfigSchema(prev => prev.map((it, i) => i === idx ? { ...it, ui_type: e.target.value } : it))}
                                      className="text-[10px] font-black uppercase tracking-widest text-primary px-2 py-0.5 bg-primary/10 rounded border-none outline-none cursor-pointer"
                                    >
                                      <option value="select">Lista</option>
                                      <option value="pills">Botões</option>
                                      <option value="checkbox">Multi-Seleção</option>
                                    </select>
                                  ) : (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 py-0.5 bg-muted rounded">
                                      Contador
                                    </span>
                                  )}
                                </span>
                              </div>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setConfigSchema(prev => prev.filter((_, i) => i !== idx))}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>

                            {item.type === "select" ? (
                              <div className="space-y-2">
                                {(item.options || []).map((opt: any, optIdx: number) => (
                                  <div key={optIdx} className="flex gap-2 items-center bg-secondary/10 p-1.5 rounded-lg border border-border/30">
                                    <div className="flex flex-col">
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-4 w-4 disabled:opacity-20"
                                        disabled={optIdx === 0}
                                        onClick={() => {
                                          const next = [...configSchema];
                                          const opts = [...next[idx].options];
                                          [opts[optIdx-1], opts[optIdx]] = [opts[optIdx], opts[optIdx-1]];
                                          next[idx].options = opts;
                                          setConfigSchema(next);
                                        }}
                                      >
                                        <ChevronUp className="w-2.5 h-2.5" />
                                      </Button>
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-4 w-4 disabled:opacity-20"
                                        disabled={optIdx === item.options.length - 1}
                                        onClick={() => {
                                          const next = [...configSchema];
                                          const opts = [...next[idx].options];
                                          [opts[optIdx+1], opts[optIdx]] = [opts[optIdx], opts[optIdx+1]];
                                          next[idx].options = opts;
                                          setConfigSchema(next);
                                        }}
                                      >
                                        <ChevronDown className="w-2.5 h-2.5" />
                                      </Button>
                                    </div>
                                    <Input 
                                      value={opt.name} 
                                      onChange={e => {
                                        const next = [...configSchema];
                                        next[idx].options[optIdx].name = e.target.value;
                                        setConfigSchema(next);
                                      }}
                                      placeholder="Nome da opção"
                                      className="flex-1 h-8 text-xs bg-background"
                                    />
                                    <div className="flex items-center gap-2 flex-1">
                                      <div className="relative flex-1 group/cost">
                                        <span className="absolute -top-3.5 left-1 text-[9px] text-muted-foreground font-bold uppercase tracking-tighter opacity-0 group-focus-within/cost:opacity-100 group-hover/cost:opacity-100 transition-opacity">Custo (R$)</span>
                                        <Input 
                                            type="number" 
                                            step="0.01"
                                            value={opt.cost_adj || ""} 
                                            onChange={e => {
                                                const next = [...configSchema];
                                                const cost = parseFloat(e.target.value) || 0;
                                                next[idx].options[optIdx].cost_adj = cost;
                                                if (cost > 0) {
                                                    next[idx].options[optIdx].price_adj = calculatePriceFromCost(cost);
                                                }
                                                setConfigSchema(next);
                                            }}
                                            placeholder="Custo"
                                            className="h-8 text-xs bg-destructive/5 border-destructive/20 focus:border-destructive/40"
                                        />
                                      </div>
                                      <div className="relative flex-1 group/price">
                                        <span className="absolute -top-3.5 left-1 text-[9px] text-primary font-bold uppercase tracking-tighter opacity-0 group-focus-within/price:opacity-100 group-hover/price:opacity-100 transition-opacity">Preço (R$)</span>
                                        <Input 
                                            type="number" 
                                            step="0.01"
                                            value={opt.price_adj} 
                                            onChange={e => {
                                                const next = [...configSchema];
                                                next[idx].options[optIdx].price_adj = parseFloat(e.target.value) || 0;
                                                setConfigSchema(next);
                                            }}
                                            placeholder="Venda"
                                            className="h-8 text-xs bg-primary/5 border-primary/20 focus:border-primary/40 font-bold"
                                        />
                                      </div>
                                      {opt.cost_adj > 0 && opt.price_adj > 0 && (
                                        <div className="text-[9px] font-black text-success min-w-[30px] text-right">
                                            +{(((opt.price_adj - opt.cost_adj) / opt.cost_adj) * 100).toFixed(0)}%
                                        </div>
                                      )}
                                    </div>
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 text-destructive"
                                      onClick={() => {
                                        const next = [...configSchema];
                                        next[idx].options = next[idx].options.filter((_: any, i: number) => i !== optIdx);
                                        setConfigSchema(next);
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-[10px] h-7 px-2 text-primary"
                                  onClick={() => {
                                    const next = [...configSchema];
                                    if (!next[idx].options) next[idx].options = [];
                                    next[idx].options.push({ name: "Nova Opção", price_adj: 0 });
                                    setConfigSchema(next);
                                  }}
                                >
                                  <Plus className="w-3 h-3 mr-1" /> Adicionar Opção
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-4">
                                <div className="flex-1">
                                  <label className="text-[10px] text-muted-foreground uppercase font-bold mb-1 block">Valor por Unidade (R$)</label>
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    value={item.unit_price} 
                                    onChange={e => setConfigSchema(prev => prev.map((it, i) => i === idx ? { ...it, unit_price: parseFloat(e.target.value) || 0 } : it))}
                                    className="h-8 text-xs bg-secondary/30"
                                  />
                                </div>
                                <div className="w-1/2 flex items-center gap-2 pt-4">
                                   <HelpCircle className="w-4 h-4 text-muted-foreground" />
                                   <span className="text-[10px] text-muted-foreground italic">Pede a quantidade ao cliente na loja.</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
              </div>

              {savedProductId ? (
                <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                  <ProductImageUploader productId={savedProductId} />
                </div>
              ) : (
                <div className="bg-secondary/50 rounded-xl p-4 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-highlight" /> Imagens do Produto ({pendingFiles.length}/5)
                    </label>
                    {pendingFiles.length < 5 && (
                      <label className="cursor-pointer">
                        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={handlePendingFiles} />
                        <Button type="button" variant="outline" size="sm" className="pointer-events-none">
                          <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                        </Button>
                      </label>
                    )}
                  </div>
                  {pendingPreviews.length === 0 ? (
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Adicione imagens antes de salvar o produto.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-3">
                      {pendingPreviews.map((url, i) => (
                        <div key={i} className="relative group rounded-xl overflow-hidden border border-border aspect-square">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removePendingFile(i)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {savedProductId && (
                <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                  <RelatedProductsManager productId={savedProductId} />
                </div>
              )}

              <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                ) : editing ? (
                  "Salvar Alterações"
                ) : (
                  "Criar Produto"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-1">
            <TabsList className="bg-transparent h-auto p-0 gap-6">
                <TabsTrigger value="manage" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 text-sm font-bold uppercase tracking-widest">
                    Gerenciar Produtos
                </TabsTrigger>
                <TabsTrigger value="import" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-highlight data-[state=active]:border-b-2 data-[state=active]:border-highlight rounded-none px-0 py-2 text-sm font-bold uppercase tracking-widest">
                    <Upload className="w-4 h-4 mr-2" /> Migração PDF
                </TabsTrigger>
            </TabsList>

            {activeTab === "manage" && (
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                        <input type="checkbox" checked={groupByCategory} onChange={e => setGroupByCategory(e.target.checked)} className="rounded border-border text-primary focus:ring-primary" />
                        Agrupar por Categoria
                    </label>
                </div>
            )}
        </div>

        <TabsContent value="manage" className="space-y-6 m-0 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou código..." value={adminSearch} onChange={e => { setAdminSearch(e.target.value); setCurrentPage(0); }} className="pl-10 h-11" />
                </div>
                <select value={adminFilterColor} onChange={e => { setAdminFilterColor(e.target.value); setCurrentPage(0); }} className="rounded-lg border border-input bg-background px-3 py-2 text-sm h-11">
                    <option value="">Todas as cores</option>
                    <option value="1x0">1x0</option><option value="1x1">1x1</option>
                    <option value="4x0">4x0</option><option value="4x1">4x1</option><option value="4x4">4x4</option>
                </select>
            </div>

            {selectedProducts.size > 0 && (
                <div className="flex items-center gap-3 bg-primary/5 p-3 rounded-lg border border-primary/20 animate-in fade-in zoom-in-95">
                    <span className="text-sm font-medium text-primary ml-2">{selectedProducts.size} selecionados</span>
                    <div className="flex gap-2 ml-auto">
                        <Button size="sm" variant="outline" onClick={() => setSelectedProducts(new Set())}>Cancelar</Button>
                        <Button size="sm" onClick={async () => { setProcessingBulk(true); await supabase.from("products").update({ is_active: true }).in("id", Array.from(selectedProducts)); toast({ title: "Ativados!" }); setSelectedProducts(new Set()); load(); setProcessingBulk(false); }}>Ativar</Button>
                        <Button size="sm" variant="destructive" onClick={async () => { if (!confirm("Excluir definitivamente?")) return; setProcessingBulk(true); await supabase.from("products").delete().in("id", Array.from(selectedProducts)); toast({ title: "Excluídos!" }); setSelectedProducts(new Set()); load(); setProcessingBulk(false); }}>Excluir</Button>
                    </div>
                </div>
            )}

            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                {!groupByCategory ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/30 border-b border-border">
                                <tr>
                                    <th className="p-4 w-10"><input type="checkbox" onChange={e => setSelectedProducts(e.target.checked ? new Set(filteredProducts.map(p => p.id)) : new Set())} /></th>
                                    <th className="text-left p-4 font-bold text-muted-foreground uppercase text-[10px] tracking-widest">Código</th>
                                    <th className="text-left p-4 font-bold text-muted-foreground uppercase text-[10px] tracking-widest">Produto</th>
                                    <th className="text-left p-4 font-bold text-muted-foreground uppercase text-[10px] tracking-widest">Categoria</th>
                                    <th className="text-right p-4 font-bold text-muted-foreground uppercase text-[10px] tracking-widest">Venda</th>
                                    <th className="text-center p-4 font-bold text-muted-foreground uppercase text-[10px] tracking-widest">Status</th>
                                    <th className="text-right p-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE).map(p => (
                                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                        <td className="p-4 text-center"><input type="checkbox" checked={selectedProducts.has(p.id)} onChange={() => { const n = new Set(selectedProducts); n.has(p.id) ? n.delete(p.id) : n.add(p.id); setSelectedProducts(n); }} /></td>
                                        <td className="p-4 font-mono text-xs text-muted-foreground">{p.product_code || "—"}</td>
                                        <td className="p-4 font-bold">{p.name} {p.is_featured && <span className="text-[9px] bg-warning/20 text-warning px-1.5 py-0.5 rounded ml-2">HOT</span>}</td>
                                        <td className="p-4 text-xs text-muted-foreground">{p.categories?.name || "—"}</td>
                                        <td className="p-4 text-right font-black">R$ {Number(p.price).toFixed(2)}</td>
                                        <td className="p-4 text-center">
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${p.is_active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                                                {p.is_active ? "Ativo" : "Inativo"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(p)}><Copy className="w-4 h-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(p)}><Pencil className="w-4 h-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4" /></Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <Accordion type="multiple" defaultValue={Object.keys(groupedProducts || {})} className="w-full">
                        {Object.entries(groupedProducts || {}).map(([catName, items]) => (
                            <AccordionItem key={catName} value={catName} className="border-b border-border last:border-0">
                                <AccordionTrigger className="hover:no-underline px-6 py-4 bg-muted/20 group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                            <FolderTree className="w-4 h-4" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-display font-black text-sm uppercase tracking-tight">{catName}</p>
                                            <p className="text-[10px] text-muted-foreground font-bold">{items.length} PRODUTOS NESTE GRUPO</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/10 border-b border-border/50">
                                                <tr>
                                                    <th className="p-4 w-10">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={items.length > 0 && items.every(p => selectedProducts.has(p.id))}
                                                            onChange={e => {
                                                                const n = new Set(selectedProducts);
                                                                if (e.target.checked) items.forEach(p => n.add(p.id));
                                                                else items.forEach(p => n.delete(p.id));
                                                                setSelectedProducts(n);
                                                            }} 
                                                        />
                                                    </th>
                                                    <th className="text-left p-4 font-bold text-muted-foreground uppercase text-[10px] tracking-widest" colSpan={5}>
                                                        Selecionar todos ({items.length}) em {catName}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map(p => (
                                                    <tr key={p.id} className="border-t border-border/30 hover:bg-muted/10 transition-colors">
                                                        <td className="p-4 w-10"><input type="checkbox" checked={selectedProducts.has(p.id)} onChange={() => { const n = new Set(selectedProducts); n.has(p.id) ? n.delete(p.id) : n.add(p.id); setSelectedProducts(n); }} /></td>
                                                        <td className="p-4 w-32 font-mono text-[10px] text-muted-foreground">{p.product_code || "—"}</td>
                                                        <td className="p-4 font-bold text-foreground">
                                                            {p.name}
                                                            <div className="flex gap-1 mt-1">
                                                                {p.is_featured && <span className="text-[8px] bg-warning/20 text-warning px-1 py-0.5 rounded font-black uppercase">Destaque</span>}
                                                                {!p.is_active && <span className="text-[8px] bg-destructive/20 text-destructive px-1 py-0.5 rounded font-black uppercase">Inativo</span>}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-xs text-muted-foreground">{p.color_mode || "—"}</td>
                                                        <td className="p-4 text-right font-black text-primary">R$ {Number(p.price).toFixed(2)}</td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(p)}><Copy className="w-3.5 h-3.5" /></Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}

                {filteredProducts.length > ITEMS_PER_PAGE && !groupByCategory && (
                    <div className="p-4 bg-muted/10 border-t border-border flex justify-between items-center">
                         <span className="text-xs text-muted-foreground">Mostrando {currentPage * ITEMS_PER_PAGE + 1}–{Math.min((currentPage + 1) * ITEMS_PER_PAGE, filteredProducts.length)} de {filteredProducts.length}</span>
                         <div className="flex gap-2">
                             <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>Anterior</Button>
                             <Button variant="outline" size="sm" disabled={(currentPage + 1) * ITEMS_PER_PAGE >= filteredProducts.length} onClick={() => setCurrentPage(p => p + 1)}>Próximo</Button>
                         </div>
                    </div>
                )}
            </div>
        </TabsContent>

        <TabsContent value="import" className="m-0 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-highlight/10 flex items-center justify-center text-highlight shadow-glow-sm">
                                <Layers className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-display font-black text-xl tracking-tight uppercase">Extrator de PDF</h2>
                                <p className="text-xs text-muted-foreground">Converta tabelas brutas em comandos SQL</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">1. Nome da Categoria Macro</label>
                            <Input value={importTargetNode} onChange={e => setImportTargetNode(e.target.value.toUpperCase())} placeholder="EX: ADESIVOS, BANNERS, AGENDAS..." className="h-12 font-bold" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">2. Conteúdo do PDF (Copiar/Colar)</label>
                            <Textarea value={importPdfText} onChange={e => setImportPdfText(e.target.value)} placeholder="Cole aqui as linhas da tabela...&#10;Ex: ADCASOV05 ADESIVOS ADESIVO... R$ 34,99" className="h-64 font-mono text-[11px] bg-muted/20 border-border focus:bg-background transition-colors" />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border">
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-5 h-5 text-primary" />
                                <div>
                                    <p className="text-xs font-bold">Enriquecer com IA</p>
                                    <p className="text-[10px] text-muted-foreground">Gera descritivo e metadados para cada produto</p>
                                </div>
                            </div>
                            <button onClick={() => setAiEnabledForImport(!aiEnabledForImport)} className={`w-10 h-5 rounded-full relative transition-colors ${aiEnabledForImport ? "bg-primary" : "bg-muted-foreground/30"}`}>
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${aiEnabledForImport ? "left-5.5" : "left-0.5"}`} />
                            </button>
                        </div>

                        <div className="bg-secondary/30 rounded-2xl p-5 border border-border space-y-4">
                            <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                <Settings className="w-3 h-3" /> Configuração de Opções
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <label className="flex items-center justify-between gap-3 cursor-pointer group">
                                    <span className="text-[11px] font-bold text-foreground/80 group-hover:text-primary transition-colors">Separar Cores e Qtd</span>
                                    <button onClick={() => setImportSeparateAttributes(!importSeparateAttributes)} className={`w-8 h-4 rounded-full relative transition-colors ${importSeparateAttributes ? "bg-highlight" : "bg-muted-foreground/20"}`}>
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${importSeparateAttributes ? "left-4.5" : "left-0.5"}`} />
                                    </button>
                                </label>

                                <label className="flex items-center justify-between gap-3 cursor-pointer group">
                                    <span className="text-[11px] font-bold text-foreground/80 group-hover:text-primary transition-colors">Exibir Tamanho</span>
                                    <button onClick={() => setImportShowSize(!importShowSize)} className={`w-8 h-4 rounded-full relative transition-colors ${importShowSize ? "bg-highlight" : "bg-muted-foreground/20"}`}>
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${importShowSize ? "left-4.5" : "left-0.5"}`} />
                                    </button>
                                </label>

                                <label className="flex items-center justify-between gap-3 cursor-pointer group">
                                    <span className="text-[11px] font-bold text-foreground/80 group-hover:text-primary transition-colors">Exibir Cores no Nome</span>
                                    <button onClick={() => setImportShowCores(!importShowCores)} className={`w-8 h-4 rounded-full relative transition-colors ${importShowCores ? "bg-highlight" : "bg-muted-foreground/20"}`}>
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${importShowCores ? "left-4.5" : "left-0.5"}`} />
                                    </button>
                                </label>

                                <label className="flex items-center justify-between gap-3 cursor-pointer group">
                                    <span className="text-[11px] font-bold text-foreground/80 group-hover:text-primary transition-colors">Exibir Papel/Peso</span>
                                    <button onClick={() => setImportShowWeight(!importShowWeight)} className={`w-8 h-4 rounded-full relative transition-colors ${importShowWeight ? "bg-highlight" : "bg-muted-foreground/20"}`}>
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${importShowWeight ? "left-4.5" : "left-0.5"}`} />
                                    </button>
                                </label>
                            </div>

                            {importSeparateAttributes && (
                                <div className="mt-2 p-2 bg-highlight/5 border border-highlight/20 rounded-lg">
                                    <p className="text-[9px] text-highlight/80 flex items-center gap-1.5 leading-tight italic">
                                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                        Nota: Atributos separados usam lógica aditiva. O valor da cor será calculado com base na tiragem inicial.
                                    </p>
                                </div>
                            )}
                        </div>

                        <Button variant="hero" className="w-full h-14 bg-highlight hover:bg-highlight/90 text-white font-black uppercase tracking-widest text-sm shadow-glow-sm" onClick={handleProcessImport} disabled={processingImport || !importPdfText}>
                            {processingImport ? <><Loader2 className="w-5 h-5 mr-3 animate-spin" /> Processando Dados...</> : <><Save className="w-5 h-5 mr-3" /> Gerar Script de Importação</>}
                        </Button>
                    </div>

                    <div className="bg-secondary/50 rounded-2xl p-6 border border-border">
                        <h3 className="font-display font-bold text-sm mb-3 text-foreground uppercase tracking-widest">Dicas do Sistema</h3>
                        <ul className="text-xs text-muted-foreground space-y-3 leading-relaxed">
                            <li className="flex gap-2">
                                <span className="text-highlight font-black">•</span>
                                <div><strong>Lógica de Preço:</strong> Aplicamos automaticamente 80% de margem sobre o custo + R$ 8,90 de frete fixo.</div>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-highlight font-black">•</span>
                                <div><strong>Formatação:</strong> O sistema detecta automaticamente variações de tamanho e quantidade.</div>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-highlight font-black">•</span>
                                <div><strong>Segurança:</strong> Todos os produtos são criados como "Inativos" por padrão para você validar antes de publicar.</div>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                         <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">3. Resultado SQL (Script Final)</h3>
                         {generatedSql && (
                             <Button variant="ghost" size="sm" className="h-7 text-[9px] uppercase font-black" onClick={() => { navigator.clipboard.writeText(generatedSql); toast({ title: "Copiado!" }); }}>
                                <Copy className="w-3 h-3 mr-1.5" /> Copiar SQL
                             </Button>
                         )}
                    </div>
                    <div className="relative">
                        <Textarea readOnly value={generatedSql} placeholder="O script gerado aparecerá aqui..." className="h-[600px] font-mono text-[10px] leading-relaxed bg-black/90 text-success border-border p-6 shadow-2xl resize-none" />
                        {!generatedSql && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground opacity-50">
                                <Loader2 className="w-10 h-10 mb-4 animate-pulse opacity-10" />
                                <p className="text-xs uppercase font-black tracking-widest">Aguardando Processamento</p>
                            </div>
                        )}
                    </div>
                    {generatedSql && (
                        <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl flex gap-3">
                            <HelpCircle className="w-5 h-5 text-warning shrink-0" />
                            <p className="text-[11px] text-warning/90 leading-relaxed font-medium">
                                <strong>Importante:</strong> Vá até o Supabase SQL Editor, abra uma nova aba, cole este script e execute. Ele cuidará da criação de categorias e vinculará os produtos corretamente.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminProdutos;
