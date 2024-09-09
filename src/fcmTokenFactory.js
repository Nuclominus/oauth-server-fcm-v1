"use strict";

const google = require("googleapis");

/*
 * FCM token creation;
 * using a separate file to simplify mocking in unit tests.
 */
function createFcmToken(serviceAccount, scope) {
  return new Promise(function (resolve, reject) {
    const jwtClient = new google.Auth.JWT(
      serviceAccount.client_email,
      null,
      serviceAccount.private_key,
      scope,
      null,
    );

    jwtClient.authorize(function (err, credentials) {
      if (err) {
        reject(err);
        return;
      }
      resolve(credentials);
    });
  });
}

module.exports = createFcmToken;
