package webrtc

import (
	"encoding/json"
	"log"

	"video-service/models"
)

// Configuration constants for WebRTC
const (
	// STUN servers for NAT traversal
	DefaultSTUNServer = "stun:stun.l.google.com:19302"

	// ICE gathering timeout
	ICEGatheringTimeout = 5000 // milliseconds
)

// GetICEServers returns the list of ICE servers for WebRTC connections
// These are sent to clients to help with NAT traversal
func GetICEServers() []map[string]interface{} {
	return []map[string]interface{}{
		{
			"urls": []string{DefaultSTUNServer},
		},
		// TODO: Add TURN servers for better connectivity
		// TURN servers require authentication
		// {
		// 	"urls":       []string{"turn:your-turn-server.com:3478"},
		// 	"username":   "your-username",
		// 	"credential": "your-password",
		// },
	}
}

// ValidateSDP checks if an SDP message is valid
func ValidateSDP(sdp *models.SessionDesc) bool {
	if sdp == nil {
		return false
	}

	if sdp.Type != "offer" && sdp.Type != "answer" {
		log.Printf("Invalid SDP type: %s", sdp.Type)
		return false
	}

	if sdp.SDP == "" {
		log.Println("Empty SDP string")
		return false
	}

	// TODO: Add more thorough SDP validation
	// - Check for required fields
	// - Validate codec support
	// - Check media lines

	return true
}

// ValidateICECandidate checks if an ICE candidate is valid
func ValidateICECandidate(ice *models.ICECandidate) bool {
	if ice == nil {
		return false
	}

	if ice.Candidate == "" {
		log.Println("Empty ICE candidate")
		return false
	}

	// TODO: Add more ICE validation
	// - Check candidate format
	// - Validate transport protocol
	// - Check address format

	return true
}

// SerializeSignalMessage converts a signal message to JSON
func SerializeSignalMessage(msg models.SignalMessage) ([]byte, error) {
	return json.Marshal(msg)
}

// DeserializeSignalMessage converts JSON to a signal message
func DeserializeSignalMessage(data []byte) (*models.SignalMessage, error) {
	var msg models.SignalMessage
	err := json.Unmarshal(data, &msg)
	if err != nil {
		return nil, err
	}
	return &msg, nil
}

// CreateOfferMessage creates a properly formatted offer message
func CreateOfferMessage(userId, targetId, roomId string, sdp *models.SessionDesc) models.SignalMessage {
	return models.SignalMessage{
		Type:     "offer",
		UserId:   userId,
		TargetId: targetId,
		RoomId:   roomId,
		SDP:      sdp,
	}
}

// CreateAnswerMessage creates a properly formatted answer message
func CreateAnswerMessage(userId, targetId, roomId string, sdp *models.SessionDesc) models.SignalMessage {
	return models.SignalMessage{
		Type:     "answer",
		UserId:   userId,
		TargetId: targetId,
		RoomId:   roomId,
		SDP:      sdp,
	}
}

// CreateICEMessage creates a properly formatted ICE candidate message
func CreateICEMessage(userId, targetId, roomId string, ice *models.ICECandidate) models.SignalMessage {
	return models.SignalMessage{
		Type:     "ice-candidate",
		UserId:   userId,
		TargetId: targetId,
		RoomId:   roomId,
		ICE:      ice,
	}
}

// MediaConstraints represents WebRTC media constraints
type MediaConstraints struct {
	Audio AudioConstraints `json:"audio"`
	Video VideoConstraints `json:"video"`
}

// AudioConstraints for audio streams
type AudioConstraints struct {
	EchoCancellation bool `json:"echoCancellation"`
	NoiseSuppression bool `json:"noiseSuppression"`
	AutoGainControl  bool `json:"autoGainControl"`
}

// VideoConstraints for video streams
type VideoConstraints struct {
	Width  int    `json:"width"`
	Height int    `json:"height"`
	FPS    int    `json:"fps"`
	Facing string `json:"facing"` // "user" or "environment"
}

// GetDefaultMediaConstraints returns default media constraints
func GetDefaultMediaConstraints() MediaConstraints {
	return MediaConstraints{
		Audio: AudioConstraints{
			EchoCancellation: true,
			NoiseSuppression: true,
			AutoGainControl:  true,
		},
		Video: VideoConstraints{
			Width:  1280,
			Height: 720,
			FPS:    30,
			Facing: "user",
		},
	}
}

// GetMobileMediaConstraints returns optimized constraints for mobile
func GetMobileMediaConstraints() MediaConstraints {
	return MediaConstraints{
		Audio: AudioConstraints{
			EchoCancellation: true,
			NoiseSuppression: true,
			AutoGainControl:  true,
		},
		Video: VideoConstraints{
			Width:  640,
			Height: 480,
			FPS:    24,
			Facing: "user",
		},
	}
}

// TODO: Implement SFU (Selective Forwarding Unit) for group calls
// This would require:
// - Media stream processing
// - Bandwidth optimization
// - Quality adaptation
// - Recording capabilities

// TODO: Implement recording functionality
// - Start/stop recording
// - Store recordings
// - Generate thumbnails
// - Handle storage limits

// TODO: Implement call quality metrics
// - Packet loss tracking
// - Latency measurements
// - Bandwidth usage
// - Connection quality scoring
