# Number Info API

A professional, production-ready REST API that validates and returns detailed information about phone numbers globally. Fully compatible with Vercel Serverless Functions.

## Features
- Validates phone numbers (with or without `+` sign)
- Identifies country, country code, line type, carrier, and timezone.
- Built-in Rate Limiting and Security Headers (Helmet/CORS).
- Sub-millisecond response time calculation.
- Clean JSON responses.

## Tech Stack
- Node.js & Express
- Vercel Serverless
- `libphonenumber-js`

## Local Setup

1. **Clone the repository & install dependencies**
   ```bash
   npm install
