const { StatusCodes } = require("http-status-codes");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const pool = require("../db/pg-pool");

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
    if (!global.user_id) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "User not logged in" });
    }
    
    const isCompleted = value.isCompleted ?? false;    
    const result = await pool.query(
      `INSERT INTO tasks (title, is_completed, user_id) VALUES($1, $2, $3)
      RETURNING id, title, is_completed`, [value.title, isCompleted, global.user_id]
    );
    
    // we don't send back the userId!
    return res.status(StatusCodes.CREATED).json(result.rows[0]);
}

const index = async (req, res) => {  

  if (!global.user_id) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "User not logged in" });
  }

  const result = await pool.query(
    `SELECT id, title, is_completed FROM tasks WHERE user_id = $1`,
    [global.user_id]
  );

  if (result.rows.length === 0) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "No tasks found for this user." });
  }

  return res.status(StatusCodes.OK).json(result.rows);
}

const show = async (req, res) => {
    const taskId = parseInt(req.params?.id); 
    if (!taskId) {
      return res.status(StatusCodes.BAD_REQUEST).json({message: "The task ID passed is not valid."})
    }
    
    const result = await pool.query(
       `SELECT id, title, is_completed FROM tasks
        WHERE id = $1 AND user_id = $2`, [taskId, global.user_id]
      );

    if(result.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "That task was not found" })
    }

    return res.status(StatusCodes.OK).json(result.rows[0]);
 }

const update = async (req, res) => {
    const taskId = parseInt(req.params?.id);
    if(!taskId){
      return res.status(StatusCodes.BAD_REQUEST).json({message: "The task ID passed is not valid"});
    }

    if (!req.body) req.body = {};

    const { error, value } = patchTaskSchema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
    }

    if ("isCompleted" in value) {
      value.is_completed = value.isCompleted;
      delete value.isCompleted;
    }

    const keys = Object.keys(value);
    if (keys.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({message: "No valid fields provided for update"});
    }
    
    const setClauses = keys.map((key, i) => `${key} = $${i+1}`).join(", ");
    const params = [...Object.values(value), taskId, global.user_id];

    const result = await pool.query(
      `UPDATE tasks SET ${setClauses} WHERE id = $${keys.length + 1} AND user_id = $${keys.length + 2}
       RETURNING id, title, is_completed`, params
    );

    if (result.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({message: "That task was not found"});
    }

    return res.status(StatusCodes.OK).json(result.rows[0]);
  
}

const deleteTask = async (req, res) => {
    const taskId = parseInt(req.params?.id); 
    if (!taskId) {
      return res.status(StatusCodes.BAD_REQUEST).json({message: "The task ID passed is not valid."})
    }
    
    const result = await pool.query(
      `DELETE FROM tasks WHERE id=$1 AND user_id=$2
      RETURNING id, title, is_completed`, [taskId, global.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({message: "That task was not found"});  
    };

    return res.status(StatusCodes.OK).json(result.rows[0]);  
 };

module.exports = {create, show, index, update, deleteTask}