# Gemini AI Setup for Bulk Import

## Setup Instructions

1. **Get Gemini API Key:**
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the API key

2. **Update Environment Variable:**
   - Open `Computer_B/.env` file
   - Replace `YOUR_GEMINI_API_KEY_HERE` with your actual API key
   - Example: `GEMINI_API_KEY=AIzaSyBJmXQJZ8qKQJZ8qKQJZ8qKQJZ8qKQJZ8qK`

3. **Restart Backend Server:**
   - Stop the backend server (Ctrl+C)
   - Run `npm start` or `npm run dev` again

## Features Enabled

With Gemini AI integration, the bulk import system will:

- **Auto-fill product attributes** based on product names
- **Extract technical specifications** like CPU cores, RAM capacity, GPU VRAM, etc.
- **Generate relevant attributes** for each product category
- **Use existing category attributes** when available
- **Create new attributes** when none exist for the category

## Usage

1. Select a product category
2. Upload Excel file or enter product names manually
3. AI will automatically generate attributes for each product
4. Review and edit products before final creation