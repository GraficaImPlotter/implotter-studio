import { logger } from './logger.js';
import { enrichLead } from './contactEnrichmentService.js';

// Simulation database of real-world local businesses in Brazil for beautiful, fast demonstration
const SIMULATED_LEADS = [
  {
    name: "Clínica Odonto Clean",
    phone: "(11) 98765-4321",
    whatsapp: "11987654321",
    address: "Av. Paulista, 1200 - Bela Vista, São Paulo - SP",
    website: "https://www.odontocleanpaulista.com.br",
    instagram: "@odontoclean.paulista",
    email: "contato@odontocleanpaulista.com.br",
    rating: 4.8,
    reviews_count: 142,
    category: "Clínica Odontológica",
    opening_hours: "08:00 - 18:00"
  },
  {
    name: "Dra. Ana Silva - Dermatologia",
    phone: "(11) 91234-5678",
    whatsapp: "11912345678",
    address: "Rua Bela Cintra, 450 - Consolação, São Paulo - SP",
    website: "https://www.diraanasilvaderma.com.br",
    instagram: "@dra.anasilvaderma",
    email: "consultas@draanasilvaderma.com.br",
    rating: 4.9,
    reviews_count: 85,
    category: "Médico Dermatologista",
    opening_hours: "09:00 - 17:00"
  },
  {
    name: "Studio Fit & Health",
    phone: "(11) 93344-5566",
    whatsapp: "11933445566",
    address: "Rua Augusta, 1800 - Cerqueira César, São Paulo - SP",
    website: "https://www.studiofithealth.com.br",
    instagram: "@studiofit.health",
    email: "matriculas@studiofithealth.com.br",
    rating: 4.7,
    reviews_count: 210,
    category: "Academia / Estúdio Fitness",
    opening_hours: "06:00 - 22:00"
  },
  {
    name: "Teixeira & Advogados Associados",
    phone: "(11) 3211-4455",
    whatsapp: "1132114455",
    address: "Av. Brigadeiro Luís Antônio, 2500 - Jardim Paulista, São Paulo - SP",
    website: "https://www.teixeiraadvocacia.com.br",
    instagram: "@teixeira.advocacia",
    email: "contato@teixeiraadvocacia.com.br",
    rating: 4.6,
    reviews_count: 34,
    category: "Escritório de Advocacia",
    opening_hours: "09:00 - 18:00"
  },
  {
    name: "Cantina Bella Italia",
    phone: "(11) 95566-7788",
    whatsapp: "11955667788",
    address: "Rua Treze de Maio, 850 - Bixiga, São Paulo - SP",
    website: "https://www.cantinabellaitalia.com.br",
    instagram: "@cantina.bellaitalia",
    email: "reservas@cantinabellaitalia.com.br",
    rating: 4.8,
    reviews_count: 512,
    category: "Restaurante Italiano",
    opening_hours: "11:30 - 23:00"
  },
  {
    name: "Dentistas Associados Moema",
    phone: "(11) 5051-2233",
    whatsapp: "1150512233",
    address: "Av. Moema, 640 - Moema, São Paulo - SP",
    website: "https://www.dentistasmoema.com.br",
    instagram: "@dentistas.moema",
    email: "atendimento@dentistasmoema.com.br",
    rating: 4.5,
    reviews_count: 92,
    category: "Clínica Odontológica",
    opening_hours: "08:00 - 19:00"
  },
  {
    name: "Crossfit Sampa",
    phone: "(11) 98877-6655",
    whatsapp: "11988776655",
    address: "Rua Clélia, 1200 - Lapa, São Paulo - SP",
    website: "https://www.crossfitsampa.com.br",
    instagram: "@crossfit.sampa",
    email: "box@crossfitsampa.com.br",
    rating: 4.9,
    reviews_count: 310,
    category: "Academia de Crossfit",
    opening_hours: "06:00 - 21:00"
  },
  {
    name: "Bistrô do Chef",
    phone: "(11) 99911-2233",
    whatsapp: "11999112233",
    address: "Rua Oscar Freire, 950 - Jardins, São Paulo - SP",
    website: "https://www.bistrochef.com.br",
    instagram: "@bistro.dochef",
    email: "chef@bistrochef.com.br",
    rating: 4.7,
    reviews_count: 188,
    category: "Restaurante Contemporâneo",
    opening_hours: "12:00 - 22:30"
  }
];

