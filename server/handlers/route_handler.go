package handlers

import (
	// "log"
	"context"
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"sync"
	"time"

	"chat-app/config"
	"chat-app/constants"

	"github.com/gin-gonic/gin"
)

func RenderHome() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, APIResponse{
			Code:     http.StatusOK,
			Status:   http.StatusText(http.StatusOK),
			Message:  constants.APIWelcomeMessage,
			Response: nil,
		})
	}
}

func IsUsernameAvailable() gin.HandlerFunc {
	return func(c *gin.Context) {
		type usernameAvailable struct {
			IsUsernameAvailable bool `json:"isUsernameAvailable"`
		}

		username := c.Param("username")
		isAlphaNumeric := regexp.MustCompile(`^[A-Za-z0-9]([A-Za-z0-9_-]*[A-Za-z0-9])?$`).MatchString

		if !isAlphaNumeric(username) {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code:     http.StatusBadRequest,
				Status:   http.StatusText(http.StatusBadRequest),
				Message:  constants.UsernameCantBeEmpty,
				Response: nil,
			})
			return
		}

		isUsernameAvailable := IsUsernameAvailableQueryHandler(username)
		if isUsernameAvailable {
			c.JSON(http.StatusOK, APIResponse{
				Code:    http.StatusOK,
				Status:  http.StatusText(http.StatusOK),
				Message: constants.UsernameIsAvailable,
				Response: usernameAvailable{
					IsUsernameAvailable: true,
				},
			})
		} else {
			c.JSON(http.StatusOK, APIResponse{
				Code:    http.StatusOK,
				Status:  http.StatusText(http.StatusOK),
				Message: constants.UsernameIsNotAvailable,
				Response: usernameAvailable{
					IsUsernameAvailable: false,
				},
			})
		}
	}
}

func Login() gin.HandlerFunc {
	return func(c *gin.Context) {
		var userDetails LoginRequest

		if err := c.ShouldBindJSON(&userDetails); err != nil {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code:     http.StatusBadRequest,
				Status:   http.StatusText(http.StatusBadRequest),
				Message:  constants.UsernameAndPasswordCantBeEmpty,
				Response: nil,
			})
			return
		}

		if userDetails.Username == "" {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code:     http.StatusBadRequest,
				Status:   http.StatusText(http.StatusBadRequest),
				Message:  constants.UsernameCantBeEmpty,
				Response: nil,
			})
		}

		if userDetails.Password == "" {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:     http.StatusInternalServerError,
				Status:   http.StatusText(http.StatusInternalServerError),
				Message:  constants.PasswordCantBeEmpty,
				Response: nil,
			})

		}

		userDetailsResponse, loginErrorMessage := LoginQueryHandler(userDetails)

		if loginErrorMessage != nil {
			c.JSON(http.StatusNotFound, APIResponse{
				Code:     http.StatusNotFound,
				Status:   http.StatusText(http.StatusNotFound),
				Message:  loginErrorMessage.Error(),
				Response: nil,
			})
			return
		}

		// succesfil login
		c.JSON(http.StatusOK, APIResponse{
			Code:     http.StatusOK,
			Status:   http.StatusText(http.StatusOK),
			Message:  constants.UserLoginCompleted,
			Response: userDetailsResponse,
		})
	}
}

func Registration() gin.HandlerFunc {
	return func(c *gin.Context) {
		var requestPayload RegistrationRequest

		if err := c.ShouldBindJSON(&requestPayload); err != nil {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code:     http.StatusBadRequest,
				Status:   http.StatusText(http.StatusBadRequest),
				Message:  constants.ServerFailedResponse,
				Response: nil,
			})
			return
		}

		if requestPayload.Username == "" {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code:     http.StatusBadRequest,
				Status:   http.StatusText(http.StatusBadRequest),
				Message:  constants.UsernameCantBeEmpty,
				Response: nil,
			})
			return
		}

		if requestPayload.Password == "" {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code:     http.StatusBadRequest,
				Status:   http.StatusText(http.StatusBadRequest),
				Message:  constants.PasswordCantBeEmpty,
				Response: nil,
			})
			return
		}

		userObjectID, registrationErr := RegisterQueryHandler(requestPayload)
		if registrationErr != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:     http.StatusInternalServerError,
				Status:   http.StatusText(http.StatusInternalServerError),
				Message:  constants.ServerFailedResponse,
				Response: nil,
			})
			return
		}

		c.JSON(http.StatusOK, APIResponse{
			Code:    http.StatusOK,
			Status:  http.StatusText(http.StatusOK),
			Message: constants.UserRegistrationCompleted,
			Response: UserResponse{
				Username: requestPayload.Username,
				UserID:   userObjectID,
			},
		})
	}
}

