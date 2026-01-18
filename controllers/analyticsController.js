const prisma = require("../db/prisma");
const {StatusCodes} = require("http-status-codes");

const getUserAnalytics = async (req, res, next) => {
  try {
    // Parse and validate user ID
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({message: "Invalid user ID"})
    }

    const user = await prisma.user.findUnique({
      where: {id: userId}
    })

    if(!user) {
      return res.status(StatusCodes.NOT_FOUND).json({message: "User not found"});
    }
    // Use groupBy to count tasks by completion status
    const taskStats = await prisma.task.groupBy({
      by: ['isCompleted'],
      where: { userId },
      _count: {
        id: true
      }
    });

    const recentTasks = await prisma.task.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        userId: true,
        User: {
         select: { 
           name: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyProgress = await prisma.task.groupBy({
      by: ['createdAt'],
      where: {
        userId,
        createdAt: { gte: oneWeekAgo }
      },
      _count: { id: true }
    });

    res.status(200).json({
      taskStats,
      recentTasks,
      weeklyProgress
    });
  } catch (err) {
    next(err);
  }
}

const getUsersWithStats = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    //Get users with task counts and incomplete tasks 
    const usersRaw = await prisma.user.findMany({
      include: {
        Task: {
          where: { isCompleted: false },
          select: { id: true },
          take: 5,
        },
        _count: {
          select: {
            Task: true,
          },
        },
      },
      skip: skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform result 
    const users = usersRaw.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      _count: user._count,
      Task: user.Task,
    }));

    const totalUsers = await prisma.user.count();

    // Build pagination metadata
    const pages = Math.ceil(totalUsers / limit);
    const pagination = {
      page,
      limit,
      totalUsers,
      pages,
      hasNext: page * limit < totalUsers,
      hasPrev: page > 1,
    };

    return res.status(StatusCodes.OK).json({
      users,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

const searchTasks = async (req, res, next) => {
  try {
    const searchQuery = req.query.q;

    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.status(400).json({ 
        error: "Search query must be at least 2 characters long" 
      });
    }

    // Get limit from query (default to 20)
    const limit = parseInt(req.query.limit, 10) || 20;
    
    // Construct search patterns outside the query for proper parameterization
    const searchPattern = `%${searchQuery}%`;
    const exactMatch = searchQuery;
    const startsWith = `${searchQuery}%`;

    // Use raw SQL for complex text search with parameterized queries
    const searchResults = await prisma.$queryRaw`
      SELECT 
        t.id,
        t.title,
        t.is_completed as "isCompleted",
        t.priority,
        t.created_at as "createdAt",
        t.user_id as "userId",
        u.name as "user_name"
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      WHERE t.title ILIKE ${searchPattern} 
        OR u.name ILIKE ${searchPattern}
      ORDER BY 
        CASE 
          WHEN t.title ILIKE ${exactMatch} THEN 1
          WHEN t.title ILIKE ${startsWith} THEN 2
          WHEN t.title ILIKE ${searchPattern} THEN 3
          ELSE 4
        END,
        t.created_at DESC
      LIMIT ${parseInt(limit)}
    `;

    res.status(StatusCodes.OK).json({
      results: searchResults,
      query: searchQuery,
      count: searchResults.length,
    });
  } catch (err){
      next(err);
    }
}

module.exports = {getUserAnalytics, getUsersWithStats, searchTasks};