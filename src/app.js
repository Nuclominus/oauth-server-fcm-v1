"use strict";

const express = require("express");
const crypto = require("crypto");
const fcmTokenFactory = require("./fcmTokenFactory");
const accessTokenTtl = require("./accessTokenTtl");
const appConfig = require("../configs/config.json");
const serviceAccount = require("../configs/service-account.json");

const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const URL_ENCODED_CONTENT_TYPE = "application/x-www-form-urlencoded";
const CLIENT_CREDENTIALS_GRANT_TYPE = "client_credentials";

const FCM_TOKEN_TTL_SECONDS_OVERRIDE = null;

const app = express();
module.exports = app;

verifyConfigWereRemoved();

if (!FCM_TOKEN_TTL_SECONDS_OVERRIDE) {
  console.log(
    "WARNING: you're now using default lifespan of FCM tokens, that is 1 hour. Sinch platform " +
      "will cache the FCM token provided by this application according to their lifespan; you " +
      "might want to select a shorter lifespan (e.g. 60s) by editing the " +
      "FCM_TOKEN_TTL_SECONDS_OVERRIDE variable in src/app.js during development, for quicker " +
      "build-test iterations.\n",
  );
}

console.log(
  "WARNING: remember that storing a private key (service-account.json) in plain text is a bad " +
    "security practice and is only suitable for this sample implementation; the " +
    "implementation should be changed to store it securely in case you want to deploy it " +
    "to production.\n",
);

// Support application/x-www-form-urlencoded type.
app.use(express.urlencoded({ extended: true, parameterLimit: 10 }));

// Reject any Content-type other than application/x-www-form-urlencoded.
app.use((req, res, next) => {
  if (!req.is(URL_ENCODED_CONTENT_TYPE) && req.url !== "/ping") {
    res.status(400).json("Unsupported Content-type").send();
  } else {
    next();
  }
});

// Cleanup expired tokens before processing any request.
app.use((req, res, next) => {
  cleanupExpiredTokens();
  next();
});

// Log requests and responses to console.
app.use((req, res, next) => {
  console.log(
    `Request (${req.url}): ${req.method} ${JSON.stringify(req.body)}`,
  );
  const send = res.send;
  res.send = (r) => {
    console.log(`Response: ${res.statusCode} ${r}`);
    res.send = send;
    return res.send(r);
  };
  next();
});

/*
 * Ping endpoint
 */
app.get("/ping", function (req, resp) {
  return resp.status(200).json("Service is up and running").send();
});

/*
 * Access tokens endpoint
 */
app.post("/access_token", function (req, resp) {
  const clientId = req.body.client_id;
  const clientSecret = req.body.client_secret;

  if (!clientId || !clientSecret) {
    return resp.status(401).json("Missing client credentials").send();
  }

  if (!validateClientCredentials(clientId, clientSecret)) {
    return resp.status(401).json("Invalid client credentials").send();
  }

  if (req.body.grant_type !== CLIENT_CREDENTIALS_GRANT_TYPE) {
    return resp.status(400).json("Grant type invalid or missing").send();
  }

  if (req.body.scope !== SCOPE) {
    return resp.status(400).json("Scope invalid or missing").send();
  }

  const accessToken = crypto.randomUUID();
  storeAccessToken(accessToken);

  return resp
    .json({
      access_token: accessToken,
      expires_in: accessTokenTtl.ACCESS_TOKEN_TTL,
      token_type: "Bearer",
    })
    .send();
});

/*
 * FCM tokens endpoint
 */
app.post("/fcm-token", function (req, resp) {
  const authHeader = req.headers.authorization;
  if (authHeader == null || !authHeader.startsWith("Bearer ")) {
    return resp
      .status(401)
      .json("No Bearer token found in authorization header")
      .send();
  }

  const bearerToken = authHeader.replace("Bearer ", "");
  if (!validAccessTokens.find((e) => e.token === bearerToken)) {
    return resp.status(401).json("Invalid or expired access token").send();
  }

  if (!validateFcmProjectNumber(req.body.fcm_project_number)) {
    return resp.status(401).json("Unexpected FCM project number").send();
  }

  if (req.body.grant_type !== CLIENT_CREDENTIALS_GRANT_TYPE) {
    return resp.status(400).json("Grant type invalid or missing").send();
  }

  fcmTokenFactory(serviceAccount, SCOPE).then((fcmCredentials) => {
    const expiresAt =
      FCM_TOKEN_TTL_SECONDS_OVERRIDE ||
      Math.floor((fcmCredentials.expiry_date - Date.now()) / 1000);

    return resp
      .json({
        access_token: fcmCredentials.access_token,
        expires_in: expiresAt,
        token_type: "Bearer",
      })
      .send();
  });
});

/*
 * Validation functions
 */

function validateClientCredentials(clientId, clientSecret) {
  if (![clientId, clientId].every((e) => isPrintableAscii(e))) {
    return false;
  }
  const validCredentials = appConfig.client_credentials;
  return (
    validCredentials.client_id === clientId &&
    validCredentials.client_secret === clientSecret
  );
}

const isPrintableAscii = (str) => /^[ -~]*$/.test(str);

function validateFcmProjectNumber(fcmProjectNumber) {
  const expectedProjectNumber =
    appConfig.fcm_config.expected_fcm_project_number;

  return fcmProjectNumber === expectedProjectNumber;
}

/*
 * Helpers to maintain a list of valid access tokens
 */

let validAccessTokens = [];

function cleanupExpiredTokens() {
  const now = Date.now();
  validAccessTokens = validAccessTokens.filter((e) => e.expiry > now);
}

function storeAccessToken(accessToken) {
  validAccessTokens.push({
    token: accessToken,
    expiry: Date.now() + accessTokenTtl.ACCESS_TOKEN_TTL * 1000,
  });
}

/*
 * Helper functions to verify if config have been replaced in the json files that are needed
 * to properly execute this script.
 */

function verifyConfigWereRemoved() {
  [appConfig, serviceAccount].forEach((d) => searchConfigValue(d));
}

function searchConfigValue(json) {
  for (const key in json) {
    if (Object.hasOwn(json, key)) {
      const value = json[key];
      if (typeof value === "object") {
        // If the value is an object or array, recursively call searchPlaceholderValue
        searchConfigValue(value);
      } else {
        // If the value is a primitive, you can do whatever operation you need here
        [key, value].forEach((e) => {
          if (e.includes("PLACEHOLDER")) {
            console.log(
              "Exiting: all configs in ./configs/*.json should be replaced " +
                "with actual values to execute the program",
            );
            process.exit(789);
          }
        });
      }
    }
  }
}
