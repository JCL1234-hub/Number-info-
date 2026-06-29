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

// Footer constants
const API_FOOTER = {
  api_by: "@username_506",
  developer: "@app_code_craft",
  credit: "@codeify_owner"
};

// Rate Limiter: 100 requests per 15 minutes per IP
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

// Helper function to mock or fetch Carrier/Timezone data
// Uses Environment Variables if an external API key is provided
const getCarrierAndTimezone = async (phoneNumber, apiKey) => {
  if (apiKey) {
    // Implement external API fetching logic here (e.g., Axios to Numverify/Twilio)
    // return await axios.get(`https://api.external.com/?key=${apiKey}&num=${phoneNumber}`);
  }
  
  // Default/Fallback values if no external API key is integrated yet
  return {
    carrier: "Jio",
    timezone: "Asia/Kolkata"
  };
};

// Main Endpoint
app.get('/api/number', async (req, res, next) => {
  const start = process.hrtime();

  try {
    let { number } = req.query;

    if (!number) {
      const error = new Error("Invalid phone number.");
      error.status = 400;
      throw error;
    }

    // Auto-prepend '+' if the user provided the number without a country code
    number = number.trim();
    if (!number.startsWith('+')) {
      number = '+' + number;
    }

    // Validate and parse the phone number
    const parsedNumber = parsePhoneNumberWithError(number);
    
    if (!parsedNumber.isValid()) {
      const error = new Error("Invalid phone number.");
      error.status = 400;
      throw error;
    }

    // Fetch full Country Name using Intl API
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const countryName = regionNames.of(parsedNumber.country) || "Unknown";
    
    // Simulate async data fetching for carrier and timezone using env var
    const extraInfo = await getCarrierAndTimezone(number, process.env.EXTERNAL_API_KEY);

    // Calculate response time
    const diff = process.hrtime(start);
    const responseTime = `${Math.round((diff[0] * 1e9 + diff[1]) / 1e6)}ms`;

    // Format successful response
    return res.status(200).json({
      status: true,
      number: parsedNumber.formatInternational().replace(/\s/g, ''),
      country: countryName,
      country_code: parsedNumber.country,
      carrier: extraInfo.carrier,
      line_type: parsedNumber.getType() ? parsedNumber.getType().charAt(0) + parsedNumber.getType().slice(1).toLowerCase() : "Unknown",
      timezone: extraInfo.timezone,
      valid: true,
      response_time: responseTime,
      ...API_FOOTER
    });

  } catch (error) {
    next(error);
  }
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    status: false,
    message: err.message || "Invalid phone number.",
    ...API_FOOTER
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel Serverless Functions
module.exports = app;
