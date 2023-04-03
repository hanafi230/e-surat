import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { client } from "./db.js";

import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import multer from "multer";
const upload = multer({ dest: "public/photos" });

const type = upload.single('file')
const app = express();

// middleware untuk membaca body berformat JSON
app.use(express.json());
// middleware untuk mengelola cookie

// Untuk mengakses file statis (khusus Vercel)

app.use(express.static("public"));

import path from "path";
const __dirname = path.dirname(new URL(import.meta.url).pathname);
app.use(express.static(path.resolve(__dirname, "public")));

app.use(cookieParser());

app.use((req, res, next) => {
  if (req.path.startsWith("/api/login") || req.path.startsWith("/assets")) {
    next();
  } else {
    let authorized = false;
    if (req.cookies.token) {
      try {
        req.me = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
        authorized = true;
      } catch (err) {
        res.setHeader("Cache-Control", "no-store"); // khusus Vercel
        res.clearCookie("token");
      }
    }
    if (authorized) {
      if (req.path.startsWith("/login")) {
        res.redirect("/");
      } else {
        next();
      }
    } else {
      if (req.path.startsWith("/login")) {
        next();
      } else {
        if (req.path.startsWith("/api")) {
          res.status(401);
          res.send("Anda harus login terlebih dahulu.");
        } else {
          res.redirect("/login");
        }
      }
    }
  }
});

app.use(express.static("public"));

// Untuk membaca body berformat JSON
app.post("/api/login", async (req, res) => {
  const results = await client.query(
    `SELECT * FROM pengguna WHERE email = '${req.body.email}'`
  );
  if (results.rows.length > 0) {
    if (await bcrypt.compare(req.body.password, results.rows[0].password)) {
      const token = jwt.sign(results.rows[0], process.env.SECRET_KEY);
      res.cookie("token", token);
      res.send("Login berhasil.");
    } else {
      res.status(401);
      res.send("Kata sandi salah.");
    }
  } else {
    res.status(401);
    res.send("Username tidak ditemukan.");
  }
});

// dapatkan username yang login
app.get("/api/me", async (req, res) => {
  const result = await client.query(`select * from pengguna where id = ${req.me.id}`);
  req.me = result.rows[0];
  res.json(req.me);
});

app.listen(3000, () => {
    console.log("Server berhasil berjalan.");
  });