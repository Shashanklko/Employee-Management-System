import { Op } from "sequelize";
import Idea from "../models/Idea.js";
import IdeaVote from "../models/IdeaVote.js";
import Employee from "../models/Employee.js";
import { createAuditLog, getClientIP, getUserAgent } from "../utils/auditLogger.js";

/**
 * Submit idea
 */
export const submitIdea = async (req, res) => {
  try {
    const { title, description, category, impact_level } = req.body;
    const employee_id = req.user.id;

    if (!title || !description) {
      return res.status(400).json({
        error: "Title and description are required",
      });
    }

    const idea = await Idea.create({
      employee_id,
      title,
      description,
      category: category || "Other",
      impact_level: impact_level || "Medium",
      status: "Submitted",
      upvotes: 0,
    });

    // Audit log
    await createAuditLog({
      action: "SUBMIT_IDEA",
      entity_type: "Idea",
      entity_id: idea.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: { created: idea.toJSON() },
    });

    res.status(201).json({
      message: "Idea submitted successfully",
      idea,
    });
  } catch (error) {
    console.error("Submit idea error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get all ideas
 */
export const getAllIdeas = async (req, res) => {
  try {
    const { status, category, impact_level, sort_by = "createdAt", order = "DESC" } = req.query;

    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (impact_level) where.impact_level = impact_level;

    const ideas = await Idea.findAll({
      where,
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "full_name", "email", "department"],
        },
      ],
      order: [[sort_by, order.toUpperCase()]],
    });

    // Get vote counts for each idea
    const ideasWithVotes = await Promise.all(
      ideas.map(async (idea) => {
        const ideaData = idea.toJSON();
        const voteCount = await IdeaVote.count({
          where: { idea_id: idea.id },
        });
        ideaData.upvotes = voteCount;
        
        // Check if current user has voted
        const userVote = await IdeaVote.findOne({
          where: {
            idea_id: idea.id,
            employee_id: req.user.id,
          },
        });
        ideaData.user_has_voted = !!userVote;

        return ideaData;
      })
    );

    res.json({
      ideas: ideasWithVotes,
      total: ideasWithVotes.length,
    });
  } catch (error) {
    console.error("Get all ideas error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get idea by ID
 */
export const getIdeaById = async (req, res) => {
  try {
    const { id } = req.params;

    const idea = await Idea.findByPk(id, {
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "full_name", "email", "department"],
        },
      ],
    });

    if (!idea) {
      return res.status(404).json({ error: "Idea not found" });
    }

    // Get vote count
    const voteCount = await IdeaVote.count({
      where: { idea_id: id },
    });

    // Check if user has voted
    const userVote = await IdeaVote.findOne({
      where: {
        idea_id: id,
        employee_id: req.user.id,
      },
    });

    const ideaData = idea.toJSON();
    ideaData.upvotes = voteCount;
    ideaData.user_has_voted = !!userVote;

    res.json({ idea: ideaData });
  } catch (error) {
    console.error("Get idea by ID error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Upvote idea
 */
export const upvoteIdea = async (req, res) => {
  try {
    const { id } = req.params;
    const employee_id = req.user.id;

    const idea = await Idea.findByPk(id);
    if (!idea) {
      return res.status(404).json({ error: "Idea not found" });
    }

    // Check if already voted
    const existingVote = await IdeaVote.findOne({
      where: {
        idea_id: id,
        employee_id,
      },
    });

    if (existingVote) {
      return res.status(400).json({
        error: "You have already upvoted this idea",
      });
    }

    // Create vote
    await IdeaVote.create({
      idea_id: id,
      employee_id,
    });

    // Update idea upvote count
    await idea.increment("upvotes");

    res.json({
      message: "Idea upvoted successfully",
    });
  } catch (error) {
    console.error("Upvote idea error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Remove upvote
 */
export const removeUpvote = async (req, res) => {
  try {
    const { id } = req.params;
    const employee_id = req.user.id;

    const idea = await Idea.findByPk(id);
    if (!idea) {
      return res.status(404).json({ error: "Idea not found" });
    }

    const vote = await IdeaVote.findOne({
      where: {
        idea_id: id,
        employee_id,
      },
    });

    if (!vote) {
      return res.status(400).json({
        error: "You haven't upvoted this idea",
      });
    }

    await vote.destroy();

    // Update idea upvote count
    await idea.decrement("upvotes");

    res.json({
      message: "Upvote removed successfully",
    });
  } catch (error) {
    console.error("Remove upvote error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Review idea (HR/Executive/System Admin only)
 */
export const reviewIdea = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, review_notes } = req.body;

    if (!status) {
      return res.status(400).json({
        error: "Status is required",
      });
    }

    const validStatuses = ["Under Review", "Approved", "Rejected", "Implemented"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status",
      });
    }

    const idea = await Idea.findByPk(id);
    if (!idea) {
      return res.status(404).json({ error: "Idea not found" });
    }

    const oldData = { ...idea.toJSON() };

    await idea.update({
      status,
      reviewed_by: req.user.id,
      reviewed_by_type: req.user.role,
      review_notes: review_notes || null,
      reviewed_at: new Date(),
    });

    await idea.reload();

    // Audit log
    await createAuditLog({
      action: "REVIEW_IDEA",
      entity_type: "Idea",
      entity_id: idea.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      changes: {
        before: oldData,
        after: idea.toJSON(),
      },
    });

    res.json({
      message: "Idea reviewed successfully",
      idea,
    });
  } catch (error) {
    console.error("Review idea error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get innovation leaderboard
 */
export const getInnovationLeaderboard = async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    // Get all ideas from the year
    const ideas = await Idea.findAll({
      where: {
        createdAt: {
          [Op.between]: [
            new Date(`${currentYear}-01-01`),
            new Date(`${currentYear}-12-31`),
          ],
        },
      },
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "full_name", "email", "department"],
        },
      ],
    });

    // Calculate leaderboard
    const employeeStats = {};

    ideas.forEach((idea) => {
      const empId = idea.employee_id;
      if (!employeeStats[empId]) {
        employeeStats[empId] = {
          employee: idea.employee,
          total_ideas: 0,
          approved_ideas: 0,
          implemented_ideas: 0,
          total_upvotes: 0,
        };
      }

      employeeStats[empId].total_ideas += 1;
      if (idea.status === "Approved" || idea.status === "Implemented") {
        employeeStats[empId].approved_ideas += 1;
      }
      if (idea.status === "Implemented") {
        employeeStats[empId].implemented_ideas += 1;
      }
    });

    // Get upvotes for each idea
    for (const idea of ideas) {
      const voteCount = await IdeaVote.count({
        where: { idea_id: idea.id },
      });
      if (employeeStats[idea.employee_id]) {
        employeeStats[idea.employee_id].total_upvotes += voteCount;
      }
    }

    // Convert to array and sort by total upvotes
    const leaderboard = Object.values(employeeStats)
      .map((stat) => ({
        ...stat,
        score: stat.total_upvotes + (stat.approved_ideas * 5) + (stat.implemented_ideas * 10),
      }))
      .sort((a, b) => b.score - a.score);

    res.json({
      year: currentYear,
      leaderboard,
      total_ideas: ideas.length,
    });
  } catch (error) {
    console.error("Get innovation leaderboard error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

