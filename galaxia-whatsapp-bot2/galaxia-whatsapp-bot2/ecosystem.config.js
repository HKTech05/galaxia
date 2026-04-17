module.exports = {
  apps: [{
    name: "galaxia-bot",
    script: "./server.js",
    watch: true,
    env: {
      NODE_ENV: "production"
    }
  }]
}
