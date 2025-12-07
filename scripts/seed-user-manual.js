import { buildDeterministicUser } from "../tests/helpers/testCredentials.js";

async function seedUser() {
  const user = buildDeterministicUser();
  console.log("Seeding user:", user.username);

  try {
    const response = await fetch("http://127.0.0.1:8000/auth/test/seed-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: user.username,
        email: user.email,
        password: user.password,
        remember_me: true,
      }),
    });

    if (response.ok) {
      const responseData = await response.json();
      console.log("Response data:", JSON.stringify(responseData, null, 2));

      // Handle wrapped response (success/data pattern) or direct response
      const data = responseData.data || responseData;

      if (data.user) {
        console.log("User seeded successfully:", data.user.username);
      } else {
        console.error("User data missing in response");
        process.exit(1);
      }
    } else {
      const text = await response.text();
      console.error("Failed to seed user:", response.status, text);
      process.exit(1);
    }
  } catch (error) {
    console.error("Error seeding user:", error);
    process.exit(1);
  }
}

seedUser();
