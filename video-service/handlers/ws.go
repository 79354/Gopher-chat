package handlers

import (
	"log"
	"sync"
	"video-service/models"
	"video-service/redis"

	"github.com/gofiber/websocket/v2"
)

// Peer wraps the websocket connection to ensure thread-safe writes
type Peer struct {
	Conn *websocket.Conn
	mu   sync.Mutex
}

// WriteJSON safely writes JSON to the websocket connection
func (p *Peer) WriteJSON(v interface{}) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.Conn.WriteJSON(v)
}

var (
	// In-memory connection pool (room -> user -> Peer)
	// These are package-private but accessible to room.go
	rooms      = make(map[string]map[string]*Peer)
	roomsMutex = &sync.RWMutex{}
)

// HandleWebRTCSignaling manages WebSocket connections for WebRTC signaling
func HandleWebRTCSignaling(c *websocket.Conn) {
	roomId := c.Params("roomId")
	userId := c.Query("userId")

	if roomId == "" || userId == "" {
		log.Println("Missing roomId or userId")
		c.Close()
		return
	}

	log.Printf("User %s joining room %s", userId, roomId)

	// Add user to room
	peer := addUserToRoom(roomId, userId, c)
	defer removeUserFromRoom(roomId, userId)

	// Add to Redis tracking
	redis.AddUserToRoom(roomId, userId)
	defer redis.RemoveUserFromRoom(roomId, userId)

	// Notify others that a new user joined
	broadcastToRoom(roomId, userId, models.SignalMessage{
		Type:   "user-joined",
		UserId: userId,
		RoomId: roomId,
	})

	// Main message loop
	for {
		var msg models.SignalMessage
		// ReadJSON is safe to call concurrently with WriteJSON (but not other Reads)
		err := c.ReadJSON(&msg)
		if err != nil {
			log.Printf("Error reading message from user %s: %v", userId, err)
			break
		}

		// Enforce truthfulness in sender ID
		msg.UserId = userId
		msg.RoomId = roomId

		// Handle different message types
		handleSignalMessage(roomId, userId, msg)
	}

	// Notify others that user left
	broadcastToRoom(roomId, userId, models.SignalMessage{
		Type:   "user-left",
		UserId: userId,
		RoomId: roomId,
	})

	log.Printf("User %s left room %s", userId, roomId)
}

// handleSignalMessage processes different WebRTC signaling messages
func handleSignalMessage(roomId, senderId string, msg models.SignalMessage) {
	switch msg.Type {
	case "offer", "answer", "ice-candidate":
		// Forward these signals directly to the specific target peer
		if msg.TargetId != "" {
			sendToUser(roomId, msg.TargetId, msg)
		}
	case "request-offer":
		// New peer requesting offers from existing peers (Mesh network initiation)
		// We broadcast to everyone ELSE in the room saying "I am new, please call me"
		broadcastToRoom(roomId, senderId, models.SignalMessage{
			Type:     "new-peer",
			UserId:   senderId,   // The new user
			TargetId: msg.UserId, // Explicitly target the requester if needed by client logic
		})
	default:
		log.Printf("Unknown message type: %s", msg.Type)
	}
}

// Room management functions

func addUserToRoom(roomId, userId string, conn *websocket.Conn) *Peer {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()

	if rooms[roomId] == nil {
		rooms[roomId] = make(map[string]*Peer)
	}

	peer := &Peer{Conn: conn}
	rooms[roomId][userId] = peer
	return peer
}

func removeUserFromRoom(roomId, userId string) {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()

	if rooms[roomId] != nil {
		delete(rooms[roomId], userId)
		// Clean up empty rooms
		if len(rooms[roomId]) == 0 {
			delete(rooms, roomId)
			// Also clear from Redis if local instance was the last holder
			// (In production with multiple pods, Redis cleanup logic handles this via expiry)
			redis.DeleteRoom(roomId)
		}
	}
}

func sendToUser(roomId, userId string, msg models.SignalMessage) {
	roomsMutex.RLock()
	peer, exists := rooms[roomId][userId]
	roomsMutex.RUnlock()

	if exists {
		// WriteJSON uses the Peer's internal mutex, so it is safe
		err := peer.WriteJSON(msg)
		if err != nil {
			log.Printf("Error sending to user %s: %v", userId, err)
		}
	}
}

func broadcastToRoom(roomId, excludeUserId string, msg models.SignalMessage) {
	roomsMutex.RLock()
	peersMap := rooms[roomId]

	// Create a snapshot of peers to avoid holding the global lock during network I/O
	// This prevents the whole server from stalling if one client has a slow connection
	snapshot := make([]*Peer, 0, len(peersMap))
	for id, peer := range peersMap {
		if id != excludeUserId {
			snapshot = append(snapshot, peer)
		}
	}
	roomsMutex.RUnlock()

	// Perform writes outside the global lock
	for _, peer := range snapshot {
		go func(p *Peer) {
			if err := p.WriteJSON(msg); err != nil {
				log.Printf("Error broadcasting to peer: %v", err)
			}
		}(peer)
	}
}
