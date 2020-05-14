var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;

// ============================
// localhost:3000/users/
// ===========================

/* API for POST new Members. */
module.exports = (db) => {

  router.post('/add', function (req, res, next) {
    bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
      // Store hash in your password DB.
      if(err) return res.status(500).json({
        error: true,
        message: err
      })

      const sql = 'INSERT INTO users (email, password, firstname, lastname) VALUES($1, $2, $3, $4)';
      const values = [req.body.email, hash, req.body.firstname, req.body.lastname];

      db.query(sql, values, (err) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        res.json({
          error: false,
          message: "data berhasil ditambahkan"
        })
      })
    });
  });

  return router;
}
