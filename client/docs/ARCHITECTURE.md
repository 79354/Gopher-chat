# GopherChat Architecture & Setup Guide

## 🏗️ Architecture Overview

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js App                         │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Auth Page   │  │  Chat Page   │  │  Components  │ │
│  │  (/)         │  │  (/chat)     │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                  │                  │         │
│         └──────────────────┴──────────────────┘         │
│                        │                                │
│              ┌─────────▼─────────┐                     │
│              │  Zustand Store    │                     │
│              │  (Global State)   │                     │
│              └─────────┬─────────┘                     │
│                        │                                │
│         ┌──────────────┼──────────────┐                │
│         │              │              │                │
│   ┌─────▼─────┐  ┌────▼────┐  ┌─────▼─────┐          │
│   │ useWS Hook│  │ API Lib │  │ Components│          │
│   │           │  │ (Axios) │  │           │          │
│   └─────┬─────┘  └────┬────┘  └───────────┘          │
└─────────┼─────────────┼────────────────────────────────┘
          │             │
          │             │
┌─────────▼─────────────▼────────────────────────────────┐
│              Go Backend Server                          │
│                                                         │
│  ┌──────────────┐         ┌──────────────┐            │
│  │  WebSocket   │         │  REST API    │            │
│  │  Handler     │         │  Endpoints   │            │
│  └──────────────┘         └──────────────┘            │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

### 1. Authentication Flow

```
User Input → Auth Form
     ↓
API Request (POST /login or /registration)
     ↓
Backend Validates
     ↓
Returns { userID, username }
     ↓
Store in localStorage + Zustand
     ↓
Redirect to /chat
```

### 2. Session Persistence Flow

```
Page Load → Check localStorage
     ↓
Found userID? → Validate with GET /UserSessionCheck/:userID
     ↓
Valid? → Load ChatInterface
     ↓
Invalid? → Clear storage → Redirect to /
```

### 3. WebSocket Communication Flow

```
User Connects → ws://localhost:8080/ws/:userID
     ↓
Server Sends: "chatlist-response"
     ↓
Client Updates: onlineUsers in Zustand
     ↓
User Selects Chat → Load History via API
     ↓
User Sends Message → WebSocket Event
     ↓
Server Broadcasts: "message-response"
     ↓
Client Appends: Message to messages[userID]
```

## 📡 WebSocket Protocol Details

### Event Types

#### 1. Chatlist Response
**Sent by**: Server  
**When**: User connects, user joins/leaves

```typescript
{
  eventname: "chatlist-response",
  eventpayload: {
    type: "my-chatlist" | "new-user-joined" | "user-disconnected",
    chatlist?: [
      { userID: string, username: string }
    ],
    user?: { userID: string, username: string }
  }
}
```

**Client Handling**:
- `my-chatlist`: Replace entire online users list
- `new-user-joined`: Append to online users
- `user-disconnected`: Remove from online users

#### 2. Message Send
**Sent by**: Client  
**When**: User sends a message

```typescript
{
  eventname: "message",
  eventpayload: {
    toUserID: string,
    fromUserID: string,
    message: string
  }
}
```

#### 3. Message Response
**Sent by**: Server  
**When**: Message is broadcast

```typescript
{
  eventname: "message-response",
  eventpayload: {
    toUserID: string,
    fromUserID: string,
    message: string
  }
}
```

**Client Handling**:
- Determine other user ID
- Append to messages[otherUserID]
- Add timestamp
- Auto-scroll to bottom

## 🗄️ State Management

### Zustand Store Schema

```typescript
interface ChatStore {
  // Current logged-in user
  currentUser: {
    userID: string;
    username: string;
  } | null;

  // List of online users
  onlineUsers: Array<{
    userID: string;
    username: string;
  }>;

  // Currently selected chat
  activeChat: {
    userID: string;
    username: string;
  } | null;

  // Messages organized by user
  messages: {
    [userID: string]: Array<{
      toUserID: string;
      fromUserID: string;
      message: string;
      timestamp?: number;
    }>
  };

  // Actions
  setCurrentUser: (user) => void;
  setOnlineUsers: (users) => void;
  setActiveChat: (user) => void;
  addMessage: (userID, message) => void;
  setMessages: (userID, messages) => void;
  clearStore: () => void;
}
```

### LocalStorage Schema

```typescript
{
  userID: string;      // User's unique ID from backend
  username: string;    // User's display name
}
```

## 🎨 Component Hierarchy

```
App Layout
├── Auth Page (/)
│   ├── Hero Section (Animated Gopher)
│   └── Auth Form
│       ├── Username Input (Floating Label)
│       ├── Password Input (Floating Label)
│       └── Submit Button (Gradient)
│
└── Chat Page (/chat)
    ├── Session Guard (Auth Check)
    └── Chat Interface
        ├── Sidebar
        │   ├── Header (Logo + Connection Status)
        │   ├── Current User Card
        │   └── Online Users List
        │       └── User Card (with Active State)
        │
        └── Main Area
            ├── Chat Header
            │   ├── User Info
            │   └── Video Call Button (Disabled)
            │
            ├── Messages Container
            │   ├── Loading State (Digging Gopher)
            │   ├── Empty State (Sleeping Gopher)
            │   └── Message List
            │       └── Message Bubble
            │           ├── Content
            │           └── Timestamp
            │
            └── Input Area
                ├── Attach Button
                ├── Message Input
                ├── Emoji Button
                └── Send Button
```

