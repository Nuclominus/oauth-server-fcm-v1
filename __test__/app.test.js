const request = require("supertest");
const app = require("../src/app");

const VALID_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const VALID_CLIENT_ID = "my-client-id";
const VALID_CLIENT_SECRET = "my-client-secret";
const VALID_GRANT = "client_credentials";
const VALID_FCM_PROJECT_NUMBER = "123456789";

const AUTH_SERVER_URL = "/oauth/token";
const FCM_TOKENS_URL = "/oauth/fcm-token";

// Mock the FCM token factory, to avoid sending real requests to Google.
jest.mock("../src/fcmTokenFactory", () => () => {
  return new Promise((resolve, reject) => {
    resolve({
      expiry_date: Date.now() + 10 * 1000,
      access_token: "dummy-fcm-token",
    });
  });
});

// Mock the duration of access tokens, to be able to test token expiry.
jest.mock("../src/accessTokenTtl", () => ({
  ACCESS_TOKEN_TTL: 1,
}));

describe("Early rejected requests", () => {
  test("Contenty type not form-urlencoded gives 400", (done) => {
    [AUTH_SERVER_URL, FCM_TOKENS_URL].forEach((e) => {
      request(app)
        .post(e)
        .then((response) => {
          expect(response.statusCode).toBe(400);
          done();
        });
    });
  });

  test("Too many form-urlencoded fields gives 400", () => {
    [AUTH_SERVER_URL, FCM_TOKENS_URL].forEach(async (e) => {
      const tooManyForms = {};
      for (let i = 1; i <= 20; i++) {
        tooManyForms.e = e;
      }
      await sendFormRequest(AUTH_SERVER_URL, tooManyForms, null, 401);
    });
  });
});

describe("Invalid clientCredential on authServer endpoint", () => {
  test.each([
    { client_id: "wrong", client_secret: VALID_CLIENT_SECRET },
    { client_id: "", client_secret: VALID_CLIENT_SECRET },
    { client_id: "🏝️", client_secret: VALID_CLIENT_SECRET },
    { client_secret: VALID_CLIENT_SECRET },
  ])("Credentials %p gives 401", async (credentials) => {
    await sendFormRequest(AUTH_SERVER_URL, credentials, null, 401);
  });
});

describe("Invalid credentials on FcmTokens endpoint", () => {
  test.each([null, "Bearer invalid-token", "Not Bearer"])(
    "Credentials %p gives 401",
    async (credentials) => {
      await sendFormRequest(FCM_TOKENS_URL, {}, credentials, 401);
    },
  );
});

describe("Valid clientCredentials, but mandatory fields missing on authServer endpoint", () => {
  const validCredentials = {
    client_id: VALID_CLIENT_ID,
    client_secret: VALID_CLIENT_SECRET,
  };
  test.each([
    {},
    { scope: "wrong-scope" },
    { scope: VALID_SCOPE },
    { scope: VALID_SCOPE, grant_type: "wrong-grant" },
  ])("Incomplete request %p gives 400", async (requestFields) => {
    await sendFormRequest(
      AUTH_SERVER_URL,
      Object.assign({}, requestFields, validCredentials),
      null,
      400,
    );
  });
});

describe("Valid token from authServer", () => {
  let accessToken;

  beforeEach(async () => {
    const validRequest = {
      client_id: VALID_CLIENT_ID,
      client_secret: VALID_CLIENT_SECRET,
      scope: VALID_SCOPE,
      grant_type: VALID_GRANT,
    };
    accessToken = (
      await sendFormRequest(AUTH_SERVER_URL, validRequest, null, 200)
    ).body;
    validateAccessToken(accessToken);
  });

  test("Get a valid FCM token", async () => {
    const fcmToken = (
      await sendFormRequest(
        FCM_TOKENS_URL,
        {
          grant_type: VALID_GRANT,
          fcm_project_number: VALID_FCM_PROJECT_NUMBER,
        },
        accessToken.access_token,
        200,
      )
    ).body;
    validateAccessToken(fcmToken);
  });

  test("Expired token gives 401 when trying to get an FCM token", async () => {
    // Let the token expire.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await sendFormRequest(
      FCM_TOKENS_URL,
      {
        grant_type: VALID_GRANT,
        fcm_project_number: VALID_FCM_PROJECT_NUMBER,
      },
      accessToken.access_token,
      401,
    );
  });

  test.each([
    [{}, 401],
    [{ fcm_project_number: "wrong", grant_type: VALID_GRANT }, 401],
    [
      { fcm_project_number: VALID_FCM_PROJECT_NUMBER, grant_type: "wrong" },
      400,
    ],
  ])(
    "Request %p to FCM token endpoint gives %p",
    async (body, expectedResult) => {
      await sendFormRequest(
        FCM_TOKENS_URL,
        body,
        accessToken.access_token,
        expectedResult,
      );
    },
  );
});

/*
 * Helper functions
 */

async function sendFormRequest(
  endpoint,
  body,
  bearerToken,
  expectedResponseCode,
) {
  let req = request(app).post(endpoint);
  if (bearerToken) {
    req = req.set("Authorization", `Bearer ${bearerToken}`);
  }
  req = req.type("form");

  const response = await req.send(body);

  expect(response.statusCode).toBe(expectedResponseCode);
  return response;
}

function validateAccessToken(token) {
  expect(token.access_token).toBeDefined();
  expect(token.access_token).not.toBe("");
  expect(token.expires_in).toBeGreaterThanOrEqual(1);
  expect(token.token_type).toEqual("Bearer");
}
