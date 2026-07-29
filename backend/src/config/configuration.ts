export const configuration = () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL as string,
  jwt: {
    secret: process.env.JWT_SECRET as string,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  googleClientId: process.env.GOOGLE_CLIENT_ID as string,
  webBaseUrl: process.env.WEB_BASE_URL ?? 'http://localhost:8081',
  mail: {
    user: process.env.MAIL_USER as string,
    appPassword: process.env.MAIL_APP_PASSWORD as string,
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? '*').split(',').map((s) => s.trim()),
});
