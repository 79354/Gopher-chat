# 🚀 Quick Start Guide

Get GopherChat running in 5 minutes!

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ Go backend running on `localhost:8080`
- ✅ Terminal/Command Prompt

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd gopherchat
npm install
```

This installs:
- Next.js 14
- React 18
- Tailwind CSS
- Framer Motion
- Zustand
- Axios
- TypeScript

### 2. Verify Backend Connection

Make sure your Go backend is running and responding:

```bash
# Test REST API
curl http://localhost:8080/health

# Or open in browser
open http://localhost:8080
```

### 3. Start Development Server

```bash
npm run dev
```

You should see:
```
  ▲ Next.js 14.2.3
  - Local:        http://localhost:3000
  - Ready in 2.3s
```

### 4. Open in Browser

Navigate to: **http://localhost:3000**

### 5. Create Account

1. Click "Sign up" on the auth page
2. Enter a username and password
3. Click "Create Account"
4. You'll be redirected to `/chat`

### 6. Test Real-Time Chat

**Open a second browser window** (or incognito):
1. Create another account
2. Both users should appear in each other's "Online Gophers" list
3. Start chatting!

## Troubleshooting

### Backend Connection Failed

**Error**: `ERR_CONNECTION_REFUSED`

**Solution**:
```bash
# Check if backend is running
netstat -an | grep 8080

# Start your Go backend
cd path/to/backend
go run main.go
```

### WebSocket Connection Failed

**Error**: `WebSocket connection to 'ws://localhost:8080/ws/...' failed`

**Solution**:
1. Ensure backend WebSocket handler is running
2. Check CORS settings in Go backend
3. Verify userID is valid

### Page Shows Loading Forever

**Error**: Stuck on "Connecting to the burrow..."

**Solution**:
1. Open browser console (F12)
2. Check for API errors
3. Clear localStorage:
```javascript
localStorage.clear();
location.reload();
```

### Build Errors

**Error**: Module not found or TypeScript errors

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

## Quick Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Clean start
rm -rf .next node_modules
npm install
npm run dev
```

## Testing the Features

### ✅ Authentication
- [ ] Register new account
- [ ] Login with existing account
- [ ] Logout
- [ ] Session persistence (refresh page)

### ✅ Real-Time Chat
- [ ] See online users list
- [ ] Select a user to chat
- [ ] Send messages
- [ ] Receive messages in real-time
- [ ] See message history

### ✅ UI/UX
- [ ] Animated Gopher on login
- [ ] Digging Gopher loading state
- [ ] Sleeping Gopher empty state
- [ ] Smooth message animations
- [ ] Glassmorphism effects
- [ ] Responsive sidebar

## Production Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Variables

Create `.env.local` for local development:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

For production, update with your production URLs.

## Backend Requirements

Your Go backend MUST implement:

### REST Endpoints
```
POST   /login                          → { userID, username }
POST   /registration                   → { userID, username }
GET    /UserSessionCheck/:userID       → 200 OK or 401
GET    /getConversation/:to/:from      → [messages]
```

### WebSocket Endpoint
```
ws://localhost:8080/ws/:userID
```

### WebSocket Events

**Server sends**:
```json
{
  "eventname": "chatlist-response",
  "eventpayload": { "type": "my-chatlist", "chatlist": [...] }
}

{
  "eventname": "message-response",
  "eventpayload": { "toUserID": "...", "fromUserID": "...", "message": "..." }
}
```

**Client sends**:
```json
{
  "eventname": "message",
  "eventpayload": { "toUserID": "...", "fromUserID": "...", "message": "..." }
}
```

## Development Tips

### Hot Reload
Changes to components automatically reload. If not:
```bash
# Restart dev server
Ctrl+C
npm run dev
```

### Debug Mode

Add console logs in key files:

**WebSocket Hook** (`hooks/useWebSocket.ts`):
```typescript
ws.onmessage = (event) => {
  console.log('📨 WS Message:', event.data);
  // ...
};
```

**Store** (`store/chatStore.ts`):
```typescript
addMessage: (id, msg) => {
  console.log('➕ Adding message:', msg);
  // ...
}
```

### Browser DevTools

- **Console**: View errors and logs
- **Network**: Check API calls and WebSocket
- **Application**: Inspect localStorage
- **React DevTools**: View component state

## Next Steps

1. ✅ **Customize**: Modify colors in `tailwind.config.js`
2. ✅ **Extend**: Add emoji picker, file uploads
3. ✅ **Deploy**: Push to production
4. ✅ **Portfolio**: Add to your resume!

## Need Help?

Check these files:
- `README.md` - Full documentation
- `ARCHITECTURE.md` - Detailed architecture
- Browser console - Error messages

---

**Happy Coding!** 🐹✨
