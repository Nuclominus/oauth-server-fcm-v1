# Authorization server for FCM OAuth2 for in-app calling

This is an implementation of an Authorization server, that can be used to quickly get started with FCM push notifications when using `Some service` in-app calling Android SDK.

It has been tested on Node 20.

## Overview

This authorization server is implemented as a Node application, and makes use of the Google credentials included in a `service-account.json` file to mint short-lived OAuth tokens valid for FCM usage. You can find details on how this authorization server interacts with `Some service` platform in the [Guide for migration to FCM v1](https://firebase.google.com/docs/cloud-messaging/migrate-v1).

> ⚠️ **NOTE**
>
> This authorization server uses a private key for Google API included in a `service-account.json` file; this is just a way to get you started quickly, but storing private keys in plain text is a poor security practice, and you should instead store them securely if you're planning to use this application in production.

This application exposes 3 HTTP endpoints:

- `POST /access_token`: the "authorization server";
- `POST /fcm-token`: the "resource server" or "FCM tokens endpoint";
- `GET /ping`: returns `200 OK` unconditionally, can be used to verify that the service is up and running.

## 1) Placeholders replacement

To be able to start using this implementation of an Authorization server, you have to first replace some placeholders with appropriate values.

```text
./configs
├── config.json
└── service-account.json
```

Each of those files includes a detailed explanation on how to fetch the appropriate values for each placeholder; as a summary, the values to be replaced are:

- in `config.json`:
  - `client_credentials`: `client_id` and `client_secret` that `some service` will use to authenticate against your Authorization server
  - `fcm_config`: the "Project Number" of the FCM project used in your Android app (available in the "FCM Console" of your FCM project)
- `service-account.json`: a `service-account.json` downloaded from the FCM console of the FCM project used in your app.

Both files should be stored and used like `CONFIG_JSON_BASE_64` and `SERVICE_ACCOUNT_JSON_BASE_64` from the github secrets, because they contain sensitive information.

> ⚠️ **NOTE**
>
> You won't be able to successfully start the authorization server until all configs have been provided.

## 2) Execute the authorization server on your machine

The authorization server is a Node application, and can be executed directly via `npm`, or as a Docker container (the methods are equivalent).

To execute the authorization server via `npm`:

- install `node` and `npm` on your system, if you haven't already (see [installation guide](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm))
- `npm install`
- `npm run start`

> ⚠️ **MORE PREFER**
>
> To execute the authorization server as a Docker container:
>
> - install `docker` if you haven't already (see [download page](https://docs.docker.com/engine/install/))
> - `docker compose up --build`
>
> or use existing image from docker hub:
>  - https://hub.docker.com/repository/docker/nuclominus/fcm-oauth2-v1/general

To verify the application is running as expected, you can run `./test-endpoints.sh` when the application is running, and check the console logs.

## 3) Make your application public on the internet

The authorization server will listen on port `3000`; to make the authorization server reachable from `service` platform, you can easily expose your local port `3000` to the public internet using the free version of [ngrok](https://ngrok.com/). You can install and setup your `ngrok` installation by following [this short Quickstart guide](https://ngrok.com/docs/getting-started/).

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

## 4) Update your FCM configuration in `Service`

Now you have all information you need to setup your OAuth configuration; select `service credentials` and fill in the 'FCM Identification' section for your app with the following values:

| Sinch Dashboard field | Value                                                     |
| --------------------- |-----------------------------------------------------------|
| **Client Id**         | `client_id` from `./configs/config.json`                  |
| **Client Secret**     | `client_secret` from `./configs/config.json`              |
| **Scope**             | `https://www.googleapis.com/auth/firebase.messaging`      |
| **Access token URL**  | `https://\<ngrok-url>/access_token`                       |
| **FCM token URL**     | `https://\<ngrok-url>/fcm-token`                          |

> ⚠️ **NOTE**
>
> Not every call on clients shouldn't trigger a request to your authorization server, because client should cache the FCM tokens obtained by your server according to the `expire_at` field returned in the response (default value is 1 hour).
>
> This will greatly improve the performance and reduce the load on your application, but might slow you down in development/integration phase as client will contact your authorization server only after the existing token has expired.
>
> To simplify your development/integration, you can manually override the expiry of the FCM token by setting the variable `FCM_TOKEN_TTL_SECONDS_OVERRIDE` in `./src/app.js` to a short TTL (e.g., 30 seconds).
