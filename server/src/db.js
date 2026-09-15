import mysql from "mysql2/promise";
import "dotenv/config";

const useSecureConnection =
  process.env.DB_SSL === "true";

export const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",

  port: Number(
    process.env.DB_PORT || 3306,
  ),

  user: process.env.DB_USER || "root",

  password:
    process.env.DB_PASSWORD || "",

  database:
    process.env.DB_NAME || "printhub",

  waitForConnections: true,

  connectionLimit: 10,

  queueLimit: 0,

  timezone: "+08:00",

  ssl: useSecureConnection
    ? {
        minVersion: "TLSv1.2",
        rejectUnauthorized: true,
      }
    : undefined,
});

export async function testDatabaseConnection() {
  const connection = await db.getConnection();

  try {
    await connection.query("SELECT 1");

    console.log(
      "Database connected successfully.",
    );
  } finally {
    connection.release();
  }
}