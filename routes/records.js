const router = require("express").Router();
const pool = require("../db");

const ALLOWED_STATUSES = ["Pending", "In progress", "Completed"];

function parseRecordId(rawId) {
  if (!/^\d+$/.test(String(rawId))) {
    return null;
  }
  const parsed = Number(rawId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function validateRecordBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object." };
  }

  const { title, category, description, status } = body;

  if (typeof title !== "string") {
    return { error: "Title must be a string." };
  }
  const trimmedTitle = title.trim();
  if (trimmedTitle.length < 3 || trimmedTitle.length > 80) {
    return { error: "Title must have 3 to 80 characters." };
  }

  if (typeof category !== "string") {
    return { error: "Category must be a string." };
  }
  const trimmedCategory = category.trim();
  if (trimmedCategory.length < 2 || trimmedCategory.length > 40) {
    return { error: "Category must have 2 to 40 characters." };
  }

  if (typeof description !== "string") {
    return { error: "Description must be a string." };
  }
  const trimmedDescription = description.trim();
  if (trimmedDescription.length < 5 || trimmedDescription.length > 300) {
    return { error: "Description must have 5 to 300 characters." };
  }

  if (typeof status !== "string" || !ALLOWED_STATUSES.includes(status)) {
    return {
      error: "Status must be one of: Pending, In progress, Completed.",
    };
  }

  return {
    data: {
      title: trimmedTitle,
      category: trimmedCategory,
      description: trimmedDescription,
      status,
    },
  };
}

router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, title, category, description, status FROM records ORDER BY id"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  const id = parseRecordId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "ID must be a positive whole number." });
  }

  try {
    const result = await pool.query(
      "SELECT id, title, category, description, status FROM records WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Record not found." });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const { error, data } = validateRecordBody(req.body);
  if (error) {
    return res.status(400).json({ message: error });
  }

  try {
    const result = await pool.query(
      "INSERT INTO records (title, category, description, status) VALUES ($1, $2, $3, $4) RETURNING id, title, category, description, status",
      [data.title, data.category, data.description, data.status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  const id = parseRecordId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "ID must be a positive whole number." });
  }

  const { error, data } = validateRecordBody(req.body);
  if (error) {
    return res.status(400).json({ message: error });
  }

  try {
    const result = await pool.query(
      "UPDATE records SET title = $1, category = $2, description = $3, status = $4 WHERE id = $5 RETURNING id, title, category, description, status",
      [data.title, data.category, data.description, data.status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Record not found." });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  const id = parseRecordId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "ID must be a positive whole number." });
  }

  try {
    const result = await pool.query(
      "DELETE FROM records WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Record not found." });
    }
    res.status(200).json({ message: "Record deleted." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;