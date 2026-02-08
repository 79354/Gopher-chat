package handlers

type Lobby struct {
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan WSMessage // New channel for sending messages
}

// Global instance
var MainLobby = NewLobby()

func NewLobby() *Lobby {
	return &Lobby{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan WSMessage), // Initialize the channel
	}
}

func (lobby *Lobby) Run() {
	// Start the Redis Subscriber in the background
	go SubscribeToRedis(lobby)

	for {
		select {
		case client := <-lobby.register:
			HandleUserRegisterEvent(lobby, client)

		case client := <-lobby.unregister:
			HandleUserDisconnectEvent(lobby, client)

		case msg := <-lobby.broadcast:
			// Handle internal broadcasts (from HTTP handlers)
			// Iterate through clients to find the target UserID
			for client := range lobby.clients {
				if client.UserID == msg.TargetID {
					select {
					case client.Send <- msg:
					default:
						close(client.Send)
						delete(lobby.clients, client)
					}
				}
			}
		}
	}
}
