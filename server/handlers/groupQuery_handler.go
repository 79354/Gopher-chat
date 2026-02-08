package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"chat-app/config"
	"chat-app/constants"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CreateGroupQuery inserts a new group into MongoDB
func CreateGroupQuery(req CreateGroupRequest) (GroupResponse, error) {
	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("groups")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 1. Create initial members list (Creator is admin)
	creatorID := req.CreatorID
	creator := GetUserByUserID(creatorID)

	members := []GroupMember{
		{
			UserID:   creatorID,
			Username: creator.Username,
			Role:     "admin",
			JoinedAt: time.Now(),
		},
	}

	// Add other invited members
	for _, memberID := range req.MemberIDs {
		// Avoid duplicates
		if memberID == creatorID {
			continue
		}
		user := GetUserByUserID(memberID)
		if user.ID != "" {
			members = append(members, GroupMember{
				UserID:   user.ID,
				Username: user.Username,
				Role:     "member",
				JoinedAt: time.Now(),
			})
		}
	}

	// 2. Prepare Group Document
	newGroup := GroupDetails{
		ID:          primitive.NewObjectID().Hex(), // Generate ID manually to return it easily
		Name:        req.Name,
		Description: req.Description,
		Avatar:      req.Avatar,
		CreatorID:   creatorID,
		Members:     members,
		Settings: GroupSettings{
			IsPublic:          false,
			AllowInvites:      true,
			MessagesCanDelete: false,
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Overwrite the ObjectID with the generated one
	objID, _ := primitive.ObjectIDFromHex(newGroup.ID)

	insertDoc := bson.M{
		"_id":         objID,
		"name":        newGroup.Name,
		"description": newGroup.Description,
		"avatar":      newGroup.Avatar,
		"creatorID":   newGroup.CreatorID,
		"members":     newGroup.Members,
		"settings":    newGroup.Settings,
		"createdAt":   newGroup.CreatedAt,
		"updatedAt":   newGroup.UpdatedAt,
	}

	_, err := collection.InsertOne(ctx, insertDoc)
	if err != nil {
		return GroupResponse{}, errors.New(constants.ServerFailedResponse)
	}

	return GroupResponse{
		GroupID:     newGroup.ID,
		Name:        newGroup.Name,
		Description: newGroup.Description,
		Avatar:      newGroup.Avatar,
		CreatorID:   newGroup.CreatorID,
		MemberCount: len(newGroup.Members),
		CreatedAt:   newGroup.CreatedAt,
	}, nil
}

// GetGroupsByUserID fetches all groups a user belongs to
func GetGroupsByUserID(userID string) ([]GroupResponse, error) {
	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("groups")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Find groups where 'members.userID' matches the input userID
	filter := bson.M{"members.userID": userID}
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var groups []GroupResponse
	for cursor.Next(ctx) {
		var group GroupDetails
		if err := cursor.Decode(&group); err == nil {
			groups = append(groups, GroupResponse{
				GroupID:     group.ID,
				Name:        group.Name,
				Description: group.Description,
				Avatar:      group.Avatar,
				CreatorID:   group.CreatorID,
				MemberCount: len(group.Members),
				CreatedAt:   group.CreatedAt,
			})
		}
	}
	return groups, nil
}

// GetGroupByID fetches full details of a specific group
func GetGroupByID(groupID string) (GroupDetails, error) {
	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("groups")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return GroupDetails{}, errors.New("invalid group ID")
	}

	var group GroupDetails
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&group)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return GroupDetails{}, errors.New("group not found")
		}
		return GroupDetails{}, err
	}

	return group, nil
}

// AddMemberToGroup adds a user to the group
func AddMemberToGroup(groupID, userID, role string) error {
	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("groups")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return errors.New("invalid group ID")
	}

	// Check if user exists
	user := GetUserByUserID(userID)
	if user.ID == "" {
		return errors.New("user not found")
	}

	// Check if already a member
	count, _ := collection.CountDocuments(ctx, bson.M{
		"_id":            objID,
		"members.userID": userID,
	})
	if count > 0 {
		return errors.New("user is already a member")
	}

	newMember := GroupMember{
		UserID:   userID,
		Username: user.Username,
		Role:     role,
		JoinedAt: time.Now(),
	}

	_, err = collection.UpdateOne(ctx,
		bson.M{"_id": objID},
		bson.M{"$push": bson.M{"members": newMember}},
	)

	return err
}

// RemoveMemberFromGroup removes a user from the group
func RemoveMemberFromGroup(groupID, userID string) error {
	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("groups")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return errors.New("invalid group ID")
	}

	// Don't allow removing the creator (simple logic for now)
	// In a real app, ownership transfer logic is needed
	var group GroupDetails
	collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&group)
	if group.CreatorID == userID {
		return errors.New("cannot remove the group creator")
	}

	_, err = collection.UpdateOne(ctx,
		bson.M{"_id": objID},
		bson.M{"$pull": bson.M{"members": bson.M{"userID": userID}}},
	)

	return err
}

