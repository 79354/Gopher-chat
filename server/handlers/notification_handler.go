package handlers

import (
	"encoding/json"
	"time"
)

type NotificationPayload struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"` // "info", "warning", "new_message"
	Message   string    `json:"message"`
	FromUser  string    `json:"fromUser,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// SendNotification creates a notification event and pushes it via Redis
func SendNotification(toUserID, fromUsername, messageType, alertText string) {
	
	notif := NotificationPayload{
		ID:        time.Now().String(), // In prod use UUID
		Type:      messageType,
		Message:   alertText,
		FromUser:  fromUsername,
		Timestamp: time.Now(),
	}

	payloadBytes, _ := json.Marshal(notif)

	// Wrap in our standard WSMessage
	wsMsg := WSMessage{
		Type:    "notification",
		Payload: payloadBytes,
	}

	// For specific user targeting, we can embed the target ID in the payload
	// or modify WSMessage to have a 'TargetID' field.
	// For this implementation, we will broadcast and let clients filter, 
	// OR (Better) we add a TargetID to WSMessage.
	
	// We'll update WSMessage struct below to support routing.
	PublishMessage(wsMsg)
}