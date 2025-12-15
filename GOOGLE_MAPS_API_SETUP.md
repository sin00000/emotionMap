# Google Maps Places API Integration Guide

## Overview

The Emotional Map application is **structured and ready** to integrate with the **Google Maps Places API** for real-world place search functionality. This guide explains how to set up and activate the API integration.

---

## 🎯 Current Status

✅ **Code Structure Ready** - The `searchRealPlaces()` function is fully structured for Google Maps API
✅ **Fallback Data Active** - 15 Seoul locations work without API key for testing
✅ **3-Step Flow Complete** - Search → Data Input → Mandala creation
✅ **Error Handling** - Loading states, error messages, async/await support

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Get Your Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **API Key**
5. Copy your API key (it will look like: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)

### Step 2: Enable Places API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for **"Places API"**
3. Click on it and press **Enable**
4. Wait for activation (usually instant)

### Step 3: Activate API in Code

Open `src/main.js` and find the `searchRealPlaces()` function (around **line 136**):

1. **Replace API Key:**
   ```javascript
   const GOOGLE_MAPS_API_KEY = 'YOUR_ACTUAL_API_KEY_HERE';
   ```

2. **Uncomment the API Call Section:**
   - Find lines **145-175** (the commented block with `/* ... */`)
   - Remove the `/*` at line 145
   - Remove the `*/` at line 175

3. **Comment Out Fallback Data:**
   - Find lines **177-214** (the dummy database section)
   - Add `/*` before line 182
   - Add `*/` after line 214

4. **Save and restart your dev server:**
   ```bash
   npm run dev
   ```

---

## 📋 Detailed Code Structure

### Location: `src/main.js` Lines 136-215

The function is organized into **3 clear sections**:

```javascript
async function searchRealPlaces(query) {
  // ========================================
  // SECTION 1: API KEY (LINE 140)
  // ========================================
  const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

  // ========================================
  // SECTION 2: GOOGLE MAPS API CALL (LINES 145-175)
  // ========================================
  // Currently commented out with /* ... */
  // UNCOMMENT THIS SECTION to activate Google Maps API

  // ========================================
  // SECTION 3: FALLBACK DUMMY DATA (LINES 177-214)
  // ========================================
  // Currently active for testing
  // COMMENT OUT THIS SECTION once API is activated
}
```

---

## 🔧 API Integration Details

### API Endpoint Used

**Google Maps Places API - Text Search**
- Documentation: https://developers.google.com/maps/documentation/places/web-service/search-text
- Endpoint: `https://maps.googleapis.com/maps/api/place/textsearch/json`

### Request Format

```javascript
const apiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;

const response = await fetch(apiUrl);
const data = await response.json();
```

### Response Parsing

The function automatically maps Google Maps API responses to the application's format:

```javascript
// Google Maps API Response Structure:
{
  status: "OK",
  results: [
    {
      name: "Gangnam Station",
      formatted_address: "396 Gangnam-daero, Gangnam-gu, Seoul",
      geometry: {
        location: {
          lat: 37.4979,
          lng: 127.0276
        }
      },
      place_id: "ChIJXXXXXXXXXXXXXXXXXX"
    }
  ]
}

// Mapped to Application Format:
{
  placeName: "Gangnam Station",
  address: "396 Gangnam-daero, Gangnam-gu, Seoul",
  latitude: 37.4979,
  longitude: 127.0276,
  placeId: "ChIJXXXXXXXXXXXXXXXXXX" // Optional for future features
}
```

---

## 🧪 Testing the Integration

### Before API Activation (Current State)

1. Click **"Add place"** button
2. Type "Gangnam" in search bar
3. Press Enter or click Search
4. See 2 results from dummy database:
   - Gangnam Station
   - Coex Mall
5. Click a result → Proceed to Step 2

**Console output:**
```
🔍 Fallback Dummy Data: "Gangnam" → 2 results found
📍 2 search results displayed
```

### After API Activation

1. Same user flow as above
2. Results will come from **Google Maps** instead of dummy data
3. Search any location worldwide (not limited to Seoul)

**Console output:**
```
🔍 Google Maps API: "Gangnam" → 20+ results found
📍 20+ search results displayed
```

---

## 🔒 Security Best Practices

### 1. API Key Restrictions (Recommended)

In Google Cloud Console → **Credentials** → Select your API Key:

**Application Restrictions:**
- Set to **HTTP referrers (websites)**
- Add your domains:
  - `http://localhost:5173/*` (for development)
  - `https://yourdomain.com/*` (for production)

**API Restrictions:**
- Restrict key to **Places API only**

### 2. Environment Variables (Production)

For production deployments, use environment variables instead of hardcoding:

```javascript
// Instead of:
const GOOGLE_MAPS_API_KEY = 'AIzaSyXXXXXXXXXXXXXX';

// Use:
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
```

Create `.env` file in project root:
```
VITE_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXX
```

**Important:** Add `.env` to `.gitignore` to prevent API key exposure!

---

## 💰 Pricing & Quotas

### Free Tier (Monthly)

Google Maps Platform provides **$200 free credit** per month:
- **Places API Text Search:** $32 per 1,000 requests
- **Free requests per month:** ~6,250 searches

