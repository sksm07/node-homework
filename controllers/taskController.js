const { StatusCodes } = require("http-status-codes");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

const prisma = require("../db/prisma");

const create = async (req, res, next) => {
    if (!req.body) req.body = {};

    const { error, value } = taskSchema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: error.message });
    }
    if (!global.user_id) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "User not logged in" });
    }
    
    try {
    
      const task = await prisma.task.create({
        data: {
          title: value.title,
          isCompleted: value.isCompleted ?? false, // default to false if not provided
          userId: global.user_id, 
        },
        select: { id: true, title: true, isCompleted: true }, // not returning userId
      });

      return res.status(StatusCodes.CREATED).json(task);

    } catch (err) {
      return next(err);
    }
}

const index = async (req, res, next) => {  

  if (!global.user_id) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "User not logged in" });
  }

  try {
    const tasks = await prisma.task.findMany({
      where: {
        userId: global.user_id, // only the tasks for this user!
      },
      select: { title: true, isCompleted: true, id: true }
    });

    if (tasks.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "No tasks found for this user." });
    }

    return res.status(StatusCodes.OK).json(tasks);

  } catch (err) {
    return next(err);
  } 
  
}

const show = async (req, res, next) => {
    const id = parseInt(req.params?.id); 
    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({message: "The task ID passed is not valid."})
    }
    
    if (!global.user_id) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "User not logged in" });
    }
    
    try {
      const task = await prisma.task.findUnique({
        where: {
          id_userId: {
            id,
            userId: global.user_id,
          },
        },
        select: { id: true, title: true, isCompleted: true },
      });

      // findUnique returns null if not found 
      if (!task) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "That task was not found" });
      }

      return res.status(StatusCodes.OK).json(task);
    } catch (err) {
      return next(err);
    }
 }

const update = async (req, res, next) => {
    const id = parseInt(req.params?.id);
    if(!id){
      return res.status(StatusCodes.BAD_REQUEST).json({message: "The task ID passed is not valid"});
    }

    if (!req.body) req.body = {};

    const { error, value } = patchTaskSchema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
    }
    
    if (Object.keys(value).length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({message: "No valid fields provided for update"});
    }
    
    try {
      const task = await prisma.task.update({
        data: value, // Prisma uses camelCase (isCompleted)
        where: {
          id_userId: {
            id,
            userId: global.user_id,
          },
        },
        select: { id: true, title: true, isCompleted: true },
      });

      return res.status(StatusCodes.OK).json(task);
    } catch (err) {
      if (err.code === "P2025") {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "The task was not found." });
      }
      return next(err);
    }  
  }

const deleteTask = async (req, res, next) => {
    const id = parseInt(req.params?.id); 
    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({message: "The task ID passed is not valid."})
    }
      
    if (!global.user_id) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "User not logged in" });
    }
     
    try {
      const task = await prisma.task.delete({
        where: {
          id_userId: {
            id,
            userId: global.user_id,
          },
        },
        select: { id: true, title: true, isCompleted: true },
      });

      return res.status(StatusCodes.OK).json(task);
    } catch (err) {
      if (err.code === "P2025") {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "That task was not found" });
      }
      return next(err);
    }
 };

module.exports = {create, show, index, update, deleteTask}