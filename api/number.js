require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { parsePhoneNumberWithError } = require('libphonenumber-js/max');

const app = express();

// Security and CORS middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Footer constants (Ei footer protita response-e thakbe)
const API_FOOTER = {
  api_by: "@username_506",
  developer: "@app_code_craft",
  credit: "@codeify_owner"
};

// Rate Limiter: 15 minute e 100 requests per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  handler: (req, res) => {
    res.status(429).json({
      status: false,
      message: "Too many requests, please try again later.",
      ...API_FOOTER
    });
  }
});

app.use(limiter);

// Helper function: Veriphone API theke Carrier ebong Timezone data anar jonno
const getCarrierAndTimezone = async (phoneNumber, apiKey) => {
  if (apiKey) {
    try {
      // Veriphone API te live request kora hocche
      const res = await fetch(
        'https://api.veriphone.io/v2/verify?' + new URLSearchParams({
          key: apiKey,         // Vercel / .env theke EXTERNAL_API_KEY asbe
          phone: phoneNumber,  
        })
      );
      
      const data = await res.json();
      
      // Jodi API thikvabe data dey
      if (data && data.status === 'success') {
        return {
          carrier: data.carrier || "Unknown",
          timezone: data.phone_region || "Unknown"
        };
      }
    } catch (error) {
      console.error("Veriphone API Error:", error.message);
    }
  }
  
  // Fallback: Jodi API Key na thake ba kono issue hoy
  return {
    carrier: "Unknown",
    timezone: "Unknown"
  };
};

// Main Endpoint
app.get('/api/number', async (req, res, next) => {
  // Response time count shuru hocche
  const start = process.hrtime();

  try {
    let { number } = req.query;

    // Number pass na korle error dibe
    if (!number) {
      const error = new Error("Invalid phone number.");
      error.status = 400;
      throw error;
    }

    // User jodi '+' sign chara number dey, tobe auto '+' boshiye nibe
    number = number.trim();
    if (!number.startsWith('+')) {
      number = '+' + number;
    }

    // Number validate abong parse kora hocche
    const parsedNumber = parsePhoneNumberWithError(number);
    
    // Number er format/desh invalid hole error dibe
    if (!parsedNumber.isValid()) {
      const error = new Error("Invalid phone number.");
      error.status = 400;
      throw error;
    }

    // Number theke Desher nam (Country Name) ber kora hocche
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const countryName = regionNames.of(parsedNumber.country) || "Unknown";
    
    // Veriphone theke asol SIM Carrier ebong Region fetch kora hocche
    const extraInfo = await getCarrierAndTimezone(number, process.env.EXTERNAL_API_KEY);

    // Response time hisab kora hocche (ms)
    const diff = process.hrtime(start);
    const responseTime = `${Math.round((diff[0] * 1e9 + diff[1]) / 1e6)}ms`;

    // Line Type ke sundor format e (Mobile, Landline) kora hocche
    const rawLineType = parsedNumber.getType();
    const lineType = rawLineType ? rawLineType.charAt(0) + rawLineType.slice(1).toLowerCase() : "Unknown";

    // Final Success Response return kora hocche
    return res.status(200).json({
      status: true,
      number: parsedNumber.formatInternational().replace(/\s/g, ''), // Spaces remove kora hocche (+919999999999)
      country: countryName,
      country_code: parsedNumber.country,
      carrier: extraInfo.carrier,
      line_type: lineType,
      timezone: extraInfo.timezone,
      valid: true,
      response_time: responseTime,
      ...API_FOOTER // Apnar deya details add kora holo
    });

  } catch (error) {
    next(error);
  }
});

// Global Error Handling Middleware (Bhul korle ei msg jabe)
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    status: false,
    message: err.message || "Invalid phone number.",
    ...API_FOOTER
  });
});

// Local Computer e run korar jonno (Vercel e eta skip hoye jabe)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Vercel Serverless er jonno Export kora holo
module.exports = app;
