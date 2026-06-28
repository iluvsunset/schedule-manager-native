const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { admin } = require('./_utils');

module.exports = async function(req, res) {
  const { query, lat, lng } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Missing 'query' parameter in request body." });
  }

  const cacheKey = query.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  const db = admin ? admin.firestore() : null;

  if (db) {
    try {
      const cacheDoc = await db.collection('places_cache').doc(cacheKey).get();
      if (cacheDoc.exists) {
        const cachedData = cacheDoc.data();
        const cacheAgeMs = Date.now() - (cachedData.cachedAt ? cachedData.cachedAt.toMillis() : 0);
        // If cached within the last 14 days, return it instantly!
        if (cacheAgeMs < 14 * 24 * 60 * 60 * 1000) {
          console.log(`[Google Maps Scraper] [CACHE HIT] Returning cached results for query: "${query}"`);
          return res.status(200).json(cachedData.payload);
        }
      }
    } catch (cacheErr) {
      console.warn(`[Google Maps Scraper] Cache read failed:`, cacheErr.message);
    }
  }

  const token = process.env.BROWSERLESS_API_TOKEN;
  if (!token) {
    return res.status(500).json({ 
      error: "Browserless API token not configured", 
      message: "Please add BROWSERLESS_API_TOKEN=\"your_token\" to your .env.local file and restart the server." 
    });
  }

  console.log(`[Google Maps Scraper] Searching for query: "${query}"`);
  
  let browser;
  try {
    browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${token}`
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    
    // Check if the query is a direct Google Maps URL
    const isUrl = query.startsWith('http://') || query.startsWith('https://');
    
    let searchUrl;
    if (isUrl) {
      searchUrl = query;
    } else {
      let finalQuery = query;
      const lowerQuery = query.toLowerCase();
      // Append HCMC, Vietnam bias suffix if not already present AND coords are NOT provided
      if (!lat && !lng && !lowerQuery.includes('ho chi minh') && !lowerQuery.includes('hcm') && !lowerQuery.includes('vietnam')) {
        finalQuery = `${query}, Ho Chi Minh City, Vietnam`;
      }
      
      const targetLat = lat || '10.7769';
      const targetLng = lng || '106.7009';
      // Load Google Maps search centered on the target coordinates at a zoom of 14z
      searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(finalQuery)}/@${targetLat},${targetLng},14z`;
    }
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Check for and bypass Google Cookie Consent page
    const consentClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const consentBtn = buttons.find(b => {
        const text = b.textContent.trim().toLowerCase();
        return text === 'accept all' || text === 'i agree' || text === 'agree' || text === 'accept' || text === 'consentire' || text === 'ich stimme zu';
      });
      if (consentBtn) {
        consentBtn.click();
        return true;
      }
      return false;
    });

    if (consentClicked) {
      console.log("[Google Maps Scraper] Clicked Cookie Consent. Waiting for redirection...");
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Wait for the primary map UI, h1, or list cards to hydrate
    try {
      await page.waitForSelector('h1, a[href*="/maps/place/"], [data-item-id="address"]', { timeout: 8000 });
    } catch (e) {
      console.log("[Google Maps Scraper] Timeout waiting for map selectors, proceeding anyway...");
    }

    // Save a screenshot for debugging
    const scratchDir = path.join(__dirname, '../scratch');
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }
    await page.screenshot({ path: path.join(scratchDir, 'maps_debug.png') });
    
    let currentUrl = page.url();

    // Check if redirect occurred to maps/place/ (Single result or URL lookup)
    if (currentUrl.includes('/maps/place/') || isUrl) {
      const details = await page.evaluate(() => {
        const addressEl = document.querySelector('[data-item-id="address"]');
        const address = addressEl ? addressEl.textContent.trim().replace(/^/, '').trim() : null;
        
        const titleEl = document.querySelector('h1');
        const title = titleEl ? titleEl.textContent.trim() : null;
        
        // Editorial Summary
        const summaryEl = document.querySelector('.PYv89e, [class*="editorial"]');
        const summary = summaryEl ? summaryEl.textContent.trim().replace(/^“|”$/g, '') : null;

        // Rating and reviews
        const ratingEl = document.querySelector('.F7nice span[aria-hidden="true"]');
        const rating = ratingEl ? ratingEl.textContent.trim() : null;
        
        const reviewsEl = document.querySelector('.F7nice button');
        const reviews = reviewsEl ? reviewsEl.textContent.trim().replace(/[()]/g, '') : null;

        // Category
        const categoryEl = document.querySelector('button[jsaction="pane.rating.category"]');
        const category = categoryEl ? categoryEl.textContent.trim() : null;

        // Website
        const websiteEl = document.querySelector('a[data-item-id="authority"]');
        const website = websiteEl ? websiteEl.getAttribute('href') : null;

        // Phone
        const phoneEl = document.querySelector('[data-item-id*="phone"]');
        const phone = phoneEl ? phoneEl.textContent.replace(/[^\d+ ]/g, '').trim() : null;

        const images = (() => {
          const found = new Set();
          // Grab all img tags with googleusercontent (place photos)
          document.querySelectorAll('img').forEach(img => {
            const s = img.src || img.getAttribute('src') || '';
            if (s && (
              s.includes('googleusercontent.com') ||
              s.includes('lh3.google') ||
              s.includes('lh5.google') ||
              s.includes('lh6.google') ||
              s.includes('streetviewpixels')
            ) && !s.includes('=s20') && !s.includes('=s40') && s.length > 60) {
              found.add(s);
            }
          });
          // Also check background-image styles on photo divs
          document.querySelectorAll('[style*="googleusercontent"]').forEach(el => {
            const m = el.style.backgroundImage.match(/url\("?([^")]+)"?\)/);
            if (m && m[1]) found.add(m[1]);
          });
          return Array.from(found);
        })();
          
        const mainImage = images.length > 0 ? images[0] : null;
        
        return { title, address, image: mainImage, images: images.slice(0, 5), summary, rating, reviews, category, website, phone };
      });

      console.log(`[Google Maps Scraper] Single Match: "${details.title}" | Address: "${details.address}" | Summary: "${details.summary}"`);
      
      // Parse coordinates from final page URL
      let parsedLat = null;
      let parsedLng = null;
      try {
        const pageUrl = page.url();
        const coordMatch = pageUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (coordMatch) {
          parsedLat = parseFloat(coordMatch[1]);
          parsedLng = parseFloat(coordMatch[2]);
        }
      } catch (urlErr) {
        console.warn("Failed to parse coordinates from page URL:", urlErr.message);
      }

      // Generate ChatGPT-like detailed AI summary via Gemini
      let aiSummary = null;
      try {
        const promptText = `You are a place intelligence assistant. Given Google Maps place data below, output a strict JSON summary.

STRICT RULES (violation = bad output):
1. If you don't know a field's value with reasonable confidence, set it to null — NEVER write "not available", "not specified", "not provided", or any placeholder text.
2. "goodFor" must be SHORT activity tags (max 4 words each), like "Coffee with friends", "Study sessions", "Date spot". Never write a full sentence here.
3. "specialFeatures" must only include things you can be specific about. If you only know the rating, skip this field.
4. "chatgptSummary" must be 1-2 sentences describing what the place is, similar to: "Cheese Coffee Hoa Lan is a local coffee shop in Cầu Kiệu, Hồ Chí Minh."
5. "summarySource" should be "Google Maps" unless you know a better source.
6. "openingHours" — if unknown, return null.
7. "priceRange" — if unknown, return null.

Place Data:
- Name: ${details.title}
- Address: ${details.address}
- Category: ${details.category || 'Coffee shop / Café'}
- Rating: ${details.rating || 'N/A'} stars
- Description: ${details.summary || 'No description scraped'}

Output JSON format (all fields optional except chatgptSummary):
{
  "chatgptSummary": "string",
  "summarySource": "string",
  "specialFeatures": [
    { "text": "specific feature", "source": "source name" }
  ],
  "openingHours": "string or null",
  "priceRange": "string or null",
  "goodFor": ["short tag 1", "short tag 2"]
}`;

        const geminiKey = process.env.GEMINI_API_KEY || 'AIzaSyCj1JSrfBvh_S-hfruyWLqgV6f-Cjc312M';
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`;
        
        console.log(`[Google Maps Scraper] Generating Gemini AI place summary for: "${details.title}"`);
        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: promptText }]
            }],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            aiSummary = JSON.parse(rawText);
            console.log(`[Google Maps Scraper] Gemini AI summary generated successfully.`);
          }
        } else {
          console.error(`[Google Maps Scraper] Gemini API error: ${geminiRes.status} ${geminiRes.statusText}`);
        }
      } catch (geminiErr) {
        console.error(`[Google Maps Scraper] Failed to call Gemini API:`, geminiErr.message);
      }

      const payload = {
        results: [
          {
            title: details.title || (isUrl ? "Verified Location" : query),
            address: details.address || "Address not found on Google Maps",
            image: details.image || null,
            images: details.images || [],
            summary: details.summary || "No description available",
            rating: details.rating || null,
            reviews: details.reviews || null,
            category: details.category || "Location",
            website: details.website || null,
            phone: details.phone || null,
            latitude: parsedLat,
            longitude: parsedLng,
            aiSummary: aiSummary
          }
        ]
      };

      if (db) {
        try {
          await db.collection('places_cache').doc(cacheKey).set({
            query: query,
            payload: payload,
            cachedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`[Google Maps Scraper] [CACHE WRITE] Cached single match for query: "${query}"`);

          // Also write an alias keyed by the resolved street address so that
          // any other event pointing to the same physical location gets an
          // instant cache hit — regardless of event name.
          if (details.address && details.address !== query) {
            const addressKey = details.address.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
            if (addressKey !== cacheKey) {
              await db.collection('places_cache').doc(addressKey).set({
                query: details.address,
                payload: payload,
                cachedAt: admin.firestore.FieldValue.serverTimestamp()
              });
              console.log(`[Google Maps Scraper] [CACHE ALIAS] Also cached by resolved address: "${details.address}"`);
            }
          }
        } catch (cacheWriteErr) {
          console.warn(`[Google Maps Scraper] Cache write failed:`, cacheWriteErr.message);
        }
      }

      return res.status(200).json(payload);
    } else {
      // Multiple search results in list view
      const listResults = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
        const list = [];
        const seenTitles = new Set();

        for (const card of cards) {
          const title = card.getAttribute('aria-label') || card.textContent.trim();
          if (!title || seenTitles.has(title)) continue;
          seenTitles.add(title);

          // Resolve outer container card
          let parent = card.parentElement;
          for (let i = 0; i < 5; i++) {
            if (parent && (parent.classList.contains('Nv2yCc') || parent.getAttribute('role') === 'article' || parent.classList.contains('UaAd6b'))) {
              break;
            }
            if (parent && parent.parentElement) {
              parent = parent.parentElement;
            }
          }

          // Extract Address details
          let address = null;
          if (parent) {
            const detailLines = Array.from(parent.querySelectorAll('.W4Efsd'));
            const addressTexts = detailLines
              .map(el => el.textContent.trim())
              .filter(txt => txt.length > 5 && !txt.includes('★') && !txt.includes('rating') && !txt.includes('reviews'));
            
            if (addressTexts.length > 0) {
              const combinedText = addressTexts.join(' · ');
              const segments = combinedText.split('·').map(s => s.trim());
              const cleanSegments = segments.filter(seg => {
                const sLower = seg.toLowerCase();
                if (seg.includes('') || seg.includes('')) return false;
                if (sLower.includes('open') || sLower.includes('close') || sLower.includes('temporarily')) return false;
                if (sLower.includes('delivery') || sLower.includes('dine-in') || sLower.includes('takeout')) return false;
                if (/^\+?\d[\d\s-]{8,}$/.test(seg)) return false;
                if (sLower === 'coffee shop' || sLower === 'cafe' || sLower === 'restaurant' || sLower === 'store' || sLower === 'office') return false;
                return seg.length > 2;
              });

              if (cleanSegments.length > 0) {
                address = cleanSegments[0]
                  .replace(/Open$/, '')
                  .replace(/Closed$/, '')
                  .replace(/Closes\s+\d+.*$/, '')
                  .trim();
              }
            }
          }

          // Fallback to text walker if details missing
          if (!address && parent) {
            const textNodes = [];
            const walk = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walk.nextNode()) {
              const t = node.textContent.trim();
              if (t.length > 5 && !t.includes(title) && !t.includes('★') && !t.includes('Open') && !t.includes('Closed')) {
                textNodes.push(t);
              }
            }
            if (textNodes.length > 0) {
              address = textNodes[0].replace(/^·/, '').trim();
            }
          }

          // Extract Rating and Category
          let rating = null;
          let category = null;
          if (parent) {
            const ratingSpan = parent.querySelector('span[aria-label*="stars"]');
            if (ratingSpan) {
              const m = ratingSpan.getAttribute('aria-label').match(/^([\d.]+)\s+stars/);
              rating = m ? m[1] : null;
            }

            const detailLines = Array.from(parent.querySelectorAll('.W4Efsd'));
            if (detailLines.length > 0) {
              const parts = detailLines[0].textContent.trim().split('·').map(p => p.trim());
              category = parts[0] !== title ? parts[0] : (parts[1] || 'Location');
            }
          }

          // Extract Thumbnail Image and convert to mid-res card size
          let image = null;
          if (parent) {
            const imgEl = parent.querySelector('img');
            if (imgEl && imgEl.src && (imgEl.src.includes('googleusercontent.com') || imgEl.src.includes('streetviewpixels'))) {
              image = imgEl.src.replace(/=w\d+-h\d+/, '=w300-h200');
            }
          }

          list.push({
            title,
            address: address || "Address not found on Google Maps",
            image,
            summary: category || "No description available",
            rating,
            category: category || "Location",
            website: null,
            phone: null
          });

          if (list.length >= 5) break;
        }

        return list;
      });

      const payload = { results: listResults };

      if (db && listResults.length > 0) {
        try {
          await db.collection('places_cache').doc(cacheKey).set({
            query: query,
            payload: payload,
            cachedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`[Google Maps Scraper] [CACHE WRITE] Cached list match for query: "${query}"`);
        } catch (cacheWriteErr) {
          console.warn(`[Google Maps Scraper] Cache write failed:`, cacheWriteErr.message);
        }
      }

      return res.status(200).json(payload);
    }

  } catch (err) {
    console.error(`[Google Maps Scraper] Error:`, err);
    return res.status(500).json({ error: "Failed to scrape Google Maps details", details: err.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
