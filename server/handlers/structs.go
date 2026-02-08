package handlers

import (
	"encoding/json"
	"time"

	"github.com/gorilla/websocket"
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

// GroupMessagePayload is used for broadcasting group messages via WebSocket/Redis
type GroupMessagePayload struct {
	GroupID    string    `json:"groupID"`
	FromUserID string    `json:"fromUserID"`
	Message    string    `json:"message"`
	Type       string    `json:"type"`
	CreatedAt  time.Time `json:"createdAt"`
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
	FromUserID string    `json:"fromUserID" binding:"required"`
	ToUserID   string    `json:"toUserID" binding:"required"`
	Message    string    `json:"message" binding:"required"`
	Type       string    `json:"type"` // "text", "image"
	TempID     string    `json:"tempId,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}

type APIResponse struct {
	Code     int         `json:"code"`
	Status   string      `json:"status"`
	Message  string      `json:"message"`
	Response interface{} `json:"response"`
}

type GroupMember struct {
	UserID   string    `json:"userID" bson:"userID"`
	Username string    `json:"username,omitempty" bson:"username,omitempty"`
	Role     string    `json:"role" bson:"role"` // "admin", "member"
	JoinedAt time.Time `json:"joinedAt" bson:"joinedAt"`
}

type GroupSettings struct {
	IsPublic          bool `json:"isPublic" bson:"isPublic"`
	AllowInvites      bool `json:"allowInvites" bson:"allowInvites"`
	MessagesCanDelete bool `json:"messagesCanDelete" bson:"messagesCanDelete"`
}

type GroupDetails struct {
	ID          string        `json:"id" bson:"_id,omitempty"`
	Name        string        `json:"name" bson:"name"`
	Description string        `json:"description" bson:"description"`
	Avatar      string        `json:"avatar" bson:"avatar"`
	CreatorID   string        `json:"creatorID" bson:"creatorID"`
	Members     []GroupMember `json:"members" bson:"members"`
	Settings    GroupSettings `json:"settings" bson:"settings"`
	CreatedAt   time.Time     `json:"createdAt" bson:"createdAt"`
	UpdatedAt   time.Time     `json:"updatedAt" bson:"updatedAt"`
}

type GroupResponse struct {
	GroupID     string    `json:"groupID"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Avatar      string    `json:"avatar"`
	CreatorID   string    `json:"creatorID"`
	MemberCount int       `json:"memberCount"`
	CreatedAt   time.Time `json:"createdAt"`
}

type CreateGroupRequest struct {
	Name        string   `json:"name" binding:"required"`
	Description string   `json:"description"`
	Avatar      string   `json:"avatar"`
	CreatorID   string   `json:"creatorID" binding:"required"`
	MemberIDs   []string `json:"memberIDs"` // Optional: initial members
}

type AddMemberRequest struct {
	GroupID string `json:"groupID" binding:"required"`
	UserID  string `json:"userID" binding:"required"`
}

type UpdateGroupRequest struct {
	GroupID     string `json:"groupID" binding:"required"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Avatar      string `json:"avatar"`
}

type GroupMessage struct {
	ID         string    `json:"id" bson:"_id,omitempty"`
	GroupID    string    `json:"groupID" bson:"groupID"`
	FromUserID string    `json:"fromUserID" bson:"fromUserID"`
	Message    string    `json:"message" bson:"message"`
	Type       string    `json:"type" bson:"type"` // "text", "image", "file"
	CreatedAt  time.Time `json:"createdAt" bson:"createdAt"`
}

type GroupMessageRequest struct {
	GroupID    string `json:"groupID" binding:"required"`
	FromUserID string `json:"fromUserID" binding:"required"`
	Message    string `json:"message" binding:"required"`
	Type       string `json:"type"` // "text", "image", "file"
}

type StartCallRequest struct {
	GroupID  string `json:"groupID" binding:"required"`
	CallerID string `json:"callerID" binding:"required"`
}

// Video call related structs (for integration)

type VideoCallNotification struct {
	RoomID     string    `json:"roomID"`
	GroupID    string    `json:"groupID"`
	CallerID   string    `json:"callerID"`
	CallerName string    `json:"callerName"`
	Timestamp  time.Time `json:"timestamp"`
}

type ActiveCall struct {
	RoomID       string    `json:"roomID"`
	GroupID      string    `json:"groupID"`
	Participants []string  `json:"participants"`
	StartedAt    time.Time `json:"startedAt"`
}

// SignalMessage represents WebRTC signaling messages
type SignalMessage struct {
	Type     string          `json:"type"`     // "offer", "answer", "ice-candidate", "user-joined", "user-left"
	UserId   string          `json:"userId"`   // Sender's user ID
	TargetId string          `json:"targetId"` // Recipient's user ID (for peer-to-peer)
	RoomId   string          `json:"roomId"`   // Room ID
	SDP      *SessionDesc    `json:"sdp,omitempty"`
	ICE      *ICECandidate   `json:"ice,omitempty"`
	Metadata json.RawMessage `json:"metadata,omitempty"` // Additional data
}

// SessionDesc represents SDP (Session Description Protocol)
type SessionDesc struct {
	Type string `json:"type"` // "offer" or "answer"
	SDP  string `json:"sdp"`  // SDP string
}

// ICECandidate represents an ICE candidate
type ICECandidate struct {
	Candidate     string `json:"candidate"`
	SDPMid        string `json:"sdpMid"`
	SDPMLineIndex int    `json:"sdpMLineIndex"`
}

// CreateRoomRequest for creating a new video call room
type CreateRoomRequest struct {
	RoomId    string `json:"roomId"`    // Optional: custom room ID
	CreatorId string `json:"creatorId"` // User creating the room
	GroupId   string `json:"groupId"`   // Optional: associated group
	Type      string `json:"type"`      // "peer" or "group"
}

// RoomParticipant represents a user in a video call
type RoomParticipant struct {
	UserId      string `json:"userId"`
	Username    string `json:"username"`
	JoinedAt    int64  `json:"joinedAt"`
	AudioMuted  bool   `json:"audioMuted"`
	VideoMuted  bool   `json:"videoMuted"`
	IsScreening bool   `json:"isScreening"` // Screen sharing
}

// RoomInfo contains metadata about a video call room
type RoomInfo struct {
	RoomId       string            `json:"roomId"`
	CreatorId    string            `json:"creatorId"`
	GroupId      string            `json:"groupId,omitempty"`
	Type         string            `json:"type"` // "peer" or "group"
	CreatedAt    int64             `json:"createdAt"`
	Participants []RoomParticipant `json:"participants"`
	IsActive     bool              `json:"isActive"`
}

// MediaSettings represents user's media configuration
type MediaSettings struct {
	Audio        bool   `json:"audio"`        // Audio enabled
	Video        bool   `json:"video"`        // Video enabled
	ScreenShare  bool   `json:"screenShare"`  // Screen sharing enabled
	VideoQuality string `json:"videoQuality"` // "low", "medium", "high"
}

// CallNotification for notifying users about incoming calls
type CallNotification struct {
	RoomId     string `json:"roomId"`
	CallerId   string `json:"callerId"`
	CallerName string `json:"callerName"`
	Type       string `json:"type"` // "peer" or "group"
	GroupName  string `json:"groupName,omitempty"`
}