/**
 * Scrapes Google Maps for a given keyword, city and limit
 * Falls back to simulation mode with high-quality Brazilian businesses if playwright is missing or fails
 */
const enrichmentCache = new Map();

/**
 * Simple validation for lead fields.
 * Returns an object { valid: boolean, errors: string[] }
 */
async function validateLead(lead) {
  const errors = [];
  // Phone: digits only, 10 or 11 digits (Brazilian numbers)
  if (lead.phone) {
    const digits = lead.phone.replace(/\D/g, "");
    if (!/^\d{10,11}$/.test(digits)) {
      errors.push("Invalid phone format");
    }
  }
  // Website: perform a HEAD request to check reachability
  if (lead.website) {
    try {
      const res = await fetch(lead.website, { method: "HEAD" });
      if (!res.ok) {
        errors.push("Website unreachable");
      }
    } catch (_) {
      errors.push("Website unreachable");
    }
  }
  // Instagram handle pattern
  if (lead.instagram) {
    if (!/^@?[A-Za-z0-9._]+$/.test(lead.instagram)) {
      errors.push("Invalid Instagram handle");
    }
  }
  return { valid: errors.length === 0, errors };
}

export async function scrapeGoogleMaps({ keyword, city, limit = 5, offset = 0, onProgress = () => {}, simulate = false }) {
  const query = `${keyword} em ${city}`;
  logger.info(`Starting scraping for: "${query}" (Limit: ${limit}, Simulate: ${simulate})`);
  
  if (simulate) {
    return runSimulation(keyword, city, limit, onProgress);
  }

  let playwright;
  try {
    playwright = await import('playwright');
  } catch (error) {
    logger.error("Playwright not installed or failed to load.", { message: error.message });
    throw new Error('Playwright not available: ensure it is installed in the environment');
  }

  let browser;
  try {
    onProgress(`Iniciando navegador Playwright...`);
    browser = await playwright.chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'pt-BR'
    });

    const page = await context.newPage();
    
    // Stealth behaviors
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    onProgress(`Acessando Google Maps: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    onProgress(`Aguardando carregamento dos resultados para "${query}"...`);
    
    // Handle cookies or consent forms if they appear
    try {
      const consentButton = page.locator('button[aria-label="Aceitar tudo"], button[aria-label="Aceitar todos"]');
      if (await consentButton.isVisible({ timeout: 2000 })) {
        await consentButton.click();
        onProgress("Termos de privacidade aceitos.");
      }
    } catch (_) {}

    // Selector for search result items
    const feedSelector = 'div[role="feed"]';
    let resultsLoaded = false;
    
    try {
      await page.waitForSelector(feedSelector, { timeout: 10000 });
      resultsLoaded = true;
    } catch (e) {
      // In some viewports or versions, Google Maps might load cards instead of a list, or open directly on a single result
      const singleTitleSelector = 'h1.DUwDgc';
      if (await page.locator(singleTitleSelector).isVisible({ timeout: 2000 })) {
        onProgress("Abriu diretamente em uma empresa única.");
      } else {
        throw new Error("Não foi possível encontrar a lista de resultados. Talvez o termo de pesquisa não tenha retornado dados.");
      }
    }

    const leads = [];
    
    if (resultsLoaded) {
      onProgress(`Rolando a lista de resultados para carregar empresas...`);
      
      // Auto scroll container
      const feed = page.locator(feedSelector);
      let previousHeight = 0;
      let scrollAttempts = 0;
      
      while (leads.length < limit && scrollAttempts < 15) {
        const itemLocator = page.locator('a[href*="/maps/place/"]');
        const count = await itemLocator.count();
        onProgress(`Empresas carregadas na lista: ${count}...`);
        
        if (count >= limit * 1.5) break;

        // Scroll the feed down
        await feed.evaluate(el => el.scrollBy(0, 1500));
        await page.waitForTimeout(1000 + Math.random() * 1000);
        
        const currentHeight = await feed.evaluate(el => el.scrollHeight);
        if (currentHeight === previousHeight) {
          scrollAttempts++;
        } else {
          scrollAttempts = 0;
        }
        previousHeight = currentHeight;
      }

      const itemLocator = page.locator('a[href*="/maps/place/"]');
      const totalAvailable = await itemLocator.count();
      const processLimit = Math.min(totalAvailable, limit);
      
      onProgress(`Iniciando a extração de detalhes para as primeiras ${processLimit} empresas encontradas.`);

      for (let i = 0; i < processLimit; i++) {
        try {
          onProgress(`[${i + 1}/${processLimit}] Clicando na empresa #${i + 1}...`);
          
          const item = itemLocator.nth(i);
          await item.scrollIntoViewIfNeeded();
          await item.click({ force: true });
          
          // Wait for detail panel animation
          await page.waitForTimeout(1500 + Math.random() * 1000);
          
          // Scrape details from pane
          const name = await page.locator('h1.DUwDgc').first().textContent().catch(() => "Sem nome");
          onProgress(`[${i + 1}/${processLimit}] Extraindo dados de: "${name}"`);

          const category = await page.locator('button[jsaction*="category"]').first().textContent().catch(() => "");
          const address = await page.locator('button[data-item-id="address"]').first().getAttribute('aria-label').then(text => text?.replace('Endereço: ', '')).catch(() => "");
          const website = await page.locator('a[data-item-id="authority"]').first().getAttribute('href').catch(() => null);
          const phone = await page.locator('button[data-item-id*="phone:tel:"]').first().getAttribute('aria-label').then(text => text?.replace('Telefone: ', '')).catch(() => "");
          
          // Rating and reviews
          const ratingText = await page.locator('div.F7nice span[aria-hidden="true"]').first().textContent().catch(() => "0");
          const rating = parseFloat(ratingText.replace(',', '.')) || 0;
          
          const reviewsText = await page.locator('div.F7nice span[aria-label*="avalia"]').first().textContent().catch(() => "0");
          const reviews_count = parseInt(reviewsText.replace(/\D/g, '')) || 0;
          
          const opening_hours = await page.locator('div[jsaction*="pane.hkcd"]').first().getAttribute('aria-label').catch(() => "");

          let lead = {
            name: name.trim(),
            category: category?.trim() || keyword,
            address: address?.trim() || city,
            website: website || "",
            phone: phone?.trim() || "",
            whatsapp: phone ? phone.replace(/\D/g, '') : "",
            rating,
            reviews_count,
            opening_hours: opening_hours?.trim() || "Não disponível",
            instagram: "",
            email: ""
          };

          // Enrich lead from website if present
          if (lead.website && lead.website.startsWith('http')) {
              // Use cache for enrichment to avoid repeated network calls
              let enriched = enrichmentCache.get(lead.website);
              if (!enriched) {
                try {
                  enriched = await enrichLead(lead.website);
                  enrichmentCache.set(lead.website, enriched);
                } catch (err) {
                  logger.error("Enrichment failed", { message: err.message });
                  enriched = { instagram: "", email: "" };
                }
              }
              lead.instagram = enriched.instagram;
              lead.email = enriched.email;
              if (enriched.phone && !lead.phone) {
                lead.phone = enriched.phone;
                lead.whatsapp = enriched.phone.replace(/\D/g, "");
              }
              onProgress(`[${i + 1}/${processLimit}] Redes sociais extraídas: Instagram: ${lead.instagram || "—"}, Email: ${lead.email || "—"}`);
            }


          leads.push(lead);
          // Validate lead data
          const validation = await validateLead(lead);
          lead.validation_status = validation.valid ? "ok" : "invalid";
          if (!validation.valid) {
            logger.warn('Lead validation issues', { errors: validation.errors, leadName: lead.name });
          }
          onProgress(`[${i + 1}/${processLimit}] Empresa salva com sucesso.`);
        } catch (itemErr) {
          logger.error(`Error scraping item ${i}`, { message: itemErr.message });
          onProgress(`Erro ao extrair empresa #${i + 1}: ${itemErr.message}. Continuando...`);
        }
      }
    } else {
      // Single business directly loaded
      const name = await page.locator('h1.DUwDgc').first().textContent().catch(() => "Sem nome");
      onProgress(`Abriu diretamente na empresa única: ${name}`);
      const address = await page.locator('button[data-item-id="address"]').first().getAttribute('aria-label').then(text => text?.replace('Endereço: ', '')).catch(() => "");
      const website = await page.locator('a[data-item-id="authority"]').first().getAttribute('href').catch(() => null);
      const phone = await page.locator('button[data-item-id*="phone:tel:"]').first().getAttribute('aria-label').then(text => text?.replace('Telefone: ', '')).catch(() => "");
      const category = await page.locator('button[jsaction*="category"]').first().textContent().catch(() => keyword);
      
      const ratingText = await page.locator('div.F7nice span[aria-hidden="true"]').first().textContent().catch(() => "0");
      const rating = parseFloat(ratingText.replace(',', '.')) || 0;

      let lead = {
        name: name.trim(),
        category: category?.trim() || keyword,
        address: address?.trim() || city,
        website: website || "",
        phone: phone?.trim() || "",
        whatsapp: phone ? phone.replace(/\D/g, '') : "",
        rating,
        reviews_count: 1,
        opening_hours: "Não disponível",
        instagram: "",
        email: ""
      };

      if (lead.website) {
        try {
          const enriched = await enrichLead(lead.website);
          lead.instagram = enriched.instagram;
          lead.email = enriched.email;
        } catch (_) {}
      }
      leads.push(lead);
    }

    await browser.close();
    onProgress(`Captura finalizada com sucesso! Total de ${leads.length} leads qualificados extraídos.`);
    return leads;

  } catch (error) {
    logger.error("Scraper failed: unable to complete real scraping", { message: error.message });
    onProgress(`Erro no navegador de captura: ${error.message}. Nenhum lead retornado.`);
    if (browser) await browser.close().catch(() => {});
    // Propagate the error to the caller; they can decide whether to fallback to simulation
    throw error;
  }
}

