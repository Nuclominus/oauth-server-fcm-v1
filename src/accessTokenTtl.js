"use strict";

/*
 * TTL of access tokens generated in the `POST /oauth/tokens` endpoints;
 * using a separate file to simplify mocking in unit tests.
 */
const ACCESS_TOKEN_TTL = 3600;

module.exports = {
  ACCESS_TOKEN_TTL,
};