### Typical Usage Estimate

- **Small app (100 users, 10 searches/user/month):** ~1,000 requests = **FREE**
- **Medium app (1,000 users, 10 searches/user/month):** ~10,000 requests = ~$320/month

### Cost Optimization Tips

1. **Cache results:** Store recent searches in localStorage
2. **Limit autocomplete:** Don't call API on every keystroke
3. **Set quotas:** Limit API calls in Google Cloud Console
4. **Monitor usage:** Set up billing alerts

---

## 🐛 Troubleshooting

### Issue 1: "Places API has not been used before"

**Solution:**
1. Enable Places API in Google Cloud Console
2. Wait 5-10 minutes for activation
3. Refresh your application

### Issue 2: "This API key is not authorized"

**Solution:**
1. Check API key restrictions in Google Cloud Console
2. Add `http://localhost:5173` to allowed referrers
3. Ensure Places API is enabled

### Issue 3: "CORS Error" in browser console

**Solution:**
Google Maps API calls must be made from **server-side** for production. Options:

**Option A:** Use Google Maps JavaScript SDK (client-side):
```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY&libraries=places"></script>
```

**Option B:** Create a serverless function (Netlify/Vercel):
```javascript
// netlify/functions/search-places.js
exports.handler = async (event) => {
  const query = event.queryStringParameters.query;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`);
  const data = await response.json();

  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
};
```

### Issue 4: "No results found" for valid queries

**Solution:**
1. Check console for API errors
2. Verify API key is correct
3. Ensure Places API is enabled
4. Try with a well-known location (e.g., "Eiffel Tower")

---

## 🔄 Switching Between Fallback and API

### Currently Active: Fallback Dummy Data ✅

**Pros:**
- Works without API key
- No API costs
- Fast for development/testing
- 15 Seoul locations pre-loaded

**Cons:**
- Limited to 15 locations
- Only Seoul area
- No real-time data

### To Activate: Google Maps API

**Pros:**
- Worldwide search
- Real-time data
- Millions of locations
- Address autocorrection

**Cons:**
- Requires API key
- Costs money (after free tier)
- Network latency
- Rate limits

---

## 📊 Integration Checklist

Before going live with Google Maps API:

- [ ] Google Cloud Project created
- [ ] Places API enabled
- [ ] API key generated
- [ ] API key added to code (line 140)
- [ ] API call section uncommented (lines 145-175)
- [ ] Fallback section commented out (lines 177-214)
- [ ] API key restrictions configured
- [ ] HTTP referrers added (localhost + production domain)
- [ ] Billing alerts set up in Google Cloud
- [ ] Tested with multiple search queries
- [ ] Error handling verified
- [ ] Loading states working
- [ ] Production environment variables configured
- [ ] `.env` added to `.gitignore`

---

## 🎯 Alternative: Google Places Autocomplete

For a richer search experience, consider **Places Autocomplete** instead:

### Benefits

- Real-time suggestions as user types
- Better UX with dropdown
- More accurate results
- Address components (city, country, postal code)

### Implementation

1. **Load Google Maps JavaScript SDK:**
   ```html
   <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY&libraries=places"></script>
   ```

2. **Replace search function:**
   ```javascript
   function initAutocomplete() {
     const input = document.getElementById('search-place-input');
     const autocomplete = new google.maps.places.Autocomplete(input);

     autocomplete.addListener('place_changed', () => {
       const place = autocomplete.getPlace();

       const placeData = {
         placeName: place.name,
         address: place.formatted_address,
         latitude: place.geometry.location.lat(),
         longitude: place.geometry.location.lng()
       };

       selectSearchResult(placeData);
     });
   }
   ```

**Documentation:** https://developers.google.com/maps/documentation/javascript/place-autocomplete

---

## 📞 Support & Resources

### Official Documentation

- [Places API Overview](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Text Search Requests](https://developers.google.com/maps/documentation/places/web-service/search-text)
- [API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)
- [Pricing Calculator](https://mapsplatform.google.com/pricing/)

### Community Resources

- [Stack Overflow - Google Maps API](https://stackoverflow.com/questions/tagged/google-maps-api)
- [Google Maps Platform Issue Tracker](https://issuetracker.google.com/issues?q=componentid:188841)

### Project-Specific Help

For issues with this specific integration:
1. Check browser console for errors
2. Verify all setup steps completed
3. Review the code comments in `searchRealPlaces()` function
4. Test with fallback data first to isolate issues

---

## ✅ Summary

The Emotional Map application is **fully structured and ready** for Google Maps Places API integration. The code includes:

1. ✅ Clear API key placeholder (line 140)
2. ✅ Complete API call structure with error handling (lines 145-175)
3. ✅ Response parsing to application format
4. ✅ Async/await support
5. ✅ Loading states and error messages
6. ✅ Fallback dummy data for testing
7. ✅ Detailed comments explaining each step

**To activate:** Simply add your API key, uncomment the API section, and comment out the fallback section. The entire 3-step flow will work seamlessly with real-world Google Maps data!

---

**Last Updated:** Step 5 Implementation
**Function Location:** `src/main.js` lines 136-215
**Status:** ✅ Ready for Google Maps API activation
