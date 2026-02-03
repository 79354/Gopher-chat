# 🐹 GopherChat - Production-Grade Real-Time Chat

A sleek, modern real-time chat application featuring a **"Cyber-Gopher"** aesthetic. Built with Next.js 14, WebSockets, and connected to a Go backend.

![GopherChat](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?style=for-the-badge&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=for-the-badge&logo=tailwind-css)

## ✨ Features

### 🎨 Design & UX
- **High-end Glassmorphism**: Deep dark mode with backdrop blur effects
- **Animated Gopher Mascot**: Custom SVG mascot throughout the app
- **Framer Motion Animations**: Smooth page transitions and message animations
- **Responsive Design**: Works seamlessly on desktop and mobile

### 🚀 Technical Features
- **Real-time Communication**: WebSocket integration with custom protocol
- **State Management**: Zustand for global state
- **Session Persistence**: LocalStorage + backend session validation
- **Message History**: Load previous conversations from API
- **Online Status**: Real-time user presence tracking

### 🎯 UI Components
- **3D Welcome Screen**: Animated gopher mascot on login
- **Digging Gopher Loader**: Custom loading animation
- **Sleeping Gopher**: Empty state when no chat selected
- **Glassmorphic Sidebar**: Online users list with status indicators
- **Message Bubbles**: Gradient styling for sent messages
- **Skeleton Loaders**: Smooth loading states

## 🛠️ Tech Stack

```
Frontend:
├── Next.js 14 (App Router)
├── TypeScript
├── Tailwind CSS
├── Framer Motion
├── Zustand
├── Axios
└── Lucide React Icons

Backend (Your Existing Go Server):
├── WebSocket Server (ws://localhost:8080/ws/:userID)
├── REST API (http://localhost:8080)
└── Custom JSON Protocol
```

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- Running Go backend on `localhost:8080`

### Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Start Development Server**
```bash
npm run dev
```

3. **Open Browser**
```
http://localhost:3000
```

## 🔌 Backend Integration

### Required Endpoints

Your Go backend must provide:

**Auth:**
- `POST /login` - Returns `{ userID, username }`
- `POST /registration` - Returns `{ userID, username }`
- `GET /UserSessionCheck/:userID` - Validates session

**Chat:**
- `GET /getConversation/:toUserID/:fromUserID` - Returns message array

**WebSocket:**
- `ws://localhost:8080/ws/:userID` - WebSocket connection

### WebSocket Protocol

**Client → Server (Send Message):**
```json
{
  "eventname": "message",
  "eventpayload": {
    "toUserID": "user_id",
    "fromUserID": "my_id",
    "message": "Hello!"
  }
}
```

**Server → Client (Receive Message):**
```json
{
  "eventname": "message-response",
  "eventpayload": {
    "toUserID": "user_id",
    "fromUserID": "sender_id",
    "message": "Hello!"
  }
}
```

**Server → Client (User List):**
```json
{
  "eventname": "chatlist-response",
  "eventpayload": {
    "type": "my-chatlist",
    "chatlist": [
      { "userID": "123", "username": "alice" },
      { "userID": "456", "username": "bob" }
    ]
  }
}
```

## 📁 Project Structure

```
gopherchat/
├── app/
│   ├── page.tsx              # Login/Register page
│   ├── chat/
│   │   └── page.tsx          # Main chat interface
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── ChatInterface.tsx     # Main chat UI
│   └── GopherLogo.tsx        # Mascot components
├── hooks/
│   └── useWebSocket.ts       # WebSocket hook
├── lib/
│   ├── api.ts                # API functions
│   └── utils.ts              # Utility functions
├── store/
│   └── chatStore.ts          # Zustand store
├── public/                   # Static assets
└── package.json
```

## 🎨 Color Palette

```css
Primary Colors:
- Gopher Blue: #00ADD8 (Go language blue)
- Neon Purple: #7C3AED (Accent color)

Background:
- Deep Dark: bg-slate-950
- Glass Overlay: bg-white/5 with backdrop-blur

Text:
- Headings: White
- Secondary: Gray-400
```

## 🔧 Configuration

### Environment Variables
Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

### Tailwind Config
Custom theme in `tailwind.config.js`:
- Gopher-specific colors
- Custom animations (dig, shimmer)
- Glassmorphism utilities

## 🚀 Deployment

### Build for Production
```bash
npm run build
npm start
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📝 Resume-Worthy Features

- ✅ **Real-time WebSocket Integration** with custom protocol
- ✅ **State Management** with Zustand
- ✅ **Advanced Animations** using Framer Motion
- ✅ **Glassmorphism Design System**
- ✅ **Session Persistence** and validation
- ✅ **Message History** loading with skeleton states
- ✅ **Type-safe** TypeScript implementation
- ✅ **Responsive Design** with Tailwind CSS
- ✅ **Production-grade Architecture**

## 🎯 Future Enhancements

- [ ] Video call integration
- [ ] File/image sharing
- [ ] Emoji picker
- [ ] Message reactions
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Dark/Light theme toggle
- [ ] User profiles
- [ ] Group chats

## 📄 License

MIT License - Feel free to use for your portfolio!

## 🙏 Credits

Built with ❤️ using Go backend + Next.js frontend
Gopher mascot inspired by the Go programming language

---

**Made for Resume Excellence** 🌟
