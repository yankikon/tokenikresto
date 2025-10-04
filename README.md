# Tokenik Restaurant Token App

A modern restaurant token management system built with React and Tailwind CSS.

## Features

- 🍽️ **Kitchen & Bar Menu Management** - Separate tabs for different food categories
- 📋 **Order Management** - Track and manage active orders
- 🎫 **Token System** - Generate unique tokens for orders (T-XXX format)
- 📺 **TV Display** - Customer-facing order status board
- 💾 **Local Storage** - Data persists between sessions
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## Quick Start

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yankikon/tokenikresto.git
   cd tokenikresto
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   - The app will automatically open at `http://localhost:3000`
   - Or manually navigate to the URL shown in your terminal

### Alternative Commands

```bash
# Development server with CORS enabled
npm run dev

# Custom port (8080)
npm run serve

# Simple HTTP server without auto-open
npx http-server . -p 3000
```

## Usage

### Manager Dashboard
1. Open the **Manager Dashboard** from the home page
2. **Menu Management**: Add Kitchen and Bar items with separate tabs
3. **Take Orders**: Select items and generate tokens
4. **Order Management**: Track order status (Pending → Preparing → Ready)

### TV Display
1. Open the **TV Display** on a separate device/screen
2. Shows real-time order status for customers
3. Updates automatically every 2 seconds

## File Structure

```
tokenik/
├── index.html          # Landing page
├── backend.html        # Manager dashboard
├── frontend.html       # TV display
├── js/
│   ├── backend.js      # Manager functionality
│   └── frontend.js     # TV display functionality
├── css/
│   └── style.css       # Custom styles
├── package.json        # Project configuration
└── README.md          # This file
```

## Technology Stack

- **Frontend**: React (via CDN)
- **Styling**: Tailwind CSS
- **Build Tool**: Babel (in-browser)
- **Local Server**: http-server

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Development

The app uses CDN-based React and Tailwind CSS for simplicity. No build process required!

### Local Development
- Use `npm run dev` for development with CORS enabled
- Changes are reflected immediately (no hot reload)
- Data is stored in browser's localStorage

## Deployment

The app is deployed on GitHub Pages at: https://yankikon.github.io/tokenikresto/

## License

MIT License - see LICENSE file for details

## Support

For issues or questions, please create an issue in the GitHub repository.