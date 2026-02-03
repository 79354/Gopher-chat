package handlers

import (
	"chat-app/config"
	"context"
	"encoding/json"
	"log"
)

const (
	PubSubChannel = "chat_global_channel"
)

// PublishMessage sends a message to the Redis channel
func PublishMessage(msg WSMessage) {
	ctx := context.Background()
	payload, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling message for Redis: %v", err)
		return
	}

	err = config.RedisClient.Publish(ctx, PubSubChannel, payload).Err()
	if err != nil {
		log.Printf("Error publishing to Redis: %v", err)
	}
}

// SubscribeToRedis listens for messages from other servers and forwards them to the local lobby
func SubscribeToRedis(lobby *Lobby) {
	ctx := context.Background()
	subscriber := config.RedisClient.Subscribe(ctx, PubSubChannel)

	log.Println("Subscribed to Redis channel:", PubSubChannel)

	ch := subscriber.Channel()

	for msg := range ch {
		var wsMsg WSMessage
		if err := json.Unmarshal([]byte(msg.Payload), &wsMsg); err != nil {
			log.Printf("Error unmarshaling Redis message: %v", err)
			continue
		}

		// When we receive a message from Redis, we treat it as a local event
		// and send it to the appropriate users connected to THIS server.
		BroadcastLocal(lobby, wsMsg)
	}
}