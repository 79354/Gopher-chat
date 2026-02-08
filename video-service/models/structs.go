package models

import "encoding/json"

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
