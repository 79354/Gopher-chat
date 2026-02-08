package handlers

import (
	"encoding/json"
	"log"
	"sync"

	"video-service/models"
	"video-service/redis"

	"github.com/gofiber/websocket/v2"
)

var (
	// In-memory connection pool (room -> user -> websocket connection)
	rooms      = make(map[string]map[string]*websocket.Conn)
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
	addUserToRoom(roomId, userId, c)
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
		err := c.ReadJSON(&msg)
		if err != nil {
			log.Printf("Error reading message from user %s: %v", userId, err)
			break
		}

		// Set the sender ID
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
	case "offer":
		// Forward offer to specific peer
		if msg.TargetId != "" {
			sendToUser(roomId, msg.TargetId, msg)
		}

	case "answer":
		// Forward answer to specific peer
		if msg.TargetId != "" {
			sendToUser(roomId, msg.TargetId, msg)
		}

	case "ice-candidate":
		// Forward ICE candidate to specific peer
		if msg.TargetId != "" {
			sendToUser(roomId, msg.TargetId, msg)
		}

	case "request-offer":
		// New peer requesting offers from existing peers
		// Notify all other users to send offers to this new peer
		broadcastToRoom(roomId, senderId, models.SignalMessage{
			Type:     "new-peer",
			UserId:   senderId,
			TargetId: msg.UserId,
		})

	default:
		log.Printf("Unknown message type: %s", msg.Type)
	}
}

// Room management functions

func addUserToRoom(roomId, userId string, conn *websocket.Conn) {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()

	if rooms[roomId] == nil {
		rooms[roomId] = make(map[string]*websocket.Conn)
	}
	rooms[roomId][userId] = conn
}

func removeUserFromRoom(roomId, userId string) {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()

	if rooms[roomId] != nil {
		delete(rooms[roomId], userId)

		// Clean up empty rooms
		if len(rooms[roomId]) == 0 {
			delete(rooms, roomId)
			redis.DeleteRoom(roomId)
		}
	}
}

func sendToUser(roomId, userId string, msg models.SignalMessage) {
	roomsMutex.RLock()
	defer roomsMutex.RUnlock()

	if rooms[roomId] != nil {
		if conn, ok := rooms[roomId][userId]; ok {
			err := conn.WriteJSON(msg)
			if err != nil {
				log.Printf("Error sending to user %s: %v", userId, err)
			}
		}
	}
}

func broadcastToRoom(roomId, excludeUserId string, msg models.SignalMessage) {
	roomsMutex.RLock()
	defer roomsMutex.RUnlock()

	if rooms[roomId] != nil {
		for userId, conn := range rooms[roomId] {
			if userId != excludeUserId {
				err := conn.WriteJSON(msg)
				if err != nil {
					log.Printf("Error broadcasting to user %s: %v", userId, err)
				}
			}
		}
	}
}

// GetRoomParticipants returns list of users currently in a room
func GetRoomParticipants(c *websocket.Conn) error {
	roomId := c.Params("roomId")

	participants := redis.GetRoomParticipants(roomId)

	return c.JSON(fiber.Map{
		"roomId":       roomId,
		"participants": participants,
		"count":        len(participants),
	})
}

// CreateRoom creates a new video call room
func CreateRoom(c *websocket.Conn) error {
	var req models.CreateRoomRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	// TODO: Validate creator permissions
	// TODO: Store room metadata in database

	roomId := req.RoomId
	if roomId == "" {
		// Generate UUID if not provided
		roomId = generateRoomId()
	}

	// Initialize room in Redis
	redis.InitializeRoom(roomId, req.CreatorId)

	return c.JSON(fiber.Map{
		"roomId":    roomId,
		"creatorId": req.CreatorId,
		"created":   true,
	})
}

// DeleteRoom removes a video call room
func DeleteRoom(c *websocket.Conn) error {
	roomId := c.Params("roomId")

	// TODO: Validate permissions (only creator or admin)
	// TODO: Notify all participants
	// TODO: Close all connections

	roomsMutex.Lock()
	if rooms[roomId] != nil {
		// Close all connections
		for _, conn := range rooms[roomId] {
			conn.Close()
		}
		delete(rooms, roomId)
	}
	roomsMutex.Unlock()

	redis.DeleteRoom(roomId)

	return c.JSON(fiber.Map{
		"roomId":  roomId,
		"deleted": true,
	})
}

// Helper function to generate room ID
func generateRoomId() string {
	// TODO: Implement UUID generation
	return "room_" + randomString(16)
}

func randomString(length int) string {
	// TODO: Implement secure random string generation
	return "placeholder_id"
}
