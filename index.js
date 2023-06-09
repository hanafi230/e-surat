import express from "express";
import { client } from "./db.js";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import { count } from "console";
import { unlink } from "fs/promises";

import dotenv from "dotenv";
import e from "express";
dotenv.config();
const upload = multer({ dest: "public/photos" });
const app = express();
// app.use(cookieParser());

// Untuk memeriksa otorisasi
// app.use((req, res, next) => {
//   if (req.path.startsWith("/api/login") || req.path.startsWith("/assets")) {
//     next();
//   } else {
//     let authorized = false;
//     if (req.cookies.token) {
//       try {
//         jwt.verify(req.cookies.token, process.env.SECRET_KEY);
//         authorized = true;
//       } catch (err) {
//         res.setHeader("Cache-Control", "no-store"); // khusus Vercel
//         res.clearCookie("token");
//       }
//     }
//     if (authorized) {
//       if (req.path.startsWith("/login")) {
//         res.redirect("/");
//       } else {
//         next();
//       }
//     } else {
//       if (req.path.startsWith("/login")) {
//         next();
//       } else {
//         if (req.path.startsWith("/api")) {
//           res.status(401);
//           res.send("Anda harus login terlebih dahulu.");
//         } else {
//           res.redirect("/login");
//         }
//       }
//     }
//   }
// });

// Untuk membaca body berformat JSON
app.use(express.json());

// ROUTE OTORISASI

// Login (dapatkan token)
// app.post("/api/login", async (req, res) => {
//   const results = await client.query(
//     `SELECT * FROM pengguna WHERE email = '${req.body.email}'`
//   );
//   if (results.rows.length > 0) {
//     if (await bcrypt.compare(req.body.password, results.rows[0].password)) {
//       const token = jwt.sign(results.rows[0], process.env.SECRET_KEY);
//       res.cookie("token", token);
//       res.send("Login berhasil.");
//     } else {
//       res.status(401);
//       res.send("Kata sandi salah.");
//     }
//   } else {
//     res.status(401);
//     res.send("Mahasiswa tidak ditemukan.");
//   }
// });

const salt = await bcrypt.genSalt();
const hash = await bcrypt.hash("1234", salt);
//  console.log(hash);

app.use(cookieParser());

app.use((req, res, next) => {
  if (req.path.startsWith("/api/login") || req.path.startsWith("/assets")) {
    next();
  } else {
    if (req.cookies.token) {
      try {
        req.me = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
      } catch (err) {
        res.setHeader("Cache-Control", "no-store"); // khusus Vercel
        res.clearCookie("token");
      }
    }
    if (req.me) {
      if (req.me.peran == 1) {
        if (req.path.startsWith("/input") || req.path.startsWith("/login")) {
          res.redirect("/");
        } else {
          next();
        }
      } else {
        if (req.path === "/" || req.path.startsWith("/login")) {
          res.redirect("/input");
        } else {
          next();
        }
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

// Untuk membaca body berformat JSON //////////////////////////////////////////////////////////////////
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

// Logout (hapus token)
app.get("/api/logout", (_req, res) => {
  res.setHeader("Cache-Control", "no-store"); // khusus Vercel
  res.clearCookie("token");
  res.redirect("../login");
  res.send("Logout berhasil.");
});

// dapatkan username yang login //////////////////////////////////////////////////////////////////
app.get("/api/me", async (req, res) => {
  const result = await client.query(
    `select * from pengguna where id = ${req.me.id}`
  );
  req.me = result.rows;
  res.json(req.me);
});

//Surat Masuk //////////////////////////////////////////////////////////////////
app.get("/api/surat-masuk", async (req, res) => {
  const results = await client.query(
    `select * from arsip_surat where status = 2`
  );
  const jumlahSurat = count(results);
  res.json(results.rows);
});
// Arsip //////////////////////////////////////////////////////////////////
app.get("/api/arsip", async (req, res) => {
  const results = await client.query(
    `select * from arsip_surat where status = 1`
  );
  const jumlahSurat = count(results);
  res.json(results.rows);
});

// tampilkan satu///////////////////////////////////////////////////////////////////
app.get("/api/tampil/:id", async (req, res) => {
  const results = await client.query(
    `SELECT * FROM arsip_surat WHERE id = '${req.params.id}'`
  );
  res.json(results.rows[0]);
});

// Tampilkan Arsip//////////////////////////////////////////////////////////////////
app.get("/api/tampilArsip/:id", async (req, res) => {
  const results = await client.query(
    `SELECT * FROM arsip_surat WHERE id = '${req.params.id}'`
  );
  res.json(results.rows[0]);
});

//tampilkan edit ///////////////////////////////////////////////////////////////////

app.put("/api/lihat/:id", async (req, res) => {
  await client.query(
    `UPDATE arsip_surat SET pengirim = '${req.body.pengirim}', tanggal_kirim = '${req.body.tanggal_kirim}', catatan = '${req.body.catatan}', status = '${req.body.status}' WHERE id = ${req.params.id}`
  );
  res.send("Data berhasil diedit.");
});

app.put("/api/ubah", upload.single("profil"), async (req, res) => {
  if (req.file) {
    const result = await client.query(
      `SELECT profil FROM pengguna WHERE id = ${req.me.id}`
    );
    await unlink(`./public/photos/${result.rows[0].profil}`);
  }
  await client.query(
    `UPDATE pengguna SET nama = '${req.body.nama}', jenis_kelamin = '${
      req.body.jenis_kelamin
    }', alamat = '${req.body.alamat}', nomor_telepon = '${
      req.body.nomor_telepon
    }', email = '${req.body.email}'${
      req.file ? `, profil = '${req.file.filename}'` : ""
    } WHERE id = ${req.me.id}`
  );
  res.send("Berhasil diedit.");
});

// Tampil Seluruh Data //////////////////////////////////////////////////////////////////
app.get("/api/data", async (req, res) => {
  const results = await client.query(`SELECT *
    FROM arsip_surat
    right Join status_surat
    ON arsip_surat.status = status_surat.id`);
  const jumlahSurat = count(results);
  res.json(results.rows);
});

// Input Data //////////////////////////////////////////////////////////////////
app.post("/api/input", upload.single("surat"), async (req, res) => {
  await client.query(
    `INSERT INTO arsip_surat (pengirim, tanggal_kirim, catatan,status,surat) VALUES ('${req.body.pengirim}','${req.body.tanggal_kirim}','${req.body.catatan}',${req.body.status},'${req.file.filename}')`
  );
  res.send("Mahasiswa berhasil ditambahkan.");
});

// Hapus Data //////////////////////////////////////////////////////////////////
app.delete("/api/hapus/:id", upload.single("surat"), async (req, res) => {
  const results = await client.query(
    `SELECT * FROM arsip_surat WHERE id = '${req.params.id}'`
  );

  await unlink(`./public/photos/${results.rows[0].surat}`);
  await client.query(`DELETE FROM arsip_surat WHERE id = '${req.params.id}'`);
  res.send("Mahasiswa berhasil dihapus.");
});

app.listen(3000, () => {
  console.log("Server berhasil berjalan.");
});