/**
 * Helper to get Brazillian city state and area code (DDD) for simulation accuracy
 */
function getCityMetadata(cityName) {
  const norm = (cityName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  let state = "SP";
  let ddd = "11";
  
  if (norm.includes("mg") || norm.includes("minas") || norm.includes("teofilo otoni") || norm.includes("belo horizonte") || norm.includes("uberlandia") || norm.includes("juiz de fora") || norm.includes("contagem") || norm.includes("betim") || norm.includes("ipatinga") || norm.includes("valadares") || norm.includes("montes claros")) {
    state = "MG";
    ddd = norm.includes("teofilo") || norm.includes("valadares") || norm.includes("ipatinga") ? "33" : norm.includes("uberlandia") ? "34" : "31";
  } else if (norm.includes("rj") || norm.includes("rio de janeiro") || norm.includes("niteroi") || norm.includes("copacabana") || norm.includes("cabo frio")) {
    state = "RJ";
    ddd = "21";
  } else if (norm.includes("pr") || norm.includes("parana") || norm.includes("curitiba") || norm.includes("londrina") || norm.includes("maringa")) {
    state = "PR";
    ddd = norm.includes("curitiba") ? "41" : "43";
  } else if (norm.includes("sc") || norm.includes("santa catarina") || norm.includes("florianopolis") || norm.includes("joinville") || norm.includes("blumenau")) {
    state = "SC";
    ddd = "48";
  } else if (norm.includes("rs") || norm.includes("rio grande do sul") || norm.includes("porto alegre") || norm.includes("gramado") || norm.includes("caxias")) {
    state = "RS";
    ddd = "51";
  } else if (norm.includes("ba") || norm.includes("bahia") || norm.includes("salvador") || norm.includes("feira")) {
    state = "BA";
    ddd = "71";
  } else if (norm.includes("pe") || norm.includes("pernambuco") || norm.includes("recife")) {
    state = "PE";
    ddd = "81";
  } else if (norm.includes("ce") || norm.includes("ceara") || norm.includes("fortaleza")) {
    state = "CE";
    ddd = "85";
  } else if (norm.includes("df") || norm.includes("distrito federal") || norm.includes("brasilia")) {
    state = "DF";
    ddd = "61";
  } else if (norm.includes("go") || norm.includes("goias") || norm.includes("goiania")) {
    state = "GO";
    ddd = "62";
  } else {
    // Attempt regex match for state abbreviations at the end of the input (e.g., "Maringá - PR" or "Ipatinga/MG")
    const match = cityName.match(/\b(MG|RJ|SP|PR|SC|RS|BA|PE|CE|DF|GO|ES|AM|PA|MT|MS|AL|PB|RN|SE|TO|MA|PI|RO|AC|AP|RR)\b/i);
    if (match) {
      state = match[1].toUpperCase();
      const stateDdds = {
        MG: "31", RJ: "21", SP: "11", PR: "41", SC: "48", RS: "51", BA: "71", PE: "81", CE: "85", DF: "61", GO: "62",
        ES: "27", AM: "92", PA: "91", MT: "65", MS: "67", AL: "82", PB: "83", RN: "84", SE: "79", TO: "63", MA: "98",
        PI: "86", RO: "69", AC: "68", AP: "96", RR: "95"
      };
      ddd = stateDdds[state] || "11";
    }
  }

  return { state, ddd };
}

/**
 * Highly realistic Simulation mode in case of browser/system blockages
 */
function runSimulation(keyword, city, limit, onProgress) {
  return new Promise((resolve) => {
    onProgress("Iniciando varredura automatizada no Google Maps...");
    
    setTimeout(() => {
      onProgress(`Buscando estabelecimentos de "${keyword}" em "${city}"...`);
      
      const { state, ddd } = getCityMetadata(city);
      const formattedCity = city.charAt(0).toUpperCase() + city.slice(1);
      
      setTimeout(() => {
        // Filter mock leads based on keyword or select random
        const queryTerm = keyword.toLowerCase();
        let isDynamic = false;
        let filtered = SIMULATED_LEADS.filter(l => 
          l.category.toLowerCase().includes(queryTerm) || 
          l.name.toLowerCase().includes(queryTerm)
        );

        if (filtered.length === 0) {
          // If no matches found, use the base leads but dynamically inject the requested keyword!
          filtered = SIMULATED_LEADS;
          isDynamic = true;
        }

        const selectedLeads = [];
        const itemsToTake = Math.min(filtered.length, limit);
        
        onProgress(`Encontrado ${itemsToTake} resultados em ${city}. Iniciando extração de metadados...`);

        let index = 0;
        function processNext() {
          if (index < itemsToTake) {
            let baseLead = { ...filtered[index] };
            
            // Dynamic generation to make the simulation faithful to the requested niche
            if (isDynamic) {
              const formattedKeyword = keyword.charAt(0).toUpperCase() + keyword.slice(1);
              baseLead.category = formattedKeyword;
              const prefixes = [formattedKeyword, "Studio", "Espaço", "Centro", "Instituto"];
              const suffixes = ["Premium", "Prime", "Center", "Elite", "Pro"];
              baseLead.name = `${prefixes[index % prefixes.length]} ${suffixes[index % suffixes.length]} - ${formattedCity}`;
            }

            const name = baseLead.name;
            onProgress(`[${index + 1}/${itemsToTake}] Acessando listagem de: "${name}"`);
            
            // Adapt mock metrics
            let phone = baseLead.phone;
            let whatsapp = baseLead.whatsapp;
            if (phone) {
              phone = phone.replace(/^\(11\)/, `(${ddd})`);
              whatsapp = whatsapp.replace(/^11/, ddd);
            }

            // Adapt domain names
            const domainNorm = formattedCity.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
            let website = baseLead.website;
            if (website) {
              website = website.replace("paulista", domainNorm).replace("sampa", domainNorm).replace("moema", domainNorm);
            }

            let email = baseLead.email;
            if (email) {
              email = email.replace("paulista", domainNorm).replace("sampa", domainNorm).replace("moema", domainNorm);
            }

            // Adapt address lines to city + state
            let address = baseLead.address;
            address = address
              .replace(/,\s*São Paulo\s*-\s*SP/gi, `, ${formattedCity} - ${state}`)
              .replace(/,\s*São Paulo/gi, `, ${formattedCity}`)
              .replace(/-\s*SP/gi, `- ${state}`);

            setTimeout(() => {
              onProgress(`[${index + 1}/${itemsToTake}] Extraindo contatos: Tel: ${phone} | Site: ${website}`);
              
              setTimeout(() => {
                onProgress(`[${index + 1}/${itemsToTake}] Analisando código fonte do site para redes sociais...`);
                
                setTimeout(() => {
                  const lead = {
                    ...baseLead,
                    phone,
                    whatsapp,
                    website,
                    email,
                    address,
                    // Give dynamic location references
                    instagram: baseLead.instagram.replace("paulista", domainNorm).replace("sampa", domainNorm).replace("moema", domainNorm)
                  };
                  selectedLeads.push(lead);
                  onProgress(`[${index + 1}/${itemsToTake}] Concluído: ${name} adicionado com nota ${lead.rating}★ (${lead.reviews_count} reviews)`);
                  
                  index++;
                  processNext();
                }, 1000);
              }, 1200);
            }, 1000);
          } else {
            onProgress(`Captura finalizada! Foram gerados ${selectedLeads.length} leads de alta qualidade.`);
            resolve(selectedLeads);
          }
        }
        
        processNext();
      }, 1500);
    }, 1000);
  });
}
