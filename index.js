import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { client } from "./db.js";

import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import multer from "multer";
const upload = multer({ dest: "public/photos" });

const type = upload.single("file");
const app = express();

// middleware untuk membaca body berformat JSON
app.use(express.json());
// middleware untuk mengelola cookie

// Untuk mengakses file statis (khusus Vercel)

app.use(express.static("public"));

const salt = await bcrypt.genSalt();
const hash = await bcrypt.hash("1234", salt);
import path from "path";
import { count } from "console";
console.log(hash);
const __dirname = path.dirname(new URL(import.meta.url).pathname);
app.use(express.static(path.resolve(__dirname, "public")));

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
  const result = await client.query(
    `select * from pengguna where id = ${req.me.id}`
  );
  req.me = result.rows;
  res.json(req.me);
});

//Surat Masuk
app.get("/api/surat-masuk", async (req, res) => {
  const results = await client.query(
    `select * from arsip_surat where status = 2`
  );
  // console.log(results.rows);
  const jumlahSurat = count(results);
  res.json(results.rows);
});
// Arsip
app.get("/api/arsip", async (req, res) => {
  const results = await client.query(
    `select * from arsip_surat where status = 1`
  );
  const jumlahSurat = count(results);
  res.json(results.rows);
});

//tampilkan satu
app.get("/api/lihat/:id", async (req, res) => {
  const results = await client.query(
    `SELECT * FROM arsip_surat WHERE id = '${req.params.id}'`
  );
  res.json(results.rows[0]);
});

// Tampil Seluruh Data
app.get("/api/data", async (req, res) => {
  const results = await client.query(`SELECT *
    FROM arsip_surat
    right Join status_surat
    ON arsip_surat.status = status_surat.id`);
  // console.log(results.rows);
  const jumlahSurat = count(results);
  res.json(results.rows);
});

// Input Data
app.post("/api/input", async (req, res) => {
  await client.query(
    `INSERT INTO arsip_surat (pengirim, tanggal_kirim, catatan,status) VALUES ('${req.body.pengirim}','${req.body.tanggal_kirim}','${req.body.catatan}','${req.body.status}')`
  );
  res.send("Mahasiswa berhasil ditambahkan.");
});

// Hapus Data
app.delete("/api/hapus/:id", async (req, res) => {
  await client.query(`DELETE FROM arsip_surat WHERE id = '${req.params.id}'`);
  res.send("Mahasiswa berhasil dihapus.");
});

app.listen(3000, () => {
  console.log("Server berhasil berjalan.");
});
