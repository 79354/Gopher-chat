package handlers

type Lobby struct {
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
}

var MainLobby = NewLobby()

func NewLobby() *Lobby {
	return &Lobby{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
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
		}
	}
}