module.exports = {
  apps: [
    {
      name: "email-warmer",
      script: "src/email-network-warmer.js", // Change this if your main file is different
      cwd: "/home/ambar/git_various/email_warm",
      watch: true,
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        CONFIG_PATH: "/home/ambar/git_various/email_warm/config"
      }
    }
  ]
};
