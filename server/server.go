package main

import (
	"fmt"
	"log"
	"os"

	"chat-app/config"
	"chat-app/handlers"
	"chat-app/utils"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Note: .env file not found, using system environment variables")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	host := os.Getenv("HOST")
	if host == "" {
		host = "localhost"
	}

	fmt.Printf("Server starting at http://%s:%s\n", host, port)

	config.ConnectDatabase()

	// Connect to Redis (New Feature)
	config.ConnectRedis()

	// Ensure we disconnect on shutdown
	defer config.DisConnectDB()

	router := gin.New()
	router.Use(gin.Logger())
	router.Use(gin.Recovery()) // Added recovery middleware to prevent crashes
	router.Use(utils.CORSMiddleware())

	// Start the Lobby
	go handlers.MainLobby.Run()

	setupRoutes(router)

	router.Run(":" + port)
}

func setupRoutes(router *gin.Engine) {
	// Root route
	router.GET("/", handlers.RenderHome())

	// WebSocket Route
	router.GET("/ws/:userID", func(c *gin.Context) {
		userID := c.Param("userID")
		if userID == "" {
			c.JSON(400, gin.H{"error": "User ID required"})
			return
		}

		conn, err := handlers.Upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Println("Failed to upgrade connection: ", err)
			return
		}

		handlers.CreateClient(handlers.MainLobby, conn, userID)
	})

	// API Routes Group
	api := router.Group("/api")
	{
		// Auth Routes
		auth := api.Group("/auth")
		{
			auth.POST("/login", handlers.Login())
			auth.POST("/register", handlers.Registration())
			auth.GET("/check-username/:username", handlers.IsUsernameAvailable())
		}

		// User Routes
		user := api.Group("/user")
		{
			user.GET("/session/:userID", handlers.UserSessionCheck())

			// FIXED LINE BELOW: Changed 'api.GET' to 'user.GET'
			user.GET("/random/join/:userID", handlers.JoinRandomChatHandler())
		}

		// Message Routes
		messages := api.Group("/messages")
		{
			messages.GET("/conversation/:toUserID/:fromUserID", handlers.GetMessagesHandler())
		}

		friends := api.Group("/friends")
		{
			friends.POST("/request/:fromUserID", handlers.SendFriendRequestHandler())
			friends.POST("/accept/:requesterID/:myUserID", handlers.AcceptFriendRequestHandler())
			friends.GET("/requests/:userID", handlers.GetPendingRequestsHandler())
			friends.GET("/list/:userID", handlers.GetFriendListHandler())
		}

		groupRoutes := api.Group("/api/groups")
		{
			groupRoutes.POST("/create", handlers.CreateGroup())
			groupRoutes.GET("/user/:userID", handlers.GetUserGroups())
			groupRoutes.GET("/:groupID", handlers.GetGroupDetails())
			groupRoutes.POST("/members/add", handlers.AddGroupMember())
			groupRoutes.DELETE("/:groupID/members/:userID", handlers.RemoveGroupMember())
			groupRoutes.PUT("/update", handlers.UpdateGroupSettings())
			groupRoutes.DELETE("/:groupID", handlers.DeleteGroup())
			groupRoutes.GET("/:groupID/messages", handlers.GetGroupMessages())
			groupRoutes.POST("/messages/send", handlers.SendGroupMessage())
			groupRoutes.POST("/video-call/start", handlers.StartGroupVideoCall())
		}
	}
}
