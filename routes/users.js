var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;


/* GET users listing. */
module.exports = (db) => {

  router.get('/', (req, res) => {
    res.render('index', { title: 'welcome Duma' });
  })

  router.post('/add', function (req, res, next) {
    bcrypt.hash(req.body.pass, saltRounds, function (err, hash) {
      // Store hash in your password DB.
      if(err) res.status(500).json({
        error: true,
        message: err
      })

      const text = 'INSERT INTO users (email, password, firstname, lastname) VALUES($1, $2, $3, $4)';
      const values = [req.body.email, hash, req.body.firstname, req.body.lastname];

      db.query(text, values, (err) => {
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