func UserSessionCheck() gin.HandlerFunc {
	return func(c *gin.Context) {
		var IsAlphaNumeric = regexp.MustCompile(`^[A-Za-z0-9]([A-Za-z0-9_-]*[A-Za-z0-9])?$`).MatchString
		uid := c.Param("userID")

		if !IsAlphaNumeric(uid) {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code:     http.StatusBadRequest,
				Status:   http.StatusText(http.StatusBadRequest),
				Message:  constants.UsernameCantBeEmpty,
				Response: nil,
			})
			return
		}

		userDetails := GetUserByUserID(uid)
		if userDetails == (UserDetails{}) {
			c.JSON(http.StatusOK, APIResponse{
				Code:     http.StatusOK,
				Status:   http.StatusText(http.StatusOK),
				Message:  constants.YouAreNotLoggedIN,
				Response: false,
			})
			return
		}

		// FIXED: Return TRUE if user exists, regardless of Online status
		// This ensures session persistence even if socket disconnected
		c.JSON(http.StatusOK, APIResponse{
			Code:     http.StatusOK,
			Status:   http.StatusText(http.StatusOK),
			Message:  constants.YouAreLoggedIN,
			Response: true,
		})
	}
}

func GetMessagesHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		toUserID := c.Param("toUserID")
		fromUserID := c.Param("fromUserID")

		// Validation
		isAlphaNumeric := regexp.MustCompile(`^[A-Za-z0-9]([A-Za-z0-9_-]*[A-Za-z0-9])?$`).MatchString
		if !isAlphaNumeric(toUserID) || !isAlphaNumeric(fromUserID) {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code:    http.StatusBadRequest,
				Message: constants.UsernameCantBeEmpty,
			})
			return
		}

		// CRITICAL FIX: Handle missing 'page' parameter safely
		pageStr := c.DefaultQuery("page", "1")
		page, err := strconv.Atoi(pageStr)
		if err != nil || page < 1 {
			page = 1
		}
		
		conversations := GetConversationBetweenTwoUsers(toUserID, fromUserID, int64(page))
		
		c.JSON(http.StatusOK, APIResponse{
			Code:     http.StatusOK,
			Status:   http.StatusText(http.StatusOK),
			Message:  constants.SuccessfulResponse,
			Response: conversations,
		})
	}
}

func GetGlobalChatHistory() gin.HandlerFunc {
    return func(c *gin.Context) {
        ctx := context.Background()
        
        // Fetch last 50 messages
        // LRange 0 -1 gets everything, but we trimmed it to 50
        messagesJSON, err := config.RedisClient.LRange(ctx, "global_chat_history", 0, -1).Result()
        if err != nil {
            c.JSON(500, APIResponse{Message: "Error fetching global chat"})
            return
        }
        
        var history []MessagePayload
        // Redis stores LPush (newest first), usually chat wants oldest first
        // We iterate backwards to reverse it, or handle in frontend
        for i := len(messagesJSON) - 1; i >= 0; i-- {
            var msg MessagePayload
            json.Unmarshal([]byte(messagesJSON[i]), &msg)
            history = append(history, msg)
        }
        
        c.JSON(200, APIResponse{
            Code: 200, 
            Response: history,
        })
    }
}


var (
	randomQueue = make(map[string]chan string)
	queueMutex  sync.Mutex
)

