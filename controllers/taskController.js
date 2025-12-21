const { StatusCodes } = require("http-status-codes");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

const taskCounter = (() => {
  let lastTaskNumber = 0;
  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();

const create = (req, res) => {
    if (!req.body) req.body = {};

    const { error, value } = taskSchema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: error.message });
    }
    const newTask = {
      ...value, 
      id: taskCounter(), 
      userId: global.user_id.email,
    };

    global.tasks.push(newTask);

    const {userId, ...sanitizedTask} = newTask; 
    // we don't send back the userId!
    return res.status(StatusCodes.CREATED).json(sanitizedTask);
}

const deleteTask = (req, res) => {
    const taskToFind = parseInt(req.params?.id); // if there are no params, the ? makes sure that you get a null
    if (!taskToFind) {
      return res.status(400).json({message: "The task ID passed is not valid."})
    }
    const taskIndex = global.tasks.findIndex((task) => task.id === taskToFind && task.userId === global.user_id.email);
    // we get the index, not the task, so that we can splice it out

    if (taskIndex === -1) { // if no such task
      return res.status(StatusCodes.NOT_FOUND).json({message: "That task was not found"});  
    }

    const {userId, ...task} = global.tasks[taskIndex] ; 
    global.tasks.splice(taskIndex, 1); // do the delete
    return res.json(task);  
}

const index = (req, res) => {
   const userTasks = global.tasks.filter((task) => task.userId === global.user_id.email);

   if (userTasks.length === 0) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "No tasks found for this user." });
  }
   
   const sanitizedTasks = userTasks.map((task) => {
      const { userId, ...sanitizedTask} = task;
      return sanitizedTask;
    });
    
    return res.json(sanitizedTasks)
}

const show = (req, res) => {
    const taskToFind = parseInt(req.params?.id); 
    if (!taskToFind) {
      return res.status(StatusCodes.BAD_REQUEST).json({message: "The task ID passed is not valid."})
    }
    const task = global.tasks.find((task) => {
       return task.id === taskToFind && task.userId === global.user_id.email;
    });

    if(!task) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "That task was not found" })
    }

    const {userId, ...sanitizedTask} = task;
    return res.json(sanitizedTask)
}

const update = (req, res) => {
    const taskToFind = parseInt(req.params?.id);
    if(!taskToFind){
      return res.status(StatusCodes.BAD_REQUEST).json({message: "The task ID passed is not valid"});
    }

    if (!req.body) req.body = {};

    const { error, value } = patchTaskSchema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
    }

    const task = global.tasks.find((task) => task.id === taskToFind && task.userId === global.user_id.email);
    if (!task) { return res.status(StatusCodes.NOT_FOUND).json({ message: "That task was not found" })};

    Object.assign(task, value);

    const { userId, ...sanitizedTask } = task;
    return res.json(sanitizedTask);
  
}

module.exports = {create, show, index, update, deleteTask}