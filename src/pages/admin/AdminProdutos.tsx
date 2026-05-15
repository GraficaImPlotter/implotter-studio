import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Ruler,
  Package,
  FolderTree,
  Tag,
  Search,
  HelpCircle,
  DollarSign,
  Calculator,
  Sparkles,
  Loader2,
  Save,
  Settings,
  Layers,
  Palette,
  Copy,
  Image as ImageIcon,
  Clock,
  CreditCard,
  Eye,
} from "lucide-react";
import {
  generateSlug,
  generateMetaTitle,
  generateMetaDescription,
} from "@/lib/slug";
import { FRETE_DILUIDO } from "@/lib/price-utils";
import RichTextEditor from "@/components/admin/RichTextEditor";
import ProductImageUploader from "@/components/admin/ProductImageUploader";
import RelatedProductsManager from "@/components/admin/RelatedProductsManager";
import { useSettings } from "@/hooks/use-settings";
import { generateUUID } from "@/lib/uuid";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface CatalogNode {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  is_active: boolean;
  markup?: number;
}

const getNodePath = (nodes: CatalogNode[], nodeId: string): string => {
  const parts: string[] = [];
  let current = nodes.find((n) => n.id === nodeId);
  let depth = 0;
  const MAX_DEPTH = 10;

  while (current && depth < MAX_DEPTH) {
    parts.unshift(current.name);
    if (!current.parent_id) break;
    const parent = nodes.find((n) => n.id === current?.parent_id);
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
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [productName, setProductName] = useState("");
  const [slug, setSlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [configSchema, setConfigSchema] = useState<any[]>([]);
  const [onSale, setOnSale] = useState(false);
  const [fullDescription, setFullDescription] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [savedProductId, setSavedProductId] = useState<string | null>(null);
  const [productFaqs, setProductFaqs] = useState<
    { id?: string; question: string; answer: string }[]
  >([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [selectedFinishingIds, setSelectedFinishingIds] = useState<string[]>(
    [],
  );
  const [isLoadingFinishings, setIsLoadingFinishings] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [unitCost, setUnitCost] = useState(0);
  const [categoryMarkup, setCategoryMarkup] = useState(2.1);
  const [activeTab, setActiveTab] = useState("manage");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<
    "price" | "status" | "category" | null
  >(null);
  const [bulkValue, setBulkValue] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(true);

  const [groupedVariants, setGroupedVariants] = useState<
    {
      id: string;
      name: string;
      options: { name: string; cost: number; price: number }[];
    }[]
  >([]);
  const [sqmPresets, setSqmPresets] = useState<
    { id: string; name: string; width: number; height: number }[]
  >([]);
  const [pricingType, setPricingType] = useState("fixed");
  const [estimatedDays, setEstimatedDays] = useState(1);

  const totalCost = unitCost + FRETE_DILUIDO;
  const suggestedPrice = totalCost * categoryMarkup;

  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name), subcategories(name)")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: catalogNodes = [] } = useQuery({
    queryKey: ["catalog-nodes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_nodes")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data || []) as CatalogNode[];
    },
  });

  const { data: allFinishings = [] } = useQuery({
    queryKey: ["finishings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finishings")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const load = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  }, [queryClient]);

  const sortedNodePaths = useMemo(() => {
    return catalogNodes
      .map((n) => ({ id: n.id, path: getNodePath(catalogNodes, n.id) }))
      .sort((a, b) => a.path.localeCompare(b.path, "pt-BR"));
  }, [catalogNodes]);

  const filteredProducts = useMemo(() => {
    return (products as any[]).filter((p) => {
      const q = adminSearch.toLowerCase();
      const matchesSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        (p.product_code && p.product_code.toLowerCase().includes(q));
      const matchesColor =
        !adminFilterColor || p.color_mode === adminFilterColor;
      return matchesSearch && matchesColor;
    });
  }, [products, adminSearch, adminFilterColor]);

  const handleBulkUpdate = async () => {
    if (!bulkAction || !bulkValue || selectedIds.length === 0) return;
    setBulkProcessing(true);
    try {
      const updates: any = {};
      if (bulkAction === "status") {
        updates.is_active = bulkValue === "active";
      } else if (bulkAction === "category") {
        updates.catalog_node_id = bulkValue;
      } else if (bulkAction === "price") {
        const factor = 1 + Number(bulkValue) / 100;
      }

      if (bulkAction !== "price") {
        const { error } = await supabase
          .from("products")
          .update(updates)
          .in("id", selectedIds);
        if (error) throw error;
      } else {
        const { data: currentProds } = await supabase
          .from("products")
          .select("id, price")
          .in("id", selectedIds);
        if (currentProds) {
          const factor = 1 + Number(bulkValue) / 100;
          for (const p of currentProds) {
            await supabase
              .from("products")
              .update({
                price: Math.round(Number(p.price) * factor * 100) / 100,
              })
              .eq("id", p.id);
          }
        }
      }

      toast({ title: `${selectedIds.length} produtos atualizados!` });
      setSelectedIds([]);
      setBulkDialogOpen(false);
      load();
    } catch (e: any) {
      toast({
        title: "Erro na atualização em massa",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const selectAllInGroup = (ids: string[]) => {
    const allSelected = ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const groupedProducts = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredProducts.forEach((p) => {
      const nodePath = p.catalog_node_id
        ? sortedNodePaths.find((n) => n.id === p.catalog_node_id)?.path ||
          "Sem Categoria"
        : p.categories?.name || "Sem Categoria";
      if (!groups[nodePath]) groups[nodePath] = [];
      groups[nodePath].push(p);
    });
    return Object.fromEntries(
      Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, "pt-BR")),
    );
  }, [filteredProducts, sortedNodePaths]);

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
      toast({
        title: "Digite o nome do produto primeiro",
        variant: "destructive",
      });
      return;
    }
    setGeneratingAI(true);
    try {
      const catList = catalogNodes.map((n) => ({
        id: n.id,
        name: n.name,
        path: getNodePath(catalogNodes, n.id),
      }));

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-product-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            productName: productName.trim(),
            categories: catList,
          }),
        },
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro ao gerar conteúdo");

      if (data.short_description && formRef.current) {
        const sdInput = formRef.current.querySelector<HTMLInputElement>(
          '[name="short_description"]',
        );
        if (sdInput) {
          sdInput.value = data.short_description;
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value",
          )?.set;
          nativeInputValueSetter?.call(sdInput, data.short_description);
          sdInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
      if (data.full_description) setFullDescription(data.full_description);
      if (data.specifications) setSpecifications(data.specifications);
      if (data.keywords && formRef.current) {
        const kwInput =
          formRef.current.querySelector<HTMLInputElement>('[name="keywords"]');
        if (kwInput) {
          kwInput.value = data.keywords;
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value",
          )?.set;
          nativeInputValueSetter?.call(kwInput, data.keywords);
          kwInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }

      if (data.meta_title) setMetaTitle(data.meta_title);
      if (data.short_description) setMetaDesc(data.short_description);

      if (data.category_suggestion && formRef.current) {
        const catSelect = formRef.current.querySelector<HTMLSelectElement>(
          '[name="catalog_node_id"]',
        );
        if (catSelect) {
          const suggested = catList.find(
            (c) =>
              c.id === data.category_suggestion ||
              c.name === data.category_suggestion ||
              data.category_suggestion.includes(c.name),
          );
          if (suggested) {
            catSelect.value = suggested.id;
            catSelect.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
      }

      toast({
        title: "Conteúdo gerado com sucesso!",
        description: "Revise e ajuste conforme necessário.",
      });
    } catch (e: any) {
      toast({
        title: "Erro ao gerar conteúdo",
        description: e.message,
        variant: "destructive",
      });
    }
    setGeneratingAI(false);
  };

  const handleGenerateWithAIImage = async () => {
    if (!productName.trim() || !savedProductId) {
      toast({
        title: "Salve o produto e dê um nome a ele primeiro",
        variant: "destructive",
      });
      return;
    }
    setGeneratingImage(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-product-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ productName: productName.trim() }),
        },
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro ao gerar imagem");

      // Baixar a imagem
      const imgResp = await fetch(data.imageUrl);
      const blob = await imgResp.blob();
      const safeName = `ai-gen-${Date.now()}.png`;
      const path = `${savedProductId}/${safeName}`;

      // Upload para Storage
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, blob, {
          contentType: "image/png",
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);

      // Salvar no banco vinculando ao produto
      const { error: dbError } = await supabase.from("product_images").insert({
        product_id: savedProductId,
        image_url: urlData.publicUrl,
        sort_order: 10,
      });
      if (dbError) throw dbError;

      toast({
        title: "Imagem gerada com sucesso!",
        description: "A foto ja foi adicionada a galeria do produto.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      // Forçar refresh das imagens se necessário
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro ao gerar imagem",
        description: e.message,
        variant: "destructive",
      });
    }
    setGeneratingImage(false);
  };

  const loadFaqs = async (productId: string) => {
    const { data } = await supabase
      .from("faq_items")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");
    setProductFaqs(
      (data ?? []).map((f) => ({
        id: f.id,
        question: f.question,
        answer: f.answer,
      })),
    );
  };

  const openForm = (product?: any) => {
    setEditing(product || null);
    setProductName(product?.name || "");
    setSlug(product?.slug || "");
    setMetaTitle(product?.meta_title || "");
    setMetaDesc(product?.meta_description || "");
    setOnSale(!!product?.sale_price);
    setFullDescription(product?.full_description || "");
    setSpecifications(product?.specifications || "");
    setConfigSchema(
      Array.isArray(product?.configuration_schema)
        ? product.configuration_schema
        : [],
    );
    setSavedProductId(product?.id || null);
    setProductFaqs([]);
    setPendingFiles([]);
    setPendingPreviews([]);
    setSelectedFinishingIds([]);

    setUnitCost(Number(product?.unit_cost) || 0);
    setPricingType(product?.pricing_type || "fixed");
    setEstimatedDays(product?.estimated_days || 1);

    if (product?.catalog_node_id) {
      supabase
        .from("catalog_nodes")
        .select("markup")
        .eq("id", product.catalog_node_id)
        .single()
        .then(({ data }) => {
          if (data?.markup) setCategoryMarkup(Number(data.markup));
        });
    } else {
      setCategoryMarkup(2.1);
    }

    setSelectedFinishingIds([]);
    setIsLoadingFinishings(true);

    if (product) {
      setSavedProductId(product.id);
      loadFaqs(product.id);
      // Load current finishings for this product
      supabase
        .from("product_finishings")
        .select("finishing_id")
        .eq("product_id", product.id)
        .then(({ data }) => {
          setSelectedFinishingIds((data ?? []).map((r: any) => r.finishing_id));
          setIsLoadingFinishings(false);
        });
    } else {
      setSavedProductId(null);
      setIsLoadingFinishings(false);
    }

    setGroupedVariants([]);
    if (Array.isArray(product?.configuration_schema)) {
      const hierarchy = (product.configuration_schema as any[]).find(
        (it) => it.ui_type === "hierarchy",
      );
      if (hierarchy && hierarchy.groups) {
        setGroupedVariants(hierarchy.groups);
      }
    }

    setSqmPresets([]);
    if (Array.isArray(product?.configuration_schema)) {
      const presetsItem = (product.configuration_schema as any[]).find(
        (it) => it.ui_type === "sqm_presets",
      );
      if (presetsItem && presetsItem.options) {
        setSqmPresets(
          presetsItem.options.map((opt: any) => ({
            id: generateUUID(),
            name: opt.name,
            width: opt.width,
            height: opt.height,
          })),
        );
      }
    }

    setOpen(true);
  };

  const calculateCommercialRounding = (val: number) => {
    const floor = Math.floor(val);
    const candidate = floor + 0.9;
    return candidate >= val ? candidate : floor + 1.9;
  };

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const handlePendingFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => {
      if (!ALLOWED_TYPES.includes(f.type)) {
        toast({
          title: `Tipo não permitido: ${f.name}`,
          variant: "destructive",
        });
        return false;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast({
          title: `Arquivo muito grande: ${f.name}`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });
    if (pendingFiles.length + valid.length > 5) {
      toast({ title: "Máximo de 5 imagens", variant: "destructive" });
      return;
    }
    setPendingFiles((prev) => [...prev, ...valid]);
    setPendingPreviews((prev) => [
      ...prev,
      ...valid.map((f) => URL.createObjectURL(f)),
    ]);
    e.target.value = "";
  };

  const removePendingFile = (index: number) => {
    URL.revokeObjectURL(pendingPreviews[index]);
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setPendingPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPendingFiles = async (productId: string) => {
    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      const ext =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "jpg";
      const safeName = `${Date.now()}-${generateUUID().slice(0, 8)}.${ext}`;
      const path = `${productId}/${safeName}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { contentType: file.type });
      if (error) continue;
      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);
      await supabase
        .from("product_images")
        .insert({
          product_id: productId,
          image_url: urlData.publicUrl,
          sort_order: i,
        });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);

    const payload: any = {
      name: productName,
      slug,
      catalog_node_id: (fd.get("catalog_node_id") as string) || null,
      product_code: (fd.get("product_code") as string) || null,
      short_description: fd.get("short_description") as string,
      full_description: fullDescription,
      price: 0,
      unit_cost: unitCost,
      pricing_type: pricingType,
      estimated_days: estimatedDays,
      price_per_sqm:
        pricingType === "per_sqm"
          ? calculateCommercialRounding(suggestedPrice)
          : null,
      is_featured: fd.get("is_featured") === "on",
      is_active: fd.get("is_active") === "on",
      show_on_store: fd.get("show_on_store") === "on",
      meta_title: metaTitle,
      meta_description: metaDesc,
      keywords: (fd.get("keywords") as string) || null,
      specifications,
      configuration_schema:
        groupedVariants.length > 0
          ? [
              {
                id: "hierarchy_v1",
                label: "Opções do Produto",
                type: "select",
                ui_type: "hierarchy",
                groups: groupedVariants.map((g) => ({
                  ...g,
                  options: g.options.map((opt) => ({
                    ...opt,
                    price: calculateCommercialRounding(
                      (Number(opt.cost) + FRETE_DILUIDO) * categoryMarkup,
                    ),
                  })),
                })),
              },
            ]
          : configSchema,
    };

    let minPrice = calculateCommercialRounding(
      (unitCost + FRETE_DILUIDO) * categoryMarkup,
    );
    if (groupedVariants.length > 0) {
      const prices: number[] = [];
      groupedVariants.forEach((g) => {
        g.options.forEach((opt) => {
          const p = calculateCommercialRounding(
            (Number(opt.cost) + FRETE_DILUIDO) * categoryMarkup,
          );
          prices.push(p);
        });
      });
      if (prices.length > 0) minPrice = Math.min(...prices);
    }
    payload.price = minPrice;
    payload.preco_minimo = minPrice;

    const saveFaqs = async (productId: string) => {
      await supabase.from("faq_items").delete().eq("product_id", productId);
      const faqsToInsert = productFaqs
        .filter((f) => f.question.trim() && f.answer.trim())
        .map((f, i) => ({
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
      const { error: delError } = await supabase
        .from("product_finishings")
        .delete()
        .eq("product_id", productId);
      if (delError) console.error("Error deleting finishings:", delError);

      if (selectedFinishingIds.length > 0) {
        const { error: insError } = await supabase
          .from("product_finishings")
          .insert(
            selectedFinishingIds.map((fid) => ({
              product_id: productId,
              finishing_id: fid,
            })),
          );
        if (insError) {
          console.error("Error inserting finishings:", insError);
          toast({
            title: "Erro ao salvar acabamentos",
            description: insError.message,
            variant: "destructive",
          });
        }
      }
    };

    try {
      if (editing) {
        const { error: updateErr } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editing.id);
        if (updateErr) {
          toast({
            title: "Erro ao atualizar produto",
            description: updateErr.message,
            variant: "destructive",
          });
          return;
        }
        await saveFaqs(editing.id);
        await saveFinishings(editing.id);
        toast({ title: "Produto atualizado!" });
        queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        return;
      } else {
        let finalSlug = slug;
        let result = await supabase
          .from("products")
          .insert({ ...payload, slug: finalSlug })
          .select("id")
          .single();
        if (result.error?.message?.includes("products_slug_key")) {
          finalSlug = `${slug}-${Date.now().toString(36)}`;
          result = await supabase
            .from("products")
            .insert({ ...payload, slug: finalSlug })
            .select("id")
            .single();
        }
        if (result.error || !result.data) {
          toast({
            title: "Erro ao criar produto",
            description: result.error?.message || "Erro desconhecido",
            variant: "destructive",
          });
          return;
        }
        const newId = result.data.id;
        setSavedProductId(newId);
        await uploadPendingFiles(newId);
        await saveFaqs(newId);
        await saveFinishings(newId);
        setEditing({ ...payload, id: newId, slug: finalSlug });
        toast({ title: "Produto criado!" });
        queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      }
      setPendingFiles([]);
      setPendingPreviews([]);
    } catch (e: any) {
      toast({
        title: "Erro inesperado",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir produto definitivamente?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error)
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    else {
      toast({ title: "Produto excluído" });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    }
  };

  const handleDuplicate = async (product: any) => {
    const {
      id,
      created_at,
      updated_at,
      order_items,
      categories,
      subcategories,
      product_images,
      ...rest
    } = product;
    const payload = {
      ...rest,
      name: `${rest.name} (Cópia)`,
      slug: `${rest.slug}-copia-${Date.now()}`,
      is_active: false,
      is_featured: false,
      show_on_store: false,
    };
    const { data, error } = await supabase
      .from("products")
      .insert(payload)
      .select("id")
      .single();
    if (error) {
      toast({
        title: "Erro ao duplicar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Duplicate FAQs and Finishings
    const newId = data.id;

    const [{ data: faqs }, { data: pfs }] = await Promise.all([
      supabase
        .from("faq_items")
        .select("question, answer, category, sort_order, is_active")
        .eq("product_id", product.id),
      supabase
        .from("product_finishings")
        .select("finishing_id")
        .eq("product_id", product.id),
    ]);

    if (faqs && faqs.length > 0) {
      await supabase
        .from("faq_items")
        .insert(faqs.map((f) => ({ ...f, product_id: newId })));
    }
    if (pfs && pfs.length > 0) {
      await supabase
        .from("product_finishings")
        .insert(pfs.map((pf) => ({ ...pf, product_id: newId })));
    }

    toast({
      title: "Produto duplicado!",
      description: "Dados, acabamentos e FAQs foram copiados.",
    });
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground">
          Produtos
        </h1>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setEditing(null);
              setSavedProductId(null);
              setPendingFiles([]);
              pendingPreviews.forEach((u) => URL.revokeObjectURL(u));
              setPendingPreviews([]);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="hero" onClick={() => openForm()}>
              <Plus className="w-4 h-4 mr-2" /> Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
            </DialogHeader>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nome *</label>
                  <Input
                    value={productName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Código do Produto
                  </label>
                  <Input
                    name="product_code"
                    defaultValue={editing?.product_code || ""}
                    placeholder="Ex: CV-001"
                  />
                </div>
              </div>

              <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                <label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <FolderTree className="w-4 h-4 text-highlight" /> Caminho no
                  Catálogo
                </label>
                <select
                  name="catalog_node_id"
                  defaultValue={editing?.catalog_node_id || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      const node = catalogNodes.find((n) => n.id === val);
                      if (node?.markup) setCategoryMarkup(Number(node.markup));
                    }
                  }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione uma categoria...</option>
                  {sortedNodePaths.map((np) => (
                    <option key={np.id} value={np.id}>
                      {np.path}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-primary/5 rounded-xl p-4 space-y-4 border border-primary/20">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-primary flex items-center gap-2 text-sm uppercase tracking-wider">
                    <Calculator className="w-4 h-4" /> Precificação Automatizada
                  </h3>
                  <div className="flex gap-2 p-1 bg-secondary rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setPricingType("fixed")}
                      className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${pricingType === "fixed" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Unitário
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingType("per_sqm")}
                      className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${pricingType === "per_sqm" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Metro² (m²)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-2">
                        <DollarSign className="w-3.5 h-3.5" />{" "}
                        {pricingType === "per_sqm"
                          ? "Custo m²"
                          : "Custo Base (Unitário)"}
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={unitCost || ""}
                        onChange={(e) => {
                          setUnitCost(parseFloat(e.target.value) || 0);
                        }}
                        placeholder="0.00"
                        className="h-11 text-lg font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1 tracking-tight">
                        Custo de produção{" "}
                        {pricingType === "per_sqm" ? "por m²" : "por unidade"}{" "}
                        (sem markup).
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/30">
                      <label className="text-sm font-medium flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-highlight" /> Prazo de
                        Produção (dias úteis)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={estimatedDays}
                        onChange={(e) =>
                          setEstimatedDays(parseInt(e.target.value) || 0)
                        }
                        className="h-10 w-24 font-bold"
                      />
                    </div>
                  </div>

                  <div className="bg-white/50 rounded-lg p-3 border border-border/50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        Markup da Categoria
                      </span>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {categoryMarkup}x
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        Frete Diluído
                      </span>
                      <span className="text-xs font-bold text-muted-foreground">
                        R$ {FRETE_DILUIDO.toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-dashed border-border">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black text-foreground uppercase">
                          Venda{" "}
                          {pricingType === "per_sqm" ? "p/ m²" : "Sugerida"}
                        </span>
                        <span className="text-xl font-black text-primary">
                          R${" "}
                          {calculateCommercialRounding(suggestedPrice).toFixed(
                            2,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-background rounded-lg p-3 border border-border space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={onSale}
                    onChange={(e) => setOnSale(e.target.checked)}
                  />
                  <Tag className="w-4 h-4 text-destructive" /> Produto em
                  promoção
                </label>
                {onSale && (
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Preço promocional *
                    </label>
                    <Input
                      name="sale_price"
                      type="number"
                      step="0.01"
                      defaultValue={editing?.sale_price || ""}
                      placeholder="Ex: 49.90"
                    />
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-r from-highlight/10 to-highlight-glow/10 rounded-xl p-4 border border-highlight/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-bold text-foreground flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-highlight" /> Gerar
                      Conteúdo com IA
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Preenche descrições e SEO automaticamente.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateWithAI}
                    disabled={generatingAI || !productName.trim()}
                  >
                    {generatingAI ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />{" "}
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-1" /> Gerar com IA
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Chamada Curta (Home)
                </label>
                <Input
                  name="short_description"
                  defaultValue={editing?.short_description}
                  placeholder="Ex: Cartão de visita 4x0 couche 300g"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Descrição Completa
                </label>
                <RichTextEditor
                  value={fullDescription}
                  onChange={setFullDescription}
                  placeholder="Descrição detalhada do produto..."
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Ficha Técnica
                </label>
                <RichTextEditor
                  value={specifications}
                  onChange={setSpecifications}
                  placeholder="Especificações técnicas para a aba do produto..."
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    name="is_featured"
                    defaultChecked={editing?.is_featured}
                    className="rounded border-border text-primary"
                  />
                  Destaque (Pág. Inicial)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    name="show_on_store"
                    defaultChecked={editing?.show_on_store ?? true}
                    className="rounded border-border text-primary"
                  />
                  Exibir na Loja
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={editing?.is_active ?? true}
                    className="rounded border-border text-primary"
                  />
                  Ativo (Visível no Link)
                </label>
              </div>

              <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
                <h3 className="font-display font-bold text-foreground flex items-center gap-2 mb-6">
                  <Sparkles className="w-5 h-5 text-primary" /> SEO & Google
                  AdSense 🚀
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                      <Settings className="w-4 h-4 text-highlight" /> Título SEO
                    </label>
                    <Input
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                      <Search className="w-4 h-4 text-highlight" /> Meta
                      Descrição (Importante p/ AdSense)
                    </label>
                    <Textarea
                      value={metaDesc}
                      onChange={(e) => setMetaDesc(e.target.value)}
                      className="h-20"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-highlight" /> Palavras-Chave
                    </label>
                    <Input
                      name="keywords"
                      defaultValue={editing?.keywords || ""}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 rounded-2xl p-6 border border-primary/20 space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" /> Variações
                    Hierárquicas (Preços por Lista)
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setGroupedVariants((prev) => [
                        ...prev,
                        {
                          id: generateUUID(),
                          name: "OPÇÃO 1",
                          options: [{ name: "500 UN", cost: 0, price: 0 }],
                        },
                      ])
                    }
                  >
                    <Plus className="w-3 h-3 mr-1" /> Novo Grupo
                  </Button>
                </div>

                {groupedVariants.map((group) => (
                  <div
                    key={group.id}
                    className="bg-background rounded-xl p-4 border border-border space-y-4 relative shadow-sm"
                  >
                    <button
                      type="button"
                      className="absolute top-4 right-4 text-destructive hover:scale-110"
                      onClick={() =>
                        setGroupedVariants((prev) =>
                          prev.filter((g) => g.id !== group.id),
                        )
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3 w-3/4">
                      <div className="relative w-10 h-10 rounded-lg border border-dashed border-primary/30 flex items-center justify-center bg-background shrink-0 hover:border-primary transition-colors group/groupimg">
                        {(group as any).image_url ? (
                          <>
                            <img
                              src={(group as any).image_url}
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setGroupedVariants((prev) =>
                                  prev.map((g) =>
                                    g.id === group.id
                                      ? { ...g, image_url: undefined }
                                      : g,
                                  ),
                                )
                              }
                              className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 shadow-sm hover:scale-110 transition-transform"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-4 h-4 text-primary opacity-50" />
                            <input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const { data, error } = await supabase.storage
                                  .from("product-images")
                                  .upload(
                                    `variations/group-${generateUUID()}.${file.name.split(".").pop()}`,
                                    file,
                                  );
                                if (error) {
                                  toast({
                                    title: "Erro no upload",
                                    description: error.message,
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                const {
                                  data: { publicUrl },
                                } = supabase.storage
                                  .from("product-images")
                                  .getPublicUrl(data.path);
                                setGroupedVariants((prev) =>
                                  prev.map((g) =>
                                    g.id === group.id
                                      ? { ...g, image_url: publicUrl }
                                      : g,
                                  ),
                                );
                                toast({ title: "Imagem do grupo vinculada!" });
                              }}
                            />
                          </>
                        )}
                      </div>
                      <Input
                        value={group.name}
                        onChange={(e) =>
                          setGroupedVariants((prev) =>
                            prev.map((g) =>
                              g.id === group.id
                                ? { ...g, name: e.target.value }
                                : g,
                            ),
                          )
                        }
                        placeholder="Ex: 4x0, Couche 300g..."
                        className="font-bold flex-1"
                      />
                    </div>
                    <div className="space-y-3 ml-7">
                      {group.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className="space-y-2 group p-3 rounded-lg border border-border/30 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex gap-3 items-center">
                            <div className="relative w-12 h-12 rounded-lg border border-dashed border-border overflow-hidden flex items-center justify-center bg-background shrink-0 group-hover:border-primary/50 transition-colors">
                              {opt.image_url ? (
                                <>
                                  <img
                                    src={opt.image_url}
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = [...group.options];
                                      delete next[optIdx].image_url;
                                      setGroupedVariants((prev) =>
                                        prev.map((g) =>
                                          g.id === group.id
                                            ? { ...g, options: next }
                                            : g,
                                        ),
                                      );
                                    }}
                                    className="absolute top-0 right-0 bg-destructive text-white rounded-bl-lg p-0.5 hover:bg-destructive/90"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;

                                      const fileExt = file.name
                                        .split(".")
                                        .pop();
                                      const fileName = `${generateUUID()}.${fileExt}`;
                                      const filePath = `variations/${fileName}`;

                                      const { data, error } =
                                        await supabase.storage
                                          .from("product-images")
                                          .upload(filePath, file);

                                      if (error) {
                                        toast({
                                          title: "Erro no upload",
                                          description: error.message,
                                          variant: "destructive",
                                        });
                                        return;
                                      }

                                      const {
                                        data: { publicUrl },
                                      } = supabase.storage
                                        .from("product-images")
                                        .getPublicUrl(filePath);

                                      const next = [...group.options];
                                      next[optIdx].image_url = publicUrl;
                                      setGroupedVariants((prev) =>
                                        prev.map((g) =>
                                          g.id === group.id
                                            ? { ...g, options: next }
                                            : g,
                                        ),
                                      );

                                      toast({ title: "Imagem vinculada!" });
                                    }}
                                  />
                                </>
                              )}
                            </div>

                            <div className="flex-1 space-y-1">
                              <label className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                Nome da Opção
                              </label>
                              <Input
                                value={opt.name}
                                onChange={(e) => {
                                  const next = [...group.options];
                                  next[optIdx].name = e.target.value;
                                  setGroupedVariants((prev) =>
                                    prev.map((g) =>
                                      g.id === group.id
                                        ? { ...g, options: next }
                                        : g,
                                    ),
                                  );
                                }}
                                placeholder="Ex: 500 UN - Fosco"
                                className="h-9 text-xs"
                              />
                            </div>

                            <div className="w-[100px] shrink-0">
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                  <DollarSign className="w-2 h-2" /> Custo
                                </label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={opt.cost || 0}
                                  onChange={(e) => {
                                    const next = [...group.options];
                                    next[optIdx].cost =
                                      parseFloat(e.target.value) || 0;
                                    setGroupedVariants((prev) =>
                                      prev.map((g) =>
                                        g.id === group.id
                                          ? { ...g, options: next }
                                          : g,
                                      ),
                                    );
                                  }}
                                  className="h-8 text-xs font-mono"
                                />
                              </div>
                            </div>

                            <div className="w-[100px] shrink-0">
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-primary uppercase flex items-center gap-1">
                                  <Tag className="w-2 h-2" /> Venda
                                </label>
                                <div className="h-8 bg-muted rounded-md flex items-center px-3 text-xs font-mono text-primary font-bold border border-border/50">
                                  R${" "}
                                  {calculateCommercialRounding(
                                    (Number(opt.cost) + FRETE_DILUIDO) *
                                      categoryMarkup,
                                  ).toFixed(2)}
                                </div>
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100"
                              onClick={() => {
                                const next = group.options.filter(
                                  (_, i) => i !== optIdx,
                                );
                                setGroupedVariants((prev) =>
                                  prev.map((g) =>
                                    g.id === group.id
                                      ? { ...g, options: next }
                                      : g,
                                  ),
                                );
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[11px]"
                        onClick={() => {
                          const next = [
                            ...group.options,
                            { name: "", cost: 0, price: 0 },
                          ];
                          setGroupedVariants((prev) =>
                            prev.map((g) =>
                              g.id === group.id ? { ...g, options: next } : g,
                            ),
                          );
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Tiragem
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-primary/5 rounded-2xl p-6 border border-primary/20 space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" /> Acabamentos
                    Extras Disponíveis
                  </h3>
                </div>

                <div className="bg-secondary/20 rounded-2xl p-6 space-y-6 border border-border/50">
                  {isLoadingFinishings ? (
                    <div className="text-center py-4 text-muted-foreground text-xs animate-pulse italic">
                      Carregando opções salvas...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                      {Object.entries(
                        allFinishings.reduce((acc: any, f: any) => {
                          const group = f.group_name || "Outros";
                          if (!acc[group]) acc[group] = [];
                          acc[group].push(f);
                          return acc;
                        }, {}),
                      ).map(([group, groupItems]: [string, any[]]) => (
                        <div key={group} className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary/60 border-b border-primary/10 pb-1">
                            {group}
                          </h4>
                          <div className="space-y-1">
                            {groupItems.map((f: any) => (
                              <label
                                key={f.id}
                                className="flex items-center justify-between group cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedFinishingIds.includes(
                                      f.id,
                                    )}
                                    onChange={(e) => {
                                      if (e.target.checked)
                                        setSelectedFinishingIds((prev) => [
                                          ...prev,
                                          f.id,
                                        ]);
                                      else
                                        setSelectedFinishingIds((prev) =>
                                          prev.filter((id) => id !== f.id),
                                        );
                                    }}
                                    className="rounded border-border text-primary"
                                  />
                                  <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                                    {f.name}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold text-primary opacity-50 group-hover:opacity-100">
                                  + R$ {f.price.toFixed(2)}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {savedProductId ? (
                <div className="bg-secondary/50 rounded-xl p-4 border border-border space-y-4">
                  <ProductImageUploader productId={savedProductId} />

                  <div className="pt-2 border-t border-dashed border-border/50">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-primary/30 hover:bg-primary/5 text-primary font-bold group"
                      onClick={handleGenerateWithAIImage}
                      disabled={generatingImage || !productName.trim()}
                    >
                      {generatingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                          Criando Mockup Profissional...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2 group-hover:scale-125 transition-transform" />{" "}
                          Gerar Mockup com IA ✨
                        </>
                      )}
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground mt-2 italic">
                      A IA gerará uma foto de estúdio para "{productName}" com a
                      marca ImPlotter.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-secondary/50 rounded-xl p-4 border border-border space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-highlight" /> Imagens do
                    Produto
                  </label>
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Salve o produto primeiro para habilitar o upload de
                      imagens.
                    </p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="hero"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                    Salvando...
                  </>
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

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <div className="flex items-center justify-between border-b border-border pb-1">
          <TabsList className="bg-transparent h-auto p-0 gap-6">
            <TabsTrigger
              value="manage"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 text-sm font-bold uppercase tracking-widest"
            >
              Gerenciar Produtos
            </TabsTrigger>
          </TabsList>
          <label className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={groupByCategory}
              onChange={(e) => setGroupByCategory(e.target.checked)}
              className="rounded border-border text-primary"
            />
            Agrupar por Categoria
          </label>
        </div>

        <TabsContent value="manage" className="space-y-6 m-0 relative">
          {selectedIds.length > 0 && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-8 border border-white/10 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-black text-xs">
                  {selectedIds.length}
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Selecionados
                </p>
              </div>

              <div className="h-8 w-px bg-white/10" />

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-bold hover:bg-white/5"
                  onClick={() => {
                    setBulkAction("price");
                    setBulkDialogOpen(true);
                  }}
                >
                  <CreditCard className="w-4 h-4 mr-2 text-primary" /> Ajustar
                  Preço %
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-bold hover:bg-white/5"
                  onClick={() => {
                    setBulkAction("status");
                    setBulkDialogOpen(true);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2 text-primary" /> Status
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-bold hover:bg-white/5"
                  onClick={() => {
                    setBulkAction("category");
                    setBulkDialogOpen(true);
                  }}
                >
                  <FolderTree className="w-4 h-4 mr-2 text-primary" /> Categoria
                </Button>
              </div>

              <div className="h-8 w-px bg-white/10" />

              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-bold text-destructive hover:bg-destructive/10"
                onClick={() => setSelectedIds([])}
              >
                Cancelar
              </Button>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou código..."
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm">
            <Accordion
              type="multiple"
              defaultValue={Object.keys(groupedProducts || {})}
              className="w-full"
            >
              {Object.entries(groupedProducts || {}).map(([catName, items]) => (
                <AccordionItem
                  key={catName}
                  value={catName}
                  className="border-b border-border last:border-0"
                >
                  <AccordionTrigger className="hover:no-underline px-6 py-4 bg-muted/20 group">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <FolderTree className="w-4 h-4 text-primary" />
                        <div className="text-left">
                          <p className="font-display font-black text-sm uppercase">
                            {catName}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {items.length} PRODUTOS
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[9px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectAllInGroup(items.map((it) => it.id));
                        }}
                      >
                        Selecionar Tudo
                      </Button>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-0">
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/5">
                      <table className="w-full text-sm min-w-[800px]">
                        <tbody>
                          {items.map((p) => (
                            <tr
                              key={p.id}
                              className={cn(
                                "border-t border-border/30 hover:bg-muted/10 transition-colors",
                                selectedIds.includes(p.id) && "bg-primary/5",
                              )}
                            >
                              <td className="p-4 w-10">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(p.id)}
                                  onChange={() => toggleSelect(p.id)}
                                  className="rounded border-border text-primary"
                                />
                              </td>
                              <td className="p-4 font-bold">{p.name}</td>
                              <td className="p-4 text-right font-black text-primary">
                                A partir de R${" "}
                                {Number(p.price || p.preco_minimo).toFixed(2)}
                              </td>
                              <td className="p-4 text-center">
                                <span
                                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${p.is_active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
                                >
                                  {p.is_active ? "Ativo" : "Inativo"}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleDuplicate(p)}
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openForm(p)}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => handleDelete(p.id)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
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
          </div>
        </TabsContent>
      </Tabs>

      {/* Bulk Update Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-xl uppercase tracking-tight">
              Atualizar {selectedIds.length} Produtos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {bulkAction === "price" && (
              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-muted-foreground">
                  Reajuste Percentual (%)
                </label>
                <Input
                  type="number"
                  placeholder="Ex: 10 para aumento ou -10 para desconto"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground italic">
                  Isso aplicará o cálculo sobre o preço base de cada produto
                  selecionado.
                </p>
              </div>
            )}
            {bulkAction === "status" && (
              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-muted-foreground">
                  Novo Status
                </label>
                <select
                  className="w-full h-11 rounded-xl bg-muted/50 border border-border px-4 font-bold text-sm"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  <option value="active">Ativo (Visível na loja)</option>
                  <option value="inactive">Inativo (Oculto)</option>
                </select>
              </div>
            )}
            {bulkAction === "category" && (
              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-muted-foreground">
                  Nova Categoria
                </label>
                <select
                  className="w-full h-11 rounded-xl bg-muted/50 border border-border px-4 font-bold text-sm"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {catalogNodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {getNodePath(catalogNodes, node.id)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              variant="hero"
              className="w-full h-12"
              onClick={handleBulkUpdate}
              disabled={bulkProcessing || !bulkValue}
            >
              {bulkProcessing
                ? "Processando..."
                : "Confirmar Alterações em Massa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminProdutos;
