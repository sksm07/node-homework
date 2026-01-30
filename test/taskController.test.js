require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL; // point to the test database!
const prisma = require("../db/prisma");
const httpMocks = require("node-mocks-http");
const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");
const { EventEmitter } = require("events");
const {
  index,
  show,
  create,
  update,
  deleteTask,
} = require("../controllers/taskController");

// a few useful globals
let user1 = null;
let user2 = null;
let saveRes = null;
let saveData = null;
let saveTaskId = null;

beforeAll(async () => {
  await prisma.Task.deleteMany(); 
  await prisma.User.deleteMany(); 
  user1 = await prisma.User.create({data: { name: "Bob", 
    email: "bob@sample.com", hashedPassword: "nonsense"}});
  user2 = await prisma.User.create({data: { name: "Alice", 
    email: "alice@sample.com", hashedPassword: "nonsense"}});
});

afterAll(() => {
  prisma.$disconnect();
})

describe("testing task creation", () => {
  it("14. cant create a task without a user id", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    expect.assertions(1)
    saveRes = httpMocks.createResponse({eventEmitter: EventEmitter});;
    try {
      await waitForRouteHandlerCompletion(create,req, saveRes);
    } catch (e) {
      expect(e.name).toBe("TypeError");
    }
  });
  it("15.you can't create a task with a bogus user id", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });

    expect.assertions(1);
    req.user = { id: 3648 };
    saveRes = httpMocks.createResponse({eventEmitter: EventEmitter});

    try {
      await waitForRouteHandlerCompletion(create,req, saveRes);
    } catch (e) {
      expect(e.name).toBe("PrismaClientKnownRequestError");
    }
  });
  it("16.with valid user id task should be created successfully", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });

    expect.assertions(1);
    req.user = { id: user1.id };
    saveRes = httpMocks.createResponse({eventEmitter: EventEmitter});
    const next = await waitForRouteHandlerCompletion(create, req, saveRes);
    expect(saveRes.statusCode).toBe(201);
  });
  it("17.The object returned from the create() call has the expected title", async () => {
    expect.assertions(1);
    saveData = saveRes._getJSONData();
    saveTaskId = saveData.id;
    expect(saveData.title).toBe("first task");
  });
  it("18. created task has isCompleted set to false", () => {
    expect.assertions(1);
    expect(saveData.isCompleted).toBe(false);
  });
  it("19.The object does not have any value for userId ", () => {
    expect.assertions(1);
    expect(saveData.userId).toBeUndefined();
  });  
});
describe("test getting created tasks", () => {
  it("20. You can't get a list of tasks without a user id", async () => {
    expect.assertions(1);
    const req = httpMocks.createRequest({
      method: "GET",
    });

    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, res);    
    expect(res.statusCode).toBe(401);    
  });
  it("21. If you use user1's id on index() the call returns a 200 status.", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: user1.id };   
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
  it("22. The returned object has a tasks array of length 1.", async () => {
    saveData = saveRes._getJSONData(); // reusing saveRes
    expect(saveData.tasks.length).toBe(1);
  });
  it("23. The title in the first array object is as expected", () => {
    saveData = saveRes._getJSONData();
    expect(saveData.tasks[0].title).toBe("first task");
  });
  it("24.The first array object does not contain a userId", () => {
    saveData = saveRes._getJSONData();
    expect(saveData.tasks[0].userId).toBeUndefined();
  });
  it("25. If you get the list of tasks using the userId from user2, you get a 404", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: user2.id }; 
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, res);
    expect(res.statusCode).toBe(404);
  });
  it("26. You can retrieve the created task using show()", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      params: { id: saveTaskId.toString() },
    });
    req.user = { id: user1.id };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(show, req, res);
    expect(res.statusCode).toBe(200);
  });
  it("27. User2 can't retrieve this task entry (404)", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      params: { id: saveTaskId.toString() },
    });
    req.user = { id: user2.id }; // second user

    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(show, req, res);
    expect(res.statusCode).toBe(404);
  });
});
describe("test updating and deleting tasks", () => {
  it("28. User1 can set the task to isCompleted: true", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      params: { id: saveTaskId.toString() },
      body: { isCompleted: true },
    });
    req.user = { id: user1.id };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(update, req, res);
    expect(res.statusCode).toBe(200);
  });
  it("29. User2 can't do this", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      params: { id: saveTaskId.toString() },
      body: { isCompleted: true },
    });
    req.user = { id: user2.id };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(update, req, res);
    expect(res.statusCode).toBe(404);
  });
  it("30. User2 can't delete this task", async () => {
    const req = httpMocks.createRequest({
      method: "DELETE",
      params: { id: saveTaskId.toString() },
    });
    req.user = { id: user2.id };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(deleteTask, req, res);
    expect(res.statusCode).toBe(404);
  });
  it("31. User1 can delete this task", async () => {
    const req = httpMocks.createRequest({
      method: "DELETE",
      params: { id: saveTaskId.toString() },
    });
    req.user = { id: user1.id };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(deleteTask, req, res);
    expect(res.statusCode).toBe(200);
  });
  it("32. Retrieving user1's tasks now returns 404", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      user: { id: user1.id },
    });
    //req.user = { id: user1.id }; 
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, res);
    expect(res.statusCode).toBe(404);
  });
});