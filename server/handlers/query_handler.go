package handlers

import (
	"context"
	"errors"
	"os"
	"time"

	"chat-app/config"
	"chat-app/constants"
	"chat-app/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func UpdateUserOnlineStatusByUserID(userId, status string) error {
	docID, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return errors.New("unable to extract Id from Hex Id")
	}

	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err = collection.UpdateOne(ctx,
		bson.M{"_id": docID},
		bson.M{"$set": bson.M{"online": status}},
	)

	if err != nil {
		return errors.New(constants.ServerFailedResponse)
	}
	return nil
}

func GetUserByUsername(username string) UserDetails {
	var userDetails UserDetails
	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_ = collection.FindOne(ctx, bson.M{"username": username}).Decode(&userDetails)

	return userDetails
}

func GetUserByUserID(userID string) UserDetails {
	var userDetails UserDetails

	docID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return UserDetails{}
	}

	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)

	_ = collection.FindOne(ctx, bson.M{
		"_id": docID,
	}).Decode(&userDetails)

	cancel()
	return userDetails
}

func IsUsernameAvailableQueryHandler(username string) bool {
	userDetails := GetUserByUsername(username)
	return userDetails == (UserDetails{})
}

func LoginQueryHandler(userDetailsRequest LoginRequest) (UserResponse, error) {
	if userDetailsRequest.Username == "" {
		return UserResponse{}, errors.New(constants.UsernameCantBeEmpty)
	} else if userDetailsRequest.Password == "" {
		return UserResponse{}, errors.New(constants.PasswordCantBeEmpty)
	} else {
		userDetails := GetUserByUsername(userDetailsRequest.Username)
		if userDetails == (UserDetails{}) {
			return UserResponse{}, errors.New(constants.UserIsNotRegisteredWithUs)
		}

		if passErr := utils.VerifyPassword(userDetails.Password, userDetailsRequest.Password); passErr != nil {
			return UserResponse{}, errors.New(constants.LoginPasswordIsInCorrect)
		}

		if onlineStatusErr := UpdateUserOnlineStatusByUserID(userDetails.ID, "Y"); onlineStatusErr != nil {
			return UserResponse{}, errors.New(constants.LoginPasswordIsInCorrect)
		}

		return UserResponse{
			Username: userDetails.Username,
			UserID:   userDetails.ID,
		}, nil
	}
}

func RegisterQueryHandler(userDetails RegistrationRequest) (string, error) {
	if userDetails.Username == "" {
		return "", errors.New(constants.UsernameCantBeEmpty)
	} else if userDetails.Password == "" {
		return "", errors.New(constants.PasswordCantBeEmpty)
	} else {
		newPasswordHash, PassErr := utils.HashPassword(userDetails.Password)
		if PassErr != nil {
			return "", errors.New(constants.ServerFailedResponse)
		}

		collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("users")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		id := primitive.NewObjectID()
		uid := id.Hex()

		_, registrationErr := collection.InsertOne(ctx, bson.M{
			"_id":       id,
			"username":  userDetails.Username,
			"password":  newPasswordHash,
			"online":    "N",
			"createdAt": time.Now(),
		})

		if registrationErr != nil {
			return "", errors.New(constants.ServerFailedResponse)
		}

		if onlineStatusError := UpdateUserOnlineStatusByUserID(uid, "Y"); onlineStatusError != nil {
			return "", errors.New(constants.ServerFailedResponse)
		}
		return uid, nil
	}
}

func GetAllOnlineUsers(userID string) []UserResponse {
	var onlineUsers []UserResponse

	docID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return onlineUsers
	}

	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, queryError := collection.Find(ctx, bson.M{
		"online": "Y",
		"_id": bson.M{
			"$ne": docID, // excludes the user itself
		},
	})
	defer cursor.Close(ctx)

	if queryError != nil {
		return onlineUsers
	}

	for cursor.Next(context.TODO()) {
		var user UserDetails
		err := cursor.Decode(&user)

		if err == nil {
			onlineUsers = append(onlineUsers, UserResponse{
				UserID:   user.ID,
				Username: user.Username,
				Online:   user.Online,
			})
		}
	}

	return onlineUsers
}

func StoreNewMessages(message MessagePayload) bool {
	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("messages")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, registrationError := collection.InsertOne(ctx, bson.M{
		"fromUserID": message.FromUserID,
		"message":    message.Message,
		"toUserID":   message.ToUserID,
		"createdAt":  time.Now(),
	})

	return registrationError == nil
}

func GetConversationBetweenTwoUsers(toUser, fromUser string, page int64) []Message {
	var conversation []Message
	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("messages")
	var limit int64 = 20

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	queryHandler := bson.M{
		"$or": []bson.M{
			{
				"toUserID":   toUser,
				"fromUserID": fromUser,
			},
			{
				"fromUserID": toUser,
				"toUserID":   fromUser,
			},
		},
	}

	findOptions := options.Find()
	findOptions.SetSort(bson.D{{"createdAt", -1}})
	findOptions.SetLimit(limit)
	findOptions.SetSkip((page - 1) * limit)

	cursor, err := collection.Find(ctx, queryHandler, findOptions)
	if err != nil {
		return conversation
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var message Message
		if err := cursor.Decode(&message); err == nil {
			conversation = append(conversation, message)
		}
	}

	for i, j := 0, len(conversation)-1; i < j; i, j = i+1, j-1 {
		conversation[i], conversation[j] = conversation[j], conversation[i]
	}

	return conversation
}

// ---------------- NEW SOCIAL GRAPH FUNCTIONS ----------------

func CreateFriendRequest(requesterID, addresseeID string) error {
	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("friendships")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check if friendship already exists (in either direction)
	count, _ := collection.CountDocuments(ctx, bson.M{
		"$or": []bson.M{
			{"requesterID": requesterID, "addresseeID": addresseeID},
			{"requesterID": addresseeID, "addresseeID": requesterID},
		},
	})

	if count > 0 {
		return errors.New("friendship request already exists or you are already friends")
	}

	_, err := collection.InsertOne(ctx, bson.M{
		"requesterID": requesterID,
		"addresseeID": addresseeID,
		"status":      "pending",
		"createdAt":   time.Now(),
	})

	return err
}

func AcceptFriendRequest(requesterID, addresseeID string) error {
	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("friendships")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := collection.UpdateOne(ctx,
		bson.M{
			"requesterID": requesterID,
			"addresseeID": addresseeID,
			"status":      "pending",
		},
		bson.M{"$set": bson.M{"status": "accepted"}},
	)
	return err
}

func GetPendingRequests(userID string) ([]FriendRequestResponse, error) {
	var requests []FriendRequestResponse
	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("friendships")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Find requests where I am the addressee and status is pending
	cursor, err := collection.Find(ctx, bson.M{
		"addresseeID": userID,
		"status":      "pending",
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var friendship Friendship
		if err := cursor.Decode(&friendship); err == nil {
			requester := GetUserByUserID(friendship.RequesterID)
			requests = append(requests, FriendRequestResponse{
				ID:       friendship.RequesterID,
				Username: requester.Username,
				Status:   "pending",
			})
		}
	}
	return requests, nil
}

func GetFriendList(userID string) ([]UserResponse, error) {
	var friends []UserResponse
	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("friendships")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Find accepted friendships where I am either requester or addressee
	cursor, err := collection.Find(ctx, bson.M{
		"status": "accepted",
		"$or": []bson.M{
			{"requesterID": userID},
			{"addresseeID": userID},
		},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var friendship Friendship
		if err := cursor.Decode(&friendship); err == nil {
			// Determine which ID is the friend's ID
			var friendID string
			if friendship.RequesterID == userID {
				friendID = friendship.AddresseeID
			} else {
				friendID = friendship.RequesterID
			}

			friendDetails := GetUserByUserID(friendID)
			friends = append(friends, UserResponse{
				UserID:   friendDetails.ID,
				Username: friendDetails.Username,
				Online:   friendDetails.Online,
			})
		}
	}
	return friends, nil
}

func DeleteMessages(messageIDs []string, userID string) error {
	// Convert string IDs to ObjectIDs
	var objectIDs []primitive.ObjectID
	for _, id := range messageIDs {
		oid, _ := primitive.ObjectIDFromHex(id)
		objectIDs = append(objectIDs, oid)
	}

	collection := config.Client.Database(os.Getenv("MONGODB_DATABASE")).Collection("messages")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Delete messages where ID matches AND (fromUserID == userID OR toUserID == userID)
	// This allows deleting messages you sent OR received (WhatsApp style "Delete for me" logic is complex, this is "Delete" logic)
	_, err := collection.DeleteMany(ctx, bson.M{
		"_id": bson.M{"$in": objectIDs},
		"$or": []bson.M{
			{"fromUserID": userID},
			// {"toUserID": userID}, // Uncomment to allow deleting received messages too
		},
	})
	return err
}
