import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import path from "path";
import fs from "fs";
import "dotenv/config";

import { db } from "./db.js";
import { authenticate, authorize, sign } from "./auth.js";
import { upload, avatarUpload } from "./upload.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  }),
);

app.use(express.json({ limit: "2mb" }));

// =========================================================
// HEALTH CHECK
// =========================================================

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// =========================================================
// AUTHENTICATION
// =========================================================

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const {
      fullName,
      username,
      email,
      password,
      phone = "",
    } = req.body;

    if (
      !fullName ||
      !username ||
      !email ||
      !password ||
      password.length < 8
    ) {
      return res.status(400).json({
        message:
          "Complete all fields. Password needs at least 8 characters.",
      });
    }

    const hash = await bcrypt.hash(password, 12);

    const [result] = await db.execute(
      `
        INSERT INTO users (
          full_name,
          username,
          email,
          password_hash,
          phone,
          role
        )
        VALUES (?, ?, ?, ?, ?, 'customer')
      `,
      [fullName, username, email, hash, phone],
    );

    const user = {
      id: result.insertId,
      full_name: fullName,
      username,
      email,
      role: "customer",
    };

    res.status(201).json({
      token: sign(user),
      user,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Email or username already exists.",
      });
    }

    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `
        SELECT *
        FROM users
        WHERE (email = ? OR username = ?)
        AND deleted_at IS NULL
        LIMIT 1
      `,
      [req.body.login, req.body.login],
    );

    const user = rows[0];

    const correctPassword =
      user &&
      (await bcrypt.compare(
        req.body.password || "",
        user.password_hash,
      ));

    if (
      !user ||
      user.status !== "Active" ||
      !correctPassword
    ) {
      return res.status(401).json({
        message: "Invalid login or inactive account.",
      });
    }

    await db.execute(
      `
        INSERT INTO activity_logs (user_id, action)
        VALUES (?, 'Login')
      `,
      [user.id],
    );

    res.json({
      token: sign(user),
      user: {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        role: user.role,
        profile_picture: user.profile_picture,
      },
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================
// DASHBOARD
// =========================================================

app.get("/api/dashboard", authenticate, async (req, res, next) => {
  try {
    if (req.user.role === "admin") {
      const [
        [orders],
        [customers],
        [sales],
        [lowStock],
        [recent],
      ] = await Promise.all([
        db.query(`
          SELECT
            COUNT(*) AS total,
            SUM(status = 'Pending') AS pending,
            SUM(status = 'Approved') AS approved,
            SUM(status = 'Printing') AS printing,
            SUM(status = 'Ready for Pickup') AS ready,
            SUM(status = 'Completed') AS completed
          FROM print_orders
        `),

        db.query(`
          SELECT COUNT(*) AS total
          FROM users
          WHERE role = 'customer'
          AND deleted_at IS NULL
        `),

        db.query(`
          SELECT
            COALESCE(
              SUM(
                CASE
                  WHEN DATE(payment_date) = CURDATE()
                  AND status = 'Paid'
                  THEN amount_paid
                END
              ),
              0
            ) AS today,

            COALESCE(
              SUM(
                CASE
                  WHEN MONTH(payment_date) = MONTH(CURDATE())
                  AND YEAR(payment_date) = YEAR(CURDATE())
                  AND status = 'Paid'
                  THEN amount_paid
                END
              ),
              0
            ) AS month
          FROM payments
        `),

        db.query(`
          SELECT COUNT(*) AS total
          FROM inventory_items
          WHERE current_quantity <= minimum_stock_level
          AND status <> 'Archived'
        `),

        db.query(`
          SELECT
            o.id,
            o.order_number,
            o.status,
            o.estimated_price,
            o.created_at,
            u.full_name AS customer
          FROM print_orders o
          LEFT JOIN users u
            ON u.id = o.customer_id
          ORDER BY o.id DESC
          LIMIT 6
        `),
      ]);

      return res.json({
        stats: {
          ...orders[0],
          customers: customers[0].total,
          todaySales: sales[0].today,
          monthlySales: sales[0].month,
          lowStock: lowStock[0].total,
        },
        recent,
      });
    }

    const [stats] = await db.execute(
      `
        SELECT
          COUNT(*) AS total,
          SUM(status = 'Pending') AS pending,
          SUM(status = 'Printing') AS printing,
          SUM(status = 'Ready for Pickup') AS ready,
          SUM(status = 'Completed') AS completed,
          COALESCE(SUM(balance), 0) AS balance
        FROM print_orders
        WHERE customer_id = ?
      `,
      [req.user.id],
    );

    const [recent] = await db.execute(
      `
        SELECT
          id,
          order_number,
          status,
          estimated_price,
          created_at
        FROM print_orders
        WHERE customer_id = ?
        ORDER BY id DESC
        LIMIT 6
      `,
      [req.user.id],
    );

    res.json({
      stats: stats[0],
      recent,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================
// SERVICES
// =========================================================

app.get("/api/services", authenticate, async (_req, res, next) => {
  try {
    const [services] = await db.query(`
      SELECT *
      FROM print_services
      WHERE archived_at IS NULL
      ORDER BY name
    `);

    res.json(services);
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/services",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const {
        name,
        category,
        description = "",
        base_price = 0,
        calculation_type = "Per page",
        completion_minutes = 60,
      } = req.body;

      const [result] = await db.execute(
        `
          INSERT INTO print_services (
            name,
            category,
            description,
            base_price,
            calculation_type,
            completion_minutes
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          name,
          category,
          description,
          base_price,
          calculation_type,
          completion_minutes,
        ],
      );

      res.status(201).json({
        id: result.insertId,
      });
    } catch (error) {
      next(error);
    }
  },
);

// =========================================================
// ORDERS
// =========================================================

app.get("/api/orders", authenticate, async (req, res, next) => {
  try {
    let sql = `
      SELECT
        o.*,
        u.full_name AS customer
      FROM print_orders o
      LEFT JOIN users u
        ON u.id = o.customer_id
    `;

    const values = [];

    if (req.user.role !== "admin") {
      sql += " WHERE o.customer_id = ?";
      values.push(req.user.id);
    }

    sql += " ORDER BY o.id DESC";

    const [orders] = await db.execute(sql, values);

    res.json(orders);
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/orders",
  authenticate,
  upload.fields([
    {
      name: "document",
      maxCount: 1,
    },
    {
      name: "proof",
      maxCount: 1,
    },
  ]),
  async (req, res, next) => {
    try {
      const data = JSON.parse(req.body.data || "{}");
      const document = req.files?.document?.[0];

      if (!document) {
        return res.status(400).json({
          message: "Please upload a document.",
        });
      }

      const date = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .format(new Date())
        .replaceAll("-", "");

      const randomNumber = Math.floor(
        1000 + Math.random() * 9000,
      );

      const orderNumber = `PH-${date}-${randomNumber}`;

      const [result] = await db.execute(
        `
          INSERT INTO print_orders (
            order_number,
            customer_id,
            document_title,
            paper_size,
            paper_type,
            print_color,
            print_sides,
            orientation,
            pages,
            copies,
            binding_option,
            finishing_option,
            instructions,
            fulfillment_method,
            pickup_at,
            delivery_address,
            payment_method,
            estimated_price,
            balance,
            priority
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
        `,
        [
          orderNumber,
          req.user.id,
          data.document_title,
          data.paper_size,
          data.paper_type,
          data.print_color,
          data.print_sides,
          data.orientation,
          data.pages,
          data.copies,
          data.binding_option || "None",
          data.finishing_option || "None",
          data.instructions || "",
          data.fulfillment_method,
          data.pickup_at || null,
          data.delivery_address || null,
          data.payment_method,
          data.estimated_price,
          data.estimated_price,
          data.priority || "Normal",
        ],
      );

      await db.execute(
        `
          INSERT INTO print_order_files (
            order_id,
            user_id,
            original_name,
            stored_name,
            mime_type,
            file_size,
            file_kind
          )
          VALUES (?, ?, ?, ?, ?, ?, 'document')
        `,
        [
          result.insertId,
          req.user.id,
          document.originalname,
          document.filename,
          document.mimetype,
          document.size,
        ],
      );

      const proof = req.files?.proof?.[0];

      if (proof) {
        await db.execute(
          `
            INSERT INTO print_order_files (
              order_id,
              user_id,
              original_name,
              stored_name,
              mime_type,
              file_size,
              file_kind
            )
            VALUES (?, ?, ?, ?, ?, ?, 'payment_proof')
          `,
          [
            result.insertId,
            req.user.id,
            proof.originalname,
            proof.filename,
            proof.mimetype,
            proof.size,
          ],
        );
      }

      await db.execute(
        `
          INSERT INTO notifications (
            user_id,
            title,
            message
          )
          VALUES (?, ?, ?)
        `,
        [
          req.user.id,
          "Order submitted",
          `${orderNumber} is now under review.`,
        ],
      );

      res.status(201).json({
        id: result.insertId,
        order_number: orderNumber,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/orders/:id/status",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const allowedStatuses = [
        "Pending",
        "Under Review",
        "Waiting for Payment",
        "Approved",
        "In Queue",
        "Printing",
        "Ready for Pickup",
        "Out for Delivery",
        "Completed",
        "Rejected",
        "Cancelled",
      ];

      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({
          message: "Invalid status.",
        });
      }

      await db.execute(
        `
          UPDATE print_orders
          SET
            status = ?,
            admin_notes = ?,
            final_price = COALESCE(?, final_price),
            updated_at = NOW()
          WHERE id = ?
        `,
        [
          req.body.status,
          req.body.admin_notes || "",
          req.body.final_price || null,
          req.params.id,
        ],
      );

      res.json({
        message: "Order updated.",
      });
    } catch (error) {
      next(error);
    }
  },
);

// =========================================================
// INVENTORY
// =========================================================

app.get(
  "/api/inventory",
  authenticate,
  authorize("admin"),
  async (_req, res, next) => {
    try {
      const [items] = await db.query(`
        SELECT *
        FROM inventory_items
        ORDER BY name
      `);

      res.json(items);
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/inventory",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const data = req.body;

      const [result] = await db.execute(
        `
          INSERT INTO inventory_items (
            name,
            category,
            brand,
            unit,
            current_quantity,
            minimum_stock_level,
            cost_per_unit,
            supplier,
            storage_location,
            notes
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          data.name,
          data.category,
          data.brand || "",
          data.unit,
          data.current_quantity,
          data.minimum_stock_level,
          data.cost_per_unit,
          data.supplier || "",
          data.storage_location || "",
          data.notes || "",
        ],
      );

      res.status(201).json({
        id: result.insertId,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/inventory/:id/movements",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [[item]] = await connection.execute(
        `
          SELECT
            current_quantity,
            name,
            minimum_stock_level
          FROM inventory_items
          WHERE id = ?
          FOR UPDATE
        `,
        [req.params.id],
      );

      if (!item) {
        await connection.rollback();

        return res.status(404).json({
          message: "Item not found.",
        });
      }

      const quantity = Number(req.body.quantity);
      const shouldAdd = ["Restock", "Returned"].includes(
        req.body.type,
      );

      const updatedQuantity = shouldAdd
        ? Number(item.current_quantity) + quantity
        : Number(item.current_quantity) - quantity;

      if (updatedQuantity < 0) {
        await connection.rollback();

        return res.status(400).json({
          message: "Not enough stock.",
        });
      }

      const status =
        updatedQuantity === 0
          ? "Out of Stock"
          : updatedQuantity <= item.minimum_stock_level
            ? "Low Stock"
            : "In Stock";

      await connection.execute(
        `
          UPDATE inventory_items
          SET current_quantity = ?, status = ?
          WHERE id = ?
        `,
        [updatedQuantity, status, req.params.id],
      );

      await connection.execute(
        `
          INSERT INTO inventory_movements (
            inventory_item_id,
            movement_type,
            quantity,
            previous_quantity,
            updated_quantity,
            related_order_id,
            notes,
            created_by
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          req.params.id,
          req.body.type,
          quantity,
          item.current_quantity,
          updatedQuantity,
          req.body.related_order_id || null,
          req.body.notes || "",
          req.user.id,
        ],
      );

      await connection.commit();

      res.json({
        updated_quantity: updatedQuantity,
      });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  },
);

// =========================================================
// NOTIFICATIONS
// =========================================================

app.get(
  "/api/notifications",
  authenticate,
  async (req, res, next) => {
    try {
      const [notifications] = await db.execute(
        `
          SELECT *
          FROM notifications
          WHERE user_id = ?
          ORDER BY id DESC
          LIMIT 30
        `,
        [req.user.id],
      );

      res.json(notifications);
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/notifications/:id/read",
  authenticate,
  async (req, res, next) => {
    try {
      await db.execute(
        `
          UPDATE notifications
          SET is_read = 1
          WHERE id = ? AND user_id = ?
        `,
        [req.params.id, req.user.id],
      );

      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },
);

// =========================================================
// PROFILE
// =========================================================

app.get("/api/profile", authenticate, async (req, res, next) => {
  try {
    const [[user]] = await db.execute(
      `
        SELECT
          id,
          full_name,
          username,
          email,
          phone,
          address,
          role,
          status,
          profile_picture,
          created_at
        FROM users
        WHERE id = ?
      `,
      [req.user.id],
    );

    res.json(user);
  } catch (error) {
    next(error);
  }
});

app.patch(
  "/api/profile",
  authenticate,
  avatarUpload.single("avatar"),
  async (req, res, next) => {
    try {
      const data = JSON.parse(req.body.data || "{}");

      await db.execute(
        `
          UPDATE users
          SET
            full_name = ?,
            username = ?,
            email = ?,
            phone = ?,
            address = ?,
            profile_picture = COALESCE(?, profile_picture)
          WHERE id = ?
        `,
        [
          data.full_name,
          data.username,
          data.email,
          data.phone || "",
          data.address || "",
          req.file?.filename || null,
          req.user.id,
        ],
      );

      res.json({
        message: "Profile updated.",
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get("/api/avatars/:name", (req, res) => {
  const safeName = path.basename(req.params.name);
  const filePath = path.resolve("../uploads", safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).end();
  }

  res.sendFile(filePath);
});

// =========================================================
// UPLOADED FILES
// =========================================================

app.get("/api/files", authenticate, async (req, res, next) => {
  try {
    let sql = `
      SELECT
        f.id,
        f.original_name,
        f.mime_type,
        f.file_size,
        f.file_kind,
        f.created_at,
        o.order_number,
        u.full_name AS customer
      FROM print_order_files f
      JOIN print_orders o
        ON o.id = f.order_id
      JOIN users u
        ON u.id = f.user_id
    `;

    const values = [];

    if (req.user.role !== "admin") {
      sql += " WHERE f.user_id = ?";
      values.push(req.user.id);
    }

    sql += " ORDER BY f.id DESC";

    const [files] = await db.execute(sql, values);

    res.json(files);
  } catch (error) {
    next(error);
  }
});

app.get(
  "/api/files/:id",
  authenticate,
  async (req, res, next) => {
    try {
      let sql = `
        SELECT f.*
        FROM print_order_files f
        JOIN print_orders o
          ON o.id = f.order_id
        WHERE f.id = ?
      `;

      const values = [req.params.id];

      if (req.user.role !== "admin") {
        sql += " AND o.customer_id = ?";
        values.push(req.user.id);
      }

      const [[file]] = await db.execute(sql, values);

      if (!file) {
        return res.status(404).json({
          message: "File not found.",
        });
      }

      res.download(
        path.resolve("../uploads", file.stored_name),
        file.original_name,
      );
    } catch (error) {
      next(error);
    }
  },
);

app.delete(
  "/api/files/:id",
  authenticate,
  async (req, res, next) => {
    try {
      let sql = `
        SELECT *
        FROM print_order_files
        WHERE id = ?
      `;

      const values = [req.params.id];

      if (req.user.role !== "admin") {
        sql += " AND user_id = ?";
        values.push(req.user.id);
      }

      const [[file]] = await db.execute(sql, values);

      if (!file) {
        return res.status(404).json({
          message: "File not found.",
        });
      }

      await db.execute(
        "DELETE FROM print_order_files WHERE id = ?",
        [file.id],
      );

      const filePath = path.resolve(
        "../uploads",
        file.stored_name,
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({
        message: "File deleted.",
      });
    } catch (error) {
      next(error);
    }
  },
);

// =========================================================
// CUSTOMERS
// =========================================================

app.get(
  "/api/customers",
  authenticate,
  authorize("admin"),
  async (_req, res, next) => {
    try {
      const [customers] = await db.query(`
        SELECT
          u.id,
          u.full_name,
          u.username,
          u.email,
          u.phone,
          u.status,
          u.created_at,
          COUNT(o.id) AS orders
        FROM users u
        LEFT JOIN print_orders o
          ON o.customer_id = u.id
        WHERE u.role = 'customer'
        AND u.deleted_at IS NULL
        GROUP BY u.id
        ORDER BY u.id DESC
      `);

      res.json(customers);
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/customers/:id/status",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const allowedStatuses = [
        "Active",
        "Suspended",
        "Archived",
      ];

      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({
          message: "Invalid status.",
        });
      }

      await db.execute(
        `
          UPDATE users
          SET status = ?
          WHERE id = ? AND role = 'customer'
        `,
        [req.body.status, req.params.id],
      );

      res.json({
        message: "Customer updated.",
      });
    } catch (error) {
      next(error);
    }
  },
);

// =========================================================
// PAYMENTS
// =========================================================

app.get("/api/payments", authenticate, async (req, res, next) => {
  try {
    let sql = `
      SELECT
        p.*,
        o.order_number,
        u.full_name AS customer
      FROM payments p
      JOIN print_orders o
        ON o.id = p.order_id
      LEFT JOIN users u
        ON u.id = o.customer_id
    `;

    const values = [];

    if (req.user.role !== "admin") {
      sql += " WHERE o.customer_id = ?";
      values.push(req.user.id);
    }

    sql += " ORDER BY p.id DESC";

    const [payments] = await db.execute(sql, values);

    res.json(payments);
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/payments",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const data = req.body;
      const paymentNumber = `PAY-${Date.now()}`;

      const [result] = await db.execute(
        `
          INSERT INTO payments (
            payment_number,
            order_id,
            amount_due,
            amount_paid,
            remaining_balance,
            method,
            reference_number,
            status,
            payment_date,
            verified_by
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
        `,
        [
          paymentNumber,
          data.order_id,
          data.amount_due,
          data.amount_paid,
          Math.max(0, data.amount_due - data.amount_paid),
          data.method,
          data.reference_number || "",
          data.status || "Paid",
          req.user.id,
        ],
      );

      await db.execute(
        `
          UPDATE print_orders
          SET balance = GREATEST(0, ? - ?)
          WHERE id = ?
        `,
        [
          data.amount_due,
          data.amount_paid,
          data.order_id,
        ],
      );

      res.status(201).json({
        id: result.insertId,
      });
    } catch (error) {
      next(error);
    }
  },
);

// =========================================================
// EXPENSES
// =========================================================

app.get(
  "/api/expenses",
  authenticate,
  authorize("admin"),
  async (_req, res, next) => {
    try {
      const [expenses] = await db.query(`
        SELECT *
        FROM expenses
        ORDER BY expense_date DESC, id DESC
      `);

      res.json(expenses);
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/expenses",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const data = req.body;

      const [result] = await db.execute(
        `
          INSERT INTO expenses (
            category,
            description,
            amount,
            expense_date,
            created_by
          )
          VALUES (?, ?, ?, ?, ?)
        `,
        [
          data.category,
          data.description,
          data.amount,
          data.expense_date,
          req.user.id,
        ],
      );

      res.status(201).json({
        id: result.insertId,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.delete(
  "/api/expenses/:id",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      await db.execute(
        "DELETE FROM expenses WHERE id = ?",
        [req.params.id],
      );

      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },
);

// =========================================================
// INVENTORY MOVEMENTS
// =========================================================

app.get(
  "/api/movements",
  authenticate,
  authorize("admin"),
  async (_req, res, next) => {
    try {
      const [movements] = await db.query(`
        SELECT
          m.*,
          i.name AS item,
          u.full_name AS administrator,
          o.order_number
        FROM inventory_movements m
        JOIN inventory_items i
          ON i.id = m.inventory_item_id
        LEFT JOIN users u
          ON u.id = m.created_by
        LEFT JOIN print_orders o
          ON o.id = m.related_order_id
        ORDER BY m.id DESC
      `);

      res.json(movements);
    } catch (error) {
      next(error);
    }
  },
);

// =========================================================
// ACTIVITY LOGS
// =========================================================

app.get(
  "/api/logs",
  authenticate,
  authorize("admin"),
  async (_req, res, next) => {
    try {
      const [logs] = await db.query(`
        SELECT
          l.*,
          u.full_name AS account
        FROM activity_logs l
        LEFT JOIN users u
          ON u.id = l.user_id
        ORDER BY l.id DESC
        LIMIT 200
      `);

      res.json(logs);
    } catch (error) {
      next(error);
    }
  },
);

// =========================================================
// SETTINGS
// =========================================================

app.get(
  "/api/settings",
  authenticate,
  authorize("admin"),
  async (_req, res, next) => {
    try {
      const [[settings]] = await db.query(`
        SELECT *
        FROM shop_settings
        WHERE id = 1
      `);

      res.json(settings);
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/settings",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const data = req.body;

      await db.execute(
        `
          UPDATE shop_settings
          SET
            shop_name = ?,
            address = ?,
            phone = ?,
            email = ?,
            business_hours = ?,
            pickup_schedule = ?,
            max_upload_mb = ?,
            tax_percentage = ?,
            delivery_fee = ?,
            terms = ?,
            receipt_footer = ?
          WHERE id = 1
        `,
        [
          data.shop_name,
          data.address,
          data.phone,
          data.email,
          data.business_hours,
          data.pickup_schedule,
          data.max_upload_mb,
          data.tax_percentage,
          data.delivery_fee,
          data.terms,
          data.receipt_footer,
        ],
      );

      res.json({
        message: "Settings saved.",
      });
    } catch (error) {
      next(error);
    }
  },
);

// =========================================================
// REPORTS
// =========================================================

app.get(
  "/api/reports/summary",
  authenticate,
  authorize("admin"),
  async (_req, res, next) => {
    try {
      const [[sales], [expenses], [orders]] =
        await Promise.all([
          db.query(`
            SELECT COALESCE(SUM(amount_paid), 0) AS total
            FROM payments
            WHERE status = 'Paid'
          `),

          db.query(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM expenses
          `),

          db.query(`
            SELECT status, COUNT(*) AS total
            FROM print_orders
            GROUP BY status
          `),
        ]);

      res.json({
        sales: sales[0].total,
        expenses: expenses[0].total,
        profit:
          Number(sales[0].total) -
          Number(expenses[0].total),
        orders,
      });
    } catch (error) {
      next(error);
    }
  },
);

// =========================================================
// CUSTOMER SUPPORT CHAT
// =========================================================

// Get or create the customer's conversation
app.get(
  "/api/chat/conversation",
  authenticate,
  authorize("customer"),
  async (req, res, next) => {
    try {
      const [rows] = await db.execute(
        `
          SELECT *
          FROM chat_conversations
          WHERE customer_id = ?
          AND status <> 'Closed'
          ORDER BY id DESC
          LIMIT 1
        `,
        [req.user.id],
      );

      let conversation = rows[0];

      if (!conversation) {
        const [result] = await db.execute(
          `
            INSERT INTO chat_conversations (
              customer_id,
              subject,
              status
            )
            VALUES (?, 'Customer Support', 'Open')
          `,
          [req.user.id],
        );

        conversation = {
          id: result.insertId,
          customer_id: req.user.id,
          subject: "Customer Support",
          status: "Open",
          created_at: new Date(),
          last_message_at: new Date(),
        };

        await db.execute(
          `
            INSERT INTO chat_messages (
              conversation_id,
              sender_role,
              message
            )
            VALUES (?, 'assistant', ?)
          `,
          [
            conversation.id,
            "Hello! You are now connected to PrintHub support. How can we help you?",
          ],
        );
      }

      const [messages] = await db.execute(
        `
          SELECT
            m.*,
            u.full_name AS sender_name
          FROM chat_messages m
          LEFT JOIN users u
            ON u.id = m.sender_id
          WHERE m.conversation_id = ?
          ORDER BY m.created_at, m.id
        `,
        [conversation.id],
      );

      await db.execute(
        `
          UPDATE chat_messages
          SET is_read = 1
          WHERE conversation_id = ?
          AND sender_role IN ('admin', 'assistant')
        `,
        [conversation.id],
      );

      res.json({
        conversation,
        messages,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Customer sends a message
app.post(
  "/api/chat/messages",
  authenticate,
  authorize("customer"),
  async (req, res, next) => {
    try {
      const message = req.body.message?.trim();

      if (!message) {
        return res.status(400).json({
          message: "Please enter a message.",
        });
      }

      if (message.length > 2000) {
        return res.status(400).json({
          message: "The message is too long.",
        });
      }

      const [rows] = await db.execute(
        `
          SELECT id
          FROM chat_conversations
          WHERE customer_id = ?
          AND status <> 'Closed'
          ORDER BY id DESC
          LIMIT 1
        `,
        [req.user.id],
      );

      let conversationId = rows[0]?.id;

      if (!conversationId) {
        const [result] = await db.execute(
          `
            INSERT INTO chat_conversations (
              customer_id,
              subject,
              status
            )
            VALUES (?, 'Customer Support', 'Open')
          `,
          [req.user.id],
        );

        conversationId = result.insertId;
      }

      const [result] = await db.execute(
        `
          INSERT INTO chat_messages (
            conversation_id,
            sender_id,
            sender_role,
            message,
            is_read
          )
          VALUES (?, ?, 'customer', ?, 0)
        `,
        [
          conversationId,
          req.user.id,
          message,
        ],
      );

      await db.execute(
        `
          UPDATE chat_conversations
          SET
            status = 'Open',
            last_message_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [conversationId],
      );

      res.status(201).json({
        id: result.insertId,
        conversation_id: conversationId,
        sender_role: "customer",
        message,
      });
    } catch (error) {
      next(error);
    }
  },
);

// =========================================================
// ADMIN SUPPORT CHAT
// =========================================================

// Admin gets all customer conversations
app.get(
  "/api/admin/chats",
  authenticate,
  authorize("admin"),
  async (_req, res, next) => {
    try {
      const [conversations] = await db.query(`
        SELECT
          c.*,
          u.full_name AS customer_name,
          u.email AS customer_email,

          (
            SELECT message
            FROM chat_messages
            WHERE conversation_id = c.id
            ORDER BY id DESC
            LIMIT 1
          ) AS last_message,

          (
            SELECT COUNT(*)
            FROM chat_messages
            WHERE conversation_id = c.id
            AND sender_role = 'customer'
            AND is_read = 0
          ) AS unread_count

        FROM chat_conversations c
        JOIN users u
          ON u.id = c.customer_id
        ORDER BY c.last_message_at DESC, c.id DESC
      `);

      res.json(conversations);
    } catch (error) {
      next(error);
    }
  },
);

// Admin gets messages from one conversation
app.get(
  "/api/admin/chats/:id/messages",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const [[conversation]] = await db.execute(
        `
          SELECT
            c.*,
            u.full_name AS customer_name,
            u.email AS customer_email
          FROM chat_conversations c
          JOIN users u
            ON u.id = c.customer_id
          WHERE c.id = ?
        `,
        [req.params.id],
      );

      if (!conversation) {
        return res.status(404).json({
          message: "Conversation not found.",
        });
      }

      const [messages] = await db.execute(
        `
          SELECT
            m.*,
            u.full_name AS sender_name
          FROM chat_messages m
          LEFT JOIN users u
            ON u.id = m.sender_id
          WHERE m.conversation_id = ?
          ORDER BY m.created_at, m.id
        `,
        [req.params.id],
      );

      await db.execute(
        `
          UPDATE chat_messages
          SET is_read = 1
          WHERE conversation_id = ?
          AND sender_role = 'customer'
        `,
        [req.params.id],
      );

      res.json({
        conversation,
        messages,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Admin replies to customer
app.post(
  "/api/admin/chats/:id/messages",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const message = req.body.message?.trim();

      if (!message) {
        return res.status(400).json({
          message: "Please enter a reply.",
        });
      }

      if (message.length > 2000) {
        return res.status(400).json({
          message: "The reply is too long.",
        });
      }

      const [[conversation]] = await db.execute(
        `
          SELECT id
          FROM chat_conversations
          WHERE id = ?
        `,
        [req.params.id],
      );

      if (!conversation) {
        return res.status(404).json({
          message: "Conversation not found.",
        });
      }

      const [result] = await db.execute(
        `
          INSERT INTO chat_messages (
            conversation_id,
            sender_id,
            sender_role,
            message,
            is_read
          )
          VALUES (?, ?, 'admin', ?, 0)
        `,
        [
          req.params.id,
          req.user.id,
          message,
        ],
      );

      await db.execute(
        `
          UPDATE chat_conversations
          SET
            assigned_admin_id = ?,
            status = 'Waiting',
            last_message_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [
          req.user.id,
          req.params.id,
        ],
      );

      res.status(201).json({
        id: result.insertId,
        conversation_id: Number(req.params.id),
        sender_role: "admin",
        message,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Admin changes the conversation status
app.patch(
  "/api/admin/chats/:id/status",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const allowedStatuses = [
        "Open",
        "Waiting",
        "Closed",
      ];

      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({
          message: "Invalid conversation status.",
        });
      }

      await db.execute(
        `
          UPDATE chat_conversations
          SET
            status = ?,
            assigned_admin_id =
              COALESCE(assigned_admin_id, ?)
          WHERE id = ?
        `,
        [
          req.body.status,
          req.user.id,
          req.params.id,
        ],
      );

      res.json({
        message: "Conversation status updated.",
      });
    } catch (error) {
      next(error);
    }
  },
);

// =========================================================
// ERROR HANDLER
// =========================================================

app.use((error, _req, res, _next) => {
  console.error(error);

  const status =
    error?.code === "LIMIT_FILE_SIZE" ? 400 : 500;

  res.status(status).json({
    message: error.message || "Server error.",
  });
});

// =========================================================
// START SERVER
// =========================================================

app.listen(PORT, () => {
  console.log(
    `PrintHub API running on http://localhost:${PORT}`,
  );
});