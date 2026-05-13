import { logger } from './logger.js';

/**
 * Scrapes a website's homepage to find emails, instagram handles, and potential whatsapp lines
 * @param {string} url - The URL of the website to scrape
 * @returns {Promise<{instagram: string, email: string, phone: string}>}
 */
export async function enrichLead(url) {
  const result = { instagram: '', email: '', phone: '' };
  
  if (!url) return result;
  
  // Format URL correctly
  let targetUrl = url;
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000); // 4 seconds timeout

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3'
      }
    });
    
    clearTimeout(id);

    if (!response.ok) {
      return result;
    }

    const html = await response.text();

    // 1. Scan for Instagram
    // Look for hrefs or text like instagram.com/username
    const instaRegex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_\.]+)/gi;
    const instaMatches = [...html.matchAll(instaRegex)];
    if (instaMatches.length > 0) {
      // Avoid matches that are common layout pages or buttons
      const ignoreWords = ['p', 'explore', 'developer', 'about', 'legal', 'terms', 'privacy', 'direct', 'stories', 'reels', 'tags'];
      for (const match of instaMatches) {
        const handle = match[1]?.replace(/\/$/, ''); // strip trailing slash
        if (handle && !ignoreWords.includes(handle.toLowerCase())) {
          result.instagram = `@${handle}`;
          break;
        }
      }
    }

    // 2. Scan for Email
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
    const emailMatches = html.match(emailRegex);
    if (emailMatches && emailMatches.length > 0) {
      // Filter out typical false positives/assets
      const filteredEmails = emailMatches.filter(email => {
        const lower = email.toLowerCase();
        return !lower.endsWith('.png') && 
               !lower.endsWith('.jpg') && 
               !lower.endsWith('.jpeg') && 
               !lower.endsWith('.gif') &&
               !lower.endsWith('sentry.io') &&
               !lower.endsWith('bootstrap.com');
      });
      if (filteredEmails.length > 0) {
        result.email = filteredEmails[0].toLowerCase();
      }
    }

    // 3. Scan for WhatsApp links
    const waRegex = /(?:wa\.me|api\.whatsapp\.com\/send\?phone=)(\d+)/i;
    const waMatch = html.match(waRegex);
    if (waMatch && waMatch[1]) {
      result.phone = waMatch[1];
    }

    return result;

  } catch (error) {
    logger.error(`Failed to enrich contacts from: ${url}`, { message: error.message });
    return result;
  }
}