// Improved Random Handler
func JoinRandomChatHandler() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := c.Param("userID")
        
        // Use a select with timeout
        timeout := time.After(20 * time.Second)
        
        queueMutex.Lock()
        // Check for match...
        for waitingID, ch := range randomQueue {
            if waitingID != userID {
                delete(randomQueue, waitingID)
                queueMutex.Unlock()
                
                ch <- userID // Wake up the waiter
                
                c.JSON(200, APIResponse{
                    Code: 200, 
                    Response: map[string]string{"matchID": waitingID, "role": "initiator"},
                })
                return
            }
        }
        
        // No match, enqueue self
        myChan := make(chan string)
        randomQueue[userID] = myChan
        queueMutex.Unlock()
        
        select {
        case partnerID := <-myChan:
            c.JSON(200, APIResponse{
                Code: 200, 
                Response: map[string]string{"matchID": partnerID, "role": "peer"},
            })
        case <-timeout:
            queueMutex.Lock()
            delete(randomQueue, userID)
            queueMutex.Unlock()
            c.JSON(408, APIResponse{Code: 408, Message: "No active users found. Try again!"})
        case <-c.Request.Context().Done(): // Client cancelled/closed tab
            queueMutex.Lock()
            delete(randomQueue, userID)
            queueMutex.Unlock()
        }
    }
}

// NEW SOCIAL GRAPH HANDLERS

func SendFriendRequestHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req FriendRequestPayload
		fromUserID := c.Param("fromUserID")

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code: http.StatusBadRequest, Message: "Invalid Request",
			})
			return
		}

		targetUser := GetUserByUsername(req.TargetUsername)
		if targetUser == (UserDetails{}) {
			c.JSON(http.StatusNotFound, APIResponse{
				Code: http.StatusNotFound, Message: "User not found",
			})
			return
		}

		if err := CreateFriendRequest(fromUserID, targetUser.ID); err != nil {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code: http.StatusBadRequest, Message: err.Error(),
			})
			return
		}

		// Trigger Notification via Redis
		sender := GetUserByUserID(fromUserID)
		SendNotification(targetUser.ID, sender.Username, "friend_request", sender.Username+" sent you a friend request")

		c.JSON(http.StatusOK, APIResponse{
			Code: http.StatusOK, Message: "Friend Request Sent",
		})
	}
}

func AcceptFriendRequestHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Requester ID (The person who sent the original request)
		requesterID := c.Param("requesterID")
		// Addressee ID (The person accepting it - ME)
		myUserID := c.Param("myUserID")

		if err := AcceptFriendRequest(requesterID, myUserID); err != nil {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code: http.StatusBadRequest, Message: "Could not accept request",
			})
			return
		}

		// Notify the requester that I accepted
		me := GetUserByUserID(myUserID)
		SendNotification(requesterID, me.Username, "friend_accept", me.Username+" accepted your friend request")

		c.JSON(http.StatusOK, APIResponse{
			Code: http.StatusOK, Message: "Friend Request Accepted",
		})
	}
}

func GetPendingRequestsHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("userID")
		requests, err := GetPendingRequests(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: "Error fetching requests"})
			return
		}
		c.JSON(http.StatusOK, APIResponse{
			Code: http.StatusOK, Response: requests,
		})
	}
}

func GetFriendListHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("userID")
		friends, err := GetFriendList(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{Code: 500, Message: "Error fetching friends"})
			return
		}
		c.JSON(http.StatusOK, APIResponse{
			Code: http.StatusOK, Response: friends,
		})
	}
}

func DeleteMessagesHandler() gin.HandlerFunc {
    return func(c *gin.Context) {
        var req struct {
            MessageIDs []string `json:"messageIDs"`
        }
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(400, APIResponse{Message: "Invalid payload"})
            return
        }
        
        userID := c.Param("userID") // From middleware or param
        
        if err := DeleteMessages(req.MessageIDs, userID); err != nil {
            c.JSON(500, APIResponse{Message: "Failed to delete"})
            return
        }
        
        c.JSON(200, APIResponse{Message: "Messages deleted"})
    }
}

func isRandomChat(userID string) bool {
    // For now, we simply check if the ID is explicitly "random".
    // Since random chat matches assign a real partner ID, 
    // this safeguards the initial join request or specific logic.
    return userID == "random"
}