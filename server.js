var express = require("express");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectId = mongodb.ObjectId;
var cors = require("cors");

var HELP_NEEDED_COLLECTION = "helpNeeded";
var USER_LOCATIONS_COLLECTION = "userLocations";

var app = express();
app.use(cors());
app.use(bodyParser.json());

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;

// Connect to the database before starting the application server.
mongodb.MongoClient.connect(process.env.MONGODB_URI, function(err, database) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database;
  console.log("Database connection ready");

  // Initialize the app.
  var server = app.listen(process.env.PORT || 8080, function() {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
});

// SII API ROUTES BELOW

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({ error: message });
}

app.get("/", function(req, res) {
  res.status(200).send("Welcoem to API endpoint of Safe India Initiative");
});

/*  "/api/help"
 *    POST: create a record that the user needs help
 */
app.post("/api/help", function(req, res) {
  var userDetails = req.body.userDetails;
  console.log(userDetails.username + " needs help");
  userDetails.datetime = new Date();

  if (userDetails.userId === undefined) {
    handleError(
      res,
      "User id unavailable",
      "Please provide userDetails.userId"
    );
    return;
  }

  db.collection(HELP_NEEDED_COLLECTION).insert(userDetails, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to add user details");
      return;
    } else {
      if (doc === null) {
        doc = {};
      }

      db
        .collection(USER_LOCATIONS_COLLECTION)
        .find()
        .toArray(function(err, users) {
          if (err) {
            handleError(res, err.message, "Failed to get help data");
            return;
          } else {
            res.status(200).json({
              success: true,
              message: "Help record registered successfully",
              nearbyUsers: users
            });
          }
        });
    }
  });
});

/*  "/api/help"
 *    GET: get records of all users asking for help
 */
app.get("/api/help", function(req, res) {
  console.log("Returning all help records");

  db
    .collection(HELP_NEEDED_COLLECTION)
    .find()
    .toArray(function(err, helpDocs) {
      if (err) {
        handleError(res, err.message, "Failed to get help data");
        return;
      } else {
        res.status(200).json(helpDocs);
      }
    });
});

/*  "/api/user-location"
 *    POST: create a record to store user current location
 */
app.post("/api/user-location", function(req, res) {
  var userDetails = req.body.userDetails;
  console.log(userDetails.username + " wants to update location");
  userDetails.datetime = new Date();
  if (userDetails.userId === undefined) {
    handleError(
      res,
      "User id unavailable",
      "Please provide userDetails.userId"
    );
    return;
  } else if (userDetails.lat === undefined || userDetails.long === undefined) {
    handleError(
      res,
      "User location unavailable",
      "Please provide userDetails.lat and userDetails.long"
    );
    return;
  }

  db
    .collection(USER_LOCATIONS_COLLECTION)
    .remove({ userId: userDetails.userId }, function(err, numberOfRemovedDocs) {
      if (err) {
        handleError(
          res,
          err.message,
          "Failed to remove previous user location"
        );
        return;
      } else {
        db
          .collection(USER_LOCATIONS_COLLECTION)
          .insert(userDetails, function(err, userLocation) {
            if (err) {
              handleError(res, err.message, "Failed to add user location");
              return;
            } else {
              res.status(200).json({
                success: true,
                message: "Updated user location"
              });
            }
          });
      }
    });
});

/*  "/api/user-location"
   *    GET: get current location of user
   */
app.get("/api/user-location", function(req, res) {
  var userId = req.query.userId;
  if (userId === undefined) {
    handleError(
      res,
      "User id unavailable",
      "Please provide userId"
    );
    return;
  } 

  console.log("Returning current location of user with id: " + userId);

  db
    .collection(USER_LOCATIONS_COLLECTION)
    .findOne({ userId: Number(userId) }, function(err, userLocation) {
      if (err) {
        handleError(res, err.message, "Failed to get current user location");
        return;
      } else {
        res.status(200).json(userLocation);
      }
    });
});
