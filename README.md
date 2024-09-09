# Sample Authorization server for FCM OAuth in Sinch in-app calling

This is an implementation of an Authorization server, that can be used to quickly get started with FCM push notifications when using Sinch's in-app calling Android SDK.

It has been tested on Node 20.

## Overview

This authorization server is implemented as a Node application, and makes use of the Google credentials included in a `service-account.json` file to mint short-lived OAuth tokens valid for FCM usage. You can find details on how this authorization server interacts with Sinch platform in the [Guide for migration to FCM v1](https://developers.sinch.com/docs/in-app-calling/android/migration-to-fcm-v1/) on Sinch website.

> ⚠️ **NOTE**
>
> This authorization server uses a private key for Google API included in a `service-account.json` file; this is just a way to get you started quickly, but storing private keys in plain text is a poor security practice, and you should instead store them securely if you're planning to use this application in production.

This application exposes 3 HTTP endpoints:

- `POST /oauth/token`: the "authorization server" described in [Guide for migration to FCM v1](https://developers.sinch.com/docs/in-app-calling/android/migration-to-fcm-v1/);
- `POST /oauth/fcm-token`: the "resource server" or "FCM tokens endpoint" described in [Guide for migration to FCM v1](https://developers.sinch.com/docs/in-app-calling/android/migration-to-fcm-v1/);
- `GET /ping`: returns 200OK unconditionally, can be used to verify that the service is up and running.

## 1) Placeholders replacement

To be able to start using this implementation of an Autorization server, you have to first replace some placeholders with appropriate values.

You can find those placeholders in `./placeholders/*.json` files:

```text
./placeholders
├── config.json
└── service-account.json
```

Each of those files includes a detailed explanation on how to fetch the appropriate values for each placeholder; as a summary, the values to be replaced are:

- in `config.json`:
  - `client_credentials`: `client_id` and `client_secret` that Sinch will use to authenticate against your Authorization server
    - if you haven't provided any OAuth configuration to Sinch via [Sinch Dashboard](https://dashboard.sinch.com/voice/apps), `client_id` and `client_secret` can be any arbitrary strings;
    - if you have already provided an OAuth configuration to Sinch via [Sinch Dashboard](https://dashboard.sinch.com/voice/apps), `client_id` and `client_secret` in `configs/config.json` have to match "Client ID" and "Client Secret" in the Dashboard
  - `fcm_config`: the "Project Number" of the FCM project used in your Android app (available in the "FCM Console" of your FCM project)
- `service-account.json`: a `service-account.json` downloaded from the FCM console of the FCM project used in your app.

> ⚠️ **NOTE**
>
> You won't be able to successfully start the authorization server until all placeholders have been replaced.

## 2) Execute the authorization server on your machine

The authorization server is a Node application, and can be executed directly via `npm`, or as a Docker container (the methods are equivalent).

To execute the authorization server via `npm`:

- install `node` and `npm` on your system, if you haven't already (see [installation guide](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm))
- `npm install`
- `npm run start`

To execute the authorization server as a Docker container:

- install `docker` if you haven't already (see [download page](https://docs.docker.com/engine/install/))
- `docker compose up --build`

To verify the application is running as expected, you can run `./test-endpoints.sh` when the application is running, and check the console logs.

## 3) Make your application public on the internet

The authorization server will listen on port `3000`; to make the authorization server reachable from Sinch platform, you can easily expose your local port `3000` to the public internet using the free version of [ngrok](https://ngrok.com/). You can install and setup your `ngrok` installation by following [this short Quickstart guide](https://ngrok.com/docs/getting-started/).

Once you've installed `ngrok` and setup your account, you can run:

```plain
 ngrok http http://localhost:3000
```

Your console should now look something like:

```plain
ngrok                                                (Ctrl+C to quit)

Session Status                online
Account                       inconshreveable (Plan: Free)
Version                       3.0.0
Region                        United States (us)
Latency                       78ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://84c5df474.ngrok-free.dev -> http://localhost:8080

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

As long as both `ngrok` and the authorization server are running, your authorization server will be available publicly on the internet at the `*.ngrok-free.*` address shown in the console. You can verify that by visiting `https://<your-ngrok-url>/ping` in your browser.

> ⚠️ **NOTE**
>
> The `*.ngrok-free.*` URL will change everytime `ngrok` is restarted, which might be inconvenient; you can setup your [ngrok free static domain](https://ngrok.com/blog-post/free-static-domains-ngrok-users) to always obtain the same URL.

If you're using static domains, the command to make your application public is:

```plain
ngrok http http://localhost:3000 --domain=<your-static-domain>.ngrok-free.app
```

## 4) Update your FCM configuration to Sinch Dashboard

Now you have all information you need to setup your OAuth configuration in [Sinch Dashboard](https://dashboard.sinch.com/voice/apps); select your Sinch app and then the In-app Voice and Video SDK, and fill in the 'FCM Identification' section for your app with the following values:

| Sinch Dashboard field | Value                                                        |
| --------------------- | ------------------------------------------------------------ |
| **Client Id**         | `client_id` from `./placeholers/client-credentials.json`     |
| **Client Secret**     | `client_secret` from `./placeholers/client-credentials.json` |
| **Scope**             | `https://www.googleapis.com/auth/firebase.messaging`         |
| **Access token URL**  | `https://\<ngrok-url>/oauth/token`                           |
| **FCM token URL**     | `https://\<ngrok-url>/oauth/fcm-token`                       |

## 5) Final test

To verify that everything is setup correctly, you can try to install Sinch's sample app for Android SDK and place a call toward a user registered with the sample app. More specifically:

1. Download Sinch SDK for Android from the [download page](https://developers.sinch.com/docs/in-app-calling/sdk-downloads/)
1. install `sinch-rtc-sample-push` app on 2 Android devices (or simulators), using Android Studio
1. register `userA` on one device, and `userB` on the other one
1. place a call from `userA` to `userB`: Sinch platform will contact your authorization server to get the credentials needed to authorize the push request to FCM; you'll be able to see requests/responses being handled by your authorization servers in the logs of the authorization server
1. if a push notification reaches `userB`, the test succeeded.

> ⚠️ **NOTE**
>
> Not every call to an Android device will trigger a request to your authorization server, because Sinch will cache the FCM tokens obtained by your server according to the `expire_at` field returned in the response (default value is 1 hour, see [Guide for migration to FCM v1](https://developers.sinch.com/docs/in-app-calling/android/migration-to-fcm-v1/#implementing-the-fcm-token-endpoint) for more details)
>
> This will greatly improve the performance of the Sinch platform and reduce the load on your application, but might slow you down in development/integration phase as Sinch will contact your authorization server only after the existing token has expired.
>
> To simplify your development/integration, you can manually override the expiry of the FCM token by setting the variable `FCM_TOKEN_TTL_SECONDS_OVERRIDE` in `./src/app.js` to a short TTL (e.g., 30 seconds).
