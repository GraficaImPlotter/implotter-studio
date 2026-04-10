export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      affiliate_clicks: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          id: string
          is_released: boolean
          order_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string
          id?: string
          is_released?: boolean
          order_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          id?: string
          is_released?: boolean
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          commission_percent: number
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          referral_code: string
          released_commission: number
          status: Database["public"]["Enums"]["affiliate_status"]
          total_clicks: number
          total_commission: number
          total_leads: number
          total_sales: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          commission_percent?: number
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          referral_code: string
          released_commission?: number
          status?: Database["public"]["Enums"]["affiliate_status"]
          total_clicks?: number
          total_commission?: number
          total_leads?: number
          total_sales?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          commission_percent?: number
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          referral_code?: string
          released_commission?: number
          status?: Database["public"]["Enums"]["affiliate_status"]
          total_clicks?: number
          total_commission?: number
          total_leads?: number
          total_sales?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          button_link: string | null
          button_text: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          location: string
          sort_order: number
          subtitle: string | null
          title: string | null
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          location?: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          location?: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      catalog_nodes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "catalog_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          meta_description: string | null
          meta_title: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      category_subcategories: {
        Row: {
          category_id: string
          id: string
          subcategory_id: string
        }
        Insert: {
          category_id: string
          id?: string
          subcategory_id: string
        }
        Update: {
          category_id?: string
          id?: string
          subcategory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_subcategories_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          first_purchase_only: boolean | null
          free_shipping: boolean | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_purchase: number | null
          restricted_categories: string[] | null
          restricted_products: string[] | null
          used_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value: number
          first_purchase_only?: boolean | null
          free_shipping?: boolean | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase?: number | null
          restricted_categories?: string[] | null
          restricted_products?: string[] | null
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          first_purchase_only?: boolean | null
          free_shipping?: boolean | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase?: number | null
          restricted_categories?: string[] | null
          restricted_products?: string[] | null
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      crm_notes: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          lead_id: string | null
          note: string
          note_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          note: string
          note_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          note?: string
          note_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_stages: {
        Row: {
          customer_id: string
          id: string
          stage: Database["public"]["Enums"]["customer_stage"]
          updated_at: string
        }
        Insert: {
          customer_id: string
          id?: string
          stage?: Database["public"]["Enums"]["customer_stage"]
          updated_at?: string
        }
        Update: {
          customer_id?: string
          id?: string
          stage?: Database["public"]["Enums"]["customer_stage"]
          updated_at?: string
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          product_id: string | null
          question: string
          sort_order: number
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          product_id?: string | null
          question: string
          sort_order?: number
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          product_id?: string | null
          question?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "faq_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      finishings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          price: number
          pricing_mode: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price?: number
          pricing_mode?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          pricing_mode?: string
          sort_order?: number
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          link_text: string | null
          link_url: string | null
          media_type: string
          media_url: string
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_text?: string | null
          link_url?: string | null
          media_type?: string
          media_url: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_text?: string | null
          link_url?: string | null
          media_type?: string
          media_url?: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kit_items: {
        Row: {
          created_at: string
          id: string
          kit_id: string
          product_id: string
          quantity: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          kit_id: string
          product_id: string
          quantity?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          kit_id?: string
          product_id?: string
          quantity?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      kits: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          normal_price: number
          promo_price: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          normal_price?: number
          promo_price?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          normal_price?: number
          promo_price?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          origin: string | null
          phone: string | null
          status: Database["public"]["Enums"]["lead_status"]
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          origin?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          origin?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          points: number
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      melhor_envio_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          instructions: string | null
          item_area: number | null
          item_height: number | null
          item_width: number | null
          order_id: string
          price_per_sqm: number | null
          pricing_type: string | null
          product_id: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          instructions?: string | null
          item_area?: number | null
          item_height?: number | null
          item_width?: number | null
          order_id: string
          price_per_sqm?: number | null
          pricing_type?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string | null
          item_area?: number | null
          item_height?: number | null
          item_width?: number | null
          order_id?: string
          price_per_sqm?: number | null
          pricing_type?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      order_notifications: {
        Row: {
          channel: string
          error_message: string | null
          id: string
          notification_type: string
          order_id: string
          sent_at: string
          status: string
          success: boolean
        }
        Insert: {
          channel?: string
          error_message?: string | null
          id?: string
          notification_type?: string
          order_id: string
          sent_at?: string
          status: string
          success?: boolean
        }
        Update: {
          channel?: string
          error_message?: string | null
          id?: string
          notification_type?: string
          order_id?: string
          sent_at?: string
          status?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "order_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          notes: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          affiliate_id: string | null
          coupon_id: string | null
          created_at: string
          customer_cpf_cnpj: string | null
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          discount: number
          id: string
          invoice_url: string | null
          notes: string | null
          order_number: number
          origin: string | null
          payment_method: string | null
          pix_receipt_url: string | null
          shipping_service: string | null
          shipping_service_id: number | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          affiliate_id?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_cpf_cnpj?: string | null
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          discount?: number
          id?: string
          invoice_url?: string | null
          notes?: string | null
          order_number?: number
          origin?: string | null
          payment_method?: string | null
          pix_receipt_url?: string | null
          shipping_service?: string | null
          shipping_service_id?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          affiliate_id?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_cpf_cnpj?: string | null
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          discount?: number
          id?: string
          invoice_url?: string | null
          notes?: string | null
          order_number?: number
          origin?: string | null
          payment_method?: string | null
          pix_receipt_url?: string | null
          shipping_service?: string | null
          shipping_service_id?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      popup_leads: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          popup_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          popup_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          popup_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "popup_leads_popup_id_fkey"
            columns: ["popup_id"]
            isOneToOne: false
            referencedRelation: "popup_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_offers: {
        Row: {
          clicks_count: number
          coupon_code: string
          created_at: string
          delay_seconds: number
          description: string
          discount_label: string
          id: string
          is_active: boolean
          require_lead_capture: boolean | null
          target_pages: string[] | null
          timer_minutes: number
          title: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          clicks_count?: number
          coupon_code?: string
          created_at?: string
          delay_seconds?: number
          description?: string
          discount_label?: string
          id?: string
          is_active?: boolean
          require_lead_capture?: boolean | null
          target_pages?: string[] | null
          timer_minutes?: number
          title?: string
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          clicks_count?: number
          coupon_code?: string
          created_at?: string
          delay_seconds?: number
          description?: string
          discount_label?: string
          id?: string
          is_active?: boolean
          require_lead_capture?: boolean | null
          target_pages?: string[] | null
          timer_minutes?: number
          title?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_finishings: {
        Row: {
          finishing_id: string
          id: string
          price_override: number | null
          product_id: string
        }
        Insert: {
          finishing_id: string
          id?: string
          price_override?: number | null
          product_id: string
        }
        Update: {
          finishing_id?: string
          id?: string
          price_override?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_finishings_finishing_id_fkey"
            columns: ["finishing_id"]
            isOneToOne: false
            referencedRelation: "finishings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_finishings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_finishings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          image_url: string
          product_id: string
          sort_order: number
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          sort_order?: number
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          catalog_node_id: string | null
          category_id: string | null
          color_mode: string | null
          cost_art: number | null
          cost_extra: number | null
          cost_material: number | null
          cost_production: number | null
          cost_supplier: number | null
          created_at: string
          default_quantity: number | null
          estimated_days: number | null
          full_description: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          keywords: string | null
          max_area: number | null
          max_height: number | null
          max_width: number | null
          meta_description: string | null
          meta_title: string | null
          min_area: number | null
          min_height: number | null
          min_width: number | null
          name: string
          price: number
          price_per_sqm: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type"]
          product_code: string | null
          sale_price: number | null
          sale_unit: Database["public"]["Enums"]["sale_unit"]
          shipping_height: number | null
          shipping_length: number | null
          shipping_weight: number | null
          shipping_width: number | null
          short_description: string | null
          slug: string
          sort_order: number
          specifications: string | null
          subcategory_id: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          catalog_node_id?: string | null
          category_id?: string | null
          color_mode?: string | null
          cost_art?: number | null
          cost_extra?: number | null
          cost_material?: number | null
          cost_production?: number | null
          cost_supplier?: number | null
          created_at?: string
          default_quantity?: number | null
          estimated_days?: number | null
          full_description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          keywords?: string | null
          max_area?: number | null
          max_height?: number | null
          max_width?: number | null
          meta_description?: string | null
          meta_title?: string | null
          min_area?: number | null
          min_height?: number | null
          min_width?: number | null
          name: string
          price?: number
          price_per_sqm?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"]
          product_code?: string | null
          sale_price?: number | null
          sale_unit?: Database["public"]["Enums"]["sale_unit"]
          shipping_height?: number | null
          shipping_length?: number | null
          shipping_weight?: number | null
          shipping_width?: number | null
          short_description?: string | null
          slug: string
          sort_order?: number
          specifications?: string | null
          subcategory_id?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          catalog_node_id?: string | null
          category_id?: string | null
          color_mode?: string | null
          cost_art?: number | null
          cost_extra?: number | null
          cost_material?: number | null
          cost_production?: number | null
          cost_supplier?: number | null
          created_at?: string
          default_quantity?: number | null
          estimated_days?: number | null
          full_description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          keywords?: string | null
          max_area?: number | null
          max_height?: number | null
          max_width?: number | null
          meta_description?: string | null
          meta_title?: string | null
          min_area?: number | null
          min_height?: number | null
          min_width?: number | null
          name?: string
          price?: number
          price_per_sqm?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"]
          product_code?: string | null
          sale_price?: number | null
          sale_unit?: Database["public"]["Enums"]["sale_unit"]
          shipping_height?: number | null
          shipping_length?: number | null
          shipping_weight?: number | null
          shipping_width?: number | null
          short_description?: string | null
          slug?: string
          sort_order?: number
          specifications?: string | null
          subcategory_id?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_catalog_node_id_fkey"
            columns: ["catalog_node_id"]
            isOneToOne: false
            referencedRelation: "catalog_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          avatar_url: string | null
          cart_data: Json | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          avatar_url?: string | null
          cart_data?: Json | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          avatar_url?: string | null
          cart_data?: Json | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      progressive_discounts: {
        Row: {
          created_at: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          min_quantity: number | null
          min_value: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          min_quantity?: number | null
          min_value?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          min_quantity?: number | null
          min_value?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          product_name: string
          quantity: number
          quote_id: string
          sort_order: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          product_name: string
          quantity?: number
          quote_id: string
          sort_order?: number
          subtotal?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          product_name?: string
          quantity?: number
          quote_id?: string
          sort_order?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          discount: number
          id: string
          internal_notes: string | null
          notes: string | null
          quote_number: number
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          discount?: number
          id?: string
          internal_notes?: string | null
          notes?: string | null
          quote_number?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          discount?: number
          id?: string
          internal_notes?: string | null
          notes?: string | null
          quote_number?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      related_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          related_product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          related_product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          related_product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "related_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_products_related_product_id_fkey"
            columns: ["related_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "related_products_related_product_id_fkey"
            columns: ["related_product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          city: string | null
          comment: string | null
          company: string | null
          created_at: string
          id: string
          image_url: string | null
          is_approved: boolean
          is_featured: boolean
          is_hidden: boolean
          name: string
          rating: number
          review_token: string | null
        }
        Insert: {
          city?: string | null
          comment?: string | null
          company?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_approved?: boolean
          is_featured?: boolean
          is_hidden?: boolean
          name: string
          rating: number
          review_token?: string | null
        }
        Update: {
          city?: string | null
          comment?: string | null
          company?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_approved?: boolean
          is_featured?: boolean
          is_hidden?: boolean
          name?: string
          rating?: number
          review_token?: string | null
        }
        Relationships: []
      }
      sales_manual: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          description: string | null
          id: string
          invoice_url: string | null
          notes: string | null
          payment_method: string | null
          pix_receipt_url: string | null
          product_service: string
          sale_date: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          description?: string | null
          id?: string
          invoice_url?: string | null
          notes?: string | null
          payment_method?: string | null
          pix_receipt_url?: string | null
          product_service: string
          sale_date?: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          description?: string | null
          id?: string
          invoice_url?: string | null
          notes?: string | null
          payment_method?: string | null
          pix_receipt_url?: string | null
          product_service?: string
          sale_date?: string
          status?: string
        }
        Relationships: []
      }
      saved_carts: {
        Row: {
          cart_data: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cart_data?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cart_data?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seo_pages: {
        Row: {
          id: string
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          page_slug: string
          structured_data: Json | null
          updated_at: string
        }
        Insert: {
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          page_slug: string
          structured_data?: Json | null
          updated_at?: string
        }
        Update: {
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          page_slug?: string
          structured_data?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      site_pages: {
        Row: {
          content: string
          id: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          id?: string
          slug: string
          title?: string
          updated_at?: string
        }
        Update: {
          content?: string
          id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      social_proof_messages: {
        Row: {
          city: string | null
          created_at: string
          customer_name: string
          id: string
          is_active: boolean
          message: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          customer_name: string
          id?: string
          is_active?: boolean
          message?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          is_active?: boolean
          message?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      loyalty_balances: {
        Row: {
          balance: number | null
          user_id: string | null
        }
        Relationships: []
      }
      products_public: {
        Row: {
          catalog_node_id: string | null
          category_id: string | null
          color_mode: string | null
          created_at: string | null
          default_quantity: number | null
          estimated_days: number | null
          full_description: string | null
          id: string | null
          is_active: boolean | null
          is_featured: boolean | null
          keywords: string | null
          max_area: number | null
          max_height: number | null
          max_width: number | null
          meta_description: string | null
          meta_title: string | null
          min_area: number | null
          min_height: number | null
          min_width: number | null
          name: string | null
          price: number | null
          price_per_sqm: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type"] | null
          product_code: string | null
          sale_price: number | null
          sale_unit: Database["public"]["Enums"]["sale_unit"] | null
          short_description: string | null
          slug: string | null
          sort_order: number | null
          specifications: string | null
          subcategory_id: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          catalog_node_id?: string | null
          category_id?: string | null
          color_mode?: string | null
          created_at?: string | null
          default_quantity?: number | null
          estimated_days?: number | null
          full_description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          keywords?: string | null
          max_area?: number | null
          max_height?: number | null
          max_width?: number | null
          meta_description?: string | null
          meta_title?: string | null
          min_area?: number | null
          min_height?: number | null
          min_width?: number | null
          name?: string | null
          price?: number | null
          price_per_sqm?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"] | null
          product_code?: string | null
          sale_price?: number | null
          sale_unit?: Database["public"]["Enums"]["sale_unit"] | null
          short_description?: string | null
          slug?: string | null
          sort_order?: number | null
          specifications?: string | null
          subcategory_id?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          catalog_node_id?: string | null
          category_id?: string | null
          color_mode?: string | null
          created_at?: string | null
          default_quantity?: number | null
          estimated_days?: number | null
          full_description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          keywords?: string | null
          max_area?: number | null
          max_height?: number | null
          max_width?: number | null
          meta_description?: string | null
          meta_title?: string | null
          min_area?: number | null
          min_height?: number | null
          min_width?: number | null
          name?: string | null
          price?: number | null
          price_per_sqm?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"] | null
          product_code?: string | null
          sale_price?: number | null
          sale_unit?: Database["public"]["Enums"]["sale_unit"] | null
          short_description?: string | null
          slug?: string | null
          sort_order?: number | null
          specifications?: string | null
          subcategory_id?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_catalog_node_id_fkey"
            columns: ["catalog_node_id"]
            isOneToOne: false
            referencedRelation: "catalog_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews_public: {
        Row: {
          city: string | null
          comment: string | null
          company: string | null
          created_at: string | null
          id: string | null
          is_approved: boolean | null
          is_featured: boolean | null
          is_hidden: boolean | null
          name: string | null
          rating: number | null
        }
        Insert: {
          city?: string | null
          comment?: string | null
          company?: string | null
          created_at?: string | null
          id?: string | null
          is_approved?: boolean | null
          is_featured?: boolean | null
          is_hidden?: boolean | null
          name?: string | null
          rating?: number | null
        }
        Update: {
          city?: string | null
          comment?: string | null
          company?: string | null
          created_at?: string | null
          id?: string | null
          is_approved?: boolean | null
          is_featured?: boolean | null
          is_hidden?: boolean | null
          name?: string | null
          rating?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_popup_clicks: { Args: { popup_id: string }; Returns: undefined }
    }
    Enums: {
      affiliate_status: "pending" | "approved" | "blocked"
      app_role: "admin" | "moderator" | "user"
      customer_stage:
        | "novo_contato"
        | "orcamento_enviado"
        | "aguardando_retorno"
        | "aprovado"
        | "em_producao"
        | "pos_venda"
      lead_status: "novo" | "em_atendimento" | "convertido" | "perdido"
      order_status:
        | "pedido_recebido"
        | "aguardando_pagamento"
        | "pagamento_confirmado"
        | "em_analise"
        | "aguardando_arte"
        | "arte_em_conferencia"
        | "aprovado_producao"
        | "em_producao"
        | "em_acabamento"
        | "pronto_envio"
        | "finalizado"
        | "cancelado"
      pricing_type: "fixed" | "per_sqm"
      quote_status: "rascunho" | "enviado" | "aceito" | "recusado" | "vencido"
      sale_unit: "unit" | "pack" | "sqm"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      affiliate_status: ["pending", "approved", "blocked"],
      app_role: ["admin", "moderator", "user"],
      customer_stage: [
        "novo_contato",
        "orcamento_enviado",
        "aguardando_retorno",
        "aprovado",
        "em_producao",
        "pos_venda",
      ],
      lead_status: ["novo", "em_atendimento", "convertido", "perdido"],
      order_status: [
        "pedido_recebido",
        "aguardando_pagamento",
        "pagamento_confirmado",
        "em_analise",
        "aguardando_arte",
        "arte_em_conferencia",
        "aprovado_producao",
        "em_producao",
        "em_acabamento",
        "pronto_envio",
        "finalizado",
        "cancelado",
      ],
      pricing_type: ["fixed", "per_sqm"],
      quote_status: ["rascunho", "enviado", "aceito", "recusado", "vencido"],
      sale_unit: ["unit", "pack", "sqm"],
    },
  },
} as const
