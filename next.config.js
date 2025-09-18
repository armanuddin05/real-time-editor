/** @type {import("next").NextConfig} */
const config = {
  // Existing config...
  
  // Enable WebSocket support for Socket.io
    //   experimental: {
    //     serverComponentsExternalPackages: ["socket.io"],
    //   },
  serverExternalPackages: ["socket.io"],
  
  // Configure headers for Socket.io
  async headers() {
    return [
      {
        source: "/api/socketio",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NODE_ENV === "production" 
              ? process.env.NEXTAUTH_URL || "*"
              : "http://localhost:3000",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
        ],
      },
    ];
  },
};

export default config;