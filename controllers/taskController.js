const { StatusCodes } = require("http-status-codes");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

const prisma = require("../db/prisma");

const create = async (req, res) => {
    if (!req.body) req.body = {};

    const { error, value } = taskSchema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: error.message });
    }
    const userId = req.user.id;
    const task = await prisma.task.create({
        data: {
          title: value.title,
          isCompleted: value.isCompleted ?? false, // default to false if not provided
          priority: value.priority ?? "medium",
          userId, 
        },
        select: { id: true, title: true, isCompleted: true, priority: true }, // not returning userId
      });

      return res.status(StatusCodes.CREATED).json(task);
    /*if (!userId) {
      return next({status: StatusCodes.UNAUTHORIZED, message: "User not logged in" });
    }
    
    try {
    
      const task = await prisma.task.create({
        data: {
          title: value.title,
          isCompleted: value.isCompleted ?? false, // default to false if not provided
          priority: value.priority ?? "medium",
          userId, 
        },
        select: { id: true, title: true, isCompleted: true, priority: true }, // not returning userId
      });

      return res.status(StatusCodes.CREATED).json(task);

    } catch (err) {
      return next(err);
    }*/
}

const bulkCreate = async (req, res, next) => {
  const { tasks } = req.body;

  // Validate the tasks array
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({ 
      error: "Invalid request data. Expected an array of tasks." 
    });
  }
  
  const userId = req.user?.id;
  if (!userId) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "User not logged in" });
  }

  // Validate all tasks before insertion
  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: "Validation failed",
        details: error.details,
      });
    }
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority || 'medium',
      userId,
    });
  }

  // Use createMany for batch insertion
  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false
    });

    res.status(StatusCodes.CREATED).json({
      message: "Bulk task creation successful",
      tasksCreated: result.count,
      totalRequested: validTasks.length
    });
  } catch (err) {
    return next(err);
  }
};

const index = async (req, res, next) => {  
  const userId = req.user?.id;
  if (!userId) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "User not logged in" });
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    if (page < 1) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Page must be greater than or equal to 1",
      });
    }

    if (limit < 1 || limit > 100) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Limit must be between 1 and 100",
      });
    }
    const skip = (page-1) * limit;
    const whereClause = {userId: userId};

    if (req.query.find) {
      whereClause.title = {
        contains: req.query.find,
        mode: 'insensitive'
      }
    }
    const tasks = await prisma.task.findMany({
      where: whereClause, // only the tasks for this user,
      select: { 
        title: true, 
        isCompleted: true, 
        id: true,
        priority: true,
        createdAt: true,
        User: {
          select: {
            name: true,
            email: true
          }
        }
       },
       skip: skip,
       take: limit,
       orderBy: {createdAt: 'desc'}
    });

    const totalTasks = await prisma.task.count({
      where: whereClause
    });
    const pages = Math.ceil(totalTasks/limit);

    const pagination = {
      page: page,
      limit,
      total: totalTasks,
      pages,
      hasNext: (page * limit) < totalTasks,
      hasPrev: page > 1
    }

    if (tasks.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "No tasks found for this user." });
    }

    return res.status(StatusCodes.OK).json({
      tasks: tasks,
      pagination: pagination
    });

  } catch (err) {
    return next(err);
  } 
  
}

const show = async (req, res, next) => {
    const id = parseInt(req.params?.id); 
    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({message: "The task ID passed is not valid."})
    }
    
    const userId = req.user?.id;
    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "User not logged in" });
    }
    
    try {
      const task = await prisma.task.findUnique({
        where: {
          id_userId: {
            id,
            userId: userId,
          },
        },
        select: { 
          id: true, 
          title: true, 
          isCompleted: true,
          priority: true,
          createdAt: true,
          User: {
            select: {
              name: true,
              email: true
            }
          },
        }
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

    const userId = req.user?.id;
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ message: "User not logged in" });
    
    try {
      const task = await prisma.task.update({
        data: value, // Prisma uses camelCase (isCompleted)
        where: {
          id_userId: {
            id,
            userId: userId,
          },
        },
        select: { id: true, title: true, isCompleted: true, priority: true },
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
    const userId = req.user?.id;  
    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "User not logged in" });
    }
     
    try {
      const task = await prisma.task.delete({
        where: {
          id_userId: {
            id,
            userId: userId,
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

module.exports = {create, bulkCreate, show, index, update, deleteTask}