## 🎭 Animation System

### Framer Motion Variants

#### Page Transitions
```typescript
initial={{ opacity: 0, x: 50 }}
animate={{ opacity: 1, x: 0 }}
transition={{ duration: 0.8 }}
```

#### Message Entry
```typescript
initial={{ opacity: 0, y: 20, scale: 0.9 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
exit={{ opacity: 0, scale: 0.9 }}
transition={{ duration: 0.3 }}
```

#### Gopher Animations
```typescript
// Bouncing
animate={{
  y: [0, -20, 0],
  rotate: [-3, 3, -3]
}}
transition={{
  duration: 4,
  repeat: Infinity,
  ease: "easeInOut"
}}

// Digging
animate={{
  y: [0, -10, 0],
  rotate: [-5, 5, -5]
}}
transition={{
  duration: 1.5,
  repeat: Infinity
}}
```

## 🎨 Design System

### Colors
```css
/* Primary */
--gopher-blue: #00ADD8;
--gopher-purple: #7C3AED;

/* Backgrounds */
--bg-primary: #020617;      /* slate-950 */
--bg-glass: rgba(255,255,255,0.05);
--bg-glass-hover: rgba(255,255,255,0.1);

/* Text */
--text-primary: #FFFFFF;
--text-secondary: #9CA3AF;  /* gray-400 */

/* Borders */
--border-glass: rgba(255,255,255,0.1);
```

### Typography
```css
/* Headings */
font-size: 1.875rem;        /* 3xl */
font-weight: 700;           /* bold */
line-height: 2.25rem;

/* Body */
font-size: 1rem;
font-weight: 400;
line-height: 1.5rem;

/* Small */
font-size: 0.875rem;        /* sm */
```

### Spacing
```css
/* Container */
padding: 1.5rem;            /* p-6 */

/* Component gaps */
gap: 1rem;                  /* gap-4 */
gap: 0.75rem;               /* gap-3 */

/* Borders */
border-radius: 1.5rem;      /* rounded-3xl */
border-radius: 1rem;        /* rounded-xl */
```

## 🔐 Security Considerations

### Client-Side
- ✅ Session validation on page load
- ✅ Automatic logout on invalid session
- ✅ No sensitive data in localStorage
- ✅ WebSocket reconnection handling

### Required Backend Security
- 🔒 Password hashing (bcrypt)
- 🔒 Session tokens/JWT
- 🔒 CORS configuration
- 🔒 Rate limiting
- 🔒 Input validation
- 🔒 SQL injection prevention

## 📊 Performance Optimizations

### Implemented
- ✅ Lazy loading routes
- ✅ Optimistic UI updates
- ✅ Message virtualization ready
- ✅ WebSocket connection reuse
- ✅ Memoized components
- ✅ CSS-only animations where possible

### Recommended Additions
- [ ] React.memo for message components
- [ ] Virtual scrolling for large chat histories
- [ ] Image lazy loading
- [ ] Service Worker for offline support
- [ ] IndexedDB for message caching

## 🧪 Testing Strategy

### Unit Tests
```typescript
// Store actions
describe('useChatStore', () => {
  test('adds message correctly', () => {});
  test('updates online users', () => {});
});

// WebSocket hook
describe('useWebSocket', () => {
  test('connects on mount', () => {});
  test('handles incoming messages', () => {});
});
```

### Integration Tests
- Login flow
- Message sending
- User list updates
- Session persistence

### E2E Tests
- Complete chat conversation
- Multi-user scenarios
- Network disconnection handling

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] Set production API URLs in `.env`
- [ ] Update CORS settings in backend
- [ ] Enable compression
- [ ] Configure error tracking (Sentry)
- [ ] Set up monitoring (Vercel Analytics)

### Environment Variables
```env
# Production
NEXT_PUBLIC_API_URL=https://api.gopherchat.com
NEXT_PUBLIC_WS_URL=wss://api.gopherchat.com

# Analytics (optional)
NEXT_PUBLIC_ANALYTICS_ID=xxx
```

### Vercel Deployment
```bash
npm install -g vercel
vercel --prod
```

### Docker Deployment
```bash
docker build -t gopherchat .
docker run -p 3000:3000 gopherchat
```

## 📈 Scaling Considerations

### Frontend
- CDN for static assets
- Edge caching for API responses
- Load balancing for high traffic

### Backend
- WebSocket cluster with Redis pub/sub
- Horizontal scaling with load balancer
- Database read replicas
- Message queue for async processing

## 🛠️ Development Tips

### Hot Reload
```bash
npm run dev
# Access at http://localhost:3000
```

### Debug WebSocket
```typescript
// Add in useWebSocket.ts
ws.onmessage = (event) => {
  console.log('📨 Received:', event.data);
  // ...
};
```

### Mock Backend
```typescript
// lib/api.ts
export const api = {
  login: async () => ({
    userID: 'mock-123',
    username: 'MockUser'
  }),
  // ...
};
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Framer Motion API](https://www.framer.com/motion/)
- [Zustand Guide](https://github.com/pmndrs/zustand)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

**Built with precision for portfolio excellence** 🎯
