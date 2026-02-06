package handlers

import (
	"encoding/json"
	"github.com/gorilla/websocket"
	"time"
)

type UserDetails struct {
	ID        string    `bson:"_id,omitempty"`
	Username  string    `json:"username" binding:"required" bson:"username"`
	Password  string    `json:"-" bson:"password"`
	Online    string    `json:"online" bson:"online"`
	SocketID  string    `json:"socketId,omitempty" bson:"socketId,omitempty"`
	CreatedAt time.Time `json:"createdAt,omitempty" bson:"createdAt,omitempty"`
}

type Message struct {
	ID         string    `json:"id" bson:"_id,omitempty"`
	Message    string    `json:"message" binding:"required" bson:"message"`
	ToUserID   string    `json:"toUserID" binding:"required" bson:"toUserID"`
	FromUserID string    `json:"fromUserID" binding:"required" bson:"fromUserID"`
	Type       string    `json:"type" bson:"type"` // "text", "image", "file"
	CreatedAt  time.Time `json:"createdAt,omitempty" bson:"createdAt,omitempty"`
}

// NEW: Friend System Structs
type Friendship struct {
	ID          string    `json:"id" bson:"_id,omitempty"`
	RequesterID string    `json:"requesterID" bson:"requesterID"`
	AddresseeID string    `json:"addresseeID" bson:"addresseeID"`
	Status      string    `json:"status" bson:"status"` // "pending", "accepted"
	CreatedAt   time.Time `json:"createdAt" bson:"createdAt"`
}

type FriendRequestPayload struct {
	TargetUsername string `json:"targetUsername" binding:"required"`
}

type FriendRequestResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Status   string `json:"status"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegistrationRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type UserResponse struct {
	Username string `json:"username"`
	UserID   string `json:"userID"`
	Online   string `json:"online"`
}

type WSMessage struct {
	Type     string          `json:"type"`
	Payload  json.RawMessage `json:"payload"`
	TargetID string          `json:"targetID,omitempty"`
}

type Client struct {
	Lobby  *Lobby
	Conn   *websocket.Conn
	Send   chan WSMessage
	UserID string
}

type MessagePayload struct {
	FromUserID string `json:"fromUserID" binding:"required"`
	ToUserID   string `json:"toUserID" binding:"required"`
	Message    string `json:"message" binding:"required"`
	Type       string `json:"type"` // "text", "image"
	TempID     string `json:"tempId,omitempty"`
}

type APIResponse struct {
	Code     int         `json:"code"`
	Status   string      `json:"status"`
	Message  string      `json:"message"`
	Response interface{} `json:"response"`
}