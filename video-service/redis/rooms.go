package redis

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	Client *redis.Client
	ctx    = context.Background()
)

// InitRedis initializes the Redis connection
func InitRedis() {
	redisAddr := os.Getenv("REDIS_URL")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	Client = redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: "",
		DB:       1, // Use DB 1 for video service (DB 0 is for chat service)
	})

	_, err := Client.Ping(ctx).Result()
	if err != nil {
		log.Fatalf("Could not connect to Redis: %v", err)
	}

	log.Println("✅ Video Service connected to Redis")
}

// Room key format: "video:room:{roomId}:users" -> Set of userIds
// Room metadata: "video:room:{roomId}:meta" -> Hash

// AddUserToRoom adds a user to a video call room
func AddUserToRoom(roomId, userId string) {
	key := "video:room:" + roomId + ":users"

	err := Client.SAdd(ctx, key, userId).Err()
	if err != nil {
		log.Printf("Error adding user to room: %v", err)
	}

	// Set expiration for auto-cleanup (4 hours)
	Client.Expire(ctx, key, 4*time.Hour)
}

// RemoveUserFromRoom removes a user from a video call room
func RemoveUserFromRoom(roomId, userId string) {
	key := "video:room:" + roomId + ":users"

	err := Client.SRem(ctx, key, userId).Err()
	if err != nil {
		log.Printf("Error removing user from room: %v", err)
	}

	// Check if room is empty
	count, _ := Client.SCard(ctx, key).Result()
	if count == 0 {
		DeleteRoom(roomId)
	}
}

// GetRoomParticipants returns all users currently in a room
func GetRoomParticipants(roomId string) []string {
	key := "video:room:" + roomId + ":users"

	members, err := Client.SMembers(ctx, key).Result()
	if err != nil {
		log.Printf("Error getting room participants: %v", err)
		return []string{}
	}

	return members
}

// InitializeRoom creates a new room with metadata
func InitializeRoom(roomId, creatorId string) {
	metaKey := "video:room:" + roomId + ":meta"

	err := Client.HSet(ctx, metaKey, map[string]interface{}{
		"creator":   creatorId,
		"createdAt": time.Now().Unix(),
		"type":      "video",
	}).Err()

	if err != nil {
		log.Printf("Error initializing room: %v", err)
	}

	// Set expiration
	Client.Expire(ctx, metaKey, 4*time.Hour)
}

// DeleteRoom removes all room data
func DeleteRoom(roomId string) {
	usersKey := "video:room:" + roomId + ":users"
	metaKey := "video:room:" + roomId + ":meta"

	Client.Del(ctx, usersKey, metaKey)
	log.Printf("Room %s deleted", roomId)
}

// GetRoomMetadata retrieves room metadata
func GetRoomMetadata(roomId string) map[string]string {
	metaKey := "video:room:" + roomId + ":meta"

	meta, err := Client.HGetAll(ctx, metaKey).Result()
	if err != nil {
		log.Printf("Error getting room metadata: %v", err)
		return nil
	}

	return meta
}

// IsUserInRoom checks if a user is in a specific room
func IsUserInRoom(roomId, userId string) bool {
	key := "video:room:" + roomId + ":users"

	exists, err := Client.SIsMember(ctx, key, userId).Result()
	if err != nil {
		log.Printf("Error checking user in room: %v", err)
		return false
	}

	return exists
}

// GetAllActiveRooms returns list of all active room IDs
func GetAllActiveRooms() []string {
	// TODO: Implement pattern scanning for all active rooms
	// This is a simplified version
	pattern := "video:room:*:users"

	keys, err := Client.Keys(ctx, pattern).Result()
	if err != nil {
		log.Printf("Error getting active rooms: %v", err)
		return []string{}
	}

	// Extract room IDs from keys
	rooms := make([]string, 0)
	for _, key := range keys {
		// Parse "video:room:{roomId}:users" -> {roomId}
		// TODO: Implement proper parsing
		rooms = append(rooms, key)
	}

	return rooms
}
