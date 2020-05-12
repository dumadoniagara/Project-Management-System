var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');


/* GET home page. */
module.exports = (db) => {
  router.get('/', function (req, res, next) {
    res.render('login');
  });

  router.post('/login', (req, res) => {
    const sql = 'SELECT * FROM users WHERE email = $1'
    const email = [req.body.email];
    db.query(sql, email, (err, data) => {
      if (err) return res.status(500).json({
        error: true,
        message: "error di query"
      })
      if (data.rows.length == 0) return res.status(500).json({
        error: true,
        message: `email doesn't exist`
      })
      console.log(data.rows[0])
      bcrypt.compare(req.body.password, data.rows[0].password, function (err, result) {
        if (err) return res.status(500).json({
          error: true,
          message: "error di bcrypt"
        })
        if (result){
          res.redirect('/projects');
        } else {
          res.redirect('/');
        }
      })
    });
  })

  router.get('/projects', function (req, res, next) {
    res.render('projects');
  });

  return router;
}
