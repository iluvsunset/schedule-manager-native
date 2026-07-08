
const fs = require('fs');
const path = require('path');
const { admin } = require('./_utils');

module.exports = async function(req, res) {
  const { query, lat, lng } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Missing 'query' parameter in request body." });
  }

  // Do not try to scrape Google Calendar event links as Places!
  if (query.includes('google.com/calendar/event')) {
    return res.status(200).json({ error: "Calendar Link Skipped" });
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
    const puppeteer = (await import('puppeteer-core')).default;
    browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${token}`,
      protocolTimeout: 40000
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    
    // Check if the query is a direct Google Maps URL
    const isUrl = query.startsWith('http://') || query.startsWith('https://');
    
    let searchUrl;
    const targetLat = lat || '10.7769';
    const targetLng = lng || '106.7009';
    if (isUrl) {
      searchUrl = query;
    } else {
      let finalQuery = query;
      const lowerQuery = query.toLowerCase();
      // Append Vietnam bias suffix if not already present AND coords are NOT provided
      if (!lat && !lng && !lowerQuery.includes('vietnam')) {
        finalQuery = `${query}, Vietnam`;
      }
      
      // Load Google Maps search
      searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(finalQuery)}`;
    }
    
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
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

    // Wait dynamically for redirection to single match place page OR for list view cards to render
    console.log("[Google Maps Scraper] Waiting for redirection or list view...");
    let isSingleMatch = false;
    let isListView = false;
    
    // Initial sleep to allow page to load and begin redirection before any socket polling
    await new Promise(resolve => setTimeout(resolve, 3500));
    
    const startTime = Date.now();
    while (Date.now() - startTime < 12000) {
      const currentUrl = page.url();
      if (currentUrl.includes('/maps/place/')) {
        isSingleMatch = true;
        break;
      }
      
      try {
        const hasCards = await page.evaluate(() => {
          return document.querySelectorAll('a[href*="/maps/place/"]').length > 0;
        });
        if (hasCards) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          const checkUrl = page.url();
          if (checkUrl.includes('/maps/place/')) {
            isSingleMatch = true;
          } else {
            isListView = true;
          }
          break;
        }
      } catch (evalErr) {
        console.log("[Google Maps Scraper] Polling evaluate warning:", evalErr.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Check if redirect occurred to maps/place/ (Single result or URL lookup)
    if (isSingleMatch || isUrl || (!isListView && page.url().includes('/maps/place/'))) {
      let details;
      let retries = 3;
      while (retries > 0) {
        try {
          details = await page.evaluate(() => {
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
                   s.includes('lh4.google') ||
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

               const rawList = Array.from(found).filter(url => {
                 // Filter out small icons, avatars, and tiny thumbnails
                 if (/=s(2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-4]|[1-9])([^0-9]|$)/.test(url)) return false;
                 if (url.includes('/a-/') || url.includes('/avatar')) return false;
                 return true;
               });

               // Tier 1: User-uploaded Google Photos contributions (best quality)
               const gpsPhotos = rawList.filter(url =>
                 (url.includes('gps-cs') || url.includes('gps-proxy')) &&
                 (url.includes('googleusercontent.com') || url.includes('lh3.google'))
               );
               // Tier 2: Other googleusercontent place photos (may be auto-generated)
               const otherGooglePhotos = rawList.filter(url =>
                 !url.includes('streetviewpixels') &&
                 !gpsPhotos.includes(url) &&
                 (url.includes('googleusercontent.com') ||
                  url.includes('lh3.google') ||
                  url.includes('lh4.google') ||
                  url.includes('lh5.google') ||
                  url.includes('lh6.google'))
               );
               // Tier 3: Streetview (lowest priority)
               const streetviewPhotos = rawList.filter(url => url.includes('streetviewpixels'));
               const sortedList = [...gpsPhotos, ...otherGooglePhotos, ...streetviewPhotos];

               // Upscale all images to crisp high resolution (800x600)
               return sortedList.map(s => {
                 let url = s;
                 if (url.includes('googleusercontent.com') || url.includes('lh3.google') || url.includes('lh4.google') || url.includes('lh5.google') || url.includes('lh6.google')) {
                   url = url.replace(/=w\d+-h\d+[^&]*/g, '=w800-h600');
                   url = url.replace(/=s\d+[^&]*/g, '=w800-h600');
                   if (!url.includes('=w') && !url.includes('=s')) {
                     url = url + '=w800-h600';
                   }
                 } else if (url.includes('streetviewpixels')) {
                   url = url.replace(/([&?])w=\d+/g, '$1w=800');
                   url = url.replace(/([&?])h=\d+/g, '$1h=600');
                 }
                 return url;
               });
             })();
               
            const mainImage = images.length > 0 ? images[0] : null;
            
            return { title, address, image: mainImage, images: images.slice(0, 5), summary, rating, reviews, category, website, phone };
          });
          break;
        } catch (evalErr) {
          if (evalErr.message.includes('detached Frame') || evalErr.message.includes('Execution context was destroyed')) {
            console.log(`[Google Maps Scraper] Details page evaluation failed (detached frame / context destroyed), retrying... (${retries} left)`);
            retries--;
            await new Promise(resolve => setTimeout(resolve, 1500));
          } else {
            throw evalErr;
          }
        }
      }
      if (!details) {
        throw new Error("Failed to evaluate details page content after multiple retries due to frame detachment.");
      }

      console.log(`[Google Maps Scraper] Single Match: "${details.title}" | Address: "${details.address}" | Summary: "${details.summary}"`);
      
      // Parse exact place coordinates using multiple strategies
      let parsedLat = null;
      let parsedLng = null;
      const isDefaultCoord = (lat, lng) => (Math.abs(lat - 10.7769) < 0.001 && Math.abs(lng - 106.7009) < 0.001);
      try {
        const exactCoords = await page.evaluate(() => {
          const url = window.location.href;

          // Priority 1: !8m2!3d<lat>!4d<lng> — Google's exact place pin coordinates (most reliable)
          const p1Url = url.match(/!8m2!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
          if (p1Url) return { lat: parseFloat(p1Url[1]), lng: parseFloat(p1Url[2]), src: 'url-8m2' };

          // Priority 2: !8m2 pattern from DOM anchor hrefs
          const anchors = Array.from(document.querySelectorAll('a'));
          for (const a of anchors) {
            const href = a.getAttribute('href') || '';
            const m = href.match(/!8m2!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
            if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]), src: 'anchor-8m2' };
          }

          // Priority 3: @lat,lng from page URL (map viewport center — usually the place on detail pages)
          const p3 = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
          if (p3) return { lat: parseFloat(p3[1]), lng: parseFloat(p3[2]), src: 'url-at' };

          // Priority 4: Generic !3d/!4d from DOM anchors (least reliable — could match sidebar links)
          for (const a of anchors) {
            const href = a.getAttribute('href') || '';
            const m = href.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
            if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]), src: 'anchor-3d4d' };
          }

          // Priority 5: Generic !3d/!4d from page URL itself
          const p5 = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
          if (p5) return { lat: parseFloat(p5[1]), lng: parseFloat(p5[2]), src: 'url-3d4d' };

          return null;
        });

        if (exactCoords && !isDefaultCoord(exactCoords.lat, exactCoords.lng)) {
          parsedLat = exactCoords.lat;
          parsedLng = exactCoords.lng;
          console.log(`[Google Maps Scraper] Parsed coordinates (${exactCoords.src}): ${parsedLat}, ${parsedLng}`);
        }

        // Fallback: wait for URL to update if still at default coordinates, then re-parse @lat,lng
        if (!parsedLat || !parsedLng) {
          let pageUrl = page.url();
          const targetCoordsStr = `@10.7769,106.7009`;
          if (pageUrl.includes(targetCoordsStr) || !pageUrl.includes('@')) {
            console.log("[Google Maps Scraper] URL may not have settled yet, waiting for panning...");
            await new Promise(resolve => setTimeout(resolve, 3000));
            pageUrl = page.url();
          }
          
          const coordMatch = pageUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
          if (coordMatch) {
            const lat = parseFloat(coordMatch[1]);
            const lng = parseFloat(coordMatch[2]);
            if (!isDefaultCoord(lat, lng)) {
              parsedLat = lat;
              parsedLng = lng;
              console.log(`[Google Maps Scraper] Parsed coordinates from URL after wait: ${parsedLat}, ${parsedLng}`);
            }
          }
        }
        
        // Final fallback: meta tags (og:image / itemprop=image often embed center coordinates)
        if (!parsedLat || !parsedLng) {
          console.log("[Google Maps Scraper] Falling back to meta tags for coordinates...");
          const metaCoords = await page.evaluate(() => {
            const metas = [
              document.querySelector('meta[itemprop="image"]'),
              document.querySelector('meta[property="og:image"]')
            ].filter(Boolean);
            for (const meta of metas) {
              const content = meta.getAttribute('content') || '';
              const match = content.match(/center=(-?\d+\.\d+)[,%]2C(-?\d+\.\d+)/) || content.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
              if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
            }
            return null;
          });
          if (metaCoords && !isDefaultCoord(metaCoords.lat, metaCoords.lng)) {
            parsedLat = metaCoords.lat;
            parsedLng = metaCoords.lng;
            console.log(`[Google Maps Scraper] Parsed coordinates from meta tags: ${parsedLat}, ${parsedLng}`);
          }
        }
      } catch (urlErr) {
        console.warn("[Google Maps Scraper] Failed to parse coordinates:", urlErr.message);
      }

      // Generate ChatGPT-like detailed AI summary via Gemini
      let aiSummary = null;
      try {
        const promptText = `You are a place intelligence assistant. Given Google Maps place data below, output a strict JSON summary.

STRICT RULES (violation = bad output):
1. If you don't know a field's value with reasonable confidence, set it to null — NEVER write "not available", "not specified", "not provided", or any placeholder text.
2. "goodFor" must be SHORT activity tags (max 4 words each), like "Coffee with friends", "Study sessions", "Date spot". Never write a full sentence here.
3. "specialFeatures" must only include things you can be specific about. If you only know the rating, skip this field.
4. "chatgptSummary" must be 1-2 sentences describing what the place is. You MUST use the "Original Query" as the place's name. NEVER use the "Name" field as the place's name in your summary if it looks like an address (e.g. "2 Đống Đa"). Example: "The Coffee House is a local coffee shop in Tân Bình."
5. "summarySource" should be "Google Maps" unless you know a better source.
6. "openingHours" — if unknown, return null.
7. "priceRange" — if unknown, return null.

Place Data:
- Original Query: ${query}
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

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) throw new Error('GEMINI_API_KEY environment variable is not set');
        

        console.log(`[Google Maps Scraper] Generating Gemini AI place summary for: "${details.title}"`);
        
        const fallbackModels = [
          'gemini-3.5-flash',
          'gemini-3.1-flash-lite',
          'gemini-2.5-flash'
        ];

        let geminiRes;
        for (const modelName of fallbackModels) {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
          console.log(`[Google Maps Scraper] Trying model: ${modelName}...`);
          
          geminiRes = await fetch(geminiUrl, {
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
            break;
          } else {
            console.warn(`[Google Maps Scraper] Model ${modelName} failed with status: ${geminiRes.status} ${geminiRes.statusText}`);
            // Wait 1 second before trying the next fallback
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        if (geminiRes && geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            aiSummary = JSON.parse(rawText);
            console.log(`[Google Maps Scraper] Gemini AI summary generated successfully.`);
          }
        } else {
          console.error(`[Google Maps Scraper] All Gemini fallback models failed. Last error: ${geminiRes?.status} ${geminiRes?.statusText}`);
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
            summary: details.summary || null,
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
      let listResults;
      let retries = 3;
      while (retries > 0) {
        try {
          listResults = await page.evaluate(() => {
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
                summary: category || null,
                rating,
                category: category || "Location",
                website: null,
                phone: null
              });

              if (list.length >= 5) break;
            }

            return list;
          });
          break;
        } catch (evalErr) {
          if (evalErr.message.includes('detached Frame') || evalErr.message.includes('Execution context was destroyed')) {
            console.log(`[Google Maps Scraper] List page evaluation failed (detached frame / context destroyed), retrying... (${retries} left)`);
            retries--;
            await new Promise(resolve => setTimeout(resolve, 1500));
          } else {
            throw evalErr;
          }
        }
      }
      if (!listResults) {
        throw new Error("Failed to evaluate list page content after multiple retries due to frame detachment.");
      }

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
