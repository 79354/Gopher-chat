package handlers

import (
	"net/http"
	"regexp"

	"chat-app/constants"

	"github.com/gin-gonic/gin"
)

// CreateGroup creates a new group chat
func CreateGroup() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req CreateGroupRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code:    http.StatusBadRequest,
				Message: "Invalid request payload",
			})
			return
		}

		// Validation
		if req.Name == "" {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code:    http.StatusBadRequest,
				Message: "Group name cannot be empty",
			})
			return
		}

		if req.CreatorID == "" {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code:    http.StatusBadRequest,
				Message: "Creator ID is required",
			})
			return
		}

		// Create group in database
		group, err := CreateGroupQuery(req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:    http.StatusInternalServerError,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, APIResponse{
			Code:     http.StatusOK,
			Status:   http.StatusText(http.StatusOK),
			Message:  "Group created successfully",
			Response: group,
		})
	}
}

// GetUserGroups returns all groups a user is part of
func GetUserGroups() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("userID")

		isAlphaNumeric := regexp.MustCompile(`^[A-Za-z0-9]([A-Za-z0-9_-]*[A-Za-z0-9])?$`).MatchString
		if !isAlphaNumeric(userID) {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code:    http.StatusBadRequest,
				Message: "Invalid user ID",
			})
			return
		}

		groups, err := GetGroupsByUserID(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:    http.StatusInternalServerError,
				Message: "Failed to fetch groups",
			})
			return
		}

		c.JSON(http.StatusOK, APIResponse{
			Code:     http.StatusOK,
			Status:   http.StatusText(http.StatusOK),
			Message:  constants.SuccessfulResponse,
			Response: groups,
		})
	}
}

// GetGroupDetails returns detailed information about a group
func GetGroupDetails() gin.HandlerFunc {
	return func(c *gin.Context) {
		groupID := c.Param("groupID")

		group, err := GetGroupByID(groupID)
		if err != nil {
			c.JSON(http.StatusNotFound, APIResponse{
				Code:    http.StatusNotFound,
				Message: "Group not found",
			})
			return
		}

		// TODO: Check if requesting user is a member

		c.JSON(http.StatusOK, APIResponse{
			Code:     http.StatusOK,
			Status:   http.StatusText(http.StatusOK),
			Message:  constants.SuccessfulResponse,
			Response: group,
		})
	}
}

// AddGroupMember adds a new member to a group
func AddGroupMember() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req AddMemberRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code:    http.StatusBadRequest,
				Message: "Invalid request",
			})
			return
		}

		// TODO: Validate permissions (only admin can add members)
		// TODO: Check if user is already a member
		// TODO: Send notification to added user

		err := AddMemberToGroup(req.GroupID, req.UserID, "member")
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:    http.StatusInternalServerError,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, APIResponse{
			Code:    http.StatusOK,
			Message: "Member added successfully",
		})
	}
}

// RemoveGroupMember removes a member from a group
func RemoveGroupMember() gin.HandlerFunc {
	return func(c *gin.Context) {
		groupID := c.Param("groupID")
		userID := c.Param("userID")

		// TODO: Validate permissions (only admin or self can remove)
		// TODO: Cannot remove group creator
		// TODO: Notify removed user

		err := RemoveMemberFromGroup(groupID, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:    http.StatusInternalServerError,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, APIResponse{
			Code:    http.StatusOK,
			Message: "Member removed successfully",
		})
	}
}

// UpdateGroupSettings updates group information
func UpdateGroupSettings() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req UpdateGroupRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code:    http.StatusBadRequest,
				Message: "Invalid request",
			})
			return
		}

		// TODO: Validate permissions (only admin can update)

		err := UpdateGroup(req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:    http.StatusInternalServerError,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, APIResponse{
			Code:    http.StatusOK,
			Message: "Group updated successfully",
		})
	}
}

// DeleteGroup deletes a group
func DeleteGroup() gin.HandlerFunc {
	return func(c *gin.Context) {
		groupID := c.Param("groupID")
		requesterID := c.Query("requesterID")

		// TODO: Only creator can delete group
		// TODO: Notify all members
		// TODO: Archive group messages

		err := DeleteGroupByID(groupID, requesterID)
		if err != nil {
			c.JSON(http.StatusForbidden, APIResponse{
				Code:    http.StatusForbidden,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, APIResponse{
			Code:    http.StatusOK,
			Message: "Group deleted successfully",
		})
	}
}

// GetGroupMessages returns message history for a group
func GetGroupMessages() gin.HandlerFunc {
	return func(c *gin.Context) {
		groupID := c.Param("groupID")
		page := c.DefaultQuery("page", "1")

		// TODO: Verify user is a member

		messages, err := GetGroupMessageHistory(groupID, page)
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:    http.StatusInternalServerError,
				Message: "Failed to fetch messages",
			})
			return
		}

		c.JSON(http.StatusOK, APIResponse{
			Code:     http.StatusOK,
			Status:   http.StatusText(http.StatusOK),
			Message:  constants.SuccessfulResponse,
			Response: messages,
		})
	}
}

// SendGroupMessage sends a message to a group
func SendGroupMessage() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req GroupMessageRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code:    http.StatusBadRequest,
				Message: "Invalid request",
			})
			return
		}

		// TODO: Verify user is a member
		// TODO: Store message in database
		// TODO: Broadcast via WebSocket to all group members

		msgID, err := StoreGroupMessage(req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:    http.StatusInternalServerError,
				Message: "Failed to send message",
			})
			return
		}

		// Broadcast to group members via WebSocket
		BroadcastGroupMessage(req.GroupID, req.FromUserID, req.Message)

		c.JSON(http.StatusOK, APIResponse{
			Code:     http.StatusOK,
			Message:  "Message sent",
			Response: map[string]string{"messageId": msgID},
		})
	}
}

// StartGroupVideoCall initiates a video call for a group
func StartGroupVideoCall() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req StartCallRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, APIResponse{
				Code:    http.StatusBadRequest,
				Message: "Invalid request",
			})
			return
		}

		// TODO: Verify user is a member
		// TODO: Create video room in video-service
		// TODO: Notify all group members

		roomID, err := InitiateGroupVideoCall(req.GroupID, req.CallerID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Code:    http.StatusInternalServerError,
				Message: "Failed to start call",
			})
			return
		}

		// Notify group members about the call
		NotifyGroupCall(req.GroupID, req.CallerID, roomID)

		c.JSON(http.StatusOK, APIResponse{
			Code:    http.StatusOK,
			Message: "Video call started",
			Response: map[string]string{
				"roomId":  roomID,
				"groupId": req.GroupID,
			},
		})
	}
}

// TODO: Implement admin promotion/demotion
// TODO: Implement mute/unmute members
// TODO: Implement group settings (public/private)
// TODO: Implement invite links
// TODO: Implement group search
