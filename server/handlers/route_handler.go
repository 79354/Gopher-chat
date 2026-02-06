package handlers

import (
	// "log"
	"net/http"
	"regexp"
	"strconv"
	"sync"
	"time"

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

var (
	randomQueue = make(map[string]chan string)
	queueMutex  sync.Mutex
)

func JoinRandomChatHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("userID")

		queueMutex.Lock()
		
		// 1. Check if anyone else is waiting
		for waitingID, ch := range randomQueue {
			if waitingID != userID {
				// Match Found! Remove waiter from queue
				delete(randomQueue, waitingID)
				queueMutex.Unlock()

				// Notify the waiting user (send them MY userID)
				select {
				case ch <- userID:
				default:
					// Waiter disconnected
				}

				// Respond to ME (the Joiner) with THEIR userID
				c.JSON(http.StatusOK, APIResponse{
					Code:    http.StatusOK,
					Message: "Match found",
					Response: map[string]string{
						"matchID": waitingID,
						"role":    "initiator",
					},
				})
				return
			}
		}

		// 2. No match found, add myself to queue
		myChan := make(chan string)
		randomQueue[userID] = myChan
		queueMutex.Unlock()

		// 3. Wait for a match, timeout, or disconnect
		select {
		case partnerID := <-myChan:
			c.JSON(http.StatusOK, APIResponse{
				Code:    http.StatusOK,
				Message: "Match found",
				Response: map[string]string{
					"matchID": partnerID,
					"role":    "peer",
				},
			})
		case <-time.After(30 * time.Second): // Timeout after 30s
			queueMutex.Lock()
			delete(randomQueue, userID)
			queueMutex.Unlock()
			c.JSON(http.StatusRequestTimeout, APIResponse{
				Code:    408,
				Message: "No match found, try again",
			})
		case <-c.Request.Context().Done(): // User closed browser
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