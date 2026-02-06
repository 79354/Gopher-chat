package handlers

import (
	"bytes"
	"chat-app/config"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

// pingPeriod < pongWait, 6-second buffer in case a pong is a bit delayed.
const (
	writeWait      = 10 * time.Second    // prevents server hang, conn doesnt wait forever to send
	pongWait       = 60 * time.Second    // keeps the server waiting too long, if client disconnects
	pingPeriod     = (pongWait * 9) / 10 // sends regular pings to check if client is active
	maxMessageSize = 512 * 1024          // Increased to 512KB to support base64 images (Goal 1)
)

// Upgrader specifies parameters for upgrading an HTTP connection to a WebSocket connection
var Upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// This CheckOrigin function allows connections from any origin
	// In production, you might want to be more restrictive
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Helper function to easily create WSMessage with correct JSON payload
// Updated to include targetID for Redis routing
func createWSMessage(msgType string, data interface{}, targetID string) WSMessage {
	payloadBytes, _ := json.Marshal(data)
	return WSMessage{
		Type:     msgType,
		Payload:  payloadBytes,
		TargetID: targetID,
	}
}

func HandleSocketPayloadEvents(client *Client, msg WSMessage) {
    type chatListResponse struct {
        Type     string      `json:"type"`
        Chatlist interface{} `json:"chatlist"`
    }
    
    // Structure for the new simple status event
    type userStatusEvent struct {
        UserID   string `json:"userID"`
        Username string `json:"username"`
        Status   string `json:"status"` // "Y" or "N"
    }

    switch msg.Type {
    case "join":
        var userID string
        if err := json.Unmarshal(msg.Payload, &userID); err != nil {
            log.Printf("Error unmarshaling join payload: %v", err)
            return
        }

        userDetails := GetUserByUserID(userID)

        if userDetails.ID != "" {
            if userDetails.Online != "N" {
                // 1. Broadcast "user_status" (Online) to EVERYONE
                statusPayload := createWSMessage("user_status", userStatusEvent{
                    UserID:   userDetails.ID,
                    Username: userDetails.Username,
                    Status:   "Y",
                }, "") 
                PublishMessage(statusPayload)

                // 2. Send "my-chatlist" ONLY to the joining client (so they know who is online)
                allOnlineUsersPayload := createWSMessage("chatlist-response", chatListResponse{
                    Type:     "my-chatlist",
                    Chatlist: GetAllOnlineUsers(userDetails.ID),
                }, userDetails.ID)
                EmitToClient(client.Lobby, allOnlineUsersPayload, userDetails.ID)

                // 3. Flush Offline Messages
                ctx := context.Background()
                offlineKey := "offline_msgs:" + userID
                messages, err := config.RedisClient.LRange(ctx, offlineKey, 0, -1).Result()
                if err == nil && len(messages) > 0 {
                    for _, msgStr := range messages {
                        var savedMsg MessagePayload
                        json.Unmarshal([]byte(msgStr), &savedMsg)
                        payload := createWSMessage("message-response", savedMsg, userID)
                        EmitToClient(client.Lobby, payload, userID)
                    }
                    config.RedisClient.Del(ctx, offlineKey)
                }
            }
        }

    case "disconnect":
        if len(msg.Payload) > 0 {
            var userID string
            if err := json.Unmarshal(msg.Payload, &userID); err == nil {
                userDetails := GetUserByUserID(userID)
                UpdateUserOnlineStatusByUserID(userID, "N")

                // Broadcast "user_status" (Offline) to EVERYONE
                disconnectMsg := createWSMessage("user_status", userStatusEvent{
                    UserID:   userDetails.ID,
                    Username: userDetails.Username,
                    Status:   "N",
                }, "")
                PublishMessage(disconnectMsg)
            }
        }

    case "message":
        var payloadData map[string]string
        if err := json.Unmarshal(msg.Payload, &payloadData); err != nil {
            return
        }

        message := payloadData["message"]
        toUserID := payloadData["toUserID"]
        fromUserID := payloadData["fromUserID"]
        tempID := payloadData["tempId"] 
        msgType := payloadData["type"]
        if msgType == "" { msgType = "text" }

        fromUser := GetUserByUserID(fromUserID)
        toUser := GetUserByUserID(toUserID)

        if message != "" && fromUserID != "" && toUserID != "" {
            messagePacket := MessagePayload{
                FromUserID: fromUserID,
                Message:    message,
                ToUserID:   toUserID,
                Type:       msgType,
                TempID:     tempID,
                CreatedAt:  time.Now(),
            }

            if toUserID == "global" {
                globalPayload := createWSMessage("message-response", messagePacket, "") 
                PublishMessage(globalPayload)
                
                ctx := context.Background()
                jsonMsg, _ := json.Marshal(messagePacket)
                config.RedisClient.LPush(ctx, "global_chat_history", jsonMsg)
                config.RedisClient.LTrim(ctx, "global_chat_history", 0, 49)
                
            } else if toUserID == "random" || isRandomChat(toUserID) { 
                responsePayload := createWSMessage("message-response", messagePacket, toUserID)
                PublishMessage(responsePayload)
            } else {
                StoreNewMessages(messagePacket)

                responsePayload := createWSMessage("message-response", messagePacket, toUserID)
                PublishMessage(responsePayload)

                if toUser.Online != "Y" {
                    ctx := context.Background()
                    jsonMsg, _ := json.Marshal(messagePacket)
                    config.RedisClient.RPush(ctx, "offline_msgs:"+toUserID, jsonMsg)
                }

                if fromUserID != toUserID {
                    ackPayload := createWSMessage("message-response", messagePacket, fromUserID)
                    PublishMessage(ackPayload)
                }
                SendNotification(toUserID, fromUser.Username, "new_message", "New message from "+fromUser.Username)
            }
        }

    case "typing": 
        var payloadData map[string]interface{}
        if err := json.Unmarshal(msg.Payload, &payloadData); err != nil {
            return
        }
        toUserID := payloadData["toUserID"].(string)
        // Broadcast typing to the target user
        PublishMessage(createWSMessage("typing-response", payloadData, toUserID))
    }
}

func setSocketPayloadReadConfig(c *Client) {
	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait)) // deadline for pong reponse
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	}) // extends the pong deadline
}

// client stays in the lobby, but client side Conn is closed
func unRegisterAndCloseConn(c *Client) {
	c.Lobby.unregister <- c
	c.Conn.Close()
}

func (c *Client) readPump() {
	var msg WSMessage

	defer unRegisterAndCloseConn(c)

	setSocketPayloadReadConfig(c)

	for {
		_, payload, err := c.Conn.ReadMessage()

		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error ===: %v", err)
			}
			break
		}

		decoder := json.NewDecoder(bytes.NewReader(payload))
		decoderErr := decoder.Decode(&msg)

		if decoderErr != nil {
			log.Printf("error: %v", decoderErr)
			break
		}

		HandleSocketPayloadEvents(c, msg)
	}
}

// sends mssg, from: server to client
func (c *Client) writePump() {
	// starts a ticker to trigger pings every pingPeriod(54 seconds)
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case payload, ok := <-c.Send:

			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}

			// Encode the WSMessage struct to JSON
			json.NewEncoder(w).Encode(payload)

			// Add queued messages to the current websocket frame
			n := len(c.Send)
			for i := 0; i < n; i++ {
				json.NewEncoder(w).Encode(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		// This sends a ping message every pingPeriod to check if the client is still connected.
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func CreateClient(lobby *Lobby, connection *websocket.Conn, userID string) {
	client := &Client{
		Lobby:  lobby,
		Conn:   connection,
		Send:   make(chan WSMessage),
		UserID: userID,
	}

	go client.writePump() // uses ping, mssg: server
	go client.readPump()  // uses pong

	client.Lobby.register <- client
}

// Join for new Socket Users
func HandleUserRegisterEvent(lobby *Lobby, client *Client) {
	lobby.clients[client] = true

	// Create payload manually for the internal event
	payloadBytes, _ := json.Marshal(client.UserID)

	HandleSocketPayloadEvents(client, WSMessage{
		Type:    "join",
		Payload: payloadBytes,
	})
}

// Disconnect for Socket Users
func HandleUserDisconnectEvent(lobby *Lobby, client *Client) {
	_, ok := lobby.clients[client]
	if ok {
		// remove client from lobby and close the communication channel
		delete(lobby.clients, client)
		close(client.Send)

		// Create payload manually
		payloadBytes, _ := json.Marshal(client.UserID)

		// close the websocket connection
		HandleSocketPayloadEvents(client, WSMessage{
			Type:    "disconnect",
			Payload: payloadBytes,
		})
	}
}

// Helper functions (Preserved for Redis Adapter usage)
func EmitToClient(lobby *Lobby, payload WSMessage, userID string) {
	for client := range lobby.clients {
		if client.UserID == userID {
			select {
			case client.Send <- payload:
			default:
				close(client.Send)
				delete(lobby.clients, client)
			}
		}
	}
}

func BroadcastToEveryone(lobby *Lobby, payload WSMessage) {
	for client := range lobby.clients {
		select {
		case client.Send <- payload:
		default:
			close(client.Send)
			delete(lobby.clients, client)
		}
	}
}

func BroadcastToEveryoneExceptme(lobby *Lobby, payload WSMessage, myUserID string) {
	for client := range lobby.clients {
		if client.UserID != myUserID {
			select {
			case client.Send <- payload:
			default:
				close(client.Send)
				delete(lobby.clients, client)
			}
		}
	}
}

func BroadcastLocal(lobby *Lobby, payload WSMessage) {
	// If TargetID is specified, send only to that user
	if payload.TargetID != "" {
		EmitToClient(lobby, payload, payload.TargetID)
		return
	}

	// Otherwise broadcast to everyone on this server
	BroadcastToEveryone(lobby, payload)
}