require("dotenv").config();
const request = require("supertest");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const prisma = require("../db/prisma");
let agent;
let saveRes;
const { app, server } = require("../app");

beforeAll(async () => {
  // clear database
  await prisma.Task.deleteMany(); 
  await prisma.User.deleteMany(); 
  agent = request.agent(app);
});

afterAll(async () => {
  prisma.$disconnect();
  server.close();
});

describe("register a user ", () => {
  let saveRes = null; 
  it("46. it creates the user entry", async () => {
    const newUser = {
      name: "John Deere",
      email: "jdeere@example.com",
      password: "Pa$$word20",
    };
    saveRes = await agent.post("/api/users").send(newUser);
    expect(saveRes.status).toBe(201);
  });
  it("47. Registration returns an object with the expected name", () => {
    expect(saveRes.body.user.name).toBe("John Deere");
  });
  it("48. Registration returns a csrfToken", () => {
    expect(saveRes.body.csrfToken).toBeDefined();
  });
  it("49.you can logon as the newly registered user", async () => {
    await agent
      .post("/api/users/logon")
      .send({email: "jdeere@example.com", password: "Pa$$word20"}).expect(200);
  });
   

  it("50. Logged-in user can access /api/tasks", async () => {
    const taskRes = await agent.get("/api/tasks");
    expect(taskRes.status).not.toBe(401);
  });

  it("51. User can log out", async () => {
    await agent
      .post("/api/users/logoff")
      .set("x-csrf-token", saveRes.body.csrfToken)
      .expect(200);
  });

  it("52. Logged-out user cannot access /api/tasks", async () => {
    const taskRes = await agent.get("/api/tasks");
    expect(taskRes.status).toBe(401);
  });
})