package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"time"
	"video-service/models"
	"video-service/redis"

	"github.com/gofiber/fiber/v2"
)

// GetRoomParticipants returns list of users currently in a room
// Route: GET /api/rooms/:roomId/participants
func GetRoomParticipants(c *fiber.Ctx) error {
	roomId := c.Params("roomId")
	if roomId == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Room ID required"})
	}

	participants := redis.GetRoomParticipants(roomId)

	return c.JSON(fiber.Map{
		"roomId":       roomId,
		"participants": participants,
		"count":        len(participants),
	})
}

// CreateRoom creates a new video call room
// Route: POST /api/rooms/create
func CreateRoom(c *fiber.Ctx) error {
	var req models.CreateRoomRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.CreatorId == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Creator ID required"})
	}

	roomId := req.RoomId
	if roomId == "" {
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
// Route: DELETE /api/rooms/:roomId
func DeleteRoom(c *fiber.Ctx) error {
	roomId := c.Params("roomId")
	if roomId == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Room ID required"})
	}

	// 1. Close local websocket connections for this room
	// We access the shared 'rooms' map from ws.go (same package)
	roomsMutex.Lock()
	if peers, exists := rooms[roomId]; exists {
		for _, peer := range peers {
			// peer.Conn is the websocket connection
			peer.Conn.Close()
		}
		delete(rooms, roomId)
	}
	roomsMutex.Unlock()

	// 2. Delete from Redis
	redis.DeleteRoom(roomId)

	return c.JSON(fiber.Map{
		"roomId":  roomId,
		"deleted": true,
	})
}

// Helper function to generate secure room ID
func generateRoomId() string {
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback if random fails
		return "room_" + string(rune(time.Now().UnixNano()))
	}
	return "room_" + hex.EncodeToString(bytes)
}
