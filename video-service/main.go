package main

import (
	"log"
	"os"

	"video-service/handlers"
	"video-service/redis"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/websocket/v2"
)

func main() {
	// Initialize Redis for room tracking
	redis.InitRedis()

	app := fiber.New(fiber.Config{
		ServerHeader: "GopherChat Video Service",
		AppName:      "GopherChat Video v1.0",
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: true,
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "healthy",
			"service": "video-calling",
		})
	})

	// WebSocket upgrade middleware
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	// WebSocket routes for signaling
	// Route: ws://localhost:4000/ws/:roomId?userId=xxx
	app.Get("/ws/:roomId", websocket.New(handlers.HandleWebRTCSignaling))

	// REST API routes
	api := app.Group("/api")

	// Room management
	api.Get("/rooms/:roomId/participants", handlers.GetRoomParticipants)
	api.Post("/rooms/create", handlers.CreateRoom)
	api.Delete("/rooms/:roomId", handlers.DeleteRoom)

	// Get server port
	port := os.Getenv("VIDEO_SERVICE_PORT")
	if port == "" {
		port = "4000"
	}

	log.Printf("🎥 Video Service starting on port %s", port)
	log.Fatal(app.Listen(":" + port))
}
