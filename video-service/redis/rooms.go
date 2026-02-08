package redis

import (
	"context"
	"log"
	"os"
	"strings"
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
		DB:       1, // Use DB 1 for video service to avoid conflicts with chat service
	})

	_, err := Client.Ping(ctx).Result()
	if err != nil {
		log.Fatalf("Could not connect to Redis: %v", err)
	}

	log.Println("Video Service connected to Redis")
}

// AddUserToRoom adds a user to a video call room and refreshes TTL
func AddUserToRoom(roomId, userId string) {
	key := "video:room:" + roomId + ":users"
	if err := Client.SAdd(ctx, key, userId).Err(); err != nil {
		log.Printf("Error adding user %s to room %s: %v", userId, roomId, err)
	}
	// Refresh expiration (4 hours)
	Client.Expire(ctx, key, 4*time.Hour)
}

// RemoveUserFromRoom removes a user from a video call room
func RemoveUserFromRoom(roomId, userId string) {
	key := "video:room:" + roomId + ":users"
	if err := Client.SRem(ctx, key, userId).Err(); err != nil {
		log.Printf("Error removing user %s from room %s: %v", userId, roomId, err)
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
		log.Printf("Error getting participants for room %s: %v", roomId, err)
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
		log.Printf("Error initializing room %s: %v", roomId, err)
	}
	// Set expiration
	Client.Expire(ctx, metaKey, 4*time.Hour)
}

// DeleteRoom removes all room data (users and metadata)
func DeleteRoom(roomId string) {
	usersKey := "video:room:" + roomId + ":users"
	metaKey := "video:room:" + roomId + ":meta"
	Client.Del(ctx, usersKey, metaKey)
	log.Printf("Room %s deleted from Redis", roomId)
}

// GetRoomMetadata retrieves room metadata
func GetRoomMetadata(roomId string) map[string]string {
	metaKey := "video:room:" + roomId + ":meta"
	meta, err := Client.HGetAll(ctx, metaKey).Result()
	if err != nil {
		log.Printf("Error getting metadata for room %s: %v", roomId, err)
		return nil
	}
	return meta
}

// GetAllActiveRooms returns list of all active room IDs using SCAN (Safe for production)
func GetAllActiveRooms() []string {
	var rooms []string
	// Pattern to match: video:room:{roomId}:users
	iter := Client.Scan(ctx, 0, "video:room:*:users", 0).Iterator()

	for iter.Next(ctx) {
		key := iter.Val()
		// Parse roomId from key
		parts := strings.Split(key, ":")
		if len(parts) >= 3 {
			// key structure: video, room, {id}, users
			rooms = append(rooms, parts[2])
		}
	}

	if err := iter.Err(); err != nil {
		log.Printf("Error scanning active rooms: %v", err)
	}
	return rooms
}
