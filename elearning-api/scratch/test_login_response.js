const AuthService = require('../src/services/auth.service');

async function main() {
  // Let's test login logic directly
  try {
    // kae.np2463@gmail.com with password '1Kae.np2463@gmail.com'
    const result = await AuthService.login('kae.np2463@gmail.com', '1Kae.np2463@gmail.com');
    console.log("LOGIN RESULT USER:", JSON.stringify(result.user, null, 2));
  } catch (error) {
    console.error("Login failed:", error);
  }
}

main().finally(() => require('../src/utils/prisma').$disconnect());
