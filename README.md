# FCM OAuth2 Authorization Server

This project provides an OAuth2 authorization server for Firebase Cloud Messaging (FCM).

## Prerequisites

- Node.js and npm installed on your system (
  see [installation guide](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm))
- Docker installed on your system (see [download page](https://docs.docker.com/engine/install/))
- ngrok installed and set up (see [Quickstart guide](https://ngrok.com/docs/getting-started/))

## 1) Execute the Authorization Server

The authorization server is a Node application and can be executed directly via `npm`, or as a Docker container.

### Via npm

1. Install dependencies:
    ```sh
    npm install
    ```

2. Start the server:
    ```sh
    npm run start
    ```

### Via Docker

Build and run the Docker container:

```sh
docker compose up --build
```

## 2) Verify the Application

To verify the application is running as expected, you can run:

```sh
./test-endpoints.sh
```

Check the console logs for output.

## 3) Make Your Application Public

The authorization server listens on port 3000. To make it reachable from the internet, use ngrok:

Start ngrok:
```sh
ngrok http http://localhost:3000
```
Your console should display a forwarding URL like `https://<your-ngrok-url>.ngrok-free.dev`. Use this URL to access your server publicly.

### Using Static Domains

To avoid changing URLs every time ngrok restarts, set up a static domain:

```sh
ngrok http http://localhost:3000 --domain=<your-static-domain>.ngrok-free.app
```

## 4) Update Your FCM Configuration

Update your OAuth configuration in the `Service` platform with the following values:

| Sinch Dashboard field | Value                                                     |
| --------------------- |-----------------------------------------------------------|
| **Client Id**         | `client_id` from `./configs/config.json`                  |
| **Client Secret**     | `client_secret` from `./configs/config.json`              |
| **Scope**             | `https://www.googleapis.com/auth/firebase.messaging`      |
| **Access token URL**  | `https://\<ngrok-url>/access_token`                       |
| **FCM token URL**     | `https://\<ngrok-url>/fcm-token`                          |

## 5) Development Tips
To simplify development, you can manually override the expiry of the FCM token by setting the variable `FCM_TOKEN_TTL_SECONDS_OVERRIDE` in `./src/app.js` to a short TTL (e.g., 30 seconds).

## 6) CI/CD Pipeline

The project includes a GitHub Actions workflow to build and push the Docker image to Docker Hub. The workflow is defined in `.github/workflows/build_docker_image.yaml`.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