// UpdateGroup modifies group details
func UpdateGroup(req UpdateGroupRequest) error {
	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("groups")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(req.GroupID)
	if err != nil {
		return errors.New("invalid group ID")
	}

	updateFields := bson.M{}
	if req.Name != "" {
		updateFields["name"] = req.Name
	}
	if req.Description != "" {
		updateFields["description"] = req.Description
	}
	if req.Avatar != "" {
		updateFields["avatar"] = req.Avatar
	}
	updateFields["updatedAt"] = time.Now()

	_, err = collection.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": updateFields})
	return err
}

// DeleteGroupByID deletes the group
func DeleteGroupByID(groupID, requesterID string) error {
	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("groups")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return errors.New("invalid group ID")
	}

	// Verify requester is creator
	var group GroupDetails
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&group)
	if err != nil {
		return errors.New("group not found")
	}

	if group.CreatorID != requesterID {
		return errors.New("only the creator can delete the group")
	}

	_, err = collection.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}

// StoreGroupMessage saves a message to the database
func StoreGroupMessage(req GroupMessageRequest) (string, error) {
	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("group_messages")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	id := primitive.NewObjectID()

	_, err := collection.InsertOne(ctx, bson.M{
		"_id":        id,
		"groupID":    req.GroupID,
		"fromUserID": req.FromUserID,
		"message":    req.Message,
		"type":       req.Type,
		"createdAt":  time.Now(),
	})

	if err != nil {
		return "", err
	}

	return id.Hex(), nil
}

// GetGroupMessageHistory fetches messages with pagination
func GetGroupMessageHistory(groupID string, page string) ([]GroupMessage, error) {
	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("group_messages")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Basic pagination (implement logic to convert page string to offset)
	// For now, let's just return the last 50 messages
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: 1}}).SetLimit(50)

	cursor, err := collection.Find(ctx, bson.M{"groupID": groupID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var messages []GroupMessage
	if err = cursor.All(ctx, &messages); err != nil {
		return nil, err
	}

	return messages, nil
}

// InitiateGroupVideoCall contacts the Video Service to create a room
func InitiateGroupVideoCall(groupID, callerID string) (string, error) {
	// 1. Define the payload expected by Video Service
	requestBody, err := json.Marshal(map[string]string{
		"roomId":    "room_" + groupID, // Consistent naming
		"creatorId": callerID,
		"groupId":   groupID,
		"type":      "group",
	})
	if err != nil {
		return "", err
	}

	// 2. Get Video Service URL (Default to localhost:4000 if not in .env)
	videoServiceURL := os.Getenv("VIDEO_SERVICE_URL")
	if videoServiceURL == "" {
		videoServiceURL = "http://localhost:4000"
	}

	// 3. Make the HTTP Request
	resp, err := http.Post(videoServiceURL+"/api/rooms/create", "application/json", bytes.NewBuffer(requestBody))
	if err != nil {
		log.Printf("Failed to contact video service: %v", err)
		return "", errors.New("video service unavailable")
	}
	defer resp.Body.Close()

	// 4. Check for success (200 OK)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("video service returned status: %d", resp.StatusCode)
	}

	// 5. Parse the JSON response to get the confirmed Room ID
	var res map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}

	return res["roomId"].(string), nil
}

// BroadcastQueue is a channel to send messages from HTTP handlers to the WebSocket Hub.
// The main server.go will listen to this channel.
var BroadcastQueue = make(chan WSMessage, 1000)

// BroadcastGroupMessage sends a real-time message to all online members of a group
func BroadcastGroupMessage(groupID, fromUserID, message, msgType string) {
	// 1. Get Group Details
	group, err := GetGroupByID(groupID)
	if err != nil {
		log.Printf("Failed to broadcast: group %s not found", groupID)
		return
	}

	// 2. Prepare Payload
	payload := GroupMessagePayload{
		GroupID:    groupID,
		FromUserID: fromUserID,
		Message:    message,
		Type:       msgType,
		CreatedAt:  time.Now(),
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Failed to marshal broadcast payload: %v", err)
		return
	}

	// 3. Send to MainLobby
	for _, member := range group.Members {
		// Create the WSMessage wrapper
		wsMsg := WSMessage{
			Type:     "group-message",
			Payload:  payloadBytes,
			TargetID: member.UserID, // Lobby will route this to the correct connection
		}

		// Push to the lobby's broadcast channel
		// Use non-blocking send to prevent hanging if lobby is busy
		select {
		case MainLobby.broadcast <- wsMsg:
		default:
			log.Printf("Warning: Lobby broadcast channel full, dropping message for %s", member.UserID)
		}
	}
}

// NotifyGroupCall alerts all group members that a video call has started
func NotifyGroupCall(groupID, callerID, roomID string) {
	group, err := GetGroupByID(groupID)
	if err != nil {
		return
	}

	payload := GroupMessagePayload{
		GroupID:    groupID,
		FromUserID: callerID,
		Message:    roomID, // The payload is the Room ID
		Type:       "call-invite",
		CreatedAt:  time.Now(),
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return
	}

	for _, member := range group.Members {
		if member.UserID == callerID {
			continue
		}

		wsMsg := WSMessage{
			Type:     "group-message",
			Payload:  payloadBytes,
			TargetID: member.UserID,
		}

		select {
		case MainLobby.broadcast <- wsMsg:
		default:
		}
	}
}
