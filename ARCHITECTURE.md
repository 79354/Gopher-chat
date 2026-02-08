# 🏗️ GopherChat Architecture Guide

This document provides a comprehensive overview of GopherChat's system design, data flow, and service boundaries. It's designed to help developers understand how all the pieces fit together.

---

## 📋 Table of Contents

- [System Architecture Overview](#system-architecture-overview)
- [System Components](#system-components)
- [Data Flows](#data-flows)
- [Database Schema](#database-schema)
- [Scaling Considerations](#scaling-considerations)
- [Security Architecture](#security-architecture)
- [Future Improvements](#future-improvements)

---

## 🎯 System Architecture Overview

GopherChat follows a **microservices architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│                    (Next.js + TypeScript)                    │
│                                                               │
│  ┌──────────────────┐              ┌──────────────────┐     │
│  │  Chat WebSocket  │              │ Video WebSocket  │     │
│  └────────┬─────────┘              └────────┬─────────┘     │
└───────────┼──────────────────────────────────┼──────────────┘
            │                                  │
            │                                  │
┌───────────▼─────────────┐        ┌───────────▼─────────────┐
│    Main Server (Gin)     │        │  Video Service (Fiber)  │
│  ┌─────────────────┐     │        │  ┌─────────────────┐   │
│  │   Hub/Lobby     │     │        │  │  Room Manager   │   │
│  │  (WebSocket)    │     │        │  │   (Signaling)   │   │
│  └─────────────────┘     │        │  └─────────────────┘   │
│  ┌─────────────────┐     │        │  ┌─────────────────┐   │
│  │  HTTP Handlers  │     │        │  │   WebRTC Mesh   │   │
│  └─────────────────┘     │        │  └─────────────────┘   │
└───────────┬──────────────┘        └───────────┬────────────┘
            │                                   │
            │                                   │
     ┌──────▼──────┐                     ┌──────▼──────┐
     │   MongoDB   │                     │    Redis    │
     │  (Persist)  │                     │  (Ephemeral)│
     └─────────────┘                     └─────────────┘
```

---

## 🧩 System Components

### 1. The Client (Next.js)

The frontend is a **Single Page Application (SPA)** built with Next.js 14 and TypeScript.

#### Key Technologies
- **Framework:** Next.js 14 (App Router)
- **State Management:** Zustand for global state
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **WebRTC:** Native browser APIs

#### Architecture Patterns

**State Management:**
```typescript
// Zustand stores manage global state
- authStore: User authentication & session
- chatStore: Messages, conversations, typing indicators
- videoStore: Call state, participants, settings
```

**WebSocket Connections:**

The client maintains **two distinct WebSocket connections**:

1. **Chat Socket** → Main Server (Port 8080)
   - Purpose: Text messaging, friend status, group updates
   - Lifecycle: Persistent throughout user session
   - Protocol: Custom JSON-based message format

2. **Video Socket** → Video Service (Port 4000)
   - Purpose: WebRTC signaling (SDP, ICE candidates)
   - Lifecycle: Active only during video calls
   - Protocol: WebRTC signaling protocol

**WebRTC Hook:**
```typescript
useWebRTC() {
  - Manages RTCPeerConnection instances
  - Handles offer/answer negotiation
  - Processes ICE candidates
  - Controls media streams (audio/video)
  - Implements screen sharing
}
```

---

### 2. Main Server (Monolith - Go/Gin)

The central backend service handling all business logic and data persistence.

#### Technology Stack
- **Framework:** Gin (HTTP routing)
- **WebSocket:** Gorilla WebSocket
- **Database Driver:** MongoDB Go Driver
- **Caching:** go-redis

#### Architecture Pattern: Hub/Lobby

```go
type Lobby struct {
    clients    map[*Client]bool     // Active WebSocket connections
    broadcast  chan Message         // Channel for broadcasting messages
    register   chan *Client         // New client registration
    unregister chan *Client         // Client disconnection
    mu         sync.RWMutex         // Concurrent access protection
}
```

**How it works:**
1. HTTP handlers spawn goroutines with `Lobby.broadcast <- message`
2. The Lobby's main goroutine reads from `broadcast` channel
3. Messages are distributed to relevant connected clients
4. Redis Pub/Sub enables cross-instance communication

#### Request Flow

```
HTTP Request → Gin Middleware → Handler
                                   ├→ Validate Input
                                   ├→ Database Operation (MongoDB)
                                   ├→ Broadcast via Lobby
                                   └→ Publish to Redis (if needed)
```

#### Key Responsibilities
- User authentication (JWT)
- Message persistence
- Group management
- Friend system logic
- File upload handling
- Presence tracking

---

### 3. Video Microservice (Go/Fiber)

A lightweight, specialized service for real-time video communication.

#### Technology Stack
- **Framework:** Fiber (high-performance HTTP)
- **WebSocket:** Fiber WebSocket middleware
- **Storage:** Redis (room state)

#### Architecture Pattern: Room-based Signaling

```go
type Room struct {
    ID           string
    Participants map[string]*Peer  // userID → Peer connection
    mu           sync.RWMutex
}

type Peer struct {
    UserID string
    Conn   *websocket.Conn
    mu     sync.Mutex  // Protects concurrent writes
}
```

**Signaling Flow:**
1. User A creates a room → `POST /api/rooms/create`
2. Room ID stored in Redis with TTL
3. Users connect via WebSocket → `GET /ws/:roomId`
4. Service relays SDP offers/answers between peers
5. Service relays ICE candidates for NAT traversal
6. Direct P2P media stream established (bypasses server)

#### Video Topology: Full Mesh

Currently implements a **full mesh network**:
- Each participant maintains a direct connection to every other participant
- For N participants, each peer has (N-1) connections
- **Practical Limit:** ~4-5 participants before bandwidth becomes an issue

**Pros:**
- Low latency (direct P2P)
- No server bandwidth usage for media
- Simple implementation

**Cons:**
- Poor scalability (O(N²) connections)
- High client upload bandwidth requirement

---

## 🔄 Data Flows

### Flow A: Sending a Chat Message

```
┌─────────┐                                              ┌─────────┐
│ User A  │                                              │ User B  │
└────┬────┘                                              └────┬────┘
     │                                                         │
     │ 1. Send JSON via WebSocket                             │
     ├────────────────────────────────┐                       │
     │                                 ▼                       │
     │                        ┌──────────────┐                │
     │                        │ Main Server  │                │
     │                        │    (Hub)     │                │
     │                        └──────┬───────┘                │
     │                               │                         │
     │                 2. Save to MongoDB                     │
     │                               │                         │
     │                        ┌──────▼───────┐                │
     │                        │   MongoDB    │                │
     │                        └──────────────┘                │
     │                               │                         │
     │                 3. Broadcast to recipient              │
     │                               │                         │
     │                               ├─────────────────────────┤
     │                               │  4. Deliver message     ▼
     │                               │                    ┌─────────┐
     │                               │                    │WebSocket│
     │                               │                    └─────────┘
     │                 5. Publish to Redis (multi-instance)   │
     │                               │                         │
     │                        ┌──────▼───────┐                │
     │                        │    Redis     │                │
     │                        └──────────────┘                │
```

**Steps:**
1. Client sends JSON payload via WebSocket
2. Main Server receives message in Hub
3. Server saves message to MongoDB
4. Server broadcasts to recipient's active socket
5. Server publishes event to Redis for multi-instance scaling

---

### Flow B: Starting a Video Call

```
┌─────────┐                                              ┌─────────┐
│ User A  │                                              │ User B  │
└────┬────┘                                              └────┬────┘
     │                                                         │
     │ 1. Click "Start Video"                                 │
     ├────────────────────────────────┐                       │
     │                                 ▼                       │
     │                        ┌──────────────┐                │
     │                        │Video Service │                │
     │                        │POST /rooms   │                │
     │                        └──────┬───────┘                │
     │                               │                         │
     │                 2. Create Room in Redis                │
     │                               │                         │
     │  3. Send call-invite via Chat WebSocket                │
     ├──────────────────────────────────────────────────────► │
     │                               │                         │
     │  4. Both connect to Video WebSocket                    │
     ├──────────────────────────────►│◄────────────────────────┤
     │                               │                         │
     │  5. Exchange SDP Offer/Answer │                         │
     ├──────────────────────────────►│◄────────────────────────┤
     │                               │                         │
     │  6. Exchange ICE Candidates   │                         │
     ├──────────────────────────────►│◄────────────────────────┤
     │                               │                         │
     │  7. Direct P2P Media Stream Established                │
     ├◄═══════════════════════════════════════════════════════►│
```

**Steps:**
1. User A clicks "Start Video" in UI
2. Client calls `POST /api/rooms/create` on Video Service
3. Video Service creates Room ID in Redis
4. Client sends `call-invite` message with `roomId` via Main Server
5. User B receives invite in chat
6. Both users connect to `ws://video-service/ws/{roomId}`
7. Video Service relays SDP offers/answers
8. Peers exchange ICE candidates for NAT traversal
9. Direct P2P media stream established

---

## 💾 Database Schema

### MongoDB Collections

#### Users Collection

```json
{
  "_id": "ObjectId('507f1f77bcf86cd799439011')",
  "username": "gopher_user",
  "email": "gopher@example.com",
  "password": "$2a$10$hashed_password_here",
  "avatar": "https://cdn.example.com/avatars/gopher.png",
  "status": "online",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:22:00Z"
}
```

**Indexes:**
- `username` (unique)
- `email` (unique)

---

#### Groups Collection

```json
{
  "_id": "ObjectId('507f1f77bcf86cd799439012')",
  "name": "Golang Enthusiasts",
  "description": "A community for Go developers",
  "avatar": "https://cdn.example.com/groups/golang.png",
  "members": [
    {
      "userID": "507f1f77bcf86cd799439011",
      "role": "admin",
      "joinedAt": "2024-01-15T10:30:00Z"
    },
    {
      "userID": "507f1f77bcf86cd799439013",
      "role": "member",
      "joinedAt": "2024-01-16T12:00:00Z"
    }
  ],
  "settings": {
    "isPublic": true,
    "allowInvites": true,
    "maxMembers": 100
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:22:00Z"
}
```

**Indexes:**
- `members.userID`
- `settings.isPublic`

---

#### Messages Collection

```json
{
  "_id": "ObjectId('507f1f77bcf86cd799439014')",
  "conversationId": "hash_of_sorted_user_ids",
  "from": "507f1f77bcf86cd799439011",
  "to": "507f1f77bcf86cd799439013",
  "body": "Hello! How's the Go project going?",
  "type": "text",
  "metadata": {
    "attachments": [],
    "edited": false,
    "reactions": []
  },
  "timestamp": 1705321800,
  "createdAt": "2024-01-15T12:30:00Z"
}
```

**Indexes:**
- `conversationId` + `timestamp` (compound, for pagination)
- `from`
- `to`

**Message Types:**
- `text` - Standard text message
- `image` - Image attachment
- `file` - File attachment
- `call-invite` - Video call invitation
- `system` - System notifications

---

#### Friendships Collection

```json
{
  "_id": "ObjectId('507f1f77bcf86cd799439015')",
  "requester": "507f1f77bcf86cd799439011",
  "recipient": "507f1f77bcf86cd799439013",
  "status": "accepted",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

**Indexes:**
- `requester` + `recipient` (compound, unique)
- `status`

**Status Values:**
- `pending` - Request sent, awaiting response
- `accepted` - Friends
- `rejected` - Request declined
- `blocked` - User blocked

---

### Redis Data Structures

#### Presence Tracking

```redis
# Online users (sorted set by last activity)
ZADD online_users <timestamp> <user_id>

# User-specific presence
SET user:<user_id>:status "online" EX 300
```

#### Video Rooms

```redis
# Room participants (set)
SADD room:<room_id>:participants <user_id>

# Room metadata (hash)
HSET room:<room_id>:meta created_at <timestamp> created_by <user_id>

# TTL for auto-cleanup
EXPIRE room:<room_id>:participants 3600
```

#### Pub/Sub Channels

```redis
# Multi-instance message broadcasting
PUBLISH chat:broadcast '{"type":"message","data":{...}}'

# User-specific events
PUBLISH user:<user_id>:events '{"type":"friend_online","data":{...}}'
```

---

## 🚀 Scaling Considerations

### Current Architecture

**Single Instance Limitations:**
- Main Server handles ~10,000 concurrent WebSocket connections
- Video Service handles ~100 concurrent rooms
- MongoDB can handle current read/write load

### Horizontal Scaling Strategy

#### 1. Main Server Scaling

```
                    ┌──────────────────┐
                    │  Load Balancer   │
                    │   (Sticky IP)    │
                    └────────┬─────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
      ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
      │Server 1 │       │Server 2 │       │Server 3 │
      └────┬────┘       └────┬────┘       └────┬────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │
                    ┌────────▼─────────┐
                    │  Redis Pub/Sub   │
                    │  (Message Broker)│
                    └──────────────────┘
```

**Implementation:**
- Use Redis Pub/Sub for cross-instance messaging
- Sticky sessions for WebSocket connections
- Shared session store (Redis)

**Current Implementation:**
```go
// Subscribe to Redis channel
pubsub := redisClient.Subscribe(ctx, "chat:broadcast")
go func() {
    for msg := range pubsub.Channel() {
        lobby.BroadcastToLocal(msg.Payload)
    }
}()
```

---

#### 2. Video Service Scaling

**Challenge:** Video calls are stateful (WebSocket connections)

**Solution:**
- Use consistent hashing for room assignment
- Route users in same room to same service instance
- Implement graceful migration for instance shutdown

---

#### 3. Database Optimization

**MongoDB Sharding Strategy:**
```
Shard Key: conversationId (Messages collection)
- Even distribution of chat history
- Co-located queries (all messages for a conversation on same shard)
```

**Read Replicas:**
- Route read-heavy operations (message history) to replicas
- Write operations to primary

---

### Future: Migrate to SFU Architecture

**Current Problem with Mesh:**
- User uploads N streams (one per participant)
- Bandwidth: O(N) per user
- Total connections: O(N²)

**SFU (Selective Forwarding Unit) Solution:**
```
         ┌──────┐
         │User 1│
         └───┬──┘
             │ Upload 1 stream
             ▼
      ┌──────────┐
      │   SFU    │
      │  Server  │
      └─────┬────┘
            │ Distribute N streams
            │
   ┌────────┼────────┐
   ▼        ▼        ▼
┌──────┐ ┌──────┐ ┌──────┐
│User 2│ │User 3│ │User N│
└──────┘ └──────┘ └──────┘
```

**Benefits:**
- Users upload 1 stream regardless of participant count
- Server handles distribution
- Scales to 100+ participants

**Implementation Libraries:**
- [Pion WebRTC](https://github.com/pion/webrtc) (Go)
- [Janus Gateway](https://janus.conf.meetecho.com/)

---

## 🔒 Security Architecture

### Authentication Flow

```
1. User submits credentials
2. Server validates against MongoDB
3. Generate JWT with claims:
   {
     "sub": "user_id",
     "username": "gopher",
     "exp": timestamp,
     "iat": timestamp
   }
4. Client stores JWT in httpOnly cookie
5. JWT included in WebSocket upgrade request
6. Server validates JWT before accepting connection
```

### WebSocket Security

```go
// Validate JWT before WebSocket upgrade
func AuthenticateWebSocket(c *gin.Context) {
    token := c.Request.Header.Get("Sec-WebSocket-Protocol")
    user, err := ValidateJWT(token)
    if err != nil {
        c.AbortWithStatus(401)
        return
    }
    c.Set("user", user)
}
```

### Data Security

- **Passwords:** Bcrypt hashing (cost factor 10)
- **Communication:** TLS 1.3 in production
- **File Uploads:** Virus scanning, size limits, type validation
- **Rate Limiting:** Token bucket algorithm (100 req/min per user)

---

## 🔮 Future Improvements

### Short Term
- [ ] Add end-to-end encryption for messages
- [ ] Implement message reactions and threading
- [ ] Add typing indicators
- [ ] File upload progress tracking

### Medium Term
- [ ] Migrate video service to SFU architecture
- [ ] Add voice-only calling mode
- [ ] Implement push notifications
- [ ] Add message search functionality

### Long Term
- [ ] Support for bots and integrations
- [ ] Screen recording for calls
- [ ] AI-powered message summaries
- [ ] Federation with other platforms

---

## 📚 Additional Resources

- [WebRTC Documentation](https://webrtc.org/getting-started/overview)
- [MongoDB Performance Best Practices](https://www.mongodb.com/docs/manual/administration/analyzing-mongodb-performance/)
- [Go Concurrency Patterns](https://go.dev/blog/pipelines)
- [Redis Pub/Sub Guide](https://redis.io/docs/manual/pubsub/)

---

**Last Updated:** February 2026  
**Maintained By:** GopherChat Team